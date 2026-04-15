'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface GamificationData {
  xpTotal: number;
  level: number;
  streakCount: number;
}

export default function GamificationInline() {
  const [data, setData] = useState<GamificationData | null>(null);

  useEffect(() => {
    fetch('/api/gamification/profile')
      .then(res => res.ok ? res.json() : null)
      .then(d => { if (d && typeof d.level === 'number') setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full">
        <Icon icon="mdi:star-circle" className="w-4 h-4 text-indigo-500" />
        <span className="text-xs font-semibold text-indigo-700">Level {data.level}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full">
        <Icon icon="mdi:lightning-bolt" className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-amber-700">{(data.xpTotal ?? 0).toLocaleString()} XP</span>
      </div>
      {data.streakCount > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full">
          <Icon icon="mdi:fire" className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-semibold text-orange-700">{data.streakCount}-day streak</span>
        </div>
      )}
    </div>
  );
}
