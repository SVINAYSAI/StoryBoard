"""ElevenLabs credits endpoint."""

from fastapi import APIRouter, HTTPException

from app.config import ELEVENLABS_API_KEY
from app.services.elevenlabs import get_subscription_credits

router = APIRouter(prefix="/api", tags=["credits"])


@router.get("/credits")
def get_elevenlabs_credits():
    """Fetches remaining character count from ElevenLabs."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    try:
        return get_subscription_credits(ELEVENLABS_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
