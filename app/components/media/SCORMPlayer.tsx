'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import LessonDiscussionsSidebar from '@/app/components/discussions/LessonDiscussionsSidebar';
import ResourceLinksSidebar from '@/app/components/lesson/ResourceLinksSidebar';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import AITutorPanel from '@/app/components/ai/AITutorPanel';
import { sanitizeHtml } from '@/lib/sanitize';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SCORMPlayerProps {
  packageUrl: string;
  scormPackageId: string;
  scormVersion: '1.2' | '2004';
  courseId?: string;
  lessonId?: string;
  /** When rendered inside a cross-tenant shared-course surface, the share id. */
  shareId?: string;
  title?: string;
  // Lesson metadata for context panels
  lessonTitle?: string;
  moduleTitle?: string;
  lessonDescription?: string;
  learningOutcomes?: string[];
  instructions?: string;
  lessonIndex?: number;
  totalLessons?: number;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
}

type PanelId = 'player' | 'outcomes' | 'instructions' | 'resources' | 'discussions' | 'ai-tutor';

// ─── Design Tokens ───────────────────────────────────────────────────────────

const T = {
  navy: '#111827', // bg-gray-900 — matches video player
  teal: '#1C8B63',
  tealLight: '#E1F5EE',
  tealText: '#085041',
  orange: '#D85A30',
  ctxbarH: 40, // matches video player tab bar h-10
};

// ─── CSS injected into the SCORM iframe to strip padding/max-width ───────────
// The SCO typically has body { padding: 12px } and .player { max-width: 1100px }
// which causes it to float as a centred card instead of filling the iframe.

