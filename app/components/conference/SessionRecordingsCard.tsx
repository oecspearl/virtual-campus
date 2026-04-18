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
  lessonId?: string;
  maxVisible?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function SessionRecordingsCard({
  courseId,
  lessonId,
  maxVisible = 3,
  collapsible = false,
  defaultOpen = true,
}: SessionRecordingsCardProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      setRecordings([]);
      return;
    }
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
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div
        className={`px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Recordings
          </h3>
          {collapsible && (
            <svg className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {(!collapsible || isOpen) && (
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-[1.5px] border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecordings.map(recording => (
              <a
                key={recording.id}
                href={recording.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group"
              >
                <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm text-slate-600 truncate group-hover:text-slate-800 transition-colors">
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
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
      )}
    </div>
  );
}
