"""Admin routes — weaver approvals, products, GI registry, disputes, analytics."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from ..core.auth import get_current_user
from ..services.db import get_client

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: dict):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="GI authority access required")


@router.get("/dashboard")
async def admin_dashboard(user: dict = Depends(get_current_user)):
    """Overview stats for the admin dashboard."""
    _require_admin(user)
    client = get_client()

    weavers_resp = client.table("weavers").select("id", count="exact").execute()
    products_resp = client.table("products").select("id", count="exact").execute()
    scans_resp = client.table("scans").select("id", count="exact").execute()
    disputes_resp = client.table("disputes").select("id, status").execute()

    disputes = disputes_resp.data if hasattr(disputes_resp, "data") else []

    return {
        "totalWeavers": weavers_resp.count if hasattr(weavers_resp, "count") else 0,
        "totalProducts": products_resp.count if hasattr(products_resp, "count") else 0,
        "totalScans": scans_resp.count if hasattr(scans_resp, "count") else 0,
        "openDisputes": len([d for d in disputes if d.get("status") == "open"]),
    }


@router.get("/weavers")
async def list_weavers(status: str = None, user: dict = Depends(get_current_user)):
    """List all weavers, optionally filtered by status."""
    _require_admin(user)
    client = get_client()
    q = client.table("weavers").select("*").order("created_at", ascending=False)
    if status:
        q = q.eq("status", status)
    resp = q.execute()
    return resp.data if hasattr(resp, "data") else []


@router.post("/weavers/{weaver_id}/approve")
async def approve_weaver(weaver_id: str, user: dict = Depends(get_current_user)):
    """Approve a weaver — sets gi_registered=true and status=approved."""
    _require_admin(user)
    client = get_client()
    client.table("weavers").update({
        "status": "approved",
        "gi_registered": True,
    }).eq("id", weaver_id).execute()

    # Create notification
    try:
        client.table("notifications").insert({
            "user_id": weaver_id,
            "message": "Your weaver application has been approved! You can now log in and register textiles.",
        }).execute()
    except Exception:
        pass

    return {"message": "Weaver approved"}


@router.post("/weavers/{weaver_id}/reject")
async def reject_weaver(weaver_id: str, user: dict = Depends(get_current_user)):
    """Reject a weaver application."""
    _require_admin(user)
    client = get_client()
    client.table("weavers").update({
        "status": "rejected",
    }).eq("id", weaver_id).execute()
    return {"message": "Weaver application rejected"}


@router.get("/products")
async def list_all_products(user: dict = Depends(get_current_user)):
    """List all products with weaver info."""
    _require_admin(user)
    client = get_client()
    resp = (
        client.table("products")
        .select("*, weavers(name, region, craft_type)")
        .order("created_at", ascending=False)
        .execute()
    )
    return resp.data if hasattr(resp, "data") else []


@router.get("/registry")
async def get_registry(user: dict = Depends(get_current_user)):
    """Get all GI registry entries."""
    _require_admin(user)
    client = get_client()
    resp = client.table("gi_registry").select("*").order("craft_type").execute()
    return resp.data if hasattr(resp, "data") else []


@router.post("/registry")
async def add_registry_entry(body: dict, user: dict = Depends(get_current_user)):
    """Add a new GI registry entry."""
    _require_admin(user)
    client = get_client()
    client.table("gi_registry").insert({
        "craft_type": body["craft_type"],
        "region": body["region"],
        "official_description": body["official_description"],
    }).execute()
    return {"message": "Registry entry added"}


@router.patch("/registry/{craft_type}")
async def update_registry_entry(craft_type: str, body: dict, user: dict = Depends(get_current_user)):
    """Update a GI registry entry."""
    _require_admin(user)
    client = get_client()
    updates = {k: v for k, v in body.items() if k in ("region", "official_description")}
    client.table("gi_registry").update(updates).eq("craft_type", craft_type).execute()
    return {"message": "Registry entry updated"}


@router.get("/disputes")
async def list_disputes(user: dict = Depends(get_current_user)):
    """List all disputes with product info."""
    _require_admin(user)
    client = get_client()
    resp = (
        client.table("disputes")
        .select("*, products(title, craft_type)")
        .order("created_at", ascending=False)
        .execute()
    )
    return resp.data if hasattr(resp, "data") else []


@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Resolve a dispute — mark as resolved, dismissed, or confirmed_counterfeit."""
    _require_admin(user)
    status = body.get("status", "resolved")
    if status not in ("resolved", "dismissed", "confirmed_counterfeit"):
        raise HTTPException(status_code=400, detail="Invalid status")
    client = get_client()
    client.table("disputes").update({"status": status}).eq("id", dispute_id).execute()

    if status == "confirmed_counterfeit":
        # Flag the product
        disputes_resp = client.table("disputes").select("product_id").eq("id", dispute_id).execute()
        disputes = disputes_resp.data if hasattr(disputes_resp, "data") else []
        if disputes:
            client.table("products").update({
                "flagged": True,
            }).eq("id", disputes[0]["product_id"]).execute()

    return {"message": f"Dispute {status}"}


@router.get("/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    """Get analytics data for the admin dashboard."""
    _require_admin(user)
    client = get_client()

    # Products by craft type
    products_resp = client.table("products").select("craft_type, status, created_at").execute()
    products = products_resp.data if hasattr(products_resp, "data") else []

    weavers_resp = client.table("weavers").select("craft_type, region, status").execute()
    weavers = weavers_resp.data if hasattr(weavers_resp, "data") else []

    scans_resp = client.table("scans").select("created_at, product_id").execute()
    scans = scans_resp.data if hasattr(scans_resp, "data") else []

    disputes_resp = client.table("disputes").select("status, created_at").execute()
    disputes = disputes_resp.data if hasattr(disputes_resp, "data") else []

    # Aggregate by craft
    by_craft = {}
    for p in products:
        craft = p.get("craft_type", "Unknown")
        by_craft[craft] = by_craft.get(craft, 0) + 1

    # Scans by month
    by_month = {}
    for s in scans:
        month = s.get("created_at", "")[:7]
        by_month[month] = by_month.get(month, 0) + 1

    return {
        "productsByCraft": by_craft,
        "scansByMonth": by_month,
        "totalProducts": len(products),
        "totalWeavers": len(weavers),
        "totalScans": len(scans),
        "totalDisputes": len(disputes),
        "openDisputes": len([d for d in disputes if d.get("status") == "open"]),
    }
