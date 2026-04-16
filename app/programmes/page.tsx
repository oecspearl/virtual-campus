'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import { stripHtml } from '@/lib/utils';

interface Programme {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  difficulty?: string;
  estimated_duration?: string;
  passing_score: number;
  course_count?: number;
  enrollment_count?: number;
  categories?: Array<{ id: string; name: string; color: string; icon: string }>;
  courses?: Array<{ id: string; title: string; thumbnail?: string }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export default function ProgrammesPage() {
  const { supabase } = useSupabase();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  const loadProgrammes = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      let url = '/api/programmes?withCounts=true';
      if (selectedCategory) url += `&category=${selectedCategory}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      setProgrammes(data.programmes || []);
    } catch (error) {
      console.error('Error loading programmes:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedCategory]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories?flat=true');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProgrammes();
    loadCategories();
  }, [loadProgrammes, loadCategories]);

  const filteredProgrammes = programmes.filter(p => {
    const matchesSearch = !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDifficulty = !selectedDifficulty || p.difficulty === selectedDifficulty;

    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Beginner' };
      case 'intermediate': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Intermediate' };
      case 'advanced': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Advanced' };
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Programmes' }
            ]}
            className="mb-6 text-white/80"
          />
          <h1 className="text-2xl font-normal text-slate-900 tracking-tight mb-4">Learning Programmes</h1>
          <p className="text-xl text-white/80 max-w-2xl">
            Structured learning paths with multiple courses. Complete all courses to earn your programme certificate.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon icon="material-symbols:search" className="w-4 h-4 inline mr-2" />
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search programmes..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon icon="material-symbols:folder" className="w-4 h-4 inline mr-2" />
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon icon="material-symbols:signal-cellular-alt" className="w-4 h-4 inline mr-2" />
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Programmes Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Icon icon="material-symbols:school" className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No programmes found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map(programme => {
              const difficulty = getDifficultyBadge(programme.difficulty);
              return (
                <Link
                  key={programme.id}
                  href={`/programmes/${programme.id}`}
                  className="group bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-200"
                >
                  {/* Thumbnail or gradient */}
                  <div className="h-40 bg-gradient-to-br from-blue-600 to-blue-700 relative">
                    {programme.thumbnail ? (
                      <Image
                        src={programme.thumbnail}
                        alt={programme.title}
                        className="w-full h-full object-cover"
                        width={400}
                        height={160}
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon icon="material-symbols:school" className="w-16 h-16 text-white/50" />
                      </div>
                    )}
                    {/* Course previews */}
                    {programme.courses && programme.courses.length > 0 && (
                      <div className="absolute bottom-3 left-3 flex -space-x-2">
                        {programme.courses.slice(0, 4).map((course, i) => (
                          <div
                            key={course.id}
                            className="w-8 h-8 rounded-full bg-white border-2 border-white overflow-hidden"
                            style={{ zIndex: 4 - i }}
                          >
                            {course.thumbnail ? (
                              <Image src={course.thumbnail} alt="" className="w-full h-full object-cover" width={32} height={32} unoptimized />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Icon icon="material-symbols:book" className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                        ))}
                        {(programme.course_count || 0) > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                            +{(programme.course_count || 0) - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {/* Categories */}
                    {programme.categories && programme.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {programme.categories.slice(0, 2).map(cat => (
                          <span
                            key={cat.id}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                      {programme.title}
                    </h3>

                    {programme.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{stripHtml(programme.description)}</p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Icon icon="material-symbols:book" className="w-4 h-4" />
                          {programme.course_count || 0} courses
                        </span>
                        {programme.estimated_duration && (
                          <span className="flex items-center gap-1">
                            <Icon icon="material-symbols:schedule" className="w-4 h-4" />
                            {programme.estimated_duration}
                          </span>
                        )}
                      </div>
                      {difficulty && (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${difficulty.bg} ${difficulty.text}`}>
                          {difficulty.label}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Pass score: {programme.passing_score}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {programme.enrollment_count || 0} enrolled
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
