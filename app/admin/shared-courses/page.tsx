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
  const [formData, setFormData] = useState({
    course_id: '',
    target_tenant_id: '',
    permission: 'enroll',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchShares = useCallback(async () => {
    try {
      const [outgoingRes, incomingRes] = await Promise.all([
        fetch('/api/admin/shared-courses'),
        fetch('/api/shared-courses'),
      ]);
      const outgoingData = await outgoingRes.json();
      const incomingData = await incomingRes.json();
      if (outgoingData.shares) setShares(outgoingData.shares);
      if (incomingData.courses) setIncomingCourses(incomingData.courses);
    } catch (error) {
      console.error('Error fetching shares:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/shared-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: formData.course_id,
          target_tenant_id: formData.target_tenant_id || null,
          permission: formData.permission,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowShareForm(false);
        setFormData({ course_id: '', target_tenant_id: '', permission: 'enroll' });
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
                    <label htmlFor="share-target" className="block text-sm font-medium text-gray-700 mb-1">
                      Share With
                    </label>
                    <select
                      id="share-target"
                      value={formData.target_tenant_id}
                      onChange={(e) => setFormData({ ...formData, target_tenant_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Tenants (Global)</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to share with all tenants, or select a specific one
                    </p>
                  </div>

                  <div>
                    <label htmlFor="share-permission" className="block text-sm font-medium text-gray-700 mb-1">
                      Permission
                    </label>
                    <select
                      id="share-permission"
                      value={formData.permission}
                      onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="enroll">Enroll (students can enroll and take the course)</option>
                      <option value="view_only">View Only (browse content but no enrollment)</option>
                    </select>
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
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            share.permission === 'enroll'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {share.permission === 'enroll' ? 'Enroll' : 'View Only'}
                          </span>
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
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            item.permission === 'enroll'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.permission === 'enroll' ? 'Enroll' : 'View Only'}
                          </span>
                        </div>

                        <div className="mt-auto pt-2">
                          <Link href={`/shared-courses/${item.share_id}`}>
                            <Button size="sm" variant="outline" className="w-full">
                              <Icon icon="mdi:eye" className="w-4 h-4 mr-1" />
                              View Course
                            </Button>
                          </Link>
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
