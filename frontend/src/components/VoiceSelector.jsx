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
    <div className="space-y-6 page-enter">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
          <User className="w-6 h-6 text-accent-purple" />
          Audition & Select ElevenLabs Voice
        </h2>
        <p className="text-sm text-slate-400">
          Browse ElevenLabs' catalog of professional AI-generated voices, preview individual acoustics, and lock in your narrator.
        </p>
      </div>

      {/* Filter and Search Console */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voices by name..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a0c10]/80 border border-slate-800 focus:border-accent-purple/55 hover:border-slate-700 rounded-xl text-sm focus:outline-none transition-all"
            />
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-semibold">
              <Filter className="w-3.5 h-3.5 text-accent-blue" />
              <span>Filters</span>
            </div>

            {/* Gender filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 text-xs rounded-xl focus:outline-none focus:border-accent-purple text-slate-300"
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
              className="px-3 py-2 bg-slate-900 border border-slate-800 text-xs rounded-xl focus:outline-none focus:border-accent-purple text-slate-300 max-w-[150px]"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 h-[160px] animate-pulse flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                <div className="h-3 bg-slate-800 rounded w-1/2"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 bg-slate-800 rounded-full w-16"></div>
                <div className="h-6 bg-slate-800 rounded-full w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <p className="font-semibold mb-1">Failed to load voice library</p>
          <p className="text-xs text-rose-400/90">{error}</p>
        </div>
      ) : filteredVoices.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-slate-500">
          <p className="font-semibold text-slate-400">No matching voices found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoiceId === voice.voice_id;
            const isPlaying = playingVoiceId === voice.voice_id;
            const labelValues = voice.labels || {};
            
            return (
              <div
                key={voice.voice_id}
                onClick={() => onSelectVoice(voice)}
                className={`glass-panel rounded-2xl p-5 flex flex-col justify-between relative cursor-pointer group transition-all duration-300 ${
                  isSelected 
                    ? 'border-accent-purple/70 ring-1 ring-accent-purple bg-accent-purple/5 neon-glow-purple' 
                    : 'hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                {isSelected && (
                  <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-accent-purple animate-fade-in" />
                )}

                <div className="space-y-3">
                  {/* Voice name and category */}
                  <div>
                    <h3 className="font-display font-semibold text-white group-hover:text-accent-purple transition-colors flex items-center gap-1.5">
                      {voice.name}
                      {voice.category === 'cloned' && (
                        <span className="text-[9px] bg-accent-blue/15 border border-accent-blue/30 text-accent-blue font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                          Clone
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-500 capitalize">{voice.category} Voice</p>
                  </div>

                  {/* Labels chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {labelValues.gender && (
                      <span className="text-[10px] bg-slate-900/80 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full capitalize">
                        {labelValues.gender}
                      </span>
                    )}
                    {labelValues.accent && (
                      <span className="text-[10px] bg-slate-900/80 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full capitalize">
                        {labelValues.accent}
                      </span>
                    )}
                    {labelValues.age && (
                      <span className="text-[10px] bg-slate-900/80 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full capitalize">
                        {labelValues.age}
                      </span>
                    )}
                    {labelValues.use_case && (
                      <span className="text-[10px] bg-slate-900/80 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full capitalize">
                        {labelValues.use_case}
                      </span>
                    )}
                  </div>
                </div>

                {/* Audition / select controls */}
                <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-800/40">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering card selection
                      handlePlayPreview(voice.voice_id, voice.preview_url);
                    }}
                    disabled={!voice.preview_url}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      isPlaying
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                        : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700/85 disabled:opacity-30'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                        <span>Mute</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400 font-medium transition-colors">
                    {isSelected ? 'Selected' : 'Click to select'}
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
