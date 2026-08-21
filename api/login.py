"""Vercel serverless function for login — talks to Supabase directly."""
import json
import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler

# Supabase connection
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "tantuve-secret-key-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 168  # 7 days


def _get_client():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def _find_user_by_email(client, email):
    """Find user by email in profiles table."""
    # Try email column
    try:
        resp = client.table("profiles").select("*").eq("email", email).execute()
        rows = resp.data if hasattr(resp, "data") else []
        if rows:
            return rows[0]
    except Exception:
        pass

    # Fallback: look up via Supabase Auth
    try:
        users = client.auth.admin.list_users()
        for u in users:
            if u.email == email:
                prof_resp = client.table("profiles").select("*").eq("id", u.id).execute()
                profs = prof_resp.data if hasattr(prof_resp, "data") else []
                if profs:
                    # Update email column if missing
                    try:
                        client.table("profiles").update({"email": email}).eq("id", u.id).execute()
                    except Exception:
                        pass
                    return profs[0]
                # Create profile
                try:
                    client.table("profiles").insert({
                        "id": u.id, "full_name": email.split("@")[0], "email": email,
                    }).execute()
                except Exception:
                    pass
                return {"id": u.id, "full_name": email.split("@")[0]}
    except Exception:
        pass
    return None


def _find_role(client, user_id):
    """Find user role."""
    resp = client.table("user_roles").select("role").eq("user_id", user_id).limit(1).execute()
    rows = resp.data if hasattr(resp, "data") else []
    if rows:
        return rows[0]["role"]
    # Check weavers
    resp2 = client.table("weavers").select("id").eq("user_id", user_id).limit(1).execute()
    rows2 = resp2.data if hasattr(resp2, "data") else []
    if rows2:
        return "weaver"
    return None


def _check_whitelist(client, role, user_id):
    """Check if user is approved."""
    if role == "weaver":
        resp = client.table("weavers").select("status").eq("user_id", user_id).limit(1).execute()
        rows = resp.data if hasattr(resp, "data") else []
        if rows:
            status = rows[0].get("status", "pending")
            if status == "pending":
                return "pending"
            if status == "rejected":
                return "rejected"
    elif role == "retailer":
        resp = client.table("retailers").select("request_status").eq("user_id", user_id).limit(1).execute()
        rows = resp.data if hasattr(resp, "data") else []
        if rows:
            status = rows[0].get("request_status", "pending")
            if status == "pending":
                return "pending"
            if status == "rejected":
                return "rejected"
    return "approved"


def _create_token(user_id, role):
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length else {}
        except Exception:
            self._respond(400, {"detail": "Invalid request body"})
            return

        path = self.path.rstrip("/")

        if path == "/api/login":
            self._handle_login(body)
        elif path == "/api/auth/login":
            self._handle_login(body)
        elif path == "/api/logout":
            self._respond(200, {"message": "logged out"})
        else:
            self._respond(404, {"detail": "Not found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def _handle_login(self, body):
        email = body.get("email", "").strip()
        password = body.get("password", "")

        if not email or not password:
            self._respond(400, {"detail": "Email and password are required"})
            return

        try:
            client = _get_client()
        except Exception as e:
            self._respond(500, {"detail": f"Database connection failed: {str(e)}"})
            return

        user = _find_user_by_email(client, email)
        if not user:
            self._respond(401, {"detail": "Invalid email or password"})
            return

        user_id = user["id"]

        # Check password if hash exists
        stored_hash = user.get("password_hash")
        if stored_hash:
            try:
                if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
                    self._respond(401, {"detail": "Invalid email or password"})
                    return
            except Exception:
                pass  # If hash is invalid, skip check

        # Find role
        role = _find_role(client, user_id)
        if not role:
            self._respond(401, {"detail": "No role assigned to this account"})
            return

        # Whitelist check
        wl_status = _check_whitelist(client, role, user_id)
        if wl_status == "pending":
            self._respond(403, {"detail": "Your access request is pending admin approval"})
            return
        if wl_status == "rejected":
            self._respond(403, {"detail": "Your access request was not approved"})
            return

        # Create token
        token = _create_token(user_id, role)

        self._respond(200, {
            "token": token,
            "user": {
                "id": user_id,
                "email": email,
                "full_name": user.get("full_name", ""),
                "role": role,
            },
        })

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # Suppress request logging
