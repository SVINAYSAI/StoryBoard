import React, { useState, useEffect } from 'react';

// Layout components
import Sidebar from './components/layout/Sidebar';
import MobileHeader from './components/layout/MobileHeader';

// Feature components
import ResearchUpdates from './components/research/ResearchUpdates';
import ScriptPlanner from './components/planner/ScriptPlanner';
import VoiceSelector from './components/voices/VoiceSelector';
import VoiceOverCreator from './components/studio/VoiceOverCreator';
import StoryboardVisualizer from './components/visuals/StoryboardVisualizer';

// Custom hooks
import useCredits from './hooks/useCredits';
import useVoices from './hooks/useVoices';
import useHistory from './hooks/useHistory';
import useProjects from './hooks/useProjects';
import useScriptState from './hooks/useScriptState';

export default function App() {
  const [activeTab, setActiveTab] = useState('research');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isQuotaExpanded, setIsQuotaExpanded] = useState(false);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { credits, isLoadingCredits, fetchCredits } = useCredits();
  const { voices, isLoadingVoices, voicesError, selectedVoice, setSelectedVoice, fetchVoices } = useVoices();
  const { history, isLoadingHistory, fetchHistory, handleDeleteHistoryItem, handleUpdateHistoryWithNewAudio } = useHistory();
  const {
    projectId, setProjectId, projectName, setProjectName,
    projectsList, showProjectsPanel, setShowProjectsPanel,
    isSavingProject, isLoadingProject,
    fetchProjectsList, handleSaveProject, handleLoadProject,
    handleDeleteProject, handleNewProject,
  } = useProjects();
  const {
    scriptTopic, setScriptTopic, scriptVideoType, setScriptVideoType,
    scriptDuration, setScriptDuration, scriptTone, setScriptTone,
    scriptAudience, setScriptAudience, scriptInstructions, setScriptInstructions,
    scriptResearchContext, setScriptResearchContext,
    scriptOutline, setScriptOutline, scriptSegments, setScriptSegments,
    visualScenes, setVisualScenes,
    activeScript, getScriptTotalCharacters,
    resetScriptState, restoreFromProject, buildProjectData,
  } = useScriptState();

  // ── Build generated audios map ────────────────────────────────────────────
  const generatedAudios = {};
  if (history && activeScript?.segments) {
    for (const h of history) {
      for (const seg of activeScript.segments) {
        if (h.text === seg.text) {
          generatedAudios[seg.id] = h;
          break;
        }
      }
    }
  }

  // ── Initial data fetching ─────────────────────────────────────────────────
  useEffect(() => {
    fetchCredits();
    fetchVoices();
    fetchHistory();
    fetchProjectsList();
  }, []);

  // ── Project handlers ──────────────────────────────────────────────────────
  const onSaveProject = () => {
    const data = buildProjectData(selectedVoice);
    handleSaveProject(data);
  };

  const onLoadProject = async (id) => {
    const project = await handleLoadProject(id);
    if (project && project.data) {
      restoreFromProject(project.data);
      // Restore voice selection
      if (project.data.selectedVoice && voices.length > 0) {
        const match = voices.find(v => v.voice_id === project.data.selectedVoice.voice_id);
        if (match) setSelectedVoice(match);
      }
      fetchHistory();
    }
  };

  const onNewProject = () => {
    handleNewProject();
    resetScriptState();
    setSelectedVoice(voices.length > 0 ? voices.find(v => v.name === 'Rachel') || voices[0] : null);
  };

  // ── Research → Script Topic handler ───────────────────────────────────────
  const handleSelectResearchTopic = (topic, summary) => {
    setScriptTopic(topic);
    setScriptResearchContext(summary);
    setActiveTab('planner');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const scriptCharCount = getScriptTotalCharacters();

  return (
    <div className="h-full flex">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        projectId={projectId}
        projectName={projectName}
        setProjectName={setProjectName}
        isSavingProject={isSavingProject}
        onSaveProject={onSaveProject}
        showProjectsPanel={showProjectsPanel}
        setShowProjectsPanel={setShowProjectsPanel}
        projectsList={projectsList}
        onLoadProject={onLoadProject}
        onDeleteProject={handleDeleteProject}
        onNewProject={onNewProject}
        credits={credits}
        isLoadingCredits={isLoadingCredits}
        fetchCredits={fetchCredits}
        scriptCharCount={scriptCharCount}
        isQuotaExpanded={isQuotaExpanded}
        setIsQuotaExpanded={setIsQuotaExpanded}
      />

      {/* Mobile Header */}
      <MobileHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        credits={credits}
        isLoadingCredits={isLoadingCredits}
        fetchCredits={fetchCredits}
        scriptCharCount={scriptCharCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 bg-canvas transition-colors duration-500">
        <div className="content-breathable">
          {activeTab === 'research' && (
            <div className="animate-fade-in">
              <ResearchUpdates onSelectTopic={handleSelectResearchTopic} />
            </div>
          )}

          {activeTab === 'planner' && (
            <div className="animate-fade-in">
              <ScriptPlanner
                topic={scriptTopic} setTopic={setScriptTopic}
                videoType={scriptVideoType} setVideoType={setScriptVideoType}
                duration={scriptDuration} setDuration={setScriptDuration}
                tone={scriptTone} setTone={setScriptTone}
                audience={scriptAudience} setAudience={setScriptAudience}
                instructions={scriptInstructions} setInstructions={setScriptInstructions}
                researchContext={scriptResearchContext} setResearchContext={setScriptResearchContext}
                outline={scriptOutline} setOutline={setScriptOutline}
                segments={scriptSegments} setSegments={setScriptSegments}
                onProceedToVoiceover={() => setActiveTab('studio')}
              />
            </div>
          )}

          {activeTab === 'library' && (
            <div className="animate-fade-in">
              <VoiceSelector
                selectedVoiceId={selectedVoice?.voice_id}
                onSelectVoice={setSelectedVoice}
                voices={voices}
                isLoading={isLoadingVoices}
                error={voicesError}
              />
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="animate-fade-in">
              <VoiceOverCreator
                activeScript={activeScript}
                selectedVoice={selectedVoice}
                generatedAudios={generatedAudios}
                onUpdateHistoryWithNewAudio={handleUpdateHistoryWithNewAudio}
                history={history}
                isLoadingHistory={isLoadingHistory}
                fetchHistory={fetchHistory}
                onDeleteHistoryItem={(filename) => handleDeleteHistoryItem(filename, fetchCredits)}
                onRefreshCredits={fetchCredits}
                voices={voices}
                onSelectVoice={setSelectedVoice}
                onUpdateSegments={setScriptSegments}
                projectId={projectId}
              />
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="animate-fade-in">
              <StoryboardVisualizer
                activeScript={activeScript}
                visualScenes={visualScenes}
                onUpdateVisualScenes={setVisualScenes}
                onUpdateSegments={setScriptSegments}
                onUpdateScriptTopic={setScriptTopic}
                onTabChange={setActiveTab}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
