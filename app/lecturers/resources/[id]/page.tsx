'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import { hasRole } from '@/lib/rbac';
import Button from '@/app/components/Button';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  subject_area: string | null;
  grade_level: string | null;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_by_user: {
    id: string;
    name: string;
    email: string;
  };
  download_count: number;
  average_rating: number;
  rating_count: number;
  tags: string[] | null;
  is_bookmarked: boolean;
  created_at: string;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, supabase } = useSupabase();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userRating, setUserRating] = useState<{ rating: number; comment: string } | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);

  // Fetch user role
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
              setUserRole(profile?.role || user.user_metadata?.role || 'student');
              setRoleLoading(false);
              return;
            }
          }
          setUserRole(user.user_metadata?.role || 'student');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(user.user_metadata?.role || 'student');
        }
      }
      setRoleLoading(false);
    };

    fetchUserRole();
  }, [user, supabase]);

  useEffect(() => {
    if (roleLoading) return;
    
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      router.push('/dashboard');
      return;
    }

    if (userRole && hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
      fetchResource();
    }
  }, [user, userRole, roleLoading, resourceId]);

  const fetchResource = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lecturers/resources/${resourceId}`);
      if (!response.ok) throw new Error('Failed to fetch resource');
      const data = await response.json();
      setResource(data.resource);
      setRatings(data.ratings || []);

      // Check if user has already rated
      const userRatingData = data.ratings?.find((r: Rating) => r.user.id === user?.id);
      if (userRatingData) {
        setUserRating({
          rating: userRatingData.rating,
          comment: userRatingData.comment || '',
        });
      }
    } catch (err: any) {
      console.error('Error fetching resource:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;

    try {
      await fetch(`/api/lecturers/resources/${resourceId}/download`, {
        method: 'POST',
      });
      window.open(resource.file_url, '_blank');
      fetchResource(); // Refresh to update download count
    } catch (err) {
      console.error('Error downloading:', err);
    }
  };

  const handleBookmark = async () => {
    if (!resource) return;

    try {
      const endpoint = resource.is_bookmarked ? 'DELETE' : 'POST';
      await fetch(`/api/lecturers/resources/${resourceId}/bookmark`, {
        method: endpoint,
      });
      fetchResource();
    } catch (err) {
      console.error('Error bookmarking:', err);
    }
  };

  const handleRate = async (rating: number, comment: string) => {
    try {
      await fetch(`/api/lecturers/resources/${resourceId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      setShowRatingForm(false);
      fetchResource();
    } catch (err: any) {
      console.error('Error rating resource:', err);
      alert(err.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => {
          const starValue = i + 1;
          return (
            <button
              key={i}
              type={interactive ? 'button' : undefined}
              onClick={interactive && onRate ? () => onRate(starValue) : undefined}
              className={interactive ? 'hover:scale-110 transition-transform' : ''}
            >
              <Icon
                icon={starValue <= rating ? 'mdi:star' : 'mdi:star-outline'}
                className={`text-2xl ${
                  starValue <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  if (roleLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (userRole && !hasRole(userRole, ['instructor', 'curriculum_designer', 'admin', 'super_admin'])) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error || 'Resource not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/lecturers/resources')}
            className="text-[#0066CC] hover:text-[#0052A3] mb-4 flex items-center gap-2"
          >
            <Icon icon="mdi:arrow-left" />
            Back to Resources
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{resource.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>By {resource.uploaded_by_user?.name || 'Unknown'}</span>
            <span>•</span>
            <span>{formatDate(resource.created_at)}</span>
            <span>•</span>
            <span>{resource.download_count} downloads</span>
          </div>
        </div>

        {/* Resource Info Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {resource.description && (
                <p className="text-gray-700 mb-4">{resource.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Resource Type</div>
                  <div className="font-medium text-gray-900 capitalize">
                    {resource.resource_type.replace('-', ' ')}
                  </div>
                </div>
                {resource.subject_area && (
                  <div>
                    <div className="text-sm text-gray-500">Subject Area</div>
                    <div className="font-medium text-gray-900">{resource.subject_area}</div>
                  </div>
                )}
                {resource.grade_level && (
                  <div>
                    <div className="text-sm text-gray-500">Grade Level</div>
                    <div className="font-medium text-gray-900">{resource.grade_level}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500">File Size</div>
                  <div className="font-medium text-gray-900">{formatFileSize(resource.file_size)}</div>
                </div>
              </div>

              {resource.tags && resource.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {resource.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 mb-4">
                {renderStars(resource.average_rating || 0)}
                <span className="text-sm text-gray-600">
                  ({resource.rating_count} {resource.rating_count === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white"
            >
              <Icon icon="mdi:download" className="mr-2" />
              Download Resource
            </Button>
            <Button
              onClick={handleBookmark}
              className={`${
                resource.is_bookmarked
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon
                icon={resource.is_bookmarked ? 'mdi:bookmark' : 'mdi:bookmark-outline'}
                className="mr-2"
              />
              {resource.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
            </Button>
          </div>
        </div>

        {/* Ratings Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Ratings & Reviews ({resource.rating_count})
            </h2>
            {!userRating && (
              <Button
                onClick={() => setShowRatingForm(true)}
                className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
              >
                Add Rating
              </Button>
            )}
          </div>

          {userRating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-900">Your Rating</div>
                  {renderStars(userRating.rating)}
                </div>
                <Button
                  onClick={() => setShowRatingForm(true)}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm"
                >
                  Edit
                </Button>
              </div>
              {userRating.comment && (
                <p className="text-gray-700 mt-2">{userRating.comment}</p>
              )}
            </div>
          )}

          {ratings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No ratings yet. Be the first to rate this resource!
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{rating.user?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{formatDate(rating.created_at)}</div>
                    </div>
                    {renderStars(rating.rating)}
                  </div>
                  {rating.comment && (
                    <p className="text-gray-700 mt-2">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rating Form Modal */}
        {showRatingForm && (
          <RatingFormModal
            initialRating={userRating?.rating || 0}
            initialComment={userRating?.comment || ''}
            onClose={() => setShowRatingForm(false)}
            onSubmit={(rating, comment) => handleRate(rating, comment)}
          />
        )}
      </div>
    </div>
  );
}

function RatingFormModal({
  initialRating,
  initialComment,
  onClose,
  onSubmit,
}: {
  initialRating: number;
  initialComment: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);

  const renderStars = (currentRating: number, onRate: (r: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => {
          const starValue = i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onRate(starValue)}
              className="hover:scale-110 transition-transform"
            >
              <Icon
                icon={starValue <= currentRating ? 'mdi:star' : 'mdi:star-outline'}
                className={`text-3xl ${
                  starValue <= currentRating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Rate Resource</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (rating > 0) {
              onSubmit(rating, comment);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
            {renderStars(rating, setRating)}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              placeholder="Share your thoughts about this resource..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white"
              disabled={rating === 0}
            >
              Submit Rating
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

