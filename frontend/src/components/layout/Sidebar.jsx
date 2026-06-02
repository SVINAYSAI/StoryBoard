/**
 * Sidebar component — desktop navigation, project controls, and credit monitor.
 * Extracted from App.jsx lines 328-496.
 */

import React from 'react';
import {
  Search, FileText, User, Volume2, Sparkles, 
  ChevronLeft, ChevronRight, Save, FolderOpen, 
  Trash2, ChevronUp, ChevronDown, Cpu
} from 'lucide-react';
import CreditStatus from './CreditStatus';

const ICON_MAP = { Search, FileText, User, Volume2, Sparkles };

const MENU_ITEMS = [
  { id: 'research', name: 'AI Research', icon: 'Search', desc: 'Google search grounding' },
  { id: 'planner', name: 'Script Planner', icon: 'FileText', desc: 'Storyboard outline builder' },
  { id: 'library', name: 'Voice Library', icon: 'User', desc: 'Audition ElevenLabs actors' },
  { id: 'studio', name: 'Voiceover Studio', icon: 'Volume2', desc: 'Generate & play audios' },
  { id: 'visuals', name: 'Storyboard Visuals', icon: 'Sparkles', desc: 'Generate images & videos' },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  // Project props
  projectId,
  projectName,
  setProjectName,
  isSavingProject,
  onSaveProject,
  showProjectsPanel,
  setShowProjectsPanel,
  projectsList,
  onLoadProject,
  onDeleteProject,
  onNewProject,
  // Credit props
  credits,
  isLoadingCredits,
  fetchCredits,
  scriptCharCount,
  isQuotaExpanded,
  setIsQuotaExpanded,
}) {
  return (
    <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-80'} bg-canvas-soft border-r border-hairline shrink-0 select-none transition-all duration-300 relative`}>
      {/* Collapse toggle button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute top-7 -right-3.5 w-7 h-7 rounded-full bg-white hover:bg-canvas-soft text-body hover:text-ink border border-hairline flex items-center justify-center shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 z-40"
      >
        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Brand header */}
      <div className={`p-8 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3 relative`}>
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-ink flex items-center justify-center shadow-xl shrink-0 group hover:scale-105 transition-transform">
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="animate-fade-in whitespace-nowrap">
              <h1 className="font-sans font-black text-lg tracking-tight leading-tight text-ink">Production</h1>
              <span className="text-[10px] text-mute uppercase tracking-[0.2em] font-black">Studio Elite</span>
            </div>
          )}
        </div>
      </div>

      {/* Project controls */}
      {!isSidebarCollapsed && (
        <div className="px-6 py-4 mx-4 mb-4 bg-white rounded-2xl border border-hairline shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={projectId ? 'Project name...' : 'New project...'}
              className="flex-1 px-0 py-1 bg-transparent border-none text-xs font-bold focus:outline-none transition-colors text-ink placeholder:text-mute"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={onSaveProject}
                disabled={isSavingProject}
                className="p-1.5 rounded-lg hover:bg-canvas-soft text-mute hover:text-ink transition-all disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${isSavingProject ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={() => setShowProjectsPanel(!showProjectsPanel)}
                className={`p-1.5 rounded-lg transition-all ${
                  showProjectsPanel ? 'bg-ink text-white' : 'hover:bg-canvas-soft text-mute hover:text-ink'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {showProjectsPanel && (
            <div className="space-y-1 pt-2 border-t border-hairline max-h-[160px] overflow-y-auto custom-scrollbar">
              {projectsList.length > 0 ? projectsList.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onLoadProject(p.id)}
                  className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group ${
                    projectId === p.id ? 'bg-canvas-soft text-ink' : 'hover:bg-canvas-soft/50 text-mute hover:text-body'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="text-[11px] font-bold truncate block">{p.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }} className="p-1 opacity-0 group-hover:opacity-100 text-mute hover:text-error">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )) : (
                <p className="text-[10px] text-mute italic text-center py-2">No projects</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sidebar Nav links */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        {MENU_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0 py-4' : 'px-4 py-4'} rounded-xl transition-all text-left group relative ${
                isActive 
                  ? 'bg-white shadow-md text-ink font-bold border border-hairline' 
                  : 'text-mute hover:text-ink hover:bg-white/40'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-ink' : 'text-mute/60 group-hover:text-ink'}`} />
              {!isSidebarCollapsed && (
                <div className="animate-fade-in pl-4">
                  <span className="block text-xs uppercase tracking-widest font-bold">{item.name}</span>
                </div>
              )}
              {isActive && !isSidebarCollapsed && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-violet animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Credit monitor panel */}
      <div className="px-4 py-6 border-t border-hairline">
        {!isSidebarCollapsed ? (
          <div className="bg-white rounded-2xl p-5 border border-hairline shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-link" />
                <span className="text-[10px] font-black uppercase tracking-widest text-ink">Engine Credits</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${(credits?.remaining - scriptCharCount < 0) ? 'bg-error animate-pulse' : 'bg-success'}`} />
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-mute uppercase font-black tracking-widest">Remaining</span>
                  <span className="text-[10px] font-black text-ink">{credits?.remaining?.toLocaleString() || 0}</span>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-[8px] text-mute uppercase font-black tracking-widest">Used</span>
                  <span className="text-[10px] font-black text-body">{credits?.character_count?.toLocaleString() || 0}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="h-1.5 bg-canvas-soft rounded-full overflow-hidden border border-hairline shadow-inner">
                  <div 
                    className="h-full bg-ink transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (credits?.character_count / credits?.character_limit) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[8px] text-mute font-bold uppercase tracking-tighter">
                  <span>Usage Rate</span>
                  <span>{credits?.character_limit?.toLocaleString() || 0} Total Cap</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
             <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${(credits?.remaining - scriptCharCount < 0) ? 'bg-error animate-pulse' : 'bg-success'}`} />
          </div>
        )}
      </div>
    </aside>
  );
}
