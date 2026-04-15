'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useBranding } from '@/lib/hooks/useBranding';

export default function PrivacyPolicyPage() {
  const { siteName, siteShortName } = useBranding();

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Icon icon="mdi:shield-lock" className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Privacy Policy</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 lg:p-12">
          {/* Title Section */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Icon icon="mdi:shield-lock" className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-normal text-slate-900 tracking-tight">Privacy Policy</h1>
                <p className="text-gray-500 mt-1">Last updated: February 2026</p>
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              This Privacy Policy describes how {siteName || 'the Learning Management System'} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects your personal information when you use our learning management platform.
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:information" className="w-5 h-5 mr-2 text-blue-500" />
                1. Information We Collect
              </h2>
              <div className="space-y-4 text-gray-700">
                <h3 className="font-medium text-gray-900">1.1 Personal Information</h3>
                <p>We collect information you provide directly to us, including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> Name, email address, password, and profile picture when you create an account.</li>
                  <li><strong>Profile Information:</strong> Bio, phone number, timezone, and other optional details you choose to provide.</li>
                  <li><strong>Educational Content:</strong> Assignments, quiz responses, discussion posts, and other materials you submit through the platform.</li>
                  <li><strong>Communication Data:</strong> Messages, emails, and other communications you send through or to the platform.</li>
                </ul>

                <h3 className="font-medium text-gray-900 mt-6">1.2 Automatically Collected Information</h3>
                <p>When you use our platform, we automatically collect:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform, and learning progress.</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address.</li>
                  <li><strong>Analytics Data:</strong> Information about how you interact with course content, including video views, quiz attempts, and completion rates.</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:target" className="w-5 h-5 mr-2 text-green-500" />
                2. How We Use Your Information
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Provide Educational Services:</strong> Deliver courses, assessments, certificates, and other learning materials.</li>
                  <li><strong>Track Progress:</strong> Monitor your learning progress, grades, and completion status.</li>
                  <li><strong>Personalize Experience:</strong> Customize content recommendations and learning paths based on your interests and progress.</li>
                  <li><strong>Communicate:</strong> Send notifications about assignments, grades, announcements, and platform updates.</li>
                  <li><strong>Improve Services:</strong> Analyze usage patterns to enhance platform features and educational content.</li>
                  <li><strong>Ensure Security:</strong> Detect and prevent fraud, abuse, and security incidents.</li>
                  <li><strong>Support AI Features:</strong> Power AI tutoring, content recommendations, and adaptive learning features.</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:share-variant" className="w-5 h-5 mr-2 text-purple-500" />
                3. Information Sharing
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We may share your information with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Instructors and Administrators:</strong> Course instructors can view your progress, submissions, and participation. Administrators have access to user management data.</li>
                  <li><strong>Service Providers:</strong> Third-party services that help us operate the platform (e.g., cloud hosting, email delivery, video conferencing, analytics).</li>
                  <li><strong>Educational Institutions:</strong> If your access is sponsored by an institution, they may receive reports on your learning progress.</li>
                  <li><strong>Legal Requirements:</strong> When required by law, legal process, or to protect our rights and safety.</li>
                </ul>
                <p className="mt-4">We do <strong>not</strong> sell your personal information to third parties.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:robot" className="w-5 h-5 mr-2 text-indigo-500" />
                4. AI and Automated Processing
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Our platform uses artificial intelligence to enhance your learning experience:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>AI Tutor:</strong> Provides personalized learning assistance based on course content and your questions.</li>
                  <li><strong>Content Generation:</strong> Helps instructors create quizzes, assignments, and rubrics.</li>
                  <li><strong>Recommendations:</strong> Suggests courses and learning paths based on your interests and progress.</li>
                  <li><strong>Analytics:</strong> Identifies at-risk students and learning patterns to improve outcomes.</li>
                </ul>
                <p className="mt-4">AI-generated content and recommendations are provided for educational purposes. Final grading and academic decisions are made by human instructors and administrators.</p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:database-lock" className="w-5 h-5 mr-2 text-red-500" />
                5. Data Security
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We implement industry-standard security measures to protect your information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit (HTTPS/TLS) and at rest</li>
                  <li>Secure authentication with password hashing and optional multi-factor authentication</li>
                  <li>Role-based access controls limiting data access</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Secure cloud infrastructure with industry-leading providers</li>
                </ul>
                <p className="mt-4">While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:cookie" className="w-5 h-5 mr-2 text-orange-500" />
                6. Cookies and Tracking
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain your login session</li>
                  <li>Remember your preferences and settings</li>
                  <li>Analyze platform usage and performance</li>
                  <li>Provide personalized content recommendations</li>
                </ul>
                <p className="mt-4">You can control cookie settings through your browser, but disabling cookies may affect platform functionality.</p>
              </div>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:account-cog" className="w-5 h-5 mr-2 text-teal-500" />
                7. Your Rights and Choices
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data.</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information in your profile.</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data (subject to retention requirements).</li>
                  <li><strong>Opt-out:</strong> Unsubscribe from non-essential communications through notification preferences.</li>
                  <li><strong>Data Portability:</strong> Request your data in a portable format.</li>
                </ul>
                <p className="mt-4">To exercise these rights, contact your platform administrator or use the settings available in your profile.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:timer-sand" className="w-5 h-5 mr-2 text-yellow-500" />
                8. Data Retention
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We retain your information for as long as:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your account is active</li>
                  <li>Necessary to provide our services</li>
                  <li>Required by law or for legitimate business purposes</li>
                  <li>Needed to maintain academic records (certificates, transcripts)</li>
                </ul>
                <p className="mt-4">When you delete your account, we will remove or anonymize your personal data within 30 days, except where retention is required for legal, academic, or compliance purposes.</p>
              </div>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:account-child" className="w-5 h-5 mr-2 text-pink-500" />
                9. Children&apos;s Privacy
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Our platform may be used by educational institutions for learners of various ages. If you are under 13 (or the applicable age of consent in your jurisdiction), you must have parental or guardian consent to use this platform. We comply with applicable children&apos;s privacy laws including COPPA.</p>
                <p className="mt-4">Educational institutions are responsible for obtaining appropriate consent for students under their supervision.</p>
              </div>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:earth" className="w-5 h-5 mr-2 text-blue-500" />
                10. International Data Transfers
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable data protection laws.</p>
              </div>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:update" className="w-5 h-5 mr-2 text-gray-500" />
                11. Changes to This Policy
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the platform or sending you an email. Your continued use of the platform after changes are posted constitutes acceptance of the updated policy.</p>
              </div>
            </section>

            {/* Section 12 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:email" className="w-5 h-5 mr-2 text-green-500" />
                12. Contact Us
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>If you have questions about this Privacy Policy or our data practices, please contact:</p>
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <p className="font-medium">{siteName || 'Learning Management System'}</p>
                  <p>Privacy Inquiries</p>
                  <p className="text-blue-600">mypdoecs@gmail.com</p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer Links */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link href="/terms" className="text-blue-600 hover:text-blue-800 transition-colors">
                Terms of Use
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/help" className="text-blue-600 hover:text-blue-800 transition-colors">
                Help Center
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
