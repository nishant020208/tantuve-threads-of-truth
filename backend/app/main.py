"""Tantuve — main FastAPI application."""

import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import get_settings
from .routers import auth, weaver, admin, retailer, verify, public


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown — validate env vars at startup."""
    settings = get_settings()
    missing = []
    for field in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PINATA_JWT", "CEREBRAS_API_KEY"):
        if not getattr(settings, field, None):
            missing.append(field)
    if missing:
        print(f"[tantuve] WARNING: Missing env vars: {', '.join(missing)}")
    else:
        print("[tantuve] All required env vars loaded.")
    yield


app = FastAPI(
    title="Tantuve API",
    description="IPFS-anchored traceability platform for Indian GI handloom textiles",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router)
app.include_router(weaver.router)
app.include_router(admin.router)
app.include_router(retailer.router)
app.include_router(verify.router)
app.include_router(public.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Return consistent JSON error shapes for all unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "detail": "Internal server error"},
    )


@app.get("/")
async def root():
    return {"name": "Tantuve API", "version": "1.0.0", "docs": "/docs"}
