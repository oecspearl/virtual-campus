"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";

interface GroupMember {
  id: string;
  student_id: string;
  role: "leader" | "member";
  joined_at: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
}

interface CourseGroup {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  max_members: number;
  allow_self_enrollment: boolean;
  created_at: string;
  course_group_members: GroupMember[];
}

interface CourseGroupsManagerProps {
  courseId: string;
  onClose?: () => void;
  /** When true, renders without outer card container and header (for embedding inside another card) */
  embedded?: boolean;
}

export default function CourseGroupsManager({ courseId, onClose, embedded = false }: CourseGroupsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [isInstructor, setIsInstructor] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CourseGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    max_members: 5,
    allow_self_enrollment: false
  });
  const [saving, setSaving] = useState(false);
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [autoAssignSize, setAutoAssignSize] = useState(4);

  useEffect(() => {
    loadGroups();
  }, [courseId]);

  async function loadGroups() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/courses/${courseId}/groups`);
      if (!res.ok) {
        throw new Error("Failed to load groups");
      }

      const data = await res.json();
      setGroups(data.groups || []);
      setIsInstructor(data.isInstructor);
    } catch (e: any) {
      console.error("Error loading groups:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!newGroup.name.trim()) {
      alert("Group name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGroup)
      });

      if (!res.ok) {
        throw new Error("Failed to create group");
      }

      setShowCreateModal(false);
      setNewGroup({ name: "", description: "", max_members: 5, allow_self_enrollment: false });
      loadGroups();
    } catch (e: any) {
      console.error("Error creating group:", e);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateGroup() {
    if (!editingGroup) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: editingGroup.id,
          name: editingGroup.name,
          description: editingGroup.description,
          max_members: editingGroup.max_members,
          allow_self_enrollment: editingGroup.allow_self_enrollment
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update group");
      }

      setEditingGroup(null);
      loadGroups();
    } catch (e: any) {
      console.error("Error updating group:", e);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("Are you sure you want to delete this group? All members will be removed.")) {
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/groups?group_id=${groupId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete group");
      }

      loadGroups();
    } catch (e: any) {
      console.error("Error deleting group:", e);
      alert(e.message);
    }
  }

  async function removeMember(groupId: string, studentId: string) {
    try {
      const res = await fetch(`/api/courses/${courseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_member",
          group_id: groupId,
          student_id: studentId
        })
      });

      if (!res.ok) {
        throw new Error("Failed to remove member");
      }

      loadGroups();
    } catch (e: any) {
      console.error("Error removing member:", e);
      alert(e.message);
    }
  }

  async function autoAssignStudents() {
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto_assign",
          group_size: autoAssignSize
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to auto-assign students");
      }

      alert(`Created ${data.groups_created} groups and assigned ${data.members_assigned} students!`);
      setShowAutoAssign(false);
      loadGroups();
    } catch (e: any) {
      console.error("Error auto-assigning:", e);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Icon icon="mdi:loading" className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading groups...</span>
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
          <Button onClick={loadGroups} className="mt-4" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalStudents = groups.reduce((sum, g) => sum + g.course_group_members.length, 0);

  const content = (
    <>
      {/* Stats line (shown in embedded mode since header is hidden) */}
      {embedded && (
        <p className="text-sm text-gray-500 mb-4">
          {groups.length} group{groups.length !== 1 ? 's' : ''}, {totalStudents} students assigned
        </p>
      )}
        {/* Actions */}
        {isInstructor && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Icon icon="mdi:plus" className="w-3.5 h-3.5 mr-1.5" />
              Create Group
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAutoAssign(true)}>
              <Icon icon="mdi:shuffle-variant" className="w-3.5 h-3.5 mr-1.5" />
              Auto-Assign
            </Button>
          </div>
        )}

        {/* Groups List */}
        {groups.length === 0 ? (
          <div className="text-center py-5 border-2 border-dashed border-gray-200 rounded-lg">
            <Icon icon="mdi:account-group-outline" className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">No Groups Created</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Create groups or auto-assign students.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{group.name}</h4>
                    {isInstructor && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit group"
                        >
                          <Icon icon="mdi:pencil" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteGroup(group.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete group"
                        >
                          <Icon icon="mdi:delete" className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{group.course_group_members.length}/{group.max_members} members</span>
                    {group.allow_self_enrollment && (
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        Self-enroll
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  {group.course_group_members.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">No members yet</p>
                  ) : (
                    <ul className="space-y-2">
                      {group.course_group_members.map((member) => (
                        <li
                          key={member.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              member.role === "leader"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {member.users?.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <span className="text-gray-900">{member.users?.name || "Unknown"}</span>
                              {member.role === "leader" && (
                                <span className="ml-1 text-xs text-amber-600">(Leader)</span>
                              )}
                            </div>
                          </div>
                          {isInstructor && (
                            <button
                              onClick={() => removeMember(group.id, member.student_id)}
                              className="text-gray-400 hover:text-red-600"
                              title="Remove member"
                            >
                              <Icon icon="mdi:close" className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Group</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Team Alpha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="Group description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Members
                </label>
                <input
                  type="number"
                  value={newGroup.max_members}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, max_members: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  min="2"
                  max="20"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newGroup.allow_self_enrollment}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, allow_self_enrollment: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Allow students to self-enroll</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={createGroup} disabled={saving}>
                {saving ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Group</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingGroup.description || ""}
                  onChange={(e) => setEditingGroup(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Members
                </label>
                <input
                  type="number"
                  value={editingGroup.max_members}
                  onChange={(e) => setEditingGroup(prev => prev ? { ...prev, max_members: Number(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  min="2"
                  max="20"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingGroup.allow_self_enrollment}
                    onChange={(e) => setEditingGroup(prev => prev ? { ...prev, allow_self_enrollment: e.target.checked } : null)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Allow students to self-enroll</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingGroup(null)}>
                Cancel
              </Button>
              <Button onClick={updateGroup} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Assign Modal */}
      {showAutoAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Auto-Assign Students</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Automatically create groups and assign unassigned students randomly.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Students per Group
                </label>
                <input
                  type="number"
                  value={autoAssignSize}
                  onChange={(e) => setAutoAssignSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  min="2"
                  max="10"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Icon icon="mdi:information" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    This will create new groups and assign students who are not already in a group.
                    Existing groups will not be affected.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAutoAssign(false)}>
                Cancel
              </Button>
              <Button onClick={autoAssignStudents} disabled={saving}>
                {saving ? "Assigning..." : "Auto-Assign"}
              </Button>
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
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Icon icon="mdi:account-group" className="w-5 h-5 mr-2" />
              Course Groups
            </h3>
            <p className="text-teal-100 text-sm mt-1">
              {groups.length} groups, {totalStudents} students assigned
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
