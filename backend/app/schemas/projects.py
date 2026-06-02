"""Pydantic schemas for project management endpoints."""

from pydantic import BaseModel


class ProjectSaveRequest(BaseModel):
    name: str
    data: dict
