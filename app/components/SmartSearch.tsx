"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { stripHtml } from "@/lib/utils";

interface SearchResult {
  courses: any[];
  lessons: any[];
  assignments: any[];
  discussions: any[];
}

interface SmartSearchProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function SmartSearch({
  onClose,
  compact = false,
}: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "courses" | "lessons" | "assignments" | "discussions">("all");
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, activeTab]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=${activeTab}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowResults(false);
      setQuery("");
      onClose?.();
    } else if (e.key === "Enter" && query.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setShowResults(false);
      onClose?.();
    }
  };

  const totalResults =
    results &&
    results.courses.length +
      results.lessons.length +
      results.assignments.length +
      results.discussions.length;

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon
            icon="material-symbols:search"
            className="w-5 h-5 text-gray-400"
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setShowResults(true)}
          placeholder="Search courses, lessons, assignments..."
          className={`w-full ${compact ? "pl-10 pr-10 py-2" : "pl-12 pr-12 py-3"} border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            showResults ? "rounded-b-none" : ""
          }`}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
              setShowResults(false);
            }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center"
          >
            <Icon
              icon="material-symbols:close"
              className="w-5 h-5 text-gray-400 hover:text-gray-600"
            />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (query.trim().length >= 2 || results) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-96 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Searching...</p>
            </div>
          ) : results && totalResults === 0 ? (
            <div className="p-8 text-center">
              <Icon
                icon="material-symbols:search-off"
                className="w-12 h-12 text-gray-400 mx-auto mb-2"
              />
              <p className="text-sm text-gray-600">No results found</p>
            </div>
          ) : results ? (
            <div className="max-h-96 overflow-y-auto">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                {[
                  { key: "all", label: "All", count: totalResults || 0 },
                  { key: "courses", label: "Courses", count: results.courses.length },
                  { key: "lessons", label: "Lessons", count: results.lessons.length },
                  { key: "assignments", label: "Assignments", count: results.assignments.length },
                  { key: "discussions", label: "Discussions", count: results.discussions.length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-blue-600 text-blue-600 bg-white"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Results Content */}
              <div className="p-4 space-y-4">
                {/* Courses */}
                {(activeTab === "all" || activeTab === "courses") &&
                  results.courses.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Courses
                      </h3>
                      <div className="space-y-2">
                        {results.courses.map((course) => (
                          <Link
                            key={course.id}
                            href={`/course/${course.id}`}
                            onClick={() => {
                              setShowResults(false);
                              onClose?.();
                            }}
                            className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <Icon
                                icon="material-symbols:menu-book"
                                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {course.title}
                                </p>
                                {course.description && (
                                  <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                                    {stripHtml(course.description)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Lessons */}
                {(activeTab === "all" || activeTab === "lessons") &&
                  results.lessons.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Lessons
                      </h3>
                      <div className="space-y-2">
                        {results.lessons.map((lesson) => (
                          <Link
                            key={lesson.id}
                            href={
                              lesson.course_id
                                ? `/course/${lesson.course_id}/lesson/${lesson.id}`
                                : `/lessons/${lesson.id}/edit`
                            }
                            onClick={() => {
                              setShowResults(false);
                              onClose?.();
                            }}
                            className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <Icon
                                icon="material-symbols:article"
                                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {lesson.title}
                                </p>
                                {lesson.course && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {lesson.course.title}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Assignments */}
                {(activeTab === "all" || activeTab === "assignments") &&
                  results.assignments.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Assignments
                      </h3>
                      <div className="space-y-2">
                        {results.assignments.map((assignment) => (
                          <Link
                            key={assignment.id}
                            href={`/assignment/${assignment.id}`}
                            onClick={() => {
                              setShowResults(false);
                              onClose?.();
                            }}
                            className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <Icon
                                icon="material-symbols:assignment"
                                className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {assignment.title}
                                </p>
                                {assignment.course && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {assignment.course.title}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Discussions */}
                {(activeTab === "all" || activeTab === "discussions") &&
                  results.discussions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Discussions
                      </h3>
                      <div className="space-y-2">
                        {results.discussions.map((discussion) => (
                          <Link
                            key={discussion.id}
                            href={
                              discussion.lesson_id
                                ? `/course/${discussion.course_id}/lesson/${discussion.lesson_id}/discussions/${discussion.id}`
                                : discussion.course_id
                                ? `/course/${discussion.course_id}/discussions/${discussion.id}`
                                : "#"
                            }
                            onClick={() => {
                              setShowResults(false);
                              onClose?.();
                            }}
                            className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <Icon
                                icon="material-symbols:forum"
                                className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {discussion.title}
                                </p>
                                {discussion.author && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    by {discussion.author.name || discussion.author.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                {/* View All Results */}
                {totalResults && totalResults > 10 && (
                  <div className="pt-4 border-t border-gray-200">
                    <Link
                      href={`/search?q=${encodeURIComponent(query)}`}
                      onClick={() => {
                        setShowResults(false);
                        onClose?.();
                      }}
                      className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View all {totalResults} results →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

