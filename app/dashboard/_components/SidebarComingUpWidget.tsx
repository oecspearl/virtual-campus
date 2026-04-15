'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  source_type: string | null;
  start_datetime: string;
  all_day: boolean;
}

function getEventIcon(eventType: string, sourceType: string | null): string {
  if (sourceType === 'assignment') return 'mdi:clipboard-text-outline';
  if (sourceType === 'quiz') return 'mdi:help-circle-outline';
  if (eventType === 'class') return 'mdi:school-outline';
  if (eventType === 'study') return 'mdi:book-open-variant';
  return 'mdi:calendar-outline';
}

function getEventColor(eventType: string, sourceType: string | null): string {
  if (sourceType === 'assignment') return 'text-orange-500';
  if (sourceType === 'quiz') return 'text-purple-500';
  if (eventType === 'class') return 'text-blue-500';
  if (eventType === 'study') return 'text-green-500';
  return 'text-gray-400';
}

function formatEventTime(dateStr: string, allDay: boolean): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (allDay) {
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

export default function SidebarComingUpWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    fetch(`/api/student/calendar?start=${now.toISOString()}&end=${end.toISOString()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setEvents((data.events || []).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon="mdi:calendar-clock" className="w-4 h-4 text-green-500" />
          Coming Up
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : events.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No upcoming events this week
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-2.5">
                <Icon
                  icon={getEventIcon(event.event_type, event.source_type)}
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getEventColor(event.event_type, event.source_type)}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-tight line-clamp-1">{event.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatEventTime(event.start_datetime, event.all_day)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {events.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <Link href="/student/calendar" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View Calendar →
          </Link>
        </div>
      )}
    </div>
  );
}
