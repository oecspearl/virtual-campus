'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VideoConference as ConferenceType } from '@/types/conference';
import GoogleMeetConference from './GoogleMeetConference';
import ConferenceWhiteboardPanel from './ConferenceWhiteboardPanel';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

interface VideoConferenceProps {
  conference: ConferenceType;
  isHost: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onError?: (error: string) => void;
}

export default function VideoConference({
  conference,
  isHost,
  onJoin,
  onLeave,
  onError
}: VideoConferenceProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const jitsiWindowRef = useRef<Window | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const videoProvider = conference.video_provider || '8x8vc';

  // Build the Jitsi meeting URL
  const getJitsiUrl = () => {
    let meetingId = conference.meeting_id || '';
    if (meetingId.includes('/')) {
      const parts = meetingId.split('/');
      meetingId = parts[parts.length - 1];
    }
    if (!meetingId.startsWith('oecs-')) {
      meetingId = `oecs-${meetingId}`;
    }

    const params = new URLSearchParams();
    params.set('prejoinPageEnabled', 'false');
    params.set('startWithAudioMuted', 'true');
    params.set('startWithVideoMuted', 'false');

    return `https://8x8.vc/vpaas-magic-cookie-544a27fe05c5424b83f556032127b237/${meetingId}#config.${params.toString().replace(/&/g, '&config.')}`;
  };

  // Track leave on tab close / navigation
  useEffect(() => {
    if (!isJoined) return;

    const sendLeaveBeacon = () => {
      const url = `/api/conferences/${conference.id}/leave`;
      const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    };

    const handleBeforeUnload = () => sendLeaveBeacon();

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isJoined, conference.id]);

  // Poll to detect when the Jitsi window is closed
  useEffect(() => {
    if (!isJoined || !jitsiWindowRef.current) return;

    pollRef.current = setInterval(() => {
      if (jitsiWindowRef.current && jitsiWindowRef.current.closed) {
        handleLeave();
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isJoined]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleJoin = async () => {
    setIsLoading(true);

    try {
      // Register join with backend
      const response = await fetch(`/api/conferences/${conference.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to join conference');
      }

      // Open Jitsi in a new window
      const url = getJitsiUrl();
      const win = window.open(url, `jitsi-${conference.id}`, 'noopener');

      if (!win) {
        onError?.('Pop-up blocked. Please allow pop-ups for this site and try again.');
        setIsLoading(false);
        return;
      }

      jitsiWindowRef.current = win;
      setIsJoined(true);
      setIsLoading(false);
      onJoin();
    } catch (error) {
      console.error('Error joining conference:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to join conference');
      setIsLoading(false);
    }
  };

  const handleLeave = () => {
    // Close the Jitsi window if still open
    if (jitsiWindowRef.current && !jitsiWindowRef.current.closed) {
      jitsiWindowRef.current.close();
    }
    jitsiWindowRef.current = null;

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    // Notify backend
    fetch(`/api/conferences/${conference.id}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(console.error);

    setIsJoined(false);
    setShowWhiteboard(false);
    onLeave();
  };

  const focusJitsiWindow = () => {
    if (jitsiWindowRef.current && !jitsiWindowRef.current.closed) {
      jitsiWindowRef.current.focus();
    }
  };

  // Google Meet
  if (videoProvider === 'google_meet') {
    return (
      <GoogleMeetConference
        conference={conference as any}
        isHost={isHost}
        onJoin={onJoin}
        onLeave={onLeave}
        onError={onError}
      />
    );
  }

  // BigBlueButton
  if (videoProvider === 'bigbluebutton') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">{conference.title}</h2>
          <p className="text-gray-300 mb-8">
            This class is hosted on BigBlueButton. Click the button below to join the classroom in a new tab.
          </p>
          <button
            onClick={() => {
              let url = conference.meeting_url;
              if (!url.startsWith('http') && !url.startsWith('/')) {
                url = `/api/conferences/${url}`;
              }
              window.open(url, '_blank');
              onJoin();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-lg transition-colors shadow-lg flex items-center justify-center mx-auto"
          >
            <span>Join Classroom</span>
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button onClick={onLeave} className="mt-6 text-gray-400 hover:text-white text-sm underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Default: Jitsi (8x8.vc) — opens in new window
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          {isJoined && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
          <div>
            <h3 className="text-white font-semibold">{conference.title}</h3>
            <p className="text-gray-400 text-xs">
              {isJoined ? 'Conference running in separate window' : '8x8 Video Conference'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isJoined ? (
            <button
              onClick={handleJoin}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Joining...' : 'Join Conference'}
            </button>
          ) : (
            <>
              <button
                onClick={focusJitsiWindow}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Video
              </button>
              <button
                onClick={handleLeave}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Leave Conference
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex">
        {!isJoined && !isLoading && (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-bold mb-3">{conference.title}</h2>
              <p className="text-gray-300 text-sm mb-6">
                The video conference will open in a new window. Make sure pop-ups are allowed for this site.
              </p>
              {conference.meeting_password && (
                <p className="text-yellow-300 text-sm mb-4">
                  Meeting Password: {conference.meeting_password}
                </p>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <LoadingIndicator variant="dots" size="lg" text="Joining Conference..." className="text-white" />
          </div>
        )}

        {isJoined && !showWhiteboard && (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-800 px-6">
            <div className="text-center max-w-lg">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">You&apos;re in the conference</h3>
              <p className="text-gray-400 text-sm mb-6">
                The video call is running in a separate window. Use the buttons below to manage your session.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={focusJitsiWindow}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Switch to Video Window
                </button>

                <button
                  onClick={() => setShowWhiteboard(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  Open Whiteboard
                </button>
              </div>
            </div>
          </div>
        )}

        {isJoined && showWhiteboard && (
          <div className="flex-1 min-h-0">
            <ConferenceWhiteboardPanel
              conferenceId={conference.id}
              isHost={isHost}
              isVisible={showWhiteboard}
              onClose={() => setShowWhiteboard(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
