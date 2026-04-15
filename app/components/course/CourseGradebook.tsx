"use client";

import React, { useState, useEffect, useMemo } from "react";

export type GradeItem = { 
  id: string; 
  title: string; 
  points: number; 
  type: string;
  category: string;
  due_date?: string;
  weight: number;
};

export type Grade = {
  id: string;
  student_id: string;
  grade_item_id: string;
  score: number;
  max_score: number;
  percentage: number;
  feedback?: string;
  graded_at?: string;
};

export type Student = { 
  id: string; 
  name: string; 
  email: string; 
};

export type GradebookSettings = {
  id: string;
  grading_scheme: string;
  categories: any[];
  total_points: number;
};

export type CourseQuiz = {
  id: string;
  title: string;
  description: string;
  points: number;
  lesson_id: string;
  lesson_title: string;
  published: boolean;
  is_activated: boolean;
  created_at: string;
};

export type CourseAssignment = {
  id: string;
  title: string;
  description: string;
  points: number;
  lesson_id: string;
  lesson_title: string;
  published: boolean;
  is_activated: boolean;
  due_date: string;
  created_at: string;
};

interface CourseGradebookProps {
  courseId: string;
  initialData?: {
    course: any;
    students: Student[];
    items: GradeItem[];
    grades: Grade[];
    settings: GradebookSettings | null;
    quizzes: CourseQuiz[];
    assignments: CourseAssignment[];
  };
}

