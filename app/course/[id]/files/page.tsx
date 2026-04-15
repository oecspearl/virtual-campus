'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CourseTabBar from '@/app/components/course/CourseTabBar';
import Breadcrumb from '@/app/components/ui/Breadcrumb';

interface FileItem {
  id: string;
  name: string;
  url?: string;
  type: string;
  size?: number;
  source: 'resource' | 'lesson';
  lessonTitle?: string;
  description?: string;
}

interface ResourceLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  link_type?: string;
  file_id?: string;
}

interface LessonContent {
  type: string;
  title: string;
  data: {
    fileName?: string;
    fileId?: string;
    url?: string;
    title?: string;
  };
}

export default function CourseFilesPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, resourcesRes, lessonsRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`, { cache: 'no-store' }),
          fetch(`/api/resource-links?courseId=${courseId}`, { cache: 'no-store' }),
          fetch(`/api/lessons?course_id=${courseId}`, { cache: 'no-store' }),
        ]);

        if (courseRes.ok) setCourse(await courseRes.json());

        const allFiles: FileItem[] = [];

        // Resource links
        if (resourcesRes.ok) {
          const rData = await resourcesRes.json();
          (rData.links || []).forEach((link: ResourceLink) => {
            allFiles.push({
              id: `resource-${link.id}`,
              name: link.title,
              url: link.url,
              type: link.link_type || 'link',
              source: 'resource',
              description: link.description,
            });
          });
        }

        // Lesson-embedded files
        if (lessonsRes.ok) {
          const lData = await lessonsRes.json();
          const lessons = Array.isArray(lData.lessons) ? lData.lessons : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lessons.forEach((lesson: any) => {
            const content = Array.isArray(lesson.content) ? lesson.content : [];
            content.forEach((item: LessonContent, idx: number) => {
              if (['file', 'pdf'].includes(item.type) && (item.data?.fileId || item.data?.url)) {
                allFiles.push({
                  id: `lesson-${lesson.id}-${idx}`,
                  name: item.data?.fileName || item.data?.title || item.title || 'Untitled File',
                  url: item.data?.url || (item.data?.fileId ? `/api/files/${item.data.fileId}` : undefined),
                  type: item.type,
                  source: 'lesson',
                  lessonTitle: lesson.title,
                });
              }
            });
          });
        }

        setFiles(allFiles);
      } catch (err) {
        console.error('Failed to fetch files:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  const resourceFiles = files.filter(f => f.source === 'resource');
  const lessonFiles = files.filter(f => f.source === 'lesson');

  return (
    <div className="min-h-screen bg-gray-50/50">
      <CourseTabBar courseId={courseId} />

      <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course', href: `/course/${courseId}` },
            { label: 'Files' },
          ]}
          className="mb-6"
        />

        <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-6">Files & Resources</h1>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200/80 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 p-12 text-center">
            <p className="text-sm text-slate-400">No files or resources in this course yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Resource Links */}
            {resourceFiles.length > 0 && (
              <div>
                <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Course Resources</h2>
                <div className="space-y-1">
                  {resourceFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white rounded-lg border border-gray-200/80 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 mr-4">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 group-hover:text-slate-900 truncate">{file.name}</p>
                        {file.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{file.description}</p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Lesson Files */}
            {lessonFiles.length > 0 && (
              <div>
                <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Lesson Files</h2>
                <div className="space-y-1">
                  {lessonFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white rounded-lg border border-gray-200/80 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 mr-4">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {file.type === 'pdf' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          )}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 group-hover:text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">From: {file.lessonTitle}</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
