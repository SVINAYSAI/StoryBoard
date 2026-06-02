"""Pydantic schemas for the script generation endpoint."""

from typing import Optional
from pydantic import BaseModel


class ScriptRequest(BaseModel):
    topic: str
    video_type: str  # "short" or "long"
    duration: int    # in seconds (e.g., 30, 120, etc.)
    tone: str        # e.g., Professional, Energetic, Explainer, Dramatic
    audience: str    # e.g., Tech enthusiasts, general public, beginners
    instructions: Optional[str] = ""
    research_context: Optional[str] = ""
