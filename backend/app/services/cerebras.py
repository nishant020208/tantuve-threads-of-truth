"""Cerebras AI service — generates origin stories and translates text."""

import httpx
from ..core.config import get_settings

CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"


async def generate_origin_story(
    product_id: str,
    craft_type: str,
    weaver_name: str,
    region: str,
    steps: list[dict],
) -> str:
    """Generate a short narrated origin story from real ledger data."""
    steps_text = "\n".join(
        f"- {s.get('step_name', '').replace('_', ' ').title()}: "
        + ", ".join(f"{k}: {v}" for k, v in (s.get("step_data") or {}).items())
        for s in steps
    )

    prompt = f"""Write a short, evocative paragraph (3-4 sentences) telling the origin story
of this handloom textile. Use vivid, sensory language that honors the craft tradition.
Do not use markdown or formatting — just plain prose.

Product: {product_id}
Craft: {craft_type}
Weaver: {weaver_name}
Region: {region}

Production steps:
{steps_text}"""

    return await _chat(prompt, max_tokens=200)


async def translate_text(text: str, target_lang: str = "hi") -> str:
    """Translate text to the target language using Cerebras."""
    lang_name = "Hindi" if target_lang == "hi" else target_lang
    prompt = f"""Translate the following English text to {lang_name}. Return ONLY the translated text,
no explanations or markdown:

{text}"""

    return await _chat(prompt, max_tokens=500)


async def _chat(prompt: str, max_tokens: int = 300) -> str:
    """Send a chat completion request to Cerebras."""
    s = get_settings()
    if not s.CEREBRAS_API_KEY:
        return ""

    headers = {
        "Authorization": f"Bearer {s.CEREBRAS_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.3-70b",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(CEREBRAS_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return ""
