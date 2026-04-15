'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ProgressBar from '@/app/components/ui/ProgressBar';
import { formatModality, getModalityIcon } from './helpers';

interface CourseEnrollmentCardProps {
  course: {
    modality: string;
    difficulty: string;
    estimated_duration: string | null;
    subject_area?: string | null;
  };
  lessonCount: number;
  enrollmentStatus: 'checking' | 'enrolled' | 'not_enrolled';
  enrolling: boolean;
  onEnroll: () => void;
  onDrop?: () => void;
  onStartLearning?: () => void;
  sourceTenantName?: string | null;
  progress?: { total: number; completed: number; percentage: number } | null;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function CourseEnrollmentCard({
  course,
  lessonCount,
  enrollmentStatus,
  enrolling,
  onEnroll,
  onDrop,
  onStartLearning,
  sourceTenantName,
  progress,
  collapsible = false,
  defaultOpen = true,
}: CourseEnrollmentCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrollDirection(currentY > lastScrollY.current ? 'down' : 'up');
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="rounded-lg sm:rounded-lg border border-gray-100 overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 3%, white)',
        opacity: scrollDirection === 'down' ? 0 : 1,
        transform: scrollDirection === 'down' ? 'translateY(-8px)' : 'translateY(0)',
        pointerEvents: scrollDirection === 'down' ? 'none' : 'auto',
      }}
    >
      {/* Header */}
      <div
        className={`px-4 sm:px-6 py-4 sm:py-5 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        style={{
          background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
        }}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-display text-white">Get Started</h3>
            <p className="text-sm text-white/70 mt-0.5">
              {sourceTenantName ? `From ${sourceTenantName}` : 'Join this course today'}
            </p>
          </div>
          {collapsible && (
            <svg className={`w-5 h-5 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Info rows */}
      {(!collapsible || isOpen) && (
      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
        {/* Modality */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2">
            <span>{getModalityIcon(course.modality)}</span>
            Modality
          </span>
          <span className="font-medium text-gray-900">{formatModality(course.modality)}</span>
        </div>

        {/* Difficulty */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Difficulty
          </span>
          <span className="font-medium text-gray-900 capitalize">{course.difficulty || 'All Levels'}</span>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Duration
          </span>
          <span className="font-medium text-gray-900">{course.estimated_duration || 'Flexible'}</span>
        </div>

        {/* Lessons */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Lessons
          </span>
          <span className="font-medium text-gray-900">{lessonCount}</span>
        </div>

        {/* Subject area */}
        {course.subject_area && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Subject
            </span>
            <span className="font-medium text-gray-900">{course.subject_area}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 my-1"></div>

        {/* Progress bar (when enrolled and progress exists) */}
        {enrollmentStatus === 'enrolled' && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium text-gray-900">{progress.completed}/{progress.total} completed</span>
            </div>
            <ProgressBar value={progress.percentage} />
            <p className="text-xs text-gray-400 text-right">{progress.percentage}% complete</p>
          </div>
        )}

        {/* Action area */}
        <div className="pt-2 space-y-3">
          {enrollmentStatus === 'checking' && (
            <div className="flex items-center justify-center py-3">
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--theme-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}

          {enrollmentStatus === 'enrolled' && (
            <>
              <div className="flex items-center justify-center gap-2 py-2 px-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-semibold">Enrolled</span>
              </div>

              {onStartLearning ? (
                <button
                  onClick={onStartLearning}
                  className="w-full py-2.5 px-4 text-white rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                    boxShadow: '0 4px 14px color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                  }}
                >
                  Start Learning
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="block w-full text-center py-2.5 px-4 text-white rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                    boxShadow: '0 4px 14px color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                  }}
                >
                  View in My Courses
                </Link>
              )}

              {onDrop && (
                <button
                  onClick={onDrop}
                  className="w-full py-2 px-4 bg-white text-red-600 rounded-lg font-medium text-sm border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Drop Course
                </button>
              )}
            </>
          )}

          {enrollmentStatus === 'not_enrolled' && (
            <button
              onClick={onEnroll}
              disabled={enrolling}
              className="w-full py-3 px-4 text-white rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                boxShadow: '0 4px 14px color-mix(in srgb, var(--theme-primary) 30%, transparent)',
              }}
            >
              {enrolling ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enrolling...
                </>
              ) : (
                'Enroll Now'
              )}
            </button>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
