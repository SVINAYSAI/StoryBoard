"""Voiceover generation and history endpoints."""

import uuid
import time
import logging
from fastapi import APIRouter, HTTPException

from app.config import ELEVENLABS_API_KEY
from app.schemas.voiceover import VoiceoverRequest
from app.services.elevenlabs import generate_tts
from app.services.file_storage import save_audio_file, list_voiceover_history, delete_voiceover

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api", tags=["voiceover"])


@router.post("/voiceover")
def create_voiceover(req: VoiceoverRequest):
    """Generates audio for a text line using ElevenLabs, caches it locally, and stores metadata."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    # Build final text with emotion tag injection for Eleven v3
    final_text = req.text
    if req.model_id == "eleven_v3" and req.emotion_tag and req.emotion_tag != "none":
        final_text = f"[{req.emotion_tag}] {req.text}"

    voice_settings = {
        "stability": req.stability,
        "similarity_boost": req.similarity_boost,
        "style": req.style if req.style is not None else 0.0,
        "use_speaker_boost": req.use_speaker_boost if req.use_speaker_boost is not None else True,
        "speed": req.speed if req.speed is not None else 1.0,
    }

    try:
        audio_bytes = generate_tts(
            api_key=ELEVENLABS_API_KEY,
            voice_id=req.voice_id,
            text=final_text,
            model_id=req.model_id or "eleven_v3",
            voice_settings=voice_settings,
            previous_text=req.previous_text or "",
            next_text=req.next_text or "",
        )

        # Build metadata
        track_id = str(uuid.uuid4())
        metadata = {
            "id": track_id,
            "text": req.text,
            "voice_id": req.voice_id,
            "voice_name": req.voice_name,
            "timestamp": time.time(),
            "char_count": len(req.text),
            "model_id": req.model_id,
            "stability": req.stability,
            "similarity_boost": req.similarity_boost,
            "style": req.style,
            "use_speaker_boost": req.use_speaker_boost,
            "speed": req.speed,
            "emotion_tag": req.emotion_tag,
            "is_full_script": req.is_full_script,
            "project_id": req.project_id,
        }

        saved_metadata = save_audio_file(audio_bytes, metadata)
        return saved_metadata

    except Exception as e:
        logger.error(f"Error in voiceover endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_voiceover_history():
    """Lists generated voiceovers inside local cache, reading their JSON metadata files."""
    try:
        return list_voiceover_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{filename}")
def delete_voiceover_file(filename: str):
    """Deletes the audio file and its metadata JSON from the cache."""
    # Safety check: make sure we don't delete files outside the cache directory
    import os
    # Enhanced/isolated tracks appear in this same history listing.
    clean_filename = os.path.basename(filename)
    if not clean_filename.startswith(("voiceover_", "enhanced_")) or not (
        clean_filename.endswith(".mp3") or clean_filename.endswith(".json")
    ):
        raise HTTPException(status_code=400, detail="Invalid file deletion request.")

    deleted = delete_voiceover(clean_filename)

    if deleted:
        return {"status": "success", "message": "Voiceover deleted successfully."}
    else:
        raise HTTPException(status_code=404, detail="Voiceover file not found in history.")
