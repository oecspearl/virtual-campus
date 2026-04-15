'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import AccessibleModal from '@/app/components/ui/AccessibleModal';
import RoleGuard from '@/app/components/RoleGuard';
import BulkUserImport from '@/app/components/user/BulkUserImport';
import BulkUserUpdate from '@/app/components/user/BulkUserUpdate';
import UserReport from '@/app/components/user/UserReport';
import InviteUserModal from '@/app/components/user/InviteUserModal';
import AdminUserEditModal from '@/app/components/user/AdminUserEditModal';
import BulkEmailModal from '@/app/components/user/BulkEmailModal';

import UserFilters, { UserFilterValues } from './_components/UserFilters';
import BulkSelectionBar from './_components/BulkSelectionBar';
import UserTable, { SortField } from './_components/UserTable';
import CourseEnrollmentsPanel from './_components/CourseEnrollmentsPanel';
import ByCourseView from './_components/ByCourseView';

interface School { id: string; name: string; }
interface User {
  id: string; email: string; name: string; role: string;
  created_at: string; updated_at: string; last_login: string | null; school_id: string | null;
}
interface Course { id: string; title: string; description: string; published: boolean; }
interface Enrollment {
  id: string; course_id: string; student_id: string;
  status: string; enrolled_at: string; courses: Course;
}

