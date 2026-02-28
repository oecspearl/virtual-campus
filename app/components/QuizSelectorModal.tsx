'use client';

import React from 'react';
import { Icon } from '@iconify/react';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  published: boolean;
  points?: number;
  time_limit?: number;
  created_at?: string;
}

interface QuizSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (quizId: string) => void;
  courseId?: string | null;
  lessonId?: string;
}

export default function QuizSelectorModal({
  isOpen,
  onClose,
  onSelect,
  courseId,
  lessonId
}: QuizSelectorModalProps) {
  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedQuizId, setSelectedQuizId] = React.useState<string | null>(null);

  // Fetch quizzes when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    async function fetchQuizzes() {
      setLoading(true);
      try {
        // Fetch quizzes - optionally filter by course
        let url = '/api/quizzes';
        if (courseId) {
          url += `?course_id=${courseId}`;
        }

        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data.quizzes || []);
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchQuizzes();
  }, [isOpen, courseId]);

  // Filter quizzes based on search
  const filteredQuizzes = React.useMemo(() => {
    if (!searchQuery.trim()) return quizzes;
    const query = searchQuery.toLowerCase();
    return quizzes.filter(
      q => q.title.toLowerCase().includes(query) ||
           q.description?.toLowerCase().includes(query)
    );
  }, [quizzes, searchQuery]);

  const handleSelect = () => {
    if (selectedQuizId) {
      onSelect(selectedQuizId);
      onClose();
    }
  };

  const handleCreateNew = () => {
    // Open quiz creation in a new tab with lesson_id and course_id
    let url = '/quizzes/create';
    const params = new URLSearchParams();
    if (lessonId) params.set('lesson_id', lessonId);
    if (courseId) params.set('course_id', courseId);
    if (params.toString()) url += `?${params.toString()}`;

    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Quiz</h2>
            <p className="text-sm text-gray-500 mt-1">Choose an existing quiz or create a new one</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="relative">
            <Icon
              icon="material-symbols:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quizzes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Quiz List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="material-symbols:hourglass-empty" className="w-8 h-8 text-gray-400 animate-spin" />
              <span className="ml-3 text-gray-500">Loading quizzes...</span>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="material-symbols:quiz-outline" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No quizzes found' : 'No quizzes available'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery
                  ? 'Try a different search term or create a new quiz'
                  : 'Create your first quiz to get started'
                }
              </p>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Icon icon="material-symbols:add" className="w-5 h-5" />
                Create New Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => setSelectedQuizId(quiz.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedQuizId === quiz.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      selectedQuizId === quiz.id ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon
                        icon="material-symbols:quiz"
                        className={`w-6 h-6 ${
                          selectedQuizId === quiz.id ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{quiz.title}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          quiz.published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {quiz.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {quiz.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{quiz.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {quiz.points && (
                          <span className="flex items-center gap-1">
                            <Icon icon="material-symbols:star" className="w-3 h-3" />
                            {quiz.points} pts
                          </span>
                        )}
                        {quiz.time_limit && (
                          <span className="flex items-center gap-1">
                            <Icon icon="material-symbols:timer" className="w-3 h-3" />
                            {quiz.time_limit} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:tag" className="w-3 h-3" />
                          {quiz.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                    {selectedQuizId === quiz.id && (
                      <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider with Create New option */}
        {filteredQuizzes.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Icon icon="material-symbols:add-circle-outline" className="w-5 h-5" />
              Create New Quiz
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedQuizId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Select Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
