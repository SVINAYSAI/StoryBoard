"""
FastAPI application factory.
Creates the app, configures middleware, mounts static files, and includes all routers.
"""

import os
import mimetypes
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import AUDIO_CACHE_DIR, VISUALS_CACHE_DIR, CORS_ORIGINS, BACKEND_ROOT
from app.routers import (
    health,
    credits,
    voices,
    research,
    scripts,
    voiceover,
    projects,
    export,
    visualize,
    audio_enhancer,
    music,
    youtube,
)

# ── Music cache directory ────────────────────────────────────────────────────
MUSIC_CACHE_DIR = os.path.join(BACKEND_ROOT, "music_cache")
os.makedirs(MUSIC_CACHE_DIR, exist_ok=True)

# ── MIME type registration (Windows compatibility) ───────────────────────────
mimetypes.init()
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("audio/mpeg", ".mp3")

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)

# ── App Instance ─────────────────────────────────────────────────────────────
app = FastAPI(title="Script Planner & Voiceover Studio API")

# ── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static File Mounts ───────────────────────────────────────────────────────
app.mount("/audio", StaticFiles(directory=AUDIO_CACHE_DIR), name="audio")
app.mount("/visuals", StaticFiles(directory=VISUALS_CACHE_DIR), name="visuals")
app.mount("/music", StaticFiles(directory=MUSIC_CACHE_DIR), name="music")

# ── Router Includes ──────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(credits.router)
app.include_router(voices.router)
app.include_router(research.router)
app.include_router(scripts.router)
app.include_router(voiceover.router)
app.include_router(projects.router)
app.include_router(export.router)
app.include_router(visualize.router)
app.include_router(audio_enhancer.router)
app.include_router(music.router)
app.include_router(youtube.router)
