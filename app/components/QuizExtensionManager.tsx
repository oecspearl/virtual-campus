"use client";

import React from "react";
import DateTimePicker from "@/app/components/DateTimePicker";
import { Icon } from "@iconify/react";

interface Extension {
  id: string;
  quiz_id: string;
  student_id: string;
  course_id: string;
  extended_due_date: string | null;
  extended_available_until: string | null;
  extra_time_minutes: number | null;
  extra_attempts: number | null;
  reason: string | null;
  granted_by: string;
  student_name?: string;
  student_email?: string;
  created_at: string;
  updated_at: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Props {
  quizId: string;
  courseId: string;
}

const EMPTY_FORM = {
  student_id: "",
  extended_due_date: null as string | null,
  extended_available_until: null as string | null,
  extra_time_minutes: "" as string | number,
  extra_attempts: "" as string | number,
  reason: "",
};

export default function QuizExtensionManager({ quizId, courseId }: Props) {
  const [extensions, setExtensions] = React.useState<Extension[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [error, setError] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [extRes, studRes] = await Promise.all([
        fetch(`/api/quizzes/${encodeURIComponent(quizId)}/extensions`),
        fetch(`/api/courses/${encodeURIComponent(courseId)}/participants`),
      ]);

      if (extRes.ok) {
        const extData = await extRes.json();
        setExtensions(extData.extensions || []);
      }

      if (studRes.ok) {
        const studData = await studRes.json();
        const participants = studData.participants || studData.enrollments || [];
        const mapped: Student[] = participants
          .filter((p: any) => p.student_id || p.id)
          .map((p: any) => ({
            id: p.student_id || p.id,
            name: p.student_name || p.name || p.user?.name || "Unknown",
            email: p.student_email || p.email || p.user?.email || "",
          }));
        setStudents(mapped);
      }
    } catch (e) {
      console.error("Failed to load extension data:", e);
    } finally {
      setLoading(false);
    }
  }, [quizId, courseId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleEdit = (ext: Extension) => {
    setForm({
      student_id: ext.student_id,
      extended_due_date: ext.extended_due_date,
      extended_available_until: ext.extended_available_until,
      extra_time_minutes: ext.extra_time_minutes ?? "",
      extra_attempts: ext.extra_attempts ?? "",
      reason: ext.reason || "",
    });
    setEditingId(ext.id);
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!editingId && !form.student_id) {
      setError("Please select a student.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        student_id: form.student_id,
        extended_due_date: form.extended_due_date || null,
        extended_available_until: form.extended_available_until || null,
        extra_time_minutes: form.extra_time_minutes !== "" ? Number(form.extra_time_minutes) : null,
        extra_attempts: form.extra_attempts !== "" ? Number(form.extra_attempts) : null,
        reason: form.reason || null,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/extensions/${encodeURIComponent(editingId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/extensions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save extension");
        return;
      }

      resetForm();
      await fetchData();
    } catch (e: any) {
      setError(e.message || "Failed to save extension");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (extensionId: string) => {
    if (!confirm("Remove this extension? The student will revert to quiz defaults.")) return;

    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/extensions/${encodeURIComponent(extensionId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error("Failed to delete extension:", e);
    }
  };

  // Students who already have an extension
  const extendedStudentIds = new Set(extensions.map(e => e.student_id));

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Icon icon="mdi:clock-plus-outline" className="w-4 h-4 text-blue-600" />
            Student Extensions
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Grant individual students extra time, attempts, or extended deadlines.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <Icon icon="mdi:plus" className="w-3.5 h-3.5" />
            Grant Extension
          </button>
        )}
      </div>

      {/* Extension List */}
      {extensions.length === 0 && !showForm && (
        <p className="text-xs text-gray-500 text-center py-4">No extensions granted yet.</p>
      )}

      {extensions.length > 0 && (
        <div className="space-y-2 mb-4">
          {extensions.map((ext) => (
            <div key={ext.id} className="bg-white rounded-md border border-gray-200 p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-gray-900">{ext.student_name || "Unknown"}</div>
                  <div className="text-xs text-gray-500">{ext.student_email}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ext.extended_due_date && (
                      <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
                        <Icon icon="mdi:calendar-clock" className="w-3 h-3" />
                        Due: {new Date(ext.extended_due_date).toLocaleDateString()}
                      </span>
                    )}
                    {ext.extended_available_until && (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                        <Icon icon="mdi:calendar-end" className="w-3 h-3" />
                        Until: {new Date(ext.extended_available_until).toLocaleDateString()}
                      </span>
                    )}
                    {ext.extra_time_minutes != null && (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        <Icon icon="mdi:timer-plus-outline" className="w-3 h-3" />
                        +{ext.extra_time_minutes} min
                      </span>
                    )}
                    {ext.extra_attempts != null && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        <Icon icon="mdi:reload" className="w-3 h-3" />
                        +{ext.extra_attempts} attempt{ext.extra_attempts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {ext.reason && (
                    <p className="text-xs text-gray-500 mt-1 italic">{ext.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(ext)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ext.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove"
                  >
                    <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-md border border-gray-200 p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            {editingId ? "Edit Extension" : "Grant Extension"}
          </h4>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
          )}

          {/* Student Picker */}
          {!editingId && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Student</label>
              <select
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              >
                <option value="">Select a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id} disabled={extendedStudentIds.has(s.id)}>
                    {s.name} ({s.email}){extendedStudentIds.has(s.id) ? " — already has extension" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Extended Due Date</label>
              <DateTimePicker
                value={form.extended_due_date}
                onChange={(v) => setForm({ ...form, extended_due_date: v })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Extended Available Until</label>
              <DateTimePicker
                value={form.extended_available_until}
                onChange={(v) => setForm({ ...form, extended_available_until: v })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Extra Time (minutes)</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="e.g. 15"
                value={form.extra_time_minutes}
                onChange={(e) => setForm({ ...form, extra_time_minutes: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Extra Attempts</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="e.g. 1"
                value={form.extra_attempts}
                onChange={(e) => setForm({ ...form, extra_attempts: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Reason / Notes</label>
            <textarea
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="e.g. Medical accommodation, late enrollment..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update Extension" : "Save Extension"}
            </button>
            <button
              onClick={resetForm}
              className="text-xs text-gray-600 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
