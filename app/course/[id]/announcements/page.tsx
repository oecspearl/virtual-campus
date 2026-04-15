'use client';

import React from 'react';
import AnnouncementList from '@/app/components/AnnouncementList';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CourseAnnouncementsPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <Icon icon="material-symbols:campaign" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-normal text-slate-900 tracking-tight">Course Announcements</h1>
                <p className="text-gray-600">Important updates and information from your instructors</p>
              </div>
            </div>
            <Link
              href={`/course/${courseId}`}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
              <span>Back to Course</span>
            </Link>
          </div>
        </div>

        {/* Announcement List */}
        <AnnouncementList courseId={courseId} />
      </div>
    </div>
  );
}

