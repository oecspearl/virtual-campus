"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  discussion_count: number;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  author: { id: string; name: string; email: string };
  category: Category | null;
  is_pinned: boolean;
  is_locked: boolean;
  is_featured: boolean;
  view_count: number;
  reply_count: number;
  vote_count: number;
  last_activity_at: string;
  created_at: string;
}

interface GlobalDiscussionsListProps {
  initialCategory?: string;
}

export default function GlobalDiscussionsList({
  initialCategory = "all",
}: GlobalDiscussionsListProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState("recent");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch discussions when filters change
  useEffect(() => {
    fetchDiscussions();
  }, [selectedCategory, sortBy, page]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/discussions/global/categories");
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchDiscussions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        sort: sortBy,
        page: page.toString(),
        limit: "20",
      });

      const response = await fetch(`/api/discussions/global?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setDiscussions(data.discussions || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError("Failed to load discussions");
      console.error("Error fetching discussions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: selectedCategory !== "all" ? selectedCategory : "",
      });

      const response = await fetch(`/api/discussions/global/search?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setDiscussions(data.discussions || []);
        setTotalPages(1);
      }
    } catch (err) {
      setError("Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    fetchDiscussions();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryColor = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700",
      green: "bg-green-100 text-green-700",
      purple: "bg-purple-100 text-purple-700",
      amber: "bg-amber-100 text-amber-700",
      red: "bg-red-100 text-red-700",
      indigo: "bg-indigo-100 text-indigo-700",
    };
    return colorMap[color] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Discussions</h1>
          <p className="text-gray-500 mt-1">
            Connect with fellow students and share knowledge
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052a3] transition-colors"
        >
          <Icon icon="mdi:plus" className="w-5 h-5" />
          New Discussion
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon icon="mdi:close" className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setSelectedCategory("all");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === "all"
              ? "bg-[#0066CC] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Icon icon="mdi:view-grid" className="w-4 h-4" />
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.slug);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.slug
                ? "bg-[#0066CC] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon icon={category.icon} className="w-4 h-4" />
            {category.name}
            <span className="text-xs opacity-70">({category.discussion_count})</span>
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {[
            { value: "recent", label: "Recent", icon: "mdi:clock-outline" },
            { value: "popular", label: "Popular", icon: "mdi:fire" },
            { value: "unanswered", label: "Unanswered", icon: "mdi:help-circle-outline" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setSortBy(option.value);
                setPage(1);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                sortBy === option.value
                  ? "bg-[#0066CC]/10 text-[#0066CC]"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon icon={option.icon} className="w-4 h-4" />
              {option.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">
          {discussions.length} discussion{discussions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <Icon icon="mdi:alert-circle" className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-gray-100 rounded-lg animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Discussions List */}
      {!isLoading && !error && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {discussions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Icon icon="mdi:forum-outline" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No discussions found</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 text-[#0066CC] hover:underline"
                >
                  Start the first discussion
                </button>
              </div>
            ) : (
              discussions.map((discussion) => (
                <motion.div
                  key={discussion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <Link href={`/discussions/${discussion.id}`}>
                    <div className="flex gap-4">
                      {/* Vote Count */}
                      <div className="flex flex-col items-center text-gray-500">
                        <Icon icon="mdi:arrow-up" className="w-5 h-5" />
                        <span className="font-medium">{discussion.vote_count}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {discussion.is_pinned && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#B5D334]/20 text-[#8fb02a] rounded-full text-xs font-medium">
                              <Icon icon="mdi:pin" className="w-3 h-3" />
                              Pinned
                            </span>
                          )}
                          {discussion.is_locked && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              <Icon icon="mdi:lock" className="w-3 h-3" />
                              Locked
                            </span>
                          )}
                          {discussion.category && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                                discussion.category.color
                              )}`}
                            >
                              {discussion.category.name}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-gray-900 hover:text-[#0066CC] line-clamp-1">
                          {discussion.title}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {discussion.content.replace(/<[^>]*>/g, "")}
                        </p>

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:account" className="w-4 h-4" />
                            {discussion.author?.name || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:comment-outline" className="w-4 h-4" />
                            {discussion.reply_count} replies
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:eye-outline" className="w-4 h-4" />
                            {discussion.view_count} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:clock-outline" className="w-4 h-4" />
                            {formatTimeAgo(discussion.last_activity_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Discussion Modal */}
      <CreateDiscussionModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        categories={categories}
        onCreated={() => {
          setShowCreateForm(false);
          fetchDiscussions();
        }}
      />
    </div>
  );
}

// Create Discussion Modal Component
function CreateDiscussionModal({
  isOpen,
  onClose,
  categories,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/discussions/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category_id: categoryId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create discussion");
        return;
      }

      setTitle("");
      setContent("");
      setCategoryId("");
      onCreated();
    } catch (err) {
      setError("Failed to create discussion");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Start a Discussion</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icon icon="mdi:close" className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              >
                <option value="">Select a category (optional)</option>
                {categories
                  .filter((c) => c.slug !== "announcements")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your question or topic?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Provide more details..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && (
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                )}
                Post Discussion
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
