"""
Centralized application configuration.
All environment variables, file paths, and constants are managed here.
"""

import os
from dotenv import load_dotenv

# Load .env from the backend root directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# ── Directory Paths ──────────────────────────────────────────────────────────
BACKEND_ROOT = os.path.dirname(os.path.dirname(__file__))

AUDIO_CACHE_DIR = os.path.join(BACKEND_ROOT, "audio_cache")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

PROJECTS_DIR = os.path.join(BACKEND_ROOT, "projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)

VISUALS_CACHE_DIR = os.path.join(BACKEND_ROOT, "visuals_cache")
os.makedirs(VISUALS_CACHE_DIR, exist_ok=True)

# ── API Keys & Credentials ──────────────────────────────────────────────────
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

SERVICE_ACCOUNT_FILE = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS",
    os.path.join(BACKEND_ROOT, "service-account.json"),
)

# ── Model Defaults ───────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-2.5-flash"

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS = ["*"]
