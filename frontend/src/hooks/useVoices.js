/**
 * Hook: useVoices
 * Manages ElevenLabs voices catalog state and fetching.
 */

import { useState } from 'react';
import { api } from '../api';

export default function useVoices() {
  const [voices, setVoices] = useState([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);

  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    setVoicesError('');
    try {
      const data = await api.voices.get();
      const voicesList = data.voices || [];
      setVoices(voicesList);

      // Auto select Rachel or first premade voice if not set
      if (voicesList.length > 0) {
        const defaultVoice = voicesList.find(v => v.name === 'Rachel') || voicesList[0];
        setSelectedVoice(defaultVoice);
      }
    } catch (err) {
      setVoicesError(err.message || 'Error loading voices.');
    } finally {
      setIsLoadingVoices(false);
    }
  };

  return {
    voices,
    isLoadingVoices,
    voicesError,
    selectedVoice,
    setSelectedVoice,
    fetchVoices,
  };
}
