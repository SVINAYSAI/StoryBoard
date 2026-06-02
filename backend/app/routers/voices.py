"""ElevenLabs voices endpoint."""

from fastapi import APIRouter, HTTPException

from app.config import ELEVENLABS_API_KEY
from app.services.elevenlabs import get_voices as fetch_voices

router = APIRouter(prefix="/api", tags=["voices"])


@router.get("/voices")
def get_elevenlabs_voices():
    """Fetches list of available voices from ElevenLabs."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    try:
        return fetch_voices(ELEVENLABS_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
