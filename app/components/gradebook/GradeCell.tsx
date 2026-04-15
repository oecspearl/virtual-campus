"use client";
import { useState } from "react";

export default function GradeCell({
  value,
  max,
  onSave,
}: {
  value: number | null;
  max: number;
  onSave: (score: number) => Promise<void> | void;
}) {
  const [val, setVal] = useState<string>(value != null ? String(value) : "");
  const pct = max > 0 && value != null ? (value / max) * 100 : null;
  let bg = "bg-gray-50";
  if (pct != null) {
    if (pct >= 85) bg = "bg-green-50";
    else if (pct >= 65) bg = "bg-yellow-50";
    else bg = "bg-red-50";
  }
  return (
    <input
      className={`w-full px-2 py-1 rounded ${bg} border border-transparent focus:border-blue-400 outline-none text-sm`}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={async () => {
        const n = Number(val);
        if (!Number.isNaN(n)) await onSave(n);
      }}
      placeholder="—"
    />
  );
}
