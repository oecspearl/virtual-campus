"use client";
import { use, useEffect, useState } from "react";
import GradingSchemeEditor, { Category, Scale } from "@/app/components/gradebook/GradingSchemeEditor";

export default function GradeSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [items, setItems] = useState<Array<{ id: string; title: string; points: number; category?: string }>>([]);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState<number>(10);
  const [category, setCategory] = useState("");
  const [scheme, setScheme] = useState<{ categories: Category[]; grading_scale: Scale[] }>({ categories: [], grading_scale: [] });

  async function load() {
    const [itemsRes, schemeRes] = await Promise.all([
      fetch(`/api/gradebook/${id}/items`),
      fetch(`/api/gradebook/${id}/scheme`),
    ]);
    if (itemsRes.ok) { const d = await itemsRes.json(); setItems(d.items || []); }
    if (schemeRes.ok) { const d = await schemeRes.json(); if (d.scheme) setScheme({ categories: d.scheme.categories||[], grading_scale: d.scheme.grading_scale||[] }); }
  }
  useEffect(() => { load(); }, []);

  async function addItem() {
    if (!title) return;
    await fetch(`/api/gradebook/${id}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, points, category }) });
    setTitle(""); setPoints(10); setCategory("");
    await load();
  }

  async function saveScheme() {
    await fetch(`/api/gradebook/${id}/scheme`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(scheme) });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-sm">
      <h1 className="text-2xl font-medium text-gray-900 mb-4">Grade Setup</h1>

      <div className="rounded border p-4 bg-white/70 mb-6">
        <h2 className="text-base font-medium text-gray-900 mb-3">Grading Scheme</h2>
        <GradingSchemeEditor onChange={setScheme} />
        <button onClick={saveScheme} className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-blue-500 text-white">Save Scheme</button>
      </div>

      <div className="rounded border p-4 bg-white/70">
        <h2 className="text-base font-medium text-gray-900 mb-3">Grade Items</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" className="border rounded px-3 py-2" />
          <input type="number" value={points} onChange={(e)=>setPoints(Number(e.target.value))} placeholder="Points" className="border rounded px-3 py-2" />
          <input value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="Category" className="border rounded px-3 py-2" />
        </div>
        <button onClick={addItem} className="inline-flex items-center px-3 py-1.5 rounded bg-blue-500 text-white">Add Item</button>

        <ul className="mt-4 space-y-2">
          {items.map((it)=> (
            <li key={it.id} className="flex items-center justify-between border rounded px-3 py-2">
              <div>
                <p className="text-gray-900">{it.title}</p>
                <p className="text-gray-500 text-xs">{it.category} • {it.points} pts</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
