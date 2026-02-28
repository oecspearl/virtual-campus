'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Button from './Button';

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question_text: string;
  points: number;
  options?: { text: string; is_correct: boolean }[];
  feedback_correct?: string;
  feedback_incorrect?: string;
}

interface AIQuizGeneratorProps {
  lessonId?: string;
  lessonTitle?: string;
  courseId?: string;
  onQuestionsGenerated: (questions: GeneratedQuestion[]) => void;
  onClose: () => void;
}

type SourceType = 'topic' | 'content' | 'lesson';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

export default function AIQuizGenerator({
  lessonId,
  lessonTitle,
  courseId,
  onQuestionsGenerated,
  onClose
}: AIQuizGeneratorProps) {
  const [source, setSource] = useState<SourceType>(lessonId ? 'lesson' : 'topic');
  const [topic, setTopic] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['multiple_choice']);
  const [focusAreas, setFocusAreas] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<'configure' | 'preview'>('configure');

  const toggleQuestionType = (type: QuestionType) => {
    setQuestionTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow empty selection
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const requestBody: any = {
        source,
        questionCount,
        difficulty,
        questionTypes,
        focusAreas: focusAreas ? focusAreas.split(',').map(s => s.trim()).filter(Boolean) : undefined
      };

      if (source === 'lesson' && lessonId) {
        requestBody.lessonId = lessonId;
      } else if (source === 'topic') {
        if (!topic.trim()) {
          setError('Please enter a topic');
          setLoading(false);
          return;
        }
        requestBody.topic = topic;
      } else if (source === 'content') {
        if (!customContent.trim()) {
          setError('Please enter content to generate questions from');
          setLoading(false);
          return;
        }
        requestBody.content = customContent;
      }

      const response = await fetch('/api/ai/quiz-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      setGeneratedQuestions(data.questions);
      // Select all questions by default
      setSelectedQuestions(new Set(data.questions.map((_: any, i: number) => i)));
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating questions');
    } finally {
      setLoading(false);
    }
  }

  function toggleQuestionSelection(index: number) {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  function selectAll() {
    setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
  }

  function deselectAll() {
    setSelectedQuestions(new Set());
  }

  function handleAddSelected() {
    const selected = generatedQuestions.filter((_, i) => selectedQuestions.has(i));
    onQuestionsGenerated(selected);
  }

  const questionTypeLabels: Record<QuestionType, string> = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    short_answer: 'Short Answer',
    essay: 'Essay'
  };

  const questionTypeIcons: Record<QuestionType, string> = {
    multiple_choice: 'material-symbols:radio-button-checked',
    true_false: 'material-symbols:check-circle',
    short_answer: 'material-symbols:short-text',
    essay: 'material-symbols:article'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Icon icon="material-symbols:auto-awesome" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Quiz Generator</h2>
              <p className="text-sm text-purple-100">
                {step === 'configure' ? 'Configure your quiz settings' : 'Review and select questions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Icon icon="material-symbols:close" className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'configure' ? (
            <div className="space-y-6">
              {/* Source Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Source
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {lessonId && (
                    <button
                      onClick={() => setSource('lesson')}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        source === 'lesson'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon icon="material-symbols:menu-book" className={`w-6 h-6 mb-2 ${source === 'lesson' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <div className="font-medium text-sm">From Lesson</div>
                      <div className="text-xs text-gray-500 mt-1 truncate">{lessonTitle || 'Current lesson'}</div>
                    </button>
                  )}
                  <button
                    onClick={() => setSource('topic')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      source === 'topic'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon icon="material-symbols:lightbulb" className={`w-6 h-6 mb-2 ${source === 'topic' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div className="font-medium text-sm">From Topic</div>
                    <div className="text-xs text-gray-500 mt-1">Enter a topic or subject</div>
                  </button>
                  <button
                    onClick={() => setSource('content')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      source === 'content'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon icon="material-symbols:description" className={`w-6 h-6 mb-2 ${source === 'content' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div className="font-medium text-sm">From Content</div>
                    <div className="text-xs text-gray-500 mt-1">Paste your own content</div>
                  </button>
                </div>
              </div>

              {/* Source Input */}
              {source === 'topic' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic or Subject
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis, World War II, Python Programming"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}

              {source === 'content' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    placeholder="Paste your lesson content, notes, or any text you want to generate questions from..."
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    {[3, 5, 10, 15, 20].map(n => (
                      <option key={n} value={n}>{n} questions</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(questionTypeLabels) as QuestionType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => toggleQuestionType(type)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        questionTypes.includes(type)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon icon={questionTypeIcons[type]} className="w-4 h-4" />
                      <span className="text-sm">{questionTypeLabels[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Areas (Optional)
                </label>
                <input
                  type="text"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="e.g., key concepts, definitions, applications (comma-separated)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Specify areas to focus on, separated by commas
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* Preview Step */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedQuestions.size} of {generatedQuestions.length} questions selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleQuestionSelection(idx)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedQuestions.has(idx)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedQuestions.has(idx)
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedQuestions.has(idx) && (
                          <Icon icon="material-symbols:check" className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            q.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' :
                            q.type === 'true_false' ? 'bg-green-100 text-green-700' :
                            q.type === 'short_answer' ? 'bg-orange-100 text-orange-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {questionTypeLabels[q.type]}
                          </span>
                          <span className="text-xs text-gray-500">{q.points} point{q.points !== 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm text-gray-800">{q.question_text}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className={`text-xs px-3 py-1.5 rounded ${
                                opt.is_correct ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                              }`}>
                                {opt.is_correct && <Icon icon="material-symbols:check-circle" className="w-3 h-3 inline mr-1" />}
                                {opt.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          {step === 'preview' && (
            <button
              onClick={() => setStep('configure')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Icon icon="material-symbols:arrow-back" className="w-4 h-4" />
              Back to Settings
            </button>
          )}
          {step === 'configure' && <div />}

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {step === 'configure' ? (
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon icon="material-symbols:auto-awesome" className="w-4 h-4 mr-2" />
                    Generate Questions
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleAddSelected}
                disabled={selectedQuestions.size === 0}
              >
                <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
                Add {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
