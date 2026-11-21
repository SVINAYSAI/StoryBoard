import React, { useState, useEffect } from 'react';
import {
  Play, Square, Pause, Download, Trash2, Sliders, Volume2, Cpu,
  AlertCircle, RefreshCw, FileDown, Info, Edit, Check, X,
  Zap, Wind, Smile, CloudRain, Flame, Activity, Frown, Sun, 
  VolumeX, Ghost, Meh, Minus, ChevronRight, Wand2
} from 'lucide-react';
import { api } from '../../api';
import { EMOTION_TAGS } from '../../constants';

const EMOTION_ICONS = {
  Zap, Wind, Smile, CloudRain, Flame, Activity, Frown, Sun, 
  VolumeX, Volume2, Ghost, Meh, Minus
};

export default function VoiceOverCreator({
  activeScript,
  selectedVoice,
  generatedAudios,
  onUpdateHistoryWithNewAudio,
  history,
  isLoadingHistory,
  fetchHistory,
  onDeleteHistoryItem,
  onRefreshCredits,
  voices,
  onSelectVoice,
  onUpdateSegments,
  projectId
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playingPreviewVoiceId, setPlayingPreviewVoiceId] = useState(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [generatingSegmentId, setGeneratingSegmentId] = useState(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  // TTS Settings
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [modelId, setModelId] = useState('eleven_v3');
  const [style, setStyle] = useState(0.0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  
  // Local Edit State
  const [editingSegmentId, setEditingSegmentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editEmotionTag, setEditEmotionTag] = useState('none');

  // Search/Filter State
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');

  // Continuous Full Script State
  const [generatingFullScript, setGeneratingFullScript] = useState(false);

  // Manual Audio Generator State
  const [manualText, setManualText] = useState('');
  const [manualEmotionTag, setManualEmotionTag] = useState('none');
  const [manualGenerating, setManualGenerating] = useState(false);

  // Audio Isolation / Cleanup state
  const [isolatingAudioId, setIsolatingAudioId] = useState(null);

  const handleIsolateAudio = async (sourceAudio, segmentId = null) => {
    const trackingId = segmentId || sourceAudio.filename;
    setIsolatingAudioId(trackingId);
    setError('');
    try {
      const formData = new FormData();
      formData.append('cached_filename', sourceAudio.filename);
      if (segmentId) formData.append('segment_id', segmentId);
      if (projectId) formData.append('project_id', projectId);
      // Carry the source track's identity so the cleaned version stays
      // attached to its segment and renders properly in the Studio Cache.
      if (sourceAudio.text) formData.append('text', sourceAudio.text);
      if (sourceAudio.voice_id) formData.append('voice_id', sourceAudio.voice_id);
      if (sourceAudio.voice_name) formData.append('voice_name', sourceAudio.voice_name);

      const enhanced = await api.audioEnhancer.isolate(formData);
      if (onUpdateHistoryWithNewAudio) {
        onUpdateHistoryWithNewAudio(enhanced);
      }
      if (fetchHistory) {
        await fetchHistory();
      }
    } catch (err) {
      setError(err.message || 'Audio isolation failed.');
    } finally {
      setIsolatingAudioId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const handlePlayPreview = (voiceId, previewUrl) => {
    if (playingPreviewVoiceId === voiceId) {
      audioElement.pause();
      setPlayingPreviewVoiceId(null);
      return;
    }
    
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(previewUrl);
    audio.play();
    setAudioElement(audio);
    setPlayingPreviewVoiceId(voiceId);
    
    audio.onended = () => {
      setPlayingPreviewVoiceId(null);
    };
  };

  const handlePlayAudio = (url) => {
    if (playingAudioUrl === url) {
      audioElement.pause();
      setPlayingAudioUrl(null);
      return;
    }
    
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(url);
    audio.play();
    setAudioElement(audio);
    setPlayingAudioUrl(url);
    
    audio.onended = () => {
      setPlayingAudioUrl(null);
    };
  };

  const isAudioPlaying = (url) => playingAudioUrl === url;

  const handleGenerateVoiceover = async (segment) => {
    if (!selectedVoice) {
      setError('Please select a narrator first.');
      return;
    }
    
    setGeneratingSegmentId(segment.id);
    setError('');
    
    try {
      const response = await fetch('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: segment.text,
          voice_id: selectedVoice.voice_id,
          voice_name: selectedVoice.name,
          stability,
          similarity_boost: similarityBoost,
          model_id: modelId,
          style,
          use_speaker_boost: useSpeakerBoost,
          speed,
          emotion_tag: segment.emotion_tag || 'none',
          previous_text: getPreviousSegmentText(segment.id),
          next_text: getNextSegmentText(segment.id),
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Voice generation failed.');
      }
      
      const audioMeta = await response.json();
      if (onUpdateHistoryWithNewAudio) {
        onUpdateHistoryWithNewAudio(audioMeta);
      }
      fetchHistory();
      if (onRefreshCredits) onRefreshCredits();
      
    } catch (err) {
      setError(err.message || 'Error communicating with ElevenLabs.');
    } finally {
      setGeneratingSegmentId(null);
    }
  };

  const handleGenerateFullScriptVoiceover = async () => {
    if (!selectedVoice) {
      setError('Please select a narrator first.');
      return;
    }

    if (!activeScript?.segments?.length) {
      setError('No script segments found.');
      return;
    }

    setGeneratingFullScript(true);
    setError('');

    try {
      const fullText = activeScript.segments.map(s => s.text).join('\n\n');
      
      const response = await fetch('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullText,
          voice_id: selectedVoice.voice_id,
          voice_name: selectedVoice.name,
          stability,
          similarity_boost: similarityBoost,
          model_id: modelId,
          style,
          use_speaker_boost: useSpeakerBoost,
          speed,
          emotion_tag: 'none', // Full script usually doesn't have a single emotion
          project_id: projectId,
          is_full_script: true
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Full script generation failed.');
      }

      const audioMeta = await response.json();
      if (onUpdateHistoryWithNewAudio) {
        onUpdateHistoryWithNewAudio(audioMeta);
      }
      fetchHistory();
      if (onRefreshCredits) onRefreshCredits();

    } catch (err) {
      setError(err.message || 'Error generating full script.');
    } finally {
      setGeneratingFullScript(false);
    }
  };

  const handleGenerateManualVoiceover = async () => {
    if (!selectedVoice) {
      setError('Please select a narrator first.');
      return;
    }

    if (!manualText.trim()) {
      setError('Please enter some text to generate audio.');
      return;
    }

    setManualGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: manualText.trim(),
          voice_id: selectedVoice.voice_id,
          voice_name: selectedVoice.name,
          stability,
          similarity_boost: similarityBoost,
          model_id: modelId,
          style,
          use_speaker_boost: useSpeakerBoost,
          speed,
          emotion_tag: manualEmotionTag,
          previous_text: "",
          next_text: "",
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Manual voice generation failed.');
      }

      const audioMeta = await response.json();
      if (onUpdateHistoryWithNewAudio) {
        onUpdateHistoryWithNewAudio(audioMeta);
      }
      fetchHistory();
      if (onRefreshCredits) onRefreshCredits();
      setManualText(''); // Reset text on success
    } catch (err) {
      setError(err.message || 'Error generating manual voiceover.');
    } finally {
      setManualGenerating(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!selectedVoice) {
      setError('Please select a voice first.');
      return;
    }

    if (!activeScript?.segments?.length) {
      setError('No script segments found.');
      return;
    }

    setBatchGenerating(true);
    setError('');

    try {
      const segmentsToGenerate = activeScript.segments.filter(seg => !generatedAudios[seg.id]);
      const total = segmentsToGenerate.length;

      setBatchProgress({ current: 0, total });

      for (let i = 0; i < segmentsToGenerate.length; i++) {
        const segment = segmentsToGenerate[i];
        setGeneratingSegmentId(segment.id);

        const response = await fetch('/api/voiceover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: segment.text,
            voice_id: selectedVoice.voice_id,
            voice_name: selectedVoice.name,
            stability,
            similarity_boost: similarityBoost,
            model_id: modelId,
            style,
            use_speaker_boost: useSpeakerBoost,
            speed,
            emotion_tag: segment.emotion_tag || 'none',
            previous_text: getPreviousSegmentText(segment.id),
            next_text: getNextSegmentText(segment.id),
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Batch generation failed.');
        }

        const audioMeta = await response.json();
        if (onUpdateHistoryWithNewAudio) {
          onUpdateHistoryWithNewAudio(audioMeta);
        }
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));
      }

      fetchHistory();
      if (onRefreshCredits) onRefreshCredits();
    } catch (err) {
      setError(err.message || 'Batch processing stopped due to an error.');
    } finally {
      setBatchGenerating(false);
      setGeneratingSegmentId(null);
    }
  };

  const getPreviousSegmentText = (id) => {
    const idx = activeScript.segments.findIndex(s => s.id === id);
    if (idx > 0) return activeScript.segments[idx - 1].text;
    return null;
  };

  const getNextSegmentText = (id) => {
    const idx = activeScript.segments.findIndex(s => s.id === id);
    if (idx >= 0 && idx < activeScript.segments.length - 1) return activeScript.segments[idx + 1].text;
    return null;
  };

  const handleExportSRT = async () => {
    if (!activeScript?.segments?.length) return;
    
    try {
      const response = await fetch('/api/export/srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: activeScript.segments })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'script.srt';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('SRT export failed:', err);
    }
  };

  const handleStartEdit = (seg) => {
    setEditingSegmentId(seg.id);
    setEditText(seg.text);
    setEditEmotionTag(seg.emotion_tag || 'none');
  };

  const handleCancelEdit = () => {
    setEditingSegmentId(null);
    setEditText('');
    setEditEmotionTag('none');
  };

  const handleSaveEdit = (id) => {
    if (onUpdateSegments) {
      const newSegments = activeScript.segments.map(s => 
        s.id === id ? { ...s, text: editText, emotion_tag: editEmotionTag } : s
      );
      onUpdateSegments(newSegments);
    }
    setEditingSegmentId(null);
    setEditText('');
    setEditEmotionTag('none');
  };

  const fullScriptAudio = history?.find(h => h.is_full_script && h.project_id === projectId);
  const isFullScriptAudioSync = fullScriptAudio && fullScriptAudio.text === activeScript?.segments?.map(s => s.text).join('\n\n');

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold font-sans text-ink flex items-center gap-3">
            <div className="p-2 rounded-xl bg-link-soft text-link-deep">
              <Volume2 className="w-7 h-7" />
            </div>
            Voiceover Studio
          </h2>
          <p className="text-sm text-body max-w-lg">
            Direct your narrators. Generate high-fidelity ElevenLabs audio for each segment or compile the full script.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeScript && activeScript.segments && activeScript.segments.length > 0 && (
            <>
              <button
                onClick={handleExportSRT}
                className="px-4 py-2 bg-canvas hover:bg-canvas-soft text-ink border border-hairline rounded-full text-xs font-bold transition-all flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-link" />
                <span>Export SRT</span>
              </button>
              <button
                onClick={handleBatchGenerate}
                disabled={batchGenerating || !selectedVoice}
                className="studio-button-primary"
              >
                {batchGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Compiling {batchProgress.current}/{batchProgress.total}</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Process Remaining</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-soft border border-error/10 text-error-deep text-sm font-medium animate-shake flex gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Studio Controls Side Panel */}
        <aside className="xl:col-span-1 space-y-6">
          <div className="space-y-6 sticky top-8">
            {/* Active Voice Selection Card */}
            <div className="studio-card p-5 relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-link/5 rounded-full blur-2xl group-hover:bg-link/10 transition-colors"></div>
              
              <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="text-label text-ink">Active Narrator</h3>
                <button
                  onClick={() => setShowVoiceSearch(!showVoiceSearch)}
                  className="text-[10px] font-bold text-link hover:text-link-deep uppercase tracking-wider"
                >
                  {showVoiceSearch ? "Cancel" : "Change"}
                </button>
              </div>

              {showVoiceSearch ? (
                <div className="space-y-4 relative z-10 animate-fade-in">
                  <input
                    type="text"
                    value={voiceSearchQuery}
                    onChange={(e) => setVoiceSearchQuery(e.target.value)}
                    placeholder="Search voice..."
                    className="w-full studio-input text-xs"
                    autoFocus
                  />
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {voices
                      .filter(v => v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
                      .map(voice => {
                        const isSelected = selectedVoice?.voice_id === voice.voice_id;
                        const isPlayingPreview = playingPreviewVoiceId === voice.voice_id;
                        return (
                          <div
                            key={voice.voice_id}
                            onClick={() => { onSelectVoice(voice); setShowVoiceSearch(false); }}
                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected ? 'border-ink bg-canvas-soft' : 'border-hairline hover:border-hairline-strong bg-canvas'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-xs block truncate">{voice.name}</span>
                              <span className="text-[10px] text-mute capitalize">{voice.labels?.accent || 'Default'}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePlayPreview(voice.voice_id, voice.preview_url); }}
                              className="p-1.5 rounded-md hover:bg-canvas-soft-2 transition-colors"
                            >
                              {isPlayingPreview ? <Square className="w-3 h-3 text-error" /> : <Play className="w-3 h-3" />}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : selectedVoice ? (
                <div className="flex items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-soft text-violet-deep flex items-center justify-center font-bold text-xl shadow-inner border border-violet/10">
                      {selectedVoice.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-ink">{selectedVoice.name}</h4>
                      <p className="text-[10px] text-mute uppercase font-bold tracking-widest">{selectedVoice.labels?.accent || 'Premium'}</p>
                    </div>
                  </div>
                  {selectedVoice.preview_url && (
                    <button
                      onClick={() => handlePlayPreview(selectedVoice.voice_id, selectedVoice.preview_url)}
                      className={`p-2.5 rounded-xl border transition-all ${
                        playingPreviewVoiceId === selectedVoice.voice_id ? 'bg-error-soft border-error/20 text-error' : 'bg-canvas border-hairline hover:border-hairline-strong'
                      }`}
                    >
                      {playingPreviewVoiceId === selectedVoice.voice_id ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-warning-soft border border-warning/10 text-warning-deep text-xs italic">
                  No voice selected. Click "Change" to browse actors.
                </div>
              )}
            </div>

            {/* TTS Settings Card */}
            <div className="studio-card p-6 space-y-6">
              <h3 className="text-label text-ink">Fine Tuning</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-label">AI Model</label>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full studio-input text-xs"
                  >
                    <option value="eleven_v3">Eleven v3 (Emotional) ★</option>
                    <option value="eleven_flash_v2_5">Flash v2.5 (Fast)</option>
                    <option value="eleven_multilingual_v2">Multilingual v2</option>
                    <option value="eleven_turbo_v2">Turbo v2</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Stability', val: stability, set: setStability, min: 0, max: 1 },
                    { label: 'Clarity / Similarity', val: similarityBoost, set: setSimilarityBoost, min: 0, max: 1 },
                    { label: 'Exaggeration', val: style, set: setStyle, min: 0, max: 1 },
                    { label: 'Speed', val: speed, set: setSpeed, min: 0.5, max: 2, step: 0.1 }
                  ].map((slider) => (
                    <div key={slider.label} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-mute">{slider.label}</label>
                        <span className="text-[10px] font-mono font-bold text-ink">{slider.val}{slider.label === 'Speed' ? 'x' : ''}</span>
                      </div>
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step || 0.05}
                        value={slider.val}
                        onChange={(e) => slider.set(parseFloat(e.target.value))}
                        className="w-full h-1 bg-canvas-soft rounded-full appearance-none cursor-pointer accent-ink"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  <span className="text-label">Speaker Boost</span>
                  <button
                    onClick={() => setUseSpeakerBoost(!useSpeakerBoost)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${useSpeakerBoost ? 'bg-link' : 'bg-hairline'}`}
                  >
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${useSpeakerBoost ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Script Compilation Workspace */}
        <div className="xl:col-span-3 space-y-6">
          {/* Manual Audio Generator */}
          <div className="studio-card p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-hairline pb-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-link" />
                  Manual Audio Generator
                </h4>
                <p className="text-xs text-body">
                  Synthesize any custom text manually using the current voice settings.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1 w-full relative">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Enter text to generate speech..."
                  className="w-full studio-input text-sm leading-relaxed min-h-[90px] resize-none"
                />
                {manualText && (
                  <button
                    onClick={() => setManualText('')}
                    className="absolute right-3 top-3 text-mute hover:text-ink p-1 rounded-full hover:bg-canvas-soft-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="w-full md:w-60 space-y-4 shrink-0">
                <div className="space-y-2">
                  <label className="text-label block">Emotion Tag</label>
                  <div className="relative group/emotion">
                    <select
                      value={manualEmotionTag}
                      onChange={(e) => setManualEmotionTag(e.target.value)}
                      className="w-full text-xs font-bold uppercase bg-canvas border border-hairline rounded-lg pl-8 pr-4 py-2.5 appearance-none cursor-pointer focus:border-ink focus:outline-none"
                    >
                      {EMOTION_TAGS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-mute group-hover/emotion:text-violet transition-colors">
                      {(() => {
                        const tag = EMOTION_TAGS.find(t => t.value === manualEmotionTag);
                        const Icon = EMOTION_ICONS[tag?.icon] || Minus;
                        return <Icon className="w-3.5 h-3.5" />;
                      })()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateManualVoiceover}
                  disabled={manualGenerating || !selectedVoice || !manualText.trim()}
                  className="w-full studio-button-primary disabled:opacity-40"
                >
                  {manualGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4" />
                      <span>Generate Audio</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {selectedVoice && (
              <div className="text-[10px] text-mute flex items-center gap-1.5 font-mono pt-1">
                <span>Narrator: <strong>{selectedVoice.name}</strong></span>
                <span>•</span>
                <span>Model: {modelId}</span>
                <span>•</span>
                <span>Chars: {manualText.length}</span>
              </div>
            )}
          </div>

          {activeScript && activeScript.segments && activeScript.segments.length > 0 ? (
            <div className="space-y-6">
              {/* Full Script Master Area */}
              <div className="studio-card overflow-hidden">
                <div className="bg-canvas-soft-2 p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-hairline">
                  <div className="space-y-1 text-center md:text-left">
                    <h4 className="text-lg font-bold text-ink flex items-center justify-center md:justify-start gap-2">
                      <Volume2 className="w-5 h-5 text-violet" />
                      Master Continuous Cut
                    </h4>
                    <p className="text-xs text-body">Synthesize the entire script into a single fluid narration with natural pacing.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {!fullScriptAudio ? (
                      <button
                        onClick={handleGenerateFullScriptVoiceover}
                        disabled={generatingFullScript || !selectedVoice}
                        className="studio-button-primary shadow-lg shadow-primary/10"
                      >
                        {generatingFullScript ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Cpu className="w-4 h-4" />
                        )}
                        <span>{generatingFullScript ? 'Processing...' : 'Generate Full Cut'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayAudio(fullScriptAudio.url)}
                          className={`px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all ${
                            isAudioPlaying(fullScriptAudio.url) ? 'bg-error text-white shadow-lg' : 'bg-success text-white shadow-lg'
                          }`}
                        >
                          {isAudioPlaying(fullScriptAudio.url) ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{isAudioPlaying(fullScriptAudio.url) ? 'Pause Master' : 'Play Master'}</span>
                        </button>
                        <button onClick={() => onDeleteHistoryItem(fullScriptAudio.filename)} className="p-2.5 rounded-full bg-canvas border border-hairline text-mute hover:text-error transition-all hover:border-error/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {fullScriptAudio && (
                  <div className="px-6 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-mute">
                    <div className="flex gap-4">
                      <span>Voice: {fullScriptAudio.voice_name}</span>
                      <span>{fullScriptAudio.char_count} Chars</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isFullScriptAudioSync ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                      <span className={isFullScriptAudioSync ? 'text-success' : 'text-warning'}>{isFullScriptAudioSync ? 'Synced' : 'Modified'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Segments List */}
              <div className="space-y-3">
                <h3 className="text-label text-ink mb-4">Storyboard Segments</h3>
                {activeScript.segments.map((seg, idx) => {
                  const audioMeta = generatedAudios[seg.id];
                  const isGenerating = generatingSegmentId === seg.id;
                  const isEditing = editingSegmentId === seg.id;

                  return (
                    <div key={seg.id} className={`studio-card p-4 transition-all ${audioMeta ? 'border-l-4 border-l-success' : 'border-l-4 border-l-transparent'}`}>
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 min-w-0 w-full">
                          {isEditing ? (
                            <div className="space-y-4 animate-fade-in">
                              <div className="flex items-center gap-4">
                                <span className="text-label">Edit Segment {idx + 1}</span>
                                <div className="relative group/emotion">
                                  <select
                                    value={editEmotionTag}
                                    onChange={(e) => setEditEmotionTag(e.target.value)}
                                    className="text-[10px] font-bold uppercase bg-canvas border border-hairline rounded-full pl-8 pr-4 py-1 appearance-none cursor-pointer"
                                  >
                                    {EMOTION_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                  </select>
                                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-mute group-hover/emotion:text-violet transition-colors">
                                    {(() => {
                                      const tag = EMOTION_TAGS.find(t => t.value === editEmotionTag);
                                      const Icon = EMOTION_ICONS[tag?.icon] || Minus;
                                      return <Icon className="w-3.5 h-3.5" />;
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full studio-input text-sm leading-relaxed min-h-[100px] resize-none"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveEdit(seg.id)} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-full">Save</button>
                                <button onClick={handleCancelEdit} className="px-4 py-2 bg-canvas text-mute text-xs font-bold rounded-full">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-4 items-start">
                              <span className="w-6 h-6 rounded-full bg-canvas-soft flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">{idx + 1}</span>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-ink">{seg.section}</span>
                                  {seg.emotion_tag && seg.emotion_tag !== 'none' && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-violet-soft text-violet-deep px-2 py-0.5 rounded-full border border-violet/10 flex items-center gap-1.5">
                                      {(() => {
                                        const tag = EMOTION_TAGS.find(t => t.value === seg.emotion_tag);
                                        const Icon = EMOTION_ICONS[tag?.icon] || Minus;
                                        return <Icon className="w-2.5 h-2.5" />;
                                      })()}
                                      {seg.emotion_tag}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-body leading-relaxed line-clamp-2 hover:line-clamp-none transition-all cursor-default">{seg.text}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-2 shrink-0 self-center">
                            <button onClick={() => handleStartEdit(seg)} className="p-2.5 rounded-xl bg-canvas border border-hairline hover:border-hairline-strong text-mute hover:text-ink transition-all">
                              <Edit className="w-4 h-4" />
                            </button>
                            {audioMeta ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handlePlayAudio(audioMeta.url)}
                                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                                    isAudioPlaying(audioMeta.url) ? 'bg-error text-white shadow-lg' : 'bg-success/10 text-success border border-success/20'
                                  }`}
                                >
                                  {isAudioPlaying(audioMeta.url) ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                  <span>{isAudioPlaying(audioMeta.url) ? 'Pause' : 'Listen'}</span>
                                </button>
                                <button
                                  onClick={() => handleIsolateAudio(audioMeta, seg.id)}
                                  disabled={isolatingAudioId === seg.id}
                                  title="Isolate vocals & remove background noise with ElevenLabs"
                                  className="p-2.5 rounded-xl border border-hairline hover:bg-violet-500/10 hover:border-violet-500/30 text-violet-400 hover:text-violet-300 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Wand2 className={`w-4 h-4 ${isolatingAudioId === seg.id ? 'animate-spin text-violet-400' : ''}`} />
                                  <span className="text-[10px] font-bold hidden xl:inline">Clean Audio</span>
                                </button>
                                <button onClick={() => handleGenerateVoiceover(seg)} disabled={isGenerating} className="p-2.5 rounded-xl border border-hairline hover:bg-canvas-soft transition-all">
                                  <RefreshCw className={`w-4 h-4 text-mute ${isGenerating ? 'animate-spin text-primary' : ''}`} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateVoiceover(seg)}
                                disabled={isGenerating || !selectedVoice}
                                className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/10 flex items-center gap-2 disabled:opacity-40"
                              >
                                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                                <span>{isGenerating ? 'Synthesizing...' : 'Generate TTS'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center animate-fade-in">
              <div className="w-24 h-24 rounded-3xl bg-canvas-soft border border-hairline flex items-center justify-center shadow-inner">
                <Volume2 className="w-10 h-10 text-mute/50" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-ink">No Script Loaded</h3>
                <p className="text-sm text-body max-w-sm">
                  Go to the Script Planner to design your storyboard first.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audio Cache Library */}
      <div className="studio-card p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-hairline pb-4">
          <h3 className="text-sm font-bold text-ink uppercase tracking-widest flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-mute" />
            Studio Cache
          </h3>
          <button onClick={fetchHistory} className="p-2 rounded-full hover:bg-canvas-soft transition-colors text-mute hover:text-ink">
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {history.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl border border-hairline bg-canvas hover:bg-canvas-soft-2/40 transition-all flex items-center justify-between gap-4 group">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink truncate mb-1.5 italic">"{item.text}"</p>
                  <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-mute">
                    <span className="text-violet-deep">{item.voice_name}</span>
                    <span>•</span>
                    <span>{item.char_count}c</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handlePlayAudio(item.url)} className={`p-2 rounded-lg transition-all ${isAudioPlaying(item.url) ? 'bg-error text-white shadow-md' : 'bg-canvas-soft text-body hover:text-ink shadow-inner'}`}>
                    {isAudioPlaying(item.url) ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleIsolateAudio(item)}
                    disabled={isolatingAudioId === item.filename}
                    title="Isolate vocals & remove noise with ElevenLabs"
                    className="p-2 rounded-lg bg-canvas-soft text-body hover:text-violet-400 shadow-inner transition-all cursor-pointer"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isolatingAudioId === item.filename ? 'animate-spin text-violet-400' : ''}`} />
                  </button>
                  <a href={item.url} download={item.filename} className="p-2 rounded-lg bg-canvas-soft text-body hover:text-ink shadow-inner transition-all">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => onDeleteHistoryItem(item.filename)} className="p-2 rounded-lg bg-canvas-soft text-body hover:text-error opacity-0 group-hover:opacity-100 transition-all shadow-inner">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-mute font-medium italic">Your audio library is empty.</div>
        )}
      </div>
    </div>
  );
}
