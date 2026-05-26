import React, { useState, useEffect } from 'react';
import { Search, FileText, User, Volume2, Sparkles, Menu, X, Cpu, ChevronLeft, ChevronRight } from 'lucide-react';
import CreditStatus from './components/CreditStatus';
import ResearchUpdates from './components/ResearchUpdates';
import ScriptPlanner from './components/ScriptPlanner';
import VoiceSelector from './components/VoiceSelector';
import VoiceOverCreator from './components/VoiceOverCreator';

export default function App() {
  const [activeTab, setActiveTab] = useState('research');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Shared Global States
  const [credits, setCredits] = useState(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState('');

  const [voices, setVoices] = useState([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Script Planner lifted states to persist across tabs
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptVideoType, setScriptVideoType] = useState('short');
  const [scriptDuration, setScriptDuration] = useState(30);
  const [scriptTone, setScriptTone] = useState('Professional');
  const [scriptAudience, setScriptAudience] = useState('Tech enthusiasts');
  const [scriptInstructions, setScriptInstructions] = useState('');
  const [scriptResearchContext, setScriptResearchContext] = useState('');
  const [scriptOutline, setScriptOutline] = useState('');
  const [scriptSegments, setScriptSegments] = useState([]);

  // Compute activeScript on render
  const activeScript = {
    topic: scriptTopic,
    outline: scriptOutline,
    segments: scriptSegments
  };

  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Compute generatedAudios dynamically from activeScript segments and local history cache
  const generatedAudios = {};
  if (scriptSegments && scriptSegments.length > 0 && history && history.length > 0) {
    scriptSegments.forEach(seg => {
      // Match by exact trimmed narration text, finding the newest one (history is sorted newest first)
      const matchingHistory = history.find(h => h.text.trim() === seg.text.trim());
      if (matchingHistory) {
        generatedAudios[seg.id] = matchingHistory;
      }
    });
  }

  // Fetch Credits
  const fetchCredits = async () => {
    setIsLoadingCredits(true);
    setCreditsError('');
    try {
      const response = await fetch('/api/credits');
      if (!response.ok) {
        throw new Error('Could not retrieve ElevenLabs subscription credits.');
      }
      const data = await response.json();
      setCredits(data);
    } catch (err) {
      setCreditsError(err.message || 'Error fetching credits.');
    } finally {
      setIsLoadingCredits(false);
    }
  };

  // Fetch Voices
  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    setVoicesError('');
    try {
      const response = await fetch('/api/voices');
      if (!response.ok) {
        throw new Error('Failed to load ElevenLabs voices catalog.');
      }
      const data = await response.json();
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

  // Fetch History (Audio Cache)
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Could not list cached audio history.');
      }
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      setHistoryError(err.message || 'Error loading history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete history item
  const handleDeleteHistoryItem = async (filename) => {
    try {
      const response = await fetch(`/api/history/${filename}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Deletion failed.');
      }
      
      // Refresh local lists
      fetchHistory();
      fetchCredits();
    } catch (err) {
      console.error(err);
    }
  };

  // Run initial retrievals
  useEffect(() => {
    fetchCredits();
    fetchVoices();
    fetchHistory();
  }, []);

  // Update generated audio state helper by prepending to history list
  const handleUpdateHistoryWithNewAudio = (audioMeta) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== audioMeta.id);
      return [audioMeta, ...filtered];
    });
  };

  // Navigate to Script Outline Planner and pass the research subject and summary context
  const handleSelectTopicForScript = (topic, summary) => {
    setScriptTopic(topic);
    setScriptResearchContext(summary || '');
    setActiveTab('planner');
  };

  // Save changes to script segments made by the user
  const handleScriptUpdate = (newSegments) => {
    setScriptSegments(newSegments);
  };

  // Proceed to studio after outlining script
  const handleProceedToVoiceover = (scriptData) => {
    setScriptTopic(scriptData.topic);
    setScriptOutline(scriptData.outline);
    setScriptSegments(scriptData.segments);
    setActiveTab('studio');
  };

  // Estimate total characters of active script
  const getScriptTotalCharacters = () => {
    if (!activeScript?.segments) return 0;
    return activeScript.segments.reduce((sum, seg) => sum + (seg.text?.length || 0), 0);
  };

  const menuItems = [
    { id: 'research', name: 'AI Research', icon: Search, desc: 'Google search grounding' },
    { id: 'planner', name: 'Script Planner', icon: FileText, desc: 'Storyboard outline builder' },
    { id: 'library', name: 'Voice Library', icon: User, desc: 'Audition ElevenLabs actors' },
    { id: 'studio', name: 'Voiceover Studio', icon: Volume2, desc: 'Generate & play audios' }
  ];

  return (
    <div className="flex h-screen bg-[#080a0f] overflow-hidden text-slate-100 font-sans">
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-80'} bg-[#0b0d16] border-r border-slate-900 shrink-0 select-none transition-all duration-300 relative`}>
        {/* Collapse toggle button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-7 -right-3.5 w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 z-40"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Brand header */}
        <div className={`p-6 border-b border-slate-900 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3 relative`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shadow-lg shadow-accent-purple/20 shrink-0">
              <Volume2 className="w-5.5 h-5.5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-fade-in whitespace-nowrap">
                <h1 className="font-display font-bold text-lg leading-tight text-white">Production Studio</h1>
                <span className="text-[10px] text-accent-purple uppercase tracking-wider font-semibold">Gemini + ElevenLabs</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'} rounded-xl transition-all text-left group ${
                  isActive 
                    ? 'bg-accent-purple/10 border border-accent-purple/25 text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                }`}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-accent-purple' : 'text-slate-500 group-hover:text-slate-450'} shrink-0`} />
                {!isSidebarCollapsed && (
                  <div className="animate-fade-in overflow-hidden whitespace-nowrap pl-3.5">
                    <span className="block font-semibold text-sm leading-normal">{item.name}</span>
                    <span className="block text-[10px] text-slate-500 group-hover:text-slate-450">{item.desc}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Credit monitor panel locked to sidebar bottom */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/20">
          <CreditStatus 
            credits={credits} 
            isLoading={isLoadingCredits} 
            fetchCredits={fetchCredits}
            scriptCharCount={getScriptTotalCharacters()}
            isCollapsed={isSidebarCollapsed}
          />
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0b0d16] border-b border-slate-900 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center">
            <Volume2 className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display font-bold text-white text-sm">Production Studio</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE NAVIGATION SIDEBAR OVERLAY */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-[#080a0f] z-45 flex flex-col p-4 space-y-6 overflow-y-auto page-enter">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                    isActive ? 'bg-accent-purple/10 border border-accent-purple/20 text-white' : 'text-slate-400 bg-slate-950/20 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-accent-purple' : 'text-slate-500'}`} />
                  <div>
                    <span className="block font-semibold text-sm">{item.name}</span>
                    <span className="block text-[10px] text-slate-500">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            <CreditStatus 
              credits={credits} 
              isLoading={isLoadingCredits} 
              fetchCredits={fetchCredits}
              scriptCharCount={getScriptTotalCharacters()}
            />
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pt-16 lg:pt-0">
        <div className="flex-1 overflow-y-auto px-6 py-8 md:p-8 max-w-6xl w-full mx-auto">
          <div className={activeTab === 'research' ? 'block' : 'hidden'}>
            <ResearchUpdates onSelectTopic={handleSelectTopicForScript} />
          </div>

          <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
            <ScriptPlanner 
              topic={scriptTopic}
              setTopic={setScriptTopic}
              videoType={scriptVideoType}
              setVideoType={setScriptVideoType}
              duration={scriptDuration}
              setDuration={setScriptDuration}
              tone={scriptTone}
              setTone={setScriptTone}
              audience={scriptAudience}
              setAudience={setScriptAudience}
              instructions={scriptInstructions}
              setInstructions={setScriptInstructions}
              researchContext={scriptResearchContext}
              setResearchContext={setScriptResearchContext}
              outline={scriptOutline}
              setOutline={setScriptOutline}
              segments={scriptSegments}
              setSegments={setScriptSegments}
              onProceedToVoiceover={handleProceedToVoiceover}
            />
          </div>

          <div className={activeTab === 'library' ? 'block' : 'hidden'}>
            <VoiceSelector 
              selectedVoiceId={selectedVoice?.voice_id} 
              onSelectVoice={setSelectedVoice} 
              voices={voices}
              isLoading={isLoadingVoices}
              error={voicesError}
            />
          </div>

          <div className={activeTab === 'studio' ? 'block' : 'hidden'}>
            <VoiceOverCreator 
              activeScript={activeScript}
              selectedVoice={selectedVoice}
              generatedAudios={generatedAudios}
              onUpdateHistoryWithNewAudio={handleUpdateHistoryWithNewAudio}
              history={history}
              isLoadingHistory={isLoadingHistory}
              fetchHistory={fetchHistory}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onRefreshCredits={fetchCredits}
              voices={voices}
              onSelectVoice={setSelectedVoice}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
