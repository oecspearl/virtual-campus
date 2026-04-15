import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
          <Icon icon="mdi:file-search-outline" className="w-10 h-10 text-oecs-navy-blue" />
        </div>
        <h1 className="text-2xl font-normal text-slate-900 tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