export default function UserManagementPage() {
  const { supabase } = useSupabase();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View & filter
  const [viewMode, setViewMode] = useState<'all' | 'byCourse'>('all');
  const [filters, setFilters] = useState<UserFilterValues>({ search: '', role: '', school: '', courseFilter: '' });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals & panels
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Tools dropdown & panels
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<'csvImport' | 'bulkImport' | 'bulkUpdate' | 'report' | null>(null);

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState(false);

  // Forms
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'student', password: '' });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [csvData, setCsvData] = useState('email,name,role\n');
  const [csvImporting, setCsvImporting] = useState(false);

  useEffect(() => { loadData(); }, []);

  // Close tools dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    }
    if (toolsOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [toolsOpen]);

  // Derived data
  const filteredUsers = useMemo(() => {
    let result = users;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filters.role) result = result.filter(u => u.role === filters.role);
    if (filters.school) {
      result = filters.school === '__none__'
        ? result.filter(u => !u.school_id)
        : result.filter(u => u.school_id === filters.school);
    }
    return [...result].sort((a, b) => {
      const aVal = (sortField === 'name' ? a.name : sortField === 'email' ? a.email : sortField === 'role' ? a.role : sortField === 'created_at' ? a.created_at : a.last_login)?.toLowerCase?.() || '';
      const bVal = (sortField === 'name' ? b.name : sortField === 'email' ? b.email : sortField === 'role' ? b.role : sortField === 'created_at' ? b.created_at : b.last_login)?.toLowerCase?.() || '';
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, filters.search, filters.role, filters.school, sortField, sortDirection]);

  const usersByCourse = useMemo(() => {
    const grouped: Record<string, { course: Course; users: User[]; enrollments: Enrollment[] }> = {};
    enrollments.forEach(e => {
      const user = users.find(u => u.id === e.student_id);
      if (user && e.courses) {
        if (!grouped[e.course_id]) grouped[e.course_id] = { course: e.courses, users: [], enrollments: [] };
        if (!grouped[e.course_id].users.find(u => u.id === user.id)) {
          grouped[e.course_id].users.push(user);
        }
        grouped[e.course_id].enrollments.push(e);
      }
    });
    if (filters.courseFilter) {
      return grouped[filters.courseFilter] ? { [filters.courseFilter]: grouped[filters.courseFilter] } : {};
    }
    return grouped;
  }, [enrollments, users, filters.courseFilter]);

  const usersWithoutCourse = useMemo(() => {
    const enrolledIds = new Set(enrollments.map(e => e.student_id));
    return filteredUsers.filter(u => !enrolledIds.has(u.id));
  }, [filteredUsers, enrollments]);

  const hasFilters = !!(filters.search || filters.role || filters.school);

  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    instructors: users.filter(u => u.role === 'instructor').length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
  }), [users]);

  // --- API helpers ---

  async function getToken() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('You must be logged in.');
    return session.access_token;
  }

  async function apiCall(method: string, url: string, body?: any) {
    const token = await getToken();
    const headers: any = { Authorization: `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      const text = await res.text();
      let errMsg: string;
      try { errMsg = JSON.parse(text).error || 'Request failed'; } catch { errMsg = res.status === 504 ? 'Request timed out.' : `Server error (${res.status})`; }
      throw new Error(errMsg);
    }
    return res.json();
  }

  async function loadData() {
    try {
      setLoading(true); setError('');
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, coursesRes, enrollmentsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/courses?limit=500', { headers }),
        fetch('/api/admin/enrollments', { headers }),
      ]);

      if (!usersRes.ok) throw new Error('Failed to load users');
      if (!enrollmentsRes.ok) throw new Error('Failed to load enrollments');

      const [usersData, coursesData, enrollmentsData] = await Promise.all([
        usersRes.json(), coursesRes.json(), enrollmentsRes.json(),
      ]);

      setUsers(usersData.users || []);
      setCourses(coursesData.courses || []);
      setEnrollments(enrollmentsData.enrollments || []);

      try {
        const tenantsRes = await fetch('/api/admin/tenants', { headers });
        if (tenantsRes.ok) {
          const td = await tenantsRes.json();
          setSchools((td.tenants || []).map((t: any) => ({ id: t.id, name: t.name })));
        }
      } catch {}
    } catch (err: any) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers ---

  function handleSort(field: SortField) {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(''); setSuccess('');
      await apiCall('POST', '/api/admin/users', newUser);
      setSuccess(`User ${newUser.name} created successfully!`);
      setNewUser({ email: '', name: '', role: 'student', password: '' });
      setShowAddUserModal(false);
      loadData();
    } catch (err: any) { setError(err.message); }
  }

  async function handleEnrollUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !selectedCourse) return;
    try {
      setError(''); setSuccess('');
      await apiCall('POST', '/api/admin/enrollments', { course_id: selectedCourse, student_id: selectedUser.id, status: 'active' });
      setSuccess(`${selectedUser.name} enrolled successfully!`);
      setSelectedUser(null); setSelectedCourse(''); setShowEnrollModal(false);
      loadData();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;
    try {
      setError(''); setSuccess('');
      await apiCall('DELETE', `/api/admin/users/${userId}`);
      setSuccess(`${userName} deleted successfully!`);
      loadData();
    } catch (err: any) { setError(err.message); }
  }

  async function handleUnenrollUser(enrollmentId: string, userName: string, courseTitle: string) {
    if (!confirm(`Unenroll ${userName} from ${courseTitle}?`)) return;
    try {
      setError(''); setSuccess('');
      await apiCall('PUT', `/api/admin/enrollments/${enrollmentId}`, { status: 'dropped' });
      setSuccess(`${userName} unenrolled from ${courseTitle}.`);
      loadData();
    } catch (err: any) { setError(err.message); }
  }

  async function handleSendWelcomeEmailSingle(userId: string, userName: string) {
    if (!confirm(`Send welcome email to ${userName}?`)) return;
    try {
      setError(''); setSuccess('');
      await apiCall('POST', '/api/admin/users/send-welcome-email', { userId });
      setSuccess(`Welcome email sent to ${userName}.`);
    } catch (err: any) { setError(err.message); }
  }

  async function handleBulkWelcomeEmails() {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Send welcome emails to ${selectedUsers.size} user(s)?`)) return;
    try {
      setError(''); setSuccess(''); setSendingEmails(true);
      const result = await apiCall('POST', '/api/admin/users/send-welcome-email-bulk', { userIds: Array.from(selectedUsers) });
      setSuccess(result.message || `Welcome emails sent to ${result.successful} user(s)!`);
      if (result.failed > 0) setError(`${result.failed} email(s) failed.`);
      setSelectedUsers(new Set());
      loadData();
    } catch (err: any) { setError(err.message); } finally { setSendingEmails(false); }
  }

  async function handleBulkDelete() {
    if (selectedUsers.size === 0) return;
    const count = selectedUsers.size;
    if (!confirm(`Permanently delete ${count} user(s)?`)) return;
    if (count >= 10 && !confirm(`Final confirmation: Delete ${count} users and all their data?`)) return;
    try {
      setError(''); setSuccess(''); setDeletingUsers(true);
      const result = await apiCall('POST', '/api/admin/users/bulk-delete', { userIds: Array.from(selectedUsers) });
      setSuccess(result.message || `${result.deleted} user(s) deleted!`);
      if (result.failed > 0) setError(`${result.failed} deletion(s) failed.`);
      setSelectedUsers(new Set());
      loadData();
    } catch (err: any) { setError(err.message); } finally { setDeletingUsers(false); }
  }

  async function handleBasicCsvImport() {
    try {
      setCsvImporting(true); setError(''); setSuccess('');
      await apiCall('POST', '/api/admin/users', { csv: csvData });
      setSuccess('Users imported successfully!');
      setCsvData('email,name,role\n'); setActivePanel(null);
      loadData();
    } catch (err: any) { setError(err.message); } finally { setCsvImporting(false); }
  }

  function handleTableAction(action: any) {
    switch (action.type) {
      case 'editProfile':
        setEditingUserId(action.userId); setShowProfileEditModal(true); break;
      case 'sendWelcomeEmail':
        handleSendWelcomeEmailSingle(action.userId, action.userName); break;
      case 'delete':
        handleDeleteUser(action.userId, action.userName); break;
    }
  }

  function openTool(panel: typeof activePanel) {
    setActivePanel(activePanel === panel ? null : panel);
    setToolsOpen(false);
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oecs-lime-green mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading user data...</p>
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
          <div className="container mx-auto px-4 flex items-center justify-center py-12">
            <div className="text-center bg-white rounded-lg shadow p-8 max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="material-symbols:block" className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">Admin privileges required.</p>
              <Button onClick={() => window.history.back()} className="bg-blue-600 hover:bg-blue-700">Go Back</Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 space-y-4">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                  <Icon icon="material-symbols:people" className="w-3 h-3" /> {stats.total} total
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
                  {stats.students} students
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                  {stats.instructors} instructors
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">
                  {stats.admins} admins
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => setShowAddUserModal(true)} size="sm">
                <Icon icon="material-symbols:person-add" className="w-4 h-4 mr-1.5" /> Add User
              </Button>
              <Button onClick={() => setShowInviteModal(true)} variant="outline" size="sm">
                <Icon icon="material-symbols:mail-outline" className="w-4 h-4 mr-1.5" /> Invite User
              </Button>
              <Button onClick={() => setShowEnrollModal(true)} variant="outline" size="sm">
                <Icon icon="material-symbols:school-outline" className="w-4 h-4 mr-1.5" /> Enroll
              </Button>

              {/* Import & Export dropdown */}
              <div ref={toolsRef} className="relative">
                <Button onClick={() => setToolsOpen(!toolsOpen)} variant="secondary" size="sm">
                  <Icon icon="material-symbols:folder-open-outline" className="w-4 h-4 mr-1.5" /> Import / Export
                  <Icon icon={toolsOpen ? "material-symbols:expand-less" : "material-symbols:expand-more"} className="w-4 h-4 ml-1" />
                </Button>
                {toolsOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg border border-gray-200/80 py-1 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Import Users</div>
                    <button onClick={() => openTool('bulkImport')}
                      className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                      <Icon icon="material-symbols:upload" className="w-4 h-4 text-blue-500" /> Bulk Import (CSV File)
                    </button>
                    <button onClick={() => openTool('csvImport')}
                      className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                      <Icon icon="material-symbols:content-paste" className="w-4 h-4 text-blue-500" /> Quick CSV Paste
                    </button>
                    <button onClick={() => openTool('bulkUpdate')}
                      className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                      <Icon icon="material-symbols:upload-file" className="w-4 h-4 text-blue-500" /> Bulk Update
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Export</div>
                    <button onClick={() => openTool('report')}
                      className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                      <Icon icon="material-symbols:download" className="w-4 h-4 text-green-500" /> Download User Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <Icon icon="material-symbols:error-outline" className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                <Icon icon="material-symbols:close" className="w-4 h-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Icon icon="material-symbols:check-circle-outline" className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">
                <Icon icon="material-symbols:close" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tool Panels (toggled from dropdown) */}
          {activePanel === 'csvImport' && (
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Quick CSV Paste</h3>
                <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                </button>
              </div>
              <textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm mb-3"
                placeholder="email,name,role&#10;john@example.com,John Doe,student" />
              <div className="flex items-center gap-3">
                <Button onClick={handleBasicCsvImport} disabled={csvImporting} className="bg-blue-600 hover:bg-blue-700 text-sm">
                  {csvImporting ? 'Importing...' : 'Import Users'}
                </Button>
                <span className="text-xs text-gray-500">Format: email,name,role (one per line)</span>
              </div>
            </div>
          )}

          {activePanel === 'bulkImport' && (
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Bulk Import (CSV File)</h3>
                <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                </button>
              </div>
              <BulkUserImport onImportComplete={() => { setActivePanel(null); loadData(); }} />
            </div>
          )}

          {activePanel === 'bulkUpdate' && (
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Bulk User Update</h3>
                <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                </button>
              </div>
              <BulkUserUpdate onUpdateComplete={() => { setActivePanel(null); loadData(); }} />
            </div>
          )}

          {activePanel === 'report' && (
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">User Report</h3>
                <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="material-symbols:close" className="w-5 h-5" />
                </button>
              </div>
              <UserReport onReportGenerated={() => {}} />
            </div>
          )}

          {/* Filters */}
          <UserFilters
            filters={filters}
            onFiltersChange={setFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            schools={schools}
            courses={courses}
          />

          {/* Bulk Selection Bar */}
          <BulkSelectionBar
            selectedCount={selectedUsers.size}
            sendingEmails={sendingEmails}
            deletingUsers={deletingUsers}
            onSendWelcomeEmails={handleBulkWelcomeEmails}
            onSendCustomEmail={() => setShowBulkEmailModal(true)}
            onBulkDelete={handleBulkDelete}
            onClearSelection={() => setSelectedUsers(new Set())}
          />

          {/* Main Content */}
          {viewMode === 'all' ? (
            <>
              <UserTable
                users={filteredUsers}
                totalCount={users.length}
                selectedUsers={selectedUsers}
                onToggleSelection={(id) => {
                  setSelectedUsers(prev => {
                    const next = new Set(prev);
                    next.has(id) ? next.delete(id) : next.add(id);
                    return next;
                  });
                }}
                onSelectAll={() => setSelectedUsers(new Set(filteredUsers.map(u => u.id)))}
                onClearSelection={() => setSelectedUsers(new Set())}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onAction={handleTableAction}
                schools={schools}
                hasFilters={hasFilters}
              />
              <CourseEnrollmentsPanel enrollments={enrollments} users={users} onUnenroll={handleUnenrollUser} />
            </>
          ) : (
            <ByCourseView
              usersByCourse={usersByCourse}
              usersWithoutCourse={usersWithoutCourse}
              searchQuery={filters.search}
              selectedCourseFilter={filters.courseFilter}
              onEditProfile={(userId) => { setEditingUserId(userId); setShowProfileEditModal(true); }}
              onUnenroll={handleUnenrollUser}
              onEnrollUser={(user) => { setSelectedUser(user); setShowEnrollModal(true); }}
            />
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <AccessibleModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add New User"
        size="lg"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
            <Input label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
            <Input label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
            <div>
              <label htmlFor="add-user-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select id="add-user-role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="curriculum_designer">Curriculum Designer</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAddUserModal(false)}>Cancel</Button>
            <Button type="submit" className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark">Create User</Button>
          </div>
        </form>
      </AccessibleModal>

      {/* Enroll User Modal */}
      <AccessibleModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Enroll User in Course"
        size="lg"
      >
        <form onSubmit={handleEnrollUser} className="space-y-4">
          <div>
            <label htmlFor="enroll-user" className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select id="enroll-user" value={selectedUser?.id || ''} onChange={(e) => setSelectedUser(users.find(u => u.id === e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select a user</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="enroll-course" className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select id="enroll-course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select a course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEnrollModal(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Enroll User</Button>
          </div>
        </form>
      </AccessibleModal>

      {/* Existing Modals */}
      <InviteUserModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} onInviteSuccess={loadData} />
      <AdminUserEditModal isOpen={showProfileEditModal} onClose={() => setShowProfileEditModal(false)} userId={editingUserId} onUserUpdated={loadData} />
      <BulkEmailModal
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        selectedUsers={users.filter(u => selectedUsers.has(u.id)).map(u => ({ id: u.id, name: u.name, email: u.email }))}
        onSuccess={() => { setSelectedUsers(new Set()); setSuccess('Emails sent successfully!'); }}
      />
    </RoleGuard>
  );
}
