"""Storyboard visualizer endpoints — scene breakdown, image/video generation, prompts."""

import json
import logging
from fastapi import APIRouter, HTTPException

from app.schemas.visualize import (
    SceneBreakdownRequest,
    ImageGenerateRequest,
    VideoSubmitRequest,
    SingleSceneRegenerateRequest,
    VideoPollRequest,
    VideoDownloadRequest,
    ScenePromptGenerateRequest,
)
from app.dependencies import get_gcp_access_token
from app.services.gemini import (
    call_gemini,
    call_gemini_json,
    call_gemini_predict,
    call_gemini_predict_long_running,
    poll_operation,
    download_file,
)
from app.services.file_storage import save_base64_image, save_visual_file

logger = logging.getLogger("studio-backend")

router = APIRouter(prefix="/api", tags=["visualize"])


# ── Scene Breakdown ──────────────────────────────────────────────────────────


@router.post("/visualize/scenes")
def visualize_scenes(req: SceneBreakdownRequest):
    """Holistically analyzes the full script as a film director and creates an intelligent visual storyboard."""
    token = get_gcp_access_token()

    # Build full script context from all segments
    full_narration = "\n".join([
        f"[Segment {i+1}] {seg.get('text', '')}"
        for i, seg in enumerate(req.segments)
    ])

    script_context = ""
    if req.topic:
        script_context += f"Topic: {req.topic}\n"
    if req.outline:
        script_context += f"Script Outline: {req.outline}\n\n"
    script_context += f"Full Script ({len(req.segments)} narration segments):\n{full_narration}"

    prompt = (
        "You are a world-class film director, visual storyteller, and audience engagement specialist. "
        "Your task is to analyze the following video script and design an INTELLIGENT VISUAL STORYBOARD "
        "that will captivate audiences and maximize viewer retention throughout.\n\n"

        "CRITICAL RULES — READ CAREFULLY:\n"
        "1. DO NOT create one scene per script segment. Script segments are narration/pacing chunks, NOT visual beats.\n"
        "2. Instead, group content into distinct VISUAL SITUATIONS — narrative beats, emotional peaks, "
        "key reveals, topic shifts, climactic statements, transitions, concept introductions, etc.\n"
        "3. Think as a film director: decide HOW MANY scenes are needed for maximum visual impact "
        "INDEPENDENTLY of how many script segments exist. A good storyboard for a 30-90s script has 4-8 scenes.\n"
        "4. Every scene must have a UNIQUE visual approach — no repetitive shots or compositions.\n"
        "5. Make prompts SPECIFIC and CINEMATIC: include lighting, lens, color grade, subject details, "
        "environments, and actions. Generic prompts produce generic visuals — be precise.\n\n"

        "SHOT TYPE VOCABULARY (use these and others as appropriate):\n"
        "- Wide establishing shot, Medium shot, Extreme closeup, Over-the-shoulder shot\n"
        "- Split-screen montage, Picture-in-picture, Dynamic kinetic text animation\n"
        "- Abstract metaphor visualization, Symbolic/conceptual imagery\n"
        "- B-roll cutaway footage, Documentary-style footage, Aerial/drone shot\n"
        "- Slow-motion product/subject detail, Timelapse sequence\n"
        "- Data visualization / infographic animation, HUD/UI overlay aesthetic\n"
        "- POV first-person shot, Whip-pan action moment, Rack focus reveal\n\n"

        f"SCRIPT TO ANALYZE:\n{script_context}\n\n"

        "For each scene you design, deeply consider:\n"
        "- What VISUAL SITUATION or NARRATIVE MOMENT does this represent?\n"
        "- What shot type creates the STRONGEST EMOTIONAL IMPACT here?\n"
        "- How does this visual CUE AUDIENCE CURIOSITY or stir EMOTION?\n"
        "- What specific CINEMATIC DETAILS make this feel premium and professional?\n"
        "- Is the audience at risk of losing attention here? How do you counter that?\n\n"

        "You MUST respond with a valid JSON array. "
        "Do NOT include markdown formatting or code block wrappers — return ONLY the raw JSON array.\n"
        "[\n"
        "  {\n"
        '    "scene_id": 1,\n'
        '    "title": "Short evocative scene title (e.g. \'The Hook\', \'Crisis Revealed\', \'The Turning Point\')",\n'
        '    "narration_coverage": "Which script segments this covers with context (e.g. \'Segments 1-2: Opening hook and premise setup\')",\n'
        '    "shot_type": "Specific cinematic shot type chosen for maximum impact at this moment",\n'
        '    "mood": "Single dominant emotional tone word (e.g. Inspiring, Tense, Curious, Dramatic, Hopeful, Urgent, Calm)",\n'
        '    "visual_strategy": "2-3 sentences: WHY this specific visual approach will keep audiences engaged at this exact narrative moment.",\n'
        '    "audience_engagement_tip": "One specific actionable tip to maximize viewer retention at this scene (e.g. \'Cut to this scene on the beat drop\', \'Use a 2-second black hold before the reveal\').",\n'
        '    "master_prompt_image": "Ultra-detailed cinematic still image prompt. Include: photographic style (e.g. editorial, cinematic, documentary), camera lens/settings (e.g. 85mm f/1.8, shallow DOF), lighting setup (e.g. golden hour rim-lit, dramatic chiaroscuro), subject and environment details, composition, color palette, mood. Minimum 60 words.",\n'
        '    "master_prompt_video": "Ultra-detailed video generation prompt. Include: camera movement (e.g. slow dolly-in, sweeping drone arc), subject actions and timing, pacing (slow motion vs fast cuts), dynamic lighting changes, depth of field effects, specific action sequences, emotional arc of the clip. Minimum 60 words."\n'
        "  },\n"
        "  ...\n"
        "]\n"
    )

    try:
        scenes_json = call_gemini_json(token, prompt, temperature=0.85)
        return scenes_json
    except Exception as e:
        logger.error(f"Error in visualizer scenes endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Single Scene Regenerate ──────────────────────────────────────────────────


@router.post("/visualize/scene/regenerate")
def regenerate_single_scene(req: SingleSceneRegenerateRequest):
    """Regenerates image and video prompts for a single storyboard scene."""
    token = get_gcp_access_token()

    context_section = ""
    if req.full_script_context and req.full_script_context.strip():
        context_section = f"Full Script Context (for reference):\n{req.full_script_context.strip()}\n\n"

    prompt = (
        "You are a world-class film director and visual storytelling specialist. "
        "Regenerate the image and video generation prompts for the following storyboard scene. "
        "Keep the scene's core narrative intent, shot type, and mood, but produce "
        "FRESH, highly specific, and more cinematic prompts than before.\n\n"
        f"{context_section}"
        f"Scene to Regenerate:\n{json.dumps(req.scene, indent=2)}\n\n"
        "Return ONLY a valid JSON object (no markdown wrappers) with this exact structure:\n"
        "{\n"
        '  "scene_id": <same scene_id as input>,\n'
        '  "title": "<same or slightly refined scene title>",\n'
        '  "narration_coverage": "<same narration coverage>",\n'
        '  "shot_type": "<same or refined shot type>",\n'
        '  "mood": "<same or refined mood word>",\n'
        '  "visual_strategy": "<refined 2-3 sentence visual strategy explanation>",\n'
        '  "audience_engagement_tip": "<refined specific actionable engagement tip>",\n'
        '  "master_prompt_image": "<ultra-detailed fresh image prompt, min 60 words, with specific lens, lighting, subject, composition details>",\n'
        '  "master_prompt_video": "<ultra-detailed fresh video prompt, min 60 words, with camera movement, subject actions, pacing, depth of field details>"\n'
        "}"
    )

    try:
        scene_json = call_gemini_json(token, prompt, temperature=0.95)
        return scene_json
    except Exception as e:
        logger.error(f"Error in single scene prompt regeneration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Manual Scene Prompt Generation ───────────────────────────────────────────


@router.post("/visualize/scene/generate-prompts")
def generate_scene_prompts(req: ScenePromptGenerateRequest):
    """Converts a user-supplied scene description into detailed master prompts for both image and video generation."""
    token = get_gcp_access_token()

    image_template = "[Style/Medium] of [Subject] performing [Action] in [Environment], [Lighting/Mood], [Composition/Camera Angle], [Color Palette] --ar 16:9"
    video_template = "[Camera Movement]: [Subject + Action] in [Environment], [Pacing/Speed], [Style/Aesthetic], [Lighting/Atmosphere]"

    prompt = (
        "You are an expert film director, visual storyteller, and AI prompt engineer. "
        "Your task is to take a simple scene description and convert it into a highly detailed, professional master prompt for "
        "both image generation (e.g. Imagen 4 / Midjourney) and video generation (e.g. Google Veo / Runway).\n\n"

        f'USER SCENE DESCRIPTION:\n"{req.scene_text}"\n'
        f"SHOT TYPE (preferred, suggest if blank): {req.shot_type or 'None'}\n"
        f"MOOD (preferred, suggest if blank): {req.mood or 'None'}\n"
        f"NARRATION COVERAGE: {req.narration_coverage or 'None'}\n\n"

        "CRITICAL INSTRUCTIONS FOR PROMPT GENERATION:\n"
        "1. For the Image Prompt (`master_prompt_image`), you MUST follow this exact format strictly:\n"
        f"   `{image_template}`\n"
        "   - Expand the description to be cinematic, descriptive, and specify the exact medium (e.g. 'Cinematic photograph', 'Photorealistic digital art'), camera lens, details, mood, lighting, and color palette.\n"
        "   - Ensure the prompt ends with '--ar 16:9'. Do not write generic sentences; make it a descriptive tag-based or descriptive sentence-based prompt.\n\n"

        "2. For the Video Prompt (`master_prompt_video`), you MUST follow this exact format strictly:\n"
        f"   `{video_template}`\n"
        "   - Specify the camera movement at the very beginning (e.g. 'Slow dolly in', 'Sweeping drone pan', 'Dynamic tracking shot', 'Orbiting around').\n"
        "   - Detail the actions, motion, timing, pacing, and visual style.\n\n"

        "You MUST respond with a valid JSON object matching the following structure. "
        "Do not include any wrapping markdown formatting (like ```json), just return the raw JSON object.\n"
        "{\n"
        '  "title": "A short, catchy, evocative title for the scene",\n'
        '  "shot_type": "The shot type chosen (e.g., \'Medium shot\', \'Wide establishing shot\', \'Extreme closeup\')",\n'
        '  "mood": "Single dominant emotional tone word (e.g., \'Inspiring\', \'Tense\', \'Curious\', \'Dramatic\', \'Hopeful\', \'Urgent\', \'Calm\')",\n'
        '  "visual_strategy": "1-2 sentences explaining why this visual representation is engaging and appropriate for this scene/script portion.",\n'
        '  "audience_engagement_tip": "One actionable tip for dynamic visual editing or presentation to keep the audience focused.",\n'
        '  "master_prompt_image": "The generated image prompt conforming strictly to the image template.",\n'
        '  "master_prompt_video": "The generated video prompt conforming strictly to the video template."\n'
        "}"
    )

    try:
        scene_json = call_gemini_json(token, prompt, temperature=0.85)
        return scene_json
    except Exception as e:
        logger.error(f"Error in manual scene prompts generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Image Generation ─────────────────────────────────────────────────────────


@router.post("/visualize/image")
def generate_visual_image(req: ImageGenerateRequest):
    """Generates an image via Imagen 4 or Nano Banana 2 and caches it locally."""
    token = get_gcp_access_token()

    if req.model == "gemini-3.1-flash-image-preview":
        # Native image generation via generateContent with IMAGE modality
        _, _, content_parts = call_gemini(
            token,
            req.prompt,
            model=req.model,
            response_mime_type=None,
            temperature=None,
            response_modalities=["IMAGE"],
        )

        for part in content_parts:
            inline_data = part.get("inlineData", {})
            if inline_data and "data" in inline_data:
                return save_base64_image(inline_data["data"], "jpg")

        raise HTTPException(status_code=500, detail="No inline image data found in model response.")
    else:
        # Imagen predict endpoint
        res_data = call_gemini_predict(
            token,
            req.model,
            instances=[{"prompt": req.prompt}],
            parameters={"sampleCount": 1, "aspectRatio": "16:9"},
        )

        predictions = res_data.get("predictions", [])
        if predictions:
            image_b64 = predictions[0].get("bytesBase64Encoded")
            if image_b64:
                return save_base64_image(image_b64, "png")

        raise HTTPException(status_code=500, detail="No image bytes found in predictions response.")


# ── Video Generation (Submit / Poll / Download) ──────────────────────────────


@router.post("/visualize/video/submit")
def submit_visual_video(req: VideoSubmitRequest):
    """Submits an asynchronous video generation task via Veo models."""
    token = get_gcp_access_token()

    requested_duration = req.duration_seconds or 6
    if "veo-3" in req.model:
        # Enforce Veo 3 rules: must be an even integer between 4 and 8 inclusive.
        if requested_duration < 4:
            duration = 4
        elif requested_duration > 8:
            duration = 8
        else:
            duration = int(requested_duration)
            if duration % 2 != 0:
                duration = duration + 1 if duration < 8 else duration - 1
    else:
        # Veo 2: between 5 and 8 seconds
        duration = max(5, min(8, requested_duration))

    return call_gemini_predict_long_running(
        token,
        req.model,
        instances=[{"prompt": req.prompt}],
        parameters={"durationSeconds": duration, "aspectRatio": req.aspect_ratio},
    )


@router.post("/visualize/video/poll")
def poll_visual_video(req: VideoPollRequest):
    """Polls the status of a long-running video generation operation."""
    token = get_gcp_access_token()
    return poll_operation(token, req.operation_name)


@router.post("/visualize/video/download")
def download_visual_video(req: VideoDownloadRequest):
    """Downloads the generated video from the Google server and caches it locally."""
    token = get_gcp_access_token()
    video_bytes = download_file(token, req.video_uri)
    return save_visual_file(video_bytes, "mp4")
