"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";

interface PeerAssignment {
  id: string;
  submission_id: string;
  status: "pending" | "completed";
  completed_at: string | null;
  submission: {
    id: string;
    content: string;
    files: any[];
    submitted_at: string;
  };
}

interface PeerReview {
  id: string;
  feedback: string;
  rubric_scores: any;
  overall_score: number;
  created_at: string;
}

interface ReviewOfMe {
  feedback: string;
  rubric_scores: any;
  overall_score: number;
  created_at: string;
}

interface PeerReviewPanelProps {
  assignmentId: string;
  isInstructor?: boolean;
}

export default function PeerReviewPanel({ assignmentId, isInstructor = false }: PeerReviewPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentSettings, setAssignmentSettings] = useState<any>(null);
  const [myAssignments, setMyAssignments] = useState<PeerAssignment[]>([]);
  const [myReviews, setMyReviews] = useState<PeerReview[]>([]);
  const [reviewsOfMe, setReviewsOfMe] = useState<ReviewOfMe[]>([]);
  const [activeTab, setActiveTab] = useState<"to-review" | "my-reviews" | "received">("to-review");
  const [selectedAssignment, setSelectedAssignment] = useState<PeerAssignment | null>(null);
  const [reviewForm, setReviewForm] = useState({ feedback: "", overall_score: 0 });
  const [submitting, setSubmitting] = useState(false);

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
        if (res.status === 400 && data.error === "Peer review not enabled for this assignment") {
          setError("not_enabled");
          return;
        }
        throw new Error(data.error || "Failed to load peer review data");
      }

      const data = await res.json();
      setAssignmentSettings(data.assignment);
      setMyAssignments(data.my_assignments || []);
      setMyReviews(data.my_reviews || []);
      setReviewsOfMe(data.reviews_of_me || []);
    } catch (e: any) {
      console.error("Error loading peer review data:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitReview() {
    if (!selectedAssignment) return;
    if (!reviewForm.feedback.trim()) {
      alert("Please provide feedback for the submission");
      return;
    }
    if (reviewForm.overall_score < 1 || reviewForm.overall_score > 10) {
      alert("Please provide a score between 1 and 10");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/peer-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peer_assignment_id: selectedAssignment.id,
          submission_id: selectedAssignment.submission_id,
          feedback: reviewForm.feedback,
          overall_score: reviewForm.overall_score
        })
      });

      if (!res.ok) {
        throw new Error("Failed to submit review");
      }

      alert("Review submitted successfully!");
      setSelectedAssignment(null);
      setReviewForm({ feedback: "", overall_score: 0 });
      loadPeerReviewData();
    } catch (e: any) {
      console.error("Error submitting review:", e);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Icon icon="mdi:loading" className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading peer review...</span>
        </div>
      </div>
    );
  }

  if (error === "not_enabled") {
    return null; // Peer review not enabled, don't show panel
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

  const pendingCount = myAssignments.filter(a => a.status === "pending").length;
  const completedCount = myAssignments.filter(a => a.status === "completed").length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Icon icon="mdi:account-group" className="w-5 h-5 mr-2" />
          Peer Review
        </h3>
        {assignmentSettings?.peer_review_due_date && (
          <p className="text-purple-100 text-sm mt-1">
            Due: {new Date(assignmentSettings.peer_review_due_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab("to-review")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === "to-review"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            To Review
            {pendingCount > 0 && (
              <span className="ml-2 bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("my-reviews")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === "my-reviews"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            My Reviews ({completedCount})
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === "received"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Received ({reviewsOfMe.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* To Review Tab */}
        {activeTab === "to-review" && (
          <div>
            {selectedAssignment ? (
              <div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="flex items-center text-purple-600 hover:text-purple-800 mb-4"
                >
                  <Icon icon="mdi:arrow-left" className="w-4 h-4 mr-1" />
                  Back to list
                </button>

                {/* Submission to review */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {assignmentSettings?.peer_review_anonymous ? "Submission" : "Student Submission"}
                  </h4>
                  <div className="text-sm text-gray-500 mb-2">
                    Submitted: {new Date(selectedAssignment.submission.submitted_at).toLocaleString()}
                  </div>

                  {selectedAssignment.submission.content && (
                    <div className="bg-white border border-gray-200 rounded p-3 mb-3">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800">
                        {selectedAssignment.submission.content}
                      </pre>
                    </div>
                  )}

                  {selectedAssignment.submission.files && selectedAssignment.submission.files.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Attached Files:</p>
                      <ul className="space-y-1">
                        {selectedAssignment.submission.files.map((file: any, idx: number) => (
                          <li key={idx} className="flex items-center text-sm text-blue-600">
                            <Icon icon="mdi:file" className="w-4 h-4 mr-1" />
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {file.name || `File ${idx + 1}`}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Review Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Feedback
                    </label>
                    <textarea
                      value={reviewForm.feedback}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, feedback: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Provide constructive feedback on the submission..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overall Score (1-10)
                    </label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          onClick={() => setReviewForm(prev => ({ ...prev, overall_score: score }))}
                          className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                            reviewForm.overall_score === score
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => setSelectedAssignment(null)}>
                      Cancel
                    </Button>
                    <Button onClick={submitReview} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {myAssignments.filter(a => a.status === "pending").length === 0 ? (
                  <div className="text-center py-8">
                    <Icon icon="mdi:check-circle" className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">No pending reviews!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      You have completed all your peer review assignments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAssignments
                      .filter(a => a.status === "pending")
                      .map((assignment, idx) => (
                        <div
                          key={assignment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 cursor-pointer transition-colors"
                          onClick={() => setSelectedAssignment(assignment)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {assignmentSettings?.peer_review_anonymous
                                  ? `Submission #${idx + 1}`
                                  : `Peer Submission #${idx + 1}`}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Submitted: {new Date(assignment.submission.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Icon icon="mdi:chevron-right" className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* My Reviews Tab */}
        {activeTab === "my-reviews" && (
          <div>
            {myReviews.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="mdi:file-document-outline" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No reviews submitted yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Complete your pending reviews to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map((review, idx) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Review #{idx + 1}</h4>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                        Score: {review.overall_score}/10
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{review.feedback}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Received Reviews Tab */}
        {activeTab === "received" && (
          <div>
            {reviewsOfMe.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="mdi:comment-text-outline" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No reviews received yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Reviews from your peers will appear here once submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewsOfMe.map((review, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        {assignmentSettings?.peer_review_anonymous
                          ? `Peer Review #${idx + 1}`
                          : `Review from Peer #${idx + 1}`}
                      </h4>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        Score: {review.overall_score}/10
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{review.feedback}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Received: {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {reviewsOfMe.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Average Score:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {(reviewsOfMe.reduce((sum, r) => sum + (r.overall_score || 0), 0) / reviewsOfMe.length).toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
