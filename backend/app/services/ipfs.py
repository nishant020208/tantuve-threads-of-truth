"""IPFS service — pins content to Pinata and fetches from IPFS gateways."""

import io
import json
import asyncio
from typing import Any, Optional

import httpx
from ..core.config import get_settings

PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"

# Content-addressed IPFS gateways for fetching pinned records
IPFS_GATEWAYS = [
    "https://gateway.pinata.cloud/ipfs",
    "https://ipfs.io/ipfs",
    "https://dweb.link/ipfs",
]


def _pinata_headers() -> dict[str, str]:
    s = get_settings()
    return {
        "Authorization": f"Bearer {s.PINATA_JWT}",
        "Content-Type": "application/json",
    }


async def pin_json(data: dict[str, Any], name: str = "tantuve-record") -> str:
    """Pin a JSON object to IPFS via Pinata. Returns the CID string."""
    payload = {
        "pinataContent": data,
        "pinataMetadata": {"name": name},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(PINATA_PIN_URL, json=payload, headers=_pinata_headers())
        resp.raise_for_status()
        result = resp.json()
        return result["IpfsHash"]


async def pin_file(file_bytes: bytes, filename: str, name: str = "tantuve-photo") -> str:
    """Pin a file (e.g. photo) to IPFS via Pinata. Returns the CID string."""
    s = get_settings()
    headers = {
        "Authorization": f"Bearer {s.PINATA_JWT}",
    }
    # Pinata file upload endpoint
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    files = {"file": (filename, io.BytesIO(file_bytes), "image/jpeg")}
    data = {"pinataMetadata": json.dumps({"name": name})}
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, headers=headers, files=files, data=data)
        resp.raise_for_status()
        result = resp.json()
        return result["IpfsHash"]


async def fetch_from_ipfs(cid: str) -> Optional[dict[str, Any]]:
    """Fetch a JSON object from IPFS using multiple gateways."""
    for gateway in IPFS_GATEWAYS:
        url = f"{gateway}/{cid}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            continue
    return None


def ipfs_gateway_url(cid: str) -> str:
    """Return a public IPFS gateway URL for a CID."""
    return f"{PINATA_GATEWAY}/{cid}"
