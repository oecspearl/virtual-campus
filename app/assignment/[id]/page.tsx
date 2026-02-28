"use client";

import React from "react";
import { useParams } from "next/navigation";
import FileUploadZone, { type UploadedFile } from "@/app/components/FileUploadZone";
import TextEditor from "@/app/components/TextEditor";
import Button from "@/app/components/Button";
import { Icon } from "@iconify/react";
import Breadcrumb from "@/app/components/Breadcrumb";
import PeerReviewPanel from "@/app/components/PeerReviewPanel";
import { sanitizeHtml } from "@/lib/sanitize";

export default function Page() {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;
  const [assignment, setAssignment] = React.useState<any | null>(null);
  const [submissionType, setSubmissionType] = React.useState<"file" | "text" | "url">("file");
  const [content, setContent] = React.useState<string>("");
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [mySubmission, setMySubmission] = React.useState<any | null>(null);
  const [showRubric, setShowRubric] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}`);
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          // Parse rubric if it's a string
          if (data && data.rubric && typeof data.rubric === 'string') {
            try { data.rubric = JSON.parse(data.rubric); } catch { data.rubric = []; }
          }
          setAssignment(data);
        }

        // Fetch user role
        const profileRes = await fetch('/api/auth/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData && profileData.role) {
            setUserRole(profileData.role);
          }
        }

        // Fetch student's submission
        const submissionRes = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}/submissions`);
        if (submissionRes.ok) {
          const submissionData = await submissionRes.json();
          if (submissionData && submissionData.submission) {
            setMySubmission(submissionData.submission);
            // Pre-populate the form with existing submission
            if (submissionData.submission.content) setContent(submissionData.submission.content);
            if (submissionData.submission.files) {
              try {
                const filesArray = typeof submissionData.submission.files === 'string' 
                  ? JSON.parse(submissionData.submission.files) 
                  : submissionData.submission.files;
                if (Array.isArray(filesArray)) setFiles(filesArray);
              } catch (e) {
                console.error('Error parsing files:', e);
              }
            }
            if (submissionData.submission.submission_type) setSubmissionType(submissionData.submission.submission_type);
          }
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
      } finally {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [assignmentId]);

  const isInstructor = userRole && ['instructor', 'admin', 'super_admin', 'curriculum_designer'].includes(userRole);

  async function submit(status: "draft" | "submitted") {
    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_type: submissionType, content, files, status })
      });
      if (res.ok) {
        window.location.href = `/assignment/${encodeURIComponent(assignmentId)}`;
      } else {
        const error = await res.json();
        alert(`Failed to submit: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit assignment. Please try again.');
    } finally { 
      setSaving(false); 
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Assignment...</h2>
          <p className="text-gray-600 mt-2">Please wait while we prepare your assignment.</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="material-symbols:error-outline" className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Assignment Not Found</h2>
          <p className="text-gray-600 mb-4">The assignment you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Assignments', href: '#' },
            { label: assignment?.title || 'Assignment' },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <Icon icon="material-symbols:arrow-back" className="w-4 h-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
            </div>
            {isInstructor && (
              <Button
                onClick={() => window.location.href = `/grade/assignment/${assignmentId}`}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Icon icon="material-symbols:grading" className="w-5 h-5" />
                Grade Submissions
              </Button>
            )}
          </div>
          
          {/* Assignment Meta */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Icon icon="material-symbols:schedule" className="w-4 h-4" />
              <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                Due: {dueDate ? dueDate.toLocaleString() : "No due date"}
              </span>
              {isOverdue && <span className="text-red-600 font-medium">(Overdue)</span>}
            </div>
            {assignment.points && (
              <div className="flex items-center gap-2">
                <Icon icon="material-symbols:star" className="w-4 h-4" />
                <span>{assignment.points} points</span>
              </div>
            )}
            {assignment.max_file_size && (
              <div className="flex items-center gap-2">
                <Icon icon="material-symbols:storage" className="w-4 h-4" />
                <span>Max file size: {assignment.max_file_size}MB</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Assignment Details */}
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon icon="material-symbols:description" className="w-5 h-5" />
                  Assignment Description
                </h2>
              </div>
              <div className="p-6">
                <div
                  className="prose prose-lg max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(assignment.description || "No description provided.")) }}
                />
              </div>
            </div>

            {/* View Rubric */}
            {assignment.rubric && Array.isArray(assignment.rubric) && assignment.rubric.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRubric(!showRubric)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-colors"
                >
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Icon icon="material-symbols:rubric" className="w-5 h-5" />
                    View Rubric
                  </h2>
                  <Icon
                    icon={showRubric ? "material-symbols:expand-less" : "material-symbols:expand-more"}
                    className="w-6 h-6 text-white"
                  />
                </button>
                {showRubric && (
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left text-sm font-semibold text-gray-900 p-3 border border-gray-200 w-1/5">Criteria</th>
                            {assignment.rubric[0]?.levels?.map((level: any, i: number) => (
                              <th key={i} className="text-center text-sm font-semibold text-gray-900 p-3 border border-gray-200">
                                {level.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {assignment.rubric.map((criterion: any, idx: number) => (
                            <tr key={criterion.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="text-sm font-medium text-gray-900 p-3 border border-gray-200 align-top">
                                {criterion.criteria}
                              </td>
                              {criterion.levels?.map((level: any, j: number) => (
                                <td key={j} className="text-xs text-gray-700 p-3 border border-gray-200 align-top">
                                  <div className="mb-1">
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                      {level.points} pts
                                    </span>
                                  </div>
                                  <div className="text-gray-600">{level.description}</div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-4">
                      <span>{assignment.rubric.length} criteria</span>
                      <span>Max: {assignment.rubric.reduce((sum: number, c: any) => sum + Math.max(...(c.levels?.map((l: any) => l.points) || [0])), 0)} points</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Grade and Feedback Display */}
          {mySubmission && mySubmission.status === 'graded' && mySubmission.grade !== null && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon icon="material-symbols:check-circle" className="w-6 h-6" />
                  Your Grade
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-gray-600 mb-1">Grade</div>
                    <div className="text-3xl font-bold text-green-700">{mySubmission.grade} / {assignment.points || 100}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Percentage: {Math.round((mySubmission.grade / (assignment.points || 100)) * 100)}%
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <div className="flex items-center gap-2">
                      <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-600" />
                      <span className="text-lg font-semibold text-green-700">Graded</span>
                    </div>
                    {mySubmission.graded_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(mySubmission.graded_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                {mySubmission.feedback && (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Icon icon="material-symbols:feedback" className="w-5 h-5 text-blue-600" />
                      Instructor Feedback
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">{mySubmission.feedback}</div>
                  </div>
                )}
                {mySubmission.status === 'graded' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
                    <Icon icon="material-symbols:info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      Your submission has been graded. Click "View Submission" to see your submitted work.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submission Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon icon="material-symbols:upload" className="w-5 h-5" />
                Submit Assignment
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Submission Type Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Submission Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { type: "file", label: "File Upload", icon: "material-symbols:attach-file", desc: "Upload documents, images, or other files" },
                    { type: "text", label: "Text Response", icon: "material-symbols:edit-document", desc: "Write your response using rich text editor" },
                    { type: "url", label: "Link Submission", icon: "material-symbols:link", desc: "Submit a link to your work" }
                  ].map((option) => (
                    <label 
                      key={option.type} 
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        submissionType === option.type 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="submissionType"
                        value={option.type}
                        checked={submissionType === option.type} 
                        onChange={() => setSubmissionType(option.type as any)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon icon={option.icon} className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-600">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submission Content */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Submission</h3>
                
                {submissionType === "file" && (
                  <div className="space-y-3">
                    <FileUploadZone 
                      onUploaded={(f) => setFiles((prev) => [...prev, ...f])} 
                      multiple 
                      maxSizeMB={assignment?.max_file_size ?? 50} 
                    />
                    {files.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <button
                              onClick={() => setFiles(files.filter((_, i) => i !== index))}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Icon icon="material-symbols:close" className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {submissionType === "text" && (
                  <div className="space-y-3">
                    <TextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="Write your assignment response here..."
                      height={400}
                    />
                    <div className="text-xs text-gray-500">
                      Use the rich text editor to format your response. You can add headings, lists, links, images, and more.
                    </div>
                  </div>
                )}

                {submissionType === "url" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Submission URL
                      </label>
                      <input 
                        type="url"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                        placeholder="https://example.com/your-work" 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      Make sure your link is publicly accessible and contains your completed work.
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => submit("draft")} 
                  disabled={saving}
                  className="flex items-center justify-center gap-2 flex-1"
                >
                  <Icon icon="material-symbols:save" className="w-4 h-4" />
                  {saving ? "Saving..." : "Save as Draft"}
                </Button>
                <Button 
                  onClick={() => submit("submitted")} 
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 flex-1"
                >
                  <Icon icon="material-symbols:send" className="w-4 h-4" />
                  {saving ? "Submitting..." : "Submit Assignment"}
                </Button>
              </div>

              {/* Submission Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Icon icon="material-symbols:info" className="w-4 h-4" />
                  Submission Guidelines
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Save as draft to preserve your work</li>
                  <li>• Submit when you're ready for grading</li>
                  <li>• Ensure all files are properly uploaded</li>
                  <li>• Review your submission before submitting</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Peer Review Panel - Show after submission */}
          {mySubmission && mySubmission.status === 'submitted' && assignment.peer_review_enabled && (
            <PeerReviewPanel assignmentId={assignmentId} />
          )}
        </div>
      </div>
    </div>
  );
}
