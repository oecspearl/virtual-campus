'use client';

import React, { useState, useEffect } from 'react';
import { VideoConference } from '@/types/conference';
import { formatDateTimeInTimezone, getUserTimezone } from '@/lib/timezone-utils';
import ConferenceAttendanceReport from './ConferenceAttendanceReport';
import ConferenceRecordingManager from './ConferenceRecordingManager';
import { Users, Video } from 'lucide-react';

interface ConferenceListProps {
  courseId: string;
  onJoin: (conference: VideoConference) => void;
  onEdit?: (conference: VideoConference) => void;
  onDelete?: (conference: VideoConference) => void;
  isInstructor?: boolean;
}

export default function ConferenceList({
  courseId,
  onJoin,
  onEdit,
  onDelete,
  isInstructor = false
}: ConferenceListProps) {
  const [conferences, setConferences] = useState<VideoConference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');

  // Modal states for attendance and recording management
  const [attendanceConference, setAttendanceConference] = useState<VideoConference | null>(null);
  const [recordingConference, setRecordingConference] = useState<VideoConference | null>(null);

  useEffect(() => {
    fetchConferences();
  }, [courseId, filter]);

  const fetchConferences = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/courses/${courseId}/conferences?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch conferences');
      }

      const { conferences } = await response.json();
      setConferences(conferences || []);
    } catch (error) {
      console.error('Error fetching conferences:', error);
      setError('Failed to load conferences');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string, timezone?: string) => {
    if (timezone) {
      return formatDateTimeInTimezone(dateString, timezone);
    }
    // Fallback to user's timezone if no timezone specified
    return formatDateTimeInTimezone(dateString, getUserTimezone());
  };

  const canJoin = (conference: VideoConference) => {
    return conference.status === 'live' || conference.status === 'scheduled';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchConferences}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (conferences.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">No conferences found</h3>
        <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
          {filter === 'all'
            ? 'No video conferences have been scheduled for this course yet. Create your first meeting to get started!'
            : `No ${filter} conferences found. Try adjusting your filter or create a new meeting.`
          }
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'all', label: 'All' },
          { key: 'scheduled', label: 'Scheduled' },
          { key: 'live', label: 'Live' },
          { key: 'ended', label: 'Ended' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === key
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conference List */}
      <div className="space-y-3">
        {conferences.map((conference) => (
          <div
            key={conference.id}
            className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200 overflow-hidden"
          >
            <div className="space-y-3">
              {/* Conference info */}
              <div>
                {conference.description && (
                  <p className="text-gray-600 text-sm mb-3">{conference.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                  {conference.scheduled_at && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDateTime(conference.scheduled_at, conference.timezone)}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{conference.duration_minutes} min</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Max {conference.max_participants}</span>
                  </div>

                  {conference.recording_enabled && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Recording</span>
                    </div>
                  )}
                </div>

                {conference.lesson && (
                  <div className="mt-2 text-sm text-blue-600">
                    Related to: {conference.lesson.title}
                  </div>
                )}

                {/* Google Meet Link Display */}
                {conference.video_provider === 'google_meet' && conference.google_meet_link && conference.google_meet_link !== 'https://meet.google.com/new' && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-green-900 mb-1">Meeting Link:</p>
                        <p className="text-sm text-green-700 truncate">{conference.google_meet_link}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(conference.google_meet_link!);
                          alert('Link copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors whitespace-nowrap flex-shrink-0"
                        title="Copy link"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons - stack below content on mobile */}
              <div className="flex flex-wrap items-center gap-2">
                {canJoin(conference) && (
                  <button
                    onClick={() => onJoin(conference)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {conference.status === 'live' ? 'Join Now' : 'Join'}
                  </button>
                )}

                {isInstructor && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setAttendanceConference(conference)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Attendance"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRecordingConference(conference)}
                      className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                      title="Manage Recordings"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(conference)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Conference"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(conference)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Conference"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Attendance Report Modal */}
    {attendanceConference && (
      <ConferenceAttendanceReport
        conferenceId={attendanceConference.id}
        isOpen={!!attendanceConference}
        onClose={() => setAttendanceConference(null)}
      />
    )}

    {/* Recording Manager Modal */}
    {recordingConference && (
      <ConferenceRecordingManager
        conferenceId={recordingConference.id}
        courseId={courseId}
        conferenceTitle={recordingConference.title}
        isOpen={!!recordingConference}
        onClose={() => setRecordingConference(null)}
      />
    )}
    </>
  );
}