const SCORM_IFRAME_RESET_CSS = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: auto !important;
  }
  body > *:first-child,
  .player,
  #player,
  .scorm-player,
  #scorm-player,
  .wrapper,
  #wrapper,
  .container,
  #container,
  .content,
  #content,
  main,
  [role="main"] {
    max-width: 100% !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
`;

// ─── SCORM API Adapter (synchronous cache + async flush) ─────────────────────

class SCORMAPIAdapter {
  private endpoint: string;
  private scormPackageId: string;
  private scormVersion: '1.2' | '2004';
  private courseId?: string;
  private lessonId?: string;
  initialized = false;
  private terminated = false;
  cache: Record<string, string> = {};
  private dirty: Set<string> = new Set();
  private lastError = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private onStateChange?: () => void;

  constructor(
    endpoint: string, scormPackageId: string, scormVersion: '1.2' | '2004',
    courseId?: string, lessonId?: string, onStateChange?: () => void,
  ) {
    this.endpoint = endpoint;
    this.scormPackageId = scormPackageId;
    this.scormVersion = scormVersion;
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.onStateChange = onStateChange;
  }

  private async serverCall(action: string, element?: string, value?: string): Promise<any> {
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, scormPackageId: this.scormPackageId, element, value, courseId: this.courseId, lessonId: this.lessonId }),
      });
      if (!res.ok) return { result: 'false' };
      return await res.json();
    } catch { return { result: 'false' }; }
  }

  async flush(): Promise<void> {
    if (this.dirty.size === 0) return;
    const entries = Array.from(this.dirty);
    this.dirty.clear();
    await Promise.allSettled(entries.map(k => this.serverCall('SetValue', k, this.cache[k])));
  }

  beaconFlush(): void {
    const entries = Array.from(this.dirty);
    for (const k of entries) {
      navigator.sendBeacon(this.endpoint, JSON.stringify({ action: 'SetValue', scormPackageId: this.scormPackageId, element: k, value: this.cache[k], courseId: this.courseId, lessonId: this.lessonId }));
    }
    if (this.initialized && !this.terminated) {
      navigator.sendBeacon(this.endpoint, JSON.stringify({ action: 'Commit', scormPackageId: this.scormPackageId, courseId: this.courseId, lessonId: this.lessonId }));
      navigator.sendBeacon(this.endpoint, JSON.stringify({ action: 'Terminate', scormPackageId: this.scormPackageId, courseId: this.courseId, lessonId: this.lessonId }));
    }
    this.dirty.clear();
    this.terminated = true;
  }

  startAutoFlush() { this.flushTimer = setInterval(() => this.flush().catch(() => {}), 30000); }
  stopAutoFlush() { if (this.flushTimer) { clearInterval(this.flushTimer); this.flushTimer = null; } }

  LMSInitialize(_p: string): string {
    if (this.initialized) return 'true';
    this.lastError = 0;
    this.initialized = true;
    this.serverCall('Initialize').then(res => {
      if (res.data) {
        const d = res.data;
        if (d.completion_status) this.cache['cmi.core.lesson_status'] = d.completion_status;
        if (d.score_raw != null) this.cache['cmi.core.score.raw'] = String(d.score_raw);
        if (d.location) this.cache['cmi.core.lesson_location'] = d.location;
        if (d.suspend_data) this.cache['cmi.suspend_data'] = d.suspend_data;
        if (d.total_time) this.cache['cmi.core.total_time'] = d.total_time;
        this.onStateChange?.();
      }
    }).catch(() => {});
    this.startAutoFlush();
    this.onStateChange?.();
    return 'true';
  }

  LMSFinish(_p: string): string {
    if (!this.initialized || this.terminated) return 'false';
    this.stopAutoFlush();
    this.flush().then(() => this.serverCall('Commit')).then(() => this.serverCall('Terminate')).catch(() => {});
    this.initialized = false;
    this.terminated = true;
    this.onStateChange?.();
    return 'true';
  }

  LMSGetValue(el: string): string {
    if (!this.initialized) { this.lastError = 301; return ''; }
    this.lastError = 0;
    return this.cache[el] || '';
  }

  LMSSetValue(el: string, v: string): string {
    if (!this.initialized) { this.lastError = 301; return 'false'; }
    this.lastError = 0;
    this.cache[el] = v;
    this.dirty.add(el);
    this.onStateChange?.();
    return 'true';
  }

  LMSCommit(_p: string): string {
    if (!this.initialized) return 'false';
    this.flush().catch(() => {});
    this.serverCall('Commit').catch(() => {});
    return 'true';
  }

  LMSGetLastError(): string { return String(this.lastError); }
  LMSGetErrorString(_c: string): string {
    const m: Record<number, string> = { 0: 'No error', 101: 'General exception', 201: 'Invalid argument', 301: 'Not initialized', 401: 'Not implemented' };
    return m[this.lastError] || 'Unknown error';
  }
  LMSGetDiagnostic(_c: string): string { return ''; }

  // SCORM 2004 aliases
  Initialize(p: string) { return this.LMSInitialize(p); }
  Terminate(p: string) { return this.LMSFinish(p); }
  GetValue(el: string) { return this.LMSGetValue(el); }
  SetValue(el: string, v: string) { return this.LMSSetValue(el, v); }
  Commit(p: string) { return this.LMSCommit(p); }
  GetLastError() { return this.LMSGetLastError(); }
  GetErrorString(c: string) { return this.LMSGetErrorString(c); }
  GetDiagnostic(c: string) { return this.LMSGetDiagnostic(c); }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusFromCache(c: Record<string, string>) {
  return c['cmi.core.lesson_status'] || c['cmi.completion_status'] || null;
}
function getScoreFromCache(c: Record<string, string>) {
  const r = c['cmi.core.score.raw'] || c['cmi.score.raw'];
  return r ? parseFloat(r) : null;
}
function getProgressFromCache(c: Record<string, string>) {
  const p = c['cmi.progress_measure'];
  return p ? Math.round(parseFloat(p) * 100) : null;
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60 | 0}s`;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function SCORMPlayer({
  packageUrl, scormPackageId, scormVersion, courseId, lessonId, shareId,
  title = 'SCORM Content',
  lessonTitle, moduleTitle, lessonDescription, learningOutcomes, instructions,
  lessonIndex = 0, totalLessons = 1, onMarkComplete, isCompleted = false,
}: SCORMPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const adapterRef = useRef<SCORMAPIAdapter | null>(null);
  const [, forceUpdate] = useState(0);
  const [activePanel, setActivePanel] = useState<PanelId>('player');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const elapsedRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const cache = adapterRef.current?.cache || {};
  const status = getStatusFromCache(cache);
  const score = getScoreFromCache(cache);
  const progress = getProgressFromCache(cache);
  const scormComplete = status === 'completed' || status === 'passed';
  const sessionActive = adapterRef.current?.initialized || false;
  const displayProgress = progress ?? (scormComplete ? 100 : (sessionActive ? 10 : 0));

  // ─── Inject CSS into iframe to strip SCO padding/max-width ──────────
  const injectIframeCSS = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      // Avoid double-injection
      if (doc.getElementById('lms-scorm-reset')) return;
      const style = doc.createElement('style');
      style.id = 'lms-scorm-reset';
      style.textContent = SCORM_IFRAME_RESET_CSS;
      doc.head.appendChild(style);
    } catch {
      // Cross-origin — nothing we can do; the serve proxy should make this same-origin
    }
  }, []);

  // Expose SCORM API
  const exposeAPI = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    const adapter = new SCORMAPIAdapter(
      '/api/scorm/runtime', scormPackageId, scormVersion, courseId, lessonId,
      () => forceUpdate(v => v + 1),
    );
    adapterRef.current = adapter;
    const a12 = {
      LMSInitialize: (p: string) => adapter.LMSInitialize(p),
      LMSFinish: (p: string) => adapter.LMSFinish(p),
      LMSGetValue: (e: string) => adapter.LMSGetValue(e),
      LMSSetValue: (e: string, v: string) => adapter.LMSSetValue(e, v),
      LMSCommit: (p: string) => adapter.LMSCommit(p),
      LMSGetLastError: () => adapter.LMSGetLastError(),
      LMSGetErrorString: (c: string) => adapter.LMSGetErrorString(c),
      LMSGetDiagnostic: (c: string) => adapter.LMSGetDiagnostic(c),
    };
    const a04 = {
      Initialize: (p: string) => adapter.Initialize(p),
      Terminate: (p: string) => adapter.Terminate(p),
      GetValue: (e: string) => adapter.GetValue(e),
      SetValue: (e: string, v: string) => adapter.SetValue(e, v),
      Commit: (p: string) => adapter.Commit(p),
      GetLastError: () => adapter.GetLastError(),
      GetErrorString: (c: string) => adapter.GetErrorString(c),
      GetDiagnostic: (c: string) => adapter.GetDiagnostic(c),
    };
    (window as any).API = a12;
    (window as any).API_1484_11 = a04;
  }, [scormPackageId, scormVersion, courseId, lessonId]);

  // Expose API immediately on mount — before iframe loads
  // SCORM content searches window.parent.API as soon as its scripts run.
  useEffect(() => {
    exposeAPI();

    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      setIsLoading(false);
      injectIframeCSS();
    };
    const onError = () => { setError('Failed to load SCORM content'); setIsLoading(false); };
    iframe.addEventListener('load', onLoad);
    iframe.addEventListener('error', onError);
    return () => {
      iframe.removeEventListener('load', onLoad);
      iframe.removeEventListener('error', onError);
      adapterRef.current?.stopAutoFlush();
      adapterRef.current?.beaconFlush();
      try { delete (window as any).API; delete (window as any).API_1484_11; } catch {}
    };
  }, [exposeAPI, injectIframeCSS]);

  // Elapsed timer
  useEffect(() => {
    if (sessionActive) elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [sessionActive]);

  // beforeunload
  useEffect(() => {
    const h = () => adapterRef.current?.beaconFlush();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const handleMarkComplete = () => {
    try {
      adapterRef.current?.LMSSetValue('cmi.core.lesson_status', 'completed');
      adapterRef.current?.LMSSetValue('cmi.completion_status', 'completed');
      adapterRef.current?.LMSCommit('');
    } catch {}
    onMarkComplete?.();
  };

  const handleReload = () => {
    setIsLoading(true);
    setError(null);
    adapterRef.current = null;
    if (iframeRef.current) iframeRef.current.src = packageUrl;
  };

  // ─── Context bar tabs config ──────────────────────────────────────────
  const ctxTabs: { id: PanelId; label: string; show: boolean }[] = [
    { id: 'outcomes', label: 'Outcomes', show: !!(learningOutcomes && learningOutcomes.length > 0) },
    { id: 'instructions', label: 'Instructions', show: !!instructions },
    { id: 'resources', label: 'Resources', show: true },
    { id: 'discussions', label: 'Discussions', show: true },
    { id: 'ai-tutor', label: 'AI Tutor', show: true },
  ];
  const visibleTabs = ctxTabs.filter(t => t.show);

  // ─── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: T.navy }}>
        <div className="text-center px-6 max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            </div>
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Content</h3>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <button onClick={handleReload} className="px-4 py-2 text-sm font-medium text-white rounded-full" style={{ background: T.teal }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────────────
  // Layout: Context tabs at top → iframe (fills remaining width) + right rail
  // No platform top bar or bottom bar — the SCO provides its own navigation.

  return (
    <div className="scorm-player flex flex-col overflow-hidden" style={{ height: '100%' }}>

      {/* ══════ Context Tab Bar ══════ */}
      <div
        className="flex items-center bg-white border-b border-gray-200 shrink-0 z-10 overflow-x-auto"
        style={{ height: T.ctxbarH }}
        role="tablist"
        aria-label="Lesson panels"
      >
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activePanel === tab.id}
            onClick={() => setActivePanel(activePanel === tab.id ? 'player' : tab.id)}
            className={`relative flex items-center gap-1.5 px-4 text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              activePanel === tab.id
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={{ height: T.ctxbarH }}
          >
            {tab.label}
            {tab.id === 'discussions' && hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: T.orange }} />
            )}
          </button>
        ))}

        {/* Right side: progress + mark complete + reload */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3 pr-2 shrink-0">
          {score !== null && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {score}%
            </span>
          )}
          <span className="text-xs text-gray-400 tabular-nums">{displayProgress}%</span>
          {sessionActive && (
            <span className="hidden sm:inline text-xs text-gray-400 tabular-nums">{fmtTime(elapsed)}</span>
          )}
          <button onClick={handleReload} className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title="Reload content">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {scormComplete || isCompleted ? (
            <span className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-gray-600 text-gray-400 cursor-default whitespace-nowrap">Completed</span>
          ) : (
            <button
              onClick={handleMarkComplete}
              className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Mark complete
            </button>
          )}
        </div>

        {/* Back to lesson link when a panel is open */}
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-gray-300 absolute top-2 left-1/2 -translate-x-1/2" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {activePanel === 'outcomes' && 'Learning Outcomes'}
                  {activePanel === 'instructions' && 'Instructions'}
                  {activePanel === 'resources' && 'Resources'}
                  {activePanel === 'discussions' && 'Discussions'}
                  {activePanel === 'ai-tutor' && 'AI Tutor'}
                </h3>
              </div>
              <button onClick={() => setActivePanel('player')} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {activePanel !== 'ai-tutor' && (
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
                {activePanel === 'resources' && courseId && lessonId && (
                  <div className="space-y-4 text-[12px]">
                    <ResourceLinksSidebar courseId={courseId} lessonId={lessonId} collapsible={false} />
                    <SessionRecordingsCard courseId={courseId} lessonId={lessonId} />
                  </div>
                )}
                {activePanel === 'discussions' && courseId && lessonId && (
                  <div className="text-[12px]">
                    <LessonDiscussionsSidebar courseId={courseId} lessonId={lessonId} />
                  </div>
                )}
              </div>
            )}
            {activePanel === 'ai-tutor' && lessonId && (
              <div className="flex-1 overflow-hidden min-h-[50vh]">
                <AITutorPanel lessonId={lessonId} courseId={courseId} shareId={shareId} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ BODY: SCORM iframe + Right Rail ══════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SCORM iframe — fills remaining space ── */}
        <div className="flex-1 min-w-0 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <div className="relative mx-auto mb-3">
                  <div className="w-10 h-10 border-2 border-gray-200 rounded-full" />
                  <div className="absolute inset-0 w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${T.teal} transparent transparent transparent` }} />
                </div>
                <p className="text-xs text-gray-500">Loading content...</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{title}</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={packageUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          />
        </div>

        {/* ── Right Rail (platform panel — outside the iframe) ── */}
        <div
          className="hidden lg:flex flex-col flex-shrink-0 border-l border-gray-200 bg-white overflow-hidden w-[320px] xl:w-[400px] 2xl:w-[490px]"
          role="tabpanel"
        >
          {activePanel === 'player' ? (
            /* Lesson info panel (default) */
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <h3 className="text-[13px] font-semibold text-gray-900">{lessonTitle || title}</h3>
                {lessonDescription && (
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{lessonDescription}</p>
                )}
              </div>

              {/* Progress card */}
              <div className="rounded-lg p-3" style={{ background: T.tealLight }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium" style={{ color: T.tealText }}>Progress</span>
                  <span className="text-[11px] font-semibold" style={{ color: T.tealText }}>{displayProgress}%</span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${displayProgress}%`, background: T.teal }} />
                </div>
              </div>

              {sessionActive && (
                <div className="space-y-2.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${scormComplete ? 'text-green-600' : 'text-blue-600'}`}>
                      {scormComplete ? 'Completed' : status === 'failed' ? 'Failed' : 'In progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Time spent</span>
                    <span className="text-gray-700 tabular-nums">{fmtTime(elapsed)}</span>
                  </div>
                  {score !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Score</span>
                      <span className="text-gray-700 font-medium">{score}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Version</span>
                    <span className="text-gray-700 font-mono text-[10px]">SCORM {scormVersion}</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick access</p>
                {visibleTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePanel(tab.id)}
                    className="w-full text-left px-2.5 py-2 rounded-md text-[12px] text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    {tab.label}
                    <span className="flex items-center">
                      {tab.id === 'discussions' && hasUnread && (
                        <span className="mr-1.5 w-1.5 h-1.5 rounded-full" style={{ background: T.orange }} />
                      )}
                      <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Context drawer panel */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {activePanel === 'outcomes' && 'Learning Outcomes'}
                  {activePanel === 'instructions' && 'Instructions'}
                  {activePanel === 'resources' && 'Resources'}
                  {activePanel === 'discussions' && 'Discussions'}
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

              {/* Drawer body (hidden when AI Tutor is active — it has its own layout) */}
              {activePanel !== 'ai-tutor' && <div className="flex-1 overflow-y-auto p-4">
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
                  <div
                    className="scorm-instructions text-[12px] text-gray-600 leading-relaxed"
                    style={{ lineHeight: 1.7 }}
                  >
                    <style>{`
                      .scorm-instructions h1, .scorm-instructions h2, .scorm-instructions h3, .scorm-instructions h4 {
                        font-size: 13px; font-weight: 600; color: #1f2937; margin: 16px 0 8px 0;
                      }
                      .scorm-instructions h1:first-child, .scorm-instructions h2:first-child, .scorm-instructions h3:first-child {
                        margin-top: 0;
                      }
                      .scorm-instructions p { margin: 0 0 10px 0; }
                      .scorm-instructions ul, .scorm-instructions ol { margin: 8px 0; padding-left: 20px; }
                      .scorm-instructions li { margin-bottom: 6px; padding-left: 4px; }
                      .scorm-instructions ol { list-style: none; counter-reset: step; padding-left: 0; }
                      .scorm-instructions ol li {
                        counter-increment: step; display: flex; align-items: flex-start; gap: 10px;
                        padding: 8px 0; border-bottom: 0.5px solid #f0f0f0;
                      }
                      .scorm-instructions ol li:last-child { border-bottom: none; }
                      .scorm-instructions ol li::before {
                        content: counter(step); flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
                        background: ${T.navy}; color: #fff; font-size: 11px; font-weight: 600;
                        display: flex; align-items: center; justify-content: center;
                      }
                      .scorm-instructions strong { color: #374151; font-weight: 600; }
                      .scorm-instructions a { color: ${T.teal}; text-decoration: underline; }
                      .scorm-instructions blockquote {
                        margin: 12px 0; padding: 10px 14px; border-left: 3px solid ${T.teal};
                        background: ${T.tealLight}; border-radius: 0 8px 8px 0; font-size: 12px; color: ${T.tealText};
                      }
                      .scorm-instructions code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 11px; }
                      .scorm-instructions img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
                      .scorm-instructions table { width: 100%; font-size: 11px; border-collapse: collapse; margin: 8px 0; }
                      .scorm-instructions th, .scorm-instructions td { padding: 6px 8px; border-bottom: 0.5px solid #e5e7eb; text-align: left; }
                      .scorm-instructions th { font-weight: 600; color: #374151; background: #f9fafb; }
                    `}</style>
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(instructions) }} />
                  </div>
                )}

                {/* Resources */}
                {activePanel === 'resources' && courseId && lessonId && (
                  <div className="space-y-4 text-[12px]">
                    <ResourceLinksSidebar courseId={courseId} lessonId={lessonId} collapsible={false} />
                    <SessionRecordingsCard courseId={courseId} lessonId={lessonId} />
                  </div>
                )}

                {/* Discussions */}
                {activePanel === 'discussions' && courseId && lessonId && (
                  <div className="text-[12px]">
                    <LessonDiscussionsSidebar courseId={courseId} lessonId={lessonId} />
                  </div>
                )}
              </div>}

              {/* AI Tutor — fills drawer, has its own scroll */}
              {activePanel === 'ai-tutor' && lessonId && (
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
