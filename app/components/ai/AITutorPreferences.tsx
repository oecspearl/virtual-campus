'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface AITutorPreferencesProps {
  onPreferencesChange: (preferences: AITutorPreferences) => void;
}

interface AITutorPreferences {
  isEnabled: boolean;
  preferredStyle: 'simple' | 'detailed' | 'balanced';
  learningFocus: 'visual' | 'auditory' | 'kinesthetic' | 'general';
  autoActivate: boolean;
}

export default function AITutorPreferences({ onPreferencesChange }: AITutorPreferencesProps) {
  const [preferences, setPreferences] = useState<AITutorPreferences>({
    isEnabled: false,
    preferredStyle: 'balanced',
    learningFocus: 'general',
    autoActivate: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/ai/tutor/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences || preferences);
      }
    } catch (error) {
      console.error('Error loading AI tutor preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: AITutorPreferences) => {
    setSaving(true);
    try {
      const response = await fetch('/api/ai/tutor/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      });

      if (response.ok) {
        setPreferences(newPreferences);
        onPreferencesChange(newPreferences);
      }
    } catch (error) {
      console.error('Error saving AI tutor preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof AITutorPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  const handleSelect = (key: keyof AITutorPreferences, value: any) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Icon icon="mdi:robot" className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Tutor Preferences</h3>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable AI Tutor */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Enable AI Tutor</h4>
            <p className="text-sm text-gray-600">Get AI assistance while learning</p>
          </div>
          <button
            onClick={() => handleToggle('isEnabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.isEnabled ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {preferences.isEnabled && (
          <>
            {/* Preferred Style */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Explanation Style</h4>
              <div className="space-y-2">
                {[
                  { value: 'simple', label: 'Simple', description: 'Easy-to-understand explanations' },
                  { value: 'balanced', label: 'Balanced', description: 'Mix of simple and detailed' },
                  { value: 'detailed', label: 'Detailed', description: 'Comprehensive explanations' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredStyle"
                      value={option.value}
                      checked={preferences.preferredStyle === option.value}
                      onChange={(e) => handleSelect('preferredStyle', e.target.value)}
                      className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{option.label}</span>
                      <p className="text-xs text-gray-600">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Learning Focus */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Learning Style</h4>
              <div className="space-y-2">
                {[
                  { value: 'visual', label: 'Visual', description: 'Diagrams, charts, and visual aids' },
                  { value: 'auditory', label: 'Auditory', description: 'Verbal explanations and discussions' },
                  { value: 'kinesthetic', label: 'Hands-on', description: 'Practical examples and activities' },
                  { value: 'general', label: 'General', description: 'Mix of all learning styles' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="learningFocus"
                      value={option.value}
                      checked={preferences.learningFocus === option.value}
                      onChange={(e) => handleSelect('learningFocus', e.target.value)}
                      className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{option.label}</span>
                      <p className="text-xs text-gray-600">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Auto-activate */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Auto-activate in Lessons</h4>
                <p className="text-sm text-gray-600">Automatically open AI tutor when entering lessons</p>
              </div>
              <button
                onClick={() => handleToggle('autoActivate')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.autoActivate ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.autoActivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Save indicator */}
            {saving && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                <span>Saving preferences...</span>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
