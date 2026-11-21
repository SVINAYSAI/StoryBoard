import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Search, Filter, CheckCircle2, User, ChevronDown, RotateCcw, Star, Loader2, Library, Mic } from 'lucide-react';

// ── Filter option presets ──────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { value: 'all', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutral', label: 'Neutral' },
];

const AGE_OPTIONS = [
  { value: 'all', label: 'All Ages' },
  { value: 'young', label: 'Young' },
  { value: 'middle_aged', label: 'Middle Aged' },
  { value: 'old', label: 'Old' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'professional', label: 'Professional' },
  { value: 'famous', label: 'Famous' },
  { value: 'high_quality', label: 'High Quality' },
];

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'created_date', label: 'Newest' },
  { value: 'usage_character_count_1y', label: 'Most Used' },
  { value: 'cloned_by_count', label: 'Most Cloned' },
];

const ACCENT_OPTIONS = [
  { value: 'all', label: 'All Accents' },
  { value: 'american', label: 'American' },
  { value: 'british', label: 'British' },
  { value: 'australian', label: 'Australian' },
  { value: 'indian', label: 'Indian' },
  { value: 'irish', label: 'Irish' },
  { value: 'african', label: 'African' },
];

const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'All Languages' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'pl', label: 'Polish' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ru', label: 'Russian' },
];

const USE_CASE_OPTIONS = [
  'narration',
  'conversational',
  'characters',
  'news',
  'social_media',
  'meditation',
  'audiobook',
  'gaming',
  'animation',
  'informative',
  'interactive',
];

// ── Styled select dropdown SVG ────────────────────────────────────────────
const SELECT_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238c8376'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

