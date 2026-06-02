import os
import uuid
import time
import json
import logging
import mimetypes
from typing import Optional, List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
from google.oauth2 import service_account
import google.auth.transport.requests
from dotenv import load_dotenv
import base64

# Force register MIME types for correct static files rendering on Windows
mimetypes.init()
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("audio/mpeg", ".mp3")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("studio-backend")

# Load environment
load_dotenv()



app = FastAPI(title="Script Planner & Voiceover Studio API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants & Configurations
AUDIO_CACHE_DIR = os.path.join(os.path.dirname(__file__), "audio_cache")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

PROJECTS_DIR = os.path.join(os.path.dirname(__file__), "projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)

VISUALS_CACHE_DIR = os.path.join(os.path.dirname(__file__), "visuals_cache")
os.makedirs(VISUALS_CACHE_DIR, exist_ok=True)

# Mount static files to serve generated audio
app.mount("/audio", StaticFiles(directory=AUDIO_CACHE_DIR), name="audio")
app.mount("/visuals", StaticFiles(directory=VISUALS_CACHE_DIR), name="visuals")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")

# Helpers for Google Authentication
def get_gcp_access_token() -> str:
    """Authenticates with the Google Cloud Service Account and returns an OAuth token."""
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise HTTPException(
            status_code=500,
            detail="Google Service Account credentials file not found."
        )
    
    try:
        scopes = [
            "https://www.googleapis.com/auth/generative-language",
            "https://www.googleapis.com/auth/generative-language.tuning"
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
            detail=f"GCP Authentication failed: {str(e)}"
        )

# Pydantic Schemas
class ResearchRequest(BaseModel):
    query: str

class ScriptRequest(BaseModel):
    topic: str
    video_type: str  # "short" or "long"
    duration: int    # in seconds (e.g., 30, 120, etc.)
    tone: str        # e.g., Professional, Energetic, Explainer, Dramatic
    audience: str    # e.g., Tech enthusiasts, general public, beginners
    instructions: Optional[str] = ""
    research_context: Optional[str] = ""

class VoiceoverRequest(BaseModel):
    text: str
    voice_id: str
    voice_name: str
    stability: float = 0.5
    similarity_boost: float = 0.75
    model_id: Optional[str] = "eleven_v3"
    style: Optional[float] = 0.0
    use_speaker_boost: Optional[bool] = True
    speed: Optional[float] = 1.0
    emotion_tag: Optional[str] = "none"
    previous_text: Optional[str] = ""
    next_text: Optional[str] = ""
    is_full_script: Optional[bool] = False
    project_id: Optional[str] = None

class ProjectSaveRequest(BaseModel):
    name: str
    data: dict

class SRTExportRequest(BaseModel):
    segments: List[dict]

class SceneBreakdownRequest(BaseModel):
    segments: List[dict]
    topic: Optional[str] = ""
    outline: Optional[str] = ""

class ImageGenerateRequest(BaseModel):
    prompt: str
    model: str

class VideoSubmitRequest(BaseModel):
    prompt: str
    model: str
    aspect_ratio: str
    duration_seconds: Optional[int] = 5

class SingleSceneRegenerateRequest(BaseModel):
    scene: dict
    full_script_context: Optional[str] = ""

class VideoPollRequest(BaseModel):
    operation_name: str

class VideoDownloadRequest(BaseModel):
    video_uri: str

class ScenePromptGenerateRequest(BaseModel):
    scene_text: str
    shot_type: Optional[str] = ""
    mood: Optional[str] = ""
    narration_coverage: Optional[str] = ""


# Endpoints

@app.get("/api/credits")
def get_elevenlabs_credits():
    """Fetches remaining character count from ElevenLabs."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")
    
    url = "https://api.elevenlabs.io/v1/user/subscription"
    headers = {"xi-api-key": ELEVENLABS_API_KEY, "accept": "application/json"}
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return {
                "character_count": data.get("character_count", 0),
                "character_limit": data.get("character_limit", 0),
                "remaining": data.get("character_limit", 0) - data.get("character_count", 0),
                "status": data.get("status", "unknown")
            }
        else:
            logger.error(f"ElevenLabs user API error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"ElevenLabs error: {response.text}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/api/voices")
def get_elevenlabs_voices():
    """Fetches list of available voices from ElevenLabs."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")
    
    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": ELEVENLABS_API_KEY, "accept": "application/json"}
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"ElevenLabs error: {response.text}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/research")
def research_ai_updates(req: ResearchRequest):
    """Researches latest AI updates using Gemini Search Grounding."""
    token = get_gcp_access_token()
    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    prompt = (
        f"You are a professional tech researcher. Search for: '{req.query}'. "
        "Provide a comprehensive, engaging, and well-structured markdown summary of the latest updates, announcements, "
        "or technical details. Organize into clear sections, highlights, and bullet points. "
        "Make sure to list and reference the sources using markdown links where appropriate."
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "tools": [{
            "googleSearch": {}
        }]
    }
    
    try:
        response = requests.post(url, headers=headers, json=body)

        if response.status_code == 200:
            res_data = response.json()
            candidate = res_data.get("candidates", [{}])[0]
            content_parts = candidate.get("content", {}).get("parts", [{}])
            text_response = content_parts[0].get("text", "No text generated.")
            
            # Extract search grounding queries and links
            grounding_metadata = candidate.get("groundingMetadata", {})
            sources = []
            
            chunks = grounding_metadata.get("groundingChunks", [])
            for chunk in chunks:
                web = chunk.get("web", {})
                if web and web.get("uri"):
                    sources.append({
                        "title": web.get("title", "Source"),
                        "uri": web.get("uri")
                    })
            
            return {
                "summary": text_response,
                "sources": sources,
                "queries": grounding_metadata.get("webSearchQueries", [])
            }
        else:
            logger.error(f"Gemini API Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API returned error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error in research updates endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-script")
