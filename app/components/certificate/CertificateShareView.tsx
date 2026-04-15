'use client';

import { Award, Calendar, FileText, ExternalLink, Download, Linkedin, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CertificateShareViewProps {
  certificate: {
    id: string;
    studentName: string;
    courseName: string;
    courseDescription?: string;
    issuedAt: string;
    gradePercentage?: number | null;
    verificationCode: string;
    pdfUrl?: string;
    courseThumbnail?: string;
  };
}

export default function CertificateShareView({ certificate }: CertificateShareViewProps) {
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    // Get the current URL
    setShareUrl(window.location.href);
  }, []);

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleLinkedInShare = () => {
    window.open(linkedInShareUrl, '_blank', 'width=600,height=400');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Certificate link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Certificate link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-oecs-red to-red-700 px-6 py-8 text-center">
            <Award className="h-16 w-16 text-white mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Certificate of Completion</h1>
            <p className="text-red-100">Share your achievement on LinkedIn</p>
          </div>
        </div>

        {/* Certificate Details Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="p-8">
            <div className="space-y-6">
              {/* Student Name */}
              <div className="text-center pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-2">This is to certify that</p>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">{certificate.studentName}</h2>
                <p className="text-lg text-gray-700">has successfully completed the course</p>
              </div>

              {/* Course Name */}
              <div className="text-center py-6 border-b border-gray-200">
                <h3 className="text-3xl font-semibold text-oecs-red mb-4">{certificate.courseName}</h3>
                {certificate.courseDescription && (
                  <p className="text-gray-600 max-w-2xl mx-auto">{certificate.courseDescription}</p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="flex items-start gap-4">
                  <Calendar className="h-6 w-6 text-oecs-red mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Date Issued</p>
                    <p className="text-lg font-semibold text-gray-900">{issuedDate}</p>
                  </div>
                </div>

                {certificate.gradePercentage !== null && certificate.gradePercentage !== undefined && (
                  <div className="flex items-start gap-4">
                    <Award className="h-6 w-6 text-oecs-red mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Final Grade</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.round(certificate.gradePercentage)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Verification Code */}
              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Verification Code</p>
                      <p className="font-mono text-lg font-semibold text-gray-900">
                        {certificate.verificationCode}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/verify/${certificate.verificationCode}`}
                    className="flex items-center gap-2 text-oecs-red hover:text-red-700 transition"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-sm font-medium">Verify</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-oecs-red" />
            Share Your Achievement
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LinkedIn Share */}
            <button
              onClick={handleLinkedInShare}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-[#0077b5] text-white rounded-lg hover:bg-[#006399] transition font-medium "
            >
              <Linkedin className="h-6 w-6" />
              Share on LinkedIn
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <Share2 className="h-5 w-5" />
              Copy Share Link
            </button>
          </div>

          {/* Download PDF */}
          {certificate.pdfUrl && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a
                href={certificate.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-6 py-3 bg-oecs-red text-white rounded-lg hover:bg-red-700 transition font-medium w-full"
              >
                <Download className="h-5 w-5" />
                Download Certificate PDF
              </a>
            </div>
          )}

          {/* Share URL Display */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Share this link:</p>
            <p className="text-sm font-mono text-gray-800 break-all">{shareUrl}</p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            This certificate is issued by{' '}
            <span className="font-semibold text-oecs-red">OECS Learning Hub</span>
          </p>
          <p className="mt-1">
            Verify authenticity at{' '}
            <Link 
              href={`/verify/${certificate.verificationCode}`}
              className="text-oecs-red hover:underline"
            >
              /verify/{certificate.verificationCode}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

