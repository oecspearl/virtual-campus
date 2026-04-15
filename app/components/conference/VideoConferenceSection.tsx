'use client';

import React, { useState } from 'react';
import { VideoConference } from '@/types/conference';
import VideoConferenceComponent from './VideoConference';
import ConferenceForm from './ConferenceForm';
import ConferenceList from './ConferenceList';

interface VideoConferenceSectionProps {
  courseId: string;
  lessonId?: string;
  isInstructor: boolean;
}

export default function VideoConferenceSection({
  courseId,
  lessonId,
  isInstructor
}: VideoConferenceSectionProps) {
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedConference, setSelectedConference] = useState<VideoConference | null>(null);
  const [isInConference, setIsInConference] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScheduleConference = (conference: VideoConference) => {
    setShowScheduler(false);
    // Refresh the conference list to show the new conference
    setRefreshKey(prev => prev + 1);
  };

  const handleJoinConference = (conference: VideoConference) => {
    setSelectedConference(conference);
    setIsInConference(true);
  };

  const handleLeaveConference = () => {
    setIsInConference(false);
    setSelectedConference(null);
  };

  const handleConferenceError = (error: string) => {
    console.error('Conference error:', error);
    // You could show a toast notification here
  };

  const handleDeleteConference = async (conference: VideoConference) => {
    if (!conference?.id) {
      console.error('Cannot delete conference: invalid conference ID');
      alert('Cannot delete conference: invalid conference data');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${conference.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/conferences/${conference.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to delete conference';
        
        // If conference not found, it might have been already deleted
        // Just refresh the list instead of showing an error
        if (response.status === 404 && errorMessage.includes('not found')) {
          console.log('Conference not found - may have been already deleted, refreshing list');
          setRefreshKey(prev => prev + 1);
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Refresh the conference list by triggering a re-render
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting conference:', error);
      alert(`Failed to delete conference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isInConference && selectedConference) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6 shadow-sm">
        <div className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] w-full">
          <VideoConferenceComponent
            conference={selectedConference}
            isHost={isInstructor}
            onJoin={() => console.log('Joined conference')}
            onLeave={handleLeaveConference}
            onError={handleConferenceError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">Video Conferences</h3>
              <p className="text-sm text-gray-600">
                {lessonId ? 'Live sessions for this lesson' : 'Live sessions and scheduled meetings for this course'}
              </p>
            </div>
          </div>

          {isInstructor && (
            <button
              onClick={() => setShowScheduler(true)}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 w-full sm:w-auto"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Schedule Meeting
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <ConferenceList
          key={refreshKey}
          courseId={courseId}
          onJoin={handleJoinConference}
          onDelete={handleDeleteConference}
          isInstructor={isInstructor}
        />
      </div>

      {showScheduler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <ConferenceForm
              courseId={courseId}
              lessonId={lessonId}
              onSuccess={handleScheduleConference}
              onCancel={() => setShowScheduler(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