// ── Reusable filter select component ──────────────────────────────────────
function FilterSelect({ value, onChange, options, id }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="studio-input text-xs font-bold px-3 py-2.5 appearance-none bg-no-repeat bg-[right_0.6rem_center] bg-[length:0.85rem] pr-7 min-w-[130px] cursor-pointer hover:border-ink/30 transition-colors"
      style={{ backgroundImage: SELECT_BG }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function VoiceSelector({
  selectedVoiceId,
  onSelectVoice,
  // My Voices (existing)
  voices: myVoices = [],
  isLoading: isLoadingMyVoices,
  error: myVoicesError,
  // Voice Library (new)
  libraryVoices = [],
  libraryFilters = {},
  libraryIsLoading = false,
  libraryError = '',
  libraryHasMore = false,
  onLibraryUpdateFilter,
  onLibraryLoadMore,
  onLibraryReset,
  onLibrarySearch,
}) {
  const [activeTab, setActiveTab] = useState('library');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // My Voices client-side filter state
  const [mySearchTerm, setMySearchTerm] = useState('');
  const [myGenderFilter, setMyGenderFilter] = useState('all');
  const [myAccentFilter, setMyAccentFilter] = useState('all');
  
  // Use case chip selection
  const [selectedUseCases, setSelectedUseCases] = useState([]);

  // Audition player state
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  // Initial search on mount
  useEffect(() => {
    if (onLibrarySearch && libraryVoices.length === 0 && !libraryIsLoading) {
      onLibrarySearch();
    }
  }, []);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handlePlayPreview = (voiceId, previewUrl) => {
    if (!previewUrl) return;

    if (playingVoiceId === voiceId) {
      audioElement.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      
      const audio = new Audio(previewUrl);
      audio.play().catch(err => console.error("Error playing audio preview", err));
      
      setAudioElement(audio);
      setPlayingVoiceId(voiceId);

      audio.onended = () => {
        setPlayingVoiceId(null);
      };
    }
  };

  // Handle use case chip toggle
  const toggleUseCase = (useCase) => {
    const next = selectedUseCases.includes(useCase)
      ? selectedUseCases.filter(u => u !== useCase)
      : [...selectedUseCases, useCase];
    setSelectedUseCases(next);
    if (onLibraryUpdateFilter) {
      onLibraryUpdateFilter('useCases', next.join(','));
    }
  };

  // ── My Voices filtering (client-side) ──────────────────────────────────
  const getMyVoicesFiltersList = () => {
    const genders = new Set();
    const accents = new Set();
    myVoices.forEach(voice => {
      if (voice.labels) {
        if (voice.labels.gender) genders.add(voice.labels.gender.toLowerCase());
        if (voice.labels.accent) accents.add(voice.labels.accent.toLowerCase());
      }
    });
    return {
      genders: ['all', ...Array.from(genders)],
      accents: ['all', ...Array.from(accents)],
    };
  };

  const { genders: myGenders, accents: myAccents } = getMyVoicesFiltersList();

  const filteredMyVoices = myVoices.filter(voice => {
    const nameMatch = voice.name.toLowerCase().includes(mySearchTerm.toLowerCase());
    const gender = voice.labels?.gender?.toLowerCase() || '';
    const accent = voice.labels?.accent?.toLowerCase() || '';
    const genderMatch = myGenderFilter === 'all' || gender === myGenderFilter;
    const accentMatch = myAccentFilter === 'all' || accent === myAccentFilter;
    return nameMatch && genderMatch && accentMatch;
  });

  // ── Voice card renderer ────────────────────────────────────────────────
  const renderVoiceCard = (voice, isLibrary = false) => {
    const voiceId = isLibrary ? voice.voice_id || voice.public_owner_id : voice.voice_id;
    const isSelected = selectedVoiceId === voiceId;
    const isPlaying = playingVoiceId === voiceId;
    const previewUrl = isLibrary ? voice.preview_url : voice.preview_url;
    const labels = isLibrary ? {} : (voice.labels || {});
    const voiceName = voice.name || 'Unknown Voice';
    const category = isLibrary ? voice.category : voice.category;

    return (
      <div
        key={voiceId + (isLibrary ? '-lib' : '')}
        onClick={() => onSelectVoice(voice)}
        className={`studio-card p-5 flex flex-col justify-between relative cursor-pointer group transition-all duration-300 hover:scale-[1.02] ${
          isSelected 
            ? 'border-ink bg-white shadow-xl ring-1 ring-ink/5' 
            : 'bg-white hover:bg-canvas-soft/40'
        }`}
      >
        {isSelected && (
          <div className="absolute top-5 right-5 p-1.5 rounded-full bg-success/10 text-success animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}

        <div className="space-y-3">
          {/* Voice name and category */}
          <div>
            <h3 className="font-black text-lg text-ink group-hover:text-link transition-colors flex items-center gap-2 leading-snug">
              {voiceName}
              {category === 'professional' && (
                <span className="text-[8px] font-black bg-gradient-to-r from-link to-link-deep text-white px-1.5 py-0.5 rounded tracking-widest uppercase">
                  PRO
                </span>
              )}
              {category === 'famous' && (
                <span className="text-[8px] font-black bg-gradient-to-r from-warning to-error text-white px-1.5 py-0.5 rounded tracking-widest uppercase">
                  ★
                </span>
              )}
            </h3>
            {category && (
              <p className="text-[10px] text-mute font-black uppercase tracking-widest mt-0.5">{category}</p>
            )}
          </div>

          {/* Labels / attributes */}
          <div className="flex flex-wrap gap-1.5">
            {/* Library voice attributes */}
            {isLibrary && voice.gender && (
              <span className="text-[9px] font-bold bg-canvas-soft border border-hairline text-body px-2.5 py-0.5 rounded-full capitalize">
                {voice.gender}
              </span>
            )}
            {isLibrary && voice.age && (
              <span className="text-[9px] font-bold bg-canvas-soft border border-hairline text-body px-2.5 py-0.5 rounded-full capitalize">
                {voice.age}
              </span>
            )}
            {isLibrary && voice.accent && (
              <span className="text-[9px] font-bold bg-canvas-soft border border-hairline text-body px-2.5 py-0.5 rounded-full capitalize">
                {voice.accent}
              </span>
            )}
            {isLibrary && voice.language && (
              <span className="text-[9px] font-bold bg-info-soft border border-info/10 text-info px-2.5 py-0.5 rounded-full">
                {voice.language}
              </span>
            )}
            {isLibrary && voice.use_case && (
              <span className="text-[9px] font-bold bg-success-soft border border-success/10 text-success px-2.5 py-0.5 rounded-full capitalize">
                {voice.use_case}
              </span>
            )}

            {/* My Voices labels */}
            {!isLibrary && labels.gender && (
              <span className="text-[9px] font-bold bg-canvas-soft border border-hairline text-body px-2.5 py-0.5 rounded-full capitalize">
                {labels.gender}
              </span>
            )}
            {!isLibrary && labels.accent && (
              <span className="text-[9px] font-bold bg-canvas-soft border border-hairline text-body px-2.5 py-0.5 rounded-full capitalize">
                {labels.accent}
              </span>
            )}
            {!isLibrary && labels.age && (
              <span className="text-[9px] font-bold bg-canvas-soft border border-hairline text-body px-2.5 py-0.5 rounded-full capitalize">
                {labels.age}
              </span>
            )}
          </div>

          {/* Description (library voices) */}
          {isLibrary && voice.description && (
            <p className="text-[11px] text-mute leading-relaxed line-clamp-2">
              {voice.description}
            </p>
          )}

          {/* Stats (library voices) */}
          {isLibrary && (voice.cloned_by_count > 0 || voice.usage_character_count_1y > 0) && (
            <div className="flex gap-3 text-[9px] text-mute font-medium">
              {voice.cloned_by_count > 0 && (
                <span>{voice.cloned_by_count.toLocaleString()} clones</span>
              )}
              {voice.usage_character_count_1y > 0 && (
                <span>{(voice.usage_character_count_1y / 1000).toFixed(0)}K chars/yr</span>
              )}
            </div>
          )}
        </div>

        {/* Audition / select controls */}
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-hairline">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPreview(voiceId, previewUrl);
            }}
            disabled={!previewUrl}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-full border transition-all ${
              isPlaying
                ? 'bg-error text-white border-error shadow-lg shadow-error/10'
                : 'bg-white border-hairline text-body hover:text-ink hover:border-ink disabled:opacity-30'
            }`}
          >
            {isPlaying ? (
              <>
                <VolumeX className="w-3 h-3" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3" />
                <span>Preview</span>
              </>
            )}
          </button>

          <span className="text-label group-hover:text-ink transition-colors">
            {isSelected ? 'Active' : 'Select'}
          </span>
        </div>
      </div>
    );
  };

  // ── Render Loading Skeleton ────────────────────────────────────────────
  const renderSkeleton = (count = 6) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="studio-card p-5 h-[200px] animate-pulse flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-5 bg-canvas-soft-2 rounded-lg w-2/5"></div>
            <div className="h-3 bg-canvas-soft-2 rounded-lg w-1/3"></div>
            <div className="flex gap-1.5">
              <div className="h-5 bg-canvas-soft-2 rounded-full w-14"></div>
              <div className="h-5 bg-canvas-soft-2 rounded-full w-14"></div>
            </div>
          </div>
          <div className="h-8 bg-canvas-soft-2 rounded-full w-20 mt-4"></div>
        </div>
      ))}
    </div>
  );

  // ── Count active filters ──────────────────────────────────────────────
  const activeFilterCount = [
    libraryFilters.gender !== 'all' && libraryFilters.gender,
    libraryFilters.age !== 'all' && libraryFilters.age,
    libraryFilters.accent !== 'all' && libraryFilters.accent,
    libraryFilters.language !== 'all' && libraryFilters.language,
    libraryFilters.category !== 'all' && libraryFilters.category,
    libraryFilters.featured,
    selectedUseCases.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-bold font-sans text-ink flex items-center gap-3">
          <div className="p-2 rounded-xl bg-link-soft text-link-deep">
            <User className="w-7 h-7" />
          </div>
          Voice Library
        </h2>
        <p className="text-sm text-body max-w-lg">
          Browse ElevenLabs' catalog of professional AI-generated voices. Preview individual acoustics and lock in your narrator.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-canvas-soft rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'library'
              ? 'bg-white text-ink shadow-sm'
              : 'text-mute hover:text-body'
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          Voice Library
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'my'
              ? 'bg-white text-ink shadow-sm'
              : 'text-mute hover:text-body'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          My Voices
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VOICE LIBRARY TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'library' && (
        <div className="space-y-5">
          {/* Primary filter bar */}
          <div className="studio-card p-5 space-y-4 bg-canvas-soft/30">
            {/* Row 1: Search + Sort */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                <input
                  id="voice-library-search"
                  type="text"
                  value={libraryFilters.search || ''}
                  onChange={(e) => onLibraryUpdateFilter('search', e.target.value)}
                  placeholder="Search voices by name, description..."
                  className="w-full pl-10 pr-4 py-2.5 studio-input text-sm"
                />
              </div>

              <div className="flex gap-3 items-center">
                <FilterSelect
                  id="voice-library-sort"
                  value={libraryFilters.sort || 'trending'}
                  onChange={(val) => onLibraryUpdateFilter('sort', val)}
                  options={SORT_OPTIONS}
                />
              </div>
            </div>

            {/* Row 2: Quick filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-1.5 text-label text-ink mr-1">
                <Filter className="w-3 h-3 text-link" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-link text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              <FilterSelect
                id="voice-library-gender"
                value={libraryFilters.gender || 'all'}
                onChange={(val) => onLibraryUpdateFilter('gender', val)}
                options={GENDER_OPTIONS}
              />
              <FilterSelect
                id="voice-library-age"
                value={libraryFilters.age || 'all'}
                onChange={(val) => onLibraryUpdateFilter('age', val)}
                options={AGE_OPTIONS}
              />
              <FilterSelect
                id="voice-library-accent"
                value={libraryFilters.accent || 'all'}
                onChange={(val) => onLibraryUpdateFilter('accent', val)}
                options={ACCENT_OPTIONS}
              />
              <FilterSelect
                id="voice-library-language"
                value={libraryFilters.language || 'all'}
                onChange={(val) => onLibraryUpdateFilter('language', val)}
                options={LANGUAGE_OPTIONS}
              />
              <FilterSelect
                id="voice-library-category"
                value={libraryFilters.category || 'all'}
                onChange={(val) => onLibraryUpdateFilter('category', val)}
                options={CATEGORY_OPTIONS}
              />

              {/* Featured toggle */}
              <button
                id="voice-library-featured-toggle"
                onClick={() => onLibraryUpdateFilter('featured', !libraryFilters.featured)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-md border transition-all ${
                  libraryFilters.featured
                    ? 'bg-warning-soft border-warning/20 text-warning'
                    : 'bg-white border-hairline text-mute hover:text-body hover:border-hairline-strong'
                }`}
              >
                <Star className={`w-3 h-3 ${libraryFilters.featured ? 'fill-warning' : ''}`} />
                Featured
              </button>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-1 text-[11px] font-bold text-link hover:text-link-deep transition-colors ml-auto"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                {showAdvancedFilters ? 'Less' : 'More Filters'}
              </button>
            </div>

            {/* Advanced filters (collapsible) */}
            {showAdvancedFilters && (
              <div className="space-y-3 pt-3 border-t border-hairline animate-fade-in">
                {/* Use Cases chips */}
                <div>
                  <p className="text-label mb-2">Use Cases</p>
                  <div className="flex flex-wrap gap-1.5">
                    {USE_CASE_OPTIONS.map(uc => (
                      <button
                        key={uc}
                        onClick={() => toggleUseCase(uc)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${
                          selectedUseCases.includes(uc)
                            ? 'bg-ink text-white border-ink'
                            : 'bg-white border-hairline text-body hover:border-ink/30'
                        }`}
                      >
                        {uc.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descriptives free text */}
                <div>
                  <p className="text-label mb-2">Descriptive Tags</p>
                  <input
                    id="voice-library-descriptives"
                    type="text"
                    value={libraryFilters.descriptives || ''}
                    onChange={(e) => onLibraryUpdateFilter('descriptives', e.target.value)}
                    placeholder="e.g. warm, deep, raspy (comma-separated)"
                    className="w-full md:w-96 studio-input text-xs"
                  />
                </div>
              </div>
            )}

            {/* Active filter count & reset */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedUseCases([]);
                    onLibraryReset();
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-error hover:text-error/80 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Results grid */}
          {libraryIsLoading && libraryVoices.length === 0 ? (
            renderSkeleton()
          ) : libraryError ? (
            <div className="p-8 rounded-2xl bg-error-soft border border-error/10 text-error text-sm font-medium">
              <p className="font-bold mb-1 flex items-center gap-2">
                <VolumeX className="w-5 h-5" />
                Library Connection Error
              </p>
              <p className="opacity-80">{libraryError}</p>
            </div>
          ) : libraryVoices.length === 0 ? (
            <div className="studio-card p-16 text-center flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-full bg-canvas-soft flex items-center justify-center shadow-inner">
                <Search className="w-8 h-8 text-mute/30" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-ink text-lg">No voices found</p>
                <p className="text-sm text-body">Try adjusting your filters or search terms.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Results count */}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-mute font-medium">
                  Showing <span className="text-ink font-bold">{libraryVoices.length}</span> voices
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {libraryVoices.map(voice => renderVoiceCard(voice, true))}
              </div>

              {/* Load more / pagination */}
              {libraryHasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={onLibraryLoadMore}
                    disabled={libraryIsLoading}
                    className="studio-button-primary text-sm disabled:opacity-50 disabled:transform-none"
                  >
                    {libraryIsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Voices'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MY VOICES TAB                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my' && (
        <div className="space-y-5">
          {/* Filter bar for My Voices */}
          <div className="studio-card p-5 bg-canvas-soft/30">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                <input
                  id="my-voices-search"
                  type="text"
                  value={mySearchTerm}
                  onChange={(e) => setMySearchTerm(e.target.value)}
                  placeholder="Search your voices..."
                  className="w-full pl-10 pr-4 py-2.5 studio-input text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-1.5 text-label text-ink">
                  <Filter className="w-3 h-3 text-link" />
                  <span>Filters</span>
                </div>

                <select
                  id="my-voices-gender"
                  value={myGenderFilter}
                  onChange={(e) => setMyGenderFilter(e.target.value)}
                  className="studio-input text-xs font-bold px-3 py-2.5 appearance-none bg-no-repeat bg-[right_0.6rem_center] bg-[length:0.85rem] pr-7 min-w-[130px]"
                  style={{ backgroundImage: SELECT_BG }}
                >
                  <option value="all">All Genders</option>
                  {myGenders.filter(g => g !== 'all').map(g => (
                    <option key={g} value={g} className="capitalize">{g}</option>
                  ))}
                </select>

                <select
                  id="my-voices-accent"
                  value={myAccentFilter}
                  onChange={(e) => setMyAccentFilter(e.target.value)}
                  className="studio-input text-xs font-bold px-3 py-2.5 appearance-none bg-no-repeat bg-[right_0.6rem_center] bg-[length:0.85rem] pr-7 min-w-[130px]"
                  style={{ backgroundImage: SELECT_BG }}
                >
                  <option value="all">All Accents</option>
                  {myAccents.filter(a => a !== 'all').map(a => (
                    <option key={a} value={a} className="capitalize">{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* My Voices grid */}
          {isLoadingMyVoices ? (
            renderSkeleton()
          ) : myVoicesError ? (
            <div className="p-8 rounded-2xl bg-error-soft border border-error/10 text-error text-sm font-medium">
              <p className="font-bold mb-1 flex items-center gap-2">
                <VolumeX className="w-5 h-5" />
                Connection Error
              </p>
              <p className="opacity-80">{myVoicesError}</p>
            </div>
          ) : filteredMyVoices.length === 0 ? (
            <div className="studio-card p-16 text-center flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-full bg-canvas-soft flex items-center justify-center shadow-inner">
                <Search className="w-8 h-8 text-mute/30" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-ink text-lg">No voices found</p>
                <p className="text-sm text-body">Try adjusting your filters or keywords.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-mute font-medium">
                Showing <span className="text-ink font-bold">{filteredMyVoices.length}</span> of {myVoices.length} voices
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMyVoices.map(voice => renderVoiceCard(voice, false))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
