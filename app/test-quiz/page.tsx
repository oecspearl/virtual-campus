"use client";

import React from "react";
import { useSupabase } from "@/lib/supabase-provider";

export default function TestQuizPage() {
  const { supabase } = useSupabase();
  const [quizzes, setQuizzes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          setError("You must be logged in");
          return;
        }

        // Fetch quizzes
        const response = await fetch('/api/quizzes', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(`Failed to fetch quizzes: ${errorData.error}`);
          return;
        }

        const data = await response.json();
        setQuizzes(data.quizzes || []);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
        setError("Failed to fetch quizzes");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [supabase]);

  const testQuizAttempt = async (quizId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("You must be logged in");
        return;
      }

      const response = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to start quiz: ${errorData.error}`);
        return;
      }

      const data = await response.json();
      alert(`Quiz attempt started successfully! Attempt ID: ${data.id}`);
    } catch (err) {
      console.error('Error starting quiz:', err);
      alert("Failed to start quiz");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading quizzes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <h1 className="text-lg font-medium text-red-800 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Quiz Test Page</h1>
      
      {quizzes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No quizzes found. Please run the SQL fix script first.</p>
          <a 
            href="/quizzes/create" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create a Quiz
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{quiz.title}</h2>
              <p className="text-gray-600 mb-2">{quiz.description}</p>
              <div className="text-sm text-gray-500 mb-3">
                <span className="font-medium">Quiz ID:</span> {quiz.id}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testQuizAttempt(quiz.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Test Quiz Attempt
                </button>
                <a
                  href={`/quiz/${quiz.id}/attempt`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Open Quiz Page
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
