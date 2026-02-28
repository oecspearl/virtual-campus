"use client";
import { useState } from "react";

export default function EnrollmentCard({ cls, onEnroll }: { cls: Record<string, unknown>; onEnroll: (classId: string)=>Promise<void> }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="rounded-lg border bg-white/70 p-4 flex items-center justify-between">
      <div>
        <p className="text-gray-900 text-sm">{String(cls.name || "Class")}</p>
        <p className="text-gray-500 text-xs">{String(cls.term || "")} {String(cls.section || "")}</p>
      </div>
      <button disabled={loading} onClick={async ()=>{ setLoading(true); await onEnroll(String(cls.id)); setLoading(false); }} className="text-sm px-3 py-1.5 rounded bg-blue-500 text-white">{loading?"Enrolling...":"Enroll"}</button>
    </div>
  );
}
