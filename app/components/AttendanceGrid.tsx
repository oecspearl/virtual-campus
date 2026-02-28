"use client";
import { useEffect, useState } from "react";

export default function AttendanceGrid({ classId }: { classId: string }) {
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  async function loadStudents() {
    const res = await fetch(`/api/gradebook/${classId}`);
    if (!res.ok) return;
    const d = await res.json();
    const list = (d.students || []) as Array<{ id: string; name: string }>;
    setStudents(list);
  }

  async function loadForDate(dstr: string) {
    const res = await fetch(`/api/attendance/${classId}/date/${dstr}`);
    if (!res.ok) return;
    const d = await res.json();
    const map: Record<string, string> = {};
    if (d.record && Array.isArray(d.record.records)) {
      for (const r of d.record.records as Array<{ student_id: string; status: string }>) map[r.student_id] = r.status;
    }
    setStatuses(map);
  }

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadForDate(date); }, [date]);

  function setStatus(sid: string, status: string) {
    setStatuses((prev) => ({ ...prev, [sid]: status }));
  }

  async function save() {
    const recs = students.map((s) => ({ student_id: s.id, status: statuses[s.id] || "present" }));
    await fetch(`/api/attendance/${classId}/date/${date}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records: recs }) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        <button onClick={()=>{ const map: Record<string,string>={}; students.forEach(s=> map[s.id] = "present"); setStatuses(map); }} className="px-2 py-1 rounded bg-gray-100 text-sm">Mark all present</button>
        <button onClick={save} className="px-3 py-1.5 rounded bg-blue-500 text-white text-sm">Save</button>
      </div>
      <div className="space-y-2">
        {students.map((s)=> (
          <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
            <div className="text-gray-800">{s.name || s.id}</div>
            <div className="flex gap-2">
              {(["present","absent","late","excused"]).map((opt)=> (
                <button key={opt} onClick={()=>setStatus(s.id,opt)} className={`px-2 py-1 rounded border ${statuses[s.id]===opt?"bg-blue-500 text-white border-blue-500":"bg-white"}`}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
