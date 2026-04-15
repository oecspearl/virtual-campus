"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";

interface Cohort {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  section: string | null;
  term: string | null;
  max_enrollment: number | null;
  enrollment_open: boolean;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  enrollment_start: string | null;
  enrollment_end: string | null;
  status: "upcoming" | "active" | "completed" | "archived";
  is_default: boolean;
  created_at: string;
  enrollment_counts: {
    active: number;
    completed: number;
    dropped: number;
  };
  facilitators: Array<{
    cohort_id: string;
    role: string;
    users: { id: string; name: string; email: string };
  }>;
}

interface CohortMember {
  id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
  progress_percentage: number;
  completed_at: string | null;
  student_name: string;
  student_email: string;
  student_avatar: string | null;
}

interface CohortManagerProps {
  courseId: string;
  onClose?: () => void;
  /** When true, renders without outer card container and header (for embedding inside another card) */
  embedded?: boolean;
}

const STATUS_CONFIG = {
  upcoming: { label: "Upcoming", color: "bg-blue-100 text-blue-700", icon: "mdi:clock-outline" },
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: "mdi:play-circle" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700", icon: "mdi:check-circle" },
  archived: { label: "Archived", color: "bg-red-100 text-red-700", icon: "mdi:archive" },
};

export default function CohortManager({ courseId, onClose, embedded = false }: CohortManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [expandedCohort, setExpandedCohort] = useState<string | null>(null);
  const [cohortMembers, setCohortMembers] = useState<CohortMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add-students state
  const [showAddStudents, setShowAddStudents] = useState<string | null>(null); // cohortId or null
  const [unassignedStudents, setUnassignedStudents] = useState<Array<{ id: string; student_id: string; student_name: string; student_email: string }>>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    term: "",
    max_enrollment: "",
    enrollment_open: true,
    start_date: "",
    end_date: "",
    enrollment_start: "",
    enrollment_end: "",
    status: "upcoming" as Cohort["status"],
    is_default: false,
  });

  useEffect(() => {
    loadCohorts();
  }, [courseId]);

  async function loadCohorts() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/courses/${courseId}/cohorts`);
      if (!res.ok) throw new Error("Failed to load cohorts");
      const data = await res.json();
      setCohorts(data.cohorts || []);
      setIsStaff(data.isStaff);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers(cohortId: string) {
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/courses/${courseId}/cohorts/${cohortId}/members`);
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setCohortMembers(data.members || []);
    } catch (e: any) {
      console.error("Error loading members:", e);
    } finally {
      setLoadingMembers(false);
    }
  }

  function toggleExpand(cohortId: string) {
    if (expandedCohort === cohortId) {
      setExpandedCohort(null);
      setCohortMembers([]);
    } else {
      setExpandedCohort(cohortId);
      loadMembers(cohortId);
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      term: "",
      max_enrollment: "",
      enrollment_open: true,
      start_date: "",
      end_date: "",
      enrollment_start: "",
      enrollment_end: "",
      status: "upcoming",
      is_default: false,
    });
  }

  function openEditModal(cohort: Cohort) {
    setEditingCohort(cohort);
    setFormData({
      name: cohort.name,
      description: cohort.description || "",
      term: cohort.term || "",
      max_enrollment: cohort.max_enrollment?.toString() || "",
      enrollment_open: cohort.enrollment_open,
      start_date: cohort.start_date || "",
      end_date: cohort.end_date || "",
      enrollment_start: cohort.enrollment_start || "",
      enrollment_end: cohort.enrollment_end || "",
      status: cohort.status,
      is_default: cohort.is_default,
    });
  }

  async function createCohort() {
    if (!formData.name.trim()) {
      alert("Section name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/cohorts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          max_enrollment: formData.max_enrollment ? Number(formData.max_enrollment) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          enrollment_start: formData.enrollment_start || null,
          enrollment_end: formData.enrollment_end || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create cohort");
      }

      setShowCreateModal(false);
      resetForm();
      loadCohorts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateCohort() {
    if (!editingCohort) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/cohorts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohort_id: editingCohort.id,
          ...formData,
          max_enrollment: formData.max_enrollment ? Number(formData.max_enrollment) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          enrollment_start: formData.enrollment_start || null,
          enrollment_end: formData.enrollment_end || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update cohort");
      }

      setEditingCohort(null);
      resetForm();
      loadCohorts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCohort(cohortId: string) {
    if (!confirm("Are you sure? Sections with active enrollments will be archived instead of deleted.")) {
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/cohorts?cohort_id=${cohortId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete cohort");

      const data = await res.json();
      if (data.action === "archived") {
        alert("Section was archived because it has active enrollments.");
      }
      loadCohorts();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function removeFromCohort(cohortId: string, studentId: string) {
    try {
      const res = await fetch(`/api/courses/${courseId}/cohorts/${cohortId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", student_id: studentId }),
      });

      if (!res.ok) throw new Error("Failed to remove student");

      loadMembers(cohortId);
      loadCohorts();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function loadUnassignedStudents() {
    try {
      setLoadingUnassigned(true);
      // Fetch all active enrollments for this course with no section (class_id IS NULL)
      const res = await fetch(`/api/courses/${courseId}/cohorts/unassigned`);
      if (!res.ok) throw new Error("Failed to load unassigned students");
      const data = await res.json();
      setUnassignedStudents(data.students || []);
    } catch (e: any) {
      console.error("Error loading unassigned students:", e);
    } finally {
      setLoadingUnassigned(false);
    }
  }

  function openAddStudents(cohortId: string) {
    setShowAddStudents(cohortId);
    setSelectedStudents(new Set());
    setStudentSearch("");
    loadUnassignedStudents();
  }

  function toggleStudentSelection(studentId: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function selectAllFiltered(students: typeof unassignedStudents) {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      const allSelected = students.every(s => next.has(s.student_id));
      if (allSelected) {
        students.forEach(s => next.delete(s.student_id));
      } else {
        students.forEach(s => next.add(s.student_id));
      }
      return next;
    });
  }

  async function assignSelectedStudents() {
    if (!showAddStudents || selectedStudents.size === 0) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/cohorts/${showAddStudents}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_add",
          student_ids: Array.from(selectedStudents),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign students");
      }

      const data = await res.json();
      setShowAddStudents(null);
      setSelectedStudents(new Set());
      // Refresh members and cohort counts
      loadMembers(expandedCohort!);
      loadCohorts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Icon icon="mdi:loading" className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600">Loading sections...</span>
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
          <Button onClick={loadCohorts} className="mt-4" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalEnrolled = cohorts.reduce((sum, c) => sum + c.enrollment_counts.active, 0);
  const activeCohorts = cohorts.filter(c => c.status === "active").length;

  const content = (
    <>
      {/* Stats line (shown in embedded mode since header is hidden) */}
      {embedded && (
        <p className="text-sm text-gray-500 mb-4">
          {cohorts.length} section{cohorts.length !== 1 ? 's' : ''}, {activeCohorts} active, {totalEnrolled} enrolled
        </p>
      )}
        {/* Actions */}
        {isStaff && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <Icon icon="mdi:plus" className="w-3.5 h-3.5 mr-1.5" />
              Create Section
            </Button>
          </div>
        )}

        {/* Cohorts List */}
        {cohorts.length === 0 ? (
          <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-lg">
            <Icon icon="mdi:account-group-outline" className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">No Sections Created</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Create sections for different groups of students with assigned lecturers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cohorts.map((cohort) => {
              const statusCfg = STATUS_CONFIG[cohort.status] || STATUS_CONFIG.upcoming;
              const isExpanded = expandedCohort === cohort.id;

              return (
                <div key={cohort.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Cohort header row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(cohort.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        icon={isExpanded ? "mdi:chevron-down" : "mdi:chevron-right"}
                        className="w-5 h-5 text-gray-400 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900">{cohort.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                          {cohort.is_default && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>
                            {cohort.enrollment_counts.active} enrolled
                            {cohort.max_enrollment ? ` / ${cohort.max_enrollment} max` : ""}
                          </span>
                          {cohort.start_date && (
                            <span>
                              {new Date(cohort.start_date).toLocaleDateString()}
                              {cohort.end_date && ` - ${new Date(cohort.end_date).toLocaleDateString()}`}
                            </span>
                          )}
                          {cohort.term && <span>{cohort.term}</span>}
                        </div>
                      </div>
                    </div>

                    {isStaff && (
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditModal(cohort)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                          title="Edit section"
                        >
                          <Icon icon="mdi:pencil" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCohort(cohort.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          title="Delete section"
                        >
                          <Icon icon="mdi:delete" className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded: members list */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                      {cohort.facilitators.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Facilitators</p>
                          <div className="flex flex-wrap gap-2">
                            {cohort.facilitators.map((f, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                                <Icon icon="mdi:account" className="w-3 h-3" />
                                {f.users?.name || "Unknown"}
                                <span className="text-gray-400">({f.role})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-500">
                          Students ({cohort.enrollment_counts.active} active, {cohort.enrollment_counts.completed} completed, {cohort.enrollment_counts.dropped} dropped)
                        </p>
                        {isStaff && (
                          <button
                            onClick={() => openAddStudents(cohort.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors"
                          >
                            <Icon icon="mdi:account-plus" className="w-3.5 h-3.5" />
                            Add Students
                          </button>
                        )}
                      </div>

                      {loadingMembers ? (
                        <div className="flex items-center justify-center py-4">
                          <Icon icon="mdi:loading" className="w-5 h-5 animate-spin text-indigo-600" />
                          <span className="ml-2 text-sm text-gray-500">Loading members...</span>
                        </div>
                      ) : cohortMembers.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No students enrolled in this section yet.</p>
                      ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {cohortMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-100"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  {member.student_name?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-900 truncate">{member.student_name || "Unknown"}</p>
                                  <p className="text-xs text-gray-500">{member.student_email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-indigo-500 h-1.5 rounded-full"
                                      style={{ width: `${member.progress_percentage}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{member.progress_percentage}%</p>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  member.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : member.status === "completed"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}>
                                  {member.status}
                                </span>
                                {isStaff && (
                                  <button
                                    onClick={() => removeFromCohort(cohort.id, member.student_id)}
                                    className="text-gray-400 hover:text-red-600"
                                    title="Remove from section"
                                  >
                                    <Icon icon="mdi:close" className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingCohort) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCohort ? "Edit Section" : "Create New Section"}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Section A — Dr. Smith"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                  placeholder="Section description..."
                />
              </div>

              {/* Term & Max Enrollment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term / Semester</label>
                  <input
                    type="text"
                    value={formData.term}
                    onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Spring 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Enrollment</label>
                  <input
                    type="number"
                    value={formData.max_enrollment}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_enrollment: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    placeholder="No limit"
                  />
                </div>
              </div>

              {/* Section Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Enrollment Window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Opens</label>
                  <input
                    type="date"
                    value={formData.enrollment_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, enrollment_start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Closes</label>
                  <input
                    type="date"
                    value={formData.enrollment_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, enrollment_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Cohort["status"] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enrollment_open}
                    onChange={(e) => setFormData(prev => ({ ...prev, enrollment_open: e.target.checked }))}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">Enrollment open</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">Default section (auto-assign new enrollments)</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowCreateModal(false); setEditingCohort(null); resetForm(); }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingCohort ? updateCohort : createCohort}
                disabled={saving}
              >
                {saving
                  ? (editingCohort ? "Saving..." : "Creating...")
                  : (editingCohort ? "Save Changes" : "Create Section")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {showAddStudents && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Students to Section</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Showing students enrolled in this course but not assigned to any section.
                </p>
              </div>
              <button
                onClick={() => setShowAddStudents(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3">
              {loadingUnassigned ? (
                <div className="flex items-center justify-center py-8">
                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading students...</span>
                </div>
              ) : (() => {
                const filtered = unassignedStudents.filter(s => {
                  if (!studentSearch.trim()) return true;
                  const q = studentSearch.toLowerCase();
                  return (s.student_name || "").toLowerCase().includes(q)
                    || (s.student_email || "").toLowerCase().includes(q);
                });

                if (unassignedStudents.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Icon icon="mdi:account-check" className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">All enrolled students are already assigned to a section.</p>
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 text-center py-6">No students match your search.</p>
                  );
                }

                return (
                  <div className="space-y-1">
                    {/* Select all */}
                    <button
                      onClick={() => selectAllFiltered(filtered)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mb-2"
                    >
                      {filtered.every(s => selectedStudents.has(s.student_id))
                        ? `Deselect all (${filtered.length})`
                        : `Select all (${filtered.length})`}
                    </button>

                    {filtered.map((student) => {
                      const isSelected = selectedStudents.has(student.student_id);
                      return (
                        <label
                          key={student.student_id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-gray-100 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudentSelection(student.student_id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {student.student_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900 truncate">{student.student_name || "Unknown"}</p>
                            <p className="text-xs text-gray-500 truncate">{student.student_email}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAddStudents(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={assignSelectedStudents}
                  disabled={assigning || selectedStudents.size === 0}
                >
                  {assigning ? "Assigning..." : `Add ${selectedStudents.size > 0 ? selectedStudents.size : ""} Student${selectedStudents.size !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Icon icon="mdi:account-group-outline" className="w-5 h-5 mr-2" />
              Sections
            </h3>
            <p className="text-indigo-100 text-sm mt-1">
              {cohorts.length} section{cohorts.length !== 1 ? "s" : ""}, {activeCohorts} active, {totalEnrolled} students enrolled
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <Icon icon="mdi:close" className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        {content}
      </div>
    </div>
  );
}
