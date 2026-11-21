"""
ElevenLabs API service.
Handles TTS generation, voice listing, and credit queries.
"""

import json
import logging
import requests
from typing import Optional, List
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


def search_shared_voices(
    api_key: str,
    page_size: int = 30,
    page: int = 0,
    category: Optional[str] = None,
    gender: Optional[str] = None,
    age: Optional[str] = None,
    accent: Optional[str] = None,
    language: Optional[str] = None,
    locale: Optional[str] = None,
    search: Optional[str] = None,
    use_cases: Optional[List[str]] = None,
    descriptives: Optional[List[str]] = None,
    featured: Optional[bool] = None,
    sort: Optional[str] = None,
    reader_app_enabled: Optional[bool] = None,
    owner_id: Optional[str] = None,
) -> dict:
    """
    Searches the ElevenLabs shared Voice Library.

    Calls GET /v1/shared-voices with all supported filter parameters.
    """
    url = "https://api.elevenlabs.io/v1/shared-voices"
    headers = {"xi-api-key": api_key, "accept": "application/json"}

    params: dict = {
        "page_size": min(page_size, 100),
        "page": page,
    }

    # Add optional scalar filters
    if category:
        params["category"] = category
    if gender:
        params["gender"] = gender
    if age:
        params["age"] = age
    if accent:
        params["accent"] = accent
    if language:
        params["language"] = language
    if locale:
        params["locale"] = locale
    if search:
        params["search"] = search
    if sort:
        params["sort"] = sort
    if owner_id:
        params["owner_id"] = owner_id
    if featured is not None:
        params["featured"] = str(featured).lower()
    if reader_app_enabled is not None:
        params["reader_app_enabled"] = str(reader_app_enabled).lower()

    # Add list filters (sent as repeated query params)
    if use_cases:
        params["use_cases"] = ",".join(use_cases)
    if descriptives:
        params["descriptives"] = ",".join(descriptives)

    logger.info(f"Searching shared voices with params: {params}")
    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        logger.error(
            f"ElevenLabs shared-voices error: Status {response.status_code}, {response.text}"
        )
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


def isolate_audio(
    api_key: str,
    audio_bytes: bytes,
    filename: str = "input_audio.mp3",
    file_format: str = "other",
) -> bytes:
    """
    Calls ElevenLabs Audio Isolation to eradicate background noise, room reverb,
    hums, and ambient chatter, leaving pure studio-grade speech.

    Returns:
        Raw audio bytes (audio/mpeg).
    """
    url = "https://api.elevenlabs.io/v1/audio-isolation"
    headers = {
        "xi-api-key": api_key,
        "accept": "audio/mpeg",
    }

    files = {
        "audio": (filename, audio_bytes, "audio/mpeg")
    }
    data = {}
    if file_format:
        data["file_format"] = file_format

    logger.info(f"Calling ElevenLabs Audio Isolation for file {filename} ({len(audio_bytes)} bytes)")
    response = requests.post(url, headers=headers, files=files, data=data)

    if response.status_code == 200:
        return response.content
    else:
        logger.error(f"ElevenLabs Audio Isolation Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs Audio Isolation error: {response.text}",
        )


def get_audio_isolation_history(
    api_key: str,
    page_size: int = 100,
    page: int = 1,
    search: Optional[str] = None,
) -> dict:
    """
    Fetches the history of audio isolation generations from ElevenLabs.
    """
    url = "https://api.elevenlabs.io/v1/audio-isolation/history"
    headers = {
        "xi-api-key": api_key,
        "accept": "application/json",
    }
    params = {
        "page_size": min(page_size, 1000),
        "page": page,
    }
    if search:
        params["search"] = search

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        logger.error(f"ElevenLabs Audio Isolation History Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs error: {response.text}",
        )


def delete_audio_isolation_history_item(api_key: str, history_item_id: str) -> bool:
    """
    Deletes an audio isolation item from ElevenLabs cloud history.
    """
    url = f"https://api.elevenlabs.io/v1/audio-isolation/history/{history_item_id}"
    headers = {
        "xi-api-key": api_key,
    }

    response = requests.delete(url, headers=headers)
    if response.status_code in (200, 204):
        return True
    else:
        logger.error(f"ElevenLabs Audio Isolation History Delete Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs error: {response.text}",
        )


def speech_to_speech_enhance(
    api_key: str,
    voice_id: str,
    audio_bytes: bytes,
    filename: str = "input_audio.mp3",
    model_id: str = "eleven_english_sts_v2",
    voice_settings: Optional[dict] = None,
    remove_background_noise: bool = True,
) -> bytes:
    """
    Transforms audio to another voice using ElevenLabs Speech-to-Speech while maintaining
    emotion, timing, and delivery, and automatically removing background noise.

    Returns:
        Raw audio bytes (audio/mpeg).
    """
    url = f"https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "accept": "audio/mpeg",
    }

    files = {
        "audio": (filename, audio_bytes, "audio/mpeg")
    }
    data = {
        "model_id": model_id or "eleven_english_sts_v2",
        "remove_background_noise": str(remove_background_noise).lower(),
    }
    if voice_settings:
        data["voice_settings"] = json.dumps(voice_settings)

    logger.info(f"Calling ElevenLabs Speech-to-Speech ({voice_id}, model: {model_id}, clean_noise: {remove_background_noise})")
    response = requests.post(url, headers=headers, files=files, data=data)

    if response.status_code == 200:
        return response.content
    else:
        logger.error(f"ElevenLabs Speech-to-Speech Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs Speech-to-Speech error: {response.text}",
        )
