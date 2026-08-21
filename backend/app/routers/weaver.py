"""Weaver routes — products, ledger steps, completion, QR, certificates."""

import io
import json
import qrcode
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..core.auth import get_current_user
from ..services.db import get_client, get_weaver_by_user_id
from ..services.chain import (
    compute_entry_hash,
    verify_chain,
    generate_product_code,
    PRODUCTION_STEPS,
)
from ..services.ipfs import pin_json, pin_file, ipfs_gateway_url
import base64 as b64mod

router = APIRouter(prefix="/weaver", tags=["weaver"])


class CreateProductRequest(BaseModel):
    title: str
    craft_type: str
    yarn_source: Optional[str] = None
    lot_id: Optional[str] = None
    photo_url: Optional[str] = None


class AppendStepRequest(BaseModel):
    step_name: str
    step_data: dict = {}
    actor: Optional[str] = None
    photo_base64: Optional[str] = None  # base64-encoded photo evidence


# Minimum expected duration between steps (2 hours) for plausibility flagging
MIN_STEP_DURATION_SECONDS = 2 * 60 * 60  # 2 hours


def _get_weaver(user: dict) -> dict:
    """Get the weaver record for the current user or raise."""
    weaver = get_weaver_by_user_id(user["user_id"])
    if not weaver:
        raise HTTPException(status_code=404, detail="No weaver profile linked to this account")
    return weaver


@router.get("/products")
async def list_products(user: dict = Depends(get_current_user)):
    """List all products for the current weaver."""
    weaver = _get_weaver(user)
    client = get_client()
    resp = (
        client.table("products")
        .select("*, ledger_entries(seq, step_name)")
        .eq("weaver_id", weaver["id"])
        .order("created_at", ascending=False)
        .execute()
    )
    return resp.data if hasattr(resp, "data") else []


@router.post("/products")
async def create_product(req: CreateProductRequest, user: dict = Depends(get_current_user)):
    """Create a new draft product."""
    weaver = _get_weaver(user)
    client = get_client()

    # Generate a unique product code with retry
    for _ in range(5):
        code = generate_product_code()
        existing = (
            client.table("products")
            .select("id")
            .eq("id", code)
            .execute()
        )
        rows = existing.data if hasattr(existing, "data") else []
        if not rows:
            client.table("products").insert({
                "id": code,
                "weaver_id": weaver["id"],
                "title": req.title,
                "craft_type": req.craft_type,
                "yarn_source": req.yarn_source,
                "lot_id": req.lot_id,
                "photo_url": req.photo_url,
                "status": "in_progress",
            }).execute()
            return {"productId": code}

    raise HTTPException(status_code=500, detail="Could not generate unique product code")


@router.get("/products/{product_id}")
async def get_product(product_id: str, user: dict = Depends(get_current_user)):
    """Get a product with its ledger entries."""
    weaver = _get_weaver(user)
    client = get_client()

    product = (
        client.table("products")
        .select("*, ledger_entries(*)")
        .eq("id", product_id)
        .eq("weaver_id", weaver["id"])
        .execute()
    )
    rows = product.data if hasattr(product, "data") else []
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found")
    return rows[0]


