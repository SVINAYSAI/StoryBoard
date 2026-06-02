"""Project management CRUD endpoints."""

import uuid
import time
import json
import logging
from fastapi import APIRouter, HTTPException

from app.config import PROJECTS_DIR
from app.schemas.projects import ProjectSaveRequest
from app.services.file_storage import (
    load_project,
    list_projects as list_all_projects,
    delete_project_file,
)

import os

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api", tags=["projects"])


@router.post("/projects")
def save_project(req: ProjectSaveRequest):
    """Saves a project (script state, voice, settings) as a JSON file."""
    project_id = str(uuid.uuid4())
    project = {
        "id": project_id,
        "name": req.name,
        "created_at": time.time(),
        "updated_at": time.time(),
        "data": req.data,
    }
    filepath = os.path.join(PROJECTS_DIR, f"project_{project_id}.json")
    with open(filepath, "w") as f:
        json.dump(project, f, indent=2)
    return project


@router.put("/projects/{project_id}")
def update_project(project_id: str, req: ProjectSaveRequest):
    """Updates an existing project file."""
    project = load_project(project_id, PROJECTS_DIR)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project["name"] = req.name
    project["updated_at"] = time.time()
    project["data"] = req.data

    filepath = os.path.join(PROJECTS_DIR, f"project_{project_id}.json")
    with open(filepath, "w") as f:
        json.dump(project, f, indent=2)
    return project


@router.get("/projects")
def list_projects():
    """Lists all saved projects."""
    try:
        return list_all_projects(PROJECTS_DIR)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}")
def get_project(project_id: str):
    """Loads a single project's full data."""
    project = load_project(project_id, PROJECTS_DIR)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    """Deletes a project file."""
    deleted = delete_project_file(project_id, PROJECTS_DIR)
    if deleted:
        return {"status": "success", "message": "Project deleted."}
    raise HTTPException(status_code=404, detail="Project not found.")
