'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { ConferenceData } from './types';
import VideoConferenceSection from '@/app/components/VideoConferenceSection';

interface CourseLiveSessionsProps {
  courseId: string;
  isInstructor: boolean;
  /** For shared courses, pass conference data directly instead of using VideoConferenceSection */
  conferences?: ConferenceData[];
  isEnrolled?: boolean;
}

export default function CourseLiveSessions({ courseId, isInstructor, conferences, isEnrolled }: CourseLiveSessionsProps) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
            <Icon icon="material-symbols:videocam" className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Live Sessions</h2>
            <p className="text-sm sm:text-base text-gray-600">Scheduled video conferences</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 lg:p-8">
        {conferences ? (
          <ConferenceList conferences={conferences} isEnrolled={isEnrolled} />
        ) : (
          <VideoConferenceSection courseId={courseId} isInstructor={isInstructor} />
        )}
      </div>
    </div>
  );
}

/** Inline conference list for shared courses */
function ConferenceList({ conferences, isEnrolled }: { conferences: ConferenceData[]; isEnrolled?: boolean }) {
  if (conferences.length === 0) {
    return (
      <div className="text-center py-8">
        <Icon icon="material-symbols:videocam-off" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm sm:text-base">No live sessions scheduled yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conferences.map((conference) => {
        const isLive = conference.status === 'active' || conference.status === 'live';
        const isScheduled = conference.status === 'scheduled';

        return (
          <div
            key={conference.id}
            className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isLive ? 'bg-red-100' : isScheduled ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Icon
                icon={isLive ? 'material-symbols:radio-button-checked' : 'material-symbols:videocam'}
                className={`w-5 h-5 ${isLive ? 'text-red-600' : isScheduled ? 'text-blue-600' : 'text-gray-400'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{conference.title}</h3>
                {isLive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
                {isScheduled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Scheduled
                  </span>
                )}
              </div>
              {conference.description && (
                <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">{conference.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {conference.scheduled_at && (
                  <span className="flex items-center gap-1">
                    <Icon icon="material-symbols:calendar-today" className="w-3.5 h-3.5" />
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
                    <Icon icon="material-symbols:settings-video-camera" className="w-3.5 h-3.5" />
                    {conference.video_provider}
                  </span>
                )}
                {conference.instructor && (
                  <span className="flex items-center gap-1">
                    <Icon icon="material-symbols:person" className="w-3.5 h-3.5" />
                    {conference.instructor.name}
                  </span>
                )}
              </div>
            </div>
            {isLive && conference.meeting_url && isEnrolled && (
              <a
                href={conference.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Icon icon="material-symbols:videocam" className="w-4 h-4" />
                Join
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
