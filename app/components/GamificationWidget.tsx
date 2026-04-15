"use client";

import React from "react";

export default function GamificationWidget() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{ xpTotal: number; level: number; streakCount: number } | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/gamification/profile', { cache: 'no-store' });
        if (!active) return;
        if (!res.ok) {
          setError('Failed to load gamification profile');
          return;
        }
        const d = await res.json();
        setData({ xpTotal: d.xpTotal, level: d.level, streakCount: d.streakCount });
      } catch (e) {
        setError('Failed to load gamification profile');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">Loading gamification…</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    );
  }

  const xp = data?.xpTotal ?? 0;
  const level = data?.level ?? 1;
  const streak = data?.streakCount ?? 0;
  const nextLevelAt = (Math.floor(xp / 1000) + 1) * 1000;
  const progress = Math.min(100, Math.floor(((xp % 1000) / 1000) * 100));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold text-gray-900">Your Progress</div>
        <div className="text-xs text-gray-500">Next level at {nextLevelAt} XP</div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{level}</div>
          <div className="text-xs text-gray-600">Level</div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{xp}</div>
          <div className="text-xs text-gray-600">Total XP</div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-orange-700">{streak}</div>
          <div className="text-xs text-gray-600">Day Streak</div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Level {Math.floor(xp / 1000)}</span>
          <span>{progress}%</span>
          <span>Level {Math.floor(xp / 1000) + 1}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-blue-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}


