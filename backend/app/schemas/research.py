"""Pydantic schemas for the research endpoint."""

from pydantic import BaseModel


class ResearchRequest(BaseModel):
    query: str
