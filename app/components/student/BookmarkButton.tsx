'use client';

import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';

interface ContentMetadata {
  content_type: string;
  content_title: string;
  content_index: number;
}

interface BookmarkButtonProps {
  type: 'lesson' | 'course' | 'resource' | 'discussion' | 'quiz' | 'lesson_content';
  id: string;
  initialBookmarked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onToggle?: (bookmarked: boolean) => void;
  className?: string;
  /** For lesson_content type: additional metadata about the content */
  metadata?: ContentMetadata;
}

export default function BookmarkButton({
  type,
  id,
  initialBookmarked = false,
  size = 'md',
  showLabel = false,
  onToggle,
  className = '',
  metadata,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  // Check if bookmarked on mount if not provided
  useEffect(() => {
    if (initialBookmarked === undefined) {
      checkBookmarkStatus();
    }
  }, [id, type]);

  const checkBookmarkStatus = async () => {
    try {
      const response = await fetch(`/api/student/bookmarks?type=${type}`);
      const data = await response.json();

      if (response.ok) {
        let bookmark;
        if (type === 'lesson_content' && metadata?.content_index !== undefined) {
          // For lesson_content, check by bookmark_id AND content_index
          bookmark = data.bookmarks?.find(
            (b: { bookmark_type: string; bookmark_id: string; target?: { content_index?: number } }) =>
              b.bookmark_type === type &&
              b.bookmark_id === id &&
              b.target?.content_index === metadata.content_index
          );
        } else {
          bookmark = data.bookmarks?.find(
            (b: { bookmark_type: string; bookmark_id: string }) =>
              b.bookmark_type === type && b.bookmark_id === id
          );
        }
        setIsBookmarked(!!bookmark);
      }
    } catch (err) {
      console.error('Failed to check bookmark status:', err);
    }
  };

  const toggleBookmark = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/student/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmark_type: type,
          bookmark_id: id,
          toggle: true,
          metadata: type === 'lesson_content' ? metadata : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const newState = data.bookmarked;
        setIsBookmarked(newState);
        onToggle?.(newState);
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleBookmark}
      disabled={loading}
      className={`
        flex items-center gap-1.5 rounded-lg transition-colors
        ${sizeClasses[size]}
        ${
          isBookmarked
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700'
        }
        ${loading ? 'cursor-wait' : 'cursor-pointer'}
        ${className}
      `}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : isBookmarked ? (
        <BookmarkCheck className={iconSizes[size]} />
      ) : (
        <Bookmark className={iconSizes[size]} />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </button>
  );
}

/**
 * Hook to check if an item is bookmarked
 */
export function useBookmarkStatus(type: string, id: string) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(`/api/student/bookmarks?type=${type}`);
        const data = await response.json();

        if (response.ok) {
          const bookmark = data.bookmarks?.find(
            (b: { bookmark_type: string; bookmark_id: string }) =>
              b.bookmark_type === type && b.bookmark_id === id
          );
          setIsBookmarked(!!bookmark);
        }
      } catch (err) {
        console.error('Failed to check bookmark status:', err);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [type, id]);

  const toggle = async () => {
    try {
      const response = await fetch('/api/student/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmark_type: type,
          bookmark_id: id,
          toggle: true,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsBookmarked(data.bookmarked);
        return data.bookmarked;
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
    return isBookmarked;
  };

  return { isBookmarked, loading, toggle };
}
