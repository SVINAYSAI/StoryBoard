"""
File storage service.
Handles saving/reading audio files, metadata JSON, and visual assets.
"""

import os
import json
import uuid
import time
import logging
import base64

from app.config import AUDIO_CACHE_DIR, VISUALS_CACHE_DIR

logger = logging.getLogger("studio-backend")


# ── Audio Cache Operations ───────────────────────────────────────────────────


def save_audio_file(audio_bytes: bytes, metadata: dict) -> dict:
    """
    Saves an audio file and its companion metadata JSON.

    Args:
        audio_bytes: Raw MP3 bytes.
        metadata: Metadata dict (must include 'id' for track_id).

    Returns:
        The metadata dict with 'filename' and 'url' populated.
    """
    track_id = metadata.get("id", str(uuid.uuid4()))
    filename = f"voiceover_{track_id}.mp3"
    filepath = os.path.join(AUDIO_CACHE_DIR, filename)

    # Save audio file
    with open(filepath, "wb") as f:
        f.write(audio_bytes)

    # Update metadata with file info
    metadata["filename"] = filename
    metadata["url"] = f"/audio/{filename}"

    # Save companion metadata JSON
    meta_filepath = os.path.join(AUDIO_CACHE_DIR, f"voiceover_{track_id}.json")
    with open(meta_filepath, "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata


def list_voiceover_history() -> list:
    """
    Lists generated voiceovers from the cache, reading JSON metadata files.

    Enhanced/isolated tracks are included alongside plain voiceovers so cleaned
    audio stays in the Studio Cache and can supersede the noisy original for a
    segment (the newest record with matching text wins).
    """
    history = []

    for file in os.listdir(AUDIO_CACHE_DIR):
        if file.endswith(".json") and file.startswith(("voiceover_", "enhanced_")):
            filepath = os.path.join(AUDIO_CACHE_DIR, file)
            try:
                with open(filepath, "r") as f:
                    meta = json.load(f)
                    # Ensure corresponding audio file exists
                    audio_file = os.path.join(AUDIO_CACHE_DIR, meta.get("filename", ""))
                    if os.path.exists(audio_file):
                        history.append(meta)
            except Exception as ex:
                logger.warning(f"Failed to parse metadata file {file}: {str(ex)}")

    # Sort history by newest timestamp first
    history.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return history


def delete_voiceover(filename: str) -> bool:
    """
    Deletes an audio file and its metadata JSON from the cache.

    Returns:
        True if something was deleted, False otherwise.
    """
    clean_filename = os.path.basename(filename)

    # Enhanced tracks surface in the same history list but own extra companion
    # files (the preserved original), so delegate to their dedicated cleanup.
    if clean_filename.startswith(("enhanced_", "original_")):
        return delete_enhanced_audio(clean_filename)

    track_id = clean_filename.replace("voiceover_", "").replace(".mp3", "").replace(".json", "")

    json_path = os.path.join(AUDIO_CACHE_DIR, f"voiceover_{track_id}.json")
    audio_path = os.path.join(AUDIO_CACHE_DIR, f"voiceover_{track_id}.mp3")

    deleted = False
    if os.path.exists(json_path):
        os.remove(json_path)
        deleted = True
    if os.path.exists(audio_path):
        os.remove(audio_path)
        deleted = True

    return deleted


def save_enhanced_audio(
    cleaned_bytes: bytes,
    original_bytes: bytes = None,
    original_url: str = None,
    original_filename: str = "audio.mp3",
    mode: str = "isolation",
    voice_id: str = None,
    voice_name: str = None,
    metadata: dict = None,
) -> dict:
    """
    Saves an enhanced/isolated audio file, its original audio (if provided),
    and companion metadata JSON.

    Returns:
        Metadata dict with 'id', 'url', 'original_url', etc.
    """
    track_id = str(uuid.uuid4())
    cleaned_filename = f"enhanced_{track_id}.mp3"
    cleaned_filepath = os.path.join(AUDIO_CACHE_DIR, cleaned_filename)

    with open(cleaned_filepath, "wb") as f:
        f.write(cleaned_bytes)

    orig_url = original_url
    if original_bytes:
        orig_filename = f"original_{track_id}.mp3"
        orig_filepath = os.path.join(AUDIO_CACHE_DIR, orig_filename)
        with open(orig_filepath, "wb") as f:
            f.write(original_bytes)
        orig_url = f"/audio/{orig_filename}"

    item_meta = {
        "id": track_id,
        "filename": cleaned_filename,
        "url": f"/audio/{cleaned_filename}",
        "original_url": orig_url,
        "original_filename": original_filename,
        "mode": mode,  # "isolation" or "speech_to_speech"
        "voice_id": voice_id,
        "voice_name": voice_name,
        "timestamp": time.time(),
        "size_bytes": len(cleaned_bytes),
    }

    if metadata:
        item_meta.update(metadata)

    meta_filepath = os.path.join(AUDIO_CACHE_DIR, f"enhanced_{track_id}.json")
    with open(meta_filepath, "w") as f:
        json.dump(item_meta, f, indent=2)

    return item_meta


def list_enhanced_audio_history() -> list:
    """Lists locally saved enhanced/isolated audio files from cache."""
    history = []
    for file in os.listdir(AUDIO_CACHE_DIR):
        if file.endswith(".json") and file.startswith("enhanced_"):
            filepath = os.path.join(AUDIO_CACHE_DIR, file)
            try:
                with open(filepath, "r") as f:
                    meta = json.load(f)
                    cleaned_file = os.path.join(AUDIO_CACHE_DIR, meta.get("filename", ""))
                    if os.path.exists(cleaned_file):
                        history.append(meta)
            except Exception as ex:
                logger.warning(f"Failed to parse enhanced metadata file {file}: {str(ex)}")

    history.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return history


def update_enhanced_audio_metadata(filename: str, updates: dict) -> dict:
    """
    Merges `updates` into an enhanced track's metadata JSON and rewrites it.

    Used when assigning cleaned audio to a storyboard segment, so the association
    survives a page reload instead of living only in frontend state.

    Returns:
        The updated metadata dict, or None if the record does not exist.
    """
    clean_filename = os.path.basename(filename)
    track_id = clean_filename.replace("enhanced_", "").replace(".mp3", "").replace(".json", "")
    meta_filepath = os.path.join(AUDIO_CACHE_DIR, f"enhanced_{track_id}.json")

    if not os.path.exists(meta_filepath):
        return None

    with open(meta_filepath, "r") as f:
        meta = json.load(f)

    meta.update(updates)

    with open(meta_filepath, "w") as f:
        json.dump(meta, f, indent=2)

    return meta


def delete_enhanced_audio(filename: str) -> bool:
    """Deletes enhanced audio, original companion audio, and metadata."""
    clean_filename = os.path.basename(filename)
    track_id = clean_filename.replace("enhanced_", "").replace("original_", "").replace(".mp3", "").replace(".json", "")

    json_path = os.path.join(AUDIO_CACHE_DIR, f"enhanced_{track_id}.json")
    clean_path = os.path.join(AUDIO_CACHE_DIR, f"enhanced_{track_id}.mp3")
    orig_path = os.path.join(AUDIO_CACHE_DIR, f"original_{track_id}.mp3")

    deleted = False
    for p in (json_path, clean_path, orig_path):
        if os.path.exists(p):
            try:
                os.remove(p)
                deleted = True
            except Exception as ex:
                logger.warning(f"Error removing {p}: {ex}")

    return deleted


# ── Visual Cache Operations ──────────────────────────────────────────────────


def save_visual_file(file_bytes: bytes, extension: str = "jpg") -> dict:
    """
    Saves a visual asset (image or video) to the visuals cache.

    Returns:
        Dict with 'url' and 'filename'.
    """
    file_id = str(uuid.uuid4())
    filename = f"image_{file_id}.{extension}" if extension in ("jpg", "png") else f"video_{file_id}.{extension}"
    filepath = os.path.join(VISUALS_CACHE_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(file_bytes)

    return {"url": f"/visuals/{filename}", "filename": filename}


def save_base64_image(b64_data: str, extension: str = "jpg") -> dict:
    """
    Decodes base64 image data and saves to visuals cache.

    Returns:
        Dict with 'url' and 'filename'.
    """
    image_bytes = base64.b64decode(b64_data)
    return save_visual_file(image_bytes, extension)


# ── Project File Operations ──────────────────────────────────────────────────


def save_project(project_id: str, name: str, data: dict, projects_dir: str) -> dict:
    """Creates or updates a project JSON file."""
    project = {
        "id": project_id,
        "name": name,
        "created_at": time.time(),
        "updated_at": time.time(),
        "data": data,
    }
    filepath = os.path.join(projects_dir, f"project_{project_id}.json")
    with open(filepath, "w") as f:
        json.dump(project, f, indent=2)
    return project


def load_project(project_id: str, projects_dir: str) -> dict:
    """Loads a project from its JSON file."""
    filepath = os.path.join(projects_dir, f"project_{project_id}.json")
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r") as f:
        return json.load(f)


def list_projects(projects_dir: str) -> list:
    """Lists all saved projects (summary only, without full data)."""
    projects = []
    for file in os.listdir(projects_dir):
        if file.endswith(".json") and file.startswith("project_"):
            filepath = os.path.join(projects_dir, file)
            try:
                with open(filepath, "r") as f:
                    project = json.load(f)
                    projects.append({
                        "id": project.get("id"),
                        "name": project.get("name"),
                        "created_at": project.get("created_at"),
                        "updated_at": project.get("updated_at"),
                    })
            except Exception as ex:
                logger.warning(f"Failed to parse project file {file}: {str(ex)}")

    projects.sort(key=lambda x: x.get("updated_at", 0), reverse=True)
    return projects


def delete_project_file(project_id: str, projects_dir: str) -> bool:
    """Deletes a project JSON file."""
    clean_id = os.path.basename(project_id)
    filepath = os.path.join(projects_dir, f"project_{clean_id}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        return True
    return False
