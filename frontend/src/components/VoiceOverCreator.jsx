import React, { useState, useEffect } from 'react';
import { Play, Square, Pause, Download, Trash2, Sliders, Volume2, Cpu, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';

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
  voices = [],
  onSelectVoice
}) {
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [modelId, setModelId] = useState('eleven_monolingual_v1');
  const [style, setStyle] = useState(0.0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [speed, setSpeed] = useState(1.0);

  const [showVoiceSearch, setShowVoiceSearch] = useState(false);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');

  const [generatingSegmentId, setGeneratingSegmentId] = useState(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [error, setError] = useState('');

  // Audio Player states
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  const [playingPreviewVoiceId, setPlayingPreviewVoiceId] = useState(null);
  const [previewAudioElement, setPreviewAudioElement] = useState(null);

  useEffect(() => {
    return () => {
      if (previewAudioElement) {
        previewAudioElement.pause();
      }
    };
  }, [previewAudioElement]);

  const handlePlayPreview = (voiceId, previewUrl) => {
    if (!previewUrl) return;

    if (playingPreviewVoiceId === voiceId) {
      if (previewAudioElement) {
        previewAudioElement.pause();
      }
      setPlayingPreviewVoiceId(null);
    } else {
      if (previewAudioElement) {
        previewAudioElement.pause();
      }
      
      // Stop the segment audio player if it is playing
      if (audioElement) {
        audioElement.pause();
        setPlayingAudioUrl(null);
      }

      const audio = new Audio(previewUrl);
      audio.play().catch(err => console.error("Error playing preview", err));
      setPreviewAudioElement(audio);
      setPlayingPreviewVoiceId(voiceId);

      audio.onended = () => {
        setPlayingPreviewVoiceId(null);
      };
    }
  };

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handlePlayAudio = (url) => {
    // Stop the preview player if it's playing
    if (previewAudioElement) {
      previewAudioElement.pause();
      setPlayingPreviewVoiceId(null);
    }

    // Vite proxy directs /audio to http://localhost:8000/audio
    if (playingAudioUrl === url) {
      if (audioElement) {
        if (audioElement.paused) {
          audioElement.play().catch(e => console.error(e));
        } else {
          audioElement.pause();
        }
        // Trigger a force re-render to update icon
        setPlayingAudioUrl(url);
      }
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(url);
      audio.play().catch(err => console.error("Error playing audio", err));
      setAudioElement(audio);
      setPlayingAudioUrl(url);

      audio.onended = () => {
        setPlayingAudioUrl(null);
      };
      audio.onpause = () => {
        // Trigger re-render to show play icon
        setPlayingAudioUrl(url);
      };
    }
  };

  const isAudioPlaying = (url) => {
    return playingAudioUrl === url && audioElement && !audioElement.paused;
  };

  const handleGenerateVoiceover = async (segment) => {
    if (!selectedVoice) {
      setError('Please select a voice from the library first.');
      return;
    }
    if (!segment.text || !segment.text.trim()) {
      setError('Cannot generate audio for empty segment text.');
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
          speed
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Voice generation failed.');
      }

      const audioMeta = await response.json();
      
      // Update global audio map via history update
      if (onUpdateHistoryWithNewAudio) {
        onUpdateHistoryWithNewAudio(audioMeta);
      }
      
      // Refresh local cache listing & credits
      fetchHistory();
      if (onRefreshCredits) {
        onRefreshCredits();
      }
    } catch (err) {
      setError(err.message || 'Error occurred generating TTS.');
    } finally {
      setGeneratingSegmentId(null);
    }
  };

  const handleBatchGenerate = async () => {
    if (!selectedVoice) {
      setError('Please select a voice from the library first.');
      return;
    }
    if (!activeScript || !activeScript.segments || activeScript.segments.length === 0) {
      setError('No active script segments found to compile.');
      return;
    }

    setBatchGenerating(true);
    setError('');

    try {
      const segmentsToGenerate = activeScript.segments.filter(seg => !generatedAudios[seg.id]);
      
      for (const segment of segmentsToGenerate) {
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
            speed
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(`Failed on segment "${segment.section}": ${errData.detail}`);
        }

        const audioMeta = await response.json();
        if (onUpdateHistoryWithNewAudio) {
          onUpdateHistoryWithNewAudio(audioMeta);
        }
      }

      fetchHistory();
      if (onRefreshCredits) {
        onRefreshCredits();
      }
    } catch (err) {
      setError(err.message || 'Error occurred during batch voiceover generation.');
    } finally {
      setGeneratingSegmentId(null);
      setBatchGenerating(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-accent-purple" />
            Voiceover Production Studio
          </h2>
          <p className="text-sm text-slate-400">
            Generate ElevenLabs audio files for each storyboard segment, audit recordings, and view generation logs.
          </p>
        </div>

        {/* Global actions */}
        {activeScript && activeScript.segments && activeScript.segments.length > 0 && (
          <button
            onClick={handleBatchGenerate}
            disabled={batchGenerating || !selectedVoice}
            className="px-5 py-2.5 bg-gradient-to-r from-accent-purple to-accent-blue hover:shadow-lg hover:shadow-accent-purple/20 text-white font-medium rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {batchGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Compiling Script TTS...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Generate Remaining Audio</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main split dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Studio controls side */}
        <div className="space-y-6">
          {/* Active Voice Info */}
          <div className="glass-panel rounded-2xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-20 h-20 bg-accent-blue/10 rounded-full blur-xl"></div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-3 relative z-10">
              <h3 className="font-display font-semibold text-white">Active Narrator</h3>
              <button
                onClick={() => setShowVoiceSearch(!showVoiceSearch)}
                className="text-xs text-accent-purple hover:text-accent-purple/80 font-medium transition-colors flex items-center gap-1"
              >
                {showVoiceSearch ? "Close Search" : "Change Voice"}
              </button>
            </div>

            {showVoiceSearch ? (
              <div className="space-y-3 relative z-10">
                <div className="relative">
                  <input
                    type="text"
                    value={voiceSearchQuery}
                    onChange={(e) => setVoiceSearchQuery(e.target.value)}
                    placeholder="Search narrator by name..."
                    className="w-full pl-3 pr-8 py-2 bg-[#0a0c10]/80 border border-slate-800 focus:border-accent-purple/55 hover:border-slate-700 rounded-xl text-xs focus:outline-none transition-all text-white"
                    autoFocus
                  />
                  {voiceSearchQuery && (
                    <button 
                      onClick={() => setVoiceSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {voices
                    .filter(v => v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
                    .map(voice => {
                      const isSelected = selectedVoice?.voice_id === voice.voice_id;
                      const isPlayingPreview = playingPreviewVoiceId === voice.voice_id;
                      return (
                        <div 
                          key={voice.voice_id}
                          onClick={() => {
                            onSelectVoice(voice);
                            setShowVoiceSearch(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                            isSelected 
                              ? 'border-accent-purple/50 bg-accent-purple/5' 
                              : 'border-slate-850 bg-slate-900/20 hover:border-slate-750 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-white truncate">{voice.name}</span>
                              {voice.category === 'cloned' && (
                                <span className="text-[8px] bg-accent-blue/15 border border-accent-blue/30 text-accent-blue px-1 rounded uppercase scale-90">Clone</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {voice.labels?.gender && (
                                <span className="text-[8px] bg-slate-950/60 text-slate-400 px-1 py-0.5 rounded capitalize">{voice.labels.gender}</span>
                              )}
                              {voice.labels?.accent && (
                                <span className="text-[8px] bg-slate-950/60 text-slate-400 px-1 py-0.5 rounded capitalize max-w-[60px] truncate">{voice.labels.accent}</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPreview(voice.voice_id, voice.preview_url);
                            }}
                            disabled={!voice.preview_url}
                            className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                              isPlayingPreview
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-white disabled:opacity-30'
                            }`}
                          >
                            {isPlayingPreview ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </button>
                        </div>
                      );
                    })}
                  {voices.filter(v => v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-[11px] text-slate-500 italic text-center py-4">No matching voices found.</p>
                  )}
                </div>
              </div>
            ) : selectedVoice ? (
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/25 text-accent-purple flex items-center justify-center font-display font-bold text-lg">
                    {selectedVoice.name[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">{selectedVoice.name}</h4>
                    <p className="text-[10px] text-slate-400 capitalize">{selectedVoice.labels?.accent || 'Premade'} accent, {selectedVoice.labels?.gender || 'Unknown'}</p>
                  </div>
                </div>
                {selectedVoice.preview_url && (
                  <button
                    onClick={() => handlePlayPreview(selectedVoice.voice_id, selectedVoice.preview_url)}
                    className={`p-2 rounded-xl border transition-colors shrink-0 ${
                      playingPreviewVoiceId === selectedVoice.voice_id
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    {playingPreviewVoiceId === selectedVoice.voice_id ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex gap-2 relative z-10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No voice selected. Click "Change Voice" above or select one in the Voice Library.</span>
              </div>
            )}
          </div>

          {/* ElevenLabs TTS Settings slider */}
          <div className="glass-panel rounded-2xl p-5 space-y-5">
            <h3 className="font-display font-semibold text-white border-b border-slate-800/80 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent-purple" />
              TTS Fine Tuning
            </h3>
            
            <div className="space-y-4">
              {/* Model Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-accent-blue" />
                  Model ID
                </label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:outline-none focus:border-accent-purple rounded-xl text-xs text-slate-300"
                >
                  <option value="eleven_flash_v2_5">Flash v2.5 (Fastest, Cost-efficient)</option>
                  <option value="eleven_multilingual_v2">Multilingual v2 (Highly expressive)</option>
                  <option value="eleven_monolingual_v1">Monolingual v1 (Classic English, Stable)</option>
                  <option value="eleven_turbo_v2">Turbo v2 (Low Latency English)</option>
                </select>
                <p className="text-[9px] text-slate-500 leading-normal">
                  Note: Style exaggeration is best supported on Multilingual v2 / Turbo v2 models.
                </p>
              </div>

              {/* Stability Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Stability</span>
                  <span className="text-white font-semibold">{stability}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={stability}
                  onChange={(e) => setStability(parseFloat(e.target.value))}
                  className="w-full accent-accent-purple"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>More Expressive</span>
                  <span>More Stable</span>
                </div>
              </div>

              {/* Similarity Boost Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Clarity / Similarity Boost</span>
                  <span className="text-white font-semibold">{similarityBoost}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={similarityBoost}
                  onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                  className="w-full accent-accent-purple"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Standard Clarity</span>
                  <span>High Similarity</span>
                </div>
              </div>

              {/* Style Exaggeration Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Style Exaggeration</span>
                  <span className="text-white font-semibold">{style}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={style}
                  onChange={(e) => setStyle(parseFloat(e.target.value))}
                  className="w-full accent-accent-purple"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Default (0.0)</span>
                  <span>Exaggerated (1.0)</span>
                </div>
              </div>

              {/* Speech Speed Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Speech Speed</span>
                  <span className="text-white font-semibold">{speed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-accent-purple"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Slow (0.5x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>

              {/* Speaker Boost Toggle */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400 font-medium">Speaker Boost</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSpeakerBoost}
                    onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-purple"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Script Compilation Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {activeScript && activeScript.segments && activeScript.segments.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-slate-200 flex items-center gap-2">
                Storyboard Segments ({activeScript.segments.length})
              </h3>
              
              <div className="space-y-3">
                {activeScript.segments.map((seg, idx) => {
                  const audioMeta = generatedAudios[seg.id];
                  const isGenerating = generatingSegmentId === seg.id;
                  
                  return (
                    <div 
                      key={seg.id} 
                      className={`glass-panel rounded-2xl p-4 transition-all ${
                        audioMeta 
                          ? 'border-emerald-500/20 bg-emerald-500/2' 
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-semibold text-slate-200">{seg.section}</span>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 max-w-md">{seg.text}</p>
                          </div>
                        </div>

                        {/* Generation & playback controls */}
                        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                          {audioMeta ? (
                            <>
                              <button
                                onClick={() => handlePlayAudio(audioMeta.url)}
                                className={`p-2 rounded-xl transition-colors border flex items-center gap-1.5 text-xs font-medium ${
                                  isAudioPlaying(audioMeta.url)
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                {isAudioPlaying(audioMeta.url) ? (
                                  <>
                                    <Pause className="w-4 h-4" />
                                    <span>Pause</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4" />
                                    <span>Listen</span>
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleGenerateVoiceover(seg)}
                                disabled={isGenerating || batchGenerating || !selectedVoice}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 text-xs transition-all disabled:opacity-40"
                                title="Regenerate voiceover"
                              >
                                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGenerateVoiceover(seg)}
                              disabled={isGenerating || batchGenerating || !selectedVoice}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium border border-slate-700/60 hover:border-slate-600 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isGenerating ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Generate TTS</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 text-slate-500">
              <AlertCircle className="w-10 h-10 text-slate-700" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-400">No script storyboard loaded</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Go to the Script Planner tab to generate or draft your script first.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Local playback history playlist */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-accent-blue" />
            Audio Cache Library (Local History)
          </h3>
          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Reload library cache"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoadingHistory ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-900/50 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-3 rounded-xl bg-slate-900/35 border border-slate-850 hover:border-slate-800 hover:bg-slate-900/60 transition-all"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-slate-200 font-medium line-clamp-1 italic">"{item.text}"</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="bg-accent-purple/10 text-accent-purple px-1.5 py-0.5 rounded font-medium">
                      Voice: {item.voice_name}
                    </span>
                    <span>•</span>
                    <span>{item.char_count} characters</span>
                    <span>•</span>
                    <span>{new Date(item.timestamp * 1000).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Playlist Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlayAudio(item.url)}
                    className={`p-2 rounded-lg border transition-colors ${
                      isAudioPlaying(item.url)
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isAudioPlaying(item.url) ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>

                  {/* Download Link */}
                  <a
                    href={item.url}
                    download={item.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition-colors"
                    title="Download track"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteHistoryItem(item.filename)}
                    className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                    title="Delete from cache"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-6 text-center">
            No generated voiceovers found in the local cache yet. Use the storyboard segments above to generate audio.
          </p>
        )}
      </div>
    </div>
  );
}
