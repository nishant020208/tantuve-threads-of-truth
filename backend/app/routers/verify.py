"""Public verify route — recomputes chain, checks IPFS, generates origin story."""

import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..services.db import get_client, insert_scan
from ..services.chain import verify_chain
from ..services.ipfs import fetch_from_ipfs, ipfs_gateway_url
from ..services.cerebras import generate_origin_story

router = APIRouter(tags=["verify"])


@router.get("/verify/{product_id}")
async def verify_product(product_id: str):
    """Public endpoint — verify a product's authenticity."""
    client = get_client()

    # Fetch product
    prod_resp = (
        client.table("products")
        .select("*, weavers(name, region, craft_type, gi_registered, bio)")
        .eq("id", product_id)
        .execute()
    )
    products = prod_resp.data if hasattr(prod_resp, "data") else []
    if not products:
        return JSONResponse(
            status_code=404,
            content={"error": "Product not found", "verified": False},
        )
    product = products[0]
    weaver = product.get("weavers")

    # Fetch ledger entries
    entries_resp = (
        client.table("ledger_entries")
        .select("*")
        .eq("product_id", product_id)
        .order("seq", ascending=True)
        .execute()
    )
    entries = entries_resp.data if hasattr(entries_resp, "data") else []

    # Fetch GI registry info
    gi_resp = (
        client.table("gi_registry")
        .select("official_description, region")
        .eq("craft_type", product.get("craft_type", ""))
        .execute()
    )
    gi_rows = gi_resp.data if hasattr(gi_resp, "data") else []
    gi = gi_rows[0] if gi_rows else None

    # Verify the hash chain
    verification = verify_chain(entries) if entries else {"valid": False, "brokenAtSeq": None, "finalHash": None}

    # Check IPFS anchor if product is completed
    ipfs_verified = False
    ipfs_data = None
    ipfs_cid = None
    if product.get("status") == "completed" and product.get("lot_id", "").startswith("ipfs:"):
        ipfs_cid = product["lot_id"].replace("ipfs:", "")
        ipfs_data = await fetch_from_ipfs(ipfs_cid)
        if ipfs_data and verification.get("finalHash"):
            ipfs_verified = ipfs_data.get("finalHash") == verification["finalHash"]

    # Log the scan
    try:
        await insert_scan(product_id)
    except Exception:
        pass  # Don't fail the verify on scan logging

    # Generate origin story via Cerebras (parallel with verification response)
    origin_story = ""
    try:
        origin_story = await generate_origin_story(
            product_id=product_id,
            craft_type=product.get("craft_type", ""),
            weaver_name=weaver.get("name", "") if weaver else "",
            region=weaver.get("region", "") if weaver else "",
            steps=entries,
        )
    except Exception:
        pass  # Don't fail the verify on AI generation

    # Overall verified: chain valid + weaver GI registered + (IPFS anchor matches if present)
    fully_verified = (
        verification.get("valid", False)
        and weaver
        and weaver.get("gi_registered", False)
        and (ipfs_verified if ipfs_cid else True)
    )

    return {
        "verified": fully_verified,
        "chainValid": verification.get("valid", False),
        "ipfsVerified": ipfs_verified,
        "ipfsCid": ipfs_cid,
        "ipfsUrl": ipfs_gateway_url(ipfs_cid) if ipfs_cid else None,
        "ipfsData": ipfs_data,
        "product": product,
        "entries": entries,
        "weaver": weaver,
        "gi": gi,
        "finalHash": verification.get("finalHash"),
        "originStory": origin_story,
    }


@router.post("/disputes")
async def report_counterfeit(body: dict):
    """Public endpoint to report a suspicious product."""
    product_id = body.get("product_id")
    reason = body.get("reason", "")
    contact = body.get("reporter_contact")

    if not product_id or not reason:
        raise HTTPException(status_code=400, detail="product_id and reason are required")

    client = get_client()

    # Verify product exists
    prod_resp = client.table("products").select("id").eq("id", product_id).execute()
    products = prod_resp.data if hasattr(prod_resp, "data") else []
    if not products:
        raise HTTPException(status_code=404, detail="Product not found")

    from ..services.db import insert_dispute
    await insert_dispute(product_id, reason, contact)

    return {"message": "Counterfeit report submitted to the GI authority"}
