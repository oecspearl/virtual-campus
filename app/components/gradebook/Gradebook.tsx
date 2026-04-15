"use client";
import { useEffect, useMemo, useState } from "react";
import GradeCell from "@/app/components/gradebook/GradeCell";

export type GBItem = { id: string; title: string; points: number; category?: string };
export type GBGrade = { id: string; grade_item_id: string; student_id: string; score: number };
export type GBStudent = { id: string; name: string; email: string };

export default function Gradebook({ classId }: { classId: string }) {
  const [students, setStudents] = useState<GBStudent[]>([]);
  const [items, setItems] = useState<GBItem[]>([]);
  const [grades, setGrades] = useState<GBGrade[]>([]);

  async function load() {
    const res = await fetch(`/api/gradebook/${classId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setStudents(data.students || []);
    setItems((data.items || []).map((x: GBItem)=> ({ id: x.id, title: x.title, points: Number(x.points || 0), category: x.category })));
    setGrades(data.grades || []);
  }
  useEffect(() => { load(); }, []);

  const gradeIndex = useMemo(() => {
    const m = new Map<string, GBGrade>();
    for (const g of grades) m.set(`${g.student_id}:${g.grade_item_id}`, g);
    return m;
  }, [grades]);

  async function saveScore(studentId: string, item: GBItem, score: number) {
    const key = `${studentId}:${item.id}`;
    const existing = gradeIndex.get(key);
    if (existing) {
      await fetch(`/api/gradebook/${classId}/grades`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: existing.id, score }) });
    } else {
      await fetch(`/api/gradebook/${classId}/grades`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: [{ grade_item_id: item.id, student_id: studentId, score }] }) });
    }
    await load();
  }

  function totalFor(studentId: string): { points: number; max: number } {
    let points = 0; let max = 0;
    for (const it of items) {
      const g = gradeIndex.get(`${studentId}:${it.id}`);
      if (g) points += Number(g.score || 0);
      max += Number(it.points || 0);
    }
    return { points, max };
  }

  return (
    <div className="overflow-x-auto border rounded-lg -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-[800px] text-sm w-full">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left border-b">Student</th>
            {items.map((it) => (
              <th key={it.id} className="px-3 py-2 text-left border-b">{it.title} <span className="text-gray-400">({it.points})</span></th>
            ))}
            <th className="px-3 py-2 text-left border-b">Total</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const total = totalFor(s.id);
            const pct = total.max > 0 ? Math.round((total.points / total.max) * 100) : 0;
            return (
              <tr key={s.id}>
                <td className="sticky left-0 bg-white z-10 px-3 py-2 border-b">
                  <div className="flex flex-col">
                    <span className="text-gray-900">{s.name || s.id}</span>
                    <span className="text-gray-500 text-xs">{s.email}</span>
                  </div>
                </td>
                {items.map((it) => {
                  const g = gradeIndex.get(`${s.id}:${it.id}`);
                  return (
                    <td key={it.id} className="px-3 py-1.5 border-b">
                      <GradeCell value={g ? g.score : null} max={it.points} onSave={(score)=>saveScore(s.id, it, score)} />
                    </td>
                  );
                })}
                <td className="px-3 py-2 border-b font-medium">{total.points}/{total.max} ({pct}%)</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
