/**
 * Hook: useScriptState
 * Manages all script planner lifted states that persist across tabs.
 */

import { useState } from 'react';

export default function useScriptState() {
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptVideoType, setScriptVideoType] = useState('short');
  const [scriptDuration, setScriptDuration] = useState(30);
  const [scriptTone, setScriptTone] = useState('Professional');
  const [scriptAudience, setScriptAudience] = useState('Tech enthusiasts');
  const [scriptInstructions, setScriptInstructions] = useState('');
  const [scriptResearchContext, setScriptResearchContext] = useState('');
  const [scriptOutline, setScriptOutline] = useState('');
  const [scriptSegments, setScriptSegments] = useState([]);
  const [visualScenes, setVisualScenes] = useState([]);

  // Computed active script object
  const activeScript = {
    topic: scriptTopic,
    outline: scriptOutline,
    segments: scriptSegments,
  };

  // Total characters in the active script
  const getScriptTotalCharacters = () => {
    if (!activeScript?.segments) return 0;
    return activeScript.segments.reduce((sum, seg) => sum + (seg.text?.length || 0), 0);
  };

  // Reset all script state (for "New Project")
  const resetScriptState = () => {
    setScriptTopic('');
    setScriptVideoType('short');
    setScriptDuration(30);
    setScriptTone('Professional');
    setScriptAudience('Tech enthusiasts');
    setScriptInstructions('');
    setScriptResearchContext('');
    setScriptOutline('');
    setScriptSegments([]);
    setVisualScenes([]);
  };

  // Restore script state from a loaded project
  const restoreFromProject = (data) => {
    setScriptTopic(data.topic || '');
    setScriptVideoType(data.videoType || 'short');
    setScriptDuration(data.duration || 30);
    setScriptTone(data.tone || 'Professional');
    setScriptAudience(data.audience || 'Tech enthusiasts');
    setScriptInstructions(data.instructions || '');
    setScriptResearchContext(data.researchContext || '');
    setScriptOutline(data.outline || '');
    setScriptSegments(data.segments || []);
    setVisualScenes(data.visualScenes || []);
  };

  // Build project data for saving
  const buildProjectData = (selectedVoice) => ({
    topic: scriptTopic,
    videoType: scriptVideoType,
    duration: scriptDuration,
    tone: scriptTone,
    audience: scriptAudience,
    instructions: scriptInstructions,
    researchContext: scriptResearchContext,
    outline: scriptOutline,
    segments: scriptSegments,
    selectedVoice: selectedVoice
      ? { voice_id: selectedVoice.voice_id, name: selectedVoice.name }
      : null,
    visualScenes: visualScenes,
  });

  return {
    scriptTopic, setScriptTopic,
    scriptVideoType, setScriptVideoType,
    scriptDuration, setScriptDuration,
    scriptTone, setScriptTone,
    scriptAudience, setScriptAudience,
    scriptInstructions, setScriptInstructions,
    scriptResearchContext, setScriptResearchContext,
    scriptOutline, setScriptOutline,
    scriptSegments, setScriptSegments,
    visualScenes, setVisualScenes,
    activeScript,
    getScriptTotalCharacters,
    resetScriptState,
    restoreFromProject,
    buildProjectData,
  };
}
