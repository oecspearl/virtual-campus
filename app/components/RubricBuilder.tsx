"use client";

import React from "react";

export type RubricLevel = { name: string; description: string; points: number };
export type RubricCriterion = { id: string; criteria: string; levels: RubricLevel[] };

interface RubricBuilderProps {
  value: RubricCriterion[];
  onChange: (rubric: RubricCriterion[]) => void;
  /** Optional: assignment title used as context for AI rubric generation */
  assignmentTitle?: string;
  /** Optional: assignment description used as context for AI rubric generation */
  assignmentDescription?: string;
  /** Optional: total points for the assignment, used to distribute across criteria */
  maxPoints?: number;
  /** Optional: rubric type hint for AI generation */
  rubricType?: 'assignment' | 'discussion' | 'project' | 'presentation';
}

export default function RubricBuilder({ value, onChange, assignmentTitle, assignmentDescription, maxPoints = 100, rubricType = 'assignment' }: RubricBuilderProps) {
  const [rows, setRows] = React.useState<RubricCriterion[]>(value);
  const [generating, setGenerating] = React.useState(false);
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const [aiTopic, setAiTopic] = React.useState(assignmentTitle || "");
  const [aiCriteriaCount, setAiCriteriaCount] = React.useState(4);
  const [pendingRubric, setPendingRubric] = React.useState<RubricCriterion[] | null>(null);

  React.useEffect(() => setRows(value), [value]);
  React.useEffect(() => { if (assignmentTitle) setAiTopic(assignmentTitle); }, [assignmentTitle]);

  function update(newRows: RubricCriterion[]) {
    setRows(newRows);
    onChange(newRows);
  }

  function acceptPendingRubric() {
    if (pendingRubric) {
      update(pendingRubric);
      setPendingRubric(null);
      setShowAiPanel(false);
    }
  }

  function discardPendingRubric() {
    setPendingRubric(null);
  }

  async function generateRubricWithAI() {
    if (!aiTopic.trim() && !assignmentDescription?.trim()) {
      alert("Please enter a topic or assignment description for rubric generation");
      return;
    }

    setGenerating(true);
    try {
      // Build contextual topic from title + description
      const contextualTopic = [
        aiTopic.trim(),
        assignmentDescription ? `\n\nAssignment Description:\n${assignmentDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}` : ''
      ].filter(Boolean).join('');

      const res = await fetch("/api/ai/rubric-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: 'topic',
          topic: contextualTopic,
          criteriaCount: aiCriteriaCount,
          rubricType,
          maxPoints
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate rubric");
      }

      const data = await res.json();
      if (data.rubric && Array.isArray(data.rubric)) {
        setPendingRubric(data.rubric);
      } else {
        throw new Error("Invalid rubric response");
      }
    } catch (error: any) {
      console.error('AI rubric generation error:', error);
      alert(error.message || "Failed to generate rubric. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* AI Generate Button and Panel */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAiPanel(!showAiPanel)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Generate Rubric with AI
        </button>
        {rows.length > 0 && (
          <span className="text-xs text-gray-500">{rows.length} criteria</span>
        )}
      </div>

      {showAiPanel && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-900 mb-3">AI Rubric Generator</h4>

          {/* Pending rubric preview */}
          {pendingRubric ? (
            <div className="space-y-3">
              <div className="bg-white border border-purple-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                <div className="text-xs font-medium text-purple-800 mb-2">Generated Rubric Preview ({pendingRubric.length} criteria)</div>
                {pendingRubric.map((criterion, idx) => (
                  <div key={criterion.id || idx} className="mb-3 last:mb-0">
                    <div className="text-sm font-medium text-gray-900">{idx + 1}. {criterion.criteria}</div>
                    <div className="ml-4 mt-1 space-y-0.5">
                      {criterion.levels.map((level, j) => (
                        <div key={j} className="text-xs text-gray-600 flex items-baseline gap-2">
                          <span className="font-medium text-gray-700 min-w-[90px]">{level.name} ({level.points}pts):</span>
                          <span className="line-clamp-1">{level.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={acceptPendingRubric}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept Rubric
                </button>
                <button
                  type="button"
                  onClick={discardPendingRubric}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => { discardPendingRubric(); generateRubricWithAI(); }}
                  disabled={generating}
                  className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
                >
                  {generating ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-purple-800 mb-1">Topic / Assignment Title</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g., Research Paper on Climate Change"
                  className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              {assignmentDescription && (
                <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-3 py-2">
                  <span className="font-medium">Context:</span> The rubric will be generated based on the assignment title and description.
                </div>
              )}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-purple-800 mb-1">Number of Criteria</label>
                  <select
                    value={aiCriteriaCount}
                    onChange={(e) => setAiCriteriaCount(Number(e.target.value))}
                    className="px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value={3}>3 criteria</option>
                    <option value={4}>4 criteria</option>
                    <option value={5}>5 criteria</option>
                    <option value={6}>6 criteria</option>
                  </select>
                </div>
                <div className="text-xs text-purple-700 mt-4">
                  Max points: {maxPoints} ({Math.round(maxPoints / aiCriteriaCount)} per criterion)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateRubricWithAI}
                  disabled={generating}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiPanel(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                {rows.length > 0 && (
                  <span className="text-xs text-amber-600">This will replace the existing rubric</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rubric Criteria */}
      {rows.map((row, idx) => (
        <div key={row.id} className="rounded-md border p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              className="w-full rounded-md border px-2 py-1 text-sm"
              placeholder="Criteria"
              value={row.criteria}
              onChange={(e) => {
                const copy = [...rows];
                copy[idx] = { ...row, criteria: e.target.value };
                update(copy);
              }}
            />
            <button className="text-xs text-red-600" onClick={() => update(rows.filter((r) => r.id !== row.id))}>
              <span>Remove</span>
            </button>
          </div>
          <div className="space-y-2">
            {row.levels.map((lvl, j) => (
              <div key={j} className="grid grid-cols-12 gap-2">
                <input className="col-span-3 rounded-md border px-2 py-1 text-sm" placeholder="Level name" value={lvl.name} onChange={(e) => {
                  const copy = [...rows];
                  const levels = [...copy[idx].levels];
                  levels[j] = { ...lvl, name: e.target.value };
                  copy[idx] = { ...copy[idx], levels };
                  update(copy);
                }} />
                <input className="col-span-7 rounded-md border px-2 py-1 text-sm" placeholder="Description" value={lvl.description} onChange={(e) => {
                  const copy = [...rows];
                  const levels = [...copy[idx].levels];
                  levels[j] = { ...lvl, description: e.target.value };
                  copy[idx] = { ...copy[idx], levels };
                  update(copy);
                }} />
                <input type="number" className="col-span-2 rounded-md border px-2 py-1 text-sm" placeholder="Points" value={lvl.points} onChange={(e) => {
                  const copy = [...rows];
                  const levels = [...copy[idx].levels];
                  levels[j] = { ...lvl, points: Number(e.target.value) };
                  copy[idx] = { ...copy[idx], levels };
                  update(copy);
                }} />
              </div>
            ))}
            <button className="text-xs text-[#3B82F6]" onClick={() => {
              const copy = [...rows];
              copy[idx] = { ...copy[idx], levels: [...copy[idx].levels, { name: "Level", description: "", points: 0 }] };
              update(copy);
            }}>
              <span>Add level</span>
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700"
        onClick={() => update([...rows, { id: crypto.randomUUID(), criteria: "New criteria", levels: [{ name: "Excellent", description: "", points: 10 }, { name: "Good", description: "", points: 8 }, { name: "Fair", description: "", points: 6 }] }])}
      >
        <span>Add criteria</span>
      </button>
    </div>
  );
}
