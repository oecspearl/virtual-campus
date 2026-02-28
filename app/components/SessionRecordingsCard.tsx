'use client';

import { useState, useEffect } from 'react';
import { Video, Play, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface Recording {
  id: string;
  recording_url: string;
  title: string;
  recording_duration?: number;
  created_at: string;
  conference?: {
    id: string;
    title: string;
    scheduled_at?: string;
  };
}

interface SessionRecordingsCardProps {
  courseId: string;
  lessonId?: string; // Optional - filter to show recordings related to a specific lesson
  maxVisible?: number; // Number of recordings to show before "Show more"
}

export default function SessionRecordingsCard({
  courseId,
  lessonId,
  maxVisible = 3
}: SessionRecordingsCardProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, [courseId, lessonId]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      // Fetch all conferences for this course, then get their recordings
      const response = await fetch(`/api/courses/${courseId}/conferences`);
      if (!response.ok) {
        setRecordings([]);
        return;
      }

      const data = await response.json();
      const conferences = data.conferences || [];

      // Fetch recordings for each conference
      const allRecordings: Recording[] = [];

      for (const conference of conferences) {
        try {
          const recordingsRes = await fetch(`/api/conferences/${conference.id}/recording`);
          if (recordingsRes.ok) {
            const recordingsData = await recordingsRes.json();
            const conferenceRecordings = (recordingsData.recordings || []).map((r: any) => ({
              ...r,
              conference: {
                id: conference.id,
                title: conference.title,
                scheduled_at: conference.scheduled_at
              }
            }));
            allRecordings.push(...conferenceRecordings);
          }
        } catch (err) {
          console.error(`Failed to fetch recordings for conference ${conference.id}:`, err);
        }
      }

      // Sort by created_at descending (newest first)
      allRecordings.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRecordings(allRecordings);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Don't render anything if no recordings
  if (!loading && recordings.length === 0) {
    return null;
  }

  const visibleRecordings = expanded ? recordings : recordings.slice(0, maxVisible);
  const hasMore = recordings.length > maxVisible;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <h3 className="text-base sm:text-lg font-bold text-white">Session Recordings</h3>
        </div>
        <p className="text-red-100 text-xs sm:text-sm">Watch recorded live sessions</p>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecordings.map(recording => (
              <a
                key={recording.id}
                href={recording.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 transition-all group"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                  <Play className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm truncate group-hover:text-orange-600 transition-colors">
                    {recording.title || recording.conference?.title || 'Session Recording'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(recording.created_at)}
                    </span>
                    {recording.recording_duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.recording_duration)}
                      </span>
                    )}
                  </div>
                  {recording.conference?.title && recording.title !== recording.conference.title && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      From: {recording.conference.title}
                    </p>
                  )}
                </div>
              </a>
            ))}

            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show {recordings.length - maxVisible} More
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
