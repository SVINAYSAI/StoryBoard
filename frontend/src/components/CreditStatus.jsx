import React from 'react';
import { AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function CreditStatus({ credits, isLoading, fetchCredits, scriptCharCount = 0, isCollapsed }) {
  const remaining = credits?.remaining ?? 0;
  const limit = credits?.character_limit ?? 1; // Avoid divide by zero
  const used = credits?.character_count ?? 0;
  const percentRemaining = Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));

  // SVG parameters for radial gauge
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentRemaining / 100) * circumference;

  // Usage Forecast calculations
  const projectedRemaining = remaining - scriptCharCount;
  const isOverLimit = projectedRemaining < 0;

  if (isCollapsed) {
    return (
      <div 
        onClick={fetchCredits}
        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/20 hover:bg-slate-900/40 border border-slate-900 cursor-pointer transition-all duration-300 relative group"
        title={`ElevenLabs Credits: ${percentRemaining}% remaining (${remaining.toLocaleString()} left)`}
      >
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="w-10 h-10 transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              className="stroke-slate-800/80 fill-none"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              className="stroke-accent-purple fill-none transition-all duration-500 ease-out"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 - (percentRemaining / 100) * 2 * Math.PI * 16}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[8px] font-bold text-white select-none">{percentRemaining}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:border-accent-purple/30 neon-glow-purple">
      {/* Background ambient light */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent-purple/10 rounded-full blur-2xl"></div>

      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <h3 className="font-display font-semibold text-sm text-white">ElevenLabs Credits</h3>
          <p className="text-[10px] text-slate-400">Status: <span className="text-emerald-400 capitalize font-medium">{credits?.status || 'Active'}</span></p>
        </div>
        <button
          onClick={fetchCredits}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          title="Refresh limits"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 relative z-10">
        {/* Radial gauge */}
        <div className="relative flex items-center justify-center w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-slate-800/80 fill-none"
              strokeWidth="5.5"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-accent-purple fill-none transition-all duration-500 ease-out"
              strokeWidth="5.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-bold text-lg text-white select-none">{percentRemaining}%</span>
            <span className="block text-[8px] text-slate-400 font-medium tracking-wider uppercase select-none">Left</span>
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="w-full space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-2 text-center">
              <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Remaining</span>
              <span className="text-xs font-bold font-display text-white">{remaining.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-2 text-center">
              <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Used</span>
              <span className="text-xs font-bold font-display text-slate-300">{used.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-2">
            <div className="flex justify-between text-[9px] text-slate-400 mb-1">
              <span>Usage Scale</span>
              <span>{limit.toLocaleString()} Limit</span>
            </div>
            <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-accent-purple to-accent-blue h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Usage Forecast */}
      {scriptCharCount > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 relative z-10">
          <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/50 border border-slate-850">
            <Layers className="w-3.5 h-3.5 text-accent-blue mt-0.5" />
            <div className="flex-1 text-[10px]">
              <div className="flex justify-between text-slate-300 font-medium mb-0.5">
                <span>Script Length:</span>
                <span>{scriptCharCount} chars</span>
              </div>
              <div className="flex justify-between text-slate-400 mb-1.5">
                <span>Projected Left:</span>
                <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {projectedRemaining.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isOverLimit ? 'bg-rose-500' : 'bg-accent-blue'}`}
                  style={{ width: `${Math.min(100, (scriptCharCount / Math.max(1, remaining)) * 100)}%` }}
                ></div>
              </div>
              {isOverLimit && (
                <div className="flex items-center gap-1 text-[9px] text-rose-400 mt-1.5 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>Warning: Exceeds character balance.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
