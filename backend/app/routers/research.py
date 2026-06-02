"""Research (Gemini Search Grounding) endpoint."""

import logging
from fastapi import APIRouter, HTTPException

from app.schemas.research import ResearchRequest
from app.dependencies import get_gcp_access_token
from app.services.gemini import call_gemini_search

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api", tags=["research"])


@router.post("/research")
def research_ai_updates(req: ResearchRequest):
    """Researches latest AI updates using Gemini Search Grounding."""
    token = get_gcp_access_token()

    prompt = (
        f"You are a professional tech researcher. Search for: '{req.query}'. "
        "Provide a comprehensive, engaging, and well-structured markdown summary of the latest updates, announcements, "
        "or technical details. Organize into clear sections, highlights, and bullet points. "
        "Make sure to list and reference the sources using markdown links where appropriate."
    )

    try:
        text_response, sources, queries = call_gemini_search(token, prompt)

        return {
            "summary": text_response,
            "sources": sources,
            "queries": queries,
        }
    except Exception as e:
        logger.error(f"Error in research updates endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
