"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useSupabase } from "@/lib/supabase-provider";
import RoleGuard from "@/app/components/RoleGuard";
import Button from "@/app/components/ui/Button";

interface Quiz {
  id: string;
  title: string;
  published: boolean;
}

interface QuizListProps {
  initialQuizzes: Quiz[];
}

export default function QuizList({ initialQuizzes }: QuizListProps) {
  const { supabase } = useSupabase();
  const [quizzes, setQuizzes] = React.useState(initialQuizzes);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = React.useState(false);

  // Load view preference from localStorage on mount
  React.useEffect(() => {
    const savedView = localStorage.getItem('quizViewMode') as 'grid' | 'list' | null;
    if (savedView && (savedView === 'grid' || savedView === 'list')) {
      setViewMode(savedView);
    }
  }, []);

  // Save view preference to localStorage when it changes
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('quizViewMode', mode);
  };

  const refreshQuizzes = async () => {
    try {
      setLoading(true);
      // Fetch fresh quiz list from API
      const response = await fetch('/api/quizzes', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      } else {
        console.error('Failed to refresh quizzes');
      }
    } catch (error) {
      console.error('Error refreshing quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(quizId);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        alert("You must be logged in to delete quizzes");
        return;
      }

      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to delete quiz: ${errorData.error || 'Unknown error'}`);
        return;
      }

      // Refresh the quiz list from server to ensure we have the latest data
      await refreshQuizzes();
      alert("Quiz deleted successfully");
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert("Failed to delete quiz. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-2">Quizzes</h1>
              <p className="text-gray-600">Manage and take quizzes to assess your knowledge</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Grid View"
                >
                  <Icon icon="material-symbols:grid-view" className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="List View"
                >
                  <Icon icon="material-symbols:view-list" className="w-5 h-5" />
                </button>
              </div>
              <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                <Link href="/quizzes/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all duration-200">
                    <Icon icon="material-symbols:add-circle-outline" className="w-5 h-5 mr-2" />
                    Create Quiz
                  </Button>
                </Link>
              </RoleGuard>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <Icon icon="material-symbols:hourglass-empty" className="w-5 h-5 animate-spin" />
              <span>Refreshing quiz list...</span>
            </div>
          </div>
        )}

        {/* Quizzes Display */}
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="material-symbols:quiz-outline" className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No quizzes available</h3>
            <p className="text-gray-600 mb-6">There are no quizzes to display at this time.</p>
            <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
              <Link href="/quizzes/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Icon icon="material-symbols:add-circle-outline" className="w-5 h-5 mr-2" />
                  Create Your First Quiz
                </Button>
              </Link>
            </RoleGuard>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {quiz.title || "Untitled Quiz"}
                      </h3>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quiz.published
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <Icon
                          icon={quiz.published ? "material-symbols:check-circle" : "material-symbols:draft"}
                          className="w-3 h-3 mr-1"
                        />
                        {quiz.published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Quiz ID (collapsible) */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <details className="group/details">
                      <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center">
                        <Icon icon="material-symbols:info-outline" className="w-3 h-3 mr-1" />
                        View Quiz ID
                        <Icon icon="material-symbols:expand-more" className="w-4 h-4 ml-auto group-open/details:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded-md">
                        <code className="text-xs text-gray-600 break-all">{quiz.id}</code>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quiz/${quiz.id}/attempt`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Icon icon="material-symbols:play-arrow" className="w-4 h-4 mr-1.5" />
                      Start Quiz
                    </Link>
                  </div>
                  <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/quizzes/${quiz.id}/edit`}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Quiz"
                      >
                        <Icon icon="material-symbols:edit-outline" className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => deleteQuiz(quiz.id)}
                        disabled={deleting === quiz.id}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Quiz"
                      >
                        {deleting === quiz.id ? (
                          <Icon icon="material-symbols:hourglass-empty" className="w-5 h-5 animate-spin" />
                        ) : (
                          <Icon icon="material-symbols:delete-outline" className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </RoleGuard>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View - Horizontal Scrollable */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quiz Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quiz ID
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizzes.map((quiz) => (
                    <tr
                      key={quiz.id}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600 mr-3">
                            <Icon icon="material-symbols:quiz" className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {quiz.title || "Untitled Quiz"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            quiz.published
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <Icon
                            icon={quiz.published ? "material-symbols:check-circle" : "material-symbols:draft"}
                            className="w-3 h-3 mr-1"
                          />
                          {quiz.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {quiz.id.substring(0, 8)}...
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/quiz/${quiz.id}/attempt`}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Icon icon="material-symbols:play-arrow" className="w-4 h-4 mr-1" />
                            Start
                          </Link>
                          <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                            <Link
                              href={`/quizzes/${quiz.id}/edit`}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Quiz"
                            >
                              <Icon icon="material-symbols:edit-outline" className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => deleteQuiz(quiz.id)}
                              disabled={deleting === quiz.id}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Quiz"
                            >
                              {deleting === quiz.id ? (
                                <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 animate-spin" />
                              ) : (
                                <Icon icon="material-symbols:delete-outline" className="w-4 h-4" />
                              )}
                            </button>
                          </RoleGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
