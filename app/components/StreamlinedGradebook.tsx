"use client";

import React, { useState, useEffect, useMemo } from "react";
import Button from "@/app/components/Button";
import BulkGradeUpload from "@/app/components/BulkGradeUpload";

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
}

interface GradebookStats {
  total_students: number;
  active_grade_items: number;
  inactive_grade_items: number;
  total_grades: number;
  courses_with_orphaned_items: number;
}

interface GradebookSettings {
  grading_scheme?: string;
  total_points?: number;
  categories?: { name: string; weight: number; color: string }[];
  show_points_to_students?: boolean;
  show_percentages_to_students?: boolean;
  show_letter_grades?: boolean;
}

interface StreamlinedGradebookProps {
  courseId: string;
  initialData?: {
    students: Student[];
    items: GradeItem[];
    grades: Grade[];
    stats: GradebookStats;
    settings?: GradebookSettings;
  };
}

export default function StreamlinedGradebook({
  courseId,
  initialData
}: StreamlinedGradebookProps) {
  const [students, setStudents] = useState<Student[]>(initialData?.students || []);
  const [items, setItems] = useState<GradeItem[]>(initialData?.items || []);
  const [grades, setGrades] = useState<Grade[]>(initialData?.grades || []);
  const [stats, setStats] = useState<GradebookStats | null>(initialData?.stats || null);
  const [settings, setSettings] = useState<GradebookSettings>(initialData?.settings || {});
  const [loading, setLoading] = useState(!initialData);
  const [cleaning, setCleaning] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingGrade, setEditingGrade] = useState<{studentId: string, itemId: string} | null>(null);
  const [editingScore, setEditingScore] = useState<string>('');

  // Get category colors from settings
  const categoryColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    if (settings.categories) {
      settings.categories.forEach(cat => {
        colors[cat.name] = cat.color;
      });
    }
    return colors;
  }, [settings.categories]);

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
      setStats(data.stats || null);
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading gradebook:', error);
    } finally {
      setLoading(false);
    }
  }

  async function cleanupGradebook() {
    try {
      setCleaning(true);
      const res = await fetch(`/api/courses/${courseId}/gradebook/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const result = await res.json();
        console.log('Cleanup completed:', result);
        // Reload gradebook after cleanup
        await loadGradebook();
        alert(`Cleanup completed! Removed ${result.results.duplicateItemsRemoved} duplicates and ${result.results.orphanedQuizItems + result.results.orphanedAssignmentItems} orphaned items.`);
      } else {
        const error = await res.json();
        alert(`Cleanup failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      alert('Cleanup failed. Please try again.');
    } finally {
      setCleaning(false);
    }
  }

  async function saveGrade(studentId: string, itemId: string, score: number) {
    try {
      const gradeKey = `${studentId}:${itemId}`;
      const existingGrade = gradeIndex.get(gradeKey);
      
      let res;
      if (existingGrade) {
        // Update existing grade
        res = await fetch(`/api/courses/${courseId}/gradebook/grades`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingGrade.id,
            score: score,
            feedback: existingGrade.feedback
          })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || 'Failed to update grade');
        }
      } else {
        // Create new grade
        res = await fetch(`/api/courses/${courseId}/gradebook/grades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: [{
              grade_item_id: itemId,
              student_id: studentId,
              score: score
            }]
          })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || 'Failed to create grade');
        }
      }

      // Get the response data
      const responseData = await res.json().catch(() => null);
      
      // If response contains the updated grade, update local state immediately
      if (responseData) {
        if (responseData.grades && Array.isArray(responseData.grades) && responseData.grades.length > 0) {
          const updatedGrade = responseData.grades[0];
          // Update grades state immediately
          setGrades(prevGrades => {
            const filtered = prevGrades.filter(g => 
              !(g.student_id === updatedGrade.student_id && g.grade_item_id === updatedGrade.grade_item_id)
            );
            return [...filtered, updatedGrade];
          });
        } else if (responseData.id) {
          // PUT response returns single grade object
          setGrades(prevGrades => {
            const filtered = prevGrades.filter(g => 
              !(g.student_id === studentId && g.grade_item_id === itemId)
            );
            return [...filtered, responseData];
          });
        }
      }
      
      // Also reload gradebook to ensure everything is in sync (but don't wait)
      loadGradebook().catch(err => {
        console.error('Error reloading gradebook:', err);
        // If reload fails, we still have the updated grade from response
      });
      
      setEditingGrade(null);
      setEditingScore('');
    } catch (error: any) {
      console.error('Error saving grade:', error);
      alert(error.message || 'Failed to save grade. Please try again.');
    }
  }

  function startEditing(studentId: string, itemId: string, currentScore?: number) {
    setEditingGrade({ studentId, itemId });
    setEditingScore(currentScore?.toString() || '');
  }

  function cancelEditing() {
    setEditingGrade(null);
    setEditingScore('');
  }

  function handleScoreSubmit() {
    const score = parseFloat(editingScore);
    if (isNaN(score) || score < 0) {
      alert('Please enter a valid score');
      return;
    }
    
    if (editingGrade) {
      saveGrade(editingGrade.studentId, editingGrade.itemId, score);
    }
  }

  async function syncQuizGrades() {
    try {
      setCleaning(true);
      const res = await fetch(`/api/courses/${courseId}/gradebook/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const result = await res.json();
        console.log('Quiz sync completed:', result);
        // Reload gradebook after sync
        await loadGradebook();
        alert(`Quiz grades synced successfully! ${result.syncedResults?.length || 0} grades processed.`);
      } else {
        const error = await res.json();
        alert(`Quiz sync failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error during quiz sync:', error);
      alert('Quiz sync failed. Please try again.');
    } finally {
      setCleaning(false);
    }
  }

  // Filter items based on visibility and category
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => showInactive || item.is_active);
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    return filtered;
  }, [items, showInactive, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(items.map(item => item.category))];
    return ['all', ...cats];
  }, [items]);

  // Create grade index for quick lookup
  const gradeIndex = useMemo(() => {
    const m = new Map<string, Grade>();
    for (const g of grades) {
      m.set(`${g.student_id}:${g.grade_item_id}`, g);
    }
    return m;
  }, [grades]);

  // Calculate totals for each student
  const studentTotals = useMemo(() => {
    const totals = new Map<string, { points: number; max: number; percentage: number }>();
    
    for (const student of students) {
      let points = 0;
      let max = 0;
      
      for (const item of filteredItems) {
        const grade = gradeIndex.get(`${student.id}:${item.id}`);
        if (grade) {
          points += grade.score;
        }
        max += item.points;
      }
      
      const percentage = max > 0 ? Math.round((points / max) * 100) : 0;
      totals.set(student.id, { points, max, percentage });
    }
    
    return totals;
  }, [students, filteredItems, gradeIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gradebook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <BulkGradeUpload courseId={courseId} onSuccess={loadGradebook} />
            <Button
              onClick={syncQuizGrades}
              disabled={cleaning}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Sync Quiz Grades
            </Button>
            <Button
              onClick={cleanupGradebook}
              disabled={cleaning}
              className="bg-orange-600 hover:bg-orange-700 text-sm"
            >
              {cleaning ? "Cleaning..." : "Clean Up"}
            </Button>
            <Button
              onClick={loadGradebook}
              variant="outline"
              className="text-sm"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total_students}</div>
              <div className="text-sm text-blue-800">Students</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.active_grade_items}</div>
              <div className="text-sm text-green-800">Active Items</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.inactive_grade_items}</div>
              <div className="text-sm text-gray-800">Inactive Items</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.total_grades}</div>
              <div className="text-sm text-purple-800">Total Grades</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Show inactive items
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="category" className="text-sm text-gray-700">Category:</label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Card View - visible on small screens */}
      <div className="md:hidden space-y-4">
        {students.map((student) => {
          const total = studentTotals.get(student.id) || { points: 0, max: 0, percentage: 0 };
          return (
            <div key={student.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Student header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{student.name || student.id}</div>
                  <div className="text-xs text-gray-500">{student.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{total.points}/{total.max}</div>
                  <div className={`text-xs font-semibold ${total.percentage >= 70 ? 'text-green-600' : total.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {total.percentage}%
                  </div>
                </div>
              </div>
              {/* Grade items */}
              <div className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const grade = gradeIndex.get(`${student.id}:${item.id}`);
                  const isEditing = editingGrade?.studentId === student.id && editingGrade?.itemId === item.id;

                  return (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="text-sm text-gray-900 truncate">{item.title}</div>
                        <div className="text-xs text-gray-500">
                          {item.points}pts
                          {!item.is_active && <span className="text-red-500 ml-1">(Inactive)</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editingScore}
                              onChange={(e) => setEditingScore(e.target.value)}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                              min="0"
                              max={item.points}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleScoreSubmit();
                                else if (e.key === 'Escape') cancelEditing();
                              }}
                            />
                            <button onClick={handleScoreSubmit} className="p-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">✓</button>
                            <button onClick={cancelEditing} className="p-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(student.id, item.id, grade?.score)}
                            className="text-right min-w-[60px] p-2 rounded hover:bg-gray-100 transition-colors"
                          >
                            {grade ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">{grade.score}/{item.points}</div>
                                <div className="text-xs text-gray-500">{grade.percentage}%</div>
                              </div>
                            ) : (
                              <span className="text-xs text-blue-600">+ Grade</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gradebook Table - hidden on small screens */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                  Student
                </th>
                {filteredItems.map((item) => (
                  <th key={item.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col">
                      <span className="truncate max-w-32" title={item.title}>
                        {item.title}
                      </span>
                      <span className="text-gray-400 font-normal">
                        {item.points}pts
                      </span>
                      {!item.is_active && (
                        <span className="text-red-500 text-xs">(Inactive)</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => {
                const total = studentTotals.get(student.id) || { points: 0, max: 0, percentage: 0 };
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap z-10">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {student.name || student.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.email}
                        </div>
                      </div>
                    </td>
                    {filteredItems.map((item) => {
                      const grade = gradeIndex.get(`${student.id}:${item.id}`);
                      const isEditing = editingGrade?.studentId === student.id && editingGrade?.itemId === item.id;

                      return (
                        <td key={item.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={editingScore}
                                onChange={(e) => setEditingScore(e.target.value)}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                min="0"
                                max={item.points}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleScoreSubmit();
                                  } else if (e.key === 'Escape') {
                                    cancelEditing();
                                  }
                                }}
                              />
                              <button
                                onClick={handleScoreSubmit}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                              onClick={() => startEditing(student.id, item.id, grade?.score)}
                              title="Click to edit grade"
                            >
                              {grade ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {grade.score}/{item.points}
                                  </span>
                                  <span className="text-gray-500">
                                    {grade.percentage}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 hover:text-gray-600">Click to add grade</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex flex-col">
                        <span>
                          {total.points}/{total.max}
                        </span>
                        <span className="text-gray-500">
                          {total.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No grade items found</h3>
          <p className="text-gray-500">
            {showInactive 
              ? "No grade items match your current filters." 
              : "No active grade items found. Try showing inactive items or create some grade items."
            }
          </p>
        </div>
      )}
    </div>
  );
}
