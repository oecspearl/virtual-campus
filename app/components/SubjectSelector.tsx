"use client";

import React from "react";

export type SubjectOption = { id: string; title: string };

export default function SubjectSelector({
  subjects,
  value,
  onChange,
  className = "",
}: {
  subjects: SubjectOption[];
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <select
      className={`w-full rounded-md border bg-white p-2 text-sm text-gray-700 ${className}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value=""><span>Select a subject</span></option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>{s.title}</option>
      ))}
    </select>
  );
}
