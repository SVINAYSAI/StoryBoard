"""Pydantic schemas for the SRT export endpoint."""

from typing import List
from pydantic import BaseModel


class SRTExportRequest(BaseModel):
    segments: List[dict]
