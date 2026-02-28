'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Calendar, Award, FileText } from 'lucide-react';

interface CertificateData {
  valid: boolean;
  expired?: boolean;
  certificate?: {
    id: string;
    studentName: string;
    courseName: string;
    issuedAt: string;
    expiresAt?: string;
    gradePercentage?: number;
    verificationCode: string;
  };
  error?: string;
}

export default function VerifyCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (!code) return;

    fetch(`/api/certificates/verify/${code}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Verification error:', err);
        setData({ valid: false, error: 'Failed to verify certificate' });
        setLoading(false);
      });
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oecs-red mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.valid || !data.certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Certificate</h1>
          <p className="text-gray-600 mb-4">
            {data?.error || 'This certificate could not be verified. Please check the verification code and try again.'}
          </p>
          {data?.expired && (
            <p className="text-orange-600 font-semibold mb-4">
              This certificate has expired.
            </p>
          )}
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-oecs-red text-white rounded hover:bg-red-700 transition"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const cert = data.certificate;
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-oecs-red text-white p-6 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Certificate Verified</h1>
          <p className="text-red-100">This certificate is authentic and verified</p>
        </div>

        {/* Certificate Details */}
        <div className="p-8">
          <div className="space-y-6">
            {/* Student Name */}
            <div className="flex items-start gap-4">
              <Award className="h-6 w-6 text-oecs-red mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Student Name</p>
                <p className="text-xl font-semibold text-gray-900">{cert.studentName}</p>
              </div>
            </div>

            {/* Course Name */}
            <div className="flex items-start gap-4">
              <FileText className="h-6 w-6 text-oecs-red mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Course Completed</p>
                <p className="text-xl font-semibold text-gray-900">{cert.courseName}</p>
              </div>
            </div>

            {/* Issue Date */}
            <div className="flex items-start gap-4">
              <Calendar className="h-6 w-6 text-oecs-red mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Date Issued</p>
                <p className="text-lg font-medium text-gray-900">{issuedDate}</p>
              </div>
            </div>

            {/* Grade (if available) */}
            {cert.gradePercentage !== null && cert.gradePercentage !== undefined && (
              <div className="flex items-start gap-4">
                <Award className="h-6 w-6 text-oecs-red mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Final Grade</p>
                  <p className="text-lg font-medium text-gray-900">{cert.gradePercentage}%</p>
                </div>
              </div>
            )}

            {/* Expiration (if applicable) */}
            {cert.expiresAt && (
              <div className="flex items-start gap-4">
                <Calendar className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Expires</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(cert.expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Verification Code */}
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-gray-600 mb-2">Verification Code</p>
              <p className="font-mono text-lg font-semibold text-gray-900 bg-gray-100 p-3 rounded">
                {cert.verificationCode}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Use this code to verify this certificate at any time
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t">
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-2 bg-oecs-red text-white rounded hover:bg-red-700 transition"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

