'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/app/components/Button';
import TextEditor from '@/app/components/TextEditor';
import FileUpload, { UploadResult } from '@/app/components/FileUpload';
import RoleGuard from '@/app/components/RoleGuard';
import QuizSelectorModal from '@/app/components/QuizSelectorModal';
import SurveySelectorModal from '@/app/components/SurveySelectorModal';
import LibraryResourcePicker from '@/app/components/LibraryResourcePicker';
import { Icon } from '@iconify/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContentItem = {
  type: 'video'|'text'|'slideshow'|'file'|'embed'|'quiz'|'survey'|'assignment'|'image'|'pdf'|'audio'|'interactive_video'|'code_sandbox'|'label'|'whiteboard';
  title: string;
  data: any;
  id?: string;
};

export default function EditLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = id;
  const [loading, setLoading] = React.useState(true);
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

  // Library resources
  const [libraryPickerOpen, setLibraryPickerOpen] = React.useState(false);
  const [attachedLibResources, setAttachedLibResources] = React.useState<any[]>([]);
  const [loadingLibResources, setLoadingLibResources] = React.useState(false);

  // Load library resources attached to this lesson
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
      if (res.ok) {
        loadLibraryResources();
      }
    } catch (err) {
      console.error('Error attaching library resources:', err);
    }
  };

  const handleDetachLibResource = async (attachmentId: string) => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/library-resources?attachment_id=${attachmentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAttachedLibResources(prev => prev.filter(a => a.id !== attachmentId));
      }
    } catch (err) {
      console.error('Error detaching library resource:', err);
    }
  };

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setTitle(data.title||'');
        setDescription(data.description||'');
        setDifficulty(Number(data.difficulty||1));
        setOutcomes(Array.isArray(data.learning_outcomes)? data.learning_outcomes: []);
        setInstructions(String(data.lesson_instructions||''));
        setContent(Array.isArray(data.content)? data.content: []);
        setResources(Array.isArray(data.resources)? data.resources: []);
        setEstimated(Number(data.estimated_time||0));
        setPublished(Boolean(data.published));
        setCourseId(data.course_id || null);
        setContentType(data.content_type || 'rich_text');
        
        // Load SCORM package if available
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

  const addOutcome = () => {
    if (!newOutcome.trim()) return;
    setOutcomes([...outcomes, newOutcome.trim()]);
    setNewOutcome('');
  };
  const delOutcome = (idx: number) => setOutcomes(outcomes.filter((_,i)=>i!==idx));

  const addBlock = (type: ContentItem['type']) => {
    let initialData: any = '';
    let initialTitle = type.toUpperCase().replace('_', ' ');

    if (type === 'text') {
      initialData = '<p></p>';
    } else if (type === 'code_sandbox') {
      initialData = {
        language: 'javascript',
        code: '',
        instructions: '',
        readOnly: false
      };
    } else if (type === 'label') {
      initialData = {
        text: '',
        style: 'heading', // 'heading', 'divider', 'section'
        size: 'medium' // 'small', 'medium', 'large'
      };
      initialTitle = 'Section Label';
    } else if (type === 'whiteboard') {
      initialData = {
        whiteboard_id: null,
        elements: [],
        app_state: {},
        mode: 'collaborate'
      };
      initialTitle = 'Whiteboard';
    }

    const item: ContentItem = {
      type,
      title: initialTitle,
      data: initialData,
      id: `${type}-${Date.now()}`
    };
    setContent([...content, item]);
  };
  const moveBlock = (idx: number, dir: -1|1) => {
    const arr = [...content];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    const tmp = arr[idx]; arr[idx] = arr[swap]; arr[swap] = tmp;
    setContent(arr);
  };
  const delBlock = (idx: number) => setContent(content.filter((_,i)=>i!==idx));

  const onFileUploaded = (idx: number) => (res: UploadResult) => {
    const arr = [...content];
    arr[idx] = { ...arr[idx], data: { 
      fileId: res.fileId, 
      fileName: res.fileName,
      url: res.fileUrl,
      fileSize: res.fileSize,
      fileType: res.fileType
    } };
    setContent(arr);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          title, 
          description,
          difficulty,
          learning_outcomes: outcomes,
          lesson_instructions: instructions,
          content,
          resources,
          estimated_time: estimated,
          published,
          content_type: contentType
        })
      });
      
      if (response.ok) {
        // Redirect to lesson display page after successful save
        if (courseId) {
          router.push(`/course/${courseId}/lesson/${lessonId}`);
        } else {
          // Fallback: show success message and go back
          alert('Lesson saved successfully!');
          router.back();
        }
      } else {
        alert('Failed to save lesson. Please try again.');
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('An error occurred while saving the lesson.');
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return null;

  return (
    <RoleGuard 
      roles={["instructor", "curriculum_designer", "admin", "super_admin"]} 
      fallback={
      <div className="min-h-screen bg-gradient-to-br from-white via-oecs-light-green/5 to-oecs-light-green/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to edit lessons.</p>
          <p className="text-sm text-gray-500">Only instructors, curriculum designers, and administrators can edit lessons.</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-white via-oecs-light-green/5 to-oecs-light-green/10">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (courseId) {
                  router.push(`/course/${courseId}/lesson/${lessonId}`);
                } else {
                  router.back();
                }
              }} 
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">Edit Lesson</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                if (courseId) {
                  router.push(`/course/${courseId}/lesson/${lessonId}`);
                } else {
                  router.back();
                }
              }}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input 
                  value={title} 
                  onChange={(e)=>setTitle(e.target.value)} 
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green" 
                  placeholder="Enter lesson title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e)=>setDescription(e.target.value)} 
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green" 
                  placeholder="Enter lesson description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time (min)</label>
                  <input 
                    type="number" 
                    value={estimated} 
                    onChange={(e)=>setEstimated(Number(e.target.value))} 
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green" 
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty (1-5)</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={5} 
                    value={difficulty} 
                    onChange={(e)=>setDifficulty(Number(e.target.value))} 
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green" 
                    placeholder="3"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Learning Outcomes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Learning Outcomes</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  value={newOutcome} 
                  onChange={(e)=>setNewOutcome(e.target.value)} 
                  placeholder="Add learning outcome..." 
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green" 
                />
                <Button variant="outline" onClick={addOutcome}>
                  Add
                </Button>
              </div>
              <ul className="space-y-2">
                {outcomes.map((o, idx)=> (
                  <li key={idx} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="text-sm text-gray-800">{o}</span>
                    <button 
                      onClick={()=>delOutcome(idx)} 
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lesson Instructions</h2>
            <TextEditor value={instructions} onChange={setInstructions} />
          </div>
        </div>

        {/* SCORM Package Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Type</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select content type for this lesson
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
              >
                <option value="rich_text">Rich Text Content</option>
                <option value="scorm">SCORM Package</option>
                <option value="video">Video Content</option>
                <option value="quiz">Quiz Only</option>
                <option value="assignment">Assignment Only</option>
              </select>
            </div>
            
            {contentType === 'scorm' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Upload SCORM Package</h3>
                <p className="text-xs text-blue-700 mb-4">
                  Upload a SCORM 1.2 or SCORM 2004 package (ZIP file). Maximum size: 200MB.
                </p>
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
                      
                      const res = await fetch('/api/scorm/upload', {
                        method: 'POST',
                        body: formData
                      });
                      
                      // Check content type before parsing JSON
                      const contentType = res.headers.get('content-type');
                      let data;
                      
                      if (contentType && typeof contentType === 'string' && contentType.includes('application/json')) {
                        data = await res.json();
                      } else {
                        // If not JSON, read as text to see what we got
                        const text = await res.text();
                        console.error('SCORM upload error - non-JSON response:', text);
                        alert(`Failed to upload SCORM package: Server returned an error (Status ${res.status})`);
                        return;
                      }
                      
                      if (!res.ok) {
                        alert(`Failed to upload SCORM package: ${data.error || 'Unknown error'}`);
                        return;
                      }
                      
                      setScormPackage(data.scormPackage);
                      alert('SCORM package uploaded successfully!');
                      setContentType('scorm');
                    } catch (error: any) {
                      console.error('SCORM upload error:', error);
                      const errorMessage = error.message || 'Network error or invalid response';
                      alert(`Failed to upload SCORM package: ${errorMessage}`);
                    } finally {
                      setUploadingSCORM(false);
                    }
                  }}
                  disabled={uploadingSCORM}
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                {uploadingSCORM && (
                  <div className="mt-2 text-sm text-blue-600">Uploading and extracting package...</div>
                )}
                {scormPackage && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">{scormPackage.title}</p>
                        <p className="text-xs text-green-700">SCORM {scormPackage.scorm_version} • {Math.round(scormPackage.package_size / 1024 / 1024)}MB</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to remove this SCORM package? This will change the lesson back to rich text content.')) return;
                          setScormPackage(null);
                          setContentType('rich_text');
                        }}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        {/* Content Builder - Only shown for non-SCORM content types */}
        {contentType !== 'scorm' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Content Builder</h2>
              <div className="flex items-center gap-2">
                <select 
                  onChange={(e)=>{ if (e.target.value) { addBlock(e.target.value as any); e.target.value=''; } }} 
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
                >
                  <option value="">Add Material…</option>
                  <option value="label">🏷️ Label/Divider</option>
                  <option value="text">📝 Text Content</option>
                  <option value="video">🎥 Video</option>
                  <option value="interactive_video">🎬 Interactive Video</option>
                  <option value="audio">🎵 Audio/Podcast</option>
                  <option value="code_sandbox">💻 Code Sandbox</option>
                  <option value="whiteboard">🎨 Whiteboard</option>
                  <option value="image">🖼️ Image</option>
                  <option value="pdf">📄 PDF Document</option>
                  <option value="file">📎 File Upload</option>
                  <option value="embed">🔗 Embed Content</option>
                  <option value="slideshow">📊 Slideshow</option>
                  <option value="quiz">❓ Quiz</option>
                  <option value="survey">📊 Survey/Evaluation</option>
                  <option value="assignment">📋 Assignment</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {content.map((item, idx)=> (
              <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <input 
                    value={item.title} 
                    onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, title: e.target.value }; setContent(arr); }} 
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green mr-3" 
                    placeholder="Content title..."
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={()=>moveBlock(idx,-1)} 
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      ↑
                    </button>
                    <button 
                      onClick={()=>moveBlock(idx,1)} 
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      ↓
                    </button>
                    <button 
                      onClick={()=>delBlock(idx)} 
                      className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  {item.type==='text' && (
                    <TextEditor value={typeof item.data === 'string' ? item.data : (item.data?.html || '')} onChange={(html)=>{ const arr=[...content]; arr[idx] = { ...item, data: html }; setContent(arr); }} />
                  )}
                  {item.type==='video' && (
                    <div className="space-y-3">
                      <input value={String(item.data?.url||'')} onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, url: e.target.value } }; setContent(arr); }} placeholder="Video URL (YouTube, Vimeo, etc.)" className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" />
                      <input value={String(item.data?.title||'')} onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, title: e.target.value } }; setContent(arr); }} placeholder="Video title" className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" />
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Video Description / Notes for Students</label>
                        <TextEditor
                          value={String(item.data?.description||'')}
                          onChange={(html)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, description: html } }; setContent(arr); }}
                          placeholder="Add context, key points, or instructions for students about this video..."
                          height={200}
                        />
                        <p className="mt-1 text-xs text-gray-500">Provide additional context, key takeaways, or viewing instructions for students</p>
                      </div>
                    </div>
                  )}
                  {item.type==='audio' && (
                    <div className="space-y-3">
                      <FileUpload onUploaded={onFileUploaded(idx)} />
                      <div className="text-xs text-gray-500">
                        Supported formats: MP3, WAV, OGG, M4A. Maximum file size: 50MB
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs text-gray-600">Transcript (optional)</label>
                        <textarea 
                          value={String(item.data?.transcript||'')} 
                          onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, transcript: e.target.value } }; setContent(arr); }} 
                          placeholder="Enter transcript text for accessibility..."
                          rows={4}
                          className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" 
                        />
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`show-transcript-${idx}`}
                            checked={Boolean(item.data?.showTranscript)} 
                            onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, showTranscript: e.target.checked } }; setContent(arr); }} 
                            className="h-4 w-4 text-purple-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`show-transcript-${idx}`} className="text-xs text-gray-600">
                            Show transcript by default
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  {item.type==='interactive_video' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Video Source</label>
                        <div className="space-y-2">
                          <input 
                            value={item.data?.videoUrl ?? item.data?.url ?? ''} 
                            onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, videoUrl: e.target.value || '', url: e.target.value || '' } }; setContent(arr); }} 
                            placeholder="Video URL or upload file below"
                            className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" 
                          />
                          <div className="text-xs text-gray-500">
                            For best checkpoint control, upload a video file. YouTube/Vimeo URLs work but with limited control.
                          </div>
                          <FileUpload onUploaded={(res) => {
                            const arr = [...content];
                            arr[idx] = {
                              ...item,
                              data: {
                                ...item.data,
                                fileId: res.fileId,
                                url: res.fileUrl,
                                videoUrl: res.fileUrl,
                                fileName: res.fileName
                              }
                            };
                            setContent(arr);
                          }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Video Description / Notes for Students</label>
                        <TextEditor
                          value={String(item.data?.description||'')}
                          onChange={(html)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, description: html } }; setContent(arr); }}
                          placeholder="Add context, key points, or instructions for students about this video..."
                          height={200}
                        />
                        <p className="text-xs text-gray-500">Provide additional context, key takeaways, or viewing instructions for students</p>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-xs font-medium text-gray-700">Video Checkpoints</label>
                          <button
                            type="button"
                            onClick={() => {
                              const arr = [...content];
                              const newCheckpoint = {
                                id: `cp-${Date.now()}`,
                                timestamp: 0,
                                questionText: '',
                                question_text: '',
                                questionType: 'multiple_choice',
                                question_type: 'multiple_choice',
                                options: [
                                  { id: `opt-${Date.now()}-1`, text: '', isCorrect: false, is_correct: false }, 
                                  { id: `opt-${Date.now()}-2`, text: '', isCorrect: false, is_correct: false }
                                ],
                                correctAnswer: '',
                                correct_answer: '',
                                feedback: '',
                                points: 1
                              };
                              arr[idx] = { 
                                ...item, 
                                data: { 
                                  ...item.data, 
                                  checkpoints: [...(item.data?.checkpoints || []), newCheckpoint]
                                } 
                              };
                              setContent(arr);
                            }}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            + Add Checkpoint
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {(item.data?.checkpoints || []).map((cp: any, cpIdx: number) => (
                            <div key={cp.id || cpIdx} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="text-sm font-medium text-gray-900">Checkpoint {cpIdx + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const arr = [...content];
                                    const checkpoints = [...(item.data?.checkpoints || [])];
                                    checkpoints.splice(cpIdx, 1);
                                    arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                    setContent(arr);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Timestamp (seconds)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={cp.timestamp ?? 0}
                                    onChange={(e) => {
                                      const arr = [...content];
                                      const checkpoints = [...(item.data?.checkpoints || [])];
                                      checkpoints[cpIdx] = { ...checkpoints[cpIdx], timestamp: Number(e.target.value) || 0 };
                                      arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                      setContent(arr);
                                    }}
                                    className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                                    placeholder="0"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Question Text</label>
                                  <textarea
                                    value={cp.questionText ?? cp.question_text ?? ''}
                                    onChange={(e) => {
                                      const arr = [...content];
                                      const checkpoints = [...(item.data?.checkpoints || [])];
                                      checkpoints[cpIdx] = { 
                                        ...checkpoints[cpIdx], 
                                        questionText: e.target.value || '',
                                        question_text: e.target.value || ''
                                      };
                                      arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                      setContent(arr);
                                    }}
                                    rows={2}
                                    className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                                    placeholder="Enter your question here..."
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Question Type</label>
                                  <select
                                    value={cp.questionType ?? cp.question_type ?? 'multiple_choice'}
                                    onChange={(e) => {
                                      const arr = [...content];
                                      const checkpoints = [...(item.data?.checkpoints || [])];
                                      checkpoints[cpIdx] = { 
                                        ...checkpoints[cpIdx], 
                                        questionType: e.target.value || 'multiple_choice',
                                        question_type: e.target.value || 'multiple_choice'
                                      };
                                      arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                      setContent(arr);
                                    }}
                                    className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                                  >
                                    <option value="multiple_choice">Multiple Choice</option>
                                    <option value="true_false">True/False</option>
                                    <option value="short_answer">Short Answer</option>
                                  </select>
                                </div>
                                
                                {(cp.questionType || cp.question_type) === 'multiple_choice' && (
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-2">Options</label>
                                    <div className="space-y-2">
                                      {(cp.options || []).map((opt: any, optIdx: number) => (
                                        <div key={opt.id || optIdx} className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={opt.text ?? ''}
                                            onChange={(e) => {
                                              const arr = [...content];
                                              const checkpoints = [...(item.data?.checkpoints || [])];
                                              const options = [...(checkpoints[cpIdx].options || [])];
                                              options[optIdx] = { 
                                                ...options[optIdx], 
                                                text: e.target.value || '',
                                                id: options[optIdx].id || `opt-${Date.now()}-${optIdx}`
                                              };
                                              checkpoints[cpIdx] = { ...checkpoints[cpIdx], options };
                                              arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                              setContent(arr);
                                            }}
                                            placeholder={`Option ${optIdx + 1}`}
                                            className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700"
                                          />
                                          <label className="flex items-center gap-1 text-xs text-gray-600">
                                            <input
                                              type="radio"
                                              name={`correct-${cp.id || cpIdx}`}
                                              checked={Boolean(opt.isCorrect || opt.is_correct)}
                                              onChange={() => {
                                                const arr = [...content];
                                                const checkpoints = [...(item.data?.checkpoints || [])];
                                                const options = (checkpoints[cpIdx].options || []).map((o: any, i: number) => ({
                                                  ...o,
                                                  isCorrect: i === optIdx,
                                                  is_correct: i === optIdx
                                                }));
                                                checkpoints[cpIdx] = { 
                                                  ...checkpoints[cpIdx], 
                                                  options,
                                                  correctAnswer: options[optIdx]?.id,
                                                  correct_answer: options[optIdx]?.id
                                                };
                                                arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                                setContent(arr);
                                              }}
                                              className="h-3 w-3"
                                            />
                                            Correct
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const arr = [...content];
                                              const checkpoints = [...(item.data?.checkpoints || [])];
                                              const options = [...(checkpoints[cpIdx].options || [])];
                                              options.splice(optIdx, 1);
                                              checkpoints[cpIdx] = { ...checkpoints[cpIdx], options };
                                              arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                              setContent(arr);
                                            }}
                                            className="text-xs text-red-600 hover:text-red-800"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const arr = [...content];
                                          const checkpoints = [...(item.data?.checkpoints || [])];
                                          const options = [...(checkpoints[cpIdx].options || [])];
                                          options.push({ 
                                            id: `opt-${Date.now()}`, 
                                            text: '', 
                                            isCorrect: false,
                                            is_correct: false
                                          });
                                          checkpoints[cpIdx] = { ...checkpoints[cpIdx], options };
                                          arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                          setContent(arr);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        + Add Option
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {((cp.questionType || cp.question_type) === 'true_false' || (cp.questionType || cp.question_type) === 'short_answer') && (
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Correct Answer</label>
                                    {(cp.questionType || cp.question_type) === 'true_false' ? (
                                      <select
                                        value={String(cp.correctAnswer ?? cp.correct_answer ?? '')}
                                        onChange={(e) => {
                                          const arr = [...content];
                                          const checkpoints = [...(item.data?.checkpoints || [])];
                                          checkpoints[cpIdx] = { 
                                            ...checkpoints[cpIdx], 
                                            correctAnswer: e.target.value === 'true',
                                            correct_answer: e.target.value === 'true'
                                          };
                                          arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                          setContent(arr);
                                        }}
                                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                                      >
                                        <option value="">Select answer...</option>
                                        <option value="true">True</option>
                                        <option value="false">False</option>
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={String(cp.correctAnswer ?? cp.correct_answer ?? '')}
                                        onChange={(e) => {
                                          const arr = [...content];
                                          const checkpoints = [...(item.data?.checkpoints || [])];
                                          checkpoints[cpIdx] = { 
                                            ...checkpoints[cpIdx], 
                                            correctAnswer: e.target.value,
                                            correct_answer: e.target.value
                                          };
                                          arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                          setContent(arr);
                                        }}
                                        placeholder="Enter correct answer"
                                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                                      />
                                    )}
                                  </div>
                                )}
                                
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Feedback (optional)</label>
                                  <textarea
                                    value={cp.feedback ?? ''}
                                    onChange={(e) => {
                                      const arr = [...content];
                                      const checkpoints = [...(item.data?.checkpoints || [])];
                                      checkpoints[cpIdx] = { ...checkpoints[cpIdx], feedback: e.target.value || '' };
                                      arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                      setContent(arr);
                                    }}
                                    rows={2}
                                    className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                                    placeholder="Feedback shown after answering..."
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Points</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={cp.points ?? 1}
                                    onChange={(e) => {
                                      const arr = [...content];
                                      const checkpoints = [...(item.data?.checkpoints || [])];
                                      checkpoints[cpIdx] = { ...checkpoints[cpIdx], points: Number(e.target.value) || 1 };
                                      arr[idx] = { ...item, data: { ...item.data, checkpoints } };
                                      setContent(arr);
                                    }}
                                    className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!item.data?.checkpoints || item.data.checkpoints.length === 0) && (
                            <div className="text-center py-4 text-sm text-gray-500">
                              No checkpoints added yet. Click "Add Checkpoint" to create one.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {item.type==='code_sandbox' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Programming Language</label>
                        <select
                          value={item.data?.language || 'javascript'}
                          onChange={(e) => {
                            const arr = [...content];
                            arr[idx] = { 
                              ...item, 
                              data: { 
                                ...item.data, 
                                language: e.target.value || 'javascript'
                              } 
                            };
                            setContent(arr);
                          }}
                          className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                        >
                          <option value="javascript">📜 JavaScript</option>
                          <option value="typescript">📘 TypeScript</option>
                          <option value="html">🌐 HTML/CSS/JS</option>
                          <option value="python">🐍 Python</option>
                          <option value="java">☕ Java</option>
                          <option value="cpp">⚙️ C++</option>
                          <option value="sql">🗄️ SQL</option>
                          <option value="json">📋 JSON</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Initial Code</label>
                        <textarea
                          value={item.data?.code || item.data?.initialCode || ''}
                          onChange={(e) => {
                            const arr = [...content];
                            arr[idx] = { 
                              ...item, 
                              data: { 
                                ...item.data, 
                                code: e.target.value || '',
                                initialCode: e.target.value || ''
                              } 
                            };
                            setContent(arr);
                          }}
                          rows={12}
                          className="w-full rounded-md border bg-gray-900 text-green-400 font-mono text-sm p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter your code here..."
                          style={{
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
                            tabSize: 2,
                          }}
                          spellCheck={false}
                        />
                        <div className="text-xs text-gray-500">
                          Students can edit and run this code. Leave empty to use the default template.
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Instructions (optional)</label>
                        <textarea
                          value={item.data?.instructions || ''}
                          onChange={(e) => {
                            const arr = [...content];
                            arr[idx] = { 
                              ...item, 
                              data: { 
                                ...item.data, 
                                instructions: e.target.value || ''
                              } 
                            };
                            setContent(arr);
                          }}
                          rows={3}
                          className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                          placeholder="Provide instructions or learning objectives for this code exercise..."
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`readonly-${idx}`}
                          checked={item.data?.readOnly || false}
                          onChange={(e) => {
                            const arr = [...content];
                            arr[idx] = { 
                              ...item, 
                              data: { 
                                ...item.data, 
                                readOnly: e.target.checked
                              } 
                            };
                            setContent(arr);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`readonly-${idx}`} className="text-xs text-gray-700">
                          Read-only mode (students cannot edit code)
                        </label>
                      </div>
                    </div>
                  )}
                  {(item.type==='image' || item.type==='pdf') && (
                    <FileUpload onUploaded={onFileUploaded(idx)} />
                  )}
                  {item.type==='file' && (
                    <FileUpload onUploaded={onFileUploaded(idx)} />
                  )}
                  {item.type==='embed' && (
                    <div className="space-y-2">
                      <input value={String(item.data?.url||'')} onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, url: e.target.value } }; setContent(arr); }} placeholder="Embed URL" className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" />
                      <input value={String(item.data?.title||'')} onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, title: e.target.value } }; setContent(arr); }} placeholder="Content title" className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" />
                    </div>
                  )}
                  {item.type==='slideshow' && (
                    <div className="space-y-2">
                      <input 
                        value={String(item.data?.url||'')} 
                        onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, url: e.target.value } }; setContent(arr); }} 
                        placeholder="Slideshow URL (Google Slides, PowerPoint, PDF, etc.)" 
                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" 
                      />
                      <input 
                        value={String(item.data?.title||'')} 
                        onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, title: e.target.value } }; setContent(arr); }} 
                        placeholder="Slideshow title" 
                        className="w-full rounded-md border bg-white p-2 text-sm text-gray-700" 
                      />
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Embed Type (optional)</label>
                        <select
                          value={String(item.data?.embedType||'auto')}
                          onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, embedType: e.target.value } }; setContent(arr); }}
                          className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                        >
                          <option value="auto">Auto-detect (recommended)</option>
                          <option value="google-slides">Google Slides</option>
                          <option value="powerpoint">PowerPoint Online</option>
                          <option value="pdf">PDF Document</option>
                          <option value="iframe">Direct iframe</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Auto-detect will automatically identify the slideshow type from the URL. 
                          You can manually select if needed.
                        </p>
                      </div>
                    </div>
                  )}
                  {item.type==='quiz' && (
                    <div className="space-y-3">
                      {item.data?.quizId ? (
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-900">Quiz Selected</p>
                            <p className="text-xs text-green-700 font-mono truncate">{item.data.quizId}</p>
                          </div>
                          <button
                            onClick={() => {
                              setQuizSelectorIndex(idx);
                              setQuizSelectorOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => {
                              const arr = [...content];
                              arr[idx] = { ...item, data: { ...item.data, quizId: '' } };
                              setContent(arr);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setQuizSelectorIndex(idx);
                            setQuizSelectorOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-all group"
                        >
                          <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                            Select or Create Quiz
                          </span>
                        </button>
                      )}
                      <details className="text-xs">
                        <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Advanced: Enter Quiz ID manually</summary>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={String(item.data?.quizId||'')}
                            onChange={(e) => {
                              const arr = [...content];
                              arr[idx] = { ...item, data: { ...item.data, quizId: e.target.value } };
                              setContent(arr);
                            }}
                            placeholder="Enter quiz ID"
                            className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700 font-mono"
                          />
                        </div>
                      </details>
                    </div>
                  )}
                  {item.type==='survey' && (
                    <div className="space-y-3">
                      {item.data?.surveyId ? (
                        <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                          <div className="p-2 bg-teal-100 rounded-lg">
                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-teal-900">Survey Selected</p>
                            <p className="text-xs text-teal-700 font-mono truncate">{item.data.surveyId}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSurveySelectorIndex(idx);
                              setSurveySelectorOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => {
                              const arr = [...content];
                              arr[idx] = { ...item, data: { ...item.data, surveyId: '' } };
                              setContent(arr);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSurveySelectorIndex(idx);
                            setSurveySelectorOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 hover:border-teal-400 hover:bg-teal-50 rounded-lg transition-all group"
                        >
                          <svg className="w-6 h-6 text-gray-400 group-hover:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                          <span className="text-sm font-medium text-gray-600 group-hover:text-teal-600">
                            Select or Create Survey
                          </span>
                        </button>
                      )}
                      <details className="text-xs">
                        <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Advanced: Enter Survey ID manually</summary>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={String(item.data?.surveyId||'')}
                            onChange={(e) => {
                              const arr = [...content];
                              arr[idx] = { ...item, data: { ...item.data, surveyId: e.target.value } };
                              setContent(arr);
                            }}
                            placeholder="Enter survey ID"
                            className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700 font-mono"
                          />
                        </div>
                      </details>
                    </div>
                  )}
                  {item.type==='assignment' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Assignment ID:</span>
                        <input value={String(item.data?.assignmentId||'')} onChange={(e)=>{ const arr=[...content]; arr[idx] = { ...item, data: { ...item.data, assignmentId: e.target.value } }; setContent(arr); }} placeholder="Enter assignment ID" className="flex-1 rounded-md border bg-white p-2 text-sm text-gray-700" />
                        <Button variant="outline" size="sm" onClick={() => window.open('/assignments/create', '_blank')}>
                          Create New Assignment
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Create an assignment first, then enter its ID here</p>
                    </div>
                  )}
                  {item.type==='label' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Label Text</label>
                        <input
                          value={String(item.data?.text || '')}
                          onChange={(e) => {
                            const arr = [...content];
                            arr[idx] = { ...item, data: { ...item.data, text: e.target.value } };
                            setContent(arr);
                          }}
                          placeholder="Enter section label or divider text..."
                          className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Style</label>
                          <select
                            value={item.data?.style || 'heading'}
                            onChange={(e) => {
                              const arr = [...content];
                              arr[idx] = { ...item, data: { ...item.data, style: e.target.value } };
                              setContent(arr);
                            }}
                            className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                          >
                            <option value="heading">Heading</option>
                            <option value="divider">Divider with Text</option>
                            <option value="section">Section Header</option>
                            <option value="banner">Banner</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                          <select
                            value={item.data?.size || 'medium'}
                            onChange={(e) => {
                              const arr = [...content];
                              arr[idx] = { ...item, data: { ...item.data, size: e.target.value } };
                              setContent(arr);
                            }}
                            className="w-full rounded-md border bg-white p-2 text-sm text-gray-700"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Use labels to organize and separate content sections within your lesson.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              ))}
            </div>
          </div>
        )}

        {/* Show message when SCORM is selected */}
        {contentType === 'scorm' && !scormPackage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">SCORM Content Mode</h3>
                <p className="text-sm text-blue-700">
                  When using SCORM packages, traditional content materials are not available. Upload your SCORM package above to replace the Content Builder.
                </p>
              </div>
            </div>
          </div>
        )}

          {/* Library Resources */}
          {courseId && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Library Resources</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Attach reusable resources from the library to this lesson</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setLibraryPickerOpen(true)}>
                  <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
                  Add from Library
                </Button>
              </div>

              {loadingLibResources ? (
                <div className="py-4 text-center text-sm text-gray-400">Loading...</div>
              ) : attachedLibResources.length === 0 ? (
                <div className="py-6 text-center">
                  <Icon icon="material-symbols:library-books" className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">No library resources attached</p>
                  <button
                    onClick={() => setLibraryPickerOpen(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Browse library
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {attachedLibResources.map((attachment) => {
                    const res = attachment.library_resources;
                    if (!res) return null;
                    const typeIcons: Record<string, string> = {
                      document: 'material-symbols:description',
                      video: 'material-symbols:videocam',
                      link: 'material-symbols:link',
                      template: 'material-symbols:content-copy',
                      scorm: 'material-symbols:package-2',
                      image: 'material-symbols:image',
                      audio: 'material-symbols:audio-file',
                      other: 'material-symbols:attachment',
                    };
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                      >
                        <div className="w-8 h-8 rounded flex items-center justify-center bg-white border border-gray-200 flex-shrink-0">
                          <Icon
                            icon={typeIcons[res.resource_type] || 'material-symbols:attachment'}
                            className="w-4 h-4 text-gray-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{res.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400 capitalize">{res.resource_type}</span>
                            {res.library_resource_categories && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${res.library_resource_categories.color}15`,
                                  color: res.library_resource_categories.color,
                                }}
                              >
                                {res.library_resource_categories.name}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">v{res.version}</span>
                          </div>
                        </div>
                        {(res.url || res.file_url) && (
                          <a
                            href={res.url || res.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Open"
                          >
                            <Icon icon="material-symbols:open-in-new" className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDetachLibResource(attachment.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <Icon icon="material-symbols:close" className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Library Resource Picker Modal */}
          <LibraryResourcePicker
            isOpen={libraryPickerOpen}
            onClose={() => setLibraryPickerOpen(false)}
            onSelect={handleAttachLibResources}
            excludeIds={attachedLibResources.map(a => a.resource_id)}
          />

          {/* Publish Settings */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <input 
                id="pub" 
                type="checkbox" 
                checked={published} 
                onChange={(e)=>setPublished(e.target.checked)} 
                className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
              />
              <label htmlFor="pub" className="text-sm font-medium text-gray-700">
                Publish this lesson
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Published lessons will be visible to enrolled students
            </p>
          </div>
        </div>
      </div>

      {/* Quiz Selector Modal */}
      <QuizSelectorModal
        isOpen={quizSelectorOpen}
        onClose={() => {
          setQuizSelectorOpen(false);
          setQuizSelectorIndex(null);
        }}
        onSelect={(quizId) => {
          if (quizSelectorIndex !== null) {
            const arr = [...content];
            arr[quizSelectorIndex] = {
              ...arr[quizSelectorIndex],
              data: { ...arr[quizSelectorIndex].data, quizId }
            };
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
        onClose={() => {
          setSurveySelectorOpen(false);
          setSurveySelectorIndex(null);
        }}
        onSelect={(surveyId) => {
          if (surveySelectorIndex !== null) {
            const arr = [...content];
            arr[surveySelectorIndex] = {
              ...arr[surveySelectorIndex],
              data: { ...arr[surveySelectorIndex].data, surveyId }
            };
            setContent(arr);
          }
          setSurveySelectorOpen(false);
          setSurveySelectorIndex(null);
        }}
        courseId={courseId}
        lessonId={lessonId}
      />
    </RoleGuard>
  );
}
