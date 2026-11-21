"""
Music & Sound Effects router.

Endpoints:
  POST /api/music/compose        — generate background music from a text prompt
  POST /api/music/sound-effect   — generate a sound effect from a text description
  GET  /api/music/library        — list locally cached music/sfx files
  DELETE /api/music/library/{id} — delete a cached file
  GET  /api/music/trending       — curated trending prompts for music & SFX
"""

import uuid
import time
import json
import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional

from app.config import ELEVENLABS_API_KEY, BACKEND_ROOT
from app.services.music import generate_sound_effect, compose_music

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api/music", tags=["music"])

# ── Cache directory ───────────────────────────────────────────────────────────
MUSIC_CACHE_DIR = os.path.join(BACKEND_ROOT, "music_cache")
os.makedirs(MUSIC_CACHE_DIR, exist_ok=True)


# ── Schemas ───────────────────────────────────────────────────────────────────

class MusicComposeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    music_length_ms: Optional[int] = Field(None, ge=3000, le=600_000)
    model: str = Field("music_v2_5")
    make_instrumental: bool = Field(True)


class SoundEffectRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    duration_seconds: Optional[float] = Field(None, ge=0.5, le=30.0)
    prompt_influence: float = Field(0.3, ge=0.0, le=1.0)
    loop: bool = Field(False)
    model_id: str = Field("eleven_text_to_sound_v3")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _save_audio(audio_bytes: bytes, metadata: dict, prefix: str) -> dict:
    """Save MP3 + JSON sidecar to music_cache, return enriched metadata."""
    file_id = metadata["id"]
    mp3_path = os.path.join(MUSIC_CACHE_DIR, f"{prefix}_{file_id}.mp3")
    json_path = os.path.join(MUSIC_CACHE_DIR, f"{prefix}_{file_id}.json")

    with open(mp3_path, "wb") as f:
        f.write(audio_bytes)

    metadata["filename"] = f"{prefix}_{file_id}.mp3"
    metadata["file_size"] = len(audio_bytes)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    return metadata


def _list_cache(prefix: str) -> list[dict]:
    """Return all metadata objects from music_cache matching a prefix."""
    items = []
    try:
        for fname in os.listdir(MUSIC_CACHE_DIR):
            if fname.startswith(prefix) and fname.endswith(".json"):
                json_path = os.path.join(MUSIC_CACHE_DIR, fname)
                with open(json_path, "r", encoding="utf-8") as f:
                    items.append(json.load(f))
    except Exception as exc:
        logger.warning(f"Error reading music cache: {exc}")
    # Newest first
    items.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return items


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/compose")
def api_compose_music(req: MusicComposeRequest):
    """Generate a background music track using ElevenLabs /v1/music."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    audio_bytes = compose_music(
        api_key=ELEVENLABS_API_KEY,
        prompt=req.prompt,
        music_length_ms=req.music_length_ms,
        model=req.model,
        make_instrumental=req.make_instrumental,
    )

    file_id = str(uuid.uuid4())
    metadata = {
        "id": file_id,
        "type": "music",
        "prompt": req.prompt,
        "model": req.model,
        "make_instrumental": req.make_instrumental,
        "music_length_ms": req.music_length_ms,
        "timestamp": time.time(),
    }
    saved = _save_audio(audio_bytes, metadata, "music")
    return saved


@router.post("/sound-effect")
def api_generate_sfx(req: SoundEffectRequest):
    """Generate a sound effect using ElevenLabs /v1/sound-generation."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    audio_bytes = generate_sound_effect(
        api_key=ELEVENLABS_API_KEY,
        text=req.text,
        duration_seconds=req.duration_seconds,
        prompt_influence=req.prompt_influence,
        loop=req.loop,
        model_id=req.model_id,
    )

    file_id = str(uuid.uuid4())
    metadata = {
        "id": file_id,
        "type": "sfx",
        "text": req.text,
        "model_id": req.model_id,
        "loop": req.loop,
        "duration_seconds": req.duration_seconds,
        "prompt_influence": req.prompt_influence,
        "timestamp": time.time(),
    }
    saved = _save_audio(audio_bytes, metadata, "sfx")
    return saved


@router.get("/library")
def api_get_library():
    """List all locally-cached music and sound-effect files."""
    music_items = _list_cache("music")
    sfx_items = _list_cache("sfx")
    return {"music": music_items, "sfx": sfx_items}


