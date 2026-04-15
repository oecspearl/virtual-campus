'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';

interface AIHelpEnhancementProps {
  onAISearch: (query: string) => void;
  currentPage: string;
  userRole: string;
  activeSection?: string;
}

export default function AIHelpEnhancement({ onAISearch, currentPage, userRole, activeSection }: AIHelpEnhancementProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/ai/help-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage, userRole, activeSection }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        } else {
          setError(true);
        }
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, userRole, activeSection]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  if (error && suggestions.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200/80 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:auto-fix" className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">AI Suggestions</h3>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          title="Refresh suggestions"
        >
          <Icon icon="mdi:refresh" className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-3">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-slate-400">Generating suggestions...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onAISearch(suggestion)}
              className="text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-gray-50 rounded-md transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-300">Powered by AI</span>
        <button
          onClick={() => onAISearch('')}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Ask AI Assistant
        </button>
      </div>
    </div>
  );
}
