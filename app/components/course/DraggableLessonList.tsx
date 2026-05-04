'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import { useSupabase } from '@/lib/supabase-provider';
import LessonAdminControls from './LessonAdminControls';

interface Lesson {
  id: string;
  title: string;
  description: string;
  estimated_time: number;
  difficulty: number;
  order: number;
  published: boolean;
}

interface DraggableLessonListProps {
  lessons: Lesson[];
  courseId: string;
  onReorder: (reorderedLessons: Lesson[]) => void;
  isReorderMode: boolean;
  onToggleReorderMode: () => void;
  editMode?: boolean;
  onLessonDeleted?: (lessonId: string) => void;
}

interface SortableLessonItemProps {
  lesson: Lesson;
  index: number;
  courseId: string;
  isReorderMode: boolean;
  editMode?: boolean;
  onLessonDeleted?: (lessonId: string) => void;
}

const SortableLessonItem: React.FC<SortableLessonItemProps> = ({
  lesson,
  index,
  courseId,
  isReorderMode,
  editMode = true,
  onLessonDeleted,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-gradient-to-r from-white to-gray-50 rounded-lg sm:rounded-lg border border-gray-200 p-4 sm:p-6 transition-all duration-300 ${
        isDragging
          ? 'shadow-lg rotate-2 scale-105 z-50'
          : 'hover:shadow-lg hover:border-blue-300'
      } ${isReorderMode ? 'cursor-move' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1">
          {/* Drag Handle */}
          {isReorderMode && (
            <div
              {...attributes}
              {...listeners}
              className="flex-shrink-0 cursor-move p-1 hover:bg-gray-100 rounded"
            >
              <Icon 
                icon="material-symbols:drag-indicator" 
                className="w-6 h-6 text-gray-400 hover:text-gray-600" 
              />
            </div>
          )}

          {/* Lesson Number */}
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-lg ${
              isReorderMode 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              {index + 1}
            </div>
          </div>

          {/* Lesson Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {lesson.title}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">
              {lesson.description}
            </p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                <Icon icon="material-symbols:schedule" className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{lesson.estimated_time} min</span>
              </div>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                <Icon icon="material-symbols:trending-up" className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Level {lesson.difficulty}/5</span>
              </div>
              {lesson.published ? (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                  <Icon icon="material-symbols:visibility" className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Published</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-yellow-600">
                  <Icon icon="material-symbols:draft" className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Draft</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 sm:flex-shrink-0">
          <Link 
            href={`/course/${courseId}/lesson/${lesson.id}`} 
            className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-medium rounded-md transition-all duration-200 shadow-sm hover:shadow"
          >
            <Icon icon="material-symbols:play-arrow" className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Start Lesson</span>
            <span className="sm:hidden">Start</span>
          </Link>
          {editMode && (
            <LessonAdminControls
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              onDeleted={onLessonDeleted}
              size="md"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const DraggableLessonList: React.FC<DraggableLessonListProps> = ({
  lessons,
  courseId,
  onReorder,
  isReorderMode,
  onToggleReorderMode,
  editMode = true,
  onLessonDeleted,
}) => {
  const { supabase } = useSupabase();
  const [isReordering, setIsReordering] = useState(false);

  // Mouse drags activate after 5px; touch drags require a 250ms long-press
  // with 5px tolerance so vertical scroll gestures aren't hijacked.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setIsReordering(true);

    try {
      // Create new array with reordered lessons
      const oldIndex = lessons.findIndex(lesson => lesson.id === active.id);
      const newIndex = lessons.findIndex(lesson => lesson.id === over.id);

      const newLessons = arrayMove(lessons, oldIndex, newIndex);

      // Update order numbers
      const updatedLessons = newLessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }));

      // Get current session for API call
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to reorder lessons.');
      }

      // Call API to update lesson orders
      const response = await fetch('/api/lessons/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          courseId,
          lessonOrders: updatedLessons.map(lesson => ({
            lessonId: lesson.id,
            order: lesson.order
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder lessons');
      }

      // Update local state
      onReorder(updatedLessons);

    } catch (error) {
      console.error('Error reordering lessons:', error);
      // Revert to original order on error
      onReorder(lessons);
    } finally {
      setIsReordering(false);
    }
  };

  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Reorder Controls */}
      {editMode && <RoleGuard roles={["admin", "super_admin", "curriculum_designer"]}>
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Icon icon="material-symbols:drag-indicator" className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {isReorderMode ? 'Drag and drop to reorder lessons' : 'Lesson reordering'}
            </span>
          </div>
          <button
            onClick={onToggleReorderMode}
            disabled={isReordering}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              isReorderMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } ${isReordering ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isReorderMode ? 'Done Reordering' : 'Reorder Lessons'}
          </button>
        </div>
      </RoleGuard>}

      {isReordering && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon icon="material-symbols:hourglass-empty" className="w-5 h-5 text-yellow-600 animate-spin" />
            <span className="text-sm text-yellow-800">Saving lesson order...</span>
          </div>
        </div>
      )}

      {sortedLessons.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedLessons.map(lesson => lesson.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 sm:space-y-4">
              {sortedLessons.map((lesson, index) => (
                <SortableLessonItem
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  courseId={courseId}
                  isReorderMode={isReorderMode}
                  editMode={editMode}
                  onLessonDeleted={onLessonDeleted}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="material-symbols:book" className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No lessons available yet</h3>
          <p className="text-gray-600 mb-6">Start building your course curriculum by creating the first lesson.</p>
          <Link 
            href={`/lessons/create?course_id=${courseId}`} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-md transition-all duration-200 shadow-sm hover:shadow"
          >
            <Icon icon="material-symbols:add" className="w-5 h-5" />
            Create First Lesson
          </Link>
        </div>
      )}
    </div>
  );
};

export default DraggableLessonList;
