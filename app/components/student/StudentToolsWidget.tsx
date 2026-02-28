'use client';

import Link from 'next/link';
import {
  StickyNote,
  Bookmark,
  Users,
  Calendar,
  CheckSquare,
  GraduationCap,
} from 'lucide-react';

const tools = [
  {
    name: 'My Notes',
    description: 'View all your notes',
    href: '/student/notes',
    icon: StickyNote,
    color: 'bg-amber-100 text-amber-600 group-hover:bg-amber-200',
  },
  {
    name: 'Bookmarks',
    description: 'Saved content',
    href: '/student/bookmarks',
    icon: Bookmark,
    color: 'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
  },
  {
    name: 'Study Groups',
    description: 'Collaborate with peers',
    href: '/student/study-groups',
    icon: Users,
    color: 'bg-green-100 text-green-600 group-hover:bg-green-200',
  },
  {
    name: 'Calendar',
    description: 'Your schedule',
    href: '/student/calendar',
    icon: Calendar,
    color: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200',
  },
  {
    name: 'Tasks',
    description: 'To-do list',
    href: '/student/todos',
    icon: CheckSquare,
    color: 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200',
  },
  {
    name: 'Learning Paths',
    description: 'Guided learning',
    href: '/learning-paths',
    icon: GraduationCap,
    color: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
  },
];

export default function StudentToolsWidget() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-4 sm:px-6 py-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Student Tools
        </h3>
        <p className="text-teal-100 text-sm">Organize your learning journey</p>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tools.map(tool => {
            const IconComponent = tool.icon;
            return (
              <Link
                key={tool.name}
                href={tool.href}
                className="group flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 transition-colors text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-colors ${tool.color}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <span className="font-medium text-gray-900 text-sm">{tool.name}</span>
                <span className="text-xs text-gray-500 mt-0.5">{tool.description}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
