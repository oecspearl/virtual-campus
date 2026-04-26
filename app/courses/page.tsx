'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import { useSupabase } from '@/lib/supabase-provider';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import { stripHtml } from '@/lib/utils';

// Helper function to format modality display
const formatModality = (modality?: string): string => {
  switch (modality) {
    case 'self_paced': return 'Self-paced';
    case 'blended': return 'Blended';
    case 'instructor_led': return 'Instructor-led';
    default: return 'Self-paced';
  }
};

// Helper function to get modality MDI icon name
const getModalityIcon = (modality?: string): string => {
  switch (modality) {
    case 'self_paced': return 'mdi:book-open-page-variant-outline';
    case 'blended': return 'mdi:swap-horizontal';
    case 'instructor_led': return 'mdi:account-tie-outline';
    default: return 'mdi:book-open-page-variant-outline';
  }
};

// Difficulty colour for the indicator dot
const getDifficultyDotClass = (difficulty?: string): string => {
  switch (difficulty) {
    case 'beginner': return 'bg-emerald-500';
    case 'intermediate': return 'bg-amber-500';
    case 'advanced': return 'bg-rose-500';
    default: return 'bg-slate-400';
  }
};

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  course_count: number;
  children?: Category[];
  parent_id?: string | null;
}

export default function CoursesPage() {
  const { supabase } = useSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = React.useState<Array<any>>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [q, setQ] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState<string>('guest');
  const [accessType, setAccessType] = React.useState<string>('published_only');

  const loadCategories = React.useCallback(async () => {
    try {
      const res = await fetch('/api/categories?flat=true&withCounts=true');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (difficulty) params.set('difficulty', difficulty);
      if (selectedCategory) params.set('category', selectedCategory);

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/courses?${params.toString()}`, {
        cache: 'no-store',
        headers
      });
      const data = await res.json();
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setUserRole(data.userRole || 'guest');
      setAccessType(data.accessType || 'published_only');
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [difficulty, selectedCategory, supabase]);

  React.useEffect(() => { loadCategories(); }, [loadCategories]);
  React.useEffect(() => { load(); }, [load]);

  const filtered = courses.filter((c) => {
    const s = q.toLowerCase();
    return !s || String(c.title||'').toLowerCase().includes(s) || stripHtml(c.description||'').toLowerCase().includes(s);
  });

  const getAccessDescription = () => {
    switch (accessType) {
      case 'all':
        return 'You have access to all courses in the system';
      case 'teaching_and_published':
        return 'You can see courses you teach and all published courses';
      case 'enrolled_and_published':
        return 'You can see courses you\'re enrolled in and all published courses';
      case 'published_only':
      default:
        return 'You can see all published courses';
    }
  };

  const getAccessIcon = () => {
    switch (accessType) {
      case 'all':
        return 'material-symbols:admin-panel-settings';
      case 'teaching_and_published':
        return 'material-symbols:school';
      case 'enrolled_and_published':
        return 'material-symbols:person';
      case 'published_only':
      default:
        return 'material-symbols:public';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses' },
          ]}
          className="mb-4"
        />
      </div>
      {/* Hero Section */}
      <div 
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary), var(--theme-accent))`
        }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, var(--theme-primary)E6, var(--theme-secondary)E6, var(--theme-accent)E6)`
          }}
        ></div>
        <div className="relative mx-auto max-w-8xl px-4 py-16 lg:py-24">
          <div className="max-w-4xl">
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
              Explore Courses
            </h1>
            <p 
              className="text-xl mb-8 max-w-3xl leading-relaxed"
              style={{ color: 'rgba(255, 255, 255, 0.9)' }}
            >
              Discover comprehensive learning experiences designed for Caribbean students. 
              Find the perfect course to advance your education journey.
            </p>
            
            {/* Access Information */}
            <div className="mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <Icon icon={getAccessIcon()} className="w-5 h-5 text-yellow-300" />
                <span className="font-semibold text-white">Your Access Level</span>
              </div>
              <p 
                className="text-sm"
                style={{ color: 'rgba(255, 255, 255, 0.8)' }}
              >{getAccessDescription()}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div 
                className="flex items-center flex-wrap gap-4 sm:gap-8"
                style={{ color: 'rgba(255, 255, 255, 0.8)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="font-medium">{filtered.length} courses available</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
                  <span className="font-medium">Self-paced learning</span>
                </div>
              </div>
              <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
                <Link href="/courses/create" className="inline-flex items-center px-4 py-2 bg-white rounded-lg font-bold hover:bg-gray-50 transition-all duration-200" style={{ color: 'var(--theme-primary)' }}>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Course
                </Link>
              </RoleGuard>
            </div>
          </div>
          
          {/* Enhanced Search & Filters */}
          <div className="mt-12 bg-white/95 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 lg:p-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-lg font-bold text-gray-900 mb-4">
                  <svg className="w-5 h-5 inline mr-3" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Courses
                </label>
                <input
                  value={q}
                  onChange={(e)=>setQ(e.target.value)}
                  placeholder="Search by title, description, or keywords..."
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-gray-300/40 focus:border-gray-400 transition-all duration-200 text-lg shadow-sm"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-lg font-bold text-gray-900 mb-4">
                  <Icon icon="material-symbols:folder" className="w-5 h-5 inline mr-3 text-green-600" />
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e)=>setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 text-lg shadow-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parent_id ? '└ ' : ''}{cat.name} ({cat.course_count})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-4">
                  <svg className="w-5 h-5 inline mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e)=>setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-purple-500 transition-all duration-200 text-lg shadow-sm"
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-8xl px-4 py-12 lg:py-16">
        {/* Results Header */}
        {!loading && filtered.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-normal text-slate-900 tracking-tight">
                    {q ? `Search Results for "${q}"` : 'Available Courses'}
                  </h2>
                  <p className="text-gray-600 mt-2 text-lg">
                    {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
                    {difficulty && ` • ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} level`}
                    {accessType !== 'all' && ` • ${getAccessDescription().toLowerCase()}`}
                  </p>
                </div>
                <div className="flex items-center flex-wrap gap-2 sm:gap-4">
                  <span className="inline-flex items-center gap-3 px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    Live courses
                  </span>
                  <span className="inline-flex items-center gap-3 px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Self-paced
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center bg-white rounded-lg border border-gray-100 p-12 max-w-md">
              <div className="relative mb-6">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200" style={{ borderTopColor: 'var(--theme-primary)' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Loading Courses</h3>
              <p className="text-gray-600">Please wait while we fetch the latest courses</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center bg-white rounded-lg border border-gray-100 p-12 max-w-lg">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
                <svg className="w-10 h-10" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {q ? 'No courses match your search' : 'No courses available yet'}
              </h3>
              <p className="text-gray-600 mb-8">
                {q 
                  ? `We couldn't find any courses matching "${q}". Try adjusting your search terms or filters.`
                  : 'Be the first to create a course and start building our learning community!'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {q && (
                  <button 
                    onClick={() => setQ('')}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Clear Search
                  </button>
                )}
                <RoleGuard roles={["instructor","curriculum_designer","admin","super_admin"]}>
                  <Link 
                    href="/courses/create" 
                    className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-all duration-200 font-medium shadow-lg "
                  >
                    Create First Course
                  </Link>
                </RoleGuard>
              </div>
            </div>
          </div>
        )}

        {/* Course Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filtered.map((c, idx) => (
              <motion.div 
                key={c.id} 
                initial={{opacity:0,y:30}} 
                whileInView={{opacity:1,y:0}} 
                viewport={{once:true}} 
                transition={{duration:0.5, delay: idx*0.1}} 
                className="group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                {/* Course Image */}
                <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {c.thumbnail ? (
                    <Image
                      src={c.thumbnail}
                      alt={c.title || 'Course thumbnail'}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))' }}>
                      <svg className="w-20 h-20 text-white group- transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Difficulty Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-sm px-4 py-2 text-sm font-bold text-gray-800 shadow-lg">
                      <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${getDifficultyDotClass(c.difficulty)}`} />
                      <span className="capitalize">{c.difficulty || 'All Levels'}</span>
                    </span>
                  </div>

                  {/* Modality & Duration Badge */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full backdrop-blur-sm px-4 py-2 text-sm font-bold text-white shadow-lg" style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}>
                      <Icon icon={getModalityIcon(c.modality)} className="h-4 w-4" aria-hidden />
                      {formatModality(c.modality)}
                    </span>
                    {c.estimated_duration && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 backdrop-blur-sm px-4 py-2 text-sm font-bold text-white shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {c.estimated_duration}
                      </span>
                    )}
                  </div>

                  {/* Access Type Badge */}
                  {(accessType === 'teaching_and_published' || accessType === 'enrolled_and_published') && (
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white shadow-lg">
                        <Icon icon={accessType === 'teaching_and_published' ? 'material-symbols:school' : 'material-symbols:person'} className="w-3 h-3" />
                        {accessType === 'teaching_and_published' ? 'Teaching' : 'Enrolled'}
                      </span>
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Course Content */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 line-clamp-2 mb-3 group-hover:text-[var(--theme-primary)] transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-gray-600 line-clamp-3 mb-6 leading-relaxed text-base">
                    {stripHtml(c.description || '')}
                  </p>
                  
                  {/* Course Meta */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Available Now</span>
                      </div>
                      <Link 
                        href={`/course/${c.id}`} 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-all duration-200 font-bold text-sm group-"
                      >
                        <span>View Course</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                    
                    {/* Gradebook Links for Instructors */}
                    <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                      <div className="flex gap-3">
                        <Link 
                          href={`/courses/${c.id}/gradebook`}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-semibold text-sm border"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)', color: 'var(--theme-primary)', borderColor: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)' }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          Gradebook
                        </Link>
                        <Link 
                          href={`/courses/${c.id}/gradebook/setup`}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm border border-gray-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Setup
                        </Link>
                      </div>
                    </RoleGuard>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
