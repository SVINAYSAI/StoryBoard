/**
 * Lightweight markdown renderer component.
 * Extracted from ResearchUpdates.jsx to be reusable.
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';

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
      newParts.push(<strong key={start} className="text-ink font-bold">{content}</strong>);
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
          className="text-link hover:text-link-deep inline-flex items-center gap-0.5 underline transition-colors"
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

export default function MiniMarkdown({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-4 text-body leading-relaxed font-sans text-base">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Headers
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="font-sans font-black text-2xl text-ink mt-8 mb-4 border-b border-hairline pb-3">
              {renderInline(trimmed.substring(2))}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="font-sans font-bold text-xl text-ink mt-6 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-link rounded-full"></span>
              {renderInline(trimmed.substring(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="font-sans font-bold text-lg text-ink mt-5 mb-2">
              {renderInline(trimmed.substring(4))}
            </h3>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-3 ml-2 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-hairline-strong mt-2.5 shrink-0"></div>
              <p className="text-body">{renderInline(trimmed.substring(2))}</p>
            </div>
          );
        }

        // Standard paragraphs
        return (
          <p key={idx} className="text-body">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
