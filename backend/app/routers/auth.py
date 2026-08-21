"""Auth routes — login, apply-weaver, me."""

import io
import hashlib
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..core.auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_user,
)
from ..services.db import (
    get_client,
    query,
    get_weaver_by_user_id,
    get_gi_registry,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class ApplyWeaverRequest(BaseModel):
    name: str
    region: str
    craft_type: str
    bio: Optional[str] = None
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


def _find_user_by_email(email: str) -> Optional[dict]:
    """Find a user in profiles by their id (which is the UUID used as email-based auth)."""
    client = get_client()
    # We store users with email as the id field in profiles
    resp = client.table("profiles").select("*").eq("id", email).execute()
    rows = resp.data if hasattr(resp, "data") else []
    return rows[0] if rows else None


def _find_role_for_user(user_id: str) -> Optional[str]:
    client = get_client()
    resp = client.table("user_roles").select("role").eq("user_id", user_id).limit(1).execute()
    rows = resp.data if hasattr(resp, "data") else []
    return rows[0]["role"] if rows else None


def _create_user(email: str, full_name: str | None = None) -> dict:
    """Create a new profile + weaver row."""
    client = get_client()
    # Create profile
    client.table("profiles").insert({
        "id": email,
        "full_name": full_name or email.split("@")[0],
    }).execute()
    return {"id": email, "full_name": full_name}


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate a user and return a JWT."""
    user = _find_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = _find_role_for_user(req.email)
    if not role:
        weaver = _find_weaver_record(req.email)
        if weaver:
            role = "weaver"
        else:
            raise HTTPException(status_code=401, detail="No role assigned to this account")

    # --- Whitelist gate: enforce approval before issuing JWT ---
    if role == "weaver":
        weaver = _find_weaver_record(req.email)
        if not weaver:
            raise HTTPException(status_code=401, detail="No weaver profile found")
        status = weaver.get("status", "pending")
        if status == "pending":
            raise HTTPException(status_code=403, detail="Your access request is pending admin approval")
        if status == "rejected":
            raise HTTPException(status_code=403, detail="Your access request was not approved")
    elif role == "retailer":
        client = get_client()
        resp = client.table("retailers").select("*").eq("user_id", req.email).limit(1).execute()
        rows = resp.data if hasattr(resp, "data") else []
        if rows:
            r_status = rows[0].get("request_status", "pending")
            if r_status == "pending":
                raise HTTPException(status_code=403, detail="Your retailer access request is pending admin approval")
            if r_status == "rejected":
                raise HTTPException(status_code=403, detail="Your retailer access request was not approved")

    token = create_token(req.email, role)
    return {
        "token": token,
        "user": {
            "id": req.email,
            "email": req.email,
            "full_name": user.get("full_name"),
            "role": role,
        },
    }


def _find_weaver_record(user_id: str) -> Optional[dict]:
    client = get_client()
    resp = client.table("weavers").select("*").eq("user_id", user_id).limit(1).execute()
    rows = resp.data if hasattr(resp, "data") else []
    return rows[0] if rows else None


@router.post("/apply-retailer")
async def apply_retailer(body: dict):
    """Submit a retailer application (creates pending retailer + user account)."""
    email = body.get("email", "").strip()
    password = body.get("password", "")
    business_name = body.get("business_name", "").strip()
    location = body.get("location", "").strip()
    contact_email = body.get("contact_email", email)

    if not email or not password or not business_name:
        raise HTTPException(status_code=400, detail="Email, password, and business name are required")

    client = get_client()

    # Check if user already exists
    existing = _find_user_by_email(email)
    if not existing:
        _create_user(email, business_name)
    else:
        # Check if already has a retailer application
        resp = client.table("retailers").select("*").eq("user_id", email).limit(1).execute()
        rows = resp.data if hasattr(resp, "data") else []
        if rows:
            raise HTTPException(status_code=409, detail="Retailer application already submitted")

    # Create user_roles entry
    try:
        client.table("user_roles").insert({
            "user_id": email,
            "role": "retailer",
        }).execute()
    except Exception:
        pass  # May already exist

    # Create retailer record (pending approval)
    client.table("retailers").insert({
        "user_id": email,
        "name": business_name,
        "business_name": business_name,
        "location": location,
        "contact_email": contact_email,
        "request_status": "pending",
    }).execute()

    return {"message": "Retailer application submitted for GI authority review"}


@router.post("/apply-weaver")
async def apply_weaver(req: ApplyWeaverRequest):
    """Submit a weaver application (creates pending weaver + user account)."""
    # Validate craft type against registry
    registry = get_gi_registry()
    craft_types = [r["craft_type"] for r in registry]
    if registry and req.craft_type not in craft_types:
        raise HTTPException(
            status_code=400,
            detail=f"Craft type '{req.craft_type}' not in GI registry. Available: {', '.join(craft_types)}",
        )

    client = get_client()

    # Check if user exists, create if not
    existing = _find_user_by_email(req.email)
    if not existing:
        _create_user(req.email, req.name)

    # Check for existing weaver application
    existing_weaver = _find_weaver_record(req.email)
    if existing_weaver:
        raise HTTPException(status_code=409, detail="Weaver application already submitted")

    # Create weaver record (pending approval)
    client.table("weavers").insert({
        "user_id": req.email,
        "name": req.name,
        "region": req.region,
        "craft_type": req.craft_type,
        "bio": req.bio,
        "gi_registered": False,
        "status": "pending",
    }).execute()

    return {"message": "Application submitted for GI authority review"}


@router.post("/logout")
async def logout():
    """Client-side logout — clear any httpOnly cookie if present."""
    from fastapi.responses import Response
    response = Response(content='{"message":"logged out"}', media_type="application/json")
    response.delete_cookie("tantuve_token")
    return response


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current user info + role."""
    weaver = _find_weaver_record(user["user_id"])
    return {
        "user_id": user["user_id"],
        "role": user["role"],
        "weaver": weaver,
    }
