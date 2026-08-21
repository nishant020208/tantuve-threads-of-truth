"""Retailer routes — receive, inventory, list for sale."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..core.auth import get_current_user
from ..services.db import get_client
from ..services.chain import compute_entry_hash

router = APIRouter(prefix="/retailer", tags=["retailer"])


def _require_retailer(user: dict):
    if user["role"] != "retailer":
        raise HTTPException(status_code=403, detail="Retailer access required")


def _get_retailer(user: dict) -> dict:
    client = get_client()
    resp = client.table("retailers").select("*").eq("user_id", user["user_id"]).limit(1).execute()
    rows = resp.data if hasattr(resp, "data") else []
    if not rows:
        raise HTTPException(status_code=404, detail="No retailer profile linked to this account")
    return rows[0]


@router.post("/receive")
async def receive_product(body: dict, user: dict = Depends(get_current_user)):
    """Receive a product — log a 'received' ledger entry and update status."""
    _require_retailer(user)
    retailer = _get_retailer(user)
    product_id = body.get("product_id", "").strip().upper()

    client = get_client()

    # Check product exists
    prod_resp = client.table("products").select("id, status").eq("id", product_id).execute()
    products = prod_resp.data if hasattr(prod_resp, "data") else []
    if not products:
        raise HTTPException(status_code=404, detail="Product not found")
    product = products[0]

    if product.get("status") == "in_progress":
        raise HTTPException(status_code=400, detail="Product is still in progress")

    # Add a received entry to the ledger (doesn't break the chain)
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

    entry_hash = compute_entry_hash(
        product_id=product_id,
        seq=seq,
        step_name="received_by_retailer",
        step_data={"retailer": retailer["name"], "location": retailer.get("location", "")},
        timestamp=timestamp,
        previous_entry_hash=previous_entry_hash,
    )

    client.table("ledger_entries").insert({
        "product_id": product_id,
        "seq": seq,
        "step_name": "received_by_retailer",
        "step_data": {"retailer": retailer["name"], "location": retailer.get("location", "")},
        "actor": retailer["name"],
        "timestamp": timestamp,
        "entry_hash": entry_hash,
        "previous_entry_hash": previous_entry_hash,
    }).execute()

    # Update product status
    client.table("products").update({
        "status": "with_retailer",
        "retailer_id": retailer["id"],
    }).eq("id", product_id).execute()

    return {"message": "Custody confirmed", "seq": seq}


@router.get("/inventory")
async def list_inventory(user: dict = Depends(get_current_user)):
    """List products in this retailer's custody."""
    _require_retailer(user)
    retailer = _get_retailer(user)
    client = get_client()
    resp = (
        client.table("products")
        .select("*, weavers(name, region)")
        .eq("retailer_id", retailer["id"])
        .order("created_at", ascending=False)
        .execute()
    )
    return resp.data if hasattr(resp, "data") else []


@router.post("/list-for-sale")
async def list_for_sale(body: dict, user: dict = Depends(get_current_user)):
    """Mark a product as listed for sale with a price."""
    _require_retailer(user)
    retailer = _get_retailer(user)
    product_id = body.get("product_id")
    price = body.get("price")
    listed = body.get("listed", True)

    client = get_client()

    # Verify product belongs to this retailer
    prod_resp = (
        client.table("products")
        .select("id, retailer_id")
        .eq("id", product_id)
        .execute()
    )
    products = prod_resp.data if hasattr(prod_resp, "data") else []
    if not products or products[0].get("retailer_id") != retailer["id"]:
        raise HTTPException(status_code=403, detail="Not your inventory")

    updates = {"listed": listed}
    if price is not None:
        updates["price"] = price
    client.table("products").update(updates).eq("id", product_id).execute()

    return {"message": "Listed" if listed else "Unlisted"}
