'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---------------------------------------------------------------------------
// SortableItem — minimal wrapper that turns its children into a draggable
// row inside a SortableContext. The drag handle is a small grip icon
// rendered before the children. When `disabled` is true the row renders
// without any dnd plumbing (pass-through), so toggling edit mode flips the
// behavior cleanly.
// ---------------------------------------------------------------------------

export interface SortableItemProps {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
  /** Optional title for the drag-handle aria-label. */
  handleLabel?: string;
}

export function SortableItem({ id, disabled, children, handleLabel = 'Drag to reorder' }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  if (disabled) {
    // Pass-through render — no wrapper styles, no handle. Keeps the layout
    // identical to the non-edit-mode tree so we don't shift content when
    // the user toggles edit mode off.
    return <>{children}</>;
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2 group/sortable">
      <button
        type="button"
        aria-label={handleLabel}
        title={handleLabel}
        {...attributes}
        {...listeners}
        className="flex items-center px-1 -ml-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 cursor-grab active:cursor-grabbing touch-none transition-colors"
      >
        <Icon icon="material-symbols:drag-indicator" className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReorderList — DndContext + SortableContext combo with a controlled
// onReorder callback that fires with the new id-array after a drag finishes.
// Bail-out fast if the user isn't allowed to reorder (disabled prop).
// ---------------------------------------------------------------------------

export interface ReorderListProps {
  ids: string[];
  disabled?: boolean;
  onReorder: (nextIds: string[]) => void;
  children: React.ReactNode;
}

export function ReorderList({ ids, disabled, onReorder, children }: ReorderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (disabled) {
    // Render children as-is when not in edit mode.
    return <>{children}</>;
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
