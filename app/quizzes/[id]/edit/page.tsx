"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import QuizBuilder from "@/app/components/QuizBuilder";
import { useSupabase } from "@/lib/supabase-provider";
import RoleGuard from "@/app/components/RoleGuard";
import Breadcrumb from "@/app/components/Breadcrumb";

export default function EditQuizPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { supabase } = useSupabase();
  const [quiz, setQuiz] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!params.id) return;

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          setError("You must be logged in to edit quizzes");
          return;
        }

        // Fetch quiz data
        const response = await fetch(`/api/quizzes/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError("Quiz not found");
          } else if (response.status === 403) {
            setError("You don't have permission to edit this quiz");
          } else {
            setError("Failed to load quiz");
          }
          return;
        }

        const quizData = await response.json();
        setQuiz(quizData);
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <h1 className="text-lg font-medium text-red-800 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <div className="text-center">
          <h1 className="text-lg font-medium text-gray-900 mb-2">Quiz not found</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]} fallback={
      <div className="min-h-screen bg-gradient-to-br from-white via-oecs-light-green/5 to-oecs-light-green/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to edit quizzes.</p>
          <p className="text-sm text-gray-500">Only instructors, curriculum designers, and administrators can edit quizzes.</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Quizzes', href: '/quizzes' },
              { label: quiz.title || 'Quiz', href: `/quiz/${params.id}` },
              { label: 'Edit' },
            ]}
            className="mb-6"
          />
          <QuizBuilder 
            quizId={params.id}
            initialData={quiz}
            mode="edit"
            onSave={() => router.push('/quizzes')}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
