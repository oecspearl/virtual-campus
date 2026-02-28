import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
        <p className="text-gray-600 mb-4">
          The certificate you're looking for doesn't exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-oecs-red text-white rounded hover:bg-red-700 transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

