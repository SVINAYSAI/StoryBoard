"""
ElevenLabs Music & Sound Effects service.

Wraps:
  POST /v1/sound-generation  — text-to-sound-effects (SFX)
  POST /v1/music             — AI music composition
"""

import logging
from typing import Optional
import requests
from fastapi import HTTPException

logger = logging.getLogger("studio-backend")

ELEVENLABS_BASE = "https://api.elevenlabs.io"


# ── Sound Effects ─────────────────────────────────────────────────────────────

def generate_sound_effect(
    api_key: str,
    text: str,
    duration_seconds: Optional[float] = None,
    prompt_influence: float = 0.3,
    loop: bool = False,
    model_id: str = "eleven_text_to_sound_v3",
    output_format: str = "mp3_44100_128",
) -> bytes:
    """
    Calls ElevenLabs /v1/sound-generation to turn a text description
    into a high-quality sound effect.

    Returns raw MP3 bytes.
    """
    url = f"{ELEVENLABS_BASE}/v1/sound-generation"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "accept": f"audio/{output_format.split('_')[0]}",
    }
    params = {"output_format": output_format}

    body: dict = {
        "text": text,
        "prompt_influence": max(0.0, min(1.0, prompt_influence)),
        "loop": loop,
        "model_id": model_id,
    }
    if duration_seconds is not None:
        body["duration_seconds"] = max(0.5, min(30.0, duration_seconds))

    logger.info(f"Generating SFX: '{text[:60]}' model={model_id}")
    response = requests.post(url, headers=headers, json=body, params=params, timeout=120)

    if response.status_code == 200:
        return response.content
    else:
        logger.error(
            f"ElevenLabs SFX error: {response.status_code} — {response.text[:300]}"
        )
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs Sound Effects error: {response.text}",
        )


# ── Music Composition ─────────────────────────────────────────────────────────

def compose_music(
    api_key: str,
    prompt: str,
    music_length_ms: Optional[int] = None,
    model: str = "music_v2_5",
    make_instrumental: bool = True,
    output_format: str = "auto",
) -> bytes:
    """
    Calls ElevenLabs POST /v1/music to generate a background music track
    from a text prompt.

    Returns raw audio bytes (MP3).
    """
    url = f"{ELEVENLABS_BASE}/v1/music"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "accept": "audio/mpeg",
    }
    params = {"output_format": output_format}

    body: dict = {
        "prompt": prompt,
        "model": model,
        "make_instrumental": make_instrumental,
    }
    if music_length_ms is not None:
        # API range: 3000 – 600000 ms
        body["music_length_ms"] = max(3000, min(600_000, music_length_ms))

    logger.info(
        f"Composing music: '{prompt[:60]}' model={model} "
        f"length={music_length_ms}ms instrumental={make_instrumental}"
    )
    response = requests.post(url, headers=headers, json=body, params=params, timeout=180)

    if response.status_code == 200:
        return response.content
    else:
        logger.error(
            f"ElevenLabs Music error: {response.status_code} — {response.text[:300]}"
        )
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs Music error: {response.text}",
        )
