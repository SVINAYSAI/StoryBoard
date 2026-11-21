import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2, Volume2, Mic, MicOff, Upload, Play, Pause, RotateCcw,
  Sparkles, ShieldCheck, Download, Trash2, Sliders, CheckCircle2,
  AlertCircle, ArrowRight, Music, RefreshCw, Layers, FileAudio,
  Radio, HardDrive, Cloud, SplitSquareVertical, ArrowUpRight
} from 'lucide-react';
import useAudioEnhancer from '../../hooks/useAudioEnhancer';

export default function AudioEnhancer({
  activeScript,
  voices = [],
  selectedVoice,
  onAssignToSegment,
  historyAudios = [],
  projectId,
}) {
  const {
    isProcessing,
    processingStatus,
    error,
    setError,
    enhancedResult,
    setEnhancedResult,
    localHistory,
    cloudHistory,
    isLoadingHistory,
    isolateAudio,
    enhanceSpeechToSpeech,
    deleteLocalItem,
    deleteCloudItem,
    refreshAllHistory,
  } = useAudioEnhancer();

  // Input selection mode: 'upload' | 'record' | 'cache'
  const [inputSource, setInputSource] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCachedFilename, setSelectedCachedFilename] = useState('');
  const [filePreviewUrl, setFilePreviewUrl] = useState('');

  // Processing mode: 'isolation' | 'speech_to_speech'
  const [enhancementMode, setEnhancementMode] = useState('isolation');

  // Speech-to-Speech settings
  const [targetVoiceId, setTargetVoiceId] = useState(selectedVoice?.voice_id || (voices[0]?.voice_id || ''));
  const [stsStability, setStsStability] = useState(0.5);
  const [stsSimilarity, setStsSimilarity] = useState(0.75);
  const [stsStyle, setStsStyle] = useState(0.0);
  const [removeBgNoise, setRemoveBgNoise] = useState(true);

  // Audio Isolation settings
  const [fileFormat, setFileFormat] = useState('other');

  // Storyboard segment target assignment
  const [targetSegmentId, setTargetSegmentId] = useState(activeScript?.segments?.[0]?.id || '');
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Audio Comparison Player State
  // 'cleaned' or 'original'
  const [activePlaybackTrack, setActivePlaybackTrack] = useState('cleaned');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioPlayerRef = useRef(null);

  // Sync selected voice if changed upstream
  useEffect(() => {
    if (selectedVoice?.voice_id && !targetVoiceId) {
      setTargetVoiceId(selectedVoice.voice_id);
    }
  }, [selectedVoice, targetVoiceId]);

  // Handle preview URL cleanup
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Audio player time updates
  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setCurrentTime(audioPlayerRef.current.currentTime);
      if (audioPlayerRef.current.duration && !isNaN(audioPlayerRef.current.duration)) {
        setDuration(audioPlayerRef.current.duration);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.warn('Playback error:', e);
      });
    }
  };

  // Switch between Original and Cleaned track without losing playback position
  const switchPlaybackTrack = (track) => {
    if (track === activePlaybackTrack) return;
    const currentPos = audioPlayerRef.current ? audioPlayerRef.current.currentTime : 0;
    const wasPlaying = isPlaying;

    setActivePlaybackTrack(track);

    setTimeout(() => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = currentPos;
        if (wasPlaying) {
          audioPlayerRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    }, 50);
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = seekTime;
    }
  };

  // ── Recording handlers ──────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([audioBlob], `mic_recording_${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(recordedFile);
        const url = URL.createObjectURL(recordedFile);
        setFilePreviewUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied or unavailable: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  // ── File upload handling ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedCachedFilename('');
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      setError('');
    }
  };

  // ── Processing triggers ─────────────────────────────────────────────────
  const handleProcessAudio = async () => {
    setError('');
    setAssignSuccessMsg('');

    if (inputSource === 'cache') {
      if (!selectedCachedFilename) {
        setError('Please select an audio file from the project studio cache.');
        return;
      }
    } else {
      if (!selectedFile) {
        setError('Please upload an audio file or record from your microphone.');
        return;
      }
    }

    try {
      if (enhancementMode === 'isolation') {
        const result = await isolateAudio({
          file: inputSource !== 'cache' ? selectedFile : null,
          cachedFilename: inputSource === 'cache' ? selectedCachedFilename : null,
          fileFormat,
          segmentId: targetSegmentId || null,
          projectId: projectId || null,
        });
        setActivePlaybackTrack('cleaned');
        setIsPlaying(false);
      } else {
        const selectedVoiceObj = voices.find((v) => v.voice_id === targetVoiceId);
        const result = await enhanceSpeechToSpeech({
          file: inputSource !== 'cache' ? selectedFile : null,
          cachedFilename: inputSource === 'cache' ? selectedCachedFilename : null,
          voiceId: targetVoiceId,
          voiceName: selectedVoiceObj?.name || 'Custom Voice',
          stability: stsStability,
          similarityBoost: stsSimilarity,
          style: stsStyle,
          removeBackgroundNoise: removeBgNoise,
          segmentId: targetSegmentId || null,
          projectId: projectId || null,
        });
        setActivePlaybackTrack('cleaned');
        setIsPlaying(false);
      }
    } catch (err) {
      // Error handled inside hook
    }
  };

  // ── Assign to Storyboard Segment ─────────────────────────────────────────
  const handleAssignAudio = () => {
    if (!enhancedResult || !targetSegmentId) return;
    if (onAssignToSegment) {
      onAssignToSegment(targetSegmentId, enhancedResult);
      setAssignSuccessMsg(`Successfully assigned studio-cleaned audio to Segment #${targetSegmentId}!`);
      setTimeout(() => setAssignSuccessMsg(''), 4000);
    }
  };

  // Determine current active audio URL for the player
  const currentTrackUrl = activePlaybackTrack === 'cleaned'
    ? enhancedResult?.url
    : (enhancedResult?.original_url || filePreviewUrl);

  const formatSeconds = (sec) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Hidden audio element for A/B comparison */}
      {currentTrackUrl && (
        <audio
          ref={audioPlayerRef}
          src={currentTrackUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Header Banner */}
      <div className="studio-card p-8 relative overflow-hidden bg-gradient-to-br from-violet-900/20 via-canvas-soft to-canvas border border-violet-500/20">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ElevenLabs Audio Intelligence</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-ink">
              Audio Cleanup & Studio Vocal Enhancer
            </h1>
            <p className="text-sm text-body max-w-2xl leading-relaxed">
              Eradicate environmental background noise, room reverberation, microphone hums, and ambient hiss with ElevenLabs Audio Isolation. Or re-voice recorded scratch audio into studio-grade narration with Speech-to-Speech synthesis.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-canvas border border-hairline flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-mute tracking-widest">Quality Standard</div>
                <div className="text-xs font-bold text-ink">44.1kHz Studio Vocals</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 flex items-start gap-3 text-error animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs leading-relaxed font-medium">
            {error}
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Success Notification */}
      {assignSuccessMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3 text-success animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-bold">{assignSuccessMsg}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Source & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Input Source Selector */}
          <div className="studio-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Select Audio Input</h2>
              </div>
              <div className="flex p-1 rounded-xl bg-canvas border border-hairline text-xs font-semibold">
                <button
                  onClick={() => setInputSource('upload')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    inputSource === 'upload' ? 'bg-ink text-canvas shadow-sm font-bold' : 'text-body hover:text-ink'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => setInputSource('record')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    inputSource === 'record' ? 'bg-ink text-canvas shadow-sm font-bold' : 'text-body hover:text-ink'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Microphone</span>
                </button>
                <button
                  onClick={() => setInputSource('cache')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    inputSource === 'cache' ? 'bg-ink text-canvas shadow-sm font-bold' : 'text-body hover:text-ink'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Studio Audios</span>
                </button>
              </div>
            </div>

            {/* Upload Channel */}
            {inputSource === 'upload' && (
              <div className="space-y-4">
                <label className="border-2 border-dashed border-hairline hover:border-violet-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-canvas-soft/50 hover:bg-violet-500/5 transition-all group">
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-canvas border border-hairline flex items-center justify-center text-body group-hover:text-violet-500 group-hover:scale-105 transition-all shadow-sm">
                    <FileAudio className="w-7 h-7" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-ink">
                      {selectedFile ? selectedFile.name : 'Drag & drop or browse audio file'}
                    </p>
                    <p className="text-xs text-mute">
                      Supports MP3, WAV, FLAC, M4A, OGG, AAC, or MP4 video (Max 50MB)
                    </p>
                  </div>
                  {selectedFile && (
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB Selected
                    </span>
                  )}
                </label>
              </div>
            )}

            {/* Live Microphone Recording Channel */}
            {inputSource === 'record' && (
              <div className="p-8 rounded-2xl bg-canvas border border-hairline flex flex-col items-center justify-center space-y-6 text-center">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-error text-white shadow-xl shadow-error/30 animate-pulse'
                    : 'bg-canvas-soft border border-hairline text-body'
                }`}>
                  <Mic className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="text-xl font-mono font-black text-ink">
                    {formatSeconds(recordingDuration)}
                  </div>
                  <p className="text-xs text-mute">
                    {isRecording ? 'Recording voice memo... Speak into your microphone.' : 'Record a scratch voice track or speech sample to isolate.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 bg-error text-white rounded-xl text-xs font-bold shadow-lg shadow-error/20 flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer"
                    >
                      <MicOff className="w-4 h-4" />
                      <span>Stop & Use Recording</span>
                    </button>
                  )}
                </div>

                {selectedFile && !isRecording && (
                  <div className="text-xs text-success font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Recording ready: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            )}

            {/* Project Cache Audio Channel */}
            {inputSource === 'cache' && (
              <div className="space-y-3">
                <p className="text-xs text-body">
                  Select any existing narration or voiceover previously generated in this project:
                </p>
                {historyAudios && historyAudios.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {historyAudios.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedCachedFilename(item.filename);
                          setSelectedFile(null);
                          setFilePreviewUrl(item.url);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          selectedCachedFilename === item.filename
                            ? 'bg-violet-500/10 border-violet-500 text-ink shadow-sm'
                            : 'bg-canvas border-hairline hover:border-hairline-strong text-body'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate italic">"{item.text}"</p>
                          <div className="text-[10px] text-mute flex items-center gap-2 mt-0.5 font-bold uppercase tracking-wider">
                            <span>{item.voice_name}</span>
                            <span>•</span>
                            <span>{item.char_count} chars</span>
                          </div>
                        </div>
                        {selectedCachedFilename === item.filename && (
                          <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-mute border border-dashed border-hairline rounded-xl">
                    No generated audio found in studio cache. Generate a voiceover or upload a file above.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Choose Enhancement Engine */}
          <div className="studio-card p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-hairline pb-4">
              <span className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Choose Enhancement Engine</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Engine 1: Pure Audio Isolation */}
              <div
                onClick={() => setEnhancementMode('isolation')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative ${
                  enhancementMode === 'isolation'
                    ? 'border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/5'
                    : 'border-hairline hover:border-hairline-strong bg-canvas'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  {enhancementMode === 'isolation' && (
                    <span className="px-2 py-0.5 bg-violet-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                      Active
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Audio Isolation</h3>
                  <p className="text-xs text-body leading-relaxed mt-1">
                    Pure AI de-noiser that erases environmental rumble, room acoustics, wind, and fan noise while leaving vocal frequencies intact.
                  </p>
                </div>
                <div className="text-[10px] text-mute font-bold uppercase tracking-wider flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                  <span>Original Vocal Preserved</span>
                </div>
              </div>

              {/* Engine 2: Speech-to-Speech Studio Conversion */}
              <div
                onClick={() => setEnhancementMode('speech_to_speech')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative ${
                  enhancementMode === 'speech_to_speech'
                    ? 'border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/5'
                    : 'border-hairline hover:border-hairline-strong bg-canvas'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                    <Music className="w-5 h-5" />
                  </div>
                  {enhancementMode === 'speech_to_speech' && (
                    <span className="px-2 py-0.5 bg-violet-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                      Active
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Speech-to-Speech Resynthesis</h3>
                  <p className="text-xs text-body leading-relaxed mt-1">
                    Re-voices noisy or scratch speech into a studio narrator with automatic noise cleanup, retaining emotion and pacing.
                  </p>
                </div>
                <div className="text-[10px] text-mute font-bold uppercase tracking-wider flex items-center gap-1.5 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span>Pro Actor Vocal Upgrade</span>
                </div>
              </div>
            </div>

            {/* Engine Specific Parameters */}
            {enhancementMode === 'isolation' ? (
              <div className="p-4 rounded-xl bg-canvas border border-hairline space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink">Audio Processing Format</span>
                  <select
                    value={fileFormat}
                    onChange={(e) => setFileFormat(e.target.value)}
                    className="bg-canvas-soft border border-hairline rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
                  >
                    <option value="other">Encoded Stream (MP3/WAV/FLAC/AAC)</option>
                    <option value="pcm_s16le_16">Low-Latency PCM (16-bit 16kHz)</option>
                  </select>
                </div>
                <p className="text-[11px] text-mute leading-relaxed">
                  ElevenLabs Voice Isolation removes room reverb, HVAC hum, traffic, street ambiance, and microphone hiss without clipping vocal consonants.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-canvas border border-hairline space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink block">Target Studio Voice</label>
                  <select
                    value={targetVoiceId}
                    onChange={(e) => setTargetVoiceId(e.target.value)}
                    className="w-full bg-canvas-soft border border-hairline rounded-xl px-3 py-2 text-xs font-bold cursor-pointer"
                  >
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name} ({v.category || 'Standard'}) - {v.labels?.accent || 'Studio'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-body">Stability</span>
                      <span className="text-ink">{Math.round(stsStability * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={stsStability}
                      onChange={(e) => setStsStability(parseFloat(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-body">Similarity</span>
                      <span className="text-ink">{Math.round(stsSimilarity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={stsSimilarity}
                      onChange={(e) => setStsSimilarity(parseFloat(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-hairline">
                  <input
                    type="checkbox"
                    id="removeBgNoise"
                    checked={removeBgNoise}
                    onChange={(e) => setRemoveBgNoise(e.target.checked)}
                    className="rounded text-primary accent-primary cursor-pointer"
                  />
                  <label htmlFor="removeBgNoise" className="text-xs font-bold text-ink cursor-pointer select-none">
                    Denoise input audio before vocal resynthesis (removes background artifacts)
                  </label>
                </div>
              </div>
            )}

            {/* Launch Action Button */}
            <button
              onClick={handleProcessAudio}
              disabled={isProcessing}
              className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-bold shadow-xl shadow-primary/25 flex items-center justify-center gap-3 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{processingStatus || 'Processing with ElevenLabs...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>
                    {enhancementMode === 'isolation'
                      ? 'Eradicate Noise & Isolate Vocals'
                      : 'Resynthesize to Studio Narrator'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Comparison Player & Storyboard Hand-off (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* A/B Comparison Player */}
          <div className="studio-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">A/B Studio Monitor</h3>
              </div>
              {enhancedResult && (
                <span className="px-2.5 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded-full border border-success/20">
                  Enhanced Ready
                </span>
              )}
            </div>

            {/* Track Switcher (Original vs Cleaned) */}
            <div className="p-1.5 rounded-2xl bg-canvas border border-hairline grid grid-cols-2 gap-1.5">
              <button
                onClick={() => switchPlaybackTrack('original')}
                disabled={!filePreviewUrl && !enhancedResult?.original_url}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 ${
                  activePlaybackTrack === 'original'
                    ? 'bg-ink text-canvas shadow-md'
                    : 'text-body hover:text-ink'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Original (Noisy)</span>
              </button>

              <button
                onClick={() => switchPlaybackTrack('cleaned')}
                disabled={!enhancedResult}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 ${
                  activePlaybackTrack === 'cleaned'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-body hover:text-ink'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Studio Clean</span>
              </button>
            </div>

            {/* Visualizer & Waveform Display */}
            <div className="p-6 rounded-2xl bg-canvas-soft border border-hairline flex flex-col items-center justify-center space-y-4 min-h-[160px] relative overflow-hidden">
              <div className="flex items-center gap-1 h-12">
                {[40, 65, 25, 80, 45, 90, 70, 30, 85, 55, 95, 60, 40, 75, 50, 85, 30, 65, 45, 80, 55, 90, 35, 70].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${isPlaying ? Math.max(15, (h * (0.5 + Math.random() * 0.5))) : 15}%` }}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      activePlaybackTrack === 'cleaned'
                        ? 'bg-violet-500'
                        : 'bg-body/40'
                    }`}
                  />
                ))}
              </div>

              {/* Progress Slider */}
              <div className="w-full space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.05"
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={!currentTrackUrl}
                  className="w-full accent-violet-500 cursor-pointer h-1.5 bg-canvas rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-mute">
                  <span>{formatSeconds(currentTime)}</span>
                  <span>{formatSeconds(duration)}</span>
                </div>
              </div>

              {/* Player Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  disabled={!currentTrackUrl}
                  className="w-12 h-12 rounded-2xl bg-ink text-canvas hover:scale-105 transition-all flex items-center justify-center shadow-lg disabled:opacity-40 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Storyboard Segment Handoff */}
            {enhancedResult && activeScript?.segments?.length > 0 && (
              <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Assign to Storyboard</span>
                  <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Sync with Video</span>
                </div>
                <select
                  value={targetSegmentId}
                  onChange={(e) => setTargetSegmentId(e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                >
                  {activeScript.segments.map((seg, idx) => (
                    <option key={seg.id} value={seg.id}>
                      Segment #{idx + 1}: {seg.section} - "{seg.text?.slice(0, 40)}..."
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignAudio}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Apply Cleaned Audio to Selected Scene</span>
                </button>
              </div>
            )}

            {/* Download Button */}
            {enhancedResult && (
              <a
                href={enhancedResult.url}
                download={enhancedResult.filename}
                className="w-full py-3 bg-canvas border border-hairline hover:bg-canvas-soft rounded-xl text-xs font-bold text-ink flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Cleaned Studio Audio</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* History Archive Tabs */}
      <div className="studio-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-mute" />
              Isolated Audio Vault
            </h3>
            <span className="text-xs text-mute font-medium">({localHistory.length} local items)</span>
          </div>

          <button
            onClick={refreshAllHistory}
            className="p-2 rounded-xl border border-hairline hover:bg-canvas-soft transition-all text-mute hover:text-ink self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {localHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-canvas border border-hairline hover:border-violet-500/40 transition-all flex flex-col justify-between gap-4 group shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {item.mode === 'isolation' ? 'Audio Isolation' : 'Speech-to-Speech'}
                    </span>
                    <span className="text-[10px] text-mute font-mono">
                      {new Date(item.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-ink truncate">
                    {item.original_filename || item.filename}
                  </p>
                  {item.voice_name && (
                    <div className="text-[10px] text-mute">
                      Voice: <span className="text-ink font-semibold">{item.voice_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  <button
                    onClick={() => {
                      setEnhancedResult(item);
                      setActivePlaybackTrack('cleaned');
                    }}
                    className="px-3 py-1.5 bg-canvas-soft hover:bg-ink hover:text-canvas text-ink text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Load in Monitor</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <a
                      href={item.url}
                      download={item.filename}
                      className="p-2 rounded-lg bg-canvas-soft hover:text-ink text-mute transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => deleteLocalItem(item.filename)}
                      className="p-2 rounded-lg bg-canvas-soft hover:text-error text-mute transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-mute font-medium">
            No isolated audio generations stored yet. Process an audio file or microphone recording above!
          </div>
        )}
      </div>
    </div>
  );
}
