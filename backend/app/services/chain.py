"""Tamper-evident hash chain helpers — Python port of chain.ts."""

import hashlib
import json
from typing import Any, Optional

GENESIS = "GENESIS"


def stable_stringify(value: Any) -> str:
    """Deterministic JSON serialization — keys sorted, no extra whitespace."""
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


def canonical_payload(
    product_id: str,
    seq: int,
    step_name: str,
    step_data: Any,
    timestamp: str,
    previous_entry_hash: Optional[str],
) -> str:
    """Build the canonical string that gets hashed."""
    from datetime import datetime
    # Normalize timestamp to ISO format
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        ts = dt.isoformat()
    except Exception:
        ts = timestamp

    parts = [
        product_id,
        str(seq),
        step_name,
        stable_stringify(step_data),
        ts,
        previous_entry_hash or GENESIS,
    ]
    return "|".join(parts)


def compute_entry_hash(
    product_id: str,
    seq: int,
    step_name: str,
    step_data: Any,
    timestamp: str,
    previous_entry_hash: Optional[str],
) -> str:
    """Compute SHA-256 hash of a ledger entry."""
    payload = canonical_payload(product_id, seq, step_name, step_data, timestamp, previous_entry_hash)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def verify_chain(entries: list[dict]) -> dict:
    """Recompute every hash in order and check links. Returns {valid, brokenAtSeq, finalHash}."""
    ordered = sorted(entries, key=lambda e: e["seq"])
    previous: Optional[str] = None

    for entry in ordered:
        expected = compute_entry_hash(
            product_id=entry["product_id"],
            seq=entry["seq"],
            step_name=entry["step_name"],
            step_data=entry.get("step_data"),
            timestamp=entry["timestamp"],
            previous_entry_hash=previous,
        )
        link_ok = (entry.get("previous_entry_hash") or None) == previous
        if not link_ok or expected != entry["entry_hash"]:
            return {"valid": False, "brokenAtSeq": entry["seq"], "finalHash": None}
        previous = entry["entry_hash"]

    return {"valid": len(ordered) > 0, "brokenAtSeq": None, "finalHash": previous}


ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_product_code() -> str:
    """Generate a short human-typeable product code like TNT-PTL-00231."""
    import random
    chars = "".join(random.choice(ALPHABET) for _ in range(8))
    return f"TNT-{chars[:4]}-{chars[4:]}"


# Standard production steps
PRODUCTION_STEPS = [
    {"key": "yarn_sourcing", "label": "Yarn sourcing"},
    {"key": "dyeing", "label": "Dyeing"},
    {"key": "weaving", "label": "Weaving"},
    {"key": "finishing", "label": "Finishing"},
]
