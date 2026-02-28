'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Download, ExternalLink, FileText, Linkedin, Share2 } from 'lucide-react';
import Link from 'next/link';

interface Certificate {
  id: string;
  course: {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
  };
  issued_at: string;
  pdf_url?: string;
  verification_code: string;
  grade_percentage?: number;
}

export default function MyCertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/certificates/me')
      .then(res => res.json())
      .then(data => {
        if (data.certificates) {
          setCertificates(data.certificates);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching certificates:', err);
        setLoading(false);
      });
  }, []);

  const downloadCertificate = (certificate: Certificate) => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank');
    } else {
      alert('Certificate PDF not available yet. Please contact support.');
    }
  };

  const verifyCertificate = (code: string) => {
    router.push(`/verify/${code}`);
  };

  const shareOnLinkedIn = (code: string) => {
    const shareUrl = `${window.location.origin}/certificate/share/${code}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  const copyShareLink = async (code: string) => {
    const shareUrl = `${window.location.origin}/certificate/share/${code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Certificate share link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Certificate share link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oecs-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Certificates</h1>
          <p className="text-gray-600">
            View and download your course completion certificates
          </p>
        </div>

        {certificates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Certificates Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Complete courses to earn certificates. Certificates are automatically generated upon course completion.
            </p>
            <Link
              href="/courses"
              className="inline-block px-6 py-3 bg-oecs-red text-white rounded-lg hover:bg-red-700 transition"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => {
              const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={certificate.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                >
                  {/* Certificate Image/Thumbnail */}
                  <div className="h-48 bg-gradient-to-br from-oecs-red to-red-700 flex items-center justify-center">
                    <Award className="h-20 w-20 text-white opacity-80" />
                  </div>

                  {/* Certificate Details */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {certificate.course.title}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Issued: {issuedDate}
                      </p>
                      
                      {certificate.grade_percentage !== null && certificate.grade_percentage !== undefined && (
                        <p className="text-sm text-gray-600">
                          Grade: {Math.round(certificate.grade_percentage)}%
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 mt-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadCertificate(certificate)}
                          className="flex-1 px-4 py-2 bg-oecs-red text-white rounded hover:bg-red-700 transition text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        
                        <button
                          onClick={() => verifyCertificate(certificate.verification_code)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm font-medium flex items-center justify-center gap-2"
                          title="Verify Certificate"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Share Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => shareOnLinkedIn(certificate.verification_code)}
                          className="flex-1 px-4 py-2 bg-[#0077b5] text-white rounded hover:bg-[#006399] transition text-sm font-medium flex items-center justify-center gap-2"
                          title="Share on LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                        </button>
                        
                        <button
                          onClick={() => copyShareLink(certificate.verification_code)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm font-medium flex items-center justify-center gap-2"
                          title="Copy Share Link"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

