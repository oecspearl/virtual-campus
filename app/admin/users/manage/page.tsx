'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';
import { Input } from '@/app/components/Input';
import RoleGuard from '@/app/components/RoleGuard';
import BulkUserImport from '@/app/components/BulkUserImport';
import BulkUserUpdate from '@/app/components/BulkUserUpdate';
import UserReport from '@/app/components/UserReport';
import InviteUserModal from '@/app/components/InviteUserModal';
import AdminUserEditModal from '@/app/components/AdminUserEditModal';
import BulkEmailModal from '@/app/components/BulkEmailModal';
import { ALL_ROLES, UserRole } from '@/lib/rbac';
import { stripHtml } from '@/lib/utils';

interface School {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  school_id: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string;
  published: boolean;
}

interface Enrollment {
  id: string;
  course_id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
  courses: Course;
}

export default function UserManagementPage() {
  const { supabase } = useSupabase();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [editingUserId, setEditingUserId] = useState<string>('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'byCourse'>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [schoolFilter, setSchoolFilter] = useState<string>('');
  const [schools, setSchools] = useState<School[]>([]);

  // Sorting states
  type SortField = 'name' | 'email' | 'role' | 'created_at' | 'last_login';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Inline editing states
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'student' as UserRole
  });

  // Basic CSV import states
  const [showBasicCsvImport, setShowBasicCsvImport] = useState(false);
  const [csvData, setCsvData] = useState('email,name,role\n');
  const [csvImporting, setCsvImporting] = useState(false);
  
  // Bulk update state
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  
  // User report state
  const [showUserReport, setShowUserReport] = useState(false);

  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);

  // Add user form
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'student',
    password: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Filter and sort users based on search, role filter, and sort settings
  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (schoolFilter) {
      if (schoolFilter === '__none__') {
        filtered = filtered.filter(user => !user.school_id);
      } else {
        filtered = filtered.filter(user => user.school_id === schoolFilter);
      }
    }

    // Sort users
    const sorted = [...filtered].sort((a, b) => {
      let aVal: string | null = '';
      let bVal: string | null = '';

      switch (sortField) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aVal = a.email?.toLowerCase() || '';
          bVal = b.email?.toLowerCase() || '';
          break;
        case 'role':
          aVal = a.role?.toLowerCase() || '';
          bVal = b.role?.toLowerCase() || '';
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        case 'last_login':
          aVal = a.last_login || '';
          bVal = b.last_login || '';
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(sorted);
  }, [users, searchQuery, roleFilter, schoolFilter, sortField, sortDirection]);

  // Group users by course for "byCourse" view
  const usersByCourse = React.useMemo(() => {
    const grouped: { [courseId: string]: { course: Course; users: User[]; enrollments: Enrollment[] } } = {};
    
    enrollments.forEach(enrollment => {
      const courseId = enrollment.course_id;
      const user = users.find(u => u.id === enrollment.student_id);
      
      if (user && enrollment.courses) {
        if (!grouped[courseId]) {
          grouped[courseId] = {
            course: enrollment.courses,
            users: [],
            enrollments: []
          };
        }
        grouped[courseId].users.push(user);
        grouped[courseId].enrollments.push(enrollment);
      }
    });

    // Filter by selected course if filter is active
    if (selectedCourseFilter) {
      const filtered = { [selectedCourseFilter]: grouped[selectedCourseFilter] };
      return Object.keys(filtered).filter(key => filtered[key]).length > 0 ? filtered : {};
    }

    return grouped;
  }, [enrollments, users, selectedCourseFilter]);

  // Get users not enrolled in any course
  const usersWithoutCourse = React.useMemo(() => {
    const enrolledUserIds = new Set(enrollments.map(e => e.student_id));
    return filteredUsers.filter(user => !enrolledUserIds.has(user.id));
  }, [filteredUsers, enrollments]);

  // Group enrollments by course for collapsible display
  const enrollmentsByCourse = React.useMemo(() => {
    const grouped: { [courseId: string]: { course: Course; enrollments: Enrollment[] } } = {};

    enrollments.forEach(enrollment => {
      if (enrollment.courses) {
        const courseId = enrollment.course_id;
        if (!grouped[courseId]) {
          grouped[courseId] = {
            course: enrollment.courses,
            enrollments: []
          };
        }
        grouped[courseId].enrollments.push(enrollment);
      }
    });

    return grouped;
  }, [enrollments]);

  // State for expanded enrollment course sections (initially all collapsed)
  const [expandedEnrollmentCourses, setExpandedEnrollmentCourses] = useState<Set<string>>(new Set());

  const toggleEnrollmentCourse = (courseId: string) => {
    setExpandedEnrollmentCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to access this page.');
        return;
      }

      // Load users via API
      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      } else {
        throw new Error('Failed to load users');
      }

      // Load schools for filtering
      try {
        const schoolsResponse = await fetch('/api/admin/schools?includeInactive=true', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (schoolsResponse.ok) {
          const schoolsData = await schoolsResponse.json();
          setSchools(schoolsData.schools || []);
        }
      } catch (err) {
        console.error('Error loading schools:', err);
      }

      // Load all courses (admin needs to see all courses for management, not just published)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('title');

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Load enrollments via API
      const enrollmentsResponse = await fetch('/api/admin/enrollments', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json();
        setEnrollments(enrollmentsData.enrollments || []);
      } else {
        throw new Error('Failed to load enrollments');
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to create users.');
        return;
      }

      // Call our API endpoint to create user
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          password: newUser.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const result = await response.json();
      setSuccess(`User ${newUser.name} created successfully!`);
      setNewUser({ email: '', name: '', role: 'student', password: '' });
      setShowAddUserForm(false);
      loadData();

    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user. Please try again.');
    }
  };

  const handleEnrollUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedCourse) return;

    try {
      setError('');
      setSuccess('');

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to enroll users.');
        return;
      }

      // Call our API endpoint to enroll user
      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          course_id: selectedCourse,
          student_id: selectedUser.id,
          status: 'active'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enroll user');
      }

      const result = await response.json();
      setSuccess(`${selectedUser.name} enrolled successfully!`);
      setSelectedUser(null);
      setSelectedCourse('');
      setShowEnrollForm(false);
      loadData();

    } catch (err: any) {
      console.error('Error enrolling user:', err);
      setError(err.message || 'Failed to enroll user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to delete users.');
        return;
      }

      // Call our API endpoint to delete user
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      setSuccess(`${userName} deleted successfully!`);
      loadData();

    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user. Please try again.');
    }
  };

  const handleUnenrollUser = async (enrollmentId: string, userName: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to unenroll ${userName} from ${courseTitle}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to unenroll users.');
        return;
      }

      // Call our API endpoint to unenroll user
      const response = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status: 'dropped'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unenroll user');
      }

      setSuccess(`${userName} unenrolled from ${courseTitle} successfully!`);
      loadData();

    } catch (err: any) {
      console.error('Error unenrolling user:', err);
      setError(err.message || 'Failed to unenroll user. Please try again.');
    }
  };

  // Inline editing functions
  const handleEditUser = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role as UserRole
    });
  };

  const handleEditProfile = (userId: string) => {
    setEditingUserId(userId);
    setShowProfileEditModal(true);
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      setError('');
      setSuccess('');

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to edit users.');
        return;
      }

      // Call our API endpoint to update user
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      setSuccess('User updated successfully!');
      setEditingUser(null);
      loadData();

    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '', role: 'student' });
  };

  // Bulk selection handlers
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllUsers = () => {
    setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  const handleSendWelcomeEmails = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select at least one user to send welcome emails to.');
      return;
    }

    if (!confirm(`Are you sure you want to send welcome emails to ${selectedUsers.size} user(s)? This will generate new temporary passwords for each user.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setSendingEmails(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to send welcome emails.');
        return;
      }

      const response = await fetch('/api/admin/users/send-welcome-email-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send welcome emails');
      }

      const result = await response.json();
      setSuccess(result.message || `Welcome emails sent to ${result.successful} user(s) successfully!`);
      if (result.failed > 0) {
        setError(`${result.failed} email(s) failed to send. Check the console for details.`);
      }
      clearSelection();
      loadData();

    } catch (err: any) {
      console.error('Error sending welcome emails:', err);
      setError(err.message || 'Failed to send welcome emails. Please try again.');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleSendWelcomeEmailSingle = async (userId: string, userName: string) => {
    if (!confirm(`Send welcome email to ${userName}? This will generate a new temporary password.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to send welcome emails.');
        return;
      }

      const response = await fetch('/api/admin/users/send-welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send welcome email');
      }

      const result = await response.json();
      setSuccess(`Welcome email sent to ${userName} successfully!`);

    } catch (err: any) {
      console.error('Error sending welcome email:', err);
      setError(err.message || 'Failed to send welcome email. Please try again.');
    }
  };

  // Basic CSV import function
  const handleBasicCsvImport = async () => {
    try {
      setCsvImporting(true);
      setError('');
      setSuccess('');

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to import users.');
        return;
      }

      // Call our API endpoint to import CSV
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ csv: csvData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import users');
      }

      setSuccess('Users imported successfully!');
      setCsvData('email,name,role\n');
      setShowBasicCsvImport(false);
      loadData();

    } catch (err: any) {
      console.error('Error importing users:', err);
      setError(err.message || 'Failed to import users. Please try again.');
    } finally {
      setCsvImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oecs-lime-green mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading user data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard 
      roles={['admin', 'super_admin']}
      fallback={
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-center bg-white rounded-lg shadow p-8 max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon icon="material-symbols:block" className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-4">
                  You don't have permission to access this page. Admin privileges are required.
                </p>
                <Button 
                  onClick={() => window.history.back()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Manage users and course enrollments</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:search" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Search & Filter Users</h2>
                  <p className="text-sm text-gray-600">Find and filter users by name, email, or role</p>
                </div>
              </div>
              {/* View Mode Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">View:</label>
                <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'all'
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="All Users"
                  >
                    <Icon icon="material-symbols:people" className="w-4 h-4 inline mr-1" />
                    All Users
                  </button>
                  <button
                    onClick={() => setViewMode('byCourse')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'byCourse'
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="By Course"
                  >
                    <Icon icon="material-symbols:school" className="w-4 h-4 inline mr-1" />
                    By Course
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={viewMode === 'byCourse'}
                >
                  <option value="">All roles</option>
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by School</label>
                <select
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All schools</option>
                  <option value="__none__">No school assigned</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              {viewMode === 'byCourse' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Course</label>
                  <select
                    value={selectedCourseFilter}
                    onChange={(e) => setSelectedCourseFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('');
                    setSchoolFilter('');
                    setSelectedCourseFilter('');
                  }}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                >
                  <Icon icon="material-symbols:clear" className="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.size > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {selectedUsers.size} user(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSendWelcomeEmails}
                  disabled={sendingEmails}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sendingEmails ? (
                    <>
                      <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Icon icon="material-symbols:mail" className="w-4 h-4 mr-2" />
                      Send Welcome Email
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowBulkEmailModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Icon icon="material-symbols:forward-to-inbox" className="w-4 h-4 mr-2" />
                  Send Custom Email
                </Button>
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  className="border-gray-300"
                >
                  <Icon icon="material-symbols:close" className="w-4 h-4 mr-2" />
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-8 flex flex-wrap gap-4">
            <Button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Icon icon="material-symbols:mail-outline" className="w-5 h-5 mr-2" />
              Invite User
            </Button>
            <Button
              onClick={() => setShowBulkUpdate(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Icon icon="material-symbols:upload-file" className="w-5 h-5 mr-2" />
              Bulk Update
            </Button>
            <Button
              onClick={() => setShowUserReport(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Icon icon="material-symbols:download" className="w-5 h-5 mr-2" />
              Download Report
            </Button>
            <Button
              onClick={() => setShowAddUserForm(true)}
              className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark"
            >
              <Icon icon="material-symbols:person-add" className="w-5 h-5 mr-2" />
              Add New User
            </Button>
            <Button
              onClick={() => setShowEnrollForm(true)}
              variant="outline"
            >
              <Icon icon="material-symbols:school" className="w-5 h-5 mr-2" />
              Enroll User in Course
            </Button>
            <Button
              onClick={() => setShowBasicCsvImport(true)}
              variant="outline"
            >
              <Icon icon="material-symbols:upload-file" className="w-5 h-5 mr-2" />
              Basic CSV Import
            </Button>
          </div>

          {/* Basic CSV Import Form */}
          {showBasicCsvImport && (
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Icon icon="material-symbols:upload-file" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Basic CSV Import</h2>
                    <p className="text-sm text-gray-600">Paste CSV data directly (format: email,name,role)</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowBasicCsvImport(false)}
                  variant="outline"
                >
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CSV Data</label>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                    placeholder="email,name,role&#10;john@example.com,John Doe,student&#10;jane@example.com,Jane Smith,instructor"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required format: email,name,role (one per line)
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleBasicCsvImport}
                    disabled={csvImporting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {csvImporting ? (
                      <>
                        <Icon icon="material-symbols:hourglass-empty" className="w-5 h-5 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Icon icon="material-symbols:upload" className="w-5 h-5 mr-2" />
                        Import Users
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowBasicCsvImport(false)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:close" className="w-5 h-5" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Bulk Import Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:upload" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Advanced Bulk User Import</h2>
                  <p className="text-sm text-gray-600">Upload a CSV file with advanced validation and preview</p>
                </div>
              </div>
              
              <BulkUserImport onImportComplete={loadData} />
            </div>
          </div>

          {/* Bulk User Update */}
          {showBulkUpdate && (
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Icon icon="material-symbols:upload-file" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Bulk User Update</h2>
                      <p className="text-sm text-gray-600">Update multiple users at once via CSV upload</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBulkUpdate(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icon icon="material-symbols:close" className="w-6 h-6" />
                  </button>
                </div>
                
                <BulkUserUpdate onUpdateComplete={loadData} />
              </div>
            </div>
          )}

          {/* User Report */}
          {showUserReport && (
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Icon icon="material-symbols:download" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">User Report Generator</h2>
                      <p className="text-sm text-gray-600">Generate and download user data reports in CSV format</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserReport(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icon icon="material-symbols:close" className="w-6 h-6" />
                  </button>
                </div>
                
                <UserReport onReportGenerated={() => {}} />
              </div>
            </div>
          )}

          {/* Add User Form */}
          {showAddUserForm && (
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Add New User</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="curriculum_designer">Curriculum Designer</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button 
                    type="submit"
                    className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:person-add" className="w-5 h-5" />
                    Create User
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddUserForm(false)}
                    className="flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:close" className="w-5 h-5" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Enroll User Form */}
          {showEnrollForm && (
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Enroll User in Course</h2>
              <form onSubmit={handleEnrollUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <select
                      value={selectedUser?.id || ''}
                      onChange={(e) => {
                        const user = users.find(u => u.id === e.target.value);
                        setSelectedUser(user || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
                      required
                    >
                      <option value="">Select a user</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email}) - {user.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
                      required
                    >
                      <option value="">Select a course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:school" className="w-5 h-5" />
                    Enroll User
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEnrollForm(false)}
                    className="flex items-center gap-2"
                  >
                    <Icon icon="material-symbols:close" className="w-5 h-5" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Course Enrollments Section - Organized by Course */}
          {viewMode === 'all' && enrollments.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:school" className="w-6 h-6 text-indigo-600" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Course Enrollments ({enrollments.length})
                      </h2>
                    </div>
                    <span className="text-sm text-gray-500">
                      {Object.keys(enrollmentsByCourse).length} courses
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {Object.entries(enrollmentsByCourse).map(([courseId, data]) => {
                    const isExpanded = expandedEnrollmentCourses.has(courseId);
                    return (
                      <div key={courseId} className="bg-white">
                        {/* Collapsible Course Header */}
                        <button
                          onClick={() => toggleEnrollmentCourse(courseId)}
                          className="w-full px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-500" />
                              </div>
                              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icon icon="material-symbols:menu-book" className="w-4 h-4 text-white" />
                              </div>
                              <div className="text-left">
                                <h3 className="font-medium text-gray-900">{data.course.title}</h3>
                                <p className="text-sm text-gray-500">
                                  {data.enrollments.length} student{data.enrollments.length !== 1 ? 's' : ''} enrolled
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                data.course.published
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {data.course.published ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Collapsible Content - Student List */}
                        {isExpanded && (
                          <div className="px-6 pb-4">
                            <div className="ml-8 border-l-2 border-gray-200 pl-4">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="text-xs text-gray-500 uppercase">
                                    <th className="text-left py-2 pr-4">Student</th>
                                    <th className="text-left py-2 pr-4">Email</th>
                                    <th className="text-left py-2 pr-4">Status</th>
                                    <th className="text-left py-2 pr-4">Enrolled</th>
                                    <th className="text-left py-2">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {data.enrollments.map((enrollment) => {
                                    const student = users.find(u => u.id === enrollment.student_id);
                                    return (
                                      <tr key={enrollment.id} className="text-sm">
                                        <td className="py-2 pr-4 font-medium text-gray-900">
                                          {student?.name || 'Unknown User'}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-500">
                                          {student?.email || '-'}
                                        </td>
                                        <td className="py-2 pr-4">
                                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                            enrollment.status === 'active'
                                              ? 'bg-green-100 text-green-700'
                                              : enrollment.status === 'dropped'
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                          }`}>
                                            {enrollment.status}
                                          </span>
                                        </td>
                                        <td className="py-2 pr-4 text-gray-500">
                                          {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-2">
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/admin/users/${enrollment.student_id}/activity`}
                                              className="inline-flex items-center text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 text-xs px-2 py-1 rounded-md font-medium transition-colors"
                                            >
                                              <Icon icon="material-symbols:history" className="w-3 h-3 mr-1" />
                                              Activity
                                            </Link>
                                            <Button
                                              onClick={() => handleUnenrollUser(
                                                enrollment.id,
                                                student?.name || 'Unknown User',
                                                data.course.title
                                              )}
                                              variant="outline"
                                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 text-xs px-2 py-1"
                                            >
                                              <Icon icon="material-symbols:person-remove" className="w-3 h-3 mr-1" />
                                              Unenroll
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Users Display - Conditional based on view mode */}
          {viewMode === 'all' ? (
            /* All Users View */
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Users ({filteredUsers.length} of {users.length})
                  </h2>
                  {(searchQuery || roleFilter) && (
                    <div className="text-sm text-gray-500">
                      Filtered by: {searchQuery && `"${searchQuery}"`} {searchQuery && roleFilter && 'and'} {roleFilter && roleFilter.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllUsers();
                            } else {
                              clearSelection();
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === 'name' && (
                            <Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} className="w-4 h-4" />
                          )}
                          {sortField !== 'name' && <Icon icon="mdi:unfold-more-horizontal" className="w-4 h-4 text-gray-300" />}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-1">
                          Email
                          {sortField === 'email' && (
                            <Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} className="w-4 h-4" />
                          )}
                          {sortField !== 'email' && <Icon icon="mdi:unfold-more-horizontal" className="w-4 h-4 text-gray-300" />}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center gap-1">
                          Role
                          {sortField === 'role' && (
                            <Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} className="w-4 h-4" />
                          )}
                          {sortField !== 'role' && <Icon icon="mdi:unfold-more-horizontal" className="w-4 h-4 text-gray-300" />}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        School
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center gap-1">
                          Created
                          {sortField === 'created_at' && (
                            <Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} className="w-4 h-4" />
                          )}
                          {sortField !== 'created_at' && <Icon icon="mdi:unfold-more-horizontal" className="w-4 h-4 text-gray-300" />}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('last_login')}
                      >
                        <div className="flex items-center gap-1">
                          Last Login
                          {sortField === 'last_login' && (
                            <Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} className="w-4 h-4" />
                          )}
                          {sortField !== 'last_login' && <Icon icon="mdi:unfold-more-horizontal" className="w-4 h-4 text-gray-300" />}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          {searchQuery || roleFilter || schoolFilter ? 'No users match your search criteria.' : 'No users found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {editingUser === user.id ? (
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            user.name
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editingUser === user.id ? (
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            user.email
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {ALL_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' || user.role === 'super_admin' 
                                ? 'bg-red-100 text-red-800'
                                : user.role === 'instructor' || user.role === 'curriculum_designer'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.school_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-50 text-cyan-700">
                              <Icon icon="material-symbols:account-balance" className="w-3 h-3" />
                              {schools.find(s => s.id === user.school_id)?.name || 'Unknown'}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login ? (
                            <span title={new Date(user.last_login).toLocaleString()}>
                              {new Date(user.last_login).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Never</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {editingUser === user.id ? (
                              <>
                                <Button
                                  onClick={() => handleSaveEdit(user.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:check" className="w-4 h-4" />
                                  Save
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  variant="outline"
                                  className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:close" className="w-4 h-4" />
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  onClick={() => handleEditUser(user)}
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-900 border-blue-300 hover:border-blue-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:edit" className="w-4 h-4" />
                                  Quick Edit
                                </Button>
                                <Button
                                  onClick={() => handleEditProfile(user.id)}
                                  variant="outline"
                                  className="text-green-600 hover:text-green-900 border-green-300 hover:border-green-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:person" className="w-4 h-4" />
                                  Full Profile
                                </Button>
                                <Button
                                  onClick={() => handleSendWelcomeEmailSingle(user.id, user.name)}
                                  variant="outline"
                                  className="text-purple-600 hover:text-purple-900 border-purple-300 hover:border-purple-400 text-xs px-3 py-1 flex items-center gap-1"
                                  title="Send welcome email with login credentials"
                                >
                                  <Icon icon="material-symbols:mail" className="w-4 h-4" />
                                  Welcome Email
                                </Button>
                                <Button
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  variant="outline"
                                  className="text-red-600 hover:text-red-900 border-red-300 hover:border-red-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:delete" className="w-4 h-4" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            /* By Course View - Accordion Style */
            <div className="space-y-3">
              {Object.keys(usersByCourse).length === 0 && !selectedCourseFilter ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <Icon icon="material-symbols:school-outline" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Course Enrollments</h3>
                  <p className="text-gray-600">No users are enrolled in any courses yet.</p>
                </div>
              ) : (
                Object.entries(usersByCourse).map(([courseId, data]) => {
                  // Filter users by search query if active
                  let courseUsers = data.users;
                  if (searchQuery) {
                    courseUsers = courseUsers.filter(user =>
                      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  }

                  if (courseUsers.length === 0) return null;

                  const isExpanded = expandedCourses.has(courseId);
                  const toggleExpanded = () => {
                    setExpandedCourses(prev => {
                      const next = new Set(prev);
                      if (next.has(courseId)) {
                        next.delete(courseId);
                      } else {
                        next.add(courseId);
                      }
                      return next;
                    });
                  };

                  return (
                    <div key={courseId} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                      {/* Accordion Header */}
                      <button
                        onClick={toggleExpanded}
                        className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                              <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon icon="material-symbols:school" className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">{data.course.title}</h3>
                              <p className="text-sm text-gray-600 truncate">{stripHtml(data.course.description || '') || 'No description'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{courseUsers.length} {courseUsers.length === 1 ? 'student' : 'students'}</div>
                              <div className="text-xs text-gray-500">Click to {isExpanded ? 'collapse' : 'expand'}</div>
                            </div>
                            <Icon 
                              icon={isExpanded ? "material-symbols:expand-less" : "material-symbols:expand-more"} 
                              className="w-6 h-6 text-gray-600"
                            />
                          </div>
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Date</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {courseUsers.map((user) => {
                                  const enrollment = data.enrollments.find(e => e.student_id === user.id);
                                  return (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {user.name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.email}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          user.role === 'admin' || user.role === 'super_admin' 
                                            ? 'bg-red-100 text-red-800'
                                            : user.role === 'instructor' || user.role === 'curriculum_designer'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                          {user.role.replace('_', ' ')}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          enrollment?.status === 'active' 
                                            ? 'bg-green-100 text-green-800'
                                            : enrollment?.status === 'dropped'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {enrollment?.status || 'unknown'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {enrollment ? new Date(enrollment.enrolled_at).toLocaleDateString() : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.last_login ? (
                                          <span title={new Date(user.last_login).toLocaleString()}>
                                            {new Date(user.last_login).toLocaleDateString()}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 italic">Never</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => handleEditProfile(user.id)}
                                            variant="outline"
                                            className="text-blue-600 hover:text-blue-900 border-blue-300 hover:border-blue-400 text-xs px-3 py-1 flex items-center gap-1"
                                          >
                                            <Icon icon="material-symbols:person" className="w-4 h-4" />
                                            Profile
                                          </Button>
                                          <a
                                            href={`/admin/users/${user.id}/activity`}
                                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-900 border border-purple-300 hover:border-purple-400 rounded-lg transition-colors"
                                          >
                                            <Icon icon="material-symbols:history" className="w-4 h-4 mr-1" />
                                            Activity
                                          </a>
                                          {enrollment && (
                                            <Button
                                              onClick={() => handleUnenrollUser(
                                                enrollment.id,
                                                user.name,
                                                data.course.title
                                              )}
                                              variant="outline"
                                              className="text-red-600 hover:text-red-900 border-red-300 hover:border-red-400 text-xs px-3 py-1 flex items-center gap-1"
                                            >
                                              <Icon icon="material-symbols:person-remove" className="w-4 h-4" />
                                              Unenroll
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Users Not Enrolled in Any Course - Accordion Style */}
              {usersWithoutCourse.length > 0 && !selectedCourseFilter && (() => {
                const unenrolledExpanded = expandedCourses.has('unenrolled');
                const toggleUnenrolled = () => {
                  setExpandedCourses(prev => {
                    const next = new Set(prev);
                    if (next.has('unenrolled')) {
                      next.delete('unenrolled');
                    } else {
                      next.add('unenrolled');
                    }
                    return next;
                  });
                };

                return (
                  <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                    <button
                      onClick={toggleUnenrolled}
                      className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`transition-transform duration-200 ${unenrolledExpanded ? 'rotate-90' : ''}`}>
                            <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon icon="material-symbols:person-remove" className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900">Not Enrolled in Any Course</h3>
                            <p className="text-sm text-gray-600">Users who are not currently enrolled in any course</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{usersWithoutCourse.length} {usersWithoutCourse.length === 1 ? 'user' : 'users'}</div>
                            <div className="text-xs text-gray-500">Click to {unenrolledExpanded ? 'collapse' : 'expand'}</div>
                          </div>
                          <Icon 
                            icon={unenrolledExpanded ? "material-symbols:expand-less" : "material-symbols:expand-more"} 
                            className="w-6 h-6 text-gray-600"
                          />
                        </div>
                      </div>
                    </button>

                    {unenrolledExpanded && (
                      <div className="border-t border-gray-200">
                        <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {usersWithoutCourse.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' || user.role === 'super_admin' 
                                  ? 'bg-red-100 text-red-800'
                                  : user.role === 'instructor' || user.role === 'curriculum_designer'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.last_login ? (
                                <span title={new Date(user.last_login).toLocaleString()}>
                                  {new Date(user.last_login).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Never</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleEditProfile(user.id)}
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-900 border-blue-300 hover:border-blue-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:person" className="w-4 h-4" />
                                  Profile
                                </Button>
                                <a
                                  href={`/admin/users/${user.id}/activity`}
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-900 border border-purple-300 hover:border-purple-400 rounded-lg transition-colors"
                                >
                                  <Icon icon="material-symbols:history" className="w-4 h-4 mr-1" />
                                  Activity
                                </a>
                                <Button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowEnrollForm(true);
                                  }}
                                  variant="outline"
                                  className="text-green-600 hover:text-green-900 border-green-300 hover:border-green-400 text-xs px-3 py-1 flex items-center gap-1"
                                >
                                  <Icon icon="material-symbols:school" className="w-4 h-4" />
                                  Enroll
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </div>

      {/* Invite User Modal */}
      <InviteUserModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSuccess={loadData}
      />

      {/* Admin User Profile Edit Modal */}
      <AdminUserEditModal
        isOpen={showProfileEditModal}
        onClose={() => setShowProfileEditModal(false)}
        userId={editingUserId}
        onUserUpdated={loadData}
      />

      {/* Bulk Email Modal */}
      <BulkEmailModal
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        selectedUsers={users.filter(u => selectedUsers.has(u.id)).map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))}
        onSuccess={() => {
          setSelectedUsers(new Set());
          setSuccess('Emails sent successfully!');
        }}
      />
    </RoleGuard>
  );
}
