/**
 * Hook: useHistory
 * Manages voiceover audio history state and CRUD operations.
 */

import { useState } from 'react';
import { api } from '../api';

export default function useHistory() {
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const data = await api.history.list();
      setHistory(data);
    } catch (err) {
      setHistoryError(err.message || 'Error loading history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteHistoryItem = async (filename, fetchCredits) => {
    try {
      await api.history.delete(filename);
      // Refresh local lists
      fetchHistory();
      if (fetchCredits) fetchCredits();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateHistoryWithNewAudio = (audioMeta) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== audioMeta.id);
      return [audioMeta, ...filtered];
    });
  };

  return {
    history,
    isLoadingHistory,
    historyError,
    fetchHistory,
    handleDeleteHistoryItem,
    handleUpdateHistoryWithNewAudio,
  };
}
