"use client";

import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="material-symbols:wifi-off" className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-2">You're Offline</h1>
          <p className="text-gray-600">
            It looks like you've lost your internet connection. Don't worry, some features are still available offline.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-blue-600" />
              Available Offline
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• View cached pages</li>
              <li>• Access downloaded content</li>
              <li>• Review previously loaded data</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:info" className="w-5 h-5 text-gray-600" />
              Requires Internet
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• New content loading</li>
              <li>• Submitting assignments</li>
              <li>• Real-time updates</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-slate-800 text-white font-medium rounded-lg  transition-all duration-200 shadow-lg "
          >
            Try Again
          </button>
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