def generate_script(req: ScriptRequest):
    """Generates a structured video script based on options using Gemini."""
    token = get_gcp_access_token()
    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    research_section = ""
    if req.research_context and req.research_context.strip():
        research_section = f"\nUse the following researched content as the primary factual basis and details for writing the script:\n\"\"\"\n{req.research_context.strip()}\n\"\"\"\nMake sure to incorporate the specific updates, details, and facts from this research into the narration."

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
        "  \"topic\": \"Topic name\",\n"
        "  \"outline\": \"A brief summary of the video outline\",\n"
        "  \"estimated_total_duration\": 60,\n"
        "  \"segments\": [\n"
        "    {\n"
        "      \"id\": 1,\n"
        "      \"section\": \"Hook (or section name)\",\n"
        "      \"text\": \"The exact script spoken by the narrator. Make it engaging, punchy, and appropriate for the voiceover.\",\n"
        "      \"duration\": 10,\n"
        "      \"visual_cue\": \"Description of the visuals, slide content, or animation on screen\",\n"
        "      \"emotion_tag\": \"The emotion or delivery style for this segment. Choose from: excited, calm, sorrowful, nervous, cheerfully, dramatically, whispering, shouting, angry, happy, frustrated, playfully, deadpan, or none. Pick the tag that best matches the emotional intent of the segment text.\"\n"
        "    },\n"
        "    ...\n"
        "  ]\n"
        "}\n\n"
        "Note: Write enough text segments to cover the target duration. Typically, a narrator speaks about 130-150 words per minute (approx. 2-2.5 words per second). Divide the script into logical chunks with text and cues.\n"
        "IMPORTANT: For each segment, you MUST include an 'emotion_tag' field. Pick the single most appropriate emotion from the allowed list that matches how a narrator should deliver that particular section."
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.7
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=body)

        if response.status_code == 200:
            res_data = response.json()
            candidate = res_data.get("candidates", [{}])[0]
            content_parts = candidate.get("content", {}).get("parts", [{}])
            text_response = content_parts[0].get("text", "{}").strip()
            
            # Double check if response has ```json markdown wrapper (fallback parser)
            if text_response.startswith("```json"):
                text_response = text_response.replace("```json", "", 1)
            if text_response.endswith("```"):
                text_response = text_response.rsplit("```", 1)[0]
            
            script_json = json.loads(text_response.strip())
            return script_json
        else:
            logger.error(f"Gemini API Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API returned error: {response.text}"
            )
    except json.JSONDecodeError as je:
        logger.error(f"JSON decode error of model output: {str(je)}. Text was: {text_response}")
        raise HTTPException(
            status_code=500,
            detail="Model failed to generate structured JSON. Please try again."
        )
    except Exception as e:
        logger.error(f"Error generating script: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voiceover")
