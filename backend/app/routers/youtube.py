"""Download authorized YouTube videos and optional timestamped clips."""

import glob
import logging
import mimetypes
import os
import shutil
import uuid
from urllib.parse import urlsplit
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from app.config import BACKEND_ROOT

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

YOUTUBE_DOWNLOAD_DIR = os.path.join(BACKEND_ROOT, "youtube_downloads")
os.makedirs(YOUTUBE_DOWNLOAD_DIR, exist_ok=True)

ALLOWED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}
ALLOWED_QUALITIES = {"best", "2160", "1440", "1080", "720", "480", "360"}


class YoutubeRequest(BaseModel):
    url: str = Field(..., min_length=11, max_length=2048)
    has_permission: bool = False


class YoutubeDownloadRequest(YoutubeRequest):
    media_type: Literal["video", "audio"] = "video"
    quality: str = "best"
    start_seconds: float | None = Field(None, ge=0)
    end_seconds: float | None = Field(None, gt=0)


def _validate_request(url: str, has_permission: bool) -> str:
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="Confirm that you own this video or have permission to download it.",
        )

    try:
        parsed = urlsplit(url.strip())
        port = parsed.port
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid HTTPS YouTube video URL.") from exc
    if (
        parsed.scheme != "https"
        or parsed.hostname not in ALLOWED_HOSTS
        or parsed.username
        or parsed.password
        or port not in (None, 443)
    ):
        raise HTTPException(status_code=422, detail="Enter a valid HTTPS YouTube video URL.")
    return url.strip()


def _youtube_dl():
    try:
        import yt_dlp
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="yt-dlp is not installed. Install the backend requirements and restart the server.",
        ) from exc
    return yt_dlp


def _extract_video_info(url: str) -> dict:
    yt_dlp = _youtube_dl()
    options = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
    }

    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        logger.warning("Could not inspect YouTube video: %s", exc)
        raise HTTPException(
            status_code=422,
            detail="Could not read this video. Check that the link is public and available.",
        ) from exc

    if not info or info.get("_type") == "playlist" or info.get("entries"):
        raise HTTPException(status_code=422, detail="Please enter a link to a single YouTube video.")
    return info


def _available_heights(info: dict) -> list[int]:
    heights = {
        video_format.get("height")
        for video_format in (info.get("formats") or [])
        if isinstance(video_format.get("height"), int)
    }
    if isinstance(info.get("height"), int):
        heights.add(info["height"])
    return sorted(heights, reverse=True)


@router.post("/info")
def get_youtube_info(req: YoutubeRequest):
    """Return basic video details and available video resolutions."""
    url = _validate_request(req.url, req.has_permission)
    info = _extract_video_info(url)
    return {
        "title": info.get("title") or "YouTube video",
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "qualities": _available_heights(info),
    }


@router.post("/download")
def download_youtube_video(req: YoutubeDownloadRequest):
    """Download video or extracted audio, optionally limited to a timestamped section."""
    url = _validate_request(req.url, req.has_permission)
    if req.quality not in ALLOWED_QUALITIES:
        raise HTTPException(status_code=422, detail="Select a supported video quality.")
    if (req.start_seconds is None) != (req.end_seconds is None):
        raise HTTPException(
            status_code=422,
            detail="Enter both a start and end time, or leave both blank to download the full video.",
        )
    if req.start_seconds is not None and req.end_seconds <= req.start_seconds:
        raise HTTPException(status_code=422, detail="The end time must be after the start time.")

    info = _extract_video_info(url)
    if req.end_seconds is not None:
        duration = info.get("duration")
        if duration is not None and req.end_seconds > duration:
            raise HTTPException(status_code=422, detail="The end time is longer than the video.")

    if not shutil.which("ffmpeg"):
        raise HTTPException(
            status_code=503,
            detail="FFmpeg is required to prepare video/audio downloads and trim timestamps.",
        )

    yt_dlp = _youtube_dl()
    file_id = uuid.uuid4().hex
    filename_prefix = os.path.join(YOUTUBE_DOWNLOAD_DIR, f"storyboard_{file_id}")
    if req.media_type == "audio":
        format_selector = "bestaudio/best"
    else:
        format_selector = (
            "bestvideo+bestaudio/best"
            if req.quality == "best"
            else f"bestvideo[height<={req.quality}]+bestaudio/best[height<={req.quality}]"
        )
    options = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "format": format_selector,
        "outtmpl": f"{filename_prefix}.%(ext)s",
    }
    if req.media_type == "audio":
        options["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "0",
        }]
    else:
        options["merge_output_format"] = "mp4"
    if req.start_seconds is not None:
        options["download_sections"] = [f"*{req.start_seconds}-{req.end_seconds}"]
        if req.media_type == "video":
            options["force_keyframes_at_cuts"] = True

    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            downloader.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as exc:
        for partial_file in glob.glob(f"{filename_prefix}.*"):
            os.remove(partial_file)
        logger.warning("Could not download YouTube video: %s", exc)
        raise HTTPException(
            status_code=422,
            detail="yt-dlp could not download this video. It may be private or unavailable.",
        ) from exc

    downloaded_files = [
        path
        for path in glob.glob(f"{filename_prefix}.*")
        if os.path.isfile(path) and not path.endswith((".part", ".ytdl"))
    ]
    if not downloaded_files:
        raise HTTPException(status_code=500, detail="The download finished without producing a video file.")

    downloaded_path = downloaded_files[0]
    media_type = mimetypes.guess_type(downloaded_path)[0] or "application/octet-stream"
    return FileResponse(
        downloaded_path,
        media_type=media_type,
        filename=os.path.basename(downloaded_path),
        background=BackgroundTask(os.remove, downloaded_path),
    )
