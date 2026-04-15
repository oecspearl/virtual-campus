"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SmartSearch from "@/app/components/SmartSearch";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { stripHtml } from "@/lib/utils";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query && query.trim().length >= 2) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=all&limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalResults =
    results &&
    results.courses.length +
      results.lessons.length +
      results.assignments.length +
      results.discussions.length;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-4">Search</h1>
          <div className="max-w-2xl">
            <SmartSearch />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Searching...</p>
          </div>
        )}

        {/* No Results */}
        {!loading && (!results || totalResults === 0) && query && (
          <div className="text-center py-12">
            <Icon
              icon="material-symbols:search-off"
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-600">
              Try different keywords or check your spelling.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && results && totalResults > 0 && (
          <div className="space-y-8">
            {/* Courses */}
            {results.courses.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Icon icon="material-symbols:menu-book" className="w-6 h-6 text-blue-600" />
                  Courses ({results.courses.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.courses.map((course: any) => (
                    <Link
                      key={course.id}
                      href={`/course/${course.id}`}
                      className="bg-white rounded-lg border border-gray-200/80 overflow-hidden  transition-all hover:-translate-y-1"
                    >
                      {course.thumbnail && (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                            {stripHtml(course.description)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {course.difficulty && (
                            <span className="capitalize">{course.difficulty}</span>
                          )}
                          {course.grade_level && (
                            <>
                              <span>•</span>
                              <span>{course.grade_level}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Lessons */}
            {results.lessons.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Icon icon="material-symbols:article" className="w-6 h-6 text-green-600" />
                  Lessons ({results.lessons.length})
                </h2>
                <div className="bg-white rounded-lg border border-gray-200/80 divide-y divide-gray-200">
                  {results.lessons.map((lesson: any) => (
                    <Link
                      key={lesson.id}
                      href={
                        lesson.course_id
                          ? `/course/${lesson.course_id}/lesson/${lesson.id}`
                          : `/lessons/${lesson.id}/edit`
                      }
                      className="block p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {lesson.title}
                          </h3>
                          {lesson.course && (
                            <p className="text-sm text-gray-600">
                              Course: {lesson.course.title}
                            </p>
                          )}
                        </div>
                        <Icon
                          icon="material-symbols:chevron-right"
                          className="w-5 h-5 text-gray-400 flex-shrink-0"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Assignments */}
            {results.assignments.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Icon icon="material-symbols:assignment" className="w-6 h-6 text-orange-600" />
                  Assignments ({results.assignments.length})
                </h2>
                <div className="bg-white rounded-lg border border-gray-200/80 divide-y divide-gray-200">
                  {results.assignments.map((assignment: any) => (
                    <Link
                      key={assignment.id}
                      href={`/assignment/${assignment.id}`}
                      className="block p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {assignment.course && (
                              <span>Course: {assignment.course.title}</span>
                            )}
                            {assignment.due_date && (
                              <>
                                <span>•</span>
                                <span>
                                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Icon
                          icon="material-symbols:chevron-right"
                          className="w-5 h-5 text-gray-400 flex-shrink-0"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Discussions */}
            {results.discussions.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Icon icon="material-symbols:forum" className="w-6 h-6 text-purple-600" />
                  Discussions ({results.discussions.length})
                </h2>
                <div className="bg-white rounded-lg border border-gray-200/80 divide-y divide-gray-200">
                  {results.discussions.map((discussion: any) => (
                    <Link
                      key={discussion.id}
                      href={
                        discussion.lesson_id
                          ? `/course/${discussion.course_id}/lesson/${discussion.lesson_id}/discussions/${discussion.id}`
                          : discussion.course_id
                          ? `/course/${discussion.course_id}/discussions/${discussion.id}`
                          : "#"
                      }
                      className="block p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {discussion.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {discussion.author && (
                              <span>by {discussion.author.name || discussion.author.email}</span>
                            )}
                            {discussion.course && (
                              <>
                                <span>•</span>
                                <span>Course: {discussion.course.title}</span>
                              </>
                            )}
                            {discussion.lesson && (
                              <>
                                <span>•</span>
                                <span>Lesson: {discussion.lesson.title}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Icon
                          icon="material-symbols:chevron-right"
                          className="w-5 h-5 text-gray-400 flex-shrink-0"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

