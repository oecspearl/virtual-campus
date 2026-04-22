'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

interface CourseShare {
  id: string;
  course_id: string;
  source_tenant_id: string;
  target_tenant_id: string | null;
  permission: string;
  can_enroll?: boolean;
  can_add_supplemental_content?: boolean;
  can_schedule_live_sessions?: boolean;
  can_post_grades?: boolean;
  allow_fork?: boolean;
  shared_by: string;
  title_snapshot: string;
  description_snapshot: string | null;
  thumbnail_snapshot: string | null;
  created_at: string;
  revoked_at: string | null;
  course: { id: string; title: string; published: boolean; thumbnail: string | null } | null;
  target_tenant: { id: string; name: string; slug: string } | null;
  sharer: { id: string; name: string; email: string } | null;
  enrollment_count: number;
}

interface IncomingSharedCourse {
  share_id: string;
  course_id: string;
  permission: string;
  can_enroll?: boolean;
  can_add_supplemental_content?: boolean;
  can_schedule_live_sessions?: boolean;
  can_post_grades?: boolean;
  allow_fork?: boolean;
  target_scope?: 'targeted' | 'network';
  acceptance?: {
    status: 'pending' | 'accepted' | 'declined';
    accepted_at: string | null;
    declined_at: string | null;
    decline_reason: string | null;
  };
  source_tenant: { id: string; name: string; slug: string } | null;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    difficulty: string;
    subject_area: string | null;
    estimated_duration: string | null;
    modality: string;
    lesson_count: number;
  };
  enrollment: {
    id: string;
    status: string;
    progress_percentage: number;
  } | null;
  shared_at: string;
}

