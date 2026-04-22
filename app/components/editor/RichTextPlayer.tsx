'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import VideoPlayer from '@/app/components/media/VideoPlayer';
import AudioPlayer from '@/app/components/media/AudioPlayer';
import SlideshowViewer from '@/app/components/media/SlideshowViewer';
import QuizStatusButton from '@/app/components/quiz/QuizStatusButton';
import LessonDiscussionsSidebar from '@/app/components/discussions/LessonDiscussionsSidebar';
import ResourceLinksSidebar from '@/app/components/lesson/ResourceLinksSidebar';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import AITutorPanel from '@/app/components/ai/AITutorPanel';
import InlineNotesPanel from '@/app/components/lesson/InlineNotesPanel';
import { sanitizeHtml } from '@/lib/sanitize';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RichTextPlayerProps {
  courseId: string;
  lessonId: string;
  /** When rendered on a cross-tenant shared-course surface, the share id. */
  shareId?: string;
  lessonTitle: string;
  courseTitle?: string;
  lessonDescription?: string;
  learningOutcomes?: string[];
  instructions?: string;
  content: any[];
  lessonIndex: number;
  totalLessons: number;
  isCompleted: boolean;
  isCompleting: boolean;
  isInstructor: boolean;
  onMarkComplete: () => void;
  onNavigate: (lessonId: string) => void;
  onContentUpdate?: () => void;
  prevLessonId?: string | null;
  nextLessonId?: string | null;
  courseLessons: { id: string; title: string; content_type?: string }[];
  lessonProgressMap: Record<string, boolean>;
}

type PanelId = 'player' | 'outcomes' | 'instructions' | 'resources' | 'discussions' | 'notes' | 'ai-tutor';

// ─── Design Tokens (matches SCORM/Video players) ─────────────────────────────

const T = {
  navy: '#111827', // bg-gray-900 — matches video player
  teal: '#1C8B63',
  tealLight: '#E1F5EE',
  tealText: '#085041',
  orange: '#D85A30',
  navH: 48,
  ctxbarH: 40, // matches video player tab bar h-10
};

// ─── Section helpers ─────────────────────────────────────────────────────────

