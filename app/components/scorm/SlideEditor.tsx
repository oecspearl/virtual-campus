'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import type { SCORMSlide, SCORMQuizQuestion, QuestionType, MCQOption } from '@/lib/scorm/types';
import Button from '@/app/components/ui/Button';

interface SlideEditorProps {
  slide: SCORMSlide;
  index: number;
  total: number;
  onChange: (slide: SCORMSlide) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

export default function SlideEditor({ slide, index, total, onChange, onDelete, onMove }: SlideEditorProps) {
  const [showQuiz, setShowQuiz] = React.useState(!!slide.quiz);

  const updateField = <K extends keyof SCORMSlide>(key: K, value: SCORMSlide[K]) => {
    onChange({ ...slide, [key]: value });
  };

  // ─── Quiz helpers ──────────────────────────────────────────────────────────
  const addQuiz = () => {
    const q: SCORMQuizQuestion = {
      id: `q-${Date.now()}`,
      type: 'mcq',
      prompt: '',
      options: [
        { id: `o-${Date.now()}-1`, text: '', correct: true },
        { id: `o-${Date.now()}-2`, text: '', correct: false },
      ],
      points: 10,
    };
    updateField('quiz', q);
    setShowQuiz(true);
  };

  const removeQuiz = () => {
    updateField('quiz', undefined);
    setShowQuiz(false);
  };

  const updateQuiz = (patch: Partial<SCORMQuizQuestion>) => {
    if (!slide.quiz) return;
    updateField('quiz', { ...slide.quiz, ...patch });
  };

  const updateOption = (optIdx: number, patch: Partial<MCQOption>) => {
    if (!slide.quiz?.options) return;
    const opts = [...slide.quiz.options];
    opts[optIdx] = { ...opts[optIdx], ...patch };
    // If setting this option as correct, unmark others
    if (patch.correct) {
      opts.forEach((o, i) => { if (i !== optIdx) o.correct = false; });
    }
    updateQuiz({ options: opts });
  };

  const addOption = () => {
    if (!slide.quiz?.options) return;
    updateQuiz({
      options: [...slide.quiz.options, { id: `o-${Date.now()}`, text: '', correct: false }],
    });
  };

  const removeOption = (optIdx: number) => {
    if (!slide.quiz?.options || slide.quiz.options.length <= 2) return;
    updateQuiz({ options: slide.quiz.options.filter((_, i) => i !== optIdx) });
  };

  const changeQuizType = (type: QuestionType) => {
    if (!slide.quiz) return;
    const base: Partial<SCORMQuizQuestion> = { type };
    if (type === 'mcq') {
      base.options = [
        { id: `o-${Date.now()}-1`, text: '', correct: true },
        { id: `o-${Date.now()}-2`, text: '', correct: false },
      ];
      base.answer = undefined;
    } else if (type === 'true_false') {
      base.options = undefined;
      base.answer = 'true';
    } else if (type === 'fill_blank') {
      base.options = undefined;
      base.answer = '';
    }
    updateQuiz(base);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* ─── Slide header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Slide {index + 1}
          </span>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Slide title"
            className="text-sm font-medium bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 w-64"
          />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30" title="Move up">
            <Icon icon="material-symbols:arrow-upward" className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30" title="Move down">
            <Icon icon="material-symbols:arrow-downward" className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete slide">
            <Icon icon="material-symbols:delete-outline" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Slide content ────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Content (HTML supported)</label>
          <textarea
            value={slide.html}
            onChange={(e) => updateField('html', e.target.value)}
            rows={6}
            placeholder="<h2>Welcome</h2>\n<p>Write your slide content here...</p>"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* ─── Embedded quiz question ───────────────────────────────── */}
        {!showQuiz && (
          <button
            onClick={addQuiz}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
          >
            <Icon icon="material-symbols:quiz" className="w-4 h-4" />
            Add quiz question to this slide
          </button>
        )}

        {showQuiz && slide.quiz && (
          <div className="border border-blue-200 rounded-lg bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Quiz Question</span>
              <button onClick={removeQuiz} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>

            {/* Question type */}
            <select
              value={slide.quiz.type}
              onChange={(e) => changeQuizType(e.target.value as QuestionType)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>

            {/* Prompt */}
            <input
              type="text"
              value={slide.quiz.prompt}
              onChange={(e) => updateQuiz({ prompt: e.target.value })}
              placeholder="Enter question..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />

            {/* MCQ options */}
            {slide.quiz.type === 'mcq' && slide.quiz.options && (
              <div className="space-y-2">
                {slide.quiz.options.map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={opt.correct}
                      onChange={() => updateOption(oi, { correct: true })}
                      className="accent-blue-600"
                      title="Mark as correct"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOption(oi, { text: e.target.value })}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    {slide.quiz.options!.length > 2 && (
                      <button onClick={() => removeOption(oi)} className="text-red-400 hover:text-red-600">
                        <Icon icon="material-symbols:close" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addOption} className="text-xs text-blue-600 hover:text-blue-800">+ Add option</button>
              </div>
            )}

            {/* True/False */}
            {slide.quiz.type === 'true_false' && (
              <div className="flex gap-4">
                {['true', 'false'].map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      checked={slide.quiz!.answer === v}
                      onChange={() => updateQuiz({ answer: v })}
                      className="accent-blue-600"
                    />
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </label>
                ))}
              </div>
            )}

            {/* Fill blank */}
            {slide.quiz.type === 'fill_blank' && (
              <input
                type="text"
                value={slide.quiz.answer || ''}
                onChange={(e) => updateQuiz({ answer: e.target.value })}
                placeholder="Correct answer"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            )}

            {/* Points & feedback */}
            <div className="flex gap-3">
              <div>
                <label className="text-xs text-gray-500">Points</label>
                <input
                  type="number"
                  min={1}
                  value={slide.quiz.points}
                  onChange={(e) => updateQuiz({ points: parseInt(e.target.value) || 1 })}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Feedback (optional)</label>
                <input
                  type="text"
                  value={slide.quiz.feedback || ''}
                  onChange={(e) => updateQuiz({ feedback: e.target.value })}
                  placeholder="Shown after answering"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
