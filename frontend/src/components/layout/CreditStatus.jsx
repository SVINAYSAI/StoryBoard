import React from 'react';
import { AlertCircle, RefreshCw, Layers, Cpu } from 'lucide-react';

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
        className="flex flex-col items-center justify-center p-3 rounded-xl bg-canvas-soft border border-hairline hover:bg-canvas-soft-2 cursor-pointer transition-all duration-300 relative group"
        title={`ElevenLabs Credits: ${percentRemaining}% remaining (${remaining.toLocaleString()} left)`}
      >
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="w-10 h-10 transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              className="stroke-hairline fill-none"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              className="stroke-ink fill-none transition-all duration-500 ease-out"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 - (percentRemaining / 100) * 2 * Math.PI * 16}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[8px] font-black text-ink select-none">{percentRemaining}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-card p-6 relative overflow-hidden transition-all duration-300 shadow-xl border-hairline-strong/30">
      {/* Background ambient light */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-link/5 rounded-full blur-2xl"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-2">
           <Cpu className="w-4 h-4 text-link animate-pulse" />
           <h3 className="text-label text-ink">Engine Credits</h3>
        </div>
        <button
          onClick={fetchCredits}
          disabled={isLoading}
          className="p-2 rounded-lg bg-canvas hover:bg-canvas-soft border border-hairline text-mute hover:text-ink transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-6 relative z-10">
        {/* Radial gauge */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-canvas-soft fill-none"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-ink fill-none transition-all duration-1000 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-black text-xl text-ink leading-none">{percentRemaining}%</span>
            <span className="text-[8px] text-mute font-black uppercase tracking-widest mt-1">Free</span>
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-canvas-soft/50 border border-hairline rounded-xl p-3 text-center shadow-inner">
              <span className="text-[9px] text-mute uppercase font-black tracking-widest block mb-1">Available</span>
              <span className="text-sm font-black text-ink">{remaining.toLocaleString()}</span>
            </div>
            <div className="bg-canvas-soft/50 border border-hairline rounded-xl p-3 text-center shadow-inner">
              <span className="text-[9px] text-mute uppercase font-black tracking-widest block mb-1">Quota</span>
              <span className="text-sm font-black text-body">{limit.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-mute px-1">
              <span>Usage Scale</span>
              <span>{Math.round((used / limit) * 100)}% Used</span>
            </div>
            <div className="w-full h-2.5 bg-canvas-soft rounded-full overflow-hidden border border-hairline shadow-inner">
              <div 
                className="bg-ink h-full transition-all duration-700 ease-out" 
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Usage Forecast */}
      {scriptCharCount > 0 && (
        <div className="mt-6 pt-5 border-t border-hairline relative z-10">
          <div className="p-4 rounded-xl bg-canvas-soft-2/50 border border-hairline-strong/20 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-link" />
              <span className="text-[9px] font-black uppercase tracking-widest text-ink">Workload Projection</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-mute">Current Draft</span>
                <span className="text-ink">{scriptCharCount.toLocaleString()} chars</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-mute">Projected End</span>
                <span className={isOverLimit ? 'text-error font-black' : 'text-ink'}>
                  {projectedRemaining.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-canvas-soft rounded-full overflow-hidden border border-hairline shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-error' : 'bg-link'}`}
                  style={{ width: `${Math.min(100, (scriptCharCount / Math.max(1, remaining)) * 100)}%` }}
                ></div>
              </div>
            </div>
            
            {isOverLimit && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-error-soft border border-error/10 text-[9px] text-error font-black uppercase tracking-tight">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Insufficient character balance</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