function extractSections(content: any[]): { index: number; title: string }[] {
  const sections: { index: number; title: string }[] = [];
  content.forEach((item, i) => {
    if (item.title) {
      sections.push({ index: i, title: item.title });
    } else {
      sections.push({ index: i, title: `Section ${i + 1}` });
    }
  });
  return sections;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function RichTextPlayer({
  courseId, lessonId, shareId, lessonTitle, courseTitle, lessonDescription,
  learningOutcomes, instructions, content, lessonIndex, totalLessons,
  isCompleted, isCompleting, isInstructor, onMarkComplete, onNavigate,
  onContentUpdate, prevLessonId, nextLessonId,
  courseLessons, lessonProgressMap,
}: RichTextPlayerProps) {
  const [activePanel, setActivePanel] = useState<PanelId>('player');
  const [currentSection, setCurrentSection] = useState(0);
  const [readSections, setReadSections] = useState<Set<number>>(() => {
    // Restore from sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`rtp-read-${lessonId}`);
        return saved ? new Set(JSON.parse(saved)) : new Set([0]);
      } catch { return new Set([0]); }
    }
    return new Set([0]);
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const sections = extractSections(content);
  const completedCount = courseLessons.filter(l => lessonProgressMap[l.id]).length;
  const courseProgress = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
  const sectionProgress = content.length > 0 ? Math.round((readSections.size / content.length) * 100) : 100;

  // Persist read sections
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`rtp-read-${lessonId}`, JSON.stringify([...readSections]));
    }
  }, [readSections, lessonId]);

  // Mark section as read when navigating
  const goToSection = useCallback((idx: number) => {
    setCurrentSection(idx);
    setReadSections(prev => new Set([...prev, idx]));
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Tab config
  const ctxTabs: { id: PanelId; label: string; show: boolean }[] = [
    { id: 'outcomes', label: 'Outcomes', show: !!(learningOutcomes && learningOutcomes.length > 0) },
    { id: 'instructions', label: 'Instructions', show: !!instructions },
    { id: 'resources', label: 'Resources', show: true },
    { id: 'discussions', label: 'Discussions', show: true },
    { id: 'notes', label: 'Notes', show: true },
    { id: 'ai-tutor', label: 'AI Tutor', show: true },
  ];
  const visibleTabs = ctxTabs.filter(t => t.show);

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100%' }}>

      {/* ══════ Top Nav Bar — matches video player ══════ */}
      <div className="h-12 flex items-center justify-between px-2 sm:px-4 bg-gray-900 flex-shrink-0 z-20">
        {/* Left: back + breadcrumb */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 mr-2 text-white">
          <Link href={`/course/${courseId}`} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
            <span className="hidden sm:inline truncate max-w-[180px]">{courseTitle || 'Course'}</span>
          </Link>
          <span className="text-gray-600 hidden sm:inline">/</span>
          <span className="text-white text-sm font-medium truncate">{lessonTitle}</span>
        </div>

        {/* Right: progress + nav + mark complete */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <span className="text-gray-400 text-sm tabular-nums">{courseProgress}%</span>
          <button
            onClick={() => prevLessonId && onNavigate(prevLessonId)}
            disabled={!prevLessonId}
            className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => nextLessonId && onNavigate(nextLessonId)}
            disabled={!nextLessonId}
            className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          {isCompleted ? (
            <span className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-gray-600 text-gray-400 cursor-default whitespace-nowrap">Completed</span>
          ) : (
            <button
              onClick={onMarkComplete}
              disabled={isCompleting}
              className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:bg-gray-600 disabled:text-gray-400 whitespace-nowrap cursor-pointer"
            >
              {isCompleting ? 'Saving...' : 'Mark complete'}
            </button>
          )}
          {isInstructor && (
            <Link href={`/lessons/${lessonId}/edit`} className="text-gray-400 hover:text-white transition-colors" title="Edit lesson">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </Link>
          )}
        </div>
      </div>

      {/* ══════ Tab Bar — matches video player style ══════ */}
      <div
        className="flex items-center bg-white border-b border-gray-200 shrink-0 z-10 overflow-x-auto"
        style={{ height: T.ctxbarH }}
        role="tablist"
      >
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activePanel === tab.id}
            onClick={() => setActivePanel(activePanel === tab.id ? 'player' : tab.id)}
            className={`flex items-center gap-1.5 px-4 text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              activePanel === tab.id
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={{ height: T.ctxbarH }}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-xs">{tab.label}</span>
          </button>
        ))}

        {/* Section progress */}
        <div className="ml-auto flex items-center gap-2 pr-3 shrink-0">
          <span className="text-xs text-gray-400 tabular-nums">{sectionProgress}%</span>
        </div>

        {activePanel !== 'player' && (
          <button
            onClick={() => setActivePanel('player')}
            className="px-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 whitespace-nowrap shrink-0 cursor-pointer"
            style={{ height: T.ctxbarH }}
          >
            ← Lesson
          </button>
        )}
      </div>

      {/* ══════ Mobile tab content sheet (below lg) ══════ */}
      {activePanel !== 'player' && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setActivePanel('player')}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-gray-300 absolute top-2 left-1/2 -translate-x-1/2" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {activePanel === 'outcomes' && 'Learning Outcomes'}
                  {activePanel === 'instructions' && 'Instructions'}
                  {activePanel === 'resources' && 'Resources'}
                  {activePanel === 'discussions' && 'Discussions'}
                  {activePanel === 'notes' && 'Notes'}
                  {activePanel === 'ai-tutor' && 'AI Tutor'}
                </h3>
              </div>
              <button onClick={() => setActivePanel('player')} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Sheet body */}
            {activePanel !== 'ai-tutor' && activePanel !== 'notes' && (
              <div className="flex-1 overflow-y-auto p-4">
                {activePanel === 'outcomes' && learningOutcomes && (
                  <div className="space-y-0">
                    {learningOutcomes.map((outcome, i) => (
                      <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: '#f0f0f0' }}>
                        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: T.tealLight, color: T.tealText }}>{i + 1}</span>
                        <span className="text-[12px] text-gray-600 leading-relaxed pt-1">{outcome}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activePanel === 'instructions' && instructions && (
                  <div className="text-[12px] text-gray-600 leading-relaxed prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(instructions) }} />
                  </div>
                )}
                {activePanel === 'resources' && (
                  <div className="space-y-4 text-[12px]">
                    <ResourceLinksSidebar courseId={courseId} lessonId={lessonId} collapsible={false} />
                    <SessionRecordingsCard courseId={courseId} lessonId={lessonId} />
                  </div>
                )}
                {activePanel === 'discussions' && (
                  <div className="text-[12px]">
                    <LessonDiscussionsSidebar courseId={courseId} lessonId={lessonId} />
                  </div>
                )}
              </div>
            )}
            {activePanel === 'notes' && (
              <div className="flex-1 overflow-hidden min-h-[50vh]">
                <InlineNotesPanel lessonId={lessonId} courseId={courseId} />
              </div>
            )}
            {activePanel === 'ai-tutor' && (
              <div className="flex-1 overflow-hidden min-h-[50vh]">
                <AITutorPanel lessonId={lessonId} courseId={courseId} shareId={shareId} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ BODY: Sections sidebar + Content + Right Rail ══════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Section navigation ── */}
        {sections.length > 1 && (
          <div className="hidden lg:flex flex-col shrink-0 bg-gray-50 border-r border-gray-200 overflow-hidden w-[160px] xl:w-[200px]">
            <div className="px-3 pt-3 pb-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Sections ({sections.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sections.map((sec, i) => {
                const isRead = readSections.has(i);
                const isCurrent = i === currentSection;
                return (
                  <button
                    key={i}
                    onClick={() => goToSection(i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] transition-colors border-l-2 cursor-pointer ${
                      isCurrent
                        ? 'text-gray-900 bg-white border-gray-900 font-medium'
                        : isRead
                          ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-transparent'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 border-transparent'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-gray-900 text-white'
                        : isRead
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isRead && !isCurrent ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="truncate leading-snug">{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Centre: Content area ── */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-white" ref={contentRef}>
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
            {/* Section title */}
            {sections.length > 1 && sections[currentSection] && (
              <div className="mb-6">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                  Section {currentSection + 1} of {sections.length}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">{sections[currentSection].title}</h2>
              </div>
            )}

            {/* Lesson description (only on first section) */}
            {currentSection === 0 && lessonDescription && (
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">{lessonDescription}</p>
            )}

            {/* Content — rendered as clean HTML, no card wrapper */}
            {content.length > 0 ? (
              (() => {
                const items = sections.length > 1 ? [content[currentSection]] : content;
                return (
                  <div className="space-y-8">
                    {items.map((item: any, i: number) => {
                      const html = typeof item.data === 'string'
                        ? item.data
                        : (item.data?.html || item.data?.content || '');
                      const key = sections.length > 1 ? currentSection : i;

                      return (
                        <div key={key}>
                          {/* ── Text / Rich Text ── */}
                          {(item.type === 'text' || item.type === 'label' || !item.type) && html && (
                            <div
                              className="prose prose-sm sm:prose-base max-w-none
                                prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:tracking-tight
                                prose-p:text-gray-700 prose-p:leading-relaxed
                                prose-li:text-gray-700
                                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                                prose-blockquote:border-l-teal-500 prose-blockquote:bg-teal-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                                prose-strong:text-gray-900
                                prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                                prose-img:rounded-lg prose-img:shadow-sm
                                prose-table:text-sm
                                prose-th:bg-gray-50 prose-th:font-semibold
                                prose-td:border-gray-200"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
                            />
                          )}

                          {/* ── Video ── */}
                          {item.type === 'video' && (item.data?.url || typeof item.data === 'string') && (
                            <div className="rounded-lg overflow-hidden bg-black">
                              <VideoPlayer
                                src={item.data?.url || item.data}
                                title={item.data?.title || item.title || 'Video'}
                                lessonId={lessonId}
                                courseId={courseId}
                              />
                            </div>
                          )}

                          {/* ── Audio ── */}
                          {item.type === 'audio' && (item.data?.url || typeof item.data === 'string') && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                              {item.title && <p className="text-sm font-medium text-gray-900 mb-3">{item.title}</p>}
                              <AudioPlayer
                                src={item.data?.url || item.data}
                                title={item.data?.title || item.title || 'Audio'}
                              />
                            </div>
                          )}

                          {/* ── Image ── */}
                          {item.type === 'image' && (item.data?.url || item.data?.src) && (
                            <figure>
                              <img
                                src={item.data.url || item.data.src}
                                alt={item.data.alt || item.title || ''}
                                className="rounded-lg shadow-sm max-w-full"
                              />
                              {item.data.caption && (
                                <figcaption className="text-[12px] text-gray-500 mt-2 text-center">{item.data.caption}</figcaption>
                              )}
                            </figure>
                          )}

                          {/* ── PDF ── */}
                          {item.type === 'pdf' && (item.data?.url || typeof item.data === 'string') && (
                            <div className="rounded-lg overflow-hidden border border-gray-200">
                              <iframe
                                src={item.data?.url || item.data}
                                title={item.title || 'PDF Document'}
                                className="w-full border-0"
                                style={{ minHeight: 600 }}
                              />
                            </div>
                          )}

                          {/* ── Slideshow ── */}
                          {item.type === 'slideshow' && (item.data?.url || typeof item.data === 'string') && (
                            <SlideshowViewer url={item.data?.url || item.data} title={item.title} />
                          )}

                          {/* ── Quiz ── */}
                          {item.type === 'quiz' && item.data?.quizId && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.title || 'Quiz'}</p>
                                  <p className="text-[12px] text-gray-500 mt-0.5">Test your knowledge</p>
                                </div>
                                <QuizStatusButton quizId={item.data.quizId} quiz={item.data} />
                              </div>
                            </div>
                          )}

                          {/* ── Assignment ── */}
                          {item.type === 'assignment' && item.data?.assignmentId && (
                            <Link
                              href={`/assignment/${item.data.assignmentId}`}
                              className="flex items-center gap-3 px-5 py-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors no-underline"
                            >
                              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.title || 'Assignment'}</p>
                                <p className="text-[12px] text-blue-600">Open assignment</p>
                              </div>
                            </Link>
                          )}

                          {/* ── Survey ── */}
                          {item.type === 'survey' && item.data?.surveyId && (
                            <Link
                              href={`/surveys/${item.data.surveyId}`}
                              className="flex items-center gap-3 px-5 py-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors no-underline"
                            >
                              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.title || 'Survey'}</p>
                                <p className="text-[12px] text-purple-600">Take survey</p>
                              </div>
                            </Link>
                          )}

                          {/* ── File download ── */}
                          {item.type === 'file' && item.data?.url && (
                            <a
                              href={item.data.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors no-underline"
                            >
                              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.data.name || item.title || 'Download file'}</p>
                                {item.data.size && <p className="text-[11px] text-gray-400">{item.data.size}</p>}
                              </div>
                            </a>
                          )}

                          {/* ── Embed ── */}
                          {item.type === 'embed' && item.data?.url && (
                            <div className="rounded-lg overflow-hidden border border-gray-200">
                              <iframe
                                src={item.data.url}
                                title={item.title || 'Embedded content'}
                                className="w-full border-0"
                                style={{ minHeight: 400 }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No content available for this lesson.</p>
              </div>
            )}

            {/* Section navigation (multi-section only) */}
            {sections.length > 1 && (
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                <button
                  onClick={() => goToSection(currentSection - 1)}
                  disabled={currentSection === 0}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                  Previous section
                </button>
                <span className="text-[11px] text-gray-400 tabular-nums">{currentSection + 1} / {sections.length}</span>
                <button
                  onClick={() => goToSection(currentSection + 1)}
                  disabled={currentSection >= sections.length - 1}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next section
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Rail ── */}
        <div
          className="hidden lg:flex flex-col flex-shrink-0 border-l border-gray-200 bg-white overflow-hidden w-[320px] xl:w-[400px] 2xl:w-[490px]"
          role="tabpanel"
        >
          {activePanel === 'player' ? (
            /* Default: lesson info + course progress */
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">{lessonTitle}</h3>
                {lessonDescription && (
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{lessonDescription}</p>
                )}
              </div>

              {/* Section progress */}
              <div className="rounded-lg p-3" style={{ background: T.tealLight }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium" style={{ color: T.tealText }}>Progress</span>
                  <span className="text-[11px] font-semibold" style={{ color: T.tealText }}>{sectionProgress}%</span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${sectionProgress}%`, background: T.teal }} />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                    {isCompleted ? 'Completed' : 'In progress'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Sections read</span>
                  <span className="text-gray-700 tabular-nums">{readSections.size} / {Math.max(sections.length, 1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Lesson</span>
                  <span className="text-gray-700 tabular-nums">{lessonIndex + 1} of {totalLessons}</span>
                </div>
              </div>

              {/* Course progress list */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Course Progress</p>
                <div className="space-y-0.5">
                  {courseLessons.map((l, i) => {
                    const done = lessonProgressMap[l.id] || false;
                    const isCurrent = l.id === lessonId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => onNavigate(l.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-gray-100 font-medium text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isCurrent ? 'bg-gray-900 text-white' : done ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {done && !isCurrent ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          ) : (i + 1)}
                        </span>
                        <span className="truncate">{l.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick access */}
              <div className="pt-3 border-t border-gray-100 space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick access</p>
                {visibleTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePanel(tab.id)}
                    className="w-full text-left px-2.5 py-2 rounded-md text-[12px] text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    {tab.label}
                    <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Context drawer */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {activePanel === 'outcomes' && 'Learning Outcomes'}
                  {activePanel === 'instructions' && 'Instructions'}
                  {activePanel === 'resources' && 'Resources'}
                  {activePanel === 'discussions' && 'Discussions'}
                  {activePanel === 'notes' && 'Notes'}
                  {activePanel === 'ai-tutor' && 'AI Tutor'}
                </h3>
                <button
                  onClick={() => setActivePanel('player')}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100 cursor-pointer"
                  aria-label="Close panel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer body (hidden for AI Tutor — it has its own layout) */}
              {activePanel !== 'ai-tutor' && activePanel !== 'notes' && <div className="flex-1 overflow-y-auto p-4">
                {/* Outcomes */}
                {activePanel === 'outcomes' && learningOutcomes && (
                  <div className="space-y-0">
                    {learningOutcomes.map((outcome, i) => (
                      <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: '#f0f0f0' }}>
                        <span
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: T.tealLight, color: T.tealText }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-[12px] text-gray-600 leading-relaxed pt-1">{outcome}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Instructions */}
                {activePanel === 'instructions' && instructions && (
                  <div className="text-[12px] text-gray-600 leading-relaxed prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(instructions) }} />
                  </div>
                )}

                {/* Resources */}
                {activePanel === 'resources' && (
                  <div className="space-y-4 text-[12px]">
                    <ResourceLinksSidebar courseId={courseId} lessonId={lessonId} collapsible={false} />
                    <SessionRecordingsCard courseId={courseId} lessonId={lessonId} />
                  </div>
                )}

                {/* Discussions */}
                {activePanel === 'discussions' && (
                  <div className="text-[12px]">
                    <LessonDiscussionsSidebar courseId={courseId} lessonId={lessonId} />
                  </div>
                )}
              </div>}

              {/* Notes — fills drawer */}
              {activePanel === 'notes' && (
                <div className="flex-1 overflow-hidden">
                  <InlineNotesPanel lessonId={lessonId} courseId={courseId} />
                </div>
              )}

              {/* AI Tutor — fills drawer */}
              {activePanel === 'ai-tutor' && (
                <div className="flex-1 overflow-hidden">
                  <AITutorPanel lessonId={lessonId} courseId={courseId} shareId={shareId} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
