'use client';

import React, { useState, useEffect } from 'react';
import { getTimezones, getUserTimezone, localToUTC } from '@/lib/timezone-utils';

interface ConferenceFormProps {
  courseId: string;
  lessonId?: string;
  onSuccess?: (conference: any) => void;
  onCancel?: () => void;
}

export default function ConferenceForm({ courseId, lessonId, onSuccess, onCancel }: ConferenceFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_provider: '8x8vc',
    google_meet_link: '',
    scheduled_at: '',
    timezone: getUserTimezone(),
    duration_minutes: 60,
    max_participants: 100,
    recording_enabled: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize timezone on mount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      timezone: getUserTimezone()
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Convert local datetime to UTC if scheduled_at is provided
      let scheduledAtUTC = null;
      if (formData.scheduled_at) {
        scheduledAtUTC = localToUTC(formData.scheduled_at, formData.timezone);
      }

      const response = await fetch('/api/conferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          scheduled_at: scheduledAtUTC,
          course_id: courseId,
          lesson_id: lessonId,
          waiting_room_enabled: false // Always disable for both providers
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // If it's a manual link requirement error, show helpful message
        if (errorData.requiresManualLink) {
          throw new Error(
            errorData.error +
            (formData.video_provider === 'google_meet' && !formData.google_meet_link
              ? ' Please provide a Google Meet link in the form above.'
              : '')
          );
        }
        throw new Error(errorData.error || 'Failed to create conference');
      }

      const conference = await response.json();
      onSuccess?.(conference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Video Conference</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Conference Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter conference title"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter conference description"
          />
        </div>

        {/* Video Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Provider
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="video_provider"
                value="8x8vc"
                checked={formData.video_provider === '8x8vc'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">8x8.vc (Jitsi Meet)</span>
              <span className="ml-2 text-xs text-gray-500">- Reliable, no waiting rooms</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="video_provider"
                value="google_meet"
                checked={formData.video_provider === 'google_meet'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Google Meet</span>
              <span className="ml-2 text-xs text-gray-500">- Use existing Google Meet link</span>
            </label>
          </div>
          <div className="space-y-2 mt-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="video_provider"
                value="bigbluebutton"
                checked={formData.video_provider === 'bigbluebutton'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">BigBlueButton</span>
              <span className="ml-2 text-xs text-gray-500">- Open source classroom (requires server config)</span>
            </label>
          </div>
        </div>

        {/* Google Meet Link (only show when Google Meet is selected) */}
        {formData.video_provider === 'google_meet' && (
          <div>
            <label htmlFor="google_meet_link" className="block text-sm font-medium text-gray-700 mb-1">
              Google Meet Link {formData.scheduled_at ? '(Optional - will be auto-generated if configured)' : '*'}
            </label>
            <input
              type="url"
              id="google_meet_link"
              name="google_meet_link"
              value={formData.google_meet_link}
              onChange={handleChange}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              required={!formData.scheduled_at}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 space-y-1">
              {formData.scheduled_at ? (
                <p className="text-xs text-blue-600">
                  ✓ For scheduled meetings, a Google Meet link will be auto-generated if Google Calendar API is configured. Otherwise, please provide a link.
                </p>
              ) : (
                <p className="text-xs text-gray-600">
                  Please provide a Google Meet link. You can create one at{' '}
                  <a
                    href="https://meet.google.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    meet.google.com/new
                  </a>
                </p>
              )}
              <p className="text-xs text-gray-500">
                To enable auto-generation, configure Google Calendar API credentials in your environment variables.
              </p>
            </div>
          </div>
        )}

        {/* Scheduled Time */}
        <div className="space-y-2">
          <div>
            <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Time (Optional)
            </label>
            <input
              type="datetime-local"
              id="scheduled_at"
              name="scheduled_at"
              value={formData.scheduled_at}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to start immediately
            </p>
          </div>

          {formData.scheduled_at && (
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getTimezones().map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the timezone for the scheduled time above
              </p>
            </div>
          )}
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes)
          </label>
          <select
            id="duration_minutes"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
          </select>
        </div>

        {/* Max Participants */}
        <div>
          <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
            Max Participants
          </label>
          <select
            id="max_participants"
            name="max_participants"
            value={formData.max_participants}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 participants</option>
            <option value={25}>25 participants</option>
            <option value={50}>50 participants</option>
            <option value={100}>100 participants</option>
            <option value={250}>250 participants</option>
            <option value={500}>500 participants</option>
          </select>
        </div>

        {/* Recording */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="recording_enabled"
              checked={formData.recording_enabled}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Enable Recording</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            {formData.video_provider === 'google_meet'
              ? 'Google Meet has built-in recording capabilities'
              : '8x8.vc supports recording with proper configuration'
            }
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Conference'}
          </button>
        </div>
      </form>
    </div>
  );
}
