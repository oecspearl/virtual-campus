"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import GradingPanel from "@/app/components/GradingPanel";
import PeerReviewManager from "@/app/components/PeerReviewManager";

export default function Page() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = Array.isArray(params.assignmentId) ? params.assignmentId[0] : params.assignmentId;
  const [assignment, setAssignment] = React.useState<any | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [submissions, setSubmissions] = React.useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showPeerReviewManager, setShowPeerReviewManager] = React.useState(false);

  async function load() {
    if (!assignmentId) {
      setError("Assignment ID is missing");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res1 = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}`);
      if (!res1.ok) {
        setError(`Failed to load assignment: ${res1.status}`);
        return;
      }
      const a = await res1.json();
      setAssignment(a);
      
      const res2 = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}/submissions?all=1`);
      if (!res2.ok) {
        setError(`Failed to load submissions: ${res2.status}`);
        return;
      }
      const s = await res2.json();
      
      // Ensure submissions is always an array
      const submissionsArray = Array.isArray(s.submissions) ? s.submissions : (s.submissions ? [s.submissions] : []);
      setSubmissions(submissionsArray);
      
      if (!activeId && submissionsArray.length) {
        setActiveId(submissionsArray[0].id as string);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Error loading data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [assignmentId]);

  const active = submissions.find((s) => s.id === activeId) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:loading" className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading grading interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center mb-2">
                    <Icon icon="mdi:grading" className="w-8 h-8 mr-3" />
                    Grade Assignment
                  </h1>
                  {assignment && (
                    <p className="text-purple-100 text-lg">{assignment.title || 'Untitled Assignment'}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {assignment?.peer_review_enabled && (
                    <button
                      onClick={() => setShowPeerReviewManager(!showPeerReviewManager)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        showPeerReviewManager
                          ? 'bg-white text-purple-700'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <Icon icon="mdi:account-group" className="w-5 h-5" />
                      Peer Reviews
                    </button>
                  )}
                  <div className="bg-white/10 rounded-lg px-4 py-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{submissions.length}</div>
                      <div className="text-xs text-purple-100">Submissions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <Icon icon="mdi:alert-circle" className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-lg mb-2">Error Loading Data</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button 
                  onClick={load}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  <Icon icon="mdi:refresh" className="w-4 h-4 inline mr-2" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Peer Review Manager Panel */}
        {showPeerReviewManager && assignment?.peer_review_enabled && assignmentId && (
          <div className="mb-6">
            <PeerReviewManager
              assignmentId={assignmentId}
              onClose={() => setShowPeerReviewManager(false)}
            />
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Submissions List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden h-full">
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Icon icon="mdi:clipboard-list" className="w-5 h-5" />
                    Submissions ({submissions.length})
                  </h3>
                </div>
                <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {submissions.length === 0 ? (
                    <div className="text-center py-8">
                      <Icon icon="mdi:inbox-outline" className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No submissions yet</p>
                    </div>
                  ) : (
                    submissions.map((s) => {
                      const isActive = activeId === s.id;
                      return (
                        <button 
                          key={s.id} 
                          className={`w-full rounded-lg p-3 text-left transition-all duration-200 ${
                            isActive 
                              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg" 
                              : "bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200"
                          }`} 
                          onClick={() => setActiveId(s.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon icon="mdi:account" className="w-4 h-4" />
                              <span className="text-xs font-mono">
                                {s.student_id?.slice(0, 8)}...
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isActive 
                                ? 'bg-white/20 text-white' 
                                : s.status === 'graded' 
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                            }`}>
                              {s.status}
                            </span>
                          </div>
                          {s.submitted_at && (
                            <div className={`text-xs flex items-center gap-1 ${
                              isActive ? 'text-purple-100' : 'text-gray-500'
                            }`}>
                              <Icon icon="mdi:clock-outline" className="w-3 h-3" />
                              {new Date(s.submitted_at).toLocaleDateString()}
                            </div>
                          )}
                          {s.grade !== null && s.grade !== undefined && (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <div className="text-xs opacity-75">Current Grade</div>
                              <div className="text-lg font-bold">{s.grade}/100</div>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Grading Area */}
            <div className="lg:col-span-3">
              {active && assignment && assignmentId ? (
                <GradingPanel 
                  assignmentId={assignmentId} 
                  submission={active} 
                  onGraded={load} 
                />
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
                  <div className="text-center">
                    <Icon icon="mdi:hand-pointing-up" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Submission</h3>
                    <p className="text-gray-600 mb-4">
                      {!assignment 
                        ? "Assignment data not loaded." 
                        : submissions.length === 0 
                          ? "No submissions available to grade yet."
                          : "Choose a submission from the left sidebar to begin grading."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
