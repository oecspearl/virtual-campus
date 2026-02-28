"use client";

import React from "react";
import { Icon } from "@iconify/react";

export interface SurveyQuestion {
  id?: string;
  type: string;
  question_text: string;
  description?: string;
  required: boolean;
  order: number;
  options?: any;
  conditional_logic?: any;
  category?: string;
}

interface SurveyQuestionEditorProps {
  value: SurveyQuestion;
  index: number;
  onChange: (question: SurveyQuestion) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const QUESTION_TYPES = [
  { value: 'likert_scale', label: 'Likert Scale', icon: 'material-symbols:linear-scale' },
  { value: 'rating_scale', label: 'Rating Scale', icon: 'material-symbols:star-rate' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: 'material-symbols:radio-button-checked' },
  { value: 'multiple_select', label: 'Multiple Select', icon: 'material-symbols:check-box' },
  { value: 'text', label: 'Short Text', icon: 'material-symbols:short-text' },
  { value: 'essay', label: 'Essay / Long Text', icon: 'material-symbols:notes' },
  { value: 'matrix', label: 'Matrix', icon: 'material-symbols:grid-on' },
  { value: 'ranking', label: 'Ranking', icon: 'material-symbols:format-list-numbered' },
  { value: 'nps', label: 'Net Promoter Score', icon: 'material-symbols:trending-up' },
  { value: 'slider', label: 'Slider', icon: 'material-symbols:tune' }
];

export default function SurveyQuestionEditor({
  value,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown
}: SurveyQuestionEditorProps) {
  const [expanded, setExpanded] = React.useState(true);

  function updateField(field: string, val: any) {
    onChange({ ...value, [field]: val });
  }

  function updateOptions(newOptions: any) {
    onChange({ ...value, options: newOptions });
  }

  // Get default options for a question type
  function getDefaultOptions(type: string) {
    switch (type) {
      case 'likert_scale':
        return {
          min: 1,
          max: 5,
          labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
        };
      case 'rating_scale':
        return { min: 1, max: 10 };
      case 'nps':
        return { min: 0, max: 10 };
      case 'slider':
        return { min: 0, max: 100, step: 1 };
      case 'multiple_choice':
      case 'multiple_select':
      case 'ranking':
        return [
          { id: 'opt1', text: 'Option 1' },
          { id: 'opt2', text: 'Option 2' },
          { id: 'opt3', text: 'Option 3' }
        ];
      case 'matrix':
        return {
          rows: [
            { id: 'row1', text: 'Row 1' },
            { id: 'row2', text: 'Row 2' }
          ],
          columns: [
            { id: 'col1', text: 'Column 1' },
            { id: 'col2', text: 'Column 2' },
            { id: 'col3', text: 'Column 3' }
          ]
        };
      case 'text':
        return { maxLength: 500 };
      case 'essay':
        return { minLength: 50, maxLength: 2000 };
      default:
        return null;
    }
  }

  function handleTypeChange(newType: string) {
    const newOptions = getDefaultOptions(newType);
    onChange({ ...value, type: newType, options: newOptions });
  }

  const typeConfig = QUESTION_TYPES.find(t => t.value === value.type);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
          <Icon icon={typeConfig?.icon || 'material-symbols:help'} className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 truncate max-w-md">
            {value.question_text || 'Untitled question'}
          </span>
          {value.required && (
            <span className="text-xs text-red-500">*</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMoveUp && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Move up"
            >
              <Icon icon="material-symbols:arrow-upward" className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Move down"
            >
              <Icon icon="material-symbols:arrow-downward" className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 text-red-400 hover:text-red-600"
            title="Remove question"
          >
            <Icon icon="material-symbols:delete" className="w-4 h-4" />
          </button>
          <Icon
            icon={expanded ? 'material-symbols:expand-less' : 'material-symbols:expand-more'}
            className="w-5 h-5 text-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Question Type */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Question Type</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={value.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Category (optional)</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="e.g., Content Quality"
                value={value.category || ''}
                onChange={(e) => updateField('category', e.target.value)}
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Question Text *</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
              placeholder="Enter your question..."
              value={value.question_text}
              onChange={(e) => updateField('question_text', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Description (optional)</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Additional context or instructions"
              value={value.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          {/* Required */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={value.required}
              onChange={(e) => updateField('required', e.target.checked)}
            />
            <span>Required question</span>
          </label>

          {/* Type-specific options */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium text-gray-600 mb-3">Question Options</h4>
            {renderTypeSpecificOptions()}
          </div>
        </div>
      )}
    </div>
  );

  function renderTypeSpecificOptions() {
    const options = value.options || {};

    switch (value.type) {
      case 'likert_scale':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Min Value</label>
                <input
                  type="number"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={options.min || 1}
                  onChange={(e) => updateOptions({ ...options, min: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Value</label>
                <input
                  type="number"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={options.max || 5}
                  onChange={(e) => updateOptions({ ...options, max: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Labels (comma-separated)</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree"
                value={(options.labels || []).join(', ')}
                onChange={(e) => updateOptions({
                  ...options,
                  labels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </div>
        );

      case 'rating_scale':
      case 'nps':
      case 'slider':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min Value</label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={options.min ?? (value.type === 'nps' ? 0 : 1)}
                onChange={(e) => updateOptions({ ...options, min: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Value</label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={options.max ?? 10}
                onChange={(e) => updateOptions({ ...options, max: parseInt(e.target.value) })}
              />
            </div>
            {value.type === 'slider' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Step</label>
                <input
                  type="number"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={options.step || 1}
                  onChange={(e) => updateOptions({ ...options, step: parseInt(e.target.value) })}
                />
              </div>
            )}
          </div>
        );

      case 'multiple_choice':
      case 'multiple_select':
      case 'ranking':
        const choiceOptions = Array.isArray(options) ? options : [];
        return (
          <div className="space-y-2">
            {choiceOptions.map((opt: any, idx: number) => (
              <div key={opt.id || idx} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  placeholder={`Option ${idx + 1}`}
                  value={opt.text || ''}
                  onChange={(e) => {
                    const newOptions = [...choiceOptions];
                    newOptions[idx] = { ...opt, text: e.target.value };
                    updateOptions(newOptions);
                  }}
                />
                <button
                  onClick={() => {
                    const newOptions = choiceOptions.filter((_: any, i: number) => i !== idx);
                    updateOptions(newOptions);
                  }}
                  className="p-2 text-red-400 hover:text-red-600"
                >
                  <Icon icon="material-symbols:close" className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newOptions = [...choiceOptions, { id: `opt${Date.now()}`, text: '' }];
                updateOptions(newOptions);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Icon icon="material-symbols:add" className="w-4 h-4" />
              <span>Add option</span>
            </button>
          </div>
        );

      case 'matrix':
        const matrixOptions = options || { rows: [], columns: [] };
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-2">Rows</label>
              <div className="space-y-2">
                {(matrixOptions.rows || []).map((row: any, idx: number) => (
                  <div key={row.id || idx} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-md border px-3 py-2 text-sm"
                      placeholder={`Row ${idx + 1}`}
                      value={row.text || ''}
                      onChange={(e) => {
                        const newRows = [...matrixOptions.rows];
                        newRows[idx] = { ...row, text: e.target.value };
                        updateOptions({ ...matrixOptions, rows: newRows });
                      }}
                    />
                    <button
                      onClick={() => {
                        const newRows = matrixOptions.rows.filter((_: any, i: number) => i !== idx);
                        updateOptions({ ...matrixOptions, rows: newRows });
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Icon icon="material-symbols:close" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newRows = [...(matrixOptions.rows || []), { id: `row${Date.now()}`, text: '' }];
                    updateOptions({ ...matrixOptions, rows: newRows });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Icon icon="material-symbols:add" className="w-4 h-4" />
                  <span>Add row</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-2">Columns</label>
              <div className="space-y-2">
                {(matrixOptions.columns || []).map((col: any, idx: number) => (
                  <div key={col.id || idx} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-md border px-3 py-2 text-sm"
                      placeholder={`Column ${idx + 1}`}
                      value={col.text || ''}
                      onChange={(e) => {
                        const newCols = [...matrixOptions.columns];
                        newCols[idx] = { ...col, text: e.target.value };
                        updateOptions({ ...matrixOptions, columns: newCols });
                      }}
                    />
                    <button
                      onClick={() => {
                        const newCols = matrixOptions.columns.filter((_: any, i: number) => i !== idx);
                        updateOptions({ ...matrixOptions, columns: newCols });
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Icon icon="material-symbols:close" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newCols = [...(matrixOptions.columns || []), { id: `col${Date.now()}`, text: '' }];
                    updateOptions({ ...matrixOptions, columns: newCols });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Icon icon="material-symbols:add" className="w-4 h-4" />
                  <span>Add column</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max Length</label>
            <input
              type="number"
              className="w-32 rounded-md border px-3 py-2 text-sm"
              value={options.maxLength || 500}
              onChange={(e) => updateOptions({ ...options, maxLength: parseInt(e.target.value) })}
            />
          </div>
        );

      case 'essay':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min Length</label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={options.minLength || 50}
                onChange={(e) => updateOptions({ ...options, minLength: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Length</label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={options.maxLength || 2000}
                onChange={(e) => updateOptions({ ...options, maxLength: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">No additional options for this question type.</p>;
    }
  }
}
