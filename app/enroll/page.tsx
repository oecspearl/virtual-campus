"use client";
import { useEffect, useState } from "react";
import EnrollmentCard from "@/app/components/EnrollmentCard";

export default function EnrollPage() {
  const [classes, setClasses] = useState<Array<Record<string, unknown>>>([]);
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string>("");

  async function load() {
    const res = await fetch(`/api/classes${q?`?term=${encodeURIComponent(q)}`:""}`);
    if (!res.ok) return;
    const data = await res.json();
    setClasses(data.classes || []);
  }
  useEffect(() => { load(); }, [q]);

  async function enroll(classId: string) {
    const res = await fetch(`/api/enroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ class_id: classId }) });
    if (res.ok) setMessage("Enrolled"); else setMessage("Failed to enroll");
  }

  async function enrollWithCode() {
    if (!code) return;
    const res = await fetch(`/api/enroll/code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    if (res.ok) setMessage("Enrolled with code"); else setMessage("Invalid code");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-sm">
      <h1 className="text-2xl font-medium text-gray-900 mb-4">Enroll</h1>
      <div className="flex gap-2 mb-6">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by term" className="border rounded px-3 py-2 flex-1" />
        <div className="flex gap-2">
          <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Enrollment code" className="border rounded px-3 py-2" />
          <button onClick={enrollWithCode} className="px-3 py-2 rounded bg-blue-500 text-white">Join</button>
        </div>
      </div>
      {message && <p className="text-xs text-green-600 mb-3">{message}</p>}
      <div className="space-y-2">
        {classes.map((c: Record<string, unknown>)=> (
          <EnrollmentCard key={String(c.id)} cls={c} onEnroll={enroll} />
        ))}
      </div>
    </div>
  );
}
