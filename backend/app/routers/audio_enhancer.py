"""
Audio Enhancer & Isolation Router.
Provides endpoints for background noise eradication, vocal isolation,
and speech-to-speech studio vocal enhancement using ElevenLabs API.
"""

import os
import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.config import ELEVENLABS_API_KEY, AUDIO_CACHE_DIR
from app.services.elevenlabs import (
    isolate_audio,
    get_audio_isolation_history,
    delete_audio_isolation_history_item,
    speech_to_speech_enhance,
)
from app.services.file_storage import (
    save_enhanced_audio,
    list_enhanced_audio_history,
    delete_enhanced_audio,
    update_enhanced_audio_metadata,
)

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api/audio-enhancer", tags=["audio-enhancer"])


@router.post("/isolate")
async def isolate_vocals(
    file: Optional[UploadFile] = File(None),
    cached_filename: Optional[str] = Form(None),
    file_format: Optional[str] = Form("other"),
    segment_id: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    voice_id: Optional[str] = Form(None),
    voice_name: Optional[str] = Form(None),
):
    """
    Removes background noise, hums, room reverb, and isolates speech from audio.
    Accepts either an uploaded audio file or a reference to a cached audio file.
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    audio_bytes = None
    original_filename = "audio.mp3"
    original_url = None

    if file and file.filename:
        audio_bytes = await file.read()
        original_filename = file.filename
    elif cached_filename:
        clean_name = os.path.basename(cached_filename)
        cached_path = os.path.join(AUDIO_CACHE_DIR, clean_name)
        if not os.path.exists(cached_path):
            raise HTTPException(status_code=404, detail=f"Cached audio '{clean_name}' not found.")
        with open(cached_path, "rb") as f:
            audio_bytes = f.read()
        original_filename = clean_name
        original_url = f"/audio/{clean_name}"
    else:
        raise HTTPException(status_code=400, detail="No audio file or cached filename provided.")

    if not audio_bytes or len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    try:
        cleaned_bytes = isolate_audio(
            api_key=ELEVENLABS_API_KEY,
            audio_bytes=audio_bytes,
            filename=original_filename,
            file_format=file_format or "other",
        )

        # Carry the source track's text/voice through so the cleaned version is
        # displayable in the Studio Cache and can supersede the noisy original.
        metadata = {
            "segment_id": segment_id,
            "project_id": project_id,
            "cleanup_type": "vocal_isolation",
            "text": text or "",
            "char_count": len(text or ""),
        }

        # If it was an uploaded file, also save original bytes for side-by-side comparison
        orig_bytes_to_save = audio_bytes if not original_url else None

        saved = save_enhanced_audio(
            cleaned_bytes=cleaned_bytes,
            original_bytes=orig_bytes_to_save,
            original_url=original_url,
            original_filename=original_filename,
            mode="isolation",
            voice_id=voice_id,
            voice_name=voice_name,
            metadata=metadata,
        )

        return saved

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during audio isolation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speech-to-speech")
async def speech_to_speech_resynthesize(
    file: Optional[UploadFile] = File(None),
    cached_filename: Optional[str] = Form(None),
    voice_id: str = Form(...),
    voice_name: Optional[str] = Form(""),
    model_id: Optional[str] = Form("eleven_english_sts_v2"),
    stability: Optional[float] = Form(0.5),
    similarity_boost: Optional[float] = Form(0.75),
    style: Optional[float] = Form(0.0),
    remove_background_noise: Optional[bool] = Form(True),
    segment_id: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
):
    """
    Transforms audio into a studio voice while removing background noise,
    maintaining natural cadence, intonation, and timing.
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    audio_bytes = None
    original_filename = "audio.mp3"
    original_url = None

    if file and file.filename:
        audio_bytes = await file.read()
        original_filename = file.filename
    elif cached_filename:
        clean_name = os.path.basename(cached_filename)
        cached_path = os.path.join(AUDIO_CACHE_DIR, clean_name)
        if not os.path.exists(cached_path):
            raise HTTPException(status_code=404, detail=f"Cached audio '{clean_name}' not found.")
        with open(cached_path, "rb") as f:
            audio_bytes = f.read()
        original_filename = clean_name
        original_url = f"/audio/{clean_name}"
    else:
        raise HTTPException(status_code=400, detail="No audio file or cached filename provided.")

    if not audio_bytes or len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    voice_settings = {
        "stability": stability,
        "similarity_boost": similarity_boost,
        "style": style if style is not None else 0.0,
    }

    try:
        enhanced_bytes = speech_to_speech_enhance(
            api_key=ELEVENLABS_API_KEY,
            voice_id=voice_id,
            audio_bytes=audio_bytes,
            filename=original_filename,
            model_id=model_id or "eleven_english_sts_v2",
            voice_settings=voice_settings,
            remove_background_noise=bool(remove_background_noise),
        )

        metadata = {
            "segment_id": segment_id,
            "project_id": project_id,
            "cleanup_type": "speech_to_speech",
            "text": text or "",
            "char_count": len(text or ""),
            "model_id": model_id,
            "remove_background_noise": remove_background_noise,
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": style,
        }

        orig_bytes_to_save = audio_bytes if not original_url else None

        saved = save_enhanced_audio(
            cleaned_bytes=enhanced_bytes,
            original_bytes=orig_bytes_to_save,
            original_url=original_url,
            original_filename=original_filename,
            mode="speech_to_speech",
            voice_id=voice_id,
            voice_name=voice_name,
            metadata=metadata,
        )

        return saved

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during speech-to-speech enhancement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assign-segment")
def assign_enhanced_audio_to_segment(
    filename: str = Form(...),
    segment_id: str = Form(...),
    text: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
):
    """
    Binds a cleaned track to a storyboard segment by stamping the segment's text
    onto its metadata, so the association survives a reload.
    """
    updates = {
        "segment_id": segment_id,
        "text": text or "",
        "char_count": len(text or ""),
    }
    if project_id:
        updates["project_id"] = project_id

    updated = update_enhanced_audio_metadata(filename, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Enhanced audio not found in local cache.")
    return updated


@router.get("/cloud-history")
def fetch_cloud_isolation_history(
    page_size: int = 100,
    page: int = 1,
    search: Optional[str] = None,
):
    """Fetches ElevenLabs cloud audio isolation generation history."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")
    return get_audio_isolation_history(
        api_key=ELEVENLABS_API_KEY,
        page_size=page_size,
        page=page,
        search=search,
    )


@router.delete("/cloud-history/{history_item_id}")
def remove_cloud_isolation_history_item(history_item_id: str):
    """Deletes an audio isolation item from ElevenLabs cloud history."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")
    delete_audio_isolation_history_item(
        api_key=ELEVENLABS_API_KEY,
        history_item_id=history_item_id,
    )
    return {"status": "success", "message": "Cloud history item deleted."}


@router.get("/local-history")
def fetch_local_enhanced_history():
    """Lists locally saved isolated and enhanced audio files."""
    return list_enhanced_audio_history()


@router.delete("/local-history/{filename}")
def remove_local_enhanced_file(filename: str):
    """Deletes locally saved enhanced audio and its metadata."""
    deleted = delete_enhanced_audio(filename)
    if deleted:
        return {"status": "success", "message": "Enhanced audio deleted successfully."}
    raise HTTPException(status_code=404, detail="Enhanced audio not found in local cache.")
