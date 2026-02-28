'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  FileText,
  Bell,
  RefreshCw,
} from 'lucide-react';

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

interface StudentCalendarProps {
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
  compact?: boolean;
}

export default function StudentCalendar({
  onEventClick,
  onAddEvent,
  compact = false,
}: StudentCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [syncing, setSyncing] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Calculate date range based on view
      let startDate, endDate;
      if (viewMode === 'month') {
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
      } else {
        const dayOfWeek = currentDate.getDay();
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - dayOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      }

      const response = await fetch(
        `/api/student/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      const data = await response.json();

      if (response.ok) {
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncCalendar = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/student/calendar/sync', {
        method: 'POST',
      });
      if (response.ok) {
        await fetchEvents();
      }
    } catch (err) {
      console.error('Failed to sync calendar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      } else {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      }
      return newDate;
    });
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLast - i),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_datetime);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;

    switch (event.event_type) {
      case 'assignment':
        return '#ef4444'; // red
      case 'quiz':
        return '#f59e0b'; // amber
      case 'class':
        return '#3b82f6'; // blue
      case 'study':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <FileText className="w-3 h-3" />;
      case 'quiz':
        return <BookOpen className="w-3 h-3" />;
      case 'reminder':
        return <Bell className="w-3 h-3" />;
      default:
        return <CalendarIcon className="w-3 h-3" />;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (compact) {
    // Compact mini calendar view
    const upcomingEvents = events
      .filter((e) => new Date(e.start_datetime) >= today)
      .slice(0, 5);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Upcoming Events
          </h3>
          <button
            onClick={syncCalendar}
            disabled={syncing}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Sync from deadlines"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No upcoming events
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left"
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: getEventColor(event) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.start_datetime).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {!event.all_day && (
                      <span className="ml-1">
                        {new Date(event.start_datetime).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={() => navigate('next')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Today
          </button>
          <button
            onClick={syncCalendar}
            disabled={syncing}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Sync from deadlines"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDay(day.date);
            const isToday =
              day.date.toDateString() === today.toDateString();

            return (
              <div
                key={index}
                className={`min-h-[80px] p-1 border border-gray-100 dark:border-gray-700 rounded-lg ${
                  day.isCurrentMonth
                    ? 'bg-white dark:bg-gray-800'
                    : 'bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div
                  className={`text-sm mb-1 ${
                    isToday
                      ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto'
                      : day.isCurrentMonth
                      ? 'text-gray-900 dark:text-white text-center'
                      : 'text-gray-400 dark:text-gray-500 text-center'
                  }`}
                >
                  {day.date.getDate()}
                </div>

                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="w-full text-left"
                    >
                      <div
                        className="text-xs px-1 py-0.5 rounded truncate text-white"
                        style={{ backgroundColor: getEventColor(event) }}
                      >
                        {event.title}
                      </div>
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{dayEvents.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
