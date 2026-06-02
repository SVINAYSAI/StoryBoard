import React, { useState } from 'react';
import { Search, Flame, BookOpen, ExternalLink, Cpu, Sparkles } from 'lucide-react';
import MiniMarkdown from '../../utils/markdown';
import { api } from '../../api';

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
      const data = await api.research.search(q);
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred during search.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Introduction */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-bold font-sans text-ink flex items-center gap-3">
          <div className="p-2 rounded-xl bg-link-soft text-link-deep">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          AI Grounded Research
        </h2>
        <p className="text-sm text-body max-w-lg">
          Connect to Google Search in real-time. Ground your script in fresh data, benchmarks, and latest AI release notes.
        </p>
      </div>

      {/* Topics presets */}
      <div className="studio-card p-6 flex flex-col gap-4 shadow-sm bg-canvas-soft/50">
        <div className="flex items-center gap-2 text-label text-ink">
          <Flame className="w-4 h-4 text-warning" />
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
              className="text-xs px-4 py-2 rounded-full bg-white hover:bg-canvas-soft border border-hairline text-body hover:text-ink transition-all text-left shadow-sm"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for recent AI advancements, news, or release logs..."
            className="w-full pl-12 pr-4 py-4 studio-input text-base"
            disabled={loading}
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className="studio-button-primary px-8"
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
        <div className="studio-card p-20 flex flex-col items-center justify-center gap-6 text-center min-h-[400px]">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-link/10 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-link border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <Cpu className="absolute inset-5 w-10 h-10 text-link" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-ink">Grounding Intelligence</h3>
            <p className="text-sm text-body max-w-sm mx-auto">
              Connecting to Google Search to synthesize fresh, grounded insights for your script.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-error-soft border border-error/10 text-error-deep text-sm font-medium animate-shake flex gap-3">
          <span>⚠️</span>
          <div>
            <span className="font-bold">Search failed: </span>
            {error}
          </div>
        </div>
      )}

      {/* Results details */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main summary */}
          <div className="lg:col-span-3 studio-card p-8 md:p-10 space-y-8">
            <div className="flex justify-between items-start border-b border-hairline pb-6">
              <div className="space-y-1">
                <span className="text-label text-link">Grounded Insight</span>
                <h3 className="text-2xl font-black text-ink">Research Summary</h3>
              </div>
              {onSelectTopic && (
                <button
                  onClick={() => onSelectTopic(query, results.summary)}
                  className="px-5 py-2.5 bg-link hover:bg-link-deep text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 shadow-lg shadow-link/10"
                >
                  <BookOpen className="w-4 h-4" />
                  Use as Script Topic
                </button>
              )}
            </div>

            <div className="animate-fade-in">
              <MiniMarkdown text={results.summary} />
            </div>
          </div>

          {/* Sources sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="studio-card p-6 space-y-6">
              <h4 className="text-label text-ink flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-link" />
                Verified Sources
              </h4>
              {results.sources && results.sources.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {results.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl bg-canvas-soft hover:bg-canvas-soft-2 border border-hairline hover:border-hairline-strong group transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-ink group-hover:text-link line-clamp-2 transition-colors">
                          {src.title || 'Source'}
                        </p>
                        <ExternalLink className="w-3.5 h-3.5 text-mute group-hover:text-link shrink-0 transition-colors" />
                      </div>
                      <span className="text-[10px] text-mute font-mono break-all block mt-2 opacity-60">
                        {src.uri}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-mute italic py-4">No explicit sources cited.</p>
              )}
            </div>

            {results.queries && results.queries.length > 0 && (
              <div className="studio-card p-6 space-y-4">
                <span className="text-label text-ink">Search Grounding</span>
                <div className="flex flex-wrap gap-2">
                  {results.queries.map((qStr, idx) => (
                    <span key={idx} className="text-[10px] font-bold bg-canvas-soft border border-hairline px-2.5 py-1 rounded-full text-mute italic">
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
