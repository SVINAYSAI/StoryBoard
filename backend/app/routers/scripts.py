"""Script generation endpoint."""

import logging
from fastapi import APIRouter, HTTPException

from app.schemas.scripts import ScriptRequest
from app.dependencies import get_gcp_access_token
from app.services.gemini import call_gemini_json

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api", tags=["scripts"])


@router.post("/generate-script")
def generate_script(req: ScriptRequest):
    """Generates a structured video script based on options using Gemini."""
    token = get_gcp_access_token()

    research_section = ""
    if req.research_context and req.research_context.strip():
        research_section = (
            f"\nUse the following researched content as the primary factual basis and details for writing the script:\n"
            f"\"\"\"\n{req.research_context.strip()}\n\"\"\"\n"
            "Make sure to incorporate the specific updates, details, and facts from this research into the narration."
        )

    video_type_guidelines = ""
    if req.video_type == "short":
        video_type_guidelines = (
            "This is a Short Content Video (e.g., YouTube Shorts, Instagram Reels, TikTok).\n"
            "- It must have an instant, high-energy hook in the first 3 seconds.\n"
            "- Visual cues should describe quick cuts, text overlays, or dynamic animations.\n"
            "- The narration should be extremely punchy, quick, and designed to keep viewers watching.\n"
            "- Keep sentence structure short and clear."
        )
    else:
        video_type_guidelines = (
            "This is a Long Content Video (e.g., standard YouTube video, explainer, presentation).\n"
            "- It should have a structured introduction, a body divided into multiple distinct detailed segments/sub-topics, and a formal conclusion/call to action.\n"
            "- Visual cues should describe scene setups, screen shares, slide presentations, B-roll, or graphics.\n"
            "- The narration should be engaging, informative, and detailed, allowing for natural pauses."
        )

    prompt = (
        f"Create a video script outline and line-by-line script about the topic: '{req.topic}'.\n"
        f"Video Format: {req.video_type} content ({video_type_guidelines}).\n"
        f"Target Duration: {req.duration} seconds.\n"
        f"Tone: {req.tone}.\n"
        f"Audience: {req.audience}.\n"
        f"Additional constraints: {req.instructions or 'None'}.\n"
        f"{research_section}\n\n"
        "You MUST respond with a valid JSON object matching the following structure. "
        "Do not include any wrapping markdown formatting (like ```json), just return the raw JSON object.\n"
        "{\n"
        '  "topic": "Topic name",\n'
        '  "outline": "A brief summary of the video outline",\n'
        '  "estimated_total_duration": 60,\n'
        '  "segments": [\n'
        "    {\n"
        '      "id": 1,\n'
        '      "section": "Hook (or section name)",\n'
        '      "text": "The exact script spoken by the narrator. Make it engaging, punchy, and appropriate for the voiceover.",\n'
        '      "duration": 10,\n'
        '      "visual_cue": "Description of the visuals, slide content, or animation on screen",\n'
        '      "emotion_tag": "The emotion or delivery style for this segment. Choose from: excited, calm, sorrowful, nervous, cheerfully, dramatically, whispering, shouting, angry, happy, frustrated, playfully, deadpan, or none. Pick the tag that best matches the emotional intent of the segment text."\n'
        "    },\n"
        "    ...\n"
        "  ]\n"
        "}\n\n"
        "Note: Write enough text segments to cover the target duration. Typically, a narrator speaks about 130-150 words per minute (approx. 2-2.5 words per second). Divide the script into logical chunks with text and cues.\n"
        "IMPORTANT: For each segment, you MUST include an 'emotion_tag' field. Pick the single most appropriate emotion from the allowed list that matches how a narrator should deliver that particular section."
    )

    try:
        script_json = call_gemini_json(token, prompt, temperature=0.7)
        return script_json
    except Exception as e:
        logger.error(f"Error generating script: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
