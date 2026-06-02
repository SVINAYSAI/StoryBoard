/**
 * Shared constants used across multiple components.
 * Eliminates duplicated arrays (e.g. EMOTION_TAGS was copy-pasted in 2 files).
 */

export const EMOTION_TAGS = [
  { value: 'none', label: 'None', icon: 'Minus' },
  { value: 'excited', label: 'Excited', icon: 'Zap' },
  { value: 'calm', label: 'Calm', icon: 'Wind' },
  { value: 'happy', label: 'Happy', icon: 'Smile' },
  { value: 'sorrowful', label: 'Sorrowful', icon: 'CloudRain' },
  { value: 'angry', label: 'Angry', icon: 'Flame' },
  { value: 'nervous', label: 'Nervous', icon: 'Activity' },
  { value: 'frustrated', label: 'Frustrated', icon: 'Frown' },
  { value: 'cheerfully', label: 'Cheerful', icon: 'Sun' },
  { value: 'dramatically', label: 'Dramatic', icon: 'Masks' },
  { value: 'whispering', label: 'Whisper', icon: 'VolumeX' },
  { value: 'shouting', label: 'Shout', icon: 'Volume2' },
  { value: 'playfully', label: 'Playful', icon: 'Ghost' },
  { value: 'deadpan', label: 'Deadpan', icon: 'Meh' },
];

export const IMAGE_MODELS = [
  { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Fast Native, Featured)' },
  { value: 'imagen-4.0-generate-001', label: 'Imagen 4 (High Quality)' },
];

export const VIDEO_MODELS = [
  { value: 'veo-3.1-generate-preview', label: 'Veo 3.1 (Latest, Featured)' },
  { value: 'veo-2.0-generate-001', label: 'Veo 2 (Standard)' },
];

export const MENU_ITEMS = [
  { id: 'research', name: 'AI Research', desc: 'Google search grounding' },
  { id: 'planner', name: 'Script Planner', desc: 'Storyboard outline builder' },
  { id: 'library', name: 'Voice Library', desc: 'Audition ElevenLabs actors' },
  { id: 'studio', name: 'Voiceover Studio', desc: 'Generate & play audios' },
  { id: 'visuals', name: 'Storyboard Visuals', desc: 'Generate images & videos' },
];

export const MENU_ICONS = {
  research: 'Search',
  planner: 'FileText',
  library: 'User',
  studio: 'Volume2',
  visuals: 'Sparkles',
};
