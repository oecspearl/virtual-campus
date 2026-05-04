"use client";
import { useEffect, useState } from "react";
import { ResponsiveTable } from "@/app/components/ui/ResponsiveTable";

export type Enrollment = {
  id: string;
  student_id: string;
  enrolled_at?: string;
  status: string;
};

export default function RosterTable({ classId }: { classId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/classes/${classId}/roster`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { enrollments: Enrollment[] };
    setEnrollments(data.enrollments || []);
  }

  useEffect(() => { load(); }, []);

  async function addStudent() {
    if (!email) return;
    setLoading(true);
    await fetch(`/api/classes/${classId}/roster`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setEmail("");
    setLoading(false);
    await load();
  }

  async function drop(enrollmentId: string) {
    await fetch(`/api/classes/${classId}/roster`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enrollment_id: enrollmentId, status: "dropped" }) });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder="Add student by email"
          className="border rounded px-3 py-2 text-sm flex-1 min-h-[44px]"
        />
        <button
          disabled={loading}
          onClick={addStudent}
          className="inline-flex items-center justify-center min-h-[44px] px-3 py-2 text-sm rounded bg-blue-500 text-white disabled:opacity-50"
        >
          {loading?"Adding...":"Add"}
        </button>
      </div>

      <ResponsiveTable<Enrollment>
        caption="Class roster"
        rows={enrollments}
        rowKey={(e) => e.id}
        empty="No students enrolled yet."
        columns={[
          { key: 'student_id', header: 'Student ID', primary: true, render: (e) => e.student_id },
          { key: 'status', header: 'Status', render: (e) => e.status },
        ]}
        actions={(e) =>
          e.status !== 'dropped' ? (
            <button
              onClick={() => drop(e.id)}
              className="inline-flex items-center justify-center min-h-[44px] px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
            >
              Drop
            </button>
          ) : null
        }
      />
    </div>
  );
}