def create_voiceover(req: VoiceoverRequest):
    """Generates audio for a text line using ElevenLabs, caches it locally, and stores metadata."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured.")
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{req.voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "accept": "audio/mpeg"
    }
    
    # Build final text with emotion tag injection for Eleven v3
    final_text = req.text
    if req.model_id == "eleven_v3" and req.emotion_tag and req.emotion_tag != "none":
        final_text = f"[{req.emotion_tag}] {req.text}"
    
    body = {
        "text": final_text,
        "model_id": req.model_id or "eleven_v3",
        "voice_settings": {
            "stability": req.stability,
            "similarity_boost": req.similarity_boost,
            "style": req.style if req.style is not None else 0.0,
            "use_speaker_boost": req.use_speaker_boost if req.use_speaker_boost is not None else True,
            "speed": req.speed if req.speed is not None else 1.0
        }
    }
    
    # Add continuity context for better prosody across segments
    # Note: previous_text/next_text is NOT supported on eleven_v3 model
    if req.model_id != "eleven_v3":
        if req.previous_text and req.previous_text.strip():
            body["previous_text"] = req.previous_text.strip()
        if req.next_text and req.next_text.strip():
            body["next_text"] = req.next_text.strip()

    
    try:
        response = requests.post(url, headers=headers, json=body)
        if response.status_code == 200:
            # Generate unique identifier for this track
            track_id = str(uuid.uuid4())
            filename = f"voiceover_{track_id}.mp3"
            filepath = os.path.join(AUDIO_CACHE_DIR, filename)
            
            # Save audio file
            with open(filepath, "wb") as f:
                f.write(response.content)
            
            # Create metadata object
            metadata = {
                "id": track_id,
                "filename": filename,
                "url": f"/audio/{filename}",
                "text": req.text,
                "voice_id": req.voice_id,
                "voice_name": req.voice_name,
                "timestamp": time.time(),
                "char_count": len(req.text),
                "model_id": req.model_id,
                "stability": req.stability,
                "similarity_boost": req.similarity_boost,
                "style": req.style,
                "use_speaker_boost": req.use_speaker_boost,
                "speed": req.speed,
                "emotion_tag": req.emotion_tag,
                "is_full_script": req.is_full_script,
                "project_id": req.project_id
            }

            
            # Save companion metadata JSON file for local database history
            meta_filepath = os.path.join(AUDIO_CACHE_DIR, f"voiceover_{track_id}.json")
            with open(meta_filepath, "w") as f:
                json.dump(metadata, f, indent=2)
            
            return metadata
        else:
            logger.error(f"ElevenLabs TTS Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"ElevenLabs API returned error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error in voiceover endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
def get_voiceover_history():
    """Lists generated voiceovers inside local cache, reading their JSON metadata files."""
    history = []
    try:
        for file in os.listdir(AUDIO_CACHE_DIR):
            if file.endswith(".json") and file.startswith("voiceover_"):
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/history/{filename}")
def delete_voiceover(filename: str):
    """Deletes the audio file and its metadata JSON from the cache."""
    # Safety check: make sure we don't delete files outside the cache directory
    clean_filename = os.path.basename(filename)
    if not clean_filename.startswith("voiceover_") or not (clean_filename.endswith(".mp3") or clean_filename.endswith(".json")):
        raise HTTPException(status_code=400, detail="Invalid file deletion request.")
        
    audio_path = os.path.join(AUDIO_CACHE_DIR, clean_filename)
    
    # Extract ID to find the matching metadata JSON file
    track_id = clean_filename.replace("voiceover_", "").replace(".mp3", "").replace(".json", "")
    json_path = os.path.join(AUDIO_CACHE_DIR, f"voiceover_{track_id}.json")
    audio_path_real = os.path.join(AUDIO_CACHE_DIR, f"voiceover_{track_id}.mp3")

    deleted = False
    if os.path.exists(json_path):
        os.remove(json_path)
        deleted = True
    if os.path.exists(audio_path_real):
        os.remove(audio_path_real)
        deleted = True
        
    if deleted:
        return {"status": "success", "message": "Voiceover deleted successfully."}
    else:
        raise HTTPException(status_code=404, detail="Voiceover file not found in history.")


# ========== PROJECT SAVE / LOAD ==========

@app.post("/api/projects")
def save_project(req: ProjectSaveRequest):
    """Saves a project (script state, voice, settings) as a JSON file."""
    project_id = str(uuid.uuid4())
    project = {
        "id": project_id,
        "name": req.name,
        "created_at": time.time(),
        "updated_at": time.time(),
        "data": req.data
    }
    filepath = os.path.join(PROJECTS_DIR, f"project_{project_id}.json")
    with open(filepath, "w") as f:
        json.dump(project, f, indent=2)
    return project


@app.put("/api/projects/{project_id}")
def update_project(project_id: str, req: ProjectSaveRequest):
    """Updates an existing project file."""
    filepath = os.path.join(PROJECTS_DIR, f"project_{project_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Project not found.")
    
    with open(filepath, "r") as f:
        project = json.load(f)
    
    project["name"] = req.name
    project["updated_at"] = time.time()
    project["data"] = req.data
    
    with open(filepath, "w") as f:
        json.dump(project, f, indent=2)
    return project


@app.get("/api/projects")
def list_projects():
    """Lists all saved projects."""
    projects = []
    try:
        for file in os.listdir(PROJECTS_DIR):
            if file.endswith(".json") and file.startswith("project_"):
                filepath = os.path.join(PROJECTS_DIR, file)
                try:
                    with open(filepath, "r") as f:
                        project = json.load(f)
                        # Return summary without full data blob
                        projects.append({
                            "id": project.get("id"),
                            "name": project.get("name"),
                            "created_at": project.get("created_at"),
                            "updated_at": project.get("updated_at")
                        })
                except Exception as ex:
                    logger.warning(f"Failed to parse project file {file}: {str(ex)}")
        projects.sort(key=lambda x: x.get("updated_at", 0), reverse=True)
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}")
def load_project(project_id: str):
    """Loads a single project's full data."""
    filepath = os.path.join(PROJECTS_DIR, f"project_{project_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Project not found.")
    with open(filepath, "r") as f:
        return json.load(f)


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    """Deletes a project file."""
    clean_id = os.path.basename(project_id)
    filepath = os.path.join(PROJECTS_DIR, f"project_{clean_id}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        return {"status": "success", "message": "Project deleted."}
    raise HTTPException(status_code=404, detail="Project not found.")


# ========== SRT SUBTITLE EXPORT ==========

@app.post("/api/export/srt")
def export_srt(req: SRTExportRequest):
    """Generates SRT subtitle content from script segments."""
    srt_lines = []
    current_time = 0.0
    
    for idx, segment in enumerate(req.segments):
        text = segment.get("text", "").strip()
        if not text:
            continue
        
        # Estimate duration: ~2.33 words per second (140 wpm)
        word_count = len(text.split())
        duration = max(2.0, word_count / 2.33)
        
        start_time = current_time
        end_time = current_time + duration
        
        srt_lines.append(str(idx + 1))
        srt_lines.append(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}")
        srt_lines.append(text)
        srt_lines.append("")
        
        current_time = end_time
    
    return {"srt": "\n".join(srt_lines), "total_duration": current_time}


def format_srt_time(seconds: float) -> str:
    """Converts seconds to SRT time format HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"



@app.post("/api/visualize/scenes")
def visualize_scenes(req: SceneBreakdownRequest):
    """Holistically analyzes the full script as a film director and creates an intelligent visual storyboard, grouping content by visual situations rather than individual sentences."""
    token = get_gcp_access_token()
    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
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
        "    \"scene_id\": 1,\n"
        "    \"title\": \"Short evocative scene title (e.g. 'The Hook', 'Crisis Revealed', 'The Turning Point')\",\n"
        "    \"narration_coverage\": \"Which script segments this covers with context (e.g. 'Segments 1-2: Opening hook and premise setup')\",\n"
        "    \"shot_type\": \"Specific cinematic shot type chosen for maximum impact at this moment\",\n"
        "    \"mood\": \"Single dominant emotional tone word (e.g. Inspiring, Tense, Curious, Dramatic, Hopeful, Urgent, Calm)\",\n"
        "    \"visual_strategy\": \"2-3 sentences: WHY this specific visual approach will keep audiences engaged at this exact narrative moment.\",\n"
        "    \"audience_engagement_tip\": \"One specific actionable tip to maximize viewer retention at this scene (e.g. 'Cut to this scene on the beat drop', 'Use a 2-second black hold before the reveal').\",\n"
        "    \"master_prompt_image\": \"Ultra-detailed cinematic still image prompt. Include: photographic style (e.g. editorial, cinematic, documentary), camera lens/settings (e.g. 85mm f/1.8, shallow DOF), lighting setup (e.g. golden hour rim-lit, dramatic chiaroscuro), subject and environment details, composition, color palette, mood. Minimum 60 words.\",\n"
        "    \"master_prompt_video\": \"Ultra-detailed video generation prompt. Include: camera movement (e.g. slow dolly-in, sweeping drone arc), subject actions and timing, pacing (slow motion vs fast cuts), dynamic lighting changes, depth of field effects, specific action sequences, emotional arc of the clip. Minimum 60 words.\"\n"
        "  },\n"
        "  ...\n"
        "]\n"
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.85
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=body)

        if response.status_code == 200:
            res_data = response.json()
            candidate = res_data.get("candidates", [{}])[0]
            content_parts = candidate.get("content", {}).get("parts", [{}])
            text_response = content_parts[0].get("text", "[]").strip()
            
            # Basic cleanup of code block wrappers
            if text_response.startswith("```json"):
                text_response = text_response.replace("```json", "", 1)
            if text_response.endswith("```"):
                text_response = text_response.rsplit("```", 1)[0]
                
            scenes_json = json.loads(text_response.strip())
            return scenes_json
        else:
            logger.error(f"Gemini Visualizer Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API returned error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error in visualizer scenes endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visualize/scene/regenerate")
def regenerate_single_scene(req: SingleSceneRegenerateRequest):
    """Regenerates image and video prompts for a single storyboard scene, maintaining its core concept while producing fresher, more cinematic prompts."""
    token = get_gcp_access_token()
    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
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
        "  \"scene_id\": <same scene_id as input>,\n"
        "  \"title\": \"<same or slightly refined scene title>\",\n"
        "  \"narration_coverage\": \"<same narration coverage>\",\n"
        "  \"shot_type\": \"<same or refined shot type>\",\n"
        "  \"mood\": \"<same or refined mood word>\",\n"
        "  \"visual_strategy\": \"<refined 2-3 sentence visual strategy explanation>\",\n"
        "  \"audience_engagement_tip\": \"<refined specific actionable engagement tip>\",\n"
        "  \"master_prompt_image\": \"<ultra-detailed fresh image prompt, min 60 words, with specific lens, lighting, subject, composition details>\",\n"
        "  \"master_prompt_video\": \"<ultra-detailed fresh video prompt, min 60 words, with camera movement, subject actions, pacing, depth of field details>\"\n"
        "}"
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.95
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=body)

        if response.status_code == 200:
            res_data = response.json()
            candidate = res_data.get("candidates", [{}])[0]
            content_parts = candidate.get("content", {}).get("parts", [{}])
            text_response = content_parts[0].get("text", "{}").strip()
            
            # Basic cleanup of code block wrappers
            if text_response.startswith("```json"):
                text_response = text_response.replace("```json", "", 1)
            if text_response.endswith("```"):
                text_response = text_response.rsplit("```", 1)[0]
                
            scene_json = json.loads(text_response.strip())
            return scene_json
        else:
            logger.error(f"Gemini Single Scene Regen Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API returned error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error in single scene prompt regeneration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visualize/scene/generate-prompts")
def generate_scene_prompts(req: ScenePromptGenerateRequest):
    """Converts a user-supplied scene description into a highly detailed master prompt for both image and video generation using internet standard templates."""
    token = get_gcp_access_token()
    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    image_template = "[Style/Medium] of [Subject] performing [Action] in [Environment], [Lighting/Mood], [Composition/Camera Angle], [Color Palette] --ar 16:9"
    video_template = "[Camera Movement]: [Subject + Action] in [Environment], [Pacing/Speed], [Style/Aesthetic], [Lighting/Atmosphere]"
    
    prompt = (
        "You are an expert film director, visual storyteller, and AI prompt engineer. "
        "Your task is to take a simple scene description and convert it into a highly detailed, professional master prompt for "
        "both image generation (e.g. Imagen 4 / Midjourney) and video generation (e.g. Google Veo / Runway).\n\n"
        
        f"USER SCENE DESCRIPTION:\n\"{req.scene_text}\"\n"
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
        "  \"title\": \"A short, catchy, evocative title for the scene\",\n"
        "  \"shot_type\": \"The shot type chosen (e.g., 'Medium shot', 'Wide establishing shot', 'Extreme closeup')\",\n"
        "  \"mood\": \"Single dominant emotional tone word (e.g., 'Inspiring', 'Tense', 'Curious', 'Dramatic', 'Hopeful', 'Urgent', 'Calm')\",\n"
        "  \"visual_strategy\": \"1-2 sentences explaining why this visual representation is engaging and appropriate for this scene/script portion.\",\n"
        "  \"audience_engagement_tip\": \"One actionable tip for dynamic visual editing or presentation to keep the audience focused.\",\n"
        "  \"master_prompt_image\": \"The generated image prompt conforming strictly to the image template.\",\n"
        "  \"master_prompt_video\": \"The generated video prompt conforming strictly to the video template.\"\n"
        "}"
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.85
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=body)

        if response.status_code == 200:
            res_data = response.json()
            candidate = res_data.get("candidates", [{}])[0]
            content_parts = candidate.get("content", {}).get("parts", [{}])
            text_response = content_parts[0].get("text", "{}").strip()
            
            if text_response.startswith("```json"):
                text_response = text_response.replace("```json", "", 1)
            if text_response.endswith("```"):
                text_response = text_response.rsplit("```", 1)[0]
                
            scene_json = json.loads(text_response.strip())
            return scene_json
        else:
            logger.error(f"Gemini Scene Prompts Generation Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API returned error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error in manual scene prompts generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visualize/image")
def generate_visual_image(req: ImageGenerateRequest):
    """Generates an image via Imagen 4 or Nano Banana 2 and caches it locally."""
    token = get_gcp_access_token()
    
    if req.model == "gemini-3.1-flash-image-preview":
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{req.model}:generateContent"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        body = {
            "contents": [{
                "parts": [{"text": req.prompt}]
            }],
            "generationConfig": {
                "responseModalities": ["IMAGE"]
            }
        }
        
        try:
            response = requests.post(url, headers=headers, json=body)

            if response.status_code == 200:
                res_data = response.json()
                candidate = res_data.get("candidates", [{}])[0]
                parts = candidate.get("content", {}).get("parts", [])
                
                for part in parts:
                    inline_data = part.get("inlineData", {})
                    if inline_data and "data" in inline_data:
                        image_b64 = inline_data["data"]
                        image_bytes = base64.b64decode(image_b64)
                        
                        file_id = str(uuid.uuid4())
                        filename = f"image_{file_id}.jpg"
                        filepath = os.path.join(VISUALS_CACHE_DIR, filename)
                        
                        with open(filepath, "wb") as f:
                            f.write(image_bytes)
                            
                        return {"url": f"/visuals/{filename}", "filename": filename}
                        
                raise HTTPException(status_code=500, detail="No inline image data found in model response.")
            else:
                logger.error(f"Nano Banana 2 Error: Status {response.status_code}, {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
            
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{req.model}:predict"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        body = {
            "instances": [{"prompt": req.prompt}],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": "16:9"
            }
        }
        
        try:
            response = requests.post(url, headers=headers, json=body)

            if response.status_code == 200:
                res_data = response.json()
                predictions = res_data.get("predictions", [])
                if predictions:
                    pred = predictions[0]
                    image_b64 = pred.get("bytesBase64Encoded")
                    if image_b64:
                        image_bytes = base64.b64decode(image_b64)
                        
                        file_id = str(uuid.uuid4())
                        filename = f"image_{file_id}.png"
                        filepath = os.path.join(VISUALS_CACHE_DIR, filename)
                        
                        with open(filepath, "wb") as f:
                            f.write(image_bytes)
                            
                        return {"url": f"/visuals/{filename}", "filename": filename}
                raise HTTPException(status_code=500, detail="No image bytes found in predictions response.")
            else:
                logger.error(f"Imagen API Error: Status {response.status_code}, {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visualize/video/submit")
def submit_visual_video(req: VideoSubmitRequest):
    """Submits an asynchronous video generation task via Veo models."""
    token = get_gcp_access_token()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{req.model}:predictLongRunning"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
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
    
    body = {
        "instances": [{
            "prompt": req.prompt
        }],
        "parameters": {
            "durationSeconds": duration,
            "aspectRatio": req.aspect_ratio
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=body)

        if response.status_code in (200, 202):
            return response.json()
        else:
            logger.error(f"Veo submit job Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Veo submission failed: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error submitting video job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visualize/video/poll")
def poll_visual_video(req: VideoPollRequest):
    """Polls the status of a long-running video generation operation."""
    token = get_gcp_access_token()
    url = f"https://generativelanguage.googleapis.com/v1beta/{req.operation_name}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Veo polling Error: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Veo polling failed: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error polling video job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/visualize/video/download")
def download_visual_video(req: VideoDownloadRequest):
    """Downloads the generated video from the Google server and caches it locally."""
    token = get_gcp_access_token()
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(req.video_uri, headers=headers)
        if response.status_code == 200:
            file_id = str(uuid.uuid4())
            filename = f"video_{file_id}.mp4"
            filepath = os.path.join(VISUALS_CACHE_DIR, filename)
            
            with open(filepath, "wb") as f:
                f.write(response.content)
                
            return {"url": f"/visuals/{filename}", "filename": filename}
        else:
            logger.error(f"Failed to download video bytes: Status {response.status_code}, {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Video download failed: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error downloading video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Health check

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "API Server is running successfully."}
