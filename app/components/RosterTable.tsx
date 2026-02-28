"use client";
import { useEffect, useState } from "react";

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
      <div className="flex gap-2 items-center">
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Add student by email" className="border rounded px-3 py-2 text-sm flex-1" />
        <button disabled={loading} onClick={addStudent} className="px-3 py-2 text-sm rounded bg-blue-500 text-white">{loading?"Adding...":"Add"}</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Student ID</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e)=> (
              <tr key={e.id} className="border-t">
                <td className="py-2 pr-4">{e.student_id}</td>
                <td className="py-2 pr-4">{e.status}</td>
                <td className="py-2 pr-4">
                  {e.status!=="dropped" && (
                    <button onClick={()=>drop(e.id)} className="text-red-600">Drop</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
