'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function CRMError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('CRM error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">CRM Error</h1>
        <p className="text-gray-500 text-sm mb-6">
          Something went wrong loading this page. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
          >
            Try Again
          </button>
          <Link
            href="/crm"
            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
          >
            CRM Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
