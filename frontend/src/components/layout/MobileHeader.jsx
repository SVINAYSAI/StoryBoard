/**
 * Mobile header and navigation overlay.
 * Extracted from App.jsx lines 498-551.
 */

import React from 'react';
import { Search, FileText, User, Volume2, Sparkles, Menu, X } from 'lucide-react';
import CreditStatus from './CreditStatus';

const ICON_MAP = { Search, FileText, User, Volume2, Sparkles };

const MENU_ITEMS = [
  { id: 'research', name: 'AI Research', icon: 'Search', desc: 'Google search grounding' },
  { id: 'planner', name: 'Script Planner', icon: 'FileText', desc: 'Storyboard outline builder' },
  { id: 'library', name: 'Voice Library', icon: 'User', desc: 'Audition ElevenLabs actors' },
  { id: 'studio', name: 'Voiceover Studio', icon: 'Volume2', desc: 'Generate & play audios' },
  { id: 'visuals', name: 'Storyboard Visuals', icon: 'Sparkles', desc: 'Generate images & videos' },
];

export default function MobileHeader({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  credits,
  isLoadingCredits,
  fetchCredits,
  scriptCharCount,
}) {
  return (
    <>
      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[rgba(255,255,255,0.9)] backdrop-blur-[16px] border-b border-hairline flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Volume2 className="w-4.5 h-4.5 text-on-primary" />
          </div>
          <span className="font-sans font-bold text-ink text-sm">Production Studio</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-sm bg-canvas border border-hairline text-body hover:text-ink"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE NAVIGATION SIDEBAR OVERLAY */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-canvas border-b border-hairline z-45 flex flex-col p-4 space-y-6 overflow-y-auto page-enter">
          <div className="space-y-2">
            {MENU_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                    isActive ? 'bg-canvas-soft-2 border border-hairline-strong text-ink font-semibold' : 'text-body bg-canvas border border-transparent hover:bg-canvas-soft-2/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-mute'}`} />
                  <div>
                    <span className="block text-sm">{item.name}</span>
                    <span className="block text-[10px] text-mute">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-hairline pt-4">
            <CreditStatus 
              credits={credits} 
              isLoading={isLoadingCredits} 
              fetchCredits={fetchCredits}
              scriptCharCount={scriptCharCount}
            />
          </div>
        </div>
      )}
    </>
  );
}
