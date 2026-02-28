"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

interface Student {
  id: string;
  name: string;
  email: string;
}

interface GradeItem {
  id: string;
  title: string;
  type: 'quiz' | 'assignment' | 'other';
  category: string;
  points: number;
  assessment_id?: string;
  is_active: boolean;
  due_date?: string;
  weight: number;
}

interface Grade {
  id: string;
  student_id: string;
  grade_item_id: string;
  score: number;
  max_score: number;
  percentage: number;
  feedback?: string;
  graded_at?: string;
  grade_item?: {
    title: string;
    type: string;
    category: string;
    points: number;
  };
}

interface GradebookSettings {
  grading_scheme?: string;
  total_points?: number;
  categories?: { name: string; weight: number; color: string }[];
  show_points_to_students?: boolean;
  show_percentages_to_students?: boolean;
  show_letter_grades?: boolean;
}

interface StudentGradebookProps {
  courseId: string;
  initialData?: {
    course: { id: string; title: string; description: string };
    items: GradeItem[];
    grades: Grade[];
    settings?: GradebookSettings;
  };
}

// Helper to convert percentage to letter grade
function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

export default function StudentGradebook({
  courseId,
  initialData
}: StudentGradebookProps) {
  const [course, setCourse] = useState(initialData?.course || null);
  const [items, setItems] = useState<GradeItem[]>(initialData?.items || []);
  const [grades, setGrades] = useState<Grade[]>(initialData?.grades || []);
  const [settings, setSettings] = useState<GradebookSettings>(initialData?.settings || {});
  const [loading, setLoading] = useState(!initialData);

  // Get display preferences from settings with sensible defaults
  const showPoints = settings.show_points_to_students !== false;
  const showPercentages = settings.show_percentages_to_students !== false;
  const showLetterGrades = settings.show_letter_grades === true;

  // Memoize loadGradebook to avoid recreating it on every render
  const loadGradebook = useCallback(async () => {
    try {
      setLoading(true);
      // Use cache-busting headers and timestamp to ensure fresh data
      const res = await fetch(`/api/courses/${courseId}/gradebook?t=${Date.now()}`, { 
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) {
        console.error('Failed to load gradebook');
        return;
      }
      const data = await res.json();
      setCourse(data.course);
      setItems(data.items || []);
      setGrades(data.grades || []);
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading gradebook:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // Always load gradebook on mount to ensure we have the latest data
  // This ensures the API route's auto-creation logic for published quizzes/assignments runs
  useEffect(() => {
    loadGradebook();
  }, [loadGradebook]);

  // Refresh gradebook when page becomes visible (e.g., after returning from quiz)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadGradebook();
      }
    };

    const handleFocus = () => {
      loadGradebook();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadGradebook]);

  // Create grade index for quick lookup
  const gradeIndex = useMemo(() => {
    const m = new Map<string, Grade>();
    for (const g of grades) {
      m.set(g.grade_item_id, g);
    }
    return m;
  }, [grades]);

  // Calculate totals
  const totals = useMemo(() => {
    let points = 0;
    let max = 0;
    
    for (const item of items) {
      const grade = gradeIndex.get(item.id);
      if (grade) {
        points += grade.score;
      }
      max += item.points;
    }
    
    const percentage = max > 0 ? Math.round((points / max) * 100) : 0;
    return { points, max, percentage };
  }, [items, gradeIndex]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, GradeItem[]>();
    
    for (const item of items) {
      const category = item.category || 'Other';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(item);
    }
    
    return grouped;
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your grades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
            <p className="text-gray-600 mt-1">{course?.title}</p>
          </div>
          <button
            onClick={loadGradebook}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Overall Grade Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Overall Grade</h3>
              {showPoints && (
                <p className="text-sm text-gray-600">
                  {totals.points} out of {totals.max} points
                </p>
              )}
            </div>
            <div className="text-right">
              {showLetterGrades && (
                <div className="text-3xl font-bold text-blue-600">
                  {getLetterGrade(totals.percentage)}
                </div>
              )}
              {showPercentages && (
                <div className={`${showLetterGrades ? 'text-lg' : 'text-3xl'} font-bold text-blue-600`}>
                  {totals.percentage}%
                </div>
              )}
              {!showLetterGrades && !showPercentages && showPoints && (
                <div className="text-lg font-bold text-blue-600">
                  {totals.points}/{totals.max}
                </div>
              )}
              <div className="text-sm text-gray-600">Average</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(totals.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Grades by Category */}
      {Array.from(itemsByCategory.entries()).map(([category, categoryItems]) => (
        <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {categoryItems.map((item) => {
              const grade = gradeIndex.get(item.id);
              const hasGrade = !!grade;
              const percentage = hasGrade ? grade!.percentage : 0;
              
              return (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-gray-900">
                        {item.title}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-500">
                          {item.points} points
                        </span>
                        <span className="text-sm text-gray-500">
                          {item.type === 'quiz' ? 'Quiz' : item.type === 'assignment' ? 'Assignment' : 'Other'}
                        </span>
                        {item.due_date && (
                          <span className="text-sm text-gray-500">
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {hasGrade ? (
                        <div className="flex flex-col items-end">
                          {showLetterGrades && (
                            <div className={`text-lg font-bold ${
                              percentage >= 90 ? 'text-green-600' :
                              percentage >= 80 ? 'text-blue-600' :
                              percentage >= 70 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {getLetterGrade(percentage)}
                            </div>
                          )}
                          {showPoints && (
                            <div className={`${showLetterGrades ? 'text-sm' : 'text-lg'} font-semibold text-gray-900`}>
                              {grade!.score}/{item.points}
                            </div>
                          )}
                          {showPercentages && (
                            <div className={`text-sm font-medium ${
                              percentage >= 90 ? 'text-green-600' :
                              percentage >= 80 ? 'text-blue-600' :
                              percentage >= 70 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {percentage}%
                            </div>
                          )}
                          {grade!.graded_at && (
                            <div className="text-xs text-gray-500">
                              {new Date(grade!.graded_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Not graded</div>
                          {showPoints && (
                            <div className="text-xs text-gray-400">
                              {item.points} points
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Feedback */}
                  {hasGrade && grade!.feedback && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Feedback:</h5>
                      <p className="text-sm text-gray-600">{grade!.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No grades yet</h3>
          <p className="text-gray-500">
            Your instructor hasn't assigned any graded activities yet.
          </p>
        </div>
      )}
    </div>
  );
}
