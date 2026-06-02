"""
Consolidated Gemini API service.
Centralizes the repeated pattern of: auth → build headers → POST → parse → strip markdown → JSON.loads.
"""

import json
import logging
import requests
from fastapi import HTTPException

from app.config import GEMINI_MODEL

logger = logging.getLogger("studio-backend")


def call_gemini(
    token: str,
    prompt: str,
    *,
    model: str = None,
    response_mime_type: str = "application/json",
    temperature: float = 0.7,
    tools: list = None,
    response_modalities: list = None,
):
    """
    Makes a generateContent call to the Gemini API and returns the parsed response.

    Args:
        token: GCP OAuth access token.
        prompt: The text prompt to send.
        model: Gemini model name (defaults to config GEMINI_MODEL).
        response_mime_type: Expected response MIME type.
        temperature: Generation temperature.
        tools: Optional list of tools (e.g., googleSearch).
        response_modalities: Optional response modalities (e.g., ["IMAGE"]).

    Returns:
        Parsed JSON object/list from the model response, or raw text if not JSON.
    """
    model = model or GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
    }

    # Build generation config
    gen_config = {}
    if response_mime_type:
        gen_config["responseMimeType"] = response_mime_type
    if temperature is not None:
        gen_config["temperature"] = temperature
    if response_modalities:
        gen_config["responseModalities"] = response_modalities
    if gen_config:
        body["generationConfig"] = gen_config

    if tools:
        body["tools"] = tools

    response = requests.post(url, headers=headers, json=body)

    if response.status_code != 200:
        logger.error(f"Gemini API Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Gemini API returned error: {response.text}",
        )

    res_data = response.json()
    candidate = res_data.get("candidates", [{}])[0]
    content_parts = candidate.get("content", {}).get("parts", [{}])

    return res_data, candidate, content_parts


def call_gemini_json(
    token: str,
    prompt: str,
    *,
    model: str = None,
    temperature: float = 0.7,
):
    """
    Calls Gemini expecting a JSON response. Handles markdown wrapper stripping and JSON parsing.

    Returns:
        Parsed JSON (dict or list).
    """
    _, _, content_parts = call_gemini(
        token,
        prompt,
        model=model,
        response_mime_type="application/json",
        temperature=temperature,
    )

    text_response = content_parts[0].get("text", "{}").strip()

    # Strip markdown code block wrappers (fallback parser)
    if text_response.startswith("```json"):
        text_response = text_response.replace("```json", "", 1)
    if text_response.endswith("```"):
        text_response = text_response.rsplit("```", 1)[0]

    try:
        return json.loads(text_response.strip())
    except json.JSONDecodeError as je:
        logger.error(f"JSON decode error of model output: {str(je)}. Text was: {text_response}")
        raise HTTPException(
            status_code=500,
            detail="Model failed to generate structured JSON. Please try again.",
        )


def call_gemini_search(
    token: str,
    prompt: str,
    *,
    model: str = None,
):
    """
    Calls Gemini with Google Search grounding enabled.

    Returns:
        Tuple of (text_response, sources, queries).
    """
    _, candidate, content_parts = call_gemini(
        token,
        prompt,
        model=model,
        response_mime_type=None,
        temperature=None,
        tools=[{"googleSearch": {}}],
    )

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
                "uri": web.get("uri"),
            })

    queries = grounding_metadata.get("webSearchQueries", [])

    return text_response, sources, queries


def call_gemini_predict(
    token: str,
    model: str,
    instances: list,
    parameters: dict,
):
    """
    Calls the Gemini predict endpoint (used for Imagen models).

    Returns:
        The full response JSON.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    body = {
        "instances": instances,
        "parameters": parameters,
    }

    response = requests.post(url, headers=headers, json=body)

    if response.status_code != 200:
        logger.error(f"Gemini Predict API Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    return response.json()


def call_gemini_predict_long_running(
    token: str,
    model: str,
    instances: list,
    parameters: dict,
):
    """
    Submits an asynchronous long-running prediction job (used for Veo video generation).

    Returns:
        The operation response JSON.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    body = {
        "instances": instances,
        "parameters": parameters,
    }

    response = requests.post(url, headers=headers, json=body)

    if response.status_code not in (200, 202):
        logger.error(f"Veo submit job Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Veo submission failed: {response.text}",
        )

    return response.json()


def poll_operation(token: str, operation_name: str):
    """
    Polls the status of a long-running operation.

    Returns:
        The operation status JSON.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/{operation_name}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        logger.error(f"Veo polling Error: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Veo polling failed: {response.text}",
        )

    return response.json()


def download_file(token: str, uri: str) -> bytes:
    """
    Downloads a file from a Google-served URI using OAuth.

    Returns:
        The raw bytes of the downloaded file.
    """
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(uri, headers=headers)

    if response.status_code != 200:
        logger.error(f"Failed to download file: Status {response.status_code}, {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"File download failed: {response.text}",
        )

    return response.content
