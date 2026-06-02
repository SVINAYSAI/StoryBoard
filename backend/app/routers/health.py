"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check():
    return {"status": "ok", "message": "API Server is running successfully."}