interface Course {
  id: string;
  title: string;
  published: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function SharedCoursesAdminPage() {
  const [shares, setShares] = useState<CourseShare[]>([]);
  const [incomingCourses, setIncomingCourses] = useState<IncomingSharedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [showShareForm, setShowShareForm] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [formData, setFormData] = useState<{
    course_id: string;
    target_tenant_ids: string[];
    share_globally: boolean;
    can_enroll: boolean;
    can_add_supplemental_content: boolean;
    can_schedule_live_sessions: boolean;
    can_post_grades: boolean;
    allow_fork: boolean;
  }>({
    course_id: '',
    target_tenant_ids: [],
    share_globally: false,
    can_enroll: true,
    can_add_supplemental_content: false,
    can_schedule_live_sessions: false,
    can_post_grades: false,
    allow_fork: false,
  });
  const [tenantSearch, setTenantSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchShares = useCallback(async () => {
    try {
      const [outgoingRes, incomingRes] = await Promise.all([
        fetch('/api/admin/shared-courses'),
        fetch('/api/admin/shared-courses/incoming'),
      ]);
      const outgoingData = await outgoingRes.json();
      const incomingData = await incomingRes.json();
      if (outgoingData.shares) setShares(outgoingData.shares);
      if (incomingData.shares) setIncomingCourses(incomingData.shares);
    } catch (error) {
      console.error('Error fetching shares:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAccept = async (shareId: string) => {
    const res = await fetch(`/api/shared-courses/${shareId}/accept`, { method: 'POST' });
    if (res.ok) fetchShares();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Failed to accept');
    }
  };

  const handleDecline = async (shareId: string) => {
    const reason = prompt('Reason for declining (optional):') ?? '';
    const res = await fetch(`/api/shared-courses/${shareId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || undefined }),
    });
    if (res.ok) fetchShares();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Failed to decline');
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      if (data.courses) {
        setCourses(data.courses.filter((c: Course) => c.published));
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (data.tenants) setTenants(data.tenants);
    } catch (error) {
      // Tenant list may not be available for non-super_admin
      console.error('Error fetching tenants:', error);
    }
  };

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.share_globally && formData.target_tenant_ids.length === 0) {
      alert('Select at least one tenant, or check "Share with all tenants (Global)"');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/shared-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: formData.course_id,
          share_globally: formData.share_globally,
          target_tenant_ids: formData.share_globally ? [] : formData.target_tenant_ids,
          can_enroll: formData.can_enroll,
          can_add_supplemental_content: formData.can_add_supplemental_content,
          can_schedule_live_sessions: formData.can_schedule_live_sessions,
          can_post_grades: formData.can_post_grades,
          allow_fork: formData.allow_fork,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const summary = data.summary;
        if (summary && (summary.skipped > 0 || summary.failed > 0)) {
          const parts: string[] = [];
          if (summary.created > 0) parts.push(`${summary.created} shared`);
          if (summary.skipped > 0) parts.push(`${summary.skipped} already shared`);
          if (summary.failed > 0) parts.push(`${summary.failed} failed`);
          alert(parts.join(', '));
        }
        setShowShareForm(false);
        setFormData({
          course_id: '',
          target_tenant_ids: [],
          share_globally: false,
          can_enroll: true,
          can_add_supplemental_content: false,
          can_schedule_live_sessions: false,
          can_post_grades: false,
          allow_fork: false,
        });
        setTenantSearch('');
        fetchShares();
      } else {
        alert(data.error || 'Failed to share course');
      }
    } catch (error) {
      console.error('Error sharing course:', error);
      alert('Failed to share course');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTenant = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      target_tenant_ids: prev.target_tenant_ids.includes(id)
        ? prev.target_tenant_ids.filter((t) => t !== id)
        : [...prev.target_tenant_ids, id],
    }));
  };

  const toggleAllVisibleTenants = () => {
    const visibleIds = filteredTenants.map((t) => t.id);
    const allSelected = visibleIds.every((id) => formData.target_tenant_ids.includes(id));
    setFormData((prev) => ({
      ...prev,
      target_tenant_ids: allSelected
        ? prev.target_tenant_ids.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev.target_tenant_ids, ...visibleIds])),
    }));
  };

  const filteredTenants = tenants.filter((t) =>
    tenantSearch.trim() === ''
      ? true
      : `${t.name} ${t.slug}`.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const handleRevoke = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share? Existing enrollments will remain but new enrollments will be blocked.')) return;

    try {
      const res = await fetch(`/api/admin/shared-courses/${shareId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchShares();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to revoke share');
      }
    } catch (error) {
      console.error('Error revoking share:', error);
    }
  };

  const activeShares = shares.filter(s => !s.revoked_at);
  const revokedShares = shares.filter(s => s.revoked_at);

  return (
    <RoleGuard roles={['admin', 'super_admin', 'tenant_admin']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-2">Shared Courses</h1>
              <p className="text-gray-600">
                Manage course sharing across tenants
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowShareForm(true);
                fetchCourses();
                fetchTenants();
              }}
            >
              <Icon icon="mdi:share-variant-outline" className="w-4 h-4 mr-1.5" />
              Share a Course
            </Button>
          </div>

          {/* Share Form Modal */}
          <AccessibleModal
            isOpen={showShareForm}
            onClose={() => setShowShareForm(false)}
            title="Share a Course"
            size="lg"
          >
                <form onSubmit={handleShare} className="space-y-4">
                  <div>
                    <label htmlFor="share-course" className="block text-sm font-medium text-gray-700 mb-1">
                      Course to Share *
                    </label>
                    <select
                      id="share-course"
                      required
                      value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a published course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Share With
                    </label>

                    <label className="flex items-start gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.share_globally}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            share_globally: e.target.checked,
                            target_tenant_ids: e.target.checked ? [] : prev.target_tenant_ids,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          Share with all tenants (Global)
                        </span>
                        <span className="block text-xs text-gray-500">
                          Any tenant in the network will be able to discover and enroll in this course.
                        </span>
                      </span>
                    </label>

                    <div className={`mt-3 ${formData.share_globally ? 'opacity-40 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">
                          Or pick specific tenants
                          {formData.target_tenant_ids.length > 0 && (
                            <span className="ml-1.5 text-xs text-blue-600">
                              ({formData.target_tenant_ids.length} selected)
                            </span>
                          )}
                        </span>
                        {filteredTenants.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleAllVisibleTenants}
                            disabled={formData.share_globally}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {filteredTenants.every((t) => formData.target_tenant_ids.includes(t.id))
                              ? 'Clear visible'
                              : 'Select visible'}
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Search tenants..."
                        value={tenantSearch}
                        onChange={(e) => setTenantSearch(e.target.value)}
                        disabled={formData.share_globally}
                        className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />

                      <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filteredTenants.length === 0 ? (
                          <p className="p-3 text-sm text-gray-500 text-center">
                            {tenants.length === 0 ? 'No tenants available' : 'No tenants match your search'}
                          </p>
                        ) : (
                          filteredTenants.map((t) => {
                            const checked = formData.target_tenant_ids.includes(t.id);
                            return (
                              <label
                                key={t.id}
                                className={`flex items-center gap-2 p-2.5 cursor-pointer hover:bg-gray-50 ${
                                  checked ? 'bg-blue-50' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTenant(t.id)}
                                  disabled={formData.share_globally}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm text-gray-900 truncate">{t.name}</span>
                                  <span className="block text-xs text-gray-500 truncate">{t.slug}</span>
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions granted to the target institution
                    </span>
                    <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                      {([
                        ['can_enroll', 'Enrol students', 'Target-tenant students can enrol and consume the course.'],
                        ['can_add_supplemental_content', 'Supplement with local content', 'Target instructors can add lessons, resources, and announcements visible only to their students.'],
                        ['can_schedule_live_sessions', 'Schedule live sessions', 'Target instructors can schedule conferences against this course.'],
                        ['can_post_grades', 'Post grades', 'Target instructors can grade their enrolled students on your assessments.'],
                        ['allow_fork', 'Allow forking to target tenancy', 'Target admins may clone the course into their own institution, severing the live link.'],
                      ] as Array<[keyof typeof formData, string, string]>).map(([key, label, desc]) => (
                        <label key={String(key)} className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData[key])}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                            className="h-4 w-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-gray-900">{label}</span>
                            <span className="block text-xs text-gray-500">{desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Leave all unchecked to publish a read-only (view only) reference — target students can browse
                      the outline but not enrol.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Sharing...' : 'Share Course'}
                    </Button>
                    <Button variant="outline" type="button" onClick={() => setShowShareForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
          </AccessibleModal>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === 'outgoing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon icon="mdi:upload" className="w-4 h-4" />
                Shared by You ({activeShares.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === 'incoming'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon icon="mdi:download" className="w-4 h-4" />
                Available from Other Tenants ({incomingCourses.length})
              </span>
            </button>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'outgoing' ? (
            <>
              {/* Active Shares */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Active Shares ({activeShares.length})
                </h2>

                {activeShares.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <Icon icon="mdi:share-off" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No courses shared yet</p>
                    <p className="text-sm text-gray-500">
                      Share a course to allow students from other tenants to enroll
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeShares.map(share => (
                      <div key={share.id} className="bg-white rounded-lg shadow hover:shadow-md transition p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {share.course?.title || share.title_snapshot}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {share.target_tenant
                                ? `Shared with ${share.target_tenant.name}`
                                : 'Shared with all tenants'}
                            </p>
                          </div>
                          <PermissionBadges share={share} />
                        </div>

                        <div className="space-y-1 text-sm text-gray-500 mb-4">
                          <p className="flex items-center gap-1.5">
                            <Icon icon="mdi:account-group" className="w-4 h-4" />
                            {share.enrollment_count} enrollment{share.enrollment_count !== 1 ? 's' : ''}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Icon icon="mdi:calendar" className="w-4 h-4" />
                            Shared {new Date(share.created_at).toLocaleDateString()}
                          </p>
                          {share.sharer && (
                            <p className="flex items-center gap-1.5">
                              <Icon icon="mdi:account" className="w-4 h-4" />
                              By {share.sharer.name || share.sharer.email}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleRevoke(share.id)}
                          className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-1.5"
                        >
                          <Icon icon="mdi:link-off" className="w-4 h-4" />
                          Revoke Share
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Revoked Shares */}
              {revokedShares.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-500 mb-4">
                    Revoked Shares ({revokedShares.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                    {revokedShares.map(share => (
                      <div key={share.id} className="bg-white rounded-lg shadow p-5">
                        <h3 className="font-semibold text-gray-700 truncate mb-1">
                          {share.course?.title || share.title_snapshot}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {share.target_tenant
                            ? `Was shared with ${share.target_tenant.name}`
                            : 'Was shared globally'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Revoked {share.revoked_at ? new Date(share.revoked_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Incoming Courses Tab */
            <div>
              {incomingCourses.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <Icon icon="mdi:share-off" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No courses available from other tenants</p>
                  <p className="text-sm text-gray-500">
                    When other tenants share courses with you, they will appear here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {incomingCourses.map(item => (
                    <div key={item.share_id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden flex flex-col">
                      {/* Thumbnail */}
                      <div className="h-36 bg-gradient-to-br from-blue-600 to-blue-700 relative">
                        {item.course.thumbnail ? (
                          <img
                            src={item.course.thumbnail}
                            alt={item.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Icon icon="mdi:book-open-variant" className="w-12 h-12 text-white/30" />
                          </div>
                        )}
                        {item.source_tenant && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full flex items-center gap-1">
                            <Icon icon="mdi:domain" className="w-3 h-3" />
                            {item.source_tenant.name}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 text-gray-700 text-xs rounded-full font-medium capitalize">
                          {item.course.difficulty}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.course.title}</h3>
                        {item.course.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.course.description}</p>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                          {item.course.lesson_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Icon icon="mdi:file-document-outline" className="w-3.5 h-3.5" />
                              {item.course.lesson_count} lessons
                            </span>
                          )}
                        </div>

                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          <AcceptanceBadge status={item.acceptance?.status || 'pending'} />
                          {item.target_scope === 'network' && (
                            <span className="px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full">
                              Network-wide
                            </span>
                          )}
                        </div>

                        <div className="mb-2">
                          <PermissionBadges share={item} />
                        </div>

                        {item.acceptance?.status === 'declined' && item.acceptance?.decline_reason && (
                          <p className="text-xs text-red-700 italic mb-2">
                            Declined: {item.acceptance.decline_reason}
                          </p>
                        )}

                        <div className="mt-auto pt-2 space-y-2">
                          {item.acceptance?.status === 'accepted' ? (
                            <Link href={`/shared-courses/${item.share_id}`}>
                              <Button size="sm" variant="outline" className="w-full">
                                <Icon icon="mdi:eye" className="w-4 h-4 mr-1" />
                                View in catalogue
                              </Button>
                            </Link>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleAccept(item.share_id)}
                                className="px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                              >
                                <Icon icon="mdi:check" className="w-3.5 h-3.5 inline mr-1" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleDecline(item.share_id)}
                                className="px-3 py-2 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                              >
                                <Icon icon="mdi:close" className="w-3.5 h-3.5 inline mr-1" />
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">How Course Sharing Works</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Shared courses remain in your tenant — you keep full ownership and control</li>
              <li>Students from other tenants can enroll and access lesson content</li>
              <li>Enrollment data, grades, and progress are stored in each student&apos;s own tenant</li>
              <li>Revoking a share blocks new enrollments but doesn&apos;t remove existing ones</li>
              <li>Only published courses can be shared</li>
            </ul>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

function AcceptanceBadge({ status }: { status: 'pending' | 'accepted' | 'declined' }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    declined: 'bg-red-50 text-red-800 border-red-200',
  };
  return (
    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border capitalize ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

type PermissionSurface = {
  permission?: string;
  can_enroll?: boolean;
  can_add_supplemental_content?: boolean;
  can_schedule_live_sessions?: boolean;
  can_post_grades?: boolean;
  allow_fork?: boolean;
};

function PermissionBadges({ share }: { share: PermissionSurface }) {
  const canEnroll = share.can_enroll ?? share.permission === 'enroll';
  const flags: Array<[boolean, string, string]> = [
    [!!canEnroll, 'Enrol', 'bg-green-100 text-green-700'],
    [!!share.can_add_supplemental_content, 'Supplement', 'bg-indigo-100 text-indigo-700'],
    [!!share.can_schedule_live_sessions, 'Live sessions', 'bg-amber-100 text-amber-700'],
    [!!share.can_post_grades, 'Grade', 'bg-purple-100 text-purple-700'],
    [!!share.allow_fork, 'Forkable', 'bg-rose-100 text-rose-700'],
  ];
  const active = flags.filter(([on]) => on);
  if (active.length === 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        View only
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {active.map(([, label, cls]) => (
        <span key={label} className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
