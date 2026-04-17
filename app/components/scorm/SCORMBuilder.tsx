'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import SlideEditor from './SlideEditor';
import QuizBlockEditor from './QuizBlockEditor';
import type {
  SCORMBuilderData,
  SCORMBuilderSettings,
  SCORMSlide,
  SCORMQuizQuestion,
} from '@/lib/scorm/types';
import { DEFAULT_SETTINGS } from '@/lib/scorm/types';

type TabId = 'slides' | 'quiz' | 'settings';

interface SCORMBuilderProps {
  lessonId: string;
  courseId?: string;
  /** Pre-existing builder data for editing a previously generated package */
  initialData?: SCORMBuilderData | null;
  onGenerated?: (result: { id: string; title: string }) => void;
}

export default function SCORMBuilder({ lessonId, courseId, initialData, onGenerated }: SCORMBuilderProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>('slides');
  const [title, setTitle] = React.useState(initialData?.title || '');
  const [description, setDescription] = React.useState(initialData?.description || '');
  const [slides, setSlides] = React.useState<SCORMSlide[]>(
    initialData?.slides || [
      { id: `s-${Date.now()}`, title: 'Introduction', html: '<h2>Welcome</h2>\n<p>Enter your content here.</p>' },
    ]
  );
  const [quizQuestions, setQuizQuestions] = React.useState<SCORMQuizQuestion[]>(
    initialData?.quizQuestions || []
  );
  const [settings, setSettings] = React.useState<SCORMBuilderSettings>(
    initialData?.settings || { ...DEFAULT_SETTINGS }
  );
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // ─── Slide management ────────────────────────────────────────────────────
  const addSlide = () => {
    setSlides([
      ...slides,
      {
        id: `s-${Date.now()}`,
        title: `Slide ${slides.length + 1}`,
        html: '',
      },
    ]);
  };

  const updateSlide = (idx: number, slide: SCORMSlide) => {
    const updated = [...slides];
    updated[idx] = slide;
    setSlides(updated);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    setSlides(slides.filter((_, i) => i !== idx));
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const swap = idx + dir;
    if (swap < 0 || swap >= slides.length) return;
    const arr = [...slides];
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setSlides(arr);
  };

  // ─── Generate ────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!title.trim()) {
      setError('Please enter a title for the SCORM package.');
      return;
    }
    if (slides.length === 0) {
      setError('Add at least one slide.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    const builderData: SCORMBuilderData = {
      title: title.trim(),
      description: description.trim() || undefined,
      slides,
      quizQuestions,
      settings,
    };

    try {
      const res = await fetch('/api/scorm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, courseId, builderData }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate SCORM package');
        return;
      }

      setSuccess(`SCORM package "${data.scormPackage.title}" generated successfully!`);
      onGenerated?.({ id: data.scormPackage.id, title: data.scormPackage.title });
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Tab content ─────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'slides', label: 'Slides', icon: 'material-symbols:slideshow' },
    { id: 'quiz', label: 'Assessment', icon: 'material-symbols:quiz' },
    { id: 'settings', label: 'Settings', icon: 'material-symbols:settings' },
  ];

  return (
    <div className="space-y-5">
      {/* ─── Header fields ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Package Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Biology"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this module"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon icon={tab.icon} className="w-4 h-4" />
            {tab.label}
            {tab.id === 'quiz' && quizQuestions.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{quizQuestions.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Slides tab ───────────────────────────────────────────────── */}
      {activeTab === 'slides' && (
        <div className="space-y-4">
          {slides.map((slide, idx) => (
            <SlideEditor
              key={slide.id}
              slide={slide}
              index={idx}
              total={slides.length}
              onChange={(s) => updateSlide(idx, s)}
              onDelete={() => deleteSlide(idx)}
              onMove={(dir) => moveSlide(idx, dir)}
            />
          ))}
          <button
            onClick={addSlide}
            className="w-full flex items-center justify-center gap-1.5 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Icon icon="material-symbols:add" className="w-5 h-5" />
            Add Slide
          </button>
        </div>
      )}

      {/* ─── Quiz tab ─────────────────────────────────────────────────── */}
      {activeTab === 'quiz' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Add standalone assessment questions that appear after all slides. You can also embed
            questions directly on individual slides in the Slides tab.
          </p>
          <QuizBlockEditor questions={quizQuestions} onChange={setQuizQuestions} />
        </div>
      )}

      {/* ─── Settings tab ─────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Passing Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.passingScore}
              onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) || 0 })}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.freeNavigation}
              onChange={(e) => setSettings({ ...settings, freeNavigation: e.target.checked })}
              className="accent-blue-600 w-4 h-4"
            />
            Allow free navigation between slides
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.showProgress}
              onChange={(e) => setSettings({ ...settings, showProgress: e.target.checked })}
              className="accent-blue-600 w-4 h-4"
            />
            Show progress bar
          </label>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Accent Color</label>
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ─── Status messages ──────────────────────────────────────────── */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <Icon icon="material-symbols:error-outline" className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <Icon icon="material-symbols:check-circle-outline" className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* ─── Generate button ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          {slides.length} slide{slides.length !== 1 ? 's' : ''}
          {quizQuestions.length > 0 && ` • ${quizQuestions.length} quiz question${quizQuestions.length !== 1 ? 's' : ''}`}
        </p>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={generating}
          icon={
            generating
              ? <Icon icon="material-symbols:progress-activity" className="w-4 h-4 animate-spin" />
              : <Icon icon="material-symbols:package-2" className="w-4 h-4" />
          }
        >
          {generating ? 'Generating...' : 'Generate SCORM Package'}
        </Button>
      </div>
    </div>
  );
}
