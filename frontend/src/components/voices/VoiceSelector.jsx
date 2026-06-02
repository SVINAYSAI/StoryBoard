import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Search, Sparkles, Filter, CheckCircle2, User } from 'lucide-react';

export default function VoiceSelector({ selectedVoiceId, onSelectVoice, voices = [], isLoading, error }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [accentFilter, setAccentFilter] = useState('all');
  
  // Audition player state
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

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
      // Pause if already playing
      audioElement.pause();
      setPlayingVoiceId(null);
    } else {
      // Stop previous
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

  // Extract filters dynamically from voices list
  const getFiltersList = () => {
    const genders = new Set();
    const accents = new Set();

    voices.forEach(voice => {
      if (voice.labels) {
        if (voice.labels.gender) genders.add(voice.labels.gender.toLowerCase());
        if (voice.labels.accent) accents.add(voice.labels.accent.toLowerCase());
      }
    });

    return {
      genders: ['all', ...Array.from(genders)],
      accents: ['all', ...Array.from(accents)]
    };
  };

  const { genders, accents } = getFiltersList();

  // Filter logic
  const filteredVoices = voices.filter(voice => {
    const nameMatch = voice.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Label checks
    const gender = voice.labels?.gender?.toLowerCase() || '';
    const accent = voice.labels?.accent?.toLowerCase() || '';
    
    const genderMatch = genderFilter === 'all' || gender === genderFilter;
    const accentMatch = accentFilter === 'all' || accent === accentFilter;

    return nameMatch && genderMatch && accentMatch;
  });

  return (
    <div className="space-y-8 animate-slide-up">
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

      {/* Filter and Search Console */}
      <div className="studio-card p-6 space-y-6 bg-canvas-soft/50">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voices by name..."
              className="w-full pl-12 pr-4 py-3 studio-input text-base"
            />
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
            <div className="flex items-center gap-2 text-label text-ink">
              <Filter className="w-3.5 h-3.5 text-link" />
              <span>Filters</span>
            </div>

            {/* Gender filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="studio-input text-xs font-bold px-4 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
            >
              <option value="all">All Genders</option>
              {genders.filter(g => g !== 'all').map(g => (
                <option key={g} value={g} className="capitalize">{g}</option>
              ))}
            </select>

            {/* Accent filter */}
            <select
              value={accentFilter}
              onChange={(e) => setAccentFilter(e.target.value)}
              className="studio-input text-xs font-bold px-4 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
            >
              <option value="all">All Accents</option>
              {accents.filter(a => a !== 'all').map(a => (
                <option key={a} value={a} className="capitalize">{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Catalog view */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="studio-card p-6 h-[200px] animate-pulse flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-6 bg-canvas-soft-2 rounded-lg w-1/3"></div>
                <div className="h-4 bg-canvas-soft-2 rounded-lg w-1/2"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 bg-canvas-soft-2 rounded-full w-20"></div>
                <div className="h-6 bg-canvas-soft-2 rounded-full w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-error-soft border border-error/10 text-error-deep text-sm font-medium animate-shake">
          <p className="font-bold mb-1 flex items-center gap-2">
            <VolumeX className="w-5 h-5" />
            Library Connection Error
          </p>
          <p className="opacity-80">{error}</p>
        </div>
      ) : filteredVoices.length === 0 ? (
        <div className="studio-card p-20 text-center flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full bg-canvas-soft flex items-center justify-center shadow-inner">
             <Search className="w-10 h-10 text-mute/30" />
          </div>
          <div className="space-y-1">
             <p className="font-bold text-ink text-xl">No narrators found</p>
             <p className="text-sm text-body">Try adjusting your filters or keywords.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoiceId === voice.voice_id;
            const isPlaying = playingVoiceId === voice.voice_id;
            const labelValues = voice.labels || {};
            
            return (
              <div
                key={voice.voice_id}
                onClick={() => onSelectVoice(voice)}
                className={`studio-card p-6 flex flex-col justify-between relative cursor-pointer group transition-all duration-300 hover:scale-[1.02] ${
                  isSelected 
                    ? 'border-ink bg-white shadow-xl ring-1 ring-ink/5' 
                    : 'bg-white hover:bg-canvas-soft/40'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-6 right-6 p-1.5 rounded-full bg-success/10 text-success animate-fade-in">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}

                <div className="space-y-4">
                  {/* Voice name and category */}
                  <div>
                    <h3 className="font-black text-xl text-ink group-hover:text-primary transition-colors flex items-center gap-2">
                      {voice.name}
                      {voice.category === 'cloned' && (
                        <span className="text-[9px] font-black bg-ink text-white px-1.5 py-0.5 rounded tracking-widest uppercase scale-90">
                          PRO
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-mute font-black uppercase tracking-widest">{voice.category} Series</p>
                  </div>

                  {/* Labels chips */}
                  <div className="flex flex-wrap gap-2">
                    {labelValues.gender && (
                      <span className="text-[10px] font-bold bg-canvas-soft border border-hairline text-body px-3 py-1 rounded-full capitalize">
                        {labelValues.gender}
                      </span>
                    )}
                    {labelValues.accent && (
                      <span className="text-[10px] font-bold bg-canvas-soft border border-hairline text-body px-3 py-1 rounded-full capitalize">
                        {labelValues.accent}
                      </span>
                    )}
                    {labelValues.age && (
                      <span className="text-[10px] font-bold bg-canvas-soft border border-hairline text-body px-3 py-1 rounded-full capitalize">
                        {labelValues.age}
                      </span>
                    )}
                  </div>
                </div>

                {/* Audition / select controls */}
                <div className="flex justify-between items-center mt-8 pt-5 border-t border-hairline">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering card selection
                      handlePlayPreview(voice.voice_id, voice.preview_url);
                    }}
                    disabled={!voice.preview_url}
                    className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                      isPlaying
                        ? 'bg-error text-white border-error shadow-lg shadow-error/10'
                        : 'bg-white border-hairline text-body hover:text-ink hover:border-ink disabled:opacity-30'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Mute</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Sample</span>
                      </>
                    )}
                  </button>

                  <span className="text-label group-hover:text-ink transition-colors">
                    {isSelected ? 'Narrator Active' : 'Select Narrator'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
