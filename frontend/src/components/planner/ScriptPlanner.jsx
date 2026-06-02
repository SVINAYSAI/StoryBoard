import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Edit, Trash2, Plus, ArrowRight, FileText, Clock, Type, 
  Settings, Video, FileSearch, GripVertical, ChevronRight,
  Zap, Wind, Smile, CloudRain, Flame, Activity, Frown, Sun, 
  VolumeX, Volume2, Ghost, Meh, Minus
} from 'lucide-react';
import { EMOTION_TAGS } from '../../constants';

const EMOTION_ICONS = {
  Zap, Wind, Smile, CloudRain, Flame, Activity, Frown, Sun, 
  VolumeX, Volume2, Ghost, Meh, Minus
};

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
  const [draggedSegId, setDraggedSegId] = useState(null);
  const [dragOverSegId, setDragOverSegId] = useState(null);

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
        visual_cue: 'Describe visual cue...',
        emotion_tag: 'none'
      }
    ]);
  };

  const handleUpdateSegmentEmotion = (id, newTag) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, emotion_tag: newTag } : seg));
  };

  // Drag-and-drop handlers
  const handleDragStart = (e, segId) => {
    setDraggedSegId(segId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', segId);
  };

  const handleDragOver = (e, segId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (segId !== dragOverSegId) setDragOverSegId(segId);
  };

  const handleDrop = (e, targetSegId) => {
    e.preventDefault();
    if (draggedSegId === null || draggedSegId === targetSegId) {
      setDraggedSegId(null);
      setDragOverSegId(null);
      return;
    }
    const dragIndex = segments.findIndex(s => s.id === draggedSegId);
    const dropIndex = segments.findIndex(s => s.id === targetSegId);
    if (dragIndex < 0 || dropIndex < 0) return;
    const newSegments = [...segments];
    const [removed] = newSegments.splice(dragIndex, 1);
    newSegments.splice(dropIndex, 0, removed);
    setSegments(newSegments);
    setDraggedSegId(null);
    setDragOverSegId(null);
  };

  const handleDragEnd = () => {
    setDraggedSegId(null);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold font-sans text-ink flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-soft text-violet-deep">
              <FileText className="w-7 h-7" />
            </div>
            Script & Storyboard
          </h2>
          <p className="text-sm text-body max-w-lg">
            Draft your narrative and visuals. Configure video attributes and let Gemini compile a structured storyboard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {segments.length > 0 && (
            <div className="flex items-center gap-6 px-6 py-3 bg-canvas-soft rounded-2xl border border-hairline shrink-0">
              <div className="text-center">
                <span className="text-label block mb-0.5">Total Chars</span>
                <span className="text-lg font-bold text-ink">{charCount}</span>
              </div>
              <div className="h-8 w-px bg-hairline"></div>
              <div className="text-center">
                <span className="text-label block mb-0.5">Words</span>
                <span className="text-lg font-bold text-ink">{wordCount}</span>
              </div>
              <div className="h-8 w-px bg-hairline"></div>
              <div className="text-center">
                <span className="text-label block mb-0.5">Est. Time</span>
                <span className="text-lg font-bold text-violet flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {estDuration}s
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Configurations Side Panel (xl:col-span-1) */}
        <aside className="xl:col-span-1 space-y-6">
          <div className="studio-card p-6 space-y-6 sticky top-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4 text-mute" />
                Settings
              </h3>
            </div>

            <div className="space-y-5">
              {/* Video Format */}
              <div className="space-y-2.5">
                <label className="text-label">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleVideoTypeChange('short')}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      videoType === 'short'
                        ? 'bg-ink text-on-primary border-ink shadow-lg scale-[1.02]'
                        : 'bg-canvas border-hairline text-body hover:border-hairline-strong'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Shorts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVideoTypeChange('long')}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      videoType === 'long'
                        ? 'bg-ink text-on-primary border-ink shadow-lg scale-[1.02]'
                        : 'bg-canvas border-hairline text-body hover:border-hairline-strong'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Long</span>
                  </button>
                </div>
              </div>

              {/* Topic Input */}
              <div className="space-y-2">
                <label className="text-label">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. AI News Update"
                  className="w-full studio-input"
                />
              </div>

              {/* Duration Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-label">Target Duration</label>
                  <span className="text-xs font-bold text-violet">{formatSeconds(duration)}</span>
                </div>
                <input
                  type="range"
                  min={videoType === 'short' ? 15 : 120}
                  max={videoType === 'short' ? 60 : 600}
                  step={videoType === 'short' ? 5 : 30}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-canvas-soft rounded-lg appearance-none cursor-pointer accent-ink"
                />
              </div>

              {/* Advanced Accordion/Details */}
              <details className="group border-t border-hairline pt-4">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-label group-open:text-ink transition-colors">Advanced Options</span>
                  <ChevronRight className="w-4 h-4 text-mute transition-transform group-open:rotate-90" />
                </summary>
                <div className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-label">Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full studio-input appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem]"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                    >
                      <option value="Professional">Professional</option>
                      <option value="Energetic">Energetic</option>
                      <option value="Explainer">Explainer</option>
                      <option value="Dramatic">Dramatic</option>
                      <option value="Casual">Casual</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-label">Audience</label>
                    <input
                      type="text"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full studio-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label">Research Context</label>
                    <textarea
                      value={researchContext}
                      onChange={(e) => setResearchContext(e.target.value)}
                      rows="4"
                      className="w-full studio-input text-xs resize-none"
                    />
                  </div>
                </div>
              </details>

              <button
                onClick={handleGenerateScript}
                disabled={loading || !topic.trim()}
                className="w-full studio-button-primary mt-4"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Drafting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Storyboard Workspace (xl:col-span-3) */}
        <div className="xl:col-span-3 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-error-soft border border-error/10 text-error-deep text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          {segments.length > 0 ? (
            <div className="space-y-4">
              {segments.map((seg, idx) => (
                <div 
                  key={seg.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, seg.id)}
                  onDragOver={(e) => handleDragOver(e, seg.id)}
                  onDrop={(e) => handleDrop(e, seg.id)}
                  onDragEnd={handleDragEnd}
                  className={`studio-card p-6 flex items-start gap-6 group transition-all duration-300 border-l-4 ${
                    dragOverSegId === seg.id && draggedSegId !== seg.id
                      ? 'border-l-link ring-2 ring-link/20 scale-[1.01] bg-link/5'
                      : draggedSegId === seg.id
                        ? 'border-l-mute opacity-40 grayscale scale-[0.98]'
                        : 'border-l-transparent hover:border-l-violet active:cursor-grabbing'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4 shrink-0 pt-1">
                    <GripVertical className="w-5 h-5 text-mute opacity-0 group-hover:opacity-100 cursor-grab transition-opacity" />
                    <span className="w-8 h-8 rounded-full bg-canvas-soft text-ink text-xs font-bold flex items-center justify-center border border-hairline shadow-inner">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Scene Metadata & Visuals */}
                    <div className="md:col-span-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={seg.section}
                          onChange={(e) => handleUpdateSegmentSection(seg.id, e.target.value)}
                          className="font-bold text-ink bg-transparent border-none focus:outline-none focus:ring-0 p-0 hover:text-violet transition-colors flex-1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-label flex items-center gap-1.5">
                          <Video className="w-3 h-3" /> Visual Direction
                        </label>
                        <textarea
                          value={seg.visual_cue || ''}
                          onChange={(e) => handleUpdateSegmentVisual(seg.id, e.target.value)}
                          rows="3"
                          className="w-full bg-canvas-soft border-none focus:ring-1 focus:ring-ink rounded-lg p-3 text-xs text-body leading-relaxed resize-none transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Narration Content */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-label flex items-center gap-1.5">
                          <Type className="w-3 h-3" /> Narration Text
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="relative group/emotion">
                            <select
                              value={seg.emotion_tag || 'none'}
                              onChange={(e) => handleUpdateSegmentEmotion(seg.id, e.target.value)}
                              className="text-[10px] font-bold uppercase tracking-wider bg-canvas border border-hairline rounded-full pl-8 pr-4 py-1 text-mute hover:text-ink hover:border-hairline-strong transition-all cursor-pointer appearance-none text-center"
                            >
                              {EMOTION_TAGS.map(tag => (
                                <option key={tag.value} value={tag.value}>{tag.label}</option>
                              ))}
                            </select>
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-mute group-hover/emotion:text-violet transition-colors">
                              {(() => {
                                const tag = EMOTION_TAGS.find(t => t.value === (seg.emotion_tag || 'none'));
                                const Icon = EMOTION_ICONS[tag?.icon] || Minus;
                                return <Icon className="w-3.5 h-3.5" />;
                              })()}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-mute">{seg.text?.length || 0}c</span>
                        </div>
                      </div>
                      <textarea
                        value={seg.text || ''}
                        onChange={(e) => handleUpdateSegmentText(seg.id, e.target.value)}
                        rows="4"
                        className="w-full studio-input text-sm leading-relaxed border-none bg-canvas focus:ring-2 focus:ring-violet/20 font-sans shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="p-2 rounded-lg bg-canvas text-mute hover:text-error hover:bg-error-soft transition-all opacity-0 group-hover:opacity-100 border border-hairline hover:border-error/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Workspace Action Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 pb-12">
                <button
                  onClick={handleAddSegment}
                  className="px-6 py-3 rounded-xl border-2 border-dashed border-hairline-strong hover:border-violet hover:text-violet transition-all text-sm font-bold flex items-center gap-2 bg-canvas/50 hover:bg-violet-soft/30 group w-full sm:w-auto justify-center"
                >
                  <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  Add Storyboard Segment
                </button>

                <button
                  onClick={() => onProceedToVoiceover && onProceedToVoiceover({ topic, outline, segments })}
                  className="studio-button-primary px-8 py-4 text-base shadow-xl w-full sm:w-auto group"
                >
                  <span>Proceed to Voiceover Studio</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center animate-fade-in">
              <div className="w-24 h-24 rounded-3xl bg-canvas-soft border border-hairline flex items-center justify-center shadow-inner">
                <FileText className="w-10 h-10 text-mute/50" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-ink">No Script Plan Yet</h3>
                <p className="text-sm text-body max-w-sm">
                  Enter a topic and configure your settings to generate a professional script draft.
                </p>
              </div>
              {!topic && (
                <div className="px-4 py-2 bg-warning-soft text-warning-deep text-xs font-bold rounded-full border border-warning/10">
                  Topic is required to generate
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
