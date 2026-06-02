"""
Shared FastAPI dependencies.
Provides reusable dependency functions for route handlers.
"""

import logging
import os
from fastapi import HTTPException
from google.oauth2 import service_account
import google.auth.transport.requests

from app.config import SERVICE_ACCOUNT_FILE

logger = logging.getLogger("studio-backend")


def get_gcp_access_token() -> str:
    """Authenticates with the Google Cloud Service Account and returns an OAuth token."""
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise HTTPException(
            status_code=500,
            detail="Google Service Account credentials file not found.",
        )

    try:
        scopes = [
            "https://www.googleapis.com/auth/generative-language",
            "https://www.googleapis.com/auth/generative-language.tuning",
        ]
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=scopes
        )
        auth_request = google.auth.transport.requests.Request()
        creds.refresh(auth_request)
        return creds.token
    except Exception as e:
        logger.error(f"Error fetching GCP OAuth token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"GCP Authentication failed: {str(e)}",
        )
