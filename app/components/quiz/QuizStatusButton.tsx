"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface QuizStatusButtonProps {
  quiz: any;
  quizId: string;
}

export default function QuizStatusButton({ quiz, quizId }: QuizStatusButtonProps) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAttempts() {
      try {
        const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/attempts`);
        if (res.ok) {
          const data = await res.json();
          setAttempts(data.attempts || []);
        }
      } catch (error) {
        console.error('Error fetching attempts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAttempts();
  }, [quizId]);

  // Check quiz availability
  const now = new Date();
  const availableFrom = quiz.available_from ? new Date(quiz.available_from) : null;
  const availableUntil = quiz.available_until ? new Date(quiz.available_until) : null;
  
  const isNotYetAvailable = availableFrom && now < availableFrom;
  const isExpired = availableUntil && now > availableUntil;
  const attemptsAllowed = Number(quiz.attempts_allowed ?? 1);
  const attemptsUsed = attempts.length;
  const hasAttemptsLeft = attemptsUsed < attemptsAllowed;

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-2 bg-gray-400 text-white text-xs sm:text-sm font-medium rounded-lg cursor-not-allowed w-full sm:w-auto flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-white animate-bounce" />
          <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.15s' }} />
          <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.3s' }} />
        </span>
        Loading...
      </div>
    );
  }

  if (isNotYetAvailable) {
    return (
      <div className="px-3 sm:px-4 py-2 bg-gray-400 text-white text-xs sm:text-sm font-medium rounded-lg cursor-not-allowed w-full sm:w-auto">
        Not Available Yet
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="px-3 sm:px-4 py-2 bg-gray-400 text-white text-xs sm:text-sm font-medium rounded-lg cursor-not-allowed w-full sm:w-auto">
        Quiz Expired
      </div>
    );
  }

  if (!hasAttemptsLeft) {
    return (
      <div className="px-3 sm:px-4 py-2 bg-yellow-600 text-white text-xs sm:text-sm font-medium rounded-lg cursor-not-allowed w-full sm:w-auto">
        No Attempts Left
      </div>
    );
  }

  return (
    <Link
      href={`/quiz/${quizId}/attempt`}
      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center group-hover:scale-105 transform duration-300 text-xs sm:text-sm w-full sm:w-auto"
    >
      <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="hidden sm:inline">Start Quiz ({attemptsAllowed - attemptsUsed} left)</span>
      <span className="sm:hidden">Start ({attemptsAllowed - attemptsUsed})</span>
    </Link>
  );
}
