'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import TextEditor from '@/app/components/editor/TextEditor';
import FileUpload, { UploadResult } from '@/app/components/file-upload/FileUpload';
import RoleGuard from '@/app/components/RoleGuard';
import QuizSelectorModal from '@/app/components/quiz/QuizSelectorModal';
import SurveySelectorModal from '@/app/components/SurveySelectorModal';
import LibraryResourcePicker from '@/app/components/LibraryResourcePicker';
import { Icon } from '@iconify/react';
import ContentBlockEditor from './_components/ContentBlockEditor';
import VideoModeEditor from './_components/VideoModeEditor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContentItem = {
  type: 'video'|'text'|'slideshow'|'file'|'embed'|'quiz'|'survey'|'assignment'|'image'|'pdf'|'audio'|'interactive_video'|'code_sandbox'|'label'|'whiteboard'|'3d_model';
  title: string;
  data: any;
  id?: string;
};

type TabId = 'content' | 'details' | 'outcomes' | 'resources';

export default function EditLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = id;

  // ─── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabId>('content');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [difficulty, setDifficulty] = React.useState(1);
  const [outcomes, setOutcomes] = React.useState<string[]>([]);
  const [newOutcome, setNewOutcome] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [content, setContent] = React.useState<ContentItem[]>([]);
  const [resources, setResources] = React.useState<any[]>([]);
  const [estimated, setEstimated] = React.useState(0);
  const [published, setPublished] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [courseId, setCourseId] = React.useState<string | null>(null);
  const [contentType, setContentType] = React.useState<'rich_text' | 'scorm' | 'video' | 'quiz' | 'assignment'>('rich_text');
  const [scormPackage, setScormPackage] = React.useState<any>(null);
  const [uploadingSCORM, setUploadingSCORM] = React.useState(false);
  const [quizSelectorOpen, setQuizSelectorOpen] = React.useState(false);
  const [quizSelectorIndex, setQuizSelectorIndex] = React.useState<number | null>(null);
  const [surveySelectorOpen, setSurveySelectorOpen] = React.useState(false);
  const [surveySelectorIndex, setSurveySelectorIndex] = React.useState<number | null>(null);
  const [generatingChapters, setGeneratingChapters] = React.useState(false);
  const [libraryPickerOpen, setLibraryPickerOpen] = React.useState(false);
  const [attachedLibResources, setAttachedLibResources] = React.useState<any[]>([]);
  const [loadingLibResources, setLoadingLibResources] = React.useState(false);

  // ─── Library resources ──────────────────────────────────────────────────
  const loadLibraryResources = React.useCallback(async () => {
    if (!courseId) return;
    setLoadingLibResources(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-resources?lessonId=${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setAttachedLibResources(data.attachments || []);
      }
    } catch (err) {
      console.error('Error loading library resources:', err);
    } finally {
      setLoadingLibResources(false);
    }
  }, [courseId, lessonId]);

  React.useEffect(() => {
    if (courseId) loadLibraryResources();
  }, [courseId, loadLibraryResources]);

  const handleAttachLibResources = async (resourceIds: string[]) => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/library-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_ids: resourceIds, lesson_id: lessonId }),
      });
      if (res.ok) loadLibraryResources();
    } catch (err) {
      console.error('Error attaching library resources:', err);
    }
  };

  const handleDetachLibResource = async (attachmentId: string) => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/library-resources?attachment_id=${attachmentId}`, { method: 'DELETE' });
      if (res.ok) setAttachedLibResources(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Error detaching library resource:', err);
    }
  };

  // ─── Load lesson data ───────────────────────────────────────────────────
  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setDifficulty(Number(data.difficulty || 1));
        setOutcomes(Array.isArray(data.learning_outcomes) ? data.learning_outcomes : []);
        setInstructions(String(data.lesson_instructions || ''));
        setContent(Array.isArray(data.content) ? data.content : []);
        setResources(Array.isArray(data.resources) ? data.resources : []);
        setEstimated(Number(data.estimated_time || 0));
        setPublished(Boolean(data.published));
        setCourseId(data.course_id || null);
        setContentType(data.content_type || 'rich_text');

        if (data.content_type === 'scorm') {
          const scormRes = await fetch(`/api/scorm/package/${lessonId}`, { cache: 'no-store' });
          if (scormRes.ok) {
            const scormData = await scormRes.json();
            setScormPackage(scormData.scormPackage);
          }
        }
      }
      setLoading(false);
    })();
  }, [lessonId]);

  // ─── Content helpers ────────────────────────────────────────────────────
  const addOutcome = () => {
    if (!newOutcome.trim()) return;
    setOutcomes([...outcomes, newOutcome.trim()]);
    setNewOutcome('');
  };
  const delOutcome = (idx: number) => setOutcomes(outcomes.filter((_, i) => i !== idx));

  const addBlock = (type: ContentItem['type']) => {
    let initialData: any = '';
    let initialTitle = type.toUpperCase().replace('_', ' ');
    if (type === 'text') initialData = '<p></p>';
    else if (type === 'code_sandbox') initialData = { language: 'javascript', code: '', instructions: '', readOnly: false };
    else if (type === 'label') { initialData = { text: '', style: 'heading', size: 'medium' }; initialTitle = 'Section Label'; }
    else if (type === 'whiteboard') { initialData = { whiteboard_id: null, elements: [], app_state: {}, mode: 'collaborate' }; initialTitle = 'Whiteboard'; }
    else if (type === '3d_model') { initialData = { url: '', iosUrl: '', posterUrl: '', alt: '', enableAR: true, autoRotate: false, instructions: '', instructionsPosition: 'before' }; initialTitle = '3D Model'; }
    setContent([...content, { type, title: initialTitle, data: initialData, id: `${type}-${Date.now()}` }]);
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const arr = [...content];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    const tmp = arr[idx]; arr[idx] = arr[swap]; arr[swap] = tmp;
    setContent(arr);
  };
  const delBlock = (idx: number) => setContent(content.filter((_, i) => i !== idx));

  const onFileUploaded = (idx: number) => (res: UploadResult) => {
    const arr = [...content];
    arr[idx] = { ...arr[idx], data: { fileId: res.fileId, fileName: res.fileName, url: res.fileUrl, fileSize: res.fileSize, fileType: res.fileType } };
    setContent(arr);
  };

  // ─── Save ───────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, difficulty,
          learning_outcomes: outcomes,
          lesson_instructions: instructions,
          content, resources,
          estimated_time: estimated,
          published,
          content_type: contentType,
        }),
      });
      if (response.ok) {
        if (courseId) router.push(`/course/${courseId}/lesson/${lessonId}`);
        else { alert('Lesson saved successfully!'); router.back(); }
      } else {
        // Surface the actual server error instead of a generic message —
        // hides bugs like permission failures behind "Please try again".
        const data = await response.json().catch(() => ({}));
        const detail = data?.error || `Server returned ${response.status}`;
        console.error('Failed to save lesson:', { status: response.status, detail, body: data });
        alert(`Failed to save lesson: ${detail}`);
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert(`An error occurred while saving the lesson: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (courseId) router.push(`/course/${courseId}/lesson/${lessonId}`);
    else router.back();
  };

  if (loading) return null;

  // ─── Tab config ─────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'content', label: 'Content', count: content.length },
    { id: 'details', label: 'Details' },
    { id: 'outcomes', label: 'Outcomes & Instructions', count: outcomes.length },
    { id: 'resources', label: 'Resources', count: attachedLibResources.length },
  ];

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <RoleGuard
      roles={["instructor", "curriculum_designer", "admin", "super_admin"]}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to edit lessons.</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* ══════ Top header ══════ */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* Title row */}
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={goBack} className="flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <div className="w-px h-5 bg-gray-200" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold text-gray-900 bg-transparent border-0 outline-none focus:ring-0 truncate min-w-0"
                  placeholder="Untitled Lesson"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 mr-3">
                  <input
                    id="pub-header"
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="h-3.5 w-3.5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="pub-header" className="text-xs text-gray-500 cursor-pointer">
                    {published ? 'Published' : 'Draft'}
                  </label>
                </div>
              </div>
            </div>

            {/* Tab row */}
            <div className="flex items-center gap-0 -mb-px overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ══════ Tab content ══════ */}
        <div className="flex-1 pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">

            {/* ── CONTENT TAB ── */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                {/* Content type selector */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Content Type</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Choose the primary content format for this lesson</p>
                    </div>
                    <select
                      value={contentType}
                      onChange={(e) => {
                        const newType = e.target.value as typeof contentType;
                        if (newType !== contentType && newType !== 'rich_text') {
                          if (!confirm('Switching content type will clear existing content blocks. Continue?')) return;
                          setContent([]);
                        }
                        setContentType(newType);
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-56"
                    >
                      <option value="rich_text">Rich Text Content</option>
                      <option value="scorm">SCORM Package</option>
                      <option value="video">Video Content</option>
                      <option value="quiz">Quiz Only</option>
                      <option value="assignment">Assignment Only</option>
                    </select>
                  </div>
                </div>

                {/* SCORM upload or create */}
                {contentType === 'scorm' && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">SCORM Package</h3>

                    {/* Existing package display */}
                    {scormPackage && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-900">{scormPackage.title}</p>
                          <p className="text-xs text-green-700">SCORM {scormPackage.scorm_version} • {Math.round(scormPackage.package_size / 1024 / 1024)}MB</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/lessons/${lessonId}/scorm-builder`)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Edit in Builder
                          </button>
                          <button
                            onClick={() => { if (confirm('Remove SCORM package?')) { setScormPackage(null); setContentType('rich_text'); } }}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Create or Upload options */}
                    {!scormPackage && (
                      <div className="space-y-4">
                        {/* Create with builder */}
                        <div
                          onClick={() => router.push(`/lessons/${lessonId}/scorm-builder`)}
                          className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Icon icon="material-symbols:build" className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Create SCORM Content</p>
                            <p className="text-xs text-gray-500">Build interactive slides and quizzes directly in the browser</p>
                          </div>
                          <Icon icon="material-symbols:arrow-forward" className="w-5 h-5 text-gray-400 ml-auto" />
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400 uppercase">or</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        {/* Upload existing */}
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Upload a SCORM 1.2 or 2004 package (ZIP). Max 200MB.</p>
                          <input
                            type="file"
                            accept=".zip"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingSCORM(true);
                              try {
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('lessonId', lessonId);
                                if (courseId) formData.append('courseId', courseId);
                                const res = await fetch('/api/scorm/upload', { method: 'POST', body: formData });
                                const ct = res.headers.get('content-type');
                                let data;
                                if (ct && ct.includes('application/json')) {
                                  data = await res.json();
                                } else {
                                  alert(`Upload failed (Status ${res.status})`);
                                  return;
                                }
                                if (!res.ok) { alert(`Failed: ${data.error || 'Unknown error'}`); return; }
                                setScormPackage(data.scormPackage);
                                setContentType('scorm');
                              } catch (error: any) {
                                alert(`Failed: ${error.message || 'Network error'}`);
                              } finally {
                                setUploadingSCORM(false);
                              }
                            }}
                            disabled={uploadingSCORM}
                            className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-700 disabled:opacity-50"
                          />
                          {uploadingSCORM && <p className="mt-2 text-sm text-blue-600">Uploading and extracting...</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Video mode */}
                {contentType === 'video' && (
                  <VideoModeEditor
                    content={content}
                    setContent={setContent}
                    title={title}
                    lessonId={lessonId}
                    generatingChapters={generatingChapters}
                    setGeneratingChapters={setGeneratingChapters}
                  />
                )}

                {/* Quiz only */}
                {contentType === 'quiz' && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Quiz Content</h3>
                    {content[0]?.data?.quizId ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Quiz Selected</p>
                          <p className="text-xs text-green-700 font-mono truncate">{content[0].data.quizId}</p>
                        </div>
                        <button onClick={() => { setQuizSelectorIndex(-1); setQuizSelectorOpen(true); }} className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg">Change</button>
                        <button onClick={() => setContent([])} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg">Remove</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setQuizSelectorIndex(-1); setQuizSelectorOpen(true); }}
                        className="w-full py-8 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium text-gray-500 hover:text-blue-600 cursor-pointer"
                      >
                        Select or Create a Quiz
                      </button>
                    )}
                  </div>
                )}

                {/* Assignment only */}
                {contentType === 'assignment' && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Assignment Content</h3>
                    {content[0]?.data?.assignmentId ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Assignment Selected</p>
                          <p className="text-xs text-green-700 font-mono truncate">{content[0].data.assignmentId}</p>
                        </div>
                        <button onClick={() => { const id = prompt('Enter new assignment ID:'); if (id) setContent([{ type: 'assignment', title: 'Assignment', data: { assignmentId: id }, id: content[0]?.id || `assignment-${Date.now()}` }]); }} className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg">Change</button>
                        <button onClick={() => setContent([])} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg">Remove</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <input onChange={(e) => { if (e.target.value) setContent([{ type: 'assignment', title: 'Assignment', data: { assignmentId: e.target.value }, id: `assignment-${Date.now()}` }]); }} placeholder="Enter assignment ID" className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
                        <Button variant="outline" onClick={() => window.open('/assignments/create', '_blank')}>Create New</Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Rich text content builder */}
                {contentType === 'rich_text' && (
                  <div className="space-y-3">
                    {/* Add content dropdown */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-900">Content Blocks</h2>
                      <select
                        onChange={(e) => { if (e.target.value) { addBlock(e.target.value as any); e.target.value = ''; } }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">+ Add Block...</option>
                        <option value="label">Label/Divider</option>
                        <option value="text">Text Content</option>
                        <option value="video">Video</option>
                        <option value="interactive_video">Interactive Video</option>
                        <option value="audio">Audio/Podcast</option>
                        <option value="code_sandbox">Code Sandbox</option>
                        <option value="whiteboard">Whiteboard</option>
                        <option value="image">Image</option>
                        <option value="3d_model">3D Model</option>
                        <option value="pdf">PDF Document</option>
                        <option value="file">File Upload</option>
                        <option value="embed">Embed Content</option>
                        <option value="slideshow">Slideshow</option>
                        <option value="quiz">Quiz</option>
                        <option value="survey">Survey/Evaluation</option>
                        <option value="assignment">Assignment</option>
                      </select>
                    </div>

                    {content.length === 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
                        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className="text-sm text-gray-400">No content blocks yet</p>
                        <p className="text-xs text-gray-300 mt-1">Use the dropdown above to add content</p>
                      </div>
                    )}

                    {content.map((item, idx) => (
                      <ContentBlockEditor
                        key={item.id || idx}
                        item={item}
                        index={idx}
                        onChange={(data) => { const arr = [...content]; arr[idx] = { ...item, data }; setContent(arr); }}
                        onTitleChange={(t) => { const arr = [...content]; arr[idx] = { ...item, title: t }; setContent(arr); }}
                        onRemove={() => delBlock(idx)}
                        onMoveUp={() => moveBlock(idx, -1)}
                        onMoveDown={() => moveBlock(idx, 1)}
                        onFileUploaded={onFileUploaded(idx)}
                        onOpenQuizSelector={() => { setQuizSelectorIndex(idx); setQuizSelectorOpen(true); }}
                        onOpenSurveySelector={() => { setSurveySelectorIndex(idx); setSurveySelectorOpen(true); }}
                        isFirst={idx === 0}
                        isLast={idx === content.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── DETAILS TAB ── */}
            {activeTab === 'details' && (
              <div className="max-w-2xl space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Lesson title" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Brief description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time (min)</label>
                        <input type="number" value={estimated} onChange={(e) => setEstimated(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty (1-5)</label>
                        <input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Publish Settings</h2>
                  <div className="flex items-center gap-3">
                    <input id="pub" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" />
                    <label htmlFor="pub" className="text-sm text-gray-700 cursor-pointer">Publish this lesson</label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Published lessons are visible to enrolled students</p>
                </div>
              </div>
            )}

            {/* ── OUTCOMES & INSTRUCTIONS TAB ── */}
            {activeTab === 'outcomes' && (
              <div className="max-w-3xl space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Learning Outcomes</h2>
                  <div className="flex gap-2 mb-4">
                    <input
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }}
                      placeholder="Add a learning outcome..."
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <Button variant="outline" onClick={addOutcome}>Add</Button>
                  </div>
                  {outcomes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No outcomes added yet</p>
                  ) : (
                    <ul className="space-y-2">
                      {outcomes.map((o, idx) => (
                        <li key={idx} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] flex items-center justify-center font-medium">{idx + 1}</span>
                            <span className="text-sm text-gray-800 truncate">{o}</span>
                          </div>
                          <button onClick={() => delOutcome(idx)} className="text-xs text-red-600 hover:text-red-800 flex-shrink-0 cursor-pointer">Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Lesson Instructions</h2>
                  <TextEditor value={instructions} onChange={setInstructions} />
                </div>
              </div>
            )}

            {/* ── RESOURCES TAB ── */}
            {activeTab === 'resources' && (
              <div className="max-w-3xl space-y-6">
                {courseId ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">Library Resources</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Attach reusable resources from the course library</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setLibraryPickerOpen(true)}>
                        <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
                        Add from Library
                      </Button>
                    </div>

                    {loadingLibResources ? (
                      <p className="py-4 text-center text-sm text-gray-400">Loading...</p>
                    ) : attachedLibResources.length === 0 ? (
                      <div className="py-8 text-center">
                        <Icon icon="material-symbols:library-books" className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                        <p className="text-sm text-gray-400">No resources attached</p>
                        <button onClick={() => setLibraryPickerOpen(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">Browse library</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attachedLibResources.map((attachment) => {
                          const res = attachment.library_resources;
                          if (!res) return null;
                          const typeIcons: Record<string, string> = {
                            document: 'material-symbols:description', video: 'material-symbols:videocam',
                            link: 'material-symbols:link', template: 'material-symbols:content-copy',
                            scorm: 'material-symbols:package-2', image: 'material-symbols:image',
                            audio: 'material-symbols:audio-file', other: 'material-symbols:attachment',
                          };
                          return (
                            <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                              <div className="w-8 h-8 rounded flex items-center justify-center bg-white border border-gray-200 flex-shrink-0">
                                <Icon icon={typeIcons[res.resource_type] || 'material-symbols:attachment'} className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{res.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400 capitalize">{res.resource_type}</span>
                                  {res.library_resource_categories && (
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${res.library_resource_categories.color}15`, color: res.library_resource_categories.color }}>
                                      {res.library_resource_categories.name}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">v{res.version}</span>
                                </div>
                              </div>
                              {(res.url || res.file_url) && (
                                <a href={res.url || res.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Icon icon="material-symbols:open-in-new" className="w-4 h-4" />
                                </a>
                              )}
                              <button onClick={() => handleDetachLibResource(attachment.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Icon icon="material-symbols:close" className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-400">Library resources are available when the lesson belongs to a course.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══════ Sticky save bar ══════ */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {content.length} content block{content.length !== 1 ? 's' : ''} • {contentType.replace('_', ' ')}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={goBack}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        {/* ══════ Modals ══════ */}
        <LibraryResourcePicker
          isOpen={libraryPickerOpen}
          onClose={() => setLibraryPickerOpen(false)}
          onSelect={handleAttachLibResources}
          excludeIds={attachedLibResources.map(a => a.resource_id)}
        />

        <QuizSelectorModal
          isOpen={quizSelectorOpen}
          onClose={() => { setQuizSelectorOpen(false); setQuizSelectorIndex(null); }}
          onSelect={(quizId) => {
            if (quizSelectorIndex === -1) {
              setContent([{ type: 'quiz', title: 'Quiz', data: { quizId }, id: content[0]?.id || `quiz-${Date.now()}` }]);
            } else if (quizSelectorIndex !== null) {
              const arr = [...content];
              arr[quizSelectorIndex] = { ...arr[quizSelectorIndex], data: { ...arr[quizSelectorIndex].data, quizId } };
              setContent(arr);
            }
            setQuizSelectorOpen(false);
            setQuizSelectorIndex(null);
          }}
          courseId={courseId}
          lessonId={lessonId}
        />

        <SurveySelectorModal
          isOpen={surveySelectorOpen}
          onClose={() => { setSurveySelectorOpen(false); setSurveySelectorIndex(null); }}
          onSelect={(surveyId) => {
            if (surveySelectorIndex !== null) {
              const arr = [...content];
              arr[surveySelectorIndex] = { ...arr[surveySelectorIndex], data: { ...arr[surveySelectorIndex].data, surveyId } };
              setContent(arr);
            }
            setSurveySelectorOpen(false);
            setSurveySelectorIndex(null);
          }}
          courseId={courseId}
          lessonId={lessonId}
        />
      </div>
    </RoleGuard>
  );
}
