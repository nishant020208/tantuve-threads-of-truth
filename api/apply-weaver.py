"""Vercel serverless function for weaver application."""
import json
import os
import uuid
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
        name = body.get("name", "").strip()
        region = body.get("region", "").strip()
        craft_type = body.get("craft_type", "").strip()
        bio = body.get("bio", "")

        if not email or not password or not name or not region or not craft_type:
            self._respond(400, {"detail": "All fields are required"})
            return

        try:
            client = _get_client()
        except Exception as e:
            self._respond(500, {"detail": f"Database connection failed"})
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
                "id": user_id, "full_name": name, "email": email,
            }).execute()
        except Exception:
            pass

        # Create user_role
        try:
            client.table("user_roles").insert({
                "user_id": user_id, "role": "weaver",
            }).execute()
        except Exception:
            pass

        # Create weaver record
        try:
            client.table("weavers").insert({
                "user_id": user_id, "name": name,
                "craft_type": craft_type, "region": region,
                "bio": bio, "gi_registered": False, "status": "pending",
            }).execute()
        except Exception as e:
            self._respond(500, {"detail": f"Failed to create application: {str(e)}"})
            return

        self._respond(200, {"message": "Application submitted for GI authority review"})

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
