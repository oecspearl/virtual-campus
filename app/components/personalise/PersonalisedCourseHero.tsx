'use client';

import React from 'react';

interface PersonalisedCourseHeroProps {
  title: string;
  goal: string;
  status: 'draft' | 'active' | 'archived';
  selectedCount: number;
  recsTotal: number;
  recsAcceptedCount: number;
  objectivesCount: number;
  llmProvider: string | null;
}

// Visually mirrors app/components/course/CourseHero so personalised paths feel
// like first-class courses: dark slate gradient with soft theme-coloured radial
// accents, pill chips for tags, big white tracking-tight title, learner goal as
// the description, meta strip across the bottom. Replaces the thumbnail slot
// with a generated theme-tinted card since personalised paths have no image.
function PersonalisedCourseHeroInner({
  title,
  goal,
  status,
  selectedCount,
  recsTotal,
  recsAcceptedCount,
  objectivesCount,
  llmProvider,
}: PersonalisedCourseHeroProps) {
  const statusLabel =
    status === 'draft' ? 'Draft — needs review'
    : status === 'active' ? 'Active'
    : 'Archived';

  const statusChip =
    status === 'draft' ? 'bg-amber-500/15 text-amber-200 border-amber-400/20'
    : status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
    : 'bg-white/10 text-white/70 border-white/10';

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full -translate-y-1/2 translate-x-1/3"
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 8%, transparent)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full translate-y-1/2 -translate-x-1/3"
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, transparent)' }}
      />

      <div className="relative px-6 sm:px-10 lg:px-12 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-10">
          {/* Theme-tinted graphic in place of a thumbnail */}
          <div className="shrink-0 order-1 lg:order-2 hidden sm:block">
            <div
              className="w-full sm:w-48 lg:w-44 h-28 lg:h-28 rounded-lg ring-1 ring-white/10 flex items-center justify-center relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 35%, #1e293b), color-mix(in srgb, var(--theme-primary) 12%, #0f172a))',
              }}
            >
              <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                <circle cx="6" cy="6.75" r="1.25" fill="currentColor" />
                <circle cx="6" cy="12" r="1.25" fill="currentColor" />
                <circle cx="6" cy="17.25" r="1.25" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div className="flex-1 order-2 lg:order-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${statusChip}`}>
                {statusLabel}
              </span>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 18%, transparent)',
                  color: 'color-mix(in srgb, var(--theme-primary) 80%, white)',
                  borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
                }}
              >
                Personalised
              </span>
              {llmProvider && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10 capitalize">
                  Assembled by {llmProvider}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-[28px] font-bold text-white leading-snug mb-2 tracking-tight">
              {title}
            </h1>

            <p className="text-sm text-white/60 leading-relaxed mb-4 max-w-2xl line-clamp-2 italic">
              &ldquo;{goal}&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-white/50">
              <span>{selectedCount} {selectedCount === 1 ? 'lesson' : 'lessons'}</span>
              {recsTotal > 0 && (
                <span>
                  {status === 'draft'
                    ? `${recsTotal} recommended`
                    : `${recsAcceptedCount} accepted addition${recsAcceptedCount === 1 ? '' : 's'}`}
                </span>
              )}
              {objectivesCount > 0 && (
                <span>{objectivesCount} {objectivesCount === 1 ? 'objective' : 'objectives'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PersonalisedCourseHero = React.memo(PersonalisedCourseHeroInner);
export default PersonalisedCourseHero;
