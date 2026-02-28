'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import RoleGuard from '@/app/components/RoleGuard';

interface Participant {
  id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
  course_id?: string;
  progress_percentage?: number;
  completed_at?: string;
  student_name?: string;
  student_email?: string;
  student_role?: string;
  student_bio?: string;
  student_avatar?: string;
  learning_preferences?: any;
  user_created_at?: string;
  profile_created_at?: string;
  updated_at?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
}

export default function CourseParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { supabase } = useSupabase();

  const [course, setCourse] = useState<Course | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, email: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [droppingAll, setDroppingAll] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      let detectedRole: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/auth/profile', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
          if (res.ok) {
            const prof = await res.json();
            detectedRole = prof?.role || null;
            setRole(detectedRole);
          }
        }
      } catch {}

      await fetchParticipants();
      // Only load available users if user can manage
      if (detectedRole && ["instructor","curriculum_designer","admin","super_admin"].includes(detectedRole)) {
        await fetchAvailableUsers();
      }
    };
    loadData();
  }, [courseId, supabase]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get auth token
      let token: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      } catch {}

      const headers: Record<string,string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Call the main endpoint (uses service client on the server)
      const response = await fetch(`/api/courses/${courseId}/participants`, { headers });
      
      if (!response.ok) {
        // Try to get error details from the response
        let errorMessage = 'Failed to fetch participants';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('API error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(`${errorMessage} (${response.status})`);
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error('Empty response from server');
      }
      
      setCourse(data.course);
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load participants';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // Get auth token
      let token: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      } catch {}

      const headers: Record<string,string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await fetch(`/api/courses/${courseId}/available-users`, { headers });
      if (!response.ok) {
        console.error('Failed to fetch available users');
        return;
      }
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.size === 0) return;

    try {
      setAddingParticipant(true);
      
      // Enroll all selected users
      const enrollmentPromises = Array.from(selectedUsers).map(async (userId) => {
        const user = availableUsers.find(u => u.id === userId);
        if (!user) return null;

        const response = await fetch(`/api/courses/${courseId}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ studentEmail: user.email }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add participant');
        }

        return response.json();
      });

      await Promise.all(enrollmentPromises);

      // Refresh participants list and available users
      await fetchParticipants();
      await fetchAvailableUsers();
      setSelectedUsers(new Set());
      setUserSearchQuery('');
      setShowAddParticipant(false);
    } catch (error) {
      console.error('Error adding participants:', error);
      setError(error instanceof Error ? error.message : 'Failed to add participants');
    } finally {
      setAddingParticipant(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = filteredAvailableUsers;
    if (selectedUsers.size === filtered.length) {
      // Deselect all
      setSelectedUsers(new Set());
    } else {
      // Select all filtered users
      setSelectedUsers(new Set(filtered.map(u => u.id)));
    }
  };

  const handleDropParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to delete ${participantName} from this course? This action cannot be undone and will permanently remove their enrollment.`)) {
      return;
    }

    try {
      setActionLoading(participantId);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/courses/${courseId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete participant');
      }

      // Refresh participants list
      await fetchParticipants();
    } catch (error) {
      console.error('Error deleting participant:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete participant');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (participantId: string, newStatus: string) => {
    try {
      setActionLoading(participantId);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/courses/${courseId}/participants/${participantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update participant status');
      }

      // Refresh participants list
      await fetchParticipants();
    } catch (error) {
      console.error('Error updating participant status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update participant status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmailParticipant = (email: string | undefined, name: string | undefined) => {
    if (!email) {
      alert('No email address available for this participant');
      return;
    }
    const participantName = name || 'Student';
    const subject = encodeURIComponent(`Course Update - ${course?.title}`);
    const body = encodeURIComponent(`Dear ${participantName},\n\nI hope this email finds you well. I am writing to you regarding your enrollment in the course "${course?.title}".\n\nPlease let me know if you have any questions.\n\nBest regards,`);
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const handleDropAllParticipants = async () => {
    const participantCount = participants.filter(p => p.status !== 'dropped').length;
    
    if (!confirm(`Are you sure you want to DELETE ALL ${participantCount} active participants from this course? This action cannot be undone and will permanently remove their enrollment.`)) {
      return;
    }

    try {
      setDroppingAll(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/courses/${courseId}/participants/drop-all`, {
        method: 'POST',
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete all participants');
      }

      // Refresh participants list
      await fetchParticipants();
      await fetchAvailableUsers();
    } catch (error) {
      console.error('Error deleting all participants:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete all participants');
    } finally {
      setDroppingAll(false);
    }
  };

  const handleEmailAllParticipants = () => {
    const emails = participants
      .map(p => p.student_email)
      .filter(email => email) // Only include participants with email addresses
      .join(',');
    
    if (!emails) {
      alert('No participants have email addresses available');
      return;
    }
    
    const subject = encodeURIComponent(`Course Update - ${course?.title}`);
    const body = encodeURIComponent(`Dear Course Participants,\n\nI hope this email finds you all well. I am writing to you regarding the course "${course?.title}".\n\nPlease let me know if you have any questions.\n\nBest regards,`);
    const mailtoLink = `mailto:${emails}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const filteredParticipants = participants.filter(participant => {
    const name = participant.student_name || 'Unknown Student';
    const email = participant.student_email || 'No email';
    const role = participant.student_role || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter available users by search query
  const filteredAvailableUsers = availableUsers.filter(user => {
    const name = user.name.toLowerCase();
    const email = user.email.toLowerCase();
    const search = userSearchQuery.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'dropped': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canManage = role && ['instructor','curriculum_designer','admin','super_admin'].includes(role);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading participants...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon icon="mdi:arrow-left" className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Course Participants</h1>
                  <p className="text-sm text-gray-600">{course?.title}</p>
                </div>
              </div>
              <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleEmailAllParticipants}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icon icon="mdi:email" className="w-4 h-4" />
                    <span>Email All</span>
                  </button>
                  {participants.filter(p => p.status !== 'dropped').length > 0 && (
                    <button
                      onClick={handleDropAllParticipants}
                      disabled={droppingAll}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {droppingAll ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon icon="mdi:account-remove" className="w-4 h-4" />
                      )}
                      <span>{droppingAll ? 'Deleting All...' : 'Delete All'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddParticipant(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Icon icon="mdi:plus" className="w-4 h-4" />
                    <span>Add Participant</span>
                  </button>
                </div>
              </RoleGuard>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <Icon icon="mdi:close" className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
                <div className="sm:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </RoleGuard>
            </div>
          </div>

          {/* Participants List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Participants ({filteredParticipants.length})
              </h3>
            </div>

            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12">
                <Icon icon="mdi:account-group" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No participants found</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'No participants have been enrolled in this course yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <div key={participant.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {participant.student_avatar ? (
                            <img
                              src={participant.student_avatar}
                              alt={participant.student_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                              <Icon icon="mdi:account" className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-gray-900 truncate">
                            {participant.student_name || 'Unknown Student'}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            {participant.student_email || 'No email available'}
                          </p>
                          {participant.student_role && (
                            <p className="text-sm text-blue-600 font-medium">
                              {participant.student_role.charAt(0).toUpperCase() + participant.student_role.slice(1)}
                            </p>
                          )}
                          {participant.student_bio && (
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {participant.student_bio}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(participant.status)}`}>
                              {participant.status}
                            </span>
                            {participant.progress_percentage !== undefined && (
                              <span className="text-sm text-gray-500">
                                Progress: {participant.progress_percentage}%
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              Enrolled: {new Date(participant.enrolled_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
                          <button
                            onClick={() => handleEmailParticipant(participant.student_email, participant.student_name)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Email participant"
                          >
                            <Icon icon="mdi:email" className="w-4 h-4" />
                          </button>
                        </RoleGuard>
                        <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
                          <select
                            value={participant.status}
                            onChange={(e) => handleUpdateStatus(participant.id, e.target.value)}
                            disabled={actionLoading === participant.id}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="suspended">Suspended</option>
                            <option value="dropped">Dropped</option>
                          </select>
                        </RoleGuard>
                        <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
                          <button
                            onClick={() => handleDropParticipant(participant.id, participant.student_name)}
                            disabled={actionLoading === participant.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete participant"
                          >
                            {actionLoading === participant.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Icon icon="mdi:account-remove" className="w-4 h-4" />
                            )}
                          </button>
                        </RoleGuard>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Participant Modal */}
        <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
        {showAddParticipant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Enroll Participants ({selectedUsers.size} selected)
                </h3>
                <button
                  onClick={() => {
                    setShowAddParticipant(false);
                    setSelectedUsers(new Set());
                    setUserSearchQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Select All */}
              <div className="mb-3 border-b pb-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <Icon 
                    icon={selectedUsers.size === filteredAvailableUsers.length ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline"} 
                    className="w-5 h-5" 
                  />
                  <span>
                    {selectedUsers.size === filteredAvailableUsers.length 
                      ? 'Deselect All' 
                      : 'Select All'}
                  </span>
                </button>
              </div>

              {/* User List */}
              <div className="flex-1 overflow-y-auto mb-4 border rounded-lg max-h-96">
                {filteredAvailableUsers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">
                      {userSearchQuery 
                        ? 'No users found matching your search.' 
                        : 'No available users to enroll. All users may already be enrolled.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredAvailableUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500 truncate">{user.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddParticipant(false);
                    setSelectedUsers(new Set());
                    setUserSearchQuery('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddParticipant}
                  disabled={addingParticipant || selectedUsers.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingParticipant 
                    ? `Adding ${selectedUsers.size} participant${selectedUsers.size > 1 ? 's' : ''}...` 
                    : `Enroll ${selectedUsers.size} participant${selectedUsers.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
        </RoleGuard>
      </div>
    </>
  );
}
