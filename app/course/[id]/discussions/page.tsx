'use client';

import React, { use } from 'react';
import DiscussionList from '@/app/components/DiscussionList';
import { Icon } from '@iconify/react';

interface CourseDiscussionsPageProps {
  params: Promise<{ id: string }>;
}

export default function CourseDiscussionsPage({ params }: CourseDiscussionsPageProps) {
  const { id: courseId } = use(params);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Icon icon="material-symbols:forum" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Course Discussions</h1>
              <p className="text-gray-600">Connect with your peers and instructors</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:chat" className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">Active</div>
                  <div className="text-sm text-gray-600">Discussions</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:reply" className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">Recent</div>
                  <div className="text-sm text-gray-600">Replies</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:group" className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">Community</div>
                  <div className="text-sm text-gray-600">Engagement</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Discussion List */}
        <DiscussionList courseId={courseId} />
      </div>
    </div>
  );
}
