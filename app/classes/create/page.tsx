"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import GradingSchemeEditor, { Category, Scale } from "@/app/components/gradebook/GradingSchemeEditor";

export default function CreateClassPage() {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [term, setTerm] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");
  const [limit, setLimit] = useState<number | undefined>(undefined);
  const [code, setCode] = useState("");
  const [scheme, setScheme] = useState<{ categories: Category[]; grading_scale: Scale[] }>({ categories: [], grading_scale: [] });
  const [loading, setLoading] = useState(false);
  const dayOptions = ["Mon","Tue","Wed","Thu","Fri"];

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          name,
          section,
          term,
          schedule: { days, start_time: start, end_time: end, room },
          max_enrollment: limit,
          enrollment_code: code || undefined,
          enrollment_open: true,
          active: true,
        }),
      });
      if (!res.ok) { setLoading(false); return; }
      const created = await res.json();
      const classId = created.id as string;
      if (scheme.categories.length || scheme.grading_scale.length) {
        await fetch(`/api/gradebook/${classId}/scheme`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(scheme) });
      }
      router.push(`/class/${classId}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function generateCode() {
    const v = Math.random().toString(36).slice(2, 8).toUpperCase();
    setCode(v);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium text-gray-900 mb-6">Create Class</h1>
      <div className="space-y-4 text-sm">
        <input value={courseId} onChange={(e)=>setCourseId(e.target.value)} placeholder="Base course id" className="w-full border rounded px-3 py-2" />
        <div className="grid grid-cols-2 gap-3">
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Class name" className="border rounded px-3 py-2" />
          <input value={section} onChange={(e)=>setSection(e.target.value)} placeholder="Section" className="border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={term} onChange={(e)=>setTerm(e.target.value)} placeholder="Term (e.g., Fall 2025)" className="border rounded px-3 py-2" />
          <input value={room} onChange={(e)=>setRoom(e.target.value)} placeholder="Room" className="border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="time" value={start} onChange={(e)=>setStart(e.target.value)} className="border rounded px-3 py-2" />
          <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {dayOptions.map((d)=> (
            <button key={d} type="button" onClick={()=>toggleDay(d)} className={`px-2 py-1 rounded border ${days.includes(d)?"bg-blue-500 text-white border-blue-500":"bg-white text-gray-700"}`}>{d}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" value={limit ?? ""} onChange={(e)=>setLimit(e.target.value?Number(e.target.value):undefined)} placeholder="Max enrollment" className="border rounded px-3 py-2" />
          <div className="flex gap-2">
            <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Enrollment code" className="border rounded px-3 py-2 flex-1" />
            <button type="button" onClick={generateCode} className="px-2 py-1 text-xs rounded bg-gray-100">Generate</button>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Grading Scheme</h2>
          <GradingSchemeEditor onChange={setScheme} />
        </div>

        <button disabled={loading} onClick={handleCreate} className="mt-4 inline-flex items-center px-4 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-50">{loading?"Creating...":"Create Class"}</button>
      </div>
    </div>
  );
}
