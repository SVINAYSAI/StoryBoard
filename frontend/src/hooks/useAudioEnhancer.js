/**
 * Hook: useAudioEnhancer
 * Manages ElevenLabs Audio Isolation, Speech-to-Speech vocal enhancement,
 * and audio history state.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '../api';

export default function useAudioEnhancer() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState('');
  const [enhancedResult, setEnhancedResult] = useState(null);

  const [localHistory, setLocalHistory] = useState([]);
  const [cloudHistory, setCloudHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchLocalHistory = useCallback(async () => {
    try {
      const data = await api.audioEnhancer.getLocalHistory();
      setLocalHistory(data || []);
    } catch (err) {
      console.warn('Failed to load local enhanced audio history:', err);
    }
  }, []);

  const fetchCloudHistory = useCallback(async (params = {}) => {
    try {
      const data = await api.audioEnhancer.getCloudHistory(params);
      setCloudHistory(data?.items || []);
    } catch (err) {
      console.warn('Failed to load cloud isolation history:', err);
    }
  }, []);

  const refreshAllHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    await Promise.allSettled([fetchLocalHistory(), fetchCloudHistory()]);
    setIsLoadingHistory(false);
  }, [fetchLocalHistory, fetchCloudHistory]);

  useEffect(() => {
    refreshAllHistory();
  }, [refreshAllHistory]);

  /**
   * Run ElevenLabs Audio Isolation (Noise eradication & vocal isolation)
   */
  const isolateAudio = async ({ file, cachedFilename, segmentId, projectId, fileFormat = 'other' }) => {
    setIsProcessing(true);
    setError('');
    setProcessingStatus('Connecting to ElevenLabs Audio Isolation...');

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      if (cachedFilename) {
        formData.append('cached_filename', cachedFilename);
      }
      if (fileFormat) {
        formData.append('file_format', fileFormat);
      }
      if (segmentId) {
        formData.append('segment_id', segmentId);
      }
      if (projectId) {
        formData.append('project_id', projectId);
      }

      setProcessingStatus('Removing background noise & room reverberation...');
      const result = await api.audioEnhancer.isolate(formData);

      setEnhancedResult(result);
      setProcessingStatus('');
      await fetchLocalHistory();
      return result;
    } catch (err) {
      const msg = err.message || 'Audio isolation failed.';
      setError(msg);
      throw err;
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  /**
   * Run ElevenLabs Speech-to-Speech Studio Vocal Re-voicing with noise removal
   */
  const enhanceSpeechToSpeech = async ({
    file,
    cachedFilename,
    voiceId,
    voiceName = '',
    modelId = 'eleven_english_sts_v2',
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.0,
    removeBackgroundNoise = true,
    segmentId,
    projectId,
  }) => {
    setIsProcessing(true);
    setError('');
    setProcessingStatus('Initiating ElevenLabs Vocal Resynthesis...');

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      if (cachedFilename) {
        formData.append('cached_filename', cachedFilename);
      }
      formData.append('voice_id', voiceId);
      formData.append('voice_name', voiceName);
      formData.append('model_id', modelId);
      formData.append('stability', String(stability));
      formData.append('similarity_boost', String(similarityBoost));
      formData.append('style', String(style));
      formData.append('remove_background_noise', String(removeBackgroundNoise));

      if (segmentId) {
        formData.append('segment_id', segmentId);
      }
      if (projectId) {
        formData.append('project_id', projectId);
      }

      setProcessingStatus('Denoising input and synthesizing studio voice performance...');
      const result = await api.audioEnhancer.speechToSpeech(formData);

      setEnhancedResult(result);
      setProcessingStatus('');
      await fetchLocalHistory();
      return result;
    } catch (err) {
      const msg = err.message || 'Speech-to-speech enhancement failed.';
      setError(msg);
      throw err;
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const deleteLocalItem = async (filename) => {
    try {
      await api.audioEnhancer.deleteLocalHistory(filename);
      setLocalHistory((prev) => prev.filter((item) => item.filename !== filename));
      if (enhancedResult?.filename === filename) {
        setEnhancedResult(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete local audio.');
    }
  };

  const deleteCloudItem = async (historyItemId) => {
    try {
      await api.audioEnhancer.deleteCloudHistory(historyItemId);
      setCloudHistory((prev) => prev.filter((item) => item.id !== historyItemId));
    } catch (err) {
      setError(err.message || 'Failed to delete cloud history item.');
    }
  };

  return {
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
  };
}
