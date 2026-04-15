'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Filter,
  Search,
  Plus,
  Grid,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import { LearningPathCard } from '@/app/components/learning-paths';

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  difficulty?: string;
  estimated_duration?: string;
  published?: boolean;
  courses?: Array<{
    id: string;
    order: number;
    is_required: boolean;
    unlock_after_previous: boolean;
    course: {
      id: string;
      title: string;
      thumbnail?: string;
      lesson_count?: number;
    };
  }>;
  enrollment?: {
    enrolled_at: string;
    completed_at?: string;
    status: string;
    progress?: {
      total_courses: number;
      completed_courses: number;
      percentage: number;
    };
  } | null;
}

export default function LearningPathsPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [enrolledOnly, setEnrolledOnly] = useState(false);

  useEffect(() => {
    fetchPaths();
  }, []);

  const fetchPaths = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/learning-paths?published=true&include_progress=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch learning paths');
      }

      setPaths(data.paths || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (pathId: string) => {
    try {
      const response = await fetch(`/api/learning-paths/${pathId}/enroll`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to enroll');
      }

      // Refresh the paths to show updated enrollment status
      await fetchPaths();

      // Navigate to the learning path
      router.push(`/learning-paths/${pathId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enroll');
    }
  };

  // Filter paths
  const filteredPaths = paths.filter((path) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !path.title.toLowerCase().includes(query) &&
        !path.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Difficulty filter
    if (difficultyFilter !== 'all' && path.difficulty?.toLowerCase() !== difficultyFilter) {
      return false;
    }

    // Enrolled filter
    if (enrolledOnly && !path.enrollment) {
      return false;
    }

    return true;
  });

  // Separate enrolled and available paths
  const enrolledPaths = filteredPaths.filter((p) => p.enrollment);
  const availablePaths = filteredPaths.filter((p) => !p.enrollment);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-8xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-8xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight dark:text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Learning Paths
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Structured learning journeys to master new skills
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search learning paths..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters
                  ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </button>

            {/* View toggle */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrolledOnly}
                    onChange={(e) => setEnrolledOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show enrolled only
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Enrolled paths */}
        {enrolledPaths.length > 0 && !enrolledOnly && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              My Learning Paths
            </h2>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-4'
              }
            >
              {enrolledPaths.map((path) => (
                <LearningPathCard
                  key={path.id}
                  path={path}
                  variant={viewMode === 'grid' ? 'detailed' : 'compact'}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>
          </section>
        )}

        {/* Available paths */}
        {availablePaths.length > 0 && (
          <section>
            {!enrolledOnly && enrolledPaths.length > 0 && (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Explore More Paths
              </h2>
            )}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-4'
              }
            >
              {availablePaths.map((path) => (
                <LearningPathCard
                  key={path.id}
                  path={path}
                  variant={viewMode === 'grid' ? 'detailed' : 'compact'}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filteredPaths.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery || difficultyFilter !== 'all'
                ? 'No matching learning paths'
                : 'No learning paths available'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || difficultyFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Check back later for new learning paths'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
