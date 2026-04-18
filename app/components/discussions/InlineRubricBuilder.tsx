'use client';

import React from 'react';
import { Icon } from '@iconify/react';

export interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

export interface RubricCriterion {
  id: string;
  criteria: string;
  levels: RubricLevel[];
}

export interface InlineRubricBuilderProps {
  value: RubricCriterion[];
  onChange: (rubric: RubricCriterion[]) => void;
}

/**
 * Controlled rubric editor. The parent owns the `RubricCriterion[]` state
 * and passes it in via `value`; every mutation flows back through
 * `onChange`, which is the whole-rubric array after the edit is applied.
 *
 * Used in DiscussionDetail's grading panel and reusable anywhere a list
 * of "criterion → levels" rubrics needs inline editing.
 */
export default function InlineRubricBuilder({ value, onChange }: InlineRubricBuilderProps) {
  const addCriteria = () => {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        criteria: 'New Criteria',
        levels: [
          { name: 'Excellent', description: '', points: 25 },
          { name: 'Good', description: '', points: 20 },
          { name: 'Satisfactory', description: '', points: 15 },
          { name: 'Needs Improvement', description: '', points: 10 },
        ],
      },
    ]);
  };

  const removeCriteria = (id: string) => {
    onChange(value.filter((c) => c.id !== id));
  };

  const updateCriteria = (id: string, field: string, newValue: string) => {
    onChange(value.map((c) => (c.id === id ? { ...c, [field]: newValue } : c)));
  };

  const updateLevel = (
    criteriaId: string,
    levelIndex: number,
    field: string,
    newValue: string | number
  ) => {
    onChange(
      value.map((c) => {
        if (c.id !== criteriaId) return c;
        const newLevels = [...c.levels];
        newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: newValue };
        return { ...c, levels: newLevels };
      })
    );
  };

  const addLevel = (criteriaId: string) => {
    onChange(
      value.map((c) => {
        if (c.id !== criteriaId) return c;
        return {
          ...c,
          levels: [...c.levels, { name: 'Level', description: '', points: 0 }],
        };
      })
    );
  };

  const removeLevel = (criteriaId: string, levelIndex: number) => {
    onChange(
      value.map((c) => {
        if (c.id !== criteriaId) return c;
        return { ...c, levels: c.levels.filter((_, i) => i !== levelIndex) };
      })
    );
  };

  return (
    <div className="space-y-4">
      {value.map((criterion) => (
        <div key={criterion.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <input
              type="text"
              value={criterion.criteria}
              onChange={(e) => updateCriteria(criterion.id, 'criteria', e.target.value)}
              className="flex-1 font-medium text-gray-800 border-0 bg-transparent focus:ring-0 focus:outline-none px-0"
              placeholder="Criteria name..."
            />
            <button
              type="button"
              onClick={() => removeCriteria(criterion.id)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <Icon icon="material-symbols:delete" className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {criterion.levels.map((level, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => updateLevel(criterion.id, idx, 'name', e.target.value)}
                  className="col-span-2 text-sm rounded border border-gray-300 px-2 py-1"
                  placeholder="Level"
                />
                <input
                  type="text"
                  value={level.description}
                  onChange={(e) => updateLevel(criterion.id, idx, 'description', e.target.value)}
                  className="col-span-8 text-sm rounded border border-gray-300 px-2 py-1"
                  placeholder="Description"
                />
                <input
                  type="number"
                  value={level.points}
                  onChange={(e) =>
                    updateLevel(criterion.id, idx, 'points', Number(e.target.value))
                  }
                  className="col-span-1 text-sm rounded border border-gray-300 px-2 py-1 text-center"
                  placeholder="Pts"
                />
                <button
                  type="button"
                  onClick={() => removeLevel(criterion.id, idx)}
                  className="col-span-1 text-red-400 hover:text-red-600"
                  disabled={criterion.levels.length <= 2}
                >
                  <Icon icon="material-symbols:close" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addLevel(criterion.id)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Icon icon="material-symbols:add" className="w-3 h-3" />
            Add Level
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCriteria}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
      >
        <Icon icon="material-symbols:add" className="w-4 h-4" />
        Add Criteria
      </button>
    </div>
  );
}