export default function CourseGradebook({ courseId, initialData }: CourseGradebookProps) {
  const [students, setStudents] = useState<Student[]>(initialData?.students || []);
  const [items, setItems] = useState<GradeItem[]>(initialData?.items || []);
  const [grades, setGrades] = useState<Grade[]>(initialData?.grades || []);
  const [settings, setSettings] = useState<GradebookSettings | null>(initialData?.settings || null);
  const [quizzes, setQuizzes] = useState<CourseQuiz[]>(initialData?.quizzes || []);
  const [assignments, setAssignments] = useState<CourseAssignment[]>(initialData?.assignments || []);
  const [loading, setLoading] = useState(!initialData);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!initialData) {
      loadGradebook();
    }
  }, [courseId]);

  // Refresh gradebook when page becomes visible (e.g., after returning from quiz edit)
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
  }, [courseId]);

  async function loadGradebook() {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${courseId}/gradebook`, { 
        cache: "no-store" 
      });
      if (!res.ok) {
        console.error('Failed to load gradebook');
        return;
      }
      const data = await res.json();
      setStudents(data.students || []);
      setItems(data.items || []);
      setGrades(data.grades || []);
      setSettings(data.settings || null);
      setQuizzes(data.quizzes || []);
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error loading gradebook:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAssessmentActivation(assessmentId: string, assessmentType: 'quiz' | 'assignment', isActivated: boolean) {
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          assessmentType,
          action: isActivated ? 'deactivate' : 'activate'
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to ${isActivated ? 'deactivate' : 'activate'} ${assessmentType}: ${errorData.error}`);
        return;
      }

      // Update local state
      if (assessmentType === 'quiz') {
        setQuizzes(prev => prev.map(quiz => 
          quiz.id === assessmentId 
            ? { ...quiz, is_activated: !isActivated }
            : quiz
        ));
      } else {
        setAssignments(prev => prev.map(assignment => 
          assignment.id === assessmentId 
            ? { ...assignment, is_activated: !isActivated }
            : assignment
        ));
      }

      // Reload gradebook data
      await loadGradebook();
    } catch (error) {
      console.error('Error toggling assessment activation:', error);
      alert(`Failed to update ${assessmentType} status. Please try again.`);
    }
  }

  async function syncQuizScores() {
    try {
      setSyncing(true);
      const res = await fetch(`/api/courses/${courseId}/gradebook/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to sync scores: ${errorData.error}`);
        return;
      }

      const data = await res.json();
      alert(data.message);
      
      // Reload gradebook data
      await loadGradebook();
    } catch (error) {
      console.error('Error syncing scores:', error);
      alert('Failed to sync scores. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  const gradeIndex = useMemo(() => {
    const m = new Map<string, Grade>();
    for (const g of grades) {
      m.set(`${g.student_id}:${g.grade_item_id}`, g);
    }
    return m;
  }, [grades]);

  async function saveScore(studentId: string, item: GradeItem, score: number) {
    const key = `${studentId}:${item.id}`;
    const existing = gradeIndex.get(key);
    
    try {
      if (existing) {
        // Update existing grade
        await fetch(`/api/courses/${courseId}/gradebook/grades`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: existing.id, 
            score,
            feedback: existing.feedback 
          })
        });
      } else {
        // Create new grade
        await fetch(`/api/courses/${courseId}/gradebook/grades`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries: [{
              grade_item_id: item.id,
              student_id: studentId,
              score
            }]
          })
        });
      }
      await loadGradebook();
    } catch (error) {
      console.error('Error saving grade:', error);
    }
  }

  function totalFor(studentId: string): { points: number; max: number; percentage: number } {
    let points = 0;
    let max = 0;
    
    for (const item of items) {
      const grade = gradeIndex.get(`${studentId}:${item.id}`);
      if (grade) {
        points += grade.score;
      }
      max += item.points;
    }
    
    const percentage = max > 0 ? (points / max) * 100 : 0;
    return { points, max, percentage: Number(percentage.toFixed(2)) };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading gradebook...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Course Gradebook</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {students.length} students • {items.length} grade items • {quizzes.length} quizzes • {assignments.length} assignments
          </div>
          <button
            onClick={syncQuizScores}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {syncing ? "Syncing..." : "Sync Quiz Scores"}
          </button>
        </div>
      </div>

      {/* Assessment Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Assessment Management
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Activate quizzes and assignments to include them in the gradebook. Quizzes will automatically sync scores, while assignments require manual grading.
        </p>
        
        {quizzes.length === 0 && assignments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No assessments found for this course</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quizzes Section */}
            {quizzes.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Quizzes ({quizzes.length})
                </h3>
                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            quiz.is_activated 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {quiz.is_activated ? 'Activated' : 'Inactive'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            quiz.published 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {quiz.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {quiz.lesson_title} • {quiz.points} points • Auto-sync scores
                        </p>
                      </div>
                      <button
                        onClick={() => toggleAssessmentActivation(quiz.id, 'quiz', quiz.is_activated)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          quiz.is_activated
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {quiz.is_activated ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments Section */}
            {assignments.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Assignments ({assignments.length})
                </h3>
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-900">{assignment.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            assignment.is_activated 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.is_activated ? 'Activated' : 'Inactive'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            assignment.published 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {assignment.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {assignment.lesson_title} • {assignment.points} points • Manual grading required
                          {assignment.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleAssessmentActivation(assignment.id, 'assignment', assignment.is_activated)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          assignment.is_activated
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {assignment.is_activated ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grade Items Header */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-3 text-left font-medium text-gray-700 min-w-[200px]">
                Student
              </th>
              {items.map((item) => (
                <th key={item.id} className="border p-3 text-center font-medium text-gray-700 min-w-[120px]">
                  <div className="text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.points} pts</div>
                </th>
              ))}
              <th className="border p-3 text-center font-medium text-gray-700 min-w-[100px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const total = totalFor(student.id);
              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="border p-3">
                    <div>
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </td>
                  {items.map((item) => {
                    const grade = gradeIndex.get(`${student.id}:${item.id}`);
                    return (
                      <td key={item.id} className="border p-2">
                        <input
                          type="number"
                          min="0"
                          max={item.points}
                          value={grade?.score || ""}
                          onChange={(e) => {
                            const score = e.target.value ? Number(e.target.value) : 0;
                            saveScore(student.id, item, score);
                          }}
                          className="w-full text-center border rounded px-2 py-1 text-sm"
                          placeholder="0"
                        />
                        {grade && (
                          <div className="text-xs text-gray-500 mt-1">
                            {grade.percentage.toFixed(1)}%
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border p-3 text-center font-medium">
                    <div>{total.points} / {total.max}</div>
                    <div className="text-sm text-gray-500">{total.percentage}%</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grade Items Management */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Items</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-gray-500">
                  {item.type} • {item.category} • {item.points} points
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Weight: {item.weight}x
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
