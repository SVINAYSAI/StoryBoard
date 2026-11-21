import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, Play, Pause, SkipBack, SkipForward, Scissors, 
  Layers, Music, Download, Settings, AlertCircle, 
  CheckCircle2, Clock, MousePointer2, Plus, Trash2,
  MonitorPlay, Layout, BookOpen, Cpu, Upload, Wand2
} from 'lucide-react';
import { Timeline } from '@xzdarcy/react-timeline-editor';
import { TimelineEngine } from '@xzdarcy/timeline-engine';
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css';

const mockEffects = {
  effect_visual: { id: "effect_visual", name: "Visual Media" },
  effect_audio: { id: "effect_audio", name: "Audio Media" },
  effect_text: { id: "effect_text", name: "Text / Subtitles" },
  effect_transition: { id: "effect_transition", name: "Transition" },
};

export default function VideoEditor({ 
  visualScenes = [], 
  activeScript = null,
  history = []
}) {
  const [activeSubTab, setActiveSubTab] = useState('timeline'); // 'timeline' or 'research'

  // Timeline State
  const [editorData, setEditorData] = useState([
    { id: "track_visuals", actions: [] },
    { id: "track_transitions", actions: [] },
    { id: "track_audio", actions: [] },
    { id: "track_subtitles", actions: [] }
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [customAssets, setCustomAssets] = useState([]);

  // Engine Ref
  const engineRef = useRef(new TimelineEngine());
  
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const onTimeUpdate = ({ time }) => setCurrentTime(time);
    const onPlay = () => setIsPlaying(true);
    const onPaused = () => setIsPlaying(false);

    engine.on(['setTimeByTick', 'afterSetTime'], onTimeUpdate);
    engine.on('play', onPlay);
    engine.on('paused', onPaused);

    return () => {
      engine.off(['setTimeByTick', 'afterSetTime'], onTimeUpdate);
      engine.off('play', onPlay);
      engine.off('paused', onPaused);
    };
  }, []);

  // Initialize Timeline Data based on visualScenes and history
  useEffect(() => {
    if (editorData[0].actions.length > 0) return;

    const visualActions = visualScenes.map((scene, index) => ({
      id: `visual_${scene.scene_id || index}`,
      start: index * 5, 
      end: (index * 5) + 5,
      effectId: "effect_visual",
      data: { url: scene.video_url || scene.image_url, type: scene.video_url ? 'video' : 'image', title: scene.title || `Scene ${index + 1}` }
    })).filter(a => a.data.url);

    const audioActions = history.map((item, index) => ({
      id: `audio_${index}`,
      start: index * 5,
      end: (index * 5) + 5,
      effectId: "effect_audio",
      data: { url: item.audio_url, title: item.filename, type: 'audio' }
    }));

    if (visualActions.length > 0 || audioActions.length > 0) {
      setEditorData([
        { id: "track_visuals", actions: visualActions },
        { id: "track_transitions", actions: [] },
        { id: "track_audio", actions: audioActions },
        { id: "track_subtitles", actions: [] }
      ]);
    }
  }, [visualScenes, history]);

  const handleDataChange = (data) => {
    setEditorData(data);
  };

  const handlePlay = () => {
    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.play({ autoEnd: true });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    
    setCustomAssets(prev => [...prev, {
      id: `custom_${Date.now()}`,
      url,
      type,
      title: file.name
    }]);
  };

  const addAssetToTimeline = (asset) => {
    setEditorData(prev => {
      const trackIndex = asset.type === 'audio' ? 2 : 0;
      const track = prev[trackIndex];
      const lastAction = track.actions[track.actions.length - 1];
      const startTime = lastAction ? lastAction.end : 0;

      const newAction = {
        id: `action_${Date.now()}`,
        start: startTime,
        end: startTime + 5,
        effectId: asset.type === 'audio' ? 'effect_audio' : 'effect_visual',
        data: { url: asset.url, type: asset.type, title: asset.title }
      };

      const newData = [...prev];
      newData[trackIndex] = {
        ...track,
        actions: [...track.actions, newAction]
      };
      return newData;
    });
  };

  const addTransition = (type) => {
    setEditorData(prev => {
      const newTransition = {
        id: `trans_${Date.now()}`,
        start: currentTime,
        end: currentTime + 1,
        effectId: "effect_transition",
        data: { type, title: `${type} Fade` }
      };
      const newData = [...prev];
      newData[1] = {
        ...prev[1],
        actions: [...prev[1].actions, newTransition]
      };
      return newData;
    });
  };

  const onDragStart = (e, asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
  };

  const onDrop = (e) => {
    e.preventDefault();
    const assetData = e.dataTransfer.getData('application/json');
    if (!assetData) return;

    try {
      const asset = JSON.parse(assetData);
      addAssetToTimeline(asset);
    } catch (err) {
      console.error("Failed to parse dropped asset", err);
    }
  };

  const formatTime = (timeInSeconds) => {
    const min = Math.floor(timeInSeconds / 60);
    const sec = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    return `00:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Find active visual to render
  const activeVisualAction = editorData[0]?.actions?.find(a => currentTime >= a.start && currentTime <= a.end);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold font-sans text-ink flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <Film className="w-7 h-7" />
            </div>
            Video Editor Studio
          </h2>
          <p className="text-sm text-body max-w-lg">
            Assemble your generated visuals and voiceovers into a final cinematic masterpiece.
          </p>
        </div>

        <div className="flex p-1 bg-canvas-soft rounded-xl border border-hairline">
          <button 
            onClick={() => setActiveSubTab('research')}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeSubTab === 'research' ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-body'}`}
          >
            <BookOpen className="w-4 h-4" />
            Strategy
          </button>
          <button 
            onClick={() => setActiveSubTab('timeline')}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeSubTab === 'timeline' ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-body'}`}
          >
            <Layout className="w-4 h-4" />
            Editor
          </button>
        </div>
      </div>

      {activeSubTab === 'research' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 space-y-6">
            <div className="studio-card p-8 space-y-6 border-l-4 border-l-indigo-500">
               <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                 <Cpu className="w-5 h-5 text-indigo-500" />
                 Future Video Rendering Architecture
               </h3>
               <p className="text-sm text-body">
                 The current timeline UI allows you to sequence clips, arrange audio, and prepare a multi-track composition. 
                 To actually render this composition into an MP4 file, we will be utilizing an EDL (Edit Decision List) approach, where the timeline state is sent to a Python backend using FFmpeg and MoviePy.
               </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           {/* Player View + Asset Library */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[400px]">
              {/* Asset Panel */}
              <div className="lg:col-span-3 studio-card flex flex-col overflow-hidden">
                <div className="p-4 border-b border-hairline bg-canvas-soft flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink">Library</span>
                  <label className="cursor-pointer p-1.5 hover:bg-white rounded-lg transition-all text-indigo-600">
                    <Upload className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                  </label>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                   <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-mute">Generated Assets</span>
                      <div className="grid grid-cols-2 gap-2">
                        {visualScenes.map((s, i) => {
                            const asset = { url: s.video_url || s.image_url, type: s.video_url ? 'video' : 'image', title: s.title || `Scene ${i+1}` };
                            return (
                              <div 
                                key={i} 
                                draggable 
                                onDragStart={(e) => onDragStart(e, asset)}
                                onClick={() => addAssetToTimeline(asset)} 
                                className="aspect-square bg-canvas-soft rounded-lg border border-hairline overflow-hidden cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-colors"
                              >
                                {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover pointer-events-none" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-mute p-2 text-center pointer-events-none">{s.title || `Scene ${i+1}`}</div>}
                              </div>
                            );
                        })}
                      </div>
                   </div>

                   {customAssets.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase text-mute">Uploaded Media</span>
                        <div className="grid grid-cols-2 gap-2">
                          {customAssets.map((asset) => (
                              <div 
                                key={asset.id} 
                                draggable
                                onDragStart={(e) => onDragStart(e, asset)}
                                onClick={() => addAssetToTimeline(asset)} 
                                className="aspect-square bg-canvas-soft rounded-lg border border-hairline overflow-hidden cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-colors"
                              >
                                {asset.type === 'image' ? <img src={asset.url} className="w-full h-full object-cover pointer-events-none" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white pointer-events-none"><Film className="w-6 h-6" /></div>}
                              </div>
                          ))}
                        </div>
                      </div>
                   )}

                   <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-mute">Transitions</span>
                      <div className="flex flex-wrap gap-2">
                         {['Cross', 'Fade', 'Wipe'].map(type => (
                            <button key={type} onClick={() => addTransition(type)} className="px-3 py-1.5 bg-canvas-soft border border-hairline rounded-lg text-[10px] font-bold hover:bg-white transition-all flex items-center gap-1.5">
                               <Wand2 className="w-3 h-3 text-purple-500" />
                               {type}
                            </button>
                         ))}
                      </div>
                   </div>
                </div>
              </div>

              {/* Player View */}
              <div className="lg:col-span-9 studio-card bg-black flex flex-col relative group">
                <div className="flex-1 flex items-center justify-center p-4">
                   <div className="w-full h-full max-w-3xl bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center relative">
                      {/* Active Visual Render */}
                      {activeVisualAction?.data?.url ? (
                         activeVisualAction.data.type === 'video' ? (
                           <video 
                             src={activeVisualAction.data.url} 
                             className="w-full h-full object-contain"
                             autoPlay
                             muted
                             loop
                             key={activeVisualAction.data.url}
                           />
                         ) : (
                           <img src={activeVisualAction.data.url} className="w-full h-full object-contain" alt="Active Frame" />
                         )
                      ) : (
                         <Play className={`w-16 h-16 ${isPlaying ? 'text-indigo-500' : 'text-white/20'}`} />
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                         <div className="flex items-center justify-between text-white/60 text-[10px] font-mono">
                            <span>{formatTime(currentTime)}</span>
                            <span>{/* Total time */} 00:00:30.00</span>
                         </div>
                      </div>
                   </div>
                </div>
                {/* Overlay Controls */}
                <div className="absolute top-4 right-4 flex gap-2">
                   <button className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-2 shadow-xl">
                     <Download className="w-4 h-4" /> Export MP4
                   </button>
                </div>
              </div>
           </div>

           {/* Timeline Section */}
           <div 
             className="studio-card p-0 flex flex-col min-h-[350px] overflow-hidden border-indigo-100 shadow-xl"
             onDragOver={(e) => e.preventDefault()}
             onDrop={onDrop}
           >
              <div className="p-3 border-b border-hairline flex items-center justify-between bg-canvas-soft">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <button onClick={() => engineRef.current.setTime(0)} className="p-1.5 hover:bg-white rounded-lg transition-all"><SkipBack className="w-4 h-4 text-mute" /></button>
                       <button onClick={handlePlay} className={`p-2 rounded-lg hover:scale-105 transition-all ${isPlaying ? 'bg-rose-500 text-white shadow-lg' : 'bg-ink text-white'}`}>
                          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                       </button>
                       <button className="p-1.5 hover:bg-white rounded-lg transition-all"><SkipForward className="w-4 h-4 text-mute" /></button>
                    </div>
                    <div className="h-6 w-px bg-hairline" />
                    <div className="flex items-center gap-2">
                       <button className="p-1.5 hover:bg-white rounded-lg transition-all text-mute flex items-center gap-1.5">
                          <Scissors className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">Split</span>
                       </button>
                       <button className="p-1.5 hover:bg-white rounded-lg transition-all text-mute flex items-center gap-1.5">
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">Delete</span>
                       </button>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white rounded-full text-[10px] font-mono shadow-inner">
                       <Clock className="w-3 h-3" />
                       {formatTime(currentTime)}
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 overflow-hidden bg-canvas-deep/30" style={{ minHeight: '300px' }}>
                 <Timeline
                    engine={engineRef.current}
                    editorData={editorData}
                    effects={mockEffects}
                    onChange={handleDataChange}
                    autoScroll={true}
                    style={{ width: '100%', height: '100%' }}
                    renderAction={(action) => {
                       const isVisual = action.effectId === 'effect_visual';
                       const isAudio = action.effectId === 'effect_audio';
                       const isTrans = action.effectId === 'effect_transition';
                       return (
                          <div className={`w-full h-full rounded-md flex items-center px-2 shadow-sm border border-white/10 overflow-hidden ${
                             isVisual ? 'bg-indigo-500 text-white' : 
                             isAudio ? 'bg-emerald-500 text-white' : 
                             isTrans ? 'bg-purple-600 text-white' :
                             'bg-orange-500 text-white'
                          }`}>
                             {isVisual && <Film className="w-3 h-3 mr-2 shrink-0" />}
                             {isAudio && <Music className="w-3 h-3 mr-2 shrink-0" />}
                             {isTrans && <Wand2 className="w-3 h-3 mr-2 shrink-0" />}
                             <span className="text-[9px] font-bold truncate uppercase tracking-tighter">
                                {action.data?.title || action.id}
                             </span>
                          </div>
                       );
                    }}
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
