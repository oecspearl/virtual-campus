"use client";

import React from "react";
import LessonCard, { LessonCardProps } from "@/app/components/LessonCard";

export type LessonItem = LessonCardProps & { id: string };

export default function LessonList({
  items,
  onReorder,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  items: LessonItem[];
  onReorder: (orderedIds: string[]) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTogglePublish?: (id: string) => void;
}) {
  const [list, setList] = React.useState(items);
  React.useEffect(() => setList(items), [items]);

  const dragItem = React.useRef<string | null>(null);

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (overId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragItem.current;
    if (!from || from === overId) return;
    const newList = [...list];
    const fromIdx = newList.findIndex((i) => i.id === from);
    const toIdx = newList.findIndex((i) => i.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, moved);
    setList(newList);
  };

  const handleDrop = () => {
    dragItem.current = null;
    onReorder(list.map((i) => i.id));
  };

  return (
    <ul className="space-y-2">
      {list.map((i, idx) => (
        <li
          key={i.id}
          draggable
          onDragStart={handleDragStart(i.id)}
          onDragOver={handleDragOver(i.id)}
          onDrop={handleDrop}
          className="cursor-move"
        >
          <div className="flex items-center gap-3">
            <span className="select-none rounded-md border bg-white px-2 py-1 text-[10px] text-gray-500">Drag</span>
            <div className="flex-1">
              <LessonCard {...i} order={idx} />
            </div>
            <div className="flex items-center gap-2">
              {onTogglePublish && (
                <button onClick={() => onTogglePublish(i.id)} className="rounded-md border px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">
                  <span>Publish</span>
                </button>
              )}
              {onEdit && (
                <button onClick={() => onEdit(i.id)} className="rounded-md border px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">
                  <span>Edit</span>
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(i.id)} className="rounded-md border px-2 py-1 text-[10px] text-red-600 hover:bg-red-50">
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