@router.post("/products/{product_id}/steps")
async def append_step(
    product_id: str,
    req: AppendStepRequest,
    user: dict = Depends(get_current_user),
):
    """Append a production step to the ledger."""
    weaver = _get_weaver(user)
    client = get_client()

    # Verify product exists and belongs to this weaver
    prod_resp = (
        client.table("products")
        .select("id, status")
        .eq("id", product_id)
        .eq("weaver_id", weaver["id"])
        .execute()
    )
    rows = prod_resp.data if hasattr(prod_resp, "data") else []
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found")
    if rows[0]["status"] == "completed":
        raise HTTPException(status_code=400, detail="Product is already completed")

    # Get the last entry for hash chaining
    last_resp = (
        client.table("ledger_entries")
        .select("seq, entry_hash")
        .eq("product_id", product_id)
        .order("seq", ascending=False)
        .limit(1)
        .execute()
    )
    last_rows = last_resp.data if hasattr(last_resp, "data") else []
    seq = (last_rows[0]["seq"] + 1) if last_rows else 1
    previous_entry_hash = last_rows[0]["entry_hash"] if last_rows else None
    timestamp = datetime.now(timezone.utc).isoformat()

    # --- Photo upload to IPFS ---
    photo_ipfs_cid = None
    if req.photo_base64:
        try:
            photo_bytes = b64mod.b64decode(req.photo_base64)
            photo_ipfs_cid = await pin_file(
                photo_bytes,
                filename=f"{product_id}_step{seq}.jpg",
                name=f"tantuve-{product_id}-step{seq}",
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Photo upload failed: {str(e)}")

    # Merge photo CID into step_data for the hash chain
    step_data = dict(req.step_data)
    if photo_ipfs_cid:
        step_data["photo_ipfs_cid"] = photo_ipfs_cid

    # --- Plausibility flagging ---
    flagged_plausibility = False
    flagged_reason = None
    if last_rows:
        last_ts_str = last_rows[0].get("timestamp")
        if last_ts_str:
            try:
                from datetime import datetime as dt
                last_ts = dt.fromisoformat(last_ts_str.replace("Z", "+00:00"))
                now_ts = dt.fromisoformat(timestamp.replace("Z", "+00:00"))
                elapsed = (now_ts - last_ts).total_seconds()
                if elapsed < MIN_STEP_DURATION_SECONDS:
                    flagged_plausibility = True
                    minutes = int(elapsed / 60)
                    flagged_reason = (
                        f"step logged {minutes} minute{'s' if minutes != 1 else ''} "
                        f"after previous step (minimum expected: {MIN_STEP_DURATION_SECONDS // 60} minutes)"
                    )
            except Exception:
                pass  # If timestamp parsing fails, skip flagging

    entry_hash = compute_entry_hash(
        product_id=product_id,
        seq=seq,
        step_name=req.step_name,
        step_data=step_data,
        timestamp=timestamp,
        previous_entry_hash=previous_entry_hash,
    )

    client.table("ledger_entries").insert({
        "product_id": product_id,
        "seq": seq,
        "step_name": req.step_name,
        "step_data": step_data,
        "actor": req.actor or weaver["name"],
        "timestamp": timestamp,
        "entry_hash": entry_hash,
        "previous_entry_hash": previous_entry_hash,
        "flagged_plausibility": flagged_plausibility,
        "flagged_reason": flagged_reason,
    }).execute()

    return {
        "seq": seq,
        "entry_hash": entry_hash,
        "timestamp": timestamp,
        "photoIpfsCid": photo_ipfs_cid,
        "flagged": flagged_plausibility,
    }


@router.post("/products/{product_id}/complete")
async def complete_product(product_id: str, user: dict = Depends(get_current_user)):
    """Complete a product — compute final hash, pin to IPFS, generate QR."""
    weaver = _get_weaver(user)
    client = get_client()

    # Get product
    prod_resp = (
        client.table("products")
        .select("*")
        .eq("id", product_id)
        .eq("weaver_id", weaver["id"])
        .execute()
    )
    rows = prod_resp.data if hasattr(prod_resp, "data") else []
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found")
    product = rows[0]

    if product["status"] == "completed":
        raise HTTPException(status_code=400, detail="Product is already completed")

    # Get all ledger entries
    entries_resp = (
        client.table("ledger_entries")
        .select("*")
        .eq("product_id", product_id)
        .order("seq", ascending=True)
        .execute()
    )
    entries = entries_resp.data if hasattr(entries_resp, "data") else []

    # Verify the hash chain
    verification = verify_chain(entries)
    if not verification["valid"]:
        raise HTTPException(status_code=400, detail="Hash chain verification failed")

    final_hash = verification["finalHash"]

    # Collect per-step photo CIDs for the anchored record
    step_photos = []
    for e in entries:
        sd = e.get("step_data") or {}
        if isinstance(sd, dict) and sd.get("photo_ipfs_cid"):
            step_photos.append({
                "step": e["step_name"],
                "seq": e["seq"],
                "photoIpfsCid": sd["photo_ipfs_cid"],
            })

    # Pin to IPFS — includes per-step photo CIDs
    ipfs_record = {
        "productId": product_id,
        "finalHash": final_hash,
        "weaverId": weaver["id"],
        "weaverName": weaver["name"],
        "craftType": product["craft_type"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "entryCount": len(entries),
        "stepPhotos": step_photos,
    }

    try:
        cid = await pin_json(ipfs_record, name=f"tantuve-{product_id}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"IPFS pinning failed: {str(e)}")

    # Update product status + store CID
    update_fields = {"status": "completed"}
    try:
        client.table("products").update({"ipfs_cid": cid}).eq("id", product_id).execute()
    except Exception:
        try:
            client.table("products").update({"lot_id": f"ipfs:{cid}"}).eq("id", product_id).execute()
        except Exception:
            pass
    client.table("products").update(update_fields).eq("id", product_id).execute()

    # --- Spot-check random selection (10-15% of completed products) ---
    import random
    if random.random() < 0.12:  # ~12% chance
        try:
            client.table("products").update({
                "spot_check_selected": True,
                "spot_check_status": "pending",
            }).eq("id", product_id).execute()
        except Exception:
            pass  # Column may not exist yet

    return {
        "productId": product_id,
        "status": "completed",
        "finalHash": final_hash,
        "ipfsCid": cid,
        "ipfsUrl": ipfs_gateway_url(cid),
        "entryCount": len(entries),
        "stepPhotos": step_photos,
    }


@router.get("/products/{product_id}/qr")
async def get_qr(product_id: str, user: dict = Depends(get_current_user)):
    """Generate a QR code PNG for a completed product."""
    client = get_client()
    prod_resp = (
        client.table("products")
        .select("id, status")
        .eq("id", product_id)
        .execute()
    )
    rows = prod_resp.data if hasattr(prod_resp, "data") else []
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found")
    if rows[0]["status"] != "completed":
        raise HTTPException(status_code=400, detail="Product not yet completed")

    import os
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    qr_url = f"{frontend_url}/verify/{product_id}"

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(qr_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#22283c", back_color="#f7f2e6")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(buf, media_type="image/png")
