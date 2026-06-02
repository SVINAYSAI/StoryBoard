import React, { useState, useEffect } from 'react';
import {
  Sparkles, Image, Film, Play, Square, Pause, Download, RefreshCw,
  AlertCircle, Check, X, Edit, FileText, Maximize2, ChevronRight,
  Sliders, Cpu, Upload, User, Trash2, Plus
} from 'lucide-react';
import { IMAGE_MODELS, VIDEO_MODELS } from '../../constants';
import { parseSRT, formatSegmentsToSRT } from '../../utils/srt';

export default function StoryboardVisualizer({
  activeScript,
  visualScenes = [],
  onUpdateVisualScenes,
  onUpdateSegments,
  onUpdateScriptTopic,
  onTabChange
}) {
  const [selectedImageModel, setSelectedImageModel] = useState('gemini-3.1-flash-image-preview');
  const [selectedVideoModel, setSelectedVideoModel] = useState('veo-3.1-generate-preview');
  const [selectedRatio, setSelectedRatio] = useState('16:9'); // "16:9" or "9:16"

  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [error, setError] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(6); // default to 6 seconds
  const [regeneratingSceneIds, setRegeneratingSceneIds] = useState({});

  // Track prompt edits per scene
  const [editingPromptSceneId, setEditingPromptSceneId] = useState(null);
  const [editingPromptType, setEditingPromptType] = useState('image'); // "image" or "video"
  const [editText, setEditText] = useState('');

  // Mode Selection State
  const [creationMode, setCreationMode] = useState('manual'); // 'manual' or 'auto'

  // Manual Scene Form States
  const [manualSceneText, setManualSceneText] = useState('');
  const [manualMood, setManualMood] = useState('');
  const [isGeneratingManualScene, setIsGeneratingManualScene] = useState(false);
  const [rawSRTText, setRawSRTText] = useState('');

  // Sync rawSRTText state with segments when segments change
  useEffect(() => {
    if (activeScript?.segments) {
      setRawSRTText(formatSegmentsToSRT(activeScript.segments));
    } else {
      setRawSRTText('');
    }
  }, [activeScript?.segments]);

  const [generationStatuses, setGenerationStatuses] = useState({});
  const [promptTabs, setPromptTabs] = useState({});

  const handleSetPromptTab = (sceneId, tab) => {
    setPromptTabs(prev => ({ ...prev, [sceneId]: tab }));
  };

  const handleStartEditPrompt = (sceneId, type, text) => {
    setEditingPromptSceneId(sceneId);
    setEditingPromptType(type);
    setEditText(text || '');
  };

  const handleCancelEditPrompt = () => {
    setEditingPromptSceneId(null);
    setEditText('');
  };

  const handleSaveEditPrompt = (sceneId) => {
    const updated = visualScenes.map(scene => {
      if (scene.scene_id === sceneId) {
        return {
          ...scene,
          [editingPromptType === 'image' ? 'master_prompt_image' : 'master_prompt_video']: editText
        };
      }
      return scene;
    });
    onUpdateVisualScenes(updated);
    setEditingPromptSceneId(null);
    setEditText('');
  };

  const handleBreakdownScript = async () => {
    if (!activeScript?.segments?.length) {
      setError('No script segments available to break down.');
      return;
    }
    setIsBreakingDown(true);
    setError('');
    try {
      const response = await fetch('/api/visualize/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: activeScript.segments,
          topic: activeScript.topic || '',
          outline: activeScript.outline || ''
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to analyze script.');
      }
      const data = await response.json();
      onUpdateVisualScenes(data);
    } catch (err) {
      setError(err.message || 'Error occurred while breaking down script.');
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleSRTUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsBreakingDown(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsedSegments = parseSRT(text);
        if (parsedSegments.length === 0) throw new Error('No valid segments found.');
        if (onUpdateScriptTopic) onUpdateScriptTopic(file.name.replace(/\.[^/.]+$/, ""));
        if (onUpdateSegments) onUpdateSegments(parsedSegments);
        onUpdateVisualScenes([]);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsBreakingDown(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateManualScenePrompts = async () => {
    if (!manualSceneText.trim()) return;
    setIsGeneratingManualScene(true);
    setError('');
    try {
      const response = await fetch('/api/visualize/scene/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_text: manualSceneText, mood: manualMood })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to generate prompts.');
      }
      const data = await response.json();
      const newScene = {
        ...data,
        scene_id: `manual-${Date.now()}`,
        title: data.title || manualSceneText.substring(0, 30),
        master_prompt_image: data.master_prompt_image,
        master_prompt_video: data.master_prompt_video,
        visual_strategy: data.visual_strategy,
        mood: data.mood || manualMood || 'AI Dynamic',
        image_url: null,
        video_url: null
      };
      onUpdateVisualScenes([...visualScenes, newScene]);
      setManualSceneText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGeneratingManualScene(false);
    }
  };

  const handleSyncSRTText = () => {
    setError('');
    try {
      if (!rawSRTText.trim()) {
        throw new Error('Script text area is empty.');
      }
      let parsed;
      if (rawSRTText.includes('-->')) {
        parsed = parseSRT(rawSRTText);
      } else {
        parsed = rawSRTText.split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map((text, idx) => ({
            id: idx + 1,
            section: `Segment ${idx + 1}`,
            text: text,
            duration: 5.0,
            visual_cue: `Custom scene text: ${text.substring(0, 30)}...`,
            emotion_tag: 'none'
          }));
      }
      if (parsed.length === 0) {
        throw new Error('No valid script segments parsed from text.');
      }
      if (onUpdateSegments) onUpdateSegments(parsed);
    } catch (err) {
      setError(err.message || 'Invalid SRT format.');
    }
  };

  const handleGenerateImage = async (scene) => {
    const sid = scene.scene_id;
    setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'image', status: 'generating' } }));
    try {
      const res = await fetch('/api/visualize/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scene.master_prompt_image, model: selectedImageModel })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Image generation failed.');
      }
      const data = await res.json();
      onUpdateVisualScenes(visualScenes.map(s => s.scene_id === sid ? { ...s, image_url: data.url } : s));
      setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'image', status: 'done' } }));
    } catch (err) {
      setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'image', status: 'error', error: err.message } }));
    }
  };

  const handleGenerateVideo = async (scene) => {
    const sid = scene.scene_id;
    setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'video', status: 'submitting', progressSeconds: 0 } }));
    try {
      const sub = await fetch('/api/visualize/video/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.master_prompt_video,
          model: selectedVideoModel,
          aspect_ratio: selectedRatio,
          duration_seconds: selectedDuration
        })
      });
      if (!sub.ok) {
        const errData = await sub.json();
        throw new Error(errData.detail || 'Failed to submit video job.');
      }
      const subData = await sub.json();
      if (!subData.name) {
        throw new Error('No operation name returned from video API.');
      }

      setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'video', status: 'generating', progressSeconds: 0 } }));

      let done = false;
      let videoUrl = '';
      let secondsPassed = 0;

      while (!done) {
        await new Promise(r => setTimeout(r, 5000));
        secondsPassed += 5;
        setGenerationStatuses(prev => ({
          ...prev,
          [sid]: { type: 'video', status: 'generating', progressSeconds: secondsPassed }
        }));

        const poll = await fetch('/api/visualize/video/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation_name: subData.name })
        });
        if (!poll.ok) {
          const errData = await poll.json();
          throw new Error(`Polling failed: ${errData.detail || 'unknown error'}`);
        }
        const pollData = await poll.json();
        done = pollData.done || false;
        if (done) {
          if (pollData.error) {
            throw new Error(pollData.error.message || 'Video job failed on server.');
          }
          const samples = pollData.response?.generateVideoResponse?.generatedSamples || [];
          if (samples.length > 0) {
            videoUrl = samples[0].video?.uri || '';
          }
        }
      }

      if (!videoUrl) {
        throw new Error('Video generation completed but returned no video URI.');
      }

      setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'video', status: 'downloading', progressSeconds: secondsPassed } }));

      const dl = await fetch('/api/visualize/video/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_uri: videoUrl })
      });
      if (!dl.ok) {
        const errData = await dl.json();
        throw new Error(`Failed to download generated video: ${errData.detail || 'unknown error'}`);
      }
      const dlData = await dl.json();
      onUpdateVisualScenes(visualScenes.map(s => s.scene_id === sid ? { ...s, video_url: dlData.url } : s));
      setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'video', status: 'done' } }));
    } catch (err) {
      setGenerationStatuses(prev => ({ ...prev, [sid]: { type: 'video', status: 'error', error: err.message } }));
    }
  };

  const handleClearAsset = (sid, type) => {
    onUpdateVisualScenes(visualScenes.map(s => s.scene_id === sid ? (type === 'image' ? { ...s, image_url: null } : { ...s, video_url: null }) : s));
    setGenerationStatuses(prev => {
      const copy = { ...prev };
      delete copy[sid];
      return copy;
    });
  };

  const handleDeleteScene = (sid) => {
    onUpdateVisualScenes(visualScenes.filter(s => s.scene_id !== sid));
  };

  const handleRegenerateSinglePrompt = async (scene) => {
    const sceneId = scene.scene_id;
    setRegeneratingSceneIds(prev => ({ ...prev, [sceneId]: true }));
    setError('');
    try {
      const fullScriptContext = [
        activeScript?.topic ? `Topic: ${activeScript.topic}` : '',
        activeScript?.outline ? `Outline: ${activeScript.outline}` : '',
      ].filter(Boolean).join('\n');

      const response = await fetch('/api/visualize/scene/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene: scene,
          full_script_context: fullScriptContext
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to regenerate visual prompts.');
      }

      const data = await response.json();

      const updated = visualScenes.map(s => {
        if (s.scene_id === sceneId) {
          return {
            ...s,
            master_prompt_image: data.master_prompt_image || s.master_prompt_image,
            master_prompt_video: data.master_prompt_video || s.master_prompt_video,
            visual_strategy: data.visual_strategy || s.visual_strategy,
            audience_engagement_tip: data.audience_engagement_tip || s.audience_engagement_tip,
          };
        }
        return s;
      });
      onUpdateVisualScenes(updated);
    } catch (err) {
      setError(err.message || 'Error occurred while regenerating prompts.');
    } finally {
      setRegeneratingSceneIds(prev => {
        const copy = { ...prev };
        delete copy[sceneId];
        return copy;
      });
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold font-sans text-ink flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-gradient-video-start to-gradient-video-end text-white shadow-lg">
              <Sparkles className="w-7 h-7" />
            </div>
            Visual Storyboard
          </h2>
          <p className="text-sm text-body max-w-lg">
            Bring your script to life with cinematic imagery and video. Powered by Google Imagen 4 and Veo 3.1.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className={`cursor-pointer px-5 py-2.5 bg-canvas hover:bg-canvas-soft text-ink border border-hairline rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isBreakingDown ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-4 h-4 text-mute" />
            <span>Upload SRT</span>
            <input type="file" accept=".srt" onChange={handleSRTUpload} className="hidden" disabled={isBreakingDown} />
          </label>

          {activeScript?.segments?.length > 0 && visualScenes.length > 0 && (
            <button
              onClick={handleBreakdownScript}
              disabled={isBreakingDown}
              className="px-5 py-2.5 bg-ink text-on-primary rounded-full text-xs font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 ${isBreakingDown ? 'animate-spin' : ''}`} />
              <span>Refresh Prompts</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-soft border border-error/10 text-error-deep text-sm font-medium animate-shake flex gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="space-y-8">
        {activeScript && activeScript.segments && activeScript.segments.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Context Panel */}
              <div className="lg:col-span-4 space-y-4">
                <details className="group studio-card overflow-hidden" open>
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none bg-canvas-soft select-none">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-mute" />
                      <span className="text-label text-ink">Active Script</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-mute transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="p-4 space-y-4">
                    <textarea
                      value={rawSRTText}
                      onChange={(e) => setRawSRTText(e.target.value)}
                      rows={8}
                      className="w-full studio-input text-[11px] leading-relaxed font-mono resize-none bg-canvas"
                    />
                    <button onClick={handleSyncSRTText} className="w-full py-2 bg-canvas-soft hover:bg-canvas-soft-2 text-ink text-[10px] font-bold uppercase tracking-widest rounded-lg border border-hairline transition-all">
                      Sync Changes
                    </button>
                  </div>
                </details>
              </div>

              {/* Toolbar */}
              <div className="lg:col-span-8 space-y-6">
                <div className="studio-card p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-label">Strategy Mode</label>
                    <div className="flex p-1 bg-canvas-soft rounded-xl border border-hairline">
                      <button onClick={() => setCreationMode('manual')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${creationMode === 'manual' ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-body'}`}>Manual</button>
                      <button onClick={() => setCreationMode('auto')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${creationMode === 'auto' ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-body'}`}>AI Assist</button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-label">Aspect Ratio</label>
                    <div className="flex p-1 bg-canvas-soft rounded-xl border border-hairline">
                      <button onClick={() => setSelectedRatio('16:9')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedRatio === '16:9' ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-body'}`}>16:9</button>
                      <button onClick={() => setSelectedRatio('9:16')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedRatio === '9:16' ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-body'}`}>9:16</button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-label">Still Model</label>
                    <select value={selectedImageModel} onChange={(e) => setSelectedImageModel(e.target.value)} className="w-full studio-input text-[11px] font-bold">
                      {IMAGE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-label">Motion Model</label>
                    <select value={selectedVideoModel} onChange={(e) => setSelectedVideoModel(e.target.value)} className="w-full studio-input text-[11px] font-bold">
                      {VIDEO_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {creationMode === 'manual' && (
                  <div className="studio-card p-6 space-y-4 animate-fade-in border-l-4 border-l-warning">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-label">Scene Concept</label>
                        <textarea value={manualSceneText} onChange={(e) => setManualSceneText(e.target.value)} rows={2} className="w-full studio-input text-sm resize-none" placeholder="Describe visual..." />
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-2">
                           <label className="text-label">Mood</label>
                           <select value={manualMood} onChange={(e) => setManualMood(e.target.value)} className="w-full studio-input text-xs">
                             <option value="">AI Dynamic</option>
                             <option value="Inspiring">Inspiring</option>
                             <option value="Dramatic">Dramatic</option>
                             <option value="Tense">Tense</option>
                           </select>
                         </div>
                         <button onClick={handleGenerateManualScenePrompts} disabled={isGeneratingManualScene || !manualSceneText.trim()} className="w-full studio-button-primary py-2.5">
                           {isGeneratingManualScene ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                           <span>Add Scene</span>
                         </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scenes List */}
            {visualScenes.length > 0 ? (
              <div className="grid grid-cols-1 gap-12 pt-8">
                {visualScenes.map((scene, idx) => {
                  const sid = scene.scene_id;
                  const tab = promptTabs[sid] || 'image';
                  const isGeneratingThis = generationStatuses[sid]?.status === 'generating' || generationStatuses[sid]?.status === 'submitting';
                  return (
                    <div key={sid} className="group studio-card p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start hover:shadow-2xl transition-all">
                      <div className="lg:col-span-5 space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="w-10 h-10 rounded-2xl bg-canvas-soft border border-hairline text-ink text-sm font-bold flex items-center justify-center">{idx + 1}</span>
                          <div>
                            <h4 className="font-bold text-ink">{scene.title || `Scene ${idx + 1}`}</h4>
                            <div className="flex gap-2 mt-1">
                              {scene.mood && <span className="text-[8px] font-bold px-2 py-0.5 bg-violet-soft text-violet-deep rounded uppercase">{scene.mood}</span>}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteScene(sid)} className="ml-auto p-2 rounded-lg hover:bg-error-soft text-mute hover:text-error opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4">
                           <div className="flex p-0.5 bg-canvas-soft rounded-full w-fit border border-hairline">
                             <button onClick={() => handleSetPromptTab(sid, 'image')} className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${tab === 'image' ? 'bg-white shadow-sm text-ink' : 'text-mute'}`}>Still</button>
                             <button onClick={() => handleSetPromptTab(sid, 'video')} className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${tab === 'video' ? 'bg-white shadow-sm text-ink' : 'text-mute'}`}>Motion</button>
                           </div>
                           <div className="relative studio-input min-h-[100px] bg-canvas-soft/30 p-4 rounded-xl italic text-xs text-body leading-relaxed">
                             {tab === 'image' ? scene.master_prompt_image : scene.master_prompt_video}
                           </div>
                           <button onClick={() => tab === 'image' ? handleGenerateImage(scene) : handleGenerateVideo(scene)} disabled={isGeneratingThis} className="w-full studio-button-primary py-3">
                             {isGeneratingThis ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                             <span>Generate {tab === 'image' ? 'Still' : 'Motion'}</span>
                           </button>
                        </div>
                      </div>
                      <div className="lg:col-span-7 aspect-video bg-canvas-deep rounded-2xl overflow-hidden relative group/asset">
                        {scene.video_url ? (
                          <video src={scene.video_url} controls className="w-full h-full object-cover" />
                        ) : scene.image_url ? (
                          <img src={scene.image_url} alt="Scene" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-mute">
                            <Maximize2 className="w-10 h-10 opacity-20 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ready for Production</p>
                          </div>
                        )}
                        {(scene.image_url || scene.video_url) && (
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/asset:opacity-100 transition-all">
                             <button onClick={() => handleClearAsset(sid, scene.video_url ? 'video' : 'image')} className="p-2 rounded-full bg-black/50 text-white hover:bg-error transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              creationMode === 'auto' && (
                <div className="studio-card p-20 text-center flex flex-col items-center justify-center gap-8 animate-fade-in">
                  <div className="w-24 h-24 rounded-[2rem] bg-violet-soft flex items-center justify-center shadow-inner">
                    <Cpu className="w-10 h-10 text-violet" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-ink">AI Breakdown Required</h3>
                    <p className="text-sm text-body max-w-sm mx-auto">Gemini will analyze your script segments to draft cinematic master prompts for each scene situation.</p>
                  </div>
                  <button onClick={handleBreakdownScript} disabled={isBreakingDown} className="studio-button-primary px-10 py-4 shadow-xl">
                    {isBreakingDown ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    <span>Begin Intelligent Breakdown</span>
                  </button>
                </div>
              )
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 space-y-8 text-center animate-fade-in">
             <div className="w-32 h-32 rounded-[2.5rem] bg-canvas-soft border border-hairline flex items-center justify-center shadow-inner group hover:scale-105 transition-all">
                <Film className="w-14 h-14 text-mute/50 group-hover:text-primary transition-colors" />
             </div>
             <div className="space-y-3">
               <h3 className="text-2xl font-black text-ink">Production Pipeline Empty</h3>
               <p className="text-sm text-body max-w-sm mx-auto leading-relaxed">Build your narrative in the Script Planner or upload an SRT to begin visual production.</p>
             </div>
             <div className="flex items-center gap-4">
               <label className="cursor-pointer px-8 py-3.5 bg-ink text-white rounded-full text-sm font-bold shadow-xl hover:scale-105 transition-all">
                 <span>Upload SRT</span>
                 <input type="file" accept=".srt" onChange={handleSRTUpload} className="hidden" />
               </label>
               <button onClick={() => onTabChange && onTabChange('planner')} className="px-8 py-3.5 bg-canvas border border-hairline rounded-full text-sm font-bold hover:bg-canvas-soft transition-all">
                 Go to Planner
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
