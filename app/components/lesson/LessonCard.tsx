"use client";

import Link from "next/link";

export type LessonCardProps = {
  id: string;
  title: string;
  description?: string;
  order?: number;
  estimated_time?: number;
  difficulty?: number;
  href?: string;
};

export default function LessonCard({ id, title, description = "", order, estimated_time, difficulty, href }: LessonCardProps) {
  const content = (
    <div className="rounded-lg border bg-white p-3 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <h4 className="text-sm text-gray-900">{title}</h4>
        {typeof order === "number" && (
          <span className="text-[10px] text-gray-500">#{order + 1}</span>
        )}
      </div>
      {description && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{description}</p>
      )}
      <div className="mt-2 flex items-center gap-3">
        {typeof estimated_time === "number" && (
          <span className="text-[10px] text-gray-500">{estimated_time} min</span>
        )}
        {typeof difficulty === "number" && (
          <span className="text-[10px] text-gray-500">Difficulty: {difficulty}/5</span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}
