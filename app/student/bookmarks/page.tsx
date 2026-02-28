'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  BookOpen,
  FileText,
  MessageCircle,
  Trophy,
  Folder,
  Filter,
  Trash2,
  Play,
  Image,
  Code,
  FileDown,
  Type,
  Music,
  Presentation,
  ExternalLink,
} from 'lucide-react';

interface BookmarkItem {
  id: string;
  bookmark_type: string;
  bookmark_id: string;
  folder?: string;
  notes?: string;
  created_at: string;
  target?: {
    id: string;
    title: string;
    description?: string;
    course_id?: string;
    course?: { title: string };
    thumbnail?: string;
    resource_type?: string;
    // Content-level bookmark metadata
    content_type?: string;
    content_title?: string;
    content_index?: number;
  };
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  useEffect(() => {
    fetchBookmarks();
  }, [typeFilter, folderFilter]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      let url = '/api/student/bookmarks';
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (folderFilter !== 'all') params.set('folder', folderFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setBookmarks(data.bookmarks || []);
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    try {
      const response = await fetch(`/api/student/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      }
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  };

  const getTypeIcon = (type: string, contentType?: string) => {
    switch (type) {
      case 'lesson':
        return <BookOpen className="w-5 h-5" />;
      case 'lesson_content':
        // Return content-specific icon
        switch (contentType) {
          case 'video':
          case 'interactive_video':
            return <Play className="w-5 h-5" />;
          case 'audio':
            return <Music className="w-5 h-5" />;
          case 'image':
            return <Image className="w-5 h-5" />;
          case 'pdf':
          case 'file':
            return <FileDown className="w-5 h-5" />;
          case 'code_sandbox':
            return <Code className="w-5 h-5" />;
          case 'text':
            return <Type className="w-5 h-5" />;
          case 'slideshow':
            return <Presentation className="w-5 h-5" />;
          case 'embed':
            return <ExternalLink className="w-5 h-5" />;
          default:
            return <FileText className="w-5 h-5" />;
        }
      case 'course':
        return <Folder className="w-5 h-5" />;
      case 'resource':
        return <FileText className="w-5 h-5" />;
      case 'discussion':
        return <MessageCircle className="w-5 h-5" />;
      case 'quiz':
        return <Trophy className="w-5 h-5" />;
      default:
        return <Bookmark className="w-5 h-5" />;
    }
  };

  const getBookmarkLink = (bookmark: BookmarkItem) => {
    switch (bookmark.bookmark_type) {
      case 'lesson':
        // Lessons are viewed within their course context
        if (bookmark.target?.course_id) {
          return `/course/${bookmark.target.course_id}/lesson/${bookmark.bookmark_id}`;
        }
        return '#';
      case 'lesson_content':
        // Content-level bookmarks link to the lesson with a content anchor
        // bookmark_id is the lesson UUID, content_index comes from target
        if (bookmark.target?.course_id && bookmark.target?.content_index !== undefined) {
          return `/course/${bookmark.target.course_id}/lesson/${bookmark.bookmark_id}#content-${bookmark.target.content_index}`;
        }
        return '#';
      case 'course':
        return `/course/${bookmark.bookmark_id}`;
      case 'resource':
        return `/lecturers/resources/${bookmark.bookmark_id}`;
      case 'discussion':
        return `/discussions/${bookmark.bookmark_id}`;
      case 'quiz':
        return `/quiz/${bookmark.bookmark_id}`;
      default:
        return '#';
    }
  };

  const bookmarkTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'lesson', label: 'Lessons' },
    { value: 'lesson_content', label: 'Lesson Content' },
    { value: 'course', label: 'Courses' },
    { value: 'resource', label: 'Resources' },
    { value: 'quiz', label: 'Quizzes' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bookmark className="w-7 h-7 text-blue-600" />
            My Bookmarks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Quick access to your saved content
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {bookmarkTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {folders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder
                </label>
                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Folders</option>
                  {folders.map(folder => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bookmarks list */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-8 animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No bookmarks yet
              </h3>
              <p>Start bookmarking lessons, courses, and resources to access them quickly.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {bookmarks.map(bookmark => (
                <li key={bookmark.id} className="group">
                  <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className={`p-2 rounded-lg ${
                      bookmark.bookmark_type === 'lesson'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : bookmark.bookmark_type === 'lesson_content'
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        : bookmark.bookmark_type === 'course'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : bookmark.bookmark_type === 'quiz'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {getTypeIcon(bookmark.bookmark_type, bookmark.target?.content_type)}
                    </div>

                    <Link
                      href={getBookmarkLink(bookmark)}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {bookmark.bookmark_type === 'lesson_content' && bookmark.target?.content_title
                          ? bookmark.target.content_title
                          : bookmark.target?.title || 'Unknown'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {bookmark.bookmark_type === 'lesson_content' ? (
                          <>
                            <span className="capitalize">{bookmark.target?.content_type || 'Content'}</span>
                            {bookmark.target?.title && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px]">in {bookmark.target.title}</span>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="capitalize">{bookmark.bookmark_type.replace('_', ' ')}</span>
                        )}
                        {bookmark.target?.course && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{bookmark.target.course.title}</span>
                          </>
                        )}
                        {bookmark.folder && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Folder className="w-3 h-3" />
                              {bookmark.folder}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>

                    <button
                      onClick={() => removeBookmark(bookmark.id)}
                      className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
