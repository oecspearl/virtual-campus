"use client";

import React from "react";
import TextEditor from "@/app/components/editor/TextEditor";

export type QuestionOption = { id: string; text: string; is_correct: boolean };
export type Question = {
  id?: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching";
  question_text: string;
  points: number;
  order: number;
  options?: QuestionOption[];
  correct_answer?: string | string[];
  case_sensitive?: boolean;
  feedback_correct?: string;
  feedback_incorrect?: string;
};

export default function QuestionEditor({ value, onChange, onRemove }: { value: Question; onChange: (q: Question) => void; onRemove?: () => void }) {
  const q = value;

  function update<K extends keyof Question>(key: K, v: Question[K]) {
    onChange({ ...q, [key]: v });
  }

  function addOption() {
    const opts = q.options ?? [];
    update("options", [...opts, { id: crypto.randomUUID(), text: "Option", is_correct: false }]);
  }

  function toggleCorrect(id: string) {
    const opts = (q.options ?? []).map((o) => (o.id === id ? { ...o, is_correct: !o.is_correct } : o));
    update("options", opts);
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="grid grid-cols-2 gap-2">
        <select className="rounded-md border px-2 py-1 text-sm" value={q.type} onChange={(e) => update("type", e.target.value as Question["type"]) }>
          <option value="multiple_choice">Multiple choice</option>
          <option value="true_false">True/False</option>
          <option value="short_answer">Short Answer</option>
          <option value="essay">Essay</option>
        </select>
        <input type="number" className="rounded-md border px-2 py-1 text-sm" placeholder="Points" value={q.points} onChange={(e) => update("points", Number(e.target.value))} />
      </div>
      <div>
        <TextEditor value={q.question_text} onChange={(v) => update("question_text", v)} />
      </div>

      {(q.type === "multiple_choice" || q.type === "true_false") && (
        <div className="space-y-2">
          {(q.options ?? []).map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input className="w-full rounded-md border px-2 py-1 text-sm" value={opt.text} onChange={(e) => {
                const copy = [...(q.options ?? [])];
                copy[idx] = { ...opt, text: e.target.value };
                update("options", copy);
              }} />
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={opt.is_correct} onChange={() => toggleCorrect(opt.id)} />
                <span>Correct</span>
              </label>
              <button className="text-xs text-red-600" onClick={() => update("options", (q.options ?? []).filter((o) => o.id !== opt.id))}><span>Remove</span></button>
            </div>
          ))}
          <button type="button" className="text-xs text-[#3B82F6]" onClick={addOption}><span>Add option</span></button>
        </div>
      )}

      {q.type === "short_answer" && (
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md border px-2 py-1 text-sm" placeholder="Correct answer" value={typeof q.correct_answer === "string" ? q.correct_answer : ""} onChange={(e) => update("correct_answer", e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={Boolean(q.case_sensitive)} onChange={(e) => update("case_sensitive", e.target.checked)} />
            <span>Case sensitive</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-md border px-2 py-1 text-sm" placeholder="Feedback (correct)" value={q.feedback_correct ?? ""} onChange={(e) => update("feedback_correct", e.target.value)} />
        <input className="rounded-md border px-2 py-1 text-sm" placeholder="Feedback (incorrect)" value={q.feedback_incorrect ?? ""} onChange={(e) => update("feedback_incorrect", e.target.value)} />
      </div>

      {onRemove && (
        <div className="pt-2 text-right">
          <button type="button" className="text-xs text-red-600" onClick={onRemove}><span>Delete question</span></button>
        </div>
      )}
    </div>
  );
}
