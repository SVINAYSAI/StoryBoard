"""
ElevenLabs API service.
Handles TTS generation, voice listing, and credit queries.
"""

import logging
import requests
from fastapi import HTTPException

logger = logging.getLogger("studio-backend")


def get_subscription_credits(api_key: str) -> dict:
    """Fetches remaining character count from ElevenLabs."""
    url = "https://api.elevenlabs.io/v1/user/subscription"
    headers = {"xi-api-key": api_key, "accept": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        return {
            "character_count": data.get("character_count", 0),
            "character_limit": data.get("character_limit", 0),
            "remaining": data.get("character_limit", 0) - data.get("character_count", 0),
            "status": data.get("status", "unknown"),
        }
    else:
        logger.error(f"ElevenLabs user API error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs error: {response.text}",
        )


def get_voices(api_key: str) -> dict:
    """Fetches list of available voices from ElevenLabs."""
    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": api_key, "accept": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs error: {response.text}",
        )


def generate_tts(
    api_key: str,
    voice_id: str,
    text: str,
    model_id: str,
    voice_settings: dict,
    previous_text: str = "",
    next_text: str = "",
) -> bytes:
    """
    Generates TTS audio using ElevenLabs API.

    Returns:
        Raw audio bytes (MP3).
    """
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "accept": "audio/mpeg",
    }

    body = {
        "text": text,
        "model_id": model_id or "eleven_v3",
        "voice_settings": voice_settings,
    }

    # Add continuity context for better prosody across segments
    # Note: previous_text/next_text is NOT supported on eleven_v3 model
    if model_id != "eleven_v3":
        if previous_text and previous_text.strip():
            body["previous_text"] = previous_text.strip()
        if next_text and next_text.strip():
            body["next_text"] = next_text.strip()

    response = requests.post(url, headers=headers, json=body)

    if response.status_code == 200:
        return response.content
    else:
        logger.error(f"ElevenLabs TTS Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs API returned error: {response.text}",
        )
