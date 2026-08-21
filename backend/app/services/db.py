"""Supabase database access layer."""

import asyncio
from typing import Any, Optional
from supabase import create_client, Client
from ..core.config import get_settings

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        s = get_settings()
        _client = create_client(s.SUPABASE_URL, s.SUPABASE_SERVICE_ROLE_KEY)
    return _client


async def query(table: str, operation: str = "select", **kwargs) -> Any:
    """Run a Supabase operation in a thread pool so it doesn't block the event loop."""
    def _run():
        client = get_client()
        q = getattr(client.table(table), operation)
        return q(**kwargs).execute()
    return await asyncio.to_thread(_run)


# --- Typed convenience wrappers ---

async def get_user_by_email(email: str) -> Optional[dict]:
    resp = await query("profiles", "select", columns="*", filters={"id": email})
    # profiles.id is the user_id (uuid), email is stored separately
    # We need to query by joining or using a different approach
    # For now, query profiles and match
    return None  # Will be implemented with proper auth flow


async def get_weaver_by_user_id(user_id: str) -> Optional[dict]:
    resp = await query("weavers", "select", columns="*", filters={"user_id": user_id})
    rows = resp.data if hasattr(resp, "data") else resp
    return rows[0] if rows else None


async def get_product(product_id: str) -> Optional[dict]:
    resp = await query("products", "select", columns="*", filters={"id": product_id})
    rows = resp.data if hasattr(resp, "data") else resp
    return rows[0] if rows else None


async def get_products(filters: dict | None = None, order: str | None = None) -> list[dict]:
    kwargs: dict[str, Any] = {"columns": "*"}
    if filters:
        kwargs["filters"] = filters
    if order:
        kwargs["order"] = order
    resp = await query("products", "select", **kwargs)
    return resp.data if hasattr(resp, "data") else resp


async def get_ledger_entries(product_id: str) -> list[dict]:
    resp = await query("ledger_entries", "select", columns="*", filters={"product_id": product_id})
    return resp.data if hasattr(resp, "data") else resp


async def get_weavers(status: str | None = None) -> list[dict]:
    kwargs: dict[str, Any] = {"columns": "*"}
    if status:
        kwargs["filters"] = {"status": status}
    resp = await query("weavers", "select", **kwargs)
    return resp.data if hasattr(resp, "data") else resp


async def get_gi_registry() -> list[dict]:
    resp = await query("gi_registry", "select", columns="*")
    return resp.data if hasattr(resp, "data") else resp


async def get_disputes() -> list[dict]:
    resp = await query("disputes", "select", columns="*")
    return resp.data if hasattr(resp, "data") else resp


async def get_scan_count(product_id: str) -> int:
    resp = await query("scans", "select", columns="id", filters={"product_id": product_id})
    rows = resp.data if hasattr(resp, "data") else resp
    return len(rows) if rows else 0


async def insert_scan(product_id: str):
    await query("scans", "insert", values={"product_id": product_id})


async def insert_dispute(product_id: str, reason: str, contact: str | None = None):
    await query("disputes", "insert", values={
        "product_id": product_id,
        "reason": reason,
        "reporter_contact": contact,
    })


async def update_product(product_id: str, updates: dict):
    await query("products", "update", values=updates, filters={"id": product_id})


async def insert_ledger_entry(entry: dict):
    await query("ledger_entries", "insert", values=entry)


async def update_weaver(weaver_id: str, updates: dict):
    await query("weavers", "update", values=updates, filters={"id": weaver_id})


async def update_dispute(dispute_id: str, updates: dict):
    await query("disputes", "update", values=updates, filters={"id": dispute_id})
