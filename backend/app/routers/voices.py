"""ElevenLabs voices endpoint."""

from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query

from app.config import ELEVENLABS_API_KEY
from app.services.elevenlabs import get_voices as fetch_voices
from app.services.elevenlabs import search_shared_voices

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


@router.get("/voice-library")
def get_voice_library(
    search: Optional[str] = Query(None, description="Search by name, description, labels"),
    gender: Optional[str] = Query(None, description="Filter by gender"),
    age: Optional[str] = Query(None, description="Filter by age"),
    accent: Optional[str] = Query(None, description="Filter by accent"),
    language: Optional[str] = Query(None, description="Filter by language"),
    locale: Optional[str] = Query(None, description="Filter by locale"),
    category: Optional[str] = Query(None, description="Filter by category (professional, famous, high_quality)"),
    use_cases: Optional[str] = Query(None, description="Comma-separated use cases"),
    descriptives: Optional[str] = Query(None, description="Comma-separated descriptive tags"),
    featured: Optional[bool] = Query(None, description="Show only featured voices"),
    sort: Optional[str] = Query(None, description="Sort by: created_date, trending, usage_character_count_1y, cloned_by_count"),
    page: int = Query(0, ge=0, description="Page number (0-indexed)"),
    page_size: int = Query(30, ge=1, le=100, description="Results per page (max 100)"),
    reader_app_enabled: Optional[bool] = Query(None, description="Filter reader-app-enabled voices"),
    owner_id: Optional[str] = Query(None, description="Filter by owner ID"),
):
    """
    Searches the ElevenLabs shared Voice Library with all available filters.
    
    Proxies to GET /v1/shared-voices on the ElevenLabs API.
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")

    # Parse comma-separated list params
    use_cases_list = [u.strip() for u in use_cases.split(",") if u.strip()] if use_cases else None
    descriptives_list = [d.strip() for d in descriptives.split(",") if d.strip()] if descriptives else None

    try:
        return search_shared_voices(
            api_key=ELEVENLABS_API_KEY,
            page_size=page_size,
            page=page,
            category=category,
            gender=gender,
            age=age,
            accent=accent,
            language=language,
            locale=locale,
            search=search,
            use_cases=use_cases_list,
            descriptives=descriptives_list,
            featured=featured,
            sort=sort,
            reader_app_enabled=reader_app_enabled,
            owner_id=owner_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
