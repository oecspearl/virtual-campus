'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface AISearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AISearchBox({ 
  onSearch, 
  placeholder = "Ask AI anything about the platform...",
  className = ""
}: AISearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSearch(query.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const quickQueries = [
    "How do I submit an assignment?",
    "How do I join a video conference?",
    "How do I create a course?",
    "How do I manage students?"
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Icon 
            icon="mdi:magnify" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" 
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon icon="mdi:send" className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 flex items-center">
          <Icon icon="mdi:lightbulb" className="w-3 h-3 mr-1" />
          Try asking:
        </p>
        <div className="flex flex-wrap gap-2">
          {quickQueries.map((quickQuery, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setQuery(quickQuery);
                onSearch(quickQuery);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {quickQuery}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
