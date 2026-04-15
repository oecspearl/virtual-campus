"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";

interface PeerAssignment {
  id: string;
  assignment_id: string;
  reviewer_id: string;
  submission_id: string;
  status: "pending" | "completed";
  completed_at: string | null;
  created_at: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  submission: {
    id: string;
    student_id: string;
    submitted_at: string;
    student: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface PeerReview {
  id: string;
  peer_assignment_id: string;
  reviewer_id: string;
  submission_id: string;
  feedback: string;
  rubric_scores: any;
  overall_score: number;
  created_at: string;
}

interface PeerReviewManagerProps {
  assignmentId: string;
  onClose?: () => void;
}

export default function PeerReviewManager({ assignmentId, onClose }: PeerReviewManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentSettings, setAssignmentSettings] = useState<any>(null);
  const [peerAssignments, setPeerAssignments] = useState<PeerAssignment[]>([]);
  const [reviews, setReviews] = useState<PeerReview[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PeerReview | null>(null);

  useEffect(() => {
    loadPeerReviewData();
  }, [assignmentId]);

  async function loadPeerReviewData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/assignments/${assignmentId}/peer-review`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load peer review data");
      }

      const data = await res.json();
      setAssignmentSettings(data.assignment);
      setPeerAssignments(data.peer_assignments || []);
      setReviews(data.reviews || []);
    } catch (e: any) {
      console.error("Error loading peer review data:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function autoAssignReviewers() {
    if (!confirm("This will clear any existing peer review assignments and auto-assign new reviewers. Continue?")) {
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/peer-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign" })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign reviewers");
      }

      alert(`Successfully assigned ${data.assignments_count} peer reviews!`);
      loadPeerReviewData();
    } catch (e: any) {
      console.error("Error assigning reviewers:", e);
      alert(e.message);
    } finally {
      setAssigning(false);
    }
  }

  const pendingCount = peerAssignments.filter(a => a.status === "pending").length;
  const completedCount = peerAssignments.filter(a => a.status === "completed").length;

  // Group assignments by submission
  const submissionGroups = peerAssignments.reduce((groups: Record<string, PeerAssignment[]>, assignment) => {
    const submissionId = assignment.submission_id;
    if (!groups[submissionId]) {
      groups[submissionId] = [];
    }
    groups[submissionId].push(assignment);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Icon icon="mdi:loading" className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading peer review data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center py-6">
          <Icon icon="mdi:alert-circle" className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={loadPeerReviewData} className="mt-4" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Icon icon="mdi:account-group" className="w-5 h-5 mr-2" />
              Peer Review Management
            </h3>
            <p className="text-purple-100 text-sm mt-1">
              {assignmentSettings?.peer_reviews_required || 2} reviews required per submission
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <Icon icon="mdi:close" className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
        <div className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{peerAssignments.length}</p>
          <p className="text-sm text-gray-500">Total Assignments</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
      </div>

      <div className="p-6">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            {Object.keys(submissionGroups).length} submissions with peer reviewers assigned
          </p>
          <Button onClick={autoAssignReviewers} disabled={assigning}>
            <Icon icon="mdi:shuffle-variant" className="w-4 h-4 mr-2" />
            {assigning ? "Assigning..." : "Auto-Assign Reviewers"}
          </Button>
        </div>

        {peerAssignments.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Icon icon="mdi:account-group-outline" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No Peer Reviewers Assigned</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Click "Auto-Assign Reviewers" to automatically assign peer reviewers based on submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(submissionGroups).map(([submissionId, assignments]) => {
              const submission = assignments[0]?.submission;
              const submissionReviews = reviews.filter(r => r.submission_id === submissionId);
              const avgScore = submissionReviews.length > 0
                ? (submissionReviews.reduce((sum, r) => sum + (r.overall_score || 0), 0) / submissionReviews.length).toFixed(1)
                : null;

              return (
                <div key={submissionId} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {submission?.student?.name || "Unknown Student"}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {submission?.student?.email} - Submitted {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      {avgScore && (
                        <div className="text-right">
                          <span className="text-sm text-gray-500">Avg Score:</span>
                          <span className="ml-2 font-bold text-purple-600">{avgScore}/10</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {assignments.map((assignment) => {
                      const review = reviews.find(r => r.peer_assignment_id === assignment.id);
                      return (
                        <div key={assignment.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              assignment.status === "completed" ? "bg-green-500" : "bg-amber-500"
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {assignment.reviewer?.name || "Unknown Reviewer"}
                              </p>
                              <p className="text-xs text-gray-500">{assignment.reviewer?.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {assignment.status === "completed" ? (
                              <>
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                  Completed
                                </span>
                                {review && (
                                  <button
                                    onClick={() => setSelectedReview(review)}
                                    className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                                  >
                                    <Icon icon="mdi:eye" className="w-4 h-4 mr-1" />
                                    View ({review.overall_score}/10)
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Peer Review Details</h3>
              <button onClick={() => setSelectedReview(null)} className="text-gray-400 hover:text-gray-600">
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  Reviewed: {new Date(selectedReview.created_at).toLocaleString()}
                </span>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg font-medium">
                  Score: {selectedReview.overall_score}/10
                </span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Feedback</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedReview.feedback}</p>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedReview(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
