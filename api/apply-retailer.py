"""Vercel serverless function for retailer application."""
import json
import os
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_client():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length else {}
        except Exception:
            self._respond(400, {"detail": "Invalid request body"})
            return

        email = body.get("email", "").strip()
        password = body.get("password", "")
        business_name = body.get("business_name", "").strip()
        location = body.get("location", "").strip()

        if not email or not password or not business_name:
            self._respond(400, {"detail": "Email, password, and business name are required"})
            return

        try:
            client = _get_client()
        except Exception:
            self._respond(500, {"detail": "Database connection failed"})
            return

        # Create Supabase Auth user
        try:
            auth_resp = client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
            })
            user_id = auth_resp.user.id
        except Exception as e:
            if "already registered" in str(e).lower() or "already exists" in str(e).lower():
                self._respond(409, {"detail": "Email already registered"})
                return
            self._respond(500, {"detail": f"Account creation failed: {str(e)}"})
            return

        # Create profile
        try:
            client.table("profiles").insert({
                "id": user_id, "full_name": business_name, "email": email,
            }).execute()
        except Exception:
            pass

        # Create user_role
        try:
            client.table("user_roles").insert({
                "user_id": user_id, "role": "retailer",
            }).execute()
        except Exception:
            pass

        # Create retailer record
        try:
            client.table("retailers").insert({
                "user_id": user_id, "name": business_name,
                "location": location,
            }).execute()
        except Exception as e:
            self._respond(500, {"detail": f"Failed to create application: {str(e)}"})
            return

        self._respond(200, {"message": "Retailer application submitted for GI authority review"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass
