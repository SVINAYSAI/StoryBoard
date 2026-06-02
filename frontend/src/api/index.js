/**
 * Centralized API service.
 * All backend API calls go through here — eliminates raw fetch() scattered across components.
 */

const BASE = '';  // Proxied via Vite dev server

async function fetchJSON(url, options = {}) {
  const response = await fetch(`${BASE}${url}`, options);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Request failed: ${response.statusText}`);
  }
  return response.json();
}

async function postJSON(url, body) {
  return fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function putJSON(url, body) {
  return fetchJSON(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function deleteJSON(url) {
  return fetchJSON(url, { method: 'DELETE' });
}

// ── API Namespaces ──────────────────────────────────────────────────────────

export const api = {
  credits: {
    get: () => fetchJSON('/api/credits'),
  },

  voices: {
    get: () => fetchJSON('/api/voices'),
  },

  research: {
    search: (query) => postJSON('/api/research', { query }),
  },

  scripts: {
    generate: (data) => postJSON('/api/generate-script', data),
  },

  voiceover: {
    generate: (data) => postJSON('/api/voiceover', data),
  },

  history: {
    list: () => fetchJSON('/api/history'),
    delete: (filename) => deleteJSON(`/api/history/${filename}`),
  },

  projects: {
    list: () => fetchJSON('/api/projects'),
    get: (id) => fetchJSON(`/api/projects/${id}`),
    create: (name, data) => postJSON('/api/projects', { name, data }),
    update: (id, name, data) => putJSON(`/api/projects/${id}`, { name, data }),
    delete: (id) => deleteJSON(`/api/projects/${id}`),
  },

  export: {
    srt: (segments) => postJSON('/api/export/srt', { segments }),
  },

  visualize: {
    scenes: (data) => postJSON('/api/visualize/scenes', data),
    sceneRegenerate: (data) => postJSON('/api/visualize/scene/regenerate', data),
    scenePrompts: (data) => postJSON('/api/visualize/scene/generate-prompts', data),
    image: (data) => postJSON('/api/visualize/image', data),
    videoSubmit: (data) => postJSON('/api/visualize/video/submit', data),
    videoPoll: (data) => postJSON('/api/visualize/video/poll', data),
    videoDownload: (data) => postJSON('/api/visualize/video/download', data),
  },
};
