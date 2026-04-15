'use client';

import { useState } from 'react';
import { StudentCalendar } from '@/app/components/student';
import AccessibleModal from '@/app/components/ui/AccessibleModal';
import { Plus, X } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_datetime: string;
  end_datetime?: string;
  all_day: boolean;
  event_type: string;
  source_type?: string;
  color?: string;
  is_synced?: boolean;
}

export default function CalendarPage() {
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    all_day: false,
    event_type: 'custom',
    color: '#3b82f6',
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setNewEvent({
      title: '',
      description: '',
      start_datetime: '',
      end_datetime: '',
      all_day: false,
      event_type: 'custom',
      color: '#3b82f6',
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start_datetime) return;

    try {
      const response = await fetch('/api/student/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          start_datetime: new Date(newEvent.start_datetime).toISOString(),
          end_datetime: newEvent.end_datetime
            ? new Date(newEvent.end_datetime).toISOString()
            : null,
        }),
      });

      if (response.ok) {
        setShowEventModal(false);
        // Refresh will happen on next date change
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !confirm('Delete this event?')) return;

    try {
      const response = await fetch(`/api/student/calendar/${selectedEvent.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowEventModal(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Calendar
          </h1>
        </div>

        <StudentCalendar
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />

        {/* Event Modal */}
        <AccessibleModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          title={selectedEvent ? 'Event Details' : 'New Event'}
          size="md"
        >
          {selectedEvent ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {selectedEvent.title}
                </h3>
                {selectedEvent.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>When:</strong>{' '}
                  {new Date(selectedEvent.start_datetime).toLocaleString()}
                  {selectedEvent.end_datetime && (
                    <> - {new Date(selectedEvent.end_datetime).toLocaleString()}</>
                  )}
                </p>
                {selectedEvent.location && (
                  <p>
                    <strong>Where:</strong> {selectedEvent.location}
                  </p>
                )}
                <p>
                  <strong>Type:</strong> {selectedEvent.event_type}
                </p>
              </div>

              {!selectedEvent.is_synced && (
                <button
                  onClick={handleDeleteEvent}
                  className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Delete Event
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.start_datetime}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        start_datetime: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_datetime}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        end_datetime: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={newEvent.all_day}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, all_day: e.target.checked }))
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label
                  htmlFor="all_day"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  All day event
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Event
                </button>
              </div>
            </form>
          )}
        </AccessibleModal>
      </div>
    </div>
  );
}
