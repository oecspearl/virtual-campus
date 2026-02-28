"use client";

import React from "react";
import { Icon } from "@iconify/react";
import SubmissionViewer from "@/app/components/SubmissionViewer";

export default function GradingPanel({ assignmentId, submission, onGraded }: {
  assignmentId: string;
  submission: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onGraded: () => void;
}) {
  const [feedback, setFeedback] = React.useState<string>(submission?.feedback ?? "");
  const [grade, setGrade] = React.useState<number | ''>(submission?.grade ?? '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submitGrade() {
    // Validate grade
    if (grade === '' || grade === null || grade === undefined) {
      setError('Please enter a grade');
      return;
    }

    if (Number(grade) < 0 || Number(grade) > 100) {
      setError('Grade must be between 0 and 100');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(String(submission.id))}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, grade: Number(grade) })
      });
      
      if (res.ok) {
        onGraded();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to save grade');
      }
    } catch (err) {
      setError('Failed to save grade. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Submission Viewer Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon icon="mdi:file-document" className="w-6 h-6" />
            Student Submission
          </h3>
        </div>
        <div className="p-6">
          <SubmissionViewer submission={submission} />
        </div>
      </div>

      {/* Grading Form Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon icon="mdi:clipboard-check" className="w-6 h-6" />
            Enter Grade & Feedback
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <Icon icon="mdi:alert-circle" className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-900">Error</div>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Grade Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Icon icon="mdi:numeric" className="w-5 h-5 text-purple-600" />
              Grade (0-100) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input 
                type="number" 
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-lg font-semibold focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                value={grade} 
                onChange={(e) => {
                  const val = e.target.value;
                  setGrade(val === '' ? '' : Number(val));
                  setError(null);
                }}
                min="0"
                max="100"
                placeholder="Enter grade"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                /100
              </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Minimum: 0</span>
              <span>Maximum: 100</span>
            </div>
          </div>

          {/* Feedback Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Icon icon="mdi:message-text-outline" className="w-5 h-5 text-blue-600" />
              Feedback (Optional)
            </label>
            <textarea 
              className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none" 
              rows={8}
              value={feedback} 
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide detailed feedback for the student..."
            />
            <div className="mt-2 text-xs text-gray-500">
              Character count: {feedback.length}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={submitGrade} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                  <span>Saving Grade...</span>
                </>
              ) : (
                <>
                  <Icon icon="mdi:check-circle" className="w-5 h-5" />
                  <span>Save Grade</span>
                </>
              )}
            </button>
            
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Icon icon="mdi:information-outline" className="w-5 h-5 text-blue-600" />
              <span>The grade will be saved and visible to the student.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
