'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import TextEditor from '@/app/components/editor/TextEditor';
import InlineRubricBuilder, { type RubricCriterion } from './InlineRubricBuilder';
import type { Discussion } from './hooks/useDiscussionData';

export interface RubricTemplate {
  id: string;
  name: string;
  description?: string;
  rubric: RubricCriterion[];
  is_system: boolean;
}

export interface DiscussionEditFormProps {
  discussion: Discussion;
  discussionId: string;
  /** Instructors see grading fields and the rubric builder; others don't. */
  isInstructor: boolean;
  /** Called after a successful PUT — parent should refetch + close the form. */
  onSaved: () => void;
  /** Called when the user cancels — parent should close the form. */
  onCancel: () => void;
}

/**
 * Self-contained edit panel for a discussion post. Owns all edit-mode
 * state (title/content + the ~7 grading fields + rubric state) and the
 * PUT call. The parent just decides when to show the form and what to
 * do after it closes (refetch on save, nothing on cancel).
 *
 * Rubric templates and AI-generated rubrics are scoped here too: they're
 * only meaningful while editing.
 */
export default function DiscussionEditForm({
  discussion,
  discussionId,
  isInstructor,
  onSaved,
  onCancel,
}: DiscussionEditFormProps) {
  const [title, setTitle] = useState(discussion.title);
  const [content, setContent] = useState(discussion.content);
  const [isSaving, setIsSaving] = useState(false);

  // Grading fields — initialized from the discussion on mount.
  const [isGraded, setIsGraded] = useState<boolean>(discussion.is_graded || false);
  const [points, setPoints] = useState<number>(discussion.points || 100);
  const [dueDate, setDueDate] = useState<string>(
    discussion.due_date ? discussion.due_date.split('T')[0] : ''
  );
  const [gradingCriteria, setGradingCriteria] = useState<string>(
    discussion.grading_criteria || ''
  );
  const [minReplies, setMinReplies] = useState<number>(discussion.min_replies || 2);
  const [minWords, setMinWords] = useState<number>(discussion.min_words || 100);
  const [rubric, setRubric] = useState<RubricCriterion[]>(discussion.rubric || []);
  const [showRubricBuilder, setShowRubricBuilder] = useState(false);

  // Template picker + AI rubric state.
  const [rubricTemplates, setRubricTemplates] = useState<RubricTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatingAIRubric, setGeneratingAIRubric] = useState(false);

  // Fetch rubric templates once, when an instructor opens the form.
  useEffect(() => {
    if (!isInstructor) return;
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      try {
        const response = await fetch('/api/discussions/rubric-templates', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setRubricTemplates(data.templates || []);
        }
      } catch (err) {
        console.error('Error fetching rubric templates:', err);
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isInstructor]);

  const applyTemplate = (template: RubricTemplate) => {
    setRubric(template.rubric);
    setShowRubricBuilder(true);
  };

  const generateAIRubric = async () => {
    setGeneratingAIRubric(true);
    try {
      const response = await fetch('/api/ai/rubric-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: 'discussion',
          discussionId,
          criteriaCount: 4,
          rubricType: 'discussion',
          maxPoints: points || 100,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.rubric && data.rubric.length > 0) {
          setRubric(data.rubric);
          setShowRubricBuilder(true);
        }
      }
    } catch (err) {
      console.error('Error generating AI rubric:', err);
    } finally {
      setGeneratingAIRubric(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required');
      return;
    }
    if (isGraded && (!points || points <= 0)) {
      alert('Points must be a positive number for graded discussions');
      return;
    }

    setIsSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
      };
      if (isInstructor) {
        payload.is_graded = isGraded;
        if (isGraded) {
          payload.points = points;
          payload.due_date = dueDate || null;
          payload.grading_criteria = gradingCriteria;
          payload.min_replies = minReplies;
          payload.min_words = minWords;
          payload.rubric = rubric.length > 0 ? rubric : null;
        }
      }

      const response = await fetch(`/api/discussions/${discussionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Discussion updated successfully!');
        onSaved();
      } else {
        const errorData = await response.json();
        alert(`Failed to update discussion: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating discussion:', err);
      alert(
        `Failed to update discussion: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Discussion</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
            placeholder="Discussion title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <TextEditor value={content} onChange={setContent} />
        </div>

        {isInstructor && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="editIsGraded"
                checked={isGraded}
                onChange={(e) => setIsGraded(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="editIsGraded"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Icon icon="material-symbols:grade" className="w-5 h-5 text-amber-600" />
                Graded Discussion
              </label>
            </div>

            {isGraded && (
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Points
                    </label>
                    <input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                      min={1}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Replies Required
                    </label>
                    <input
                      type="number"
                      value={minReplies}
                      onChange={(e) => setMinReplies(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Words Per Post
                    </label>
                    <input
                      type="number"
                      value={minWords}
                      onChange={(e) => setMinWords(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grading Criteria (Text Description)
                  </label>
                  <textarea
                    value={gradingCriteria}
                    onChange={(e) => setGradingCriteria(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Describe how students will be graded..."
                  />
                </div>

                <div className="border-t border-amber-300 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Icon
                        icon="material-symbols:table-chart"
                        className="w-5 h-5 text-green-600"
                      />
                      Grading Rubric
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowRubricBuilder(!showRubricBuilder)}
                      className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
                    >
                      {showRubricBuilder ? (
                        <>
                          <Icon icon="material-symbols:expand-less" className="w-4 h-4" />
                          Hide Rubric Builder
                        </>
                      ) : (
                        <>
                          <Icon icon="material-symbols:expand-more" className="w-4 h-4" />
                          {rubric.length > 0 ? 'Edit Rubric' : 'Add Rubric'}
                        </>
                      )}
                    </button>
                  </div>

                  {!showRubricBuilder && rubric.length === 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Start with a template or generate with AI:
                      </p>
                      {loadingTemplates ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Icon
                            icon="material-symbols:hourglass-empty"
                            className="w-4 h-4 animate-spin"
                          />
                          Loading templates...
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {rubricTemplates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => applyTemplate(template)}
                              className="px-3 py-2 text-sm bg-white border border-green-300 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2"
                            >
                              {template.is_system && (
                                <Icon
                                  icon="material-symbols:verified"
                                  className="w-4 h-4 text-green-600"
                                />
                              )}
                              {template.name}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setRubric([
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
                              setShowRubricBuilder(true);
                            }}
                            className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <Icon icon="material-symbols:add" className="w-4 h-4" />
                            Create Custom
                          </button>
                          <button
                            type="button"
                            onClick={generateAIRubric}
                            disabled={generatingAIRubric}
                            className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingAIRubric ? (
                              <>
                                <Icon
                                  icon="material-symbols:hourglass-empty"
                                  className="w-4 h-4 animate-spin"
                                />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Icon
                                  icon="material-symbols:auto-awesome"
                                  className="w-4 h-4"
                                />
                                AI Generate
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {showRubricBuilder && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <InlineRubricBuilder value={rubric} onChange={setRubric} />
                    </div>
                  )}

                  {rubric.length > 0 && !showRubricBuilder && (
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <div className="text-sm text-gray-600">
                        <strong>{rubric.length}</strong> criteria configured (Total:{' '}
                        {rubric.reduce(
                          (sum, c) => sum + Math.max(...c.levels.map((l) => l.points)),
                          0
                        )}{' '}
                        max points)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
