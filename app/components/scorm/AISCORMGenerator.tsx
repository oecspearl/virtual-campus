'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import type { SCORMBuilderData } from '@/lib/scorm/types';

type SourceType = 'topic' | 'content' | 'lesson';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface AISCORMGeneratorProps {
  lessonId?: string;
  lessonTitle?: string;
  onGenerated: (data: SCORMBuilderData) => void;
  onClose: () => void;
}

export default function AISCORMGenerator({ lessonId, lessonTitle, onGenerated, onClose }: AISCORMGeneratorProps) {
  const [source, setSource] = useState<SourceType>(lessonId ? 'lesson' : 'topic');
  const [topic, setTopic] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [quizQuestionCount, setQuizQuestionCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SCORMBuilderData | null>(null);
  const [step, setStep] = useState<'configure' | 'preview'>('configure');

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const requestBody: any = { source, slideCount, includeQuiz, quizQuestionCount, difficulty };

      if (source === 'lesson' && lessonId) {
        requestBody.lessonId = lessonId;
      } else if (source === 'topic') {
        if (!topic.trim()) { setError('Please enter a topic'); setLoading(false); return; }
        requestBody.topic = topic;
      } else if (source === 'content') {
        if (!customContent.trim()) { setError('Please enter content'); setLoading(false); return; }
        requestBody.content = customContent;
      }

      const res = await fetch('/api/ai/scorm-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      setPreview(data.builderData);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Icon icon="material-symbols:auto-awesome" className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI SCORM Generator</h2>
              <p className="text-xs text-gray-500">
                {step === 'configure' ? 'Provide content and the AI will create slides & quizzes' : 'Review the generated module'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Body ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'configure' && (
            <div className="space-y-5">
              {/* Source selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Content Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'topic' as const, icon: 'material-symbols:lightbulb', label: 'Topic', desc: 'Enter a topic', disabled: false },
                    { id: 'content' as const, icon: 'material-symbols:description', label: 'Paste Content', desc: 'Paste text or notes', disabled: false },
                    { id: 'lesson' as const, icon: 'material-symbols:school', label: 'From Lesson', desc: 'Use lesson content', disabled: !lessonId },
                  ] as const).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => !s.disabled && setSource(s.id)}
                      disabled={s.disabled}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-center transition-colors ${
                        source === s.id
                          ? 'border-purple-500 bg-purple-50'
                          : s.disabled
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon icon={s.icon} className={`w-5 h-5 ${source === s.id ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className="text-xs font-medium text-gray-700">{s.label}</span>
                      <span className="text-[10px] text-gray-400">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source input */}
              {source === 'topic' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis, World War II, Python Functions..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}

              {source === 'content' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Content</label>
                  <textarea
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    rows={6}
                    placeholder="Paste your notes, text, article, or any content you want converted into a SCORM module..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y"
                  />
                  <p className="text-xs text-gray-400 mt-1">{customContent.length.toLocaleString()} characters</p>
                </div>
              )}

              {source === 'lesson' && lessonId && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                  <Icon icon="material-symbols:school" className="w-4 h-4 inline mr-1 text-gray-400" />
                  Using content from: <strong>{lessonTitle || 'Current lesson'}</strong>
                </div>
              )}

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Number of Slides</label>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={slideCount}
                    onChange={(e) => setSlideCount(parseInt(e.target.value) || 5)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={includeQuiz}
                  onChange={(e) => setIncludeQuiz(e.target.checked)}
                  className="accent-purple-600 w-4 h-4"
                />
                Include assessment questions
              </label>

              {includeQuiz && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Quiz Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={quizQuestionCount}
                    onChange={(e) => setQuizQuestionCount(parseInt(e.target.value) || 3)}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <Icon icon="material-symbols:error-outline" className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <Icon icon="material-symbols:check-circle" className="w-4 h-4 flex-shrink-0" />
                Generated {preview.slides.length} slides{preview.quizQuestions.length > 0 ? ` and ${preview.quizQuestions.length} quiz questions` : ''}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{preview.title}</h3>
                {preview.description && <p className="text-xs text-gray-500">{preview.description}</p>}
              </div>

              {/* Slide previews */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slides</h4>
                {preview.slides.map((slide, i) => (
                  <div key={slide.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{slide.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {slide.html.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quiz previews */}
              {preview.quizQuestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assessment</h4>
                  {preview.quizQuestions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                        Q{i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900">{q.prompt}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">
                          {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'true_false' ? 'True/False' : 'Fill in Blank'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          {step === 'configure' ? (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loading}
                icon={
                  loading
                    ? <Icon icon="material-symbols:progress-activity" className="w-4 h-4 animate-spin" />
                    : <Icon icon="material-symbols:auto-awesome" className="w-4 h-4" />
                }
                className="!bg-purple-600 hover:!bg-purple-700"
              >
                {loading ? 'Generating...' : 'Generate with AI'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('configure')}>
                <Icon icon="material-symbols:arrow-back" className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerate} disabled={loading}>
                  Regenerate
                </Button>
                <Button
                  variant="primary"
                  onClick={() => { if (preview) onGenerated(preview); }}
                  icon={<Icon icon="material-symbols:check" className="w-4 h-4" />}
                  className="!bg-purple-600 hover:!bg-purple-700"
                >
                  Use This Module
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
