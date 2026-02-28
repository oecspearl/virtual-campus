'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIHelpEnhancementProps {
  onAISearch: (query: string) => void;
  currentPage: string;
  userRole: string;
}

export default function AIHelpEnhancement({ onAISearch, currentPage, userRole }: AIHelpEnhancementProps) {
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateAISuggestions();
  }, [currentPage, userRole]);

  const generateAISuggestions = async () => {
    setIsLoading(true);
    try {
      // Generate contextual suggestions based on current page and user role
      const suggestions = getContextualSuggestions(currentPage, userRole);
      setAISuggestions(suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getContextualSuggestions = (page: string, role: string): string[] => {
    const suggestions: Record<string, Record<string, string[]>> = {
      '/dashboard': {
        student: [
          "How do I view my course progress?",
          "How do I access my assignments?",
          "How do I join a video conference?",
          "How do I update my learning preferences?"
        ],
        instructor: [
          "How do I create a new course?",
          "How do I manage student enrollments?",
          "How do I schedule a video conference?",
          "How do I grade assignments?"
        ],
        admin: [
          "How do I manage user accounts?",
          "How do I view system analytics?",
          "How do I configure platform settings?",
          "How do I manage course categories?"
        ]
      },
      '/courses': {
        student: [
          "How do I enroll in a course?",
          "How do I search for specific courses?",
          "How do I view course prerequisites?",
          "How do I access course materials?"
        ],
        instructor: [
          "How do I create course content?",
          "How do I set up course prerequisites?",
          "How do I manage course visibility?",
          "How do I duplicate a course?"
        ],
        admin: [
          "How do I approve new courses?",
          "How do I manage course categories?",
          "How do I set up course templates?",
          "How do I monitor course performance?"
        ]
      },
      '/help': {
        student: [
          "How do I submit an assignment?",
          "How do I take a quiz?",
          "How do I participate in discussions?",
          "How do I track my learning progress?"
        ],
        instructor: [
          "How do I create effective quizzes?",
          "How do I manage student discussions?",
          "How do I use the gradebook?",
          "How do I create video conferences?"
        ],
        admin: [
          "How do I configure system settings?",
          "How do I manage user permissions?",
          "How do I view system reports?",
          "How do I troubleshoot common issues?"
        ]
      }
    };

    return suggestions[page]?.[role] || [
      "How can I get started with the platform?",
      "What features are available to me?",
      "How do I contact support?",
      "How do I update my profile?"
    ];
  };

  const handleSuggestionClick = (suggestion: string) => {
    onAISearch(suggestion);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Icon icon="mdi:lightbulb" className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI-Powered Help Suggestions</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Based on your current page and role, here are some helpful questions you can ask our AI assistant:
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="ml-2 text-sm text-gray-600">Generating suggestions...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {aiSuggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-left p-3 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start space-x-2">
                <Icon 
                  icon="mdi:help-circle-outline" 
                  className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" 
                />
                <span className="text-sm text-gray-700 group-hover:text-blue-800">
                  {suggestion}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Icon icon="mdi:robot" className="w-4 h-4" />
            <span>Powered by AI • Context-aware suggestions</span>
          </div>
          <button
            onClick={() => onAISearch('')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Ask AI Assistant →
          </button>
        </div>
      </div>
    </div>
  );
}
