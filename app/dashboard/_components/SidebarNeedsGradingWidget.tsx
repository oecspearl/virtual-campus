'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface PendingItem {
  assignment_id: string;
  assignment_title: string;
  course_title: string;
  pending_count: number;
}

export default function SidebarNeedsGradingWidget() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/instructor/pending-grading')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data)) {
          setItems(data.slice(0, 7));
        } else if (data?.items && Array.isArray(data.items)) {
          setItems(data.items.slice(0, 7));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon="mdi:clipboard-check-outline" className="w-4 h-4 text-orange-500" />
          Needs Grading
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            All caught up!
          </div>
        ) : (
          items.map((item, idx) => (
            <Link
              key={item.assignment_id || idx}
              href={`/assignments/${item.assignment_id}/submissions`}
              className="block px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-tight line-clamp-1">
                    {item.assignment_title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                    {item.course_title}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 flex-shrink-0">
                  {item.pending_count}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
      {items.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <Link href="/assignments" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View All Assignments →
          </Link>
        </div>
      )}
    </div>
  );
}
