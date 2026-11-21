/**
 * MusicStudio — dedicated Music & Sound Effects page.
 *
 * Sections:
 *  1. Generate (Music tab / SFX tab)
 *  2. Trending prompts carousel
 *  3. My Library — cached results with play / download / delete
 */

import React, { useState } from 'react';
import {
  Music2, Zap, Play, Pause, Download, Trash2,
  Loader2, Sparkles, TrendingUp, Library,
  RefreshCw, ChevronRight, AlertCircle, Volume2,
  Clock, ToggleLeft, ToggleRight, Mic2, Radio,
} from 'lucide-react';
import useMusicStudio from '../../hooks/useMusicStudio';

// ── Small helpers ─────────────────────────────────────────────────────────────

function Badge({ children, color = 'default' }) {
  const colors = {
    default: 'bg-canvas-soft text-mute',
    violet: 'bg-violet/10 text-violet',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${colors[color]}`}>
      {children}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center shrink-0 shadow-md">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <h2 className="text-sm font-black text-ink uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-xs text-mute mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-mute uppercase tracking-widest">{label}</label>
        <span className="text-[10px] font-bold text-ink bg-canvas-soft px-2 py-0.5 rounded-lg">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-canvas-soft accent-ink cursor-pointer"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full p-3 bg-canvas-soft rounded-xl hover:bg-white border border-transparent hover:border-hairline transition-all"
    >
      <div className="text-left">
        <span className="text-xs font-bold text-ink block">{label}</span>
        {description && <span className="text-[10px] text-mute">{description}</span>}
      </div>
      {checked
        ? <ToggleRight className="w-5 h-5 text-ink shrink-0" />
        : <ToggleLeft className="w-5 h-5 text-mute shrink-0" />}
    </button>
  );
}

// ── Waveform animation (purely CSS, no canvas needed) ────────────────────────
function WaveformBar({ delay = 0, playing = false }) {
  return (
    <div
      className={`w-0.5 bg-ink rounded-full transition-all ${playing ? 'animate-bounce' : 'h-1'}`}
      style={{ animationDelay: `${delay}ms`, height: playing ? undefined : '4px' }}
    />
  );
}

function MiniWaveform({ playing }) {
  return (
    <div className="flex items-center gap-px h-5">
      {[0, 80, 160, 80, 40, 120, 60, 100, 20].map((delay, i) => (
        <WaveformBar key={i} delay={delay} playing={playing} />
      ))}
    </div>
  );
}

// ── Library card ──────────────────────────────────────────────────────────────
function LibraryCard({ item, isPlaying, onPlay, onDownload, onDelete }) {
  const isMusic = item.type === 'music';
  const label = isMusic ? (item.prompt || 'Music Track') : (item.text || 'Sound Effect');
  const dateStr = item.timestamp
    ? new Date(item.timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  return (
    <div className={`group relative flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
      isPlaying
        ? 'bg-ink text-white border-ink shadow-lg'
        : 'bg-white border-hairline hover:border-ink/20 hover:shadow-md'
    }`}>
      {/* Play / Pause button */}
      <button
        onClick={() => onPlay(item)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
          isPlaying
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-canvas-soft hover:bg-ink hover:text-white'
        }`}
      >
        {isPlaying
          ? <Pause className="w-4 h-4 text-white" />
          : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Waveform + label */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className={`text-xs font-bold truncate ${isPlaying ? 'text-white' : 'text-ink'}`}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          <Badge color={isPlaying ? 'default' : (isMusic ? 'violet' : 'blue')}>
            {isMusic ? 'Music' : 'SFX'}
          </Badge>
          {dateStr && (
            <span className={`text-[10px] ${isPlaying ? 'text-white/60' : 'text-mute'}`}>
              {dateStr}
            </span>
          )}
          {isPlaying && <MiniWaveform playing />}
        </div>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isPlaying ? '!opacity-100' : ''}`}>
        <button
          onClick={() => onDownload(item)}
          className={`p-2 rounded-lg transition-all ${
            isPlaying
              ? 'hover:bg-white/20 text-white'
              : 'hover:bg-canvas-soft text-mute hover:text-ink'
          }`}
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className={`p-2 rounded-lg transition-all ${
            isPlaying
              ? 'hover:bg-white/20 text-white/70 hover:text-white'
              : 'hover:bg-red-50 text-mute hover:text-red-500'
          }`}
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Trending card ─────────────────────────────────────────────────────────────
function TrendingCard({ item, type, onApply }) {
  const label = type === 'music' ? item.label : item.label;
  const sub = type === 'music'
    ? `${item.genre} · ${item.mood}`
    : item.category;

  return (
    <button
      onClick={() => onApply(item)}
      className="group relative flex flex-col text-left p-4 bg-white rounded-2xl border border-hairline hover:border-ink/30 hover:shadow-md transition-all duration-200 min-w-[160px]"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          type === 'music' ? 'bg-violet/10' : 'bg-blue-50'
        }`}>
          {type === 'music'
            ? <Music2 className="w-4 h-4 text-violet" />
            : <Zap className="w-4 h-4 text-blue-500" />}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-mute opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>
      <span className="text-xs font-black text-ink leading-tight">{label}</span>
      <span className="text-[10px] text-mute mt-1 uppercase tracking-widest">{sub}</span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MusicStudio() {
  const {
    activeSection, setActiveSection,
    musicPrompt, setMusicPrompt,
    musicLengthSec, setMusicLengthSec,
    makeInstrumental, setMakeInstrumental,
    musicModel, setMusicModel,
    isGeneratingMusic, musicError,
    handleGenerateMusic,
    sfxText, setSfxText,
    sfxDuration, setSfxDuration,
    sfxInfluence, setSfxInfluence,
    sfxLoop, setSfxLoop,
    sfxModel, setSfxModel,
    isGeneratingSfx, sfxError,
    handleGenerateSfx,
    library, isLoadingLibrary, fetchLibrary,
    handleDelete,
    trending, isLoadingTrending,
    applyTrendingMusic, applyTrendingSfx,
    playingId, handlePlay, handleStop, handleDownload,
  } = useMusicStudio();

  const [libraryFilter, setLibraryFilter] = useState('all'); // 'all' | 'music' | 'sfx'

  const filteredLibrary = [
    ...(libraryFilter !== 'sfx' ? library.music : []),
    ...(libraryFilter !== 'music' ? library.sfx : []),
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const totalLibraryCount = library.music.length + library.sfx.length;

  return (
    <div className="min-h-full space-y-8">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center shadow-xl">
            <Music2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">Music Studio</h1>
            <p className="text-xs text-mute mt-0.5 uppercase tracking-widest font-bold">
              AI Music · Sound Effects · Library
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="violet">ElevenLabs AI</Badge>
          {playingId && (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white text-xs font-bold rounded-xl hover:bg-ink/90 transition-all"
            >
              <Pause className="w-3 h-3" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Generator panel ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-hairline shadow-sm overflow-hidden">
        {/* Tab switcher */}
        <div className="flex border-b border-hairline">
          {[
            { id: 'music', label: 'Background Music', icon: Music2 },
            { id: 'sfx', label: 'Sound Effects', icon: Zap },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeSection === id
                  ? 'border-ink text-ink'
                  : 'border-transparent text-mute hover:text-ink hover:border-hairline'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {activeSection === 'music' ? (
            <>
              {/* Music prompt */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-mute uppercase tracking-widest">
                  Describe your music
                </label>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="e.g. Epic orchestral score with rising strings and dramatic brass for a movie trailer..."
                  rows={3}
                  className="w-full px-4 py-3 bg-canvas-soft rounded-xl text-sm text-ink placeholder:text-mute border border-hairline focus:outline-none focus:border-ink/30 resize-none transition-colors"
                />
              </div>

              {/* Controls row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderField
                  label="Duration"
                  value={musicLengthSec}
                  min={5}
                  max={120}
                  step={5}
                  onChange={setMusicLengthSec}
                  format={(v) => `${v}s`}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-mute uppercase tracking-widest">Model</label>
                  <select
                    value={musicModel}
                    onChange={(e) => setMusicModel(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas-soft rounded-xl text-xs font-bold text-ink border border-hairline focus:outline-none focus:border-ink/30 cursor-pointer"
                  >
                    <option value="music_v2_5">Music v2.5 (Latest)</option>
                    <option value="music_v2">Music v2</option>
                    <option value="music_v1">Music v1</option>
                  </select>
                </div>
              </div>

              <Toggle
                label="Instrumental only"
                description="No vocals — pure background music"
                checked={makeInstrumental}
                onChange={setMakeInstrumental}
              />

              <ErrorBanner message={musicError} />

              <button
                onClick={handleGenerateMusic}
                disabled={isGeneratingMusic || !musicPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white font-black text-sm rounded-xl hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isGeneratingMusic ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Composing music…
                  </>
                ) : (
                  <>
                    <Music2 className="w-4 h-4" />
                    Compose Music
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* SFX prompt */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-mute uppercase tracking-widest">
                  Describe the sound effect
                </label>
                <textarea
                  value={sfxText}
                  onChange={(e) => setSfxText(e.target.value)}
                  placeholder="e.g. Powerful thunder crack followed by deep rolling rumble through storm clouds..."
                  rows={3}
                  className="w-full px-4 py-3 bg-canvas-soft rounded-xl text-sm text-ink placeholder:text-mute border border-hairline focus:outline-none focus:border-ink/30 resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duration — optional */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black text-mute uppercase tracking-widest">
                      Duration
                    </label>
                    <span className="text-[10px] font-bold text-ink bg-canvas-soft px-2 py-0.5 rounded-lg">
                      {sfxDuration ? `${sfxDuration}s` : 'Auto'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={0.5}
                    value={sfxDuration ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSfxDuration(v === 0 ? null : v);
                    }}
                    className="w-full h-1.5 rounded-full appearance-none bg-canvas-soft accent-ink cursor-pointer"
                  />
                  <p className="text-[10px] text-mute">0 = let the AI decide</p>
                </div>

                <SliderField
                  label="Prompt Influence"
                  value={sfxInfluence}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={setSfxInfluence}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-mute uppercase tracking-widest">Model</label>
                  <select
                    value={sfxModel}
                    onChange={(e) => setSfxModel(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas-soft rounded-xl text-xs font-bold text-ink border border-hairline focus:outline-none focus:border-ink/30 cursor-pointer"
                  >
                    <option value="eleven_text_to_sound_v3">SFX v3 (Latest)</option>
                    <option value="eleven_text_to_sound_v2">SFX v2</option>
                  </select>
                </div>

                <Toggle
                  label="Loop seamlessly"
                  description="Creates a looping sound effect"
                  checked={sfxLoop}
                  onChange={setSfxLoop}
                />
              </div>

              <ErrorBanner message={sfxError} />

              <button
                onClick={handleGenerateSfx}
                disabled={isGeneratingSfx || !sfxText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white font-black text-sm rounded-xl hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isGeneratingSfx ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating sound effect…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Sound Effect
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Trending ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-hairline shadow-sm p-6">
        <SectionHeader
          icon={TrendingUp}
          title="Trending Prompts"
          subtitle="Click any card to load the prompt into the generator"
        />

        {/* Music trending */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <Music2 className="w-3.5 h-3.5 text-violet" />
            <span className="text-[10px] font-black text-mute uppercase tracking-widest">Background Music</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {isLoadingTrending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[160px] h-[88px] bg-canvas-soft rounded-2xl animate-pulse" />
              ))
            ) : (
              trending.music?.map((item) => (
                <TrendingCard key={item.id} item={item} type="music" onApply={applyTrendingMusic} />
              ))
            )}
          </div>
        </div>

        {/* SFX trending */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-black text-mute uppercase tracking-widest">Sound Effects</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {isLoadingTrending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[160px] h-[88px] bg-canvas-soft animate-pulse rounded-2xl" />
              ))
            ) : (
              trending.sfx?.map((item) => (
                <TrendingCard key={item.id} item={item} type="sfx" onApply={applyTrendingSfx} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Library ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-hairline shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <SectionHeader
            icon={Library}
            title="My Library"
            subtitle={`${totalLibraryCount} generated file${totalLibraryCount !== 1 ? 's' : ''} — play, download or delete`}
          />
          <div className="flex items-center gap-2 mt-1">
            {/* Filter tabs */}
            {['all', 'music', 'sfx'].map((f) => (
              <button
                key={f}
                onClick={() => setLibraryFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  libraryFilter === f
                    ? 'bg-ink text-white'
                    : 'bg-canvas-soft text-mute hover:text-ink hover:bg-white hover:border hover:border-hairline'
                }`}
              >
                {f === 'all' ? 'All' : f === 'music' ? 'Music' : 'SFX'}
              </button>
            ))}
            <button
              onClick={fetchLibrary}
              disabled={isLoadingLibrary}
              className="p-2 rounded-lg bg-canvas-soft hover:bg-white hover:border hover:border-hairline transition-all text-mute hover:text-ink disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoadingLibrary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[72px] bg-canvas-soft rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredLibrary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-canvas-soft flex items-center justify-center">
              <Music2 className="w-7 h-7 text-mute/40" />
            </div>
            <p className="text-sm font-bold text-mute">No files yet</p>
            <p className="text-xs text-mute/70 max-w-xs">
              Generate music or sound effects above and they'll appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLibrary.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                isPlaying={playingId === item.id}
                onPlay={handlePlay}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-6" />
    </div>
  );
}
