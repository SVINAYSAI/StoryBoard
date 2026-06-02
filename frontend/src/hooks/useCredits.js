/**
 * Hook: useCredits
 * Manages ElevenLabs credit state and fetching.
 */

import { useState } from 'react';
import { api } from '../api';

export default function useCredits() {
  const [credits, setCredits] = useState(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState('');

  const fetchCredits = async () => {
    setIsLoadingCredits(true);
    setCreditsError('');
    try {
      const data = await api.credits.get();
      setCredits(data);
    } catch (err) {
      setCreditsError(err.message || 'Error fetching credits.');
    } finally {
      setIsLoadingCredits(false);
    }
  };

  return { credits, isLoadingCredits, creditsError, fetchCredits };
}
