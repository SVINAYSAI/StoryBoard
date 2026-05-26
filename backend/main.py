import os
import uuid
import time
import json
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
from google.oauth2 import service_account
import google.auth.transport.requests
from dotenv import load_dotenv

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

# Mount static files to serve generated audio
app.mount("/audio", StaticFiles(directory=AUDIO_CACHE_DIR), name="audio")

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
        scopes = ["https://www.googleapis.com/auth/generative-language"]
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
    model_id: Optional[str] = "eleven_monolingual_v1"
    style: Optional[float] = 0.0
    use_speaker_boost: Optional[bool] = True
    speed: Optional[float] = 1.0


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
        "      \"visual_cue\": \"Description of the visuals, slide content, or animation on screen\"\n"
        "    },\n"
        "    ...\n"
        "  ]\n"
        "}\n\n"
        "Note: Write enough text segments to cover the target duration. Typically, a narrator speaks about 130-150 words per minute (approx. 2-2.5 words per second). Divide the script into logical chunks with text and cues."
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
    
    body = {
        "text": req.text,
        "model_id": req.model_id or "eleven_monolingual_v1",
        "voice_settings": {
            "stability": req.stability,
            "similarity_boost": req.similarity_boost,
            "style": req.style if req.style is not None else 0.0,
            "use_speaker_boost": req.use_speaker_boost if req.use_speaker_boost is not None else True,
            "speed": req.speed if req.speed is not None else 1.0
        }
    }

    
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
                "speed": req.speed
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


# Health check
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "API Server is running successfully."}
