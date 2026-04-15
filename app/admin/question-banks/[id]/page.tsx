'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

interface Question {
  id: string;
  type: string;
  question_text: string;
  points: number;
  difficulty?: string;
  tags: string[];
  usage_count: number;
}

export default function QuestionBankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bankId = params.id as string;
  
  const [bank, setBank] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [formData, setFormData] = useState({
    type: 'multiple_choice',
    question_text: '',
    points: 1,
    options: [] as Array<{ text: string; is_correct: boolean }>,
    correct_answer: '',
    case_sensitive: false,
    feedback_correct: '',
    feedback_incorrect: '',
    explanation: '',
    difficulty: '',
    tags: '',
    topic: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bankId) {
      loadBank();
      loadQuestions();
    }
  }, [bankId, filterType, filterDifficulty]);

  const loadBank = async () => {
    try {
      const response = await fetch(`/api/question-banks`);
      if (response.ok) {
        const banks = await response.json();
        const foundBank = banks.find((b: any) => b.id === bankId);
        setBank(foundBank);
      }
    } catch (error) {
      console.error('Failed to load bank:', error);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      let url = `/api/question-banks/${bankId}/questions`;
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQuiz = (questionId: string) => {
    // This would open a modal or navigate to quiz creation with this question
    alert('Feature: Add question to quiz. Question ID: ' + questionId);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate multiple choice has at least 2 options and one correct
    if (formData.type === 'multiple_choice') {
      if (formData.options.length < 2) {
        alert('Please add at least 2 answer options');
        return;
      }
      if (!formData.options.some(opt => opt.is_correct)) {
        alert('Please select a correct answer');
        return;
      }
      if (formData.options.some(opt => !opt.text.trim())) {
        alert('Please fill in all option texts');
        return;
      }
    }
    
    setSaving(true);
    
    try {
      // Format options for multiple choice
      let options = null;
      let correctAnswer = null;
      
      if (formData.type === 'multiple_choice') {
        options = formData.options.map(opt => ({ text: opt.text }));
        const correctIndex = formData.options.findIndex(opt => opt.is_correct);
        correctAnswer = { answer: correctIndex >= 0 ? correctIndex : 0 };
      } else if (formData.type === 'true_false') {
        if (!formData.correct_answer) {
          alert('Please select a correct answer');
          setSaving(false);
          return;
        }
        correctAnswer = { answer: formData.correct_answer === 'true' };
      } else if (formData.type === 'short_answer' || formData.type === 'fill_blank') {
        if (!formData.correct_answer || !formData.correct_answer.trim()) {
          alert('Please enter a correct answer');
          setSaving(false);
          return;
        }
        correctAnswer = { answer: formData.correct_answer };
      } else {
        // Essay questions don't need a correct answer
        correctAnswer = null;
      }

      const response = await fetch(`/api/question-banks/${bankId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          question_text: formData.question_text,
          points: formData.points,
          options: options,
          correct_answer: correctAnswer,
          case_sensitive: formData.case_sensitive,
          feedback_correct: formData.feedback_correct || null,
          feedback_incorrect: formData.feedback_incorrect || null,
          explanation: formData.explanation || null,
          difficulty: formData.difficulty || null,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          topic: formData.topic || null,
        }),
      });

      if (response.ok) {
        await loadQuestions();
        setShowAddForm(false);
        setFormData({
          type: 'multiple_choice',
          question_text: '',
          points: 1,
          options: [],
          correct_answer: '',
          case_sensitive: false,
          feedback_correct: '',
          feedback_incorrect: '',
          explanation: '',
          difficulty: '',
          tags: '',
          topic: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create question');
      }
    } catch (error) {
      console.error('Failed to create question:', error);
      alert('Failed to create question');
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '', is_correct: false }],
    });
  };

  const updateOption = (index: number, field: 'text' | 'is_correct', value: string | boolean) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/question-banks')}
          className="mb-4"
        >
          <Icon icon="material-symbols:arrow-back" className="w-4 h-4 mr-2" />
          Back to Question Banks
        </Button>
        
        {bank && (
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">{bank.name}</h1>
            {bank.description && (
              <p className="mt-2 text-gray-600">{bank.description}</p>
            )}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span>{bank.question_count} questions</span>
              <span>•</span>
              <span>{bank.usage_count} uses</span>
              {bank.subject_area && (
                <>
                  <span>•</span>
                  <span>{bank.subject_area}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add Question to Bank</h2>
          <form onSubmit={handleSubmitQuestion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, options: [] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="essay">Essay</option>
                  <option value="fill_blank">Fill in the Blank</option>
                  <option value="matching">Matching</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Text *
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                required
              />
            </div>

            {formData.type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer Options * (check the correct answer)
                </label>
                {formData.options.length === 0 && (
                  <div className="mb-2 text-sm text-gray-500">
                    Click "Add Option" to add answer choices
                  </div>
                )}
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      type="text"
                      value={option.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                      required
                    />
                    <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="correct_answer"
                        checked={option.is_correct}
                        onChange={() => {
                          // Set only this option as correct
                          const newOptions = formData.options.map((opt, i) => ({
                            ...opt,
                            is_correct: i === index,
                          }));
                          setFormData({ ...formData, options: newOptions });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Correct</span>
                    </label>
                    {formData.options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <Icon icon="material-symbols:delete" className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  className="mt-2"
                >
                  <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
                {formData.options.length > 0 && formData.options.every(opt => !opt.is_correct) && (
                  <p className="mt-2 text-sm text-red-600">Please select a correct answer</p>
                )}
              </div>
            )}

            {(formData.type === 'true_false' || formData.type === 'short_answer' || formData.type === 'fill_blank') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answer *
                </label>
                {formData.type === 'true_false' ? (
                  <select
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select answer</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    required
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <Input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., algebra, calculus"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Explanation (optional)
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder="Explain why this is the correct answer"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : 'Add Question'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    type: 'multiple_choice',
                    question_text: '',
                    points: 1,
                    options: [],
                    correct_answer: '',
                    case_sensitive: false,
                    feedback_correct: '',
                    feedback_incorrect: '',
                    explanation: '',
                    difficulty: '',
                    tags: '',
                    topic: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
            <option value="fill_blank">Fill in the Blank</option>
            <option value="matching">Matching</option>
          </select>
          
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setShowAddForm(true);
            // Initialize with default options for multiple choice
            if (formData.type === 'multiple_choice' && formData.options.length === 0) {
              setFormData({
                ...formData,
                options: [
                  { text: '', is_correct: false },
                  { text: '', is_correct: false },
                ],
              });
            }
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {question.type.replace('_', ' ')}
                    </span>
                    {question.difficulty && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {question.difficulty}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{question.points} points</span>
                  </div>
                  
                  <p className="text-gray-900 mb-3">{question.question_text}</p>
                  
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {question.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Used {question.usage_count} times
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddToQuiz(question.id)}
                  className="ml-4"
                >
                  <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
                  Add to Quiz
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Icon icon="material-symbols:quiz" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Yet</h3>
          <p className="text-gray-600 mb-6">Add questions to this bank to get started.</p>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      )}
    </div>
  );
}

