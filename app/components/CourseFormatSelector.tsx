'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

export type CourseFormat = 'lessons' | 'topics' | 'weekly' | 'grid' | 'player';

interface CourseFormatSelectorProps {
  currentFormat: CourseFormat;
  onFormatChange: (format: CourseFormat) => void;
  saving?: boolean;
}

const FORMAT_OPTIONS: {
  value: CourseFormat;
  label: string;
  icon: string;
  tagline: string;
  pedagogy: string;
  bestFor: string;
}[] = [
  {
    value: 'lessons',
    label: 'Sequential',
    icon: 'material-symbols:route',
    tagline: 'Mastery-based progression',
    pedagogy: 'Linear path where each lesson builds on the last. Students progress one step at a time with prerequisite enforcement. Ideal for skill-building courses where order matters.',
    bestFor: 'Self-paced, certification prep, skill ladders',
  },
  {
    value: 'topics',
    label: 'Topic',
    icon: 'material-symbols:account-tree',
    tagline: 'Concept-organized modules',
    pedagogy: 'Content grouped into thematic modules with learning objectives. Each module is a self-contained unit with its own completion tracking. Supports non-linear exploration.',
    bestFor: 'Subject surveys, reference courses, multi-concept curricula',
  },
  {
    value: 'weekly',
    label: 'Weekly',
    icon: 'material-symbols:calendar-month',
    tagline: 'Time-paced cohort schedule',
    pedagogy: 'Calendar-driven structure with availability windows. Content unlocks by week, creating consistent pacing. Past weeks remain accessible; current week is highlighted.',
    bestFor: 'Instructor-led, cohort-based, semester courses',
  },
  {
    value: 'grid',
    label: 'Activity',
    icon: 'material-symbols:dashboard',
    tagline: 'Flexible activity dashboard',
    pedagogy: 'Visual dashboard of activities by type. Students choose their own path through mixed content — videos, readings, projects, discussions. Encourages self-directed exploration.',
    bestFor: 'Project-based, creative, workshop-style courses',
  },
  {
    value: 'player',
    label: 'Player',
    icon: 'material-symbols:picture-in-picture',
    tagline: 'Sidebar-anchored lesson player',
    pedagogy: 'Persistent sidebar course map with inline lesson viewer. Content loads in-page without navigation. Sidebar shows collapsible units, completion status, and progress. Ideal for immersive learning.',
    bestFor: 'SCORM content, video-heavy courses, focused learning sessions',
  },
];

const CourseFormatSelector: React.FC<CourseFormatSelectorProps> = ({
  currentFormat,
  onFormatChange,
  saving = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFormatChange(opt.value)}
            disabled={saving}
            title={opt.tagline}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentFormat === opt.value
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon icon={opt.icon} className="w-4 h-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
        {saving && (
          <div className="ml-1">
            <Icon icon="material-symbols:sync" className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        )}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="ml-1 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="About course formats"
        >
          <Icon icon="material-symbols:help-outline" className="w-4 h-4" />
        </button>
      </div>

      {/* Pedagogical explanation panel */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[28rem] bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-900">Choose a Course Format</h4>
            <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">
              <Icon icon="material-symbols:close" className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onFormatChange(opt.value); setShowDetails(false); }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  currentFormat === opt.value
                    ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon={opt.icon} className={`w-5 h-5 ${currentFormat === opt.value ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                  <span className="text-xs text-gray-500">— {opt.tagline}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-1.5">{opt.pedagogy}</p>
                <p className="text-xs text-gray-400 italic">Best for: {opt.bestFor}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseFormatSelector;
