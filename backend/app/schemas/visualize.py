"""Pydantic schemas for all visualize endpoints."""

from typing import Optional, List
from pydantic import BaseModel


class SceneBreakdownRequest(BaseModel):
    segments: List[dict]
    topic: Optional[str] = ""
    outline: Optional[str] = ""


class ImageGenerateRequest(BaseModel):
    prompt: str
    model: str
    aspect_ratio: str


class VideoSubmitRequest(BaseModel):
    prompt: str
    model: str
    aspect_ratio: str
    duration_seconds: Optional[int] = 5


class SingleSceneRegenerateRequest(BaseModel):
    scene: dict
    full_script_context: Optional[str] = ""


class VideoPollRequest(BaseModel):
    operation_name: str


class VideoDownloadRequest(BaseModel):
    video_uri: str


class ScenePromptGenerateRequest(BaseModel):
    scene_text: str
    aspect_ratio: Optional[str] = "16:9"
    shot_type: Optional[str] = ""
    mood: Optional[str] = ""
    narration_coverage: Optional[str] = ""
