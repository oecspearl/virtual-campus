'use client';

import React, { useState, useEffect } from 'react';
import Button from './Button';

interface Instructor {
  id: string;
  instructor_id: string;
  created_at: string;
  instructor: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface CourseInstructorManagerProps {
  courseId: string;
  isAdmin: boolean;
}

export default function CourseInstructorManager({ courseId, isAdmin }: CourseInstructorManagerProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    fetchInstructors();
    if (isAdmin) {
      fetchAvailableUsers();
    }
  }, [courseId, isAdmin]);

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/instructors`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch instructors');
      }

      const { instructors } = await response.json();
      setInstructors(instructors || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setError('Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const { users } = await response.json();
      // Filter to only show users who can be instructors and aren't already assigned
      const instructorRoles = ['instructor', 'curriculum_designer', 'admin', 'super_admin'];
      const assignedIds = instructors.map(i => i.instructor_id);
      
      const available = users.filter((user: any) => 
        instructorRoles.includes(user.role) && !assignedIds.includes(user.id)
      );
      
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleAddInstructor = async () => {
    if (!selectedUserId) return;

    try {
      const response = await fetch(`/api/courses/${courseId}/instructors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instructor_id: selectedUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add instructor');
      }

      const { instructor } = await response.json();
      setInstructors(prev => [...prev, instructor]);
      setSelectedUserId('');
      setShowAddForm(false);
      
      // Refresh available users
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error adding instructor:', error);
      setError(error instanceof Error ? error.message : 'Failed to add instructor');
    }
  };

  const handleRemoveInstructor = async (instructorId: string) => {
    if (!confirm('Are you sure you want to remove this instructor from the course?')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/instructors?instructor_id=${instructorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove instructor');
      }

      setInstructors(prev => prev.filter(i => i.instructor_id !== instructorId));
      
      // Refresh available users
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error removing instructor:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove instructor');
    }
  };

  const handleEmailInstructor = (instructorEmail: string, instructorName: string) => {
    // Create a mailto link with a pre-filled subject
    const subject = encodeURIComponent(`Question about Course - Course Inquiry`);
    const body = encodeURIComponent(`Dear ${instructorName},\n\nI hope this email finds you well. I am writing to you regarding the course and have a question or need assistance.\n\nThank you for your time.\n\nBest regards,`);
    const mailtoLink = `mailto:${instructorEmail}?subject=${subject}&body=${body}`;
    
    // Open the default email client
    window.open(mailtoLink, '_blank');
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Course Instructors</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {loading ? (
          <p className="text-gray-600">Loading instructors...</p>
        ) : (
          <div className="space-y-3">
            {instructors.length === 0 ? (
              <p className="text-gray-500">No instructors assigned to this course.</p>
            ) : (
              instructors.map((instructor) => (
                <div key={instructor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{instructor.instructor.name}</p>
                    <p className="text-sm text-gray-600">{instructor.instructor.email}</p>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-1">
                      {instructor.instructor.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEmailInstructor(instructor.instructor.email, instructor.instructor.name)}
                    className="ml-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Email instructor"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Course Instructors</h3>
        <Button 
          onClick={() => setShowAddForm(true)} 
          size="sm"
          disabled={availableUsers.length === 0}
        >
          Add Instructor
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Loading instructors...</p>
      ) : (
        <div className="space-y-3">
          {instructors.length === 0 ? (
            <p className="text-gray-500">No instructors assigned to this course.</p>
          ) : (
            instructors.map((instructor) => (
              <div key={instructor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{instructor.instructor.name}</p>
                  <p className="text-sm text-gray-600">{instructor.instructor.email}</p>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-1">
                    {instructor.instructor.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEmailInstructor(instructor.instructor.email, instructor.instructor.name)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Email instructor"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <Button 
                    onClick={() => handleRemoveInstructor(instructor.instructor_id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAddForm && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 mb-3">Add New Instructor</h4>
          
          {availableUsers.length === 0 ? (
            <p className="text-gray-500 mb-3">No available users to assign as instructors.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Instructor
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose an instructor...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={handleAddInstructor}
                  disabled={!selectedUserId}
                  size="sm"
                >
                  Add Instructor
                </Button>
                <Button 
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedUserId('');
                  }}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