@router.delete("/library/{file_id}")
def api_delete_library_item(file_id: str):
    """Delete a cached music or SFX file and its metadata."""
    # Sanitise – only alphanumeric and hyphens
    safe_id = "".join(c for c in file_id if c.isalnum() or c == "-")
    deleted = False
    for prefix in ("music", "sfx"):
        for ext in (".mp3", ".json"):
            path = os.path.join(MUSIC_CACHE_DIR, f"{prefix}_{safe_id}{ext}")
            if os.path.exists(path):
                os.remove(path)
                deleted = True
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found.")
    return {"status": "deleted", "id": safe_id}


@router.get("/trending")
def api_trending():
    """
    Returns curated trending prompt examples for music and sound effects.
    These are static suggestions — no external call needed.
    """
    return {
        "music": [
            {
                "id": "tm1",
                "label": "Cinematic Epic",
                "prompt": "Epic orchestral cinematic score with rising strings, dramatic brass, and powerful percussion for a movie trailer",
                "genre": "Cinematic",
                "mood": "Epic",
            },
            {
                "id": "tm2",
                "label": "Lo-Fi Chill",
                "prompt": "Relaxing lo-fi hip hop beat with warm vinyl crackle, mellow piano, and soft drums for studying",
                "genre": "Lo-Fi",
                "mood": "Relaxed",
            },
            {
                "id": "tm3",
                "label": "Corporate Upbeat",
                "prompt": "Upbeat corporate background music with light piano, optimistic guitar, and positive energy for business video",
                "genre": "Corporate",
                "mood": "Positive",
            },
            {
                "id": "tm4",
                "label": "Ambient Space",
                "prompt": "Ethereal ambient space music with deep synth pads, subtle arpeggios, and cosmic atmosphere",
                "genre": "Ambient",
                "mood": "Mysterious",
            },
            {
                "id": "tm5",
                "label": "Electronic Dance",
                "prompt": "High-energy electronic dance music with driving bass, synth leads, and energetic builds",
                "genre": "Electronic",
                "mood": "Energetic",
            },
            {
                "id": "tm6",
                "label": "Acoustic Folk",
                "prompt": "Warm acoustic folk music with fingerpicked guitar, gentle strumming, and a nostalgic heartfelt feel",
                "genre": "Folk",
                "mood": "Warm",
            },
            {
                "id": "tm7",
                "label": "Suspense Thriller",
                "prompt": "Dark suspenseful thriller music with tense strings, low drones, and building unease",
                "genre": "Cinematic",
                "mood": "Tense",
            },
            {
                "id": "tm8",
                "label": "Jazz Lounge",
                "prompt": "Smooth jazz lounge music with muted trumpet, walking bass, light brushed drums, and sophisticated piano chords",
                "genre": "Jazz",
                "mood": "Sophisticated",
            },
        ],
        "sfx": [
            {
                "id": "ts1",
                "label": "Cinematic Boom",
                "text": "Spacious cinematic braam suitable for high-impact movie trailer moments",
                "category": "Cinematic",
            },
            {
                "id": "ts2",
                "label": "Whoosh Fast",
                "text": "Fast aggressive air whoosh with sharp attack perfect for action transitions",
                "category": "Transitions",
            },
            {
                "id": "ts3",
                "label": "Magic Sparkle",
                "text": "Magical twinkling sparkle sound effect with fairy-like shimmer and glitter",
                "category": "Fantasy",
            },
            {
                "id": "ts4",
                "label": "Thunder Crack",
                "text": "Powerful thunderclap followed by deep rolling thunder through storm clouds",
                "category": "Nature",
            },
            {
                "id": "ts5",
                "label": "UI Click",
                "text": "Clean modern UI button click sound with satisfying tactile feedback",
                "category": "UI",
            },
            {
                "id": "ts6",
                "label": "Explosion Impact",
                "text": "Large dramatic explosion with deep bass rumble, debris scatter and smoke hiss",
                "category": "Action",
            },
            {
                "id": "ts7",
                "label": "Rain Ambience",
                "text": "Gentle steady rain falling on leaves and pavement with distant thunder ambience",
                "category": "Ambient",
            },
            {
                "id": "ts8",
                "label": "Sci-Fi Interface",
                "text": "Futuristic sci-fi interface activation sound with digital beeps and holographic hum",
                "category": "Sci-Fi",
            },
        ],
    }
