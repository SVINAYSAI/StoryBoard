/**
 * Hook: useAudioPlayer
 * Reusable audio playback management.
 * Extracted from duplicated logic in VoiceOverCreator and VoiceSelector.
 */

import { useState, useEffect, useCallback } from 'react';

export default function useAudioPlayer() {
  const [playingUrl, setPlayingUrl] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const play = useCallback((url) => {
    if (!url) return;

    if (playingUrl === url && audioElement) {
      // Toggle pause/play if same URL
      if (audioElement.paused) {
        audioElement.play().catch(e => console.error(e));
      } else {
        audioElement.pause();
      }
      return;
    }

    // Stop previous
    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.play().catch(err => console.error('Error playing audio', err));

    setAudioElement(audio);
    setPlayingUrl(url);

    audio.onended = () => {
      setPlayingUrl(null);
    };
  }, [playingUrl, audioElement]);

  const stop = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
    }
    setPlayingUrl(null);
  }, [audioElement]);

  const isPlaying = useCallback((url) => {
    return playingUrl === url && audioElement && !audioElement.paused;
  }, [playingUrl, audioElement]);

  return { play, stop, isPlaying, playingUrl };
}
