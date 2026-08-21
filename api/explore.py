"""Vercel serverless function for explore page."""
import json
import os
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_client():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            client = _get_client()
        except Exception:
            self._respond(500, {"detail": "Database connection failed"})
            return

        resp = client.table("products").select("*").in_("status", ["completed", "with_retailer"]).order("created_at", ascending=False).execute()
        products = resp.data if hasattr(resp, "data") else []
        self._respond(200, products)

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
