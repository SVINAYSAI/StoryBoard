import React, { useState } from 'react';
import { Search, Flame, BookOpen, ExternalLink, Cpu, Sparkles } from 'lucide-react';

// Custom lightweight markdown renderer to avoid installing a large markdown parser
function MiniMarkdown({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-slate-300 leading-relaxed font-sans text-sm md:text-base">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Headers
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="font-display font-bold text-2xl text-white mt-6 mb-3 border-b border-slate-800 pb-2">
              {renderInline(trimmed.substring(2))}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="font-display font-semibold text-xl text-white mt-5 mb-2">
              {renderInline(trimmed.substring(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="font-display font-semibold text-lg text-slate-100 mt-4 mb-2">
              {renderInline(trimmed.substring(4))}
            </h3>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={idx} className="list-disc list-inside ml-4 text-slate-300 pl-1">
              {renderInline(trimmed.substring(2))}
            </li>
          );
        }

        // Standard paragraphs
        return (
          <p key={idx} className="text-slate-300">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Render bold text and link structures inline
function renderInline(text) {
  // Regex for bold **text**
  const boldRegex = /\*\*(.*?)\*\*/g;
  // Regex for markdown links [text](url)
  const linkRegex = /\[(.*?)\]\((.*?)\)/g;

  // Split and map text nodes
  let parts = [text];

  // Process bold tags
  let newParts = [];
  parts.forEach(part => {
    if (typeof part !== 'string') {
      newParts.push(part);
      return;
    }
    const matches = [...part.matchAll(boldRegex)];
    if (matches.length === 0) {
      newParts.push(part);
      return;
    }
    let lastIdx = 0;
    matches.forEach(match => {
      const start = match.index;
      const content = match[1];
      if (start > lastIdx) {
        newParts.push(part.substring(lastIdx, start));
      }
      newParts.push(<strong key={start} className="text-white font-semibold">{content}</strong>);
      lastIdx = start + match[0].length;
    });
    if (lastIdx < part.length) {
      newParts.push(part.substring(lastIdx));
    }
  });
  parts = newParts;

  // Process link tags
  newParts = [];
  parts.forEach(part => {
    if (typeof part !== 'string') {
      newParts.push(part);
      return;
    }
    const matches = [...part.matchAll(linkRegex)];
    if (matches.length === 0) {
      newParts.push(part);
      return;
    }
    let lastIdx = 0;
    matches.forEach(match => {
      const start = match.index;
      const label = match[1];
      const url = match[2];
      if (start > lastIdx) {
        newParts.push(part.substring(lastIdx, start));
      }
      newParts.push(
        <a 
          key={start} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-accent-blue hover:text-accent-purple inline-flex items-center gap-0.5 underline transition-colors"
        >
          {label}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
      lastIdx = start + match[0].length;
    });
    if (lastIdx < part.length) {
      newParts.push(part.substring(lastIdx));
    }
  });
  parts = newParts;

  return <>{parts}</>;
}

export default function ResearchUpdates({ onSelectTopic }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const trendingTopics = [
    "Google Gemini 2.5 Flash details and benchmarks",
    "Latest text to speech advancements in 2026",
    "ElevenLabs voice design updates",
    "Vertex AI search grounding capabilities",
    "Top AI video generators and scripts"
  ];

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to complete grounding search.');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred during search.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Introduction */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent-purple animate-pulse" />
          AI Grounded Research Console
        </h2>
        <p className="text-sm text-slate-400">
          Search the web in real-time with Google Search Grounding to source fresh AI announcements and updates.
        </p>
      </div>

      {/* Topics presets */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
          <Flame className="w-4 h-4 text-amber-500" />
          Trending Topics
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((topic, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(topic);
                handleSearch(topic);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all text-left"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for recent AI advancements, news, or release logs..."
            className="w-full pl-11 pr-4 py-3 bg-[#111420] border border-slate-800 focus:border-accent-purple/55 hover:border-slate-700 rounded-xl text-sm focus:outline-none transition-all"
            disabled={loading}
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-gradient-to-r from-accent-purple to-accent-blue text-white font-medium rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Searching...</span>
            </>
          ) : (
            <span>Search</span>
          )}
        </button>
      </div>

      {/* Loading state visual */}
      {loading && (
        <div className="glass-panel rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-accent-purple/20 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-accent-purple border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <Cpu className="absolute inset-4 w-8 h-8 text-accent-purple" />
          </div>
          <div className="space-y-1 mt-2">
            <h3 className="font-semibold text-white">Synthesizing Google Search Grounding</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Connecting with Google search engine API, reading latest pages, and drafting a grounded summary...
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex gap-2">
          <span>⚠️</span>
          <div>
            <span className="font-semibold">Search failed: </span>
            {error}
          </div>
        </div>
      )}

      {/* Results details */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main summary */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-[10px] bg-accent-purple/10 border border-accent-purple/20 text-accent-purple font-semibold uppercase px-2 py-1 rounded">
                  Grounded AI Intelligence
                </span>
                <h3 className="font-display font-bold text-xl text-white mt-2">Research Summary</h3>
              </div>
              {onSelectTopic && (
                <button
                  onClick={() => onSelectTopic(query, results.summary)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Use as Script Topic
                </button>
              )}
            </div>

            <MiniMarkdown text={results.summary} />
          </div>

          {/* Sources sidebar */}
          <div className="glass-panel rounded-2xl p-6 self-start space-y-4">
            <h4 className="font-display font-semibold text-slate-200 border-b border-slate-800/80 pb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent-blue" />
              Verified Sources
            </h4>
            {results.sources && results.sources.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {results.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl bg-slate-900/30 hover:bg-slate-900/60 border border-slate-800 hover:border-accent-blue/30 group transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-300 group-hover:text-white line-clamp-2 transition-colors">
                        {src.title || 'Grounded Source'}
                      </p>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-accent-blue shrink-0 transition-colors" />
                    </div>
                    <span className="text-[10px] text-slate-500 break-all block mt-1.5">
                      {src.uri}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">No explicit web sources cited in the response metadata.</p>
            )}

            {results.queries && results.queries.length > 0 && (
              <div className="pt-4 border-t border-slate-800/80">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                  Searches Executed
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {results.queries.map((qStr, idx) => (
                    <span key={idx} className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                      "{qStr}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
