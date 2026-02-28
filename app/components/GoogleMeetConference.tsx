'use client';

import React, { useEffect, useState } from 'react';

interface GoogleMeetConferenceProps {
  conference: {
    id: string;
    title: string;
    google_meet_link: string;
    meeting_id: string;
    duration_minutes?: number;
    max_participants?: number;
    recording_enabled?: boolean;
  };
  isHost: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onError?: (error: string) => void;
}

export default function GoogleMeetConference({
  conference,
  isHost,
  onJoin,
  onLeave,
  onError
}: GoogleMeetConferenceProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [attendanceTracked, setAttendanceTracked] = useState(false);

  // Register join with backend API to track attendance
  const registerJoin = async () => {
    console.log('[GoogleMeet] Registering join for conference:', conference.id);
    try {
      const response = await fetch(`/api/conferences/${conference.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[GoogleMeet] Failed to register join:', errorData);
        setAttendanceTracked(false);
        // Don't block the user from joining even if tracking fails
      } else {
        const data = await response.json();
        console.log('[GoogleMeet] Successfully registered join for attendance tracking:', data);
        setAttendanceTracked(true);
      }
    } catch (error) {
      console.error('[GoogleMeet] Error registering join:', error);
      setAttendanceTracked(false);
      // Don't block the user from joining even if tracking fails
    }
  };

  // Register leave with backend API
  const registerLeave = async () => {
    try {
      await fetch(`/api/conferences/${conference.id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Successfully registered conference leave');
    } catch (error) {
      console.error('Error registering leave:', error);
    }
  };

  const joinConference = async () => {
    setIsJoining(true);
    await registerJoin();
    setIsJoined(true);
    setIsJoining(false);
    onJoin?.();
  };

  const leaveConference = async () => {
    await registerLeave();
    setIsJoined(false);
    onLeave?.();
  };

  const openGoogleMeet = async () => {
    if (conference.google_meet_link) {
      // Register the join first, then open Google Meet
      if (!isJoined) {
        await joinConference();
      }
      window.open(conference.google_meet_link, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    }
  };

  useEffect(() => {
    // Auto-register join when component mounts
    joinConference();

    // Cleanup: register leave when component unmounts
    return () => {
      if (isJoined) {
        registerLeave();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden flex items-center justify-center">
      {/* Google Meet Preview Card */}
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Google Meet Logo */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm6-4H6v-2h12v2zm0-4H6V7h12v2z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Google Meet</h2>
          <p className="text-gray-600 mt-2">{conference.title}</p>
        </div>

        {/* Conference Details */}
        <div className="space-y-3 mb-6 text-left">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600">{conference.duration_minutes || 60} minutes</span>
          </div>
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm text-gray-600">Max {conference.max_participants || 100} participants</span>
          </div>
          {conference.recording_enabled && (
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-sm text-red-600">Recording enabled</span>
            </div>
          )}
          {isHost && (
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-blue-600 font-medium">You are the host</span>
            </div>
          )}
          {attendanceTracked && (
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-600 font-medium">Attendance tracked</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={openGoogleMeet}
            disabled={isJoining}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isJoining ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Joining...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Open Google Meet</span>
              </>
            )}
          </button>
          
          <button
            onClick={leaveConference}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Meeting Link Display */}
        {conference.google_meet_link && conference.google_meet_link !== 'https://meet.google.com/new' && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-900 mb-2">Meeting Link:</h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={conference.google_meet_link}
                className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-md text-sm text-gray-700"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(conference.google_meet_link);
                  alert('Link copied to clipboard!');
                }}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-green-700 mt-2">
              This link is ready to use. Students can join directly using this link.
            </p>
          </div>
        )}
        
        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How to use Google Meet:</h4>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click "Open Google Meet" to join the meeting</li>
            <li>The meeting link is automatically generated and saved</li>
            <li>Students can use the link above to join directly</li>
            <li>Start your video conference when ready</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
