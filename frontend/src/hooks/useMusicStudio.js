/**
 * useMusicStudio — state and logic for the Music & Sound Effects page.
 *
 * Manages:
 *  - Music composition generation
 *  - Sound effect generation
 *  - Local library (cached files)
 *  - Trending prompts
 *  - Active audio player state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../api';

export default function useMusicStudio() {
  // ── Active tab within the music page ──────────────────────────────────────
  const [activeSection, setActiveSection] = useState('music'); // 'music' | 'sfx'

  // ── Music generation state ─────────────────────────────────────────────────
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicLengthSec, setMusicLengthSec] = useState(30);
  const [makeInstrumental, setMakeInstrumental] = useState(true);
  const [musicModel, setMusicModel] = useState('music_v2_5');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicError, setMusicError] = useState(null);

  // ── SFX generation state ──────────────────────────────────────────────────
  const [sfxText, setSfxText] = useState('');
  const [sfxDuration, setSfxDuration] = useState(null); // null = auto
  const [sfxInfluence, setSfxInfluence] = useState(0.3);
  const [sfxLoop, setSfxLoop] = useState(false);
  const [sfxModel, setSfxModel] = useState('eleven_text_to_sound_v3');
  const [isGeneratingSfx, setIsGeneratingSfx] = useState(false);
  const [sfxError, setSfxError] = useState(null);

  // ── Library ───────────────────────────────────────────────────────────────
  const [library, setLibrary] = useState({ music: [], sfx: [] });
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // ── Trending ──────────────────────────────────────────────────────────────
  const [trending, setTrending] = useState({ music: [], sfx: [] });
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);

  // ── Audio player ──────────────────────────────────────────────────────────
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // ── Fetch library ─────────────────────────────────────────────────────────
  const fetchLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const data = await api.music.getLibrary();
      setLibrary(data);
    } catch (err) {
      console.error('Failed to load music library:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  // ── Fetch trending ────────────────────────────────────────────────────────
  const fetchTrending = useCallback(async () => {
    setIsLoadingTrending(true);
    try {
      const data = await api.music.getTrending();
      setTrending(data);
    } catch (err) {
      console.error('Failed to load trending:', err);
    } finally {
      setIsLoadingTrending(false);
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLibrary();
    fetchTrending();
  }, [fetchLibrary, fetchTrending]);

  // ── Generate music ────────────────────────────────────────────────────────
  const handleGenerateMusic = useCallback(async () => {
    if (!musicPrompt.trim()) return;
    setIsGeneratingMusic(true);
    setMusicError(null);
    try {
      await api.music.composeMusic({
        prompt: musicPrompt.trim(),
        music_length_ms: musicLengthSec * 1000,
        model: musicModel,
        make_instrumental: makeInstrumental,
      });
      await fetchLibrary();
    } catch (err) {
      setMusicError(err.message || 'Failed to generate music.');
    } finally {
      setIsGeneratingMusic(false);
    }
  }, [musicPrompt, musicLengthSec, musicModel, makeInstrumental, fetchLibrary]);

  // ── Generate SFX ─────────────────────────────────────────────────────────
  const handleGenerateSfx = useCallback(async () => {
    if (!sfxText.trim()) return;
    setIsGeneratingSfx(true);
    setSfxError(null);
    try {
      await api.music.generateSfx({
        text: sfxText.trim(),
        duration_seconds: sfxDuration || undefined,
        prompt_influence: sfxInfluence,
        loop: sfxLoop,
        model_id: sfxModel,
      });
      await fetchLibrary();
    } catch (err) {
      setSfxError(err.message || 'Failed to generate sound effect.');
    } finally {
      setIsGeneratingSfx(false);
    }
  }, [sfxText, sfxDuration, sfxInfluence, sfxLoop, sfxModel, fetchLibrary]);

  // ── Delete library item ───────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    try {
      await api.music.deleteLibraryItem(id);
      await fetchLibrary();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [fetchLibrary]);

  // ── Audio playback ────────────────────────────────────────────────────────
  const handlePlay = useCallback((item) => {
    const fileUrl = `/music/${item.filename}`;

    if (playingId === item.id) {
      // Toggle pause
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
          setPlayingId(null);
        }
      }
      return;
    }

    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio(fileUrl);
    audioRef.current = audio;
    audio.play().catch(console.error);
    setPlayingId(item.id);
    audio.onended = () => setPlayingId(null);
  }, [playingId]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingId(null);
  }, []);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback((item) => {
    const fileUrl = `/music/${item.filename}`;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = item.filename;
    a.click();
  }, []);

  // ── Apply trending prompt ─────────────────────────────────────────────────
  const applyTrendingMusic = useCallback((item) => {
    setMusicPrompt(item.prompt);
    setActiveSection('music');
  }, []);

  const applyTrendingSfx = useCallback((item) => {
    setSfxText(item.text);
    setActiveSection('sfx');
  }, []);

  return {
    // Section
    activeSection, setActiveSection,
    // Music
    musicPrompt, setMusicPrompt,
    musicLengthSec, setMusicLengthSec,
    makeInstrumental, setMakeInstrumental,
    musicModel, setMusicModel,
    isGeneratingMusic, musicError,
    handleGenerateMusic,
    // SFX
    sfxText, setSfxText,
    sfxDuration, setSfxDuration,
    sfxInfluence, setSfxInfluence,
    sfxLoop, setSfxLoop,
    sfxModel, setSfxModel,
    isGeneratingSfx, sfxError,
    handleGenerateSfx,
    // Library
    library, isLoadingLibrary, fetchLibrary,
    handleDelete,
    // Trending
    trending, isLoadingTrending,
    applyTrendingMusic, applyTrendingSfx,
    // Player
    playingId, handlePlay, handleStop, handleDownload,
  };
}
