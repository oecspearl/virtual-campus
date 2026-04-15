'use client';

import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { useSupabase } from '@/lib/supabase-provider';
import TextEditor from '@/app/components/editor/TextEditor';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { sanitizeHtml } from '@/lib/sanitize';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  attachment_url?: string;
  attachment_name?: string;
  scheduled_for?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

interface AnnouncementListProps {
  courseId: string;
}

export default function AnnouncementList({ courseId }: AnnouncementListProps) {
  const { user, supabase } = useSupabase();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
              const profile = await res.json();
              setUserRole(profile?.role || 'student');
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('student');
        }
      }
    };
    fetchUserRole();
  }, [user, supabase]);

  const isInstructor = userRole && ["instructor", "curriculum_designer", "admin", "super_admin"].includes(userRole);

  useEffect(() => {
    fetchAnnouncements();
  }, [courseId]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/courses/${courseId}/announcements`);
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to fetch announcements';
        const details = data.details ? `\n\n${data.details}` : '';
        throw new Error(errorMessage + details);
      }
      
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError(err.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/announcements/${announcementId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      fetchAnnouncements();
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Icon icon="material-symbols:error-outline" className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Announcements</h3>
            <p className="text-red-800 whitespace-pre-wrap mb-4">{error}</p>
            {error.includes('not found') || error.includes('migration') ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-900 text-sm">
                  <strong>Solution:</strong> Run the database migration by executing the SQL in{' '}
                  <code className="bg-yellow-100 px-2 py-1 rounded">create-announcements-schema.sql</code>{' '}
                  in your Supabase SQL Editor.
                </p>
              </div>
            ) : null}
            <Button onClick={fetchAnnouncements} className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Announcements</h2>
          <p className="text-gray-600">Stay updated with important course information</p>
        </div>
        {isInstructor && (
          <motion.button
            onClick={() => setShowCreateForm(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
          >
            <Icon icon="material-symbols:add" className="w-5 h-5" />
            Create Announcement
          </motion.button>
        )}
      </div>

      {/* Create Announcement Form */}
      {showCreateForm && (
        <CreateAnnouncementForm
          courseId={courseId}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchAnnouncements();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="material-symbols:campaign" className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
          <p className="text-gray-500 mb-4">
            {isInstructor 
              ? "Create your first announcement to keep students informed!" 
              : "Check back later for course announcements."}
          </p>
          {isInstructor && (
            <Button onClick={() => setShowCreateForm(true)}>
              Create First Announcement
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg shadow-sm border-2 ${
                announcement.is_pinned 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              } transition-all duration-200 overflow-hidden`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {announcement.is_pinned && (
                        <Icon 
                          icon="material-symbols:push-pin" 
                          className="w-5 h-5 text-blue-600" 
                        />
                      )}
                      <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:person" className="w-4 h-4" />
                        {announcement.author.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:schedule" className="w-4 h-4" />
                        {formatDate(announcement.created_at)}
                      </span>
                      {announcement.expires_at && new Date(announcement.expires_at) < new Date() && (
                        <span className="text-red-600 font-medium">Expired</span>
                      )}
                    </div>
                  </div>
                  {isInstructor && (
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete announcement"
                    >
                      <Icon icon="material-symbols:delete" className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div 
                  className="prose prose-sm max-w-none text-gray-700 mb-4"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.content) }}
                />

                {/* Attachment */}
                {announcement.attachment_url && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <a
                      href={announcement.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Icon icon="material-symbols:attach-file" className="w-5 h-5" />
                      <span className="font-medium">{announcement.attachment_name || 'Download Attachment'}</span>
                      <Icon icon="material-symbols:open-in-new" className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* Expiration notice */}
                {announcement.expires_at && new Date(announcement.expires_at) > new Date() && (
                  <div className="mt-4 text-xs text-gray-500">
                    Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create Announcement Form Component
interface CreateAnnouncementFormProps {
  courseId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateAnnouncementForm({ courseId, onSuccess, onCancel }: CreateAnnouncementFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert local datetime string to ISO format with timezone
  const localDatetimeToISO = (localDatetime: string): string | null => {
    if (!localDatetime) return null;
    // datetime-local gives us "YYYY-MM-DDTHH:mm" in local time
    // Create a Date object which will interpret it as local time
    const date = new Date(localDatetime);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    // Convert datetime values to proper ISO format
    const scheduledForISO = localDatetimeToISO(scheduledFor);
    const expiresAtISO = localDatetimeToISO(expiresAt);

    // Validate expiration date
    if (expiresAtISO) {
      const expiresDate = new Date(expiresAtISO);
      const now = new Date();

      if (expiresDate <= now) {
        setError('Expiration date must be in the future');
        return;
      }

      if (scheduledForISO && expiresDate <= new Date(scheduledForISO)) {
        setError('Expiration date must be after the scheduled date');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          is_pinned: isPinned,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
          scheduled_for: scheduledForISO,
          expires_at: expiresAtISO,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create announcement');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating announcement:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-6"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Icon icon="material-symbols:campaign" className="w-6 h-6 text-blue-600" />
        Create New Announcement
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter announcement title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Content *
          </label>
          <TextEditor
            value={content}
            onChange={setContent}
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Pin to top</span>
          </label>
        </div>

        {/* Attachment */}
        <div>
          <label htmlFor="attachmentUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Attachment URL (Optional)
          </label>
          <input
            type="url"
            id="attachmentUrl"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {attachmentUrl && (
            <input
              type="text"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              placeholder="Attachment name"
              className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>

        {/* Scheduling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 mb-2">
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              id="scheduledFor"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to publish immediately. Uses your local time.
            </p>
          </div>
          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-2">
              Expires At (Optional)
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for no expiration. Uses your local time.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Creating...' : 'Create Announcement'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

