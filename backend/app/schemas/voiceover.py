"""Pydantic schemas for voiceover endpoints."""

from typing import Optional
from pydantic import BaseModel


class VoiceoverRequest(BaseModel):
    model_config = {"protected_namespaces": ()}

    text: str
    voice_id: str
    voice_name: str
    stability: float = 0.5
    similarity_boost: float = 0.75
    model_id: Optional[str] = "eleven_v3"
    style: Optional[float] = 0.0
    use_speaker_boost: Optional[bool] = True
    speed: Optional[float] = 1.0
    emotion_tag: Optional[str] = "none"
    previous_text: Optional[str] = ""
    next_text: Optional[str] = ""
    is_full_script: Optional[bool] = False
    project_id: Optional[str] = None
