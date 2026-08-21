"""Vercel serverless function for product verification."""
import json
import os
import hashlib
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_client():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def stable_stringify(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return json.dumps(value)
    if isinstance(value, str):
        return json.dumps(value)
    if isinstance(value, list):
        return "[" + ",".join(stable_stringify(v) for v in value) + "]"
    if isinstance(value, dict):
        items = sorted(value.items())
        return "{" + ",".join(f"{json.dumps(k)}:{stable_stringify(v)}" for k, v in items) + "}"
    return json.dumps(value)


def compute_entry_hash(product_id, seq, step_name, step_data, timestamp, previous_hash):
    from datetime import datetime
    try:
        ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).isoformat()
    except Exception:
        ts = timestamp
    payload = f"{product_id}|{seq}|{step_name}|{stable_stringify(step_data)}|{ts}|{previous_hash or 'GENESIS'}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def verify_chain(entries):
    ordered = sorted(entries, key=lambda e: e.get("seq", 0))
    previous = None
    for entry in ordered:
        expected = compute_entry_hash(
            entry["product_id"], entry["seq"], entry["step_name"],
            entry.get("step_data"), entry["timestamp"], previous,
        )
        link_ok = (entry.get("previous_entry_hash") or None) == previous
        if not link_ok or expected != entry.get("entry_hash"):
            return {"valid": False, "brokenAtSeq": entry["seq"], "finalHash": None}
        previous = entry["entry_hash"]
    return {"valid": len(ordered) > 0, "brokenAtSeq": None, "finalHash": previous}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Extract product ID from path: /api/verify/{productId}
        parts = self.path.strip("/").split("/")
        if len(parts) < 3:
            self._respond(400, {"detail": "Product ID required"})
            return
        product_id = parts[-1]

        try:
            client = _get_client()
        except Exception:
            self._respond(500, {"detail": "Database connection failed"})
            return

        # Get product
        prod_resp = client.table("products").select("*").eq("id", product_id).execute()
        products = prod_resp.data if hasattr(prod_resp, "data") else []
        if not products:
            self._respond(404, {"detail": "Product not found"})
            return
        product = products[0]

        # Get ledger entries
        entries_resp = client.table("ledger_entries").select("*").eq("product_id", product_id).order("seq").execute()
        entries = entries_resp.data if hasattr(entries_resp, "data") else []

        # Get weaver
        weaver = None
        if product.get("weaver_id"):
            w_resp = client.table("weavers").select("*").eq("id", product["weaver_id"]).execute()
            weavers = w_resp.data if hasattr(w_resp, "data") else []
            if weavers:
                weaver = weavers[0]

        # Verify chain
        verification = verify_chain(entries) if entries else {"valid": False}

        # Get GI registry
        gi = None
        if weaver:
            gi_resp = client.table("gi_registry").select("*").eq("craft_type", product.get("craft_type", "")).execute()
            gis = gi_resp.data if hasattr(gi_resp, "data") else []
            if gis:
                gi = gis[0]

        # Log scan
        try:
            client.table("scans").insert({"product_id": product_id}).execute()
        except Exception:
            pass

        self._respond(200, {
            "product": product,
            "entries": entries,
            "weaver": weaver,
            "gi": gi,
            "originStory": None,
            "ipfsCid": product.get("ipfs_cid"),
            "ipfsUrl": f"https://gateway.pinata.cloud/ipfs/{product.get('ipfs_cid')}" if product.get("ipfs_cid") else None,
            "ipfsVerified": False,
            "verification": verification,
        })

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass
