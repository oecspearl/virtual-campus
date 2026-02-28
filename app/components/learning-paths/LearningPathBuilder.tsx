'use client';

import { useState, useEffect } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  Search,
  X,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  thumbnail?: string;
  lesson_count?: number;
}

interface PathCourse {
  id: string;
  order: number;
  is_required: boolean;
  unlock_after_previous: boolean;
  course: Course;
}

interface LearningPathBuilderProps {
  pathId: string;
  initialCourses?: PathCourse[];
  onSave?: (courses: PathCourse[]) => Promise<void>;
  availableCourses?: Course[];
}

export default function LearningPathBuilder({
  pathId,
  initialCourses = [],
  onSave,
  availableCourses: externalCourses,
}: LearningPathBuilderProps) {
  const [courses, setCourses] = useState<PathCourse[]>(initialCourses);
  const [availableCourses, setAvailableCourses] = useState<Course[]>(externalCourses || []);
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!externalCourses) {
      fetchAvailableCourses();
    }
  }, [externalCourses]);

  const fetchAvailableCourses = async () => {
    try {
      const response = await fetch('/api/courses?limit=100');
      const data = await response.json();
      setAvailableCourses(data.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const handleAddCourse = async (course: Course) => {
    // Check if already added
    if (courses.some(c => c.course.id === course.id)) {
      setError('Course is already in the learning path');
      return;
    }

    const newPathCourse: PathCourse = {
      id: `temp-${Date.now()}`,
      order: courses.length,
      is_required: true,
      unlock_after_previous: true,
      course,
    };

    try {
      const response = await fetch(`/api/learning-paths/${pathId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          order: courses.length,
          is_required: true,
          unlock_after_previous: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add course');
      }

      const data = await response.json();
      setCourses([...courses, { ...newPathCourse, id: data.course.id }]);
      setShowCourseSearch(false);
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add course');
    }
  };

  const handleRemoveCourse = async (index: number) => {
    const courseToRemove = courses[index];

    try {
      const response = await fetch(
        `/api/learning-paths/${pathId}/courses?course_id=${courseToRemove.course.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove course');
      }

      const newCourses = courses.filter((_, i) => i !== index);
      // Reorder remaining courses
      const reorderedCourses = newCourses.map((c, i) => ({ ...c, order: i }));
      setCourses(reorderedCourses);
      setHasChanges(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove course');
    }
  };

  const handleToggleRequired = (index: number) => {
    const newCourses = [...courses];
    newCourses[index].is_required = !newCourses[index].is_required;
    setCourses(newCourses);
    setHasChanges(true);
  };

  const handleToggleUnlock = (index: number) => {
    const newCourses = [...courses];
    newCourses[index].unlock_after_previous = !newCourses[index].unlock_after_previous;
    setCourses(newCourses);
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newCourses = [...courses];
    [newCourses[index - 1], newCourses[index]] = [newCourses[index], newCourses[index - 1]];
    newCourses[index - 1].order = index - 1;
    newCourses[index].order = index;
    setCourses(newCourses);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === courses.length - 1) return;
    const newCourses = [...courses];
    [newCourses[index], newCourses[index + 1]] = [newCourses[index + 1], newCourses[index]];
    newCourses[index].order = index;
    newCourses[index + 1].order = index + 1;
    setCourses(newCourses);
    setHasChanges(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newCourses = [...courses];
    const draggedCourse = newCourses[draggedIndex];
    newCourses.splice(draggedIndex, 1);
    newCourses.splice(index, 0, draggedCourse);

    // Update order
    newCourses.forEach((c, i) => {
      c.order = i;
    });

    setCourses(newCourses);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/learning-paths/${pathId}/courses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses: courses.map(c => ({ id: c.id, order: c.order })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save order');
      }

      setHasChanges(false);
      onSave?.(courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const filteredAvailableCourses = availableCourses.filter(
    (course) =>
      !courses.some((c) => c.course.id === course.id) &&
      course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Course list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Courses in Path ({courses.length})
          </h3>
          {hasChanges && (
            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No courses added yet.</p>
            <p className="text-sm mt-1">Add courses to build your learning path.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {courses.map((pathCourse, index) => (
              <li
                key={pathCourse.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-4 ${
                  draggedIndex === index
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Drag handle */}
                  <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Order number */}
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    {index + 1}
                  </div>

                  {/* Course info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {pathCourse.course.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {pathCourse.is_required ? (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                          Required
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                          Optional
                        </span>
                      )}
                      {index > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {pathCourse.unlock_after_previous ? (
                            <>
                              <Lock className="w-3 h-3" />
                              Locked until previous complete
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              Always unlocked
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === courses.length - 1}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleRequired(index)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title={pathCourse.is_required ? 'Mark as optional' : 'Mark as required'}
                    >
                      {pathCourse.is_required ? (
                        <span className="text-xs font-medium">Req</span>
                      ) : (
                        <span className="text-xs font-medium">Opt</span>
                      )}
                    </button>
                    {index > 0 && (
                      <button
                        onClick={() => handleToggleUnlock(index)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                        title={
                          pathCourse.unlock_after_previous
                            ? 'Always unlock'
                            : 'Lock until previous complete'
                        }
                      >
                        {pathCourse.unlock_after_previous ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveCourse(index)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Remove course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Add course button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {showCourseSearch ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowCourseSearch(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAvailableCourses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery
                      ? 'No courses found'
                      : 'All courses are already added'}
                  </div>
                ) : (
                  filteredAvailableCourses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleAddCourse(course)}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {course.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {course.lesson_count || 0} lessons
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCourseSearch(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Course
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
