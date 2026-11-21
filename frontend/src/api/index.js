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

async function postFormData(url, formData) {
  return fetchJSON(url, {
    method: 'POST',
    body: formData,
  });
}

async function postBlob(url, body) {
  const response = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Request failed: ${response.statusText}`);
  }
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'youtube-video';
  return { blob: await response.blob(), filename };
}

// ── API Namespaces ──────────────────────────────────────────────────────────

export const api = {
  credits: {
    get: () => fetchJSON('/api/credits'),
  },

  voices: {
    get: () => fetchJSON('/api/voices'),
  },

  voiceLibrary: {
    search: (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && value !== 'all') {
          // Convert camelCase to snake_case for API
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          params.append(snakeKey, value);
        }
      });
      const qs = params.toString();
      return fetchJSON(`/api/voice-library${qs ? `?${qs}` : ''}`);
    },
  },

  research: {
    search: (query) => postJSON('/api/research', { query }),
  },

  youtube: {
    info: (data) => postJSON('/api/youtube/info', data),
    download: (data) => postBlob('/api/youtube/download', data),
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

  audioEnhancer: {
    isolate: (formData) => postFormData('/api/audio-enhancer/isolate', formData),
    speechToSpeech: (formData) => postFormData('/api/audio-enhancer/speech-to-speech', formData),
    assignSegment: (formData) => postFormData('/api/audio-enhancer/assign-segment', formData),
    getCloudHistory: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchJSON(`/api/audio-enhancer/cloud-history${qs ? `?${qs}` : ''}`);
    },
    deleteCloudHistory: (id) => deleteJSON(`/api/audio-enhancer/cloud-history/${id}`),
    getLocalHistory: () => fetchJSON('/api/audio-enhancer/local-history'),
    deleteLocalHistory: (filename) => deleteJSON(`/api/audio-enhancer/local-history/${filename}`),
  },

  music: {
    composeMusic: (data) => postJSON('/api/music/compose', data),
    generateSfx: (data) => postJSON('/api/music/sound-effect', data),
    getLibrary: () => fetchJSON('/api/music/library'),
    deleteLibraryItem: (id) => deleteJSON(`/api/music/library/${id}`),
    getTrending: () => fetchJSON('/api/music/trending'),
  },
};
