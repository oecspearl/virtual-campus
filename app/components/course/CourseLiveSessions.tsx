'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { ConferenceData } from './types';
import VideoConferenceSection from '@/app/components/conference/VideoConferenceSection';

interface CourseLiveSessionsProps {
  courseId: string;
  isInstructor: boolean;
  conferences?: ConferenceData[];
  isEnrolled?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function CourseLiveSessions({ courseId, isInstructor, conferences, isEnrolled, collapsible = false, defaultOpen = true }: CourseLiveSessionsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div
        className={`px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-display text-gray-900 border-l-[3px] pl-3" style={{ borderColor: 'var(--theme-secondary)' }}>
            Live Sessions
          </h2>
          {collapsible && (
            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
      {(!collapsible || isOpen) && (
        <div className="p-3 sm:p-4 lg:p-5">
          {conferences ? (
            <ConferenceList conferences={conferences} isEnrolled={isEnrolled} />
          ) : (
            <VideoConferenceSection courseId={courseId} isInstructor={isInstructor} />
          )}
        </div>
      )}
    </div>
  );
}

function ConferenceList({ conferences, isEnrolled }: { conferences: ConferenceData[]; isEnrolled?: boolean }) {
  if (conferences.length === 0) {
    return (
      <div className="text-center py-4">
        <Icon icon="material-symbols:videocam-off" className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No live sessions scheduled yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conferences.map((conference) => {
        const isLive = conference.status === 'active' || conference.status === 'live';
        const isScheduled = conference.status === 'scheduled';

        return (
          <div
            key={conference.id}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isLive ? 'bg-red-100' : isScheduled ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Icon
                icon={isLive ? 'material-symbols:radio-button-checked' : 'material-symbols:videocam'}
                className={`w-4 h-4 ${isLive ? 'text-red-600' : isScheduled ? 'text-blue-600' : 'text-gray-400'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-gray-900 text-sm truncate">{conference.title}</h3>
                {isLive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
                {isScheduled && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Scheduled
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {conference.scheduled_at && (
                  <span className="flex items-center gap-1">
                    <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                    {new Date(conference.scheduled_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {conference.video_provider && (
                  <span className="flex items-center gap-1">
                    <Icon icon="material-symbols:settings-video-camera" className="w-3 h-3" />
                    {conference.video_provider}
                  </span>
                )}
              </div>
            </div>
            {isLive && conference.meeting_url && isEnrolled && (
              <a
                href={conference.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Icon icon="material-symbols:videocam" className="w-3.5 h-3.5" />
                Join
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
