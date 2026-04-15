'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, BookOpen, FileText, AlertCircle } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  source_type: string | null;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  color: string | null;
}

export default function CalendarPreviewWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // Next 7 days

      const response = await fetch(
        `/api/student/calendar?start=${now.toISOString()}&end=${endDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setEvents((data.events || []).slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string, sourceType: string | null) => {
    if (sourceType === 'assignment') return <FileText className="w-4 h-4" />;
    if (sourceType === 'quiz') return <AlertCircle className="w-4 h-4" />;
    if (eventType === 'class') return <BookOpen className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  const getEventColor = (eventType: string, color: string | null) => {
    if (color) return color;
    switch (eventType) {
      case 'deadline': return 'text-red-600 bg-red-50';
      case 'class': return 'text-blue-600 bg-blue-50';
      case 'study': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatEventTime = (dateString: string, allDay: boolean) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let dayLabel = '';
    if (eventDay.getTime() === today.getTime()) {
      dayLabel = 'Today';
    } else if (eventDay.getTime() === tomorrow.getTime()) {
      dayLabel = 'Tomorrow';
    } else {
      dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    if (allDay) {
      return dayLabel;
    }

    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dayLabel} at ${time}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Upcoming Events
            </h3>
            <p className="text-indigo-100 text-sm">Your schedule for the next 7 days</p>
          </div>
          <Link
            href="/student/calendar"
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
          >
            View All
          </Link>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No upcoming events</p>
            <Link
              href="/student/calendar"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-2 inline-block"
            >
              Add an event →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getEventColor(event.event_type, event.color)}`}>
                  {getEventIcon(event.event_type, event.source_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm truncate">
                    {event.title}
                  </h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatEventTime(event.start_datetime, event.all_day)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
