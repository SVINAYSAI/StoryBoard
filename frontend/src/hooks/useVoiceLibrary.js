/**
 * Hook: useVoiceLibrary
 * Manages ElevenLabs shared Voice Library search, filters, and pagination.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api';

const INITIAL_FILTERS = {
  search: '',
  gender: 'all',
  age: 'all',
  accent: 'all',
  language: 'all',
  category: 'all',
  useCases: '',
  descriptives: '',
  featured: false,
  sort: 'trending',
  pageSize: 30,
  page: 0,
};

export default function useVoiceLibrary() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [voices, setVoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce timer ref
  const debounceRef = useRef(null);

  const searchVoices = useCallback(async (filterOverrides = {}, append = false) => {
    const activeFilters = { ...filters, ...filterOverrides };

    setIsLoading(true);
    setError('');

    try {
      // Build filter payload (exclude empty/default values)
      const payload = {};
      if (activeFilters.search) payload.search = activeFilters.search;
      if (activeFilters.gender !== 'all') payload.gender = activeFilters.gender;
      if (activeFilters.age !== 'all') payload.age = activeFilters.age;
      if (activeFilters.accent !== 'all') payload.accent = activeFilters.accent;
      if (activeFilters.language !== 'all') payload.language = activeFilters.language;
      if (activeFilters.category !== 'all') payload.category = activeFilters.category;
      if (activeFilters.useCases) payload.use_cases = activeFilters.useCases;
      if (activeFilters.descriptives) payload.descriptives = activeFilters.descriptives;
      if (activeFilters.featured) payload.featured = true;
      if (activeFilters.sort) payload.sort = activeFilters.sort;
      payload.page = activeFilters.page;
      payload.page_size = activeFilters.pageSize;

      const data = await api.voiceLibrary.search(payload);
      const voicesList = data.voices || [];

      if (append) {
        setVoices(prev => [...prev, ...voicesList]);
      } else {
        setVoices(voicesList);
      }

      // Determine if there are more pages
      setHasMore(voicesList.length >= activeFilters.pageSize);
      
      // Store total count if returned
      if (data.total_count !== undefined) {
        setTotalCount(data.total_count);
      }
    } catch (err) {
      setError(err.message || 'Error searching voice library.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Update a single filter and trigger search (reset to page 0)
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value, page: 0 };
      
      // For text search, debounce
      if (key === 'search') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          searchVoices(next);
        }, 400);
      } else {
        // Immediate search for dropdowns/toggles
        searchVoices(next);
      }
      
      return next;
    });
  }, [searchVoices]);

  // Load next page
  const loadMore = useCallback(() => {
    const nextPage = filters.page + 1;
    setFilters(prev => ({ ...prev, page: nextPage }));
    searchVoices({ ...filters, page: nextPage }, true);
  }, [filters, searchVoices]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    searchVoices(INITIAL_FILTERS);
  }, [searchVoices]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    voices,
    filters,
    isLoading,
    error,
    hasMore,
    totalCount,
    searchVoices,
    updateFilter,
    loadMore,
    resetFilters,
    setFilters,
  };
}
