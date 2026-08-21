"""Public routes — explore, marketplace, health check."""

from fastapi import APIRouter
from ..services.db import get_client
from ..services.ipfs import fetch_from_ipfs
from ..services.db import get_gi_registry

router = APIRouter(tags=["public"])


@router.get("/explore")
async def explore(craft: str = None, region: str = None):
    """Public gallery of verified products and weavers."""
    client = get_client()
    q = (
        client.table("products")
        .select("id, title, craft_type, photo_url, status, created_at, weavers(name, region, gi_registered)")
        .in_("status", ["completed", "with_retailer"])
        .order("created_at", ascending=False)
    )
    resp = q.execute()
    products = resp.data if hasattr(resp, "data") else []

    # Filter to only GI-registered weavers
    products = [p for p in products if p.get("weavers", {}).get("gi_registered")]

    if craft:
        products = [p for p in products if p.get("craft_type", "").lower() == craft.lower()]
    if region:
        products = [p for p in products if (p.get("weavers", {}).get("region", "").lower() == region.lower())]

    return products


@router.get("/marketplace")
async def marketplace():
    """Public marketplace — listed products with pricing."""
    client = get_client()
    resp = (
        client.table("products")
        .select("id, title, craft_type, photo_url, price, status, weavers(name, region, gi_registered), retailers(name, location)")
        .eq("listed", True)
        .order("created_at", ascending=False)
        .execute()
    )
    return resp.data if hasattr(resp, "data") else []


@router.get("/gi-registry")
async def public_registry():
    """Public GI registry list."""
    return await get_gi_registry()


@router.get("/health")
async def health():
    """Health check — verifies DB and Pinata connectivity."""
    checks = {"database": False, "pinata": False}

    # Check Supabase
    try:
        client = get_client()
        client.table("products").select("id").limit(1).execute()
        checks["database"] = True
    except Exception:
        pass

    # Check Pinata
    try:
        import httpx
        s = __import__("backend.app.core.config", fromlist=["get_settings"]).get_settings()
        async with httpx.AsyncClient(timeout=5.0) as http:
            resp = await http.get(
                "https://api.pinata.cloud/data/testAuthentication",
                headers={"Authorization": f"Bearer {s.PINATA_JWT}"},
            )
            checks["pinata"] = resp.status_code == 200
    except Exception:
        pass

    all_ok = all(checks.values())
    return {"status": "healthy" if all_ok else "degraded", "checks": checks}
