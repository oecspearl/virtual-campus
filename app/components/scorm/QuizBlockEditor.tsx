'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import type { SCORMQuizQuestion, QuestionType, MCQOption } from '@/lib/scorm/types';

interface QuizBlockEditorProps {
  questions: SCORMQuizQuestion[];
  onChange: (questions: SCORMQuizQuestion[]) => void;
}

export default function QuizBlockEditor({ questions, onChange }: QuizBlockEditorProps) {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        id: `q-${Date.now()}`,
        type: 'mcq',
        prompt: '',
        options: [
          { id: `o-${Date.now()}-1`, text: '', correct: true },
          { id: `o-${Date.now()}-2`, text: '', correct: false },
        ],
        points: 10,
      },
    ]);
  };

  const updateQ = (idx: number, patch: Partial<SCORMQuizQuestion>) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const removeQ = (idx: number) => onChange(questions.filter((_, i) => i !== idx));

  const changeType = (idx: number, type: QuestionType) => {
    const patch: Partial<SCORMQuizQuestion> = { type };
    if (type === 'mcq') {
      patch.options = [
        { id: `o-${Date.now()}-1`, text: '', correct: true },
        { id: `o-${Date.now()}-2`, text: '', correct: false },
      ];
      patch.answer = undefined;
    } else {
      patch.options = undefined;
      patch.answer = type === 'true_false' ? 'true' : '';
    }
    updateQ(idx, patch);
  };

  const updateOption = (qIdx: number, oIdx: number, patch: Partial<MCQOption>) => {
    const q = questions[qIdx];
    if (!q.options) return;
    const opts = [...q.options];
    opts[oIdx] = { ...opts[oIdx], ...patch };
    if (patch.correct) opts.forEach((o, i) => { if (i !== oIdx) o.correct = false; });
    updateQ(qIdx, { options: opts });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Assessment Questions</h3>
        <span className="text-xs text-gray-500">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
      </div>

      {questions.map((q, qi) => (
        <div key={q.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Q{qi + 1}</span>
            <div className="flex items-center gap-2">
              <select
                value={q.type}
                onChange={(e) => changeType(qi, e.target.value as QuestionType)}
                className="text-xs rounded border border-gray-300 bg-white px-2 py-1"
              >
                <option value="mcq">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="fill_blank">Fill in the Blank</option>
              </select>
              <button onClick={() => removeQ(qi)} className="text-red-400 hover:text-red-600">
                <Icon icon="material-symbols:delete-outline" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <input
            type="text"
            value={q.prompt}
            onChange={(e) => updateQ(qi, { prompt: e.target.value })}
            placeholder="Enter question..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          {q.type === 'mcq' && q.options && (
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={opt.correct}
                    onChange={() => updateOption(qi, oi, { correct: true })}
                    className="accent-blue-600"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  {q.options!.length > 2 && (
                    <button onClick={() => {
                      const opts = q.options!.filter((_, i) => i !== oi);
                      updateQ(qi, { options: opts });
                    }} className="text-red-400 hover:text-red-600">
                      <Icon icon="material-symbols:close" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => updateQ(qi, { options: [...q.options!, { id: `o-${Date.now()}`, text: '', correct: false }] })}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Add option
              </button>
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="flex gap-4">
              {['true', 'false'].map((v) => (
                <label key={v} className="flex items-center gap-1.5 text-sm">
                  <input type="radio" checked={q.answer === v} onChange={() => updateQ(qi, { answer: v })} className="accent-blue-600" />
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
          )}

          {q.type === 'fill_blank' && (
            <input
              type="text"
              value={q.answer || ''}
              onChange={(e) => updateQ(qi, { answer: e.target.value })}
              placeholder="Correct answer"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          )}

          <div className="flex gap-3">
            <div>
              <label className="text-xs text-gray-500">Points</label>
              <input
                type="number"
                min={1}
                value={q.points}
                onChange={(e) => updateQ(qi, { points: parseInt(e.target.value) || 1 })}
                className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Feedback (optional)</label>
              <input
                type="text"
                value={q.feedback || ''}
                onChange={(e) => updateQ(qi, { feedback: e.target.value })}
                placeholder="Shown after answering"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        <Icon icon="material-symbols:add" className="w-4 h-4" />
        Add Question
      </button>
    </div>
  );
}
