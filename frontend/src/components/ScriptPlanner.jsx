import React, { useState, useEffect } from 'react';
import { Sparkles, Edit, Trash2, Plus, ArrowRight, FileText, Clock, Type, Settings, Video, FileSearch } from 'lucide-react';

export default function ScriptPlanner({
  topic,
  setTopic,
  videoType,
  setVideoType,
  duration,
  setDuration,
  tone,
  setTone,
  audience,
  setAudience,
  instructions,
  setInstructions,
  researchContext,
  setResearchContext,
  outline,
  setOutline,
  segments,
  setSegments,
  onProceedToVoiceover
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Adjust default duration when videoType changes
  const handleVideoTypeChange = (type) => {
    setVideoType(type);
    if (type === 'short') {
      setDuration(30);
    } else {
      setDuration(180); // 3 minutes default for long video
    }
  };

  const handleGenerateScript = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          video_type: videoType,
          duration: Number(duration),
          tone,
          audience,
          instructions,
          research_context: researchContext
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to generate script.');
      }

      const data = await response.json();
      setOutline(data.outline || '');
      setSegments(data.segments || []);
      
    } catch (err) {
      setError(err.message || 'Error communicating with AI model.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for metrics
  const getMetrics = () => {
    let charCount = 0;
    let wordCount = 0;
    segments.forEach(seg => {
      const txt = seg.text || '';
      charCount += txt.length;
      wordCount += txt.trim().split(/\s+/).filter(Boolean).length;
    });
    // Est duration: ~140 words per minute -> 2.33 words per second
    const estDuration = Math.round(wordCount / 2.33);
    return { charCount, wordCount, estDuration };
  };

  const { charCount, wordCount, estDuration } = getMetrics();

  // Helper to format seconds nicely
  const formatSeconds = (sec) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  };

  const handleUpdateSegmentText = (id, newText) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, text: newText } : seg));
  };

  const handleUpdateSegmentVisual = (id, newCue) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, visual_cue: newCue } : seg));
  };

  const handleUpdateSegmentSection = (id, newSection) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, section: newSection } : seg));
  };

  const handleDeleteSegment = (id) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  };

  const handleAddSegment = () => {
    const nextId = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 1;
    setSegments(prev => [
      ...prev,
      {
        id: nextId,
        section: 'Body',
        text: 'Enter your narration text here...',
        duration: 10,
        visual_cue: 'Describe visual cue...'
      }
    ]);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-accent-purple" />
          Interactive Script & Storyboard Planner
        </h2>
        <p className="text-sm text-slate-400">
          Configure video attributes and prompt Gemini to compile a line-by-line narration script with structured storyboard visuals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurations Panel */}
        <div className="glass-panel rounded-2xl p-6 self-start space-y-5">
          <h3 className="font-display font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent-purple" />
            Script Settings
          </h3>

          <div className="space-y-4 text-sm">
            {/* Format Selection (Short vs Long) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Video Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleVideoTypeChange('short')}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    videoType === 'short'
                      ? 'bg-accent-purple/10 border-accent-purple text-white shadow-md shadow-accent-purple/10'
                      : 'bg-slate-900/40 border-slate-850 text-slate-450 hover:text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Shorts / Reels</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVideoTypeChange('long')}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    videoType === 'long'
                      ? 'bg-accent-purple/10 border-accent-purple text-white shadow-md shadow-accent-purple/10'
                      : 'bg-slate-900/40 border-slate-850 text-slate-450 hover:text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Long Video</span>
                </button>
              </div>
            </div>

            {/* Topic Input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Video Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Gemini 2.5 Flash updates"
                className="w-full px-3.5 py-2.5 bg-[#0a0c10]/80 border border-slate-800 focus:border-accent-purple/55 rounded-xl focus:outline-none transition-colors"
              />
            </div>

            {/* Target Duration Slider (Dynamic based on videoType) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Target Duration</span>
                <span className="text-accent-purple font-bold">{formatSeconds(duration)}</span>
              </div>
              <input
                type="range"
                min={videoType === 'short' ? 15 : 120}
                max={videoType === 'short' ? 60 : 600}
                step={videoType === 'short' ? 5 : 30}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-accent-purple"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                {videoType === 'short' ? (
                  <>
                    <span>15s</span>
                    <span>30s</span>
                    <span>60s</span>
                  </>
                ) : (
                  <>
                    <span>2m (120s)</span>
                    <span>5m (300s)</span>
                    <span>10m (600s)</span>
                  </>
                )}
              </div>
            </div>

            {/* Grounded Research Context (Editable) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Research Context</label>
                {researchContext && (
                  <button 
                    type="button" 
                    onClick={() => setResearchContext('')}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Clear Context
                  </button>
                )}
              </div>
              <textarea
                value={researchContext}
                onChange={(e) => setResearchContext(e.target.value)}
                placeholder="Paste research details, release notes, or facts here. (Automatically populated if you use the Grounded Research Console first)."
                rows="4"
                className="w-full px-3.5 py-2 bg-[#0a0c10]/80 border border-slate-800 focus:border-accent-purple/55 rounded-xl focus:outline-none transition-colors text-xs resize-none"
              />
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <FileSearch className="w-3 h-3 text-accent-blue" />
                <span>Gemini will write script facts based on this box.</span>
              </div>
            </div>

            {/* Tone Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Voice Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c10]/80 border border-slate-800 focus:border-accent-purple/55 rounded-xl focus:outline-none transition-colors text-xs"
              >
                <option value="Professional">Professional & Technical</option>
                <option value="Energetic">Energetic & Hype</option>
                <option value="Explainer">Clear Explainer / Tutorial</option>
                <option value="Dramatic">Dramatic & Narrative</option>
                <option value="Casual">Casual & Conversational</option>
              </select>
            </div>

            {/* Target Audience */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. General public, developers"
                className="w-full px-3.5 py-2.5 bg-[#0a0c10]/80 border border-slate-800 focus:border-accent-purple/55 rounded-xl focus:outline-none transition-colors"
              />
            </div>

            {/* Custom Directives */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Instructions (Optional)</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Include a joke at the beginning, use simple terms, explain model weights"
                rows="2.5"
                className="w-full px-3.5 py-2 bg-[#0a0c10]/80 border border-slate-800 focus:border-accent-purple/55 rounded-xl focus:outline-none transition-colors text-xs resize-none"
              />
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={loading || !topic.trim()}
              className="w-full py-3 bg-gradient-to-r from-accent-purple to-accent-blue hover:shadow-lg hover:shadow-accent-purple/20 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Drafting Script...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Script</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Storyboard Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <span className="font-semibold">Generation failed: </span>
              {error}
            </div>
          )}

          {/* Script Overview Header */}
          {segments.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-semibold uppercase px-2 py-1 rounded">
                  Storyboard Outline ({videoType === 'short' ? 'Short Format' : 'Long Format'})
                </span>
                <p className="text-xs text-slate-300 mt-2 font-medium italic">
                  "{outline || 'Interactive script compilation.'}"
                </p>
              </div>

              {/* Metrics blocks */}
              <div className="flex gap-4 items-center border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 shrink-0">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Total Chars</span>
                  <span className="text-base font-bold text-white font-display">{charCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Words</span>
                  <span className="text-base font-bold text-slate-300 font-display">{wordCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Est Duration</span>
                  <span className="text-base font-bold text-accent-purple font-display flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {estDuration}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Script segments list */}
          {segments.length > 0 ? (
            <div className="space-y-4">
              {segments.map((seg, idx) => (
                <div 
                  key={seg.id} 
                  className="glass-panel rounded-2xl p-5 border-l-4 border-l-accent-purple hover:border-l-accent-blue transition-all duration-300"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent-purple/20 border border-accent-purple/35 text-accent-purple text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={seg.section}
                        onChange={(e) => handleUpdateSegmentSection(seg.id, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-accent-purple focus:outline-none font-display font-semibold text-sm text-slate-200 py-0.5 px-1 max-w-[150px] transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteSegment(seg.id)}
                      className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors border border-slate-700/40 hover:border-rose-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Visual Cue Column */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Visual Cue / Actions</label>
                      <textarea
                        value={seg.visual_cue || ''}
                        onChange={(e) => handleUpdateSegmentVisual(seg.id, e.target.value)}
                        rows="2"
                        className="w-full p-3 bg-slate-900/50 hover:bg-slate-900 focus:bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl text-xs text-slate-400 focus:outline-none focus:text-slate-300 resize-none transition-colors"
                      />
                    </div>

                    {/* Narration Text Column */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Narration Script (TTS Output)</label>
                        <span className="text-[10px] text-slate-500">{seg.text?.length || 0} chars</span>
                      </div>
                      <textarea
                        value={seg.text || ''}
                        onChange={(e) => handleUpdateSegmentText(seg.id, e.target.value)}
                        rows="3"
                        className="w-full p-3 bg-slate-900/30 hover:bg-slate-900/60 focus:bg-slate-950 border border-slate-800 focus:border-accent-purple/40 rounded-xl text-xs text-white focus:outline-none resize-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Action bar for segments */}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handleAddSegment}
                  className="px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-accent-purple text-xs text-slate-400 hover:text-white transition-all flex items-center gap-1.5 bg-slate-900/25"
                >
                  <Plus className="w-4 h-4" />
                  Add Storyboard Segment
                </button>

                <button
                  onClick={() => onProceedToVoiceover({ topic, outline, segments })}
                  className="px-6 py-2.5 bg-accent-purple text-white font-medium rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition-all text-xs flex items-center gap-2"
                >
                  <span>Go to Voiceover Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 text-slate-500">
              <FileText className="w-12 h-12 text-slate-700 animate-pulse" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-400">No active script plan</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Use the configurations panel to the left to details your topic, then generate or import segments to begin editing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
