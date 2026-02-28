"use client";
import { useState } from "react";

export type Category = { name: string; weight: number; drop_lowest?: number };
export type Scale = { letter: string; min_percentage: number };

export default function GradingSchemeEditor({ onChange }: { onChange?: (payload: { categories: Category[]; grading_scale: Scale[] }) => void }) {
  const [categories, setCategories] = useState<Category[]>([{ name: "Homework", weight: 40 }, { name: "Tests", weight: 60 }]);
  const [gradingScale, setGradingScale] = useState<Scale[]>([
    { letter: "A", min_percentage: 90 },
    { letter: "B", min_percentage: 80 },
    { letter: "C", min_percentage: 70 },
    { letter: "D", min_percentage: 60 },
    { letter: "F", min_percentage: 0 },
  ]);

  function emit() {
    onChange?.({ categories, grading_scale: gradingScale });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-800 mb-2">Categories</h3>
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 text-sm">
              <input
                value={c.name}
                onChange={(e) => {
                  const next = [...categories];
                  next[i].name = e.target.value;
                  setCategories(next); emit();
                }}
                placeholder="Name"
                className="border rounded px-2 py-1"
              />
              <input
                type="number"
                value={c.weight}
                onChange={(e) => {
                  const next = [...categories];
                  next[i].weight = Number(e.target.value);
                  setCategories(next); emit();
                }}
                placeholder="Weight %"
                className="border rounded px-2 py-1"
              />
              <input
                type="number"
                value={c.drop_lowest ?? 0}
                onChange={(e) => {
                  const next = [...categories];
                  next[i].drop_lowest = Number(e.target.value);
                  setCategories(next); emit();
                }}
                placeholder="Drop lowest (count)"
                className="border rounded px-2 py-1"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => { setCategories([...categories, { name: "", weight: 0 }]); emit(); }}
            className="text-xs text-blue-600"
          >+ Add category</button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-800 mb-2">Grading Scale</h3>
        <div className="space-y-2">
          {gradingScale.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 text-sm">
              <input
                value={s.letter}
                onChange={(e) => { const next = [...gradingScale]; next[i].letter = e.target.value; setGradingScale(next); emit(); }}
                placeholder="Letter"
                className="border rounded px-2 py-1"
              />
              <input
                type="number"
                value={s.min_percentage}
                onChange={(e) => { const next = [...gradingScale]; next[i].min_percentage = Number(e.target.value); setGradingScale(next); emit(); }}
                placeholder="Min %"
                className="border rounded px-2 py-1"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => { setGradingScale([...gradingScale, { letter: "", min_percentage: 0 }]); emit(); }}
            className="text-xs text-blue-600"
          >+ Add scale row</button>
        </div>
      </div>
    </div>
  );
}
