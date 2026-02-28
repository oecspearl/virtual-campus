'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useBranding } from '@/lib/hooks/useBranding';

export default function TermsOfUsePage() {
  const { siteName, siteShortName } = useBranding();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Icon icon="mdi:file-document-check" className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Terms of Use</span>
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
                <Icon icon="mdi:file-document-check" className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Terms of Use</h1>
                <p className="text-gray-500 mt-1">Last updated: February 2026</p>
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              Welcome to {siteName || 'the Learning Management System'}. By accessing or using our platform, you agree to be bound by these Terms of Use. Please read them carefully.
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:check-decagram" className="w-5 h-5 mr-2 text-blue-500" />
                1. Acceptance of Terms
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>By creating an account, enrolling in courses, or otherwise using {siteName || 'the platform'}, you agree to these Terms of Use, our Privacy Policy, and any additional terms that may apply to specific features or services.</p>
                <p>If you are using the platform on behalf of an educational institution or organization, you represent that you have authority to bind that entity to these terms.</p>
              </div>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:account-key" className="w-5 h-5 mr-2 text-green-500" />
                2. Account Registration
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>To access most features, you must create an account. You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your password and account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                  <li>Not share your account credentials with others</li>
                </ul>
                <p className="mt-4">We reserve the right to suspend or terminate accounts that violate these terms or remain inactive for extended periods.</p>
              </div>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:book-education" className="w-5 h-5 mr-2 text-purple-500" />
                3. Educational Content and Services
              </h2>
              <div className="space-y-4 text-gray-700">
                <h3 className="font-medium text-gray-900">3.1 Course Access</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Course enrollment grants you a limited, non-transferable license to access course materials</li>
                  <li>Course availability and content may change without notice</li>
                  <li>Access to courses may be time-limited or require completion of prerequisites</li>
                </ul>

                <h3 className="font-medium text-gray-900 mt-6">3.2 Certificates and Credentials</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Certificates are issued upon successful completion of course requirements</li>
                  <li>Certificates are verifiable through our platform&apos;s verification system</li>
                  <li>We reserve the right to revoke certificates obtained through fraud or misconduct</li>
                  <li>Certificates represent completion of platform courses and may not be equivalent to academic credits</li>
                </ul>

                <h3 className="font-medium text-gray-900 mt-6">3.3 Programmes</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Programmes are structured collections of courses with specific completion requirements</li>
                  <li>Programme completion requires meeting the specified passing score</li>
                  <li>Programme requirements may be updated; enrolled students will be notified of significant changes</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:gavel" className="w-5 h-5 mr-2 text-red-500" />
                4. Academic Integrity
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We are committed to maintaining academic integrity. You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Complete all assessments honestly and without unauthorized assistance</li>
                  <li>Not share quiz questions, answers, or assignment solutions with others</li>
                  <li>Properly cite sources and not plagiarize content</li>
                  <li>Comply with proctoring requirements for monitored assessments</li>
                  <li>Not use unauthorized tools, AI, or resources during proctored assessments</li>
                  <li>Not attempt to circumvent or interfere with proctoring systems</li>
                </ul>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
                  <p className="text-red-700 text-sm">
                    <strong>Warning:</strong> Violations of academic integrity may result in failing grades, certificate revocation, and account suspension.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:message-alert" className="w-5 h-5 mr-2 text-orange-500" />
                5. User Conduct
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>When using the platform, you agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Harass, bully, or threaten other users</li>
                  <li>Post discriminatory, offensive, or inappropriate content</li>
                  <li>Spam, advertise, or solicit without authorization</li>
                  <li>Share illegal, harmful, or misleading content</li>
                  <li>Impersonate others or misrepresent your identity</li>
                  <li>Interfere with platform operation or security</li>
                  <li>Attempt to access unauthorized data or systems</li>
                  <li>Use automated tools to scrape or collect data</li>
                  <li>Circumvent access controls or usage limits</li>
                </ul>
              </div>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:copyright" className="w-5 h-5 mr-2 text-indigo-500" />
                6. Intellectual Property
              </h2>
              <div className="space-y-4 text-gray-700">
                <h3 className="font-medium text-gray-900">6.1 Platform Content</h3>
                <p>All content provided through the platform, including courses, videos, text, graphics, and software, is owned by us or our licensors and protected by intellectual property laws. You may not:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Copy, distribute, or reproduce platform content without authorization</li>
                  <li>Remove copyright or trademark notices</li>
                  <li>Create derivative works from platform content</li>
                  <li>Use content for commercial purposes without permission</li>
                </ul>

                <h3 className="font-medium text-gray-900 mt-6">6.2 User Content</h3>
                <p>When you submit content (assignments, discussion posts, etc.), you:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Retain ownership of your original content</li>
                  <li>Grant us a license to use, display, and distribute your content for educational purposes</li>
                  <li>Represent that you have the right to share the content</li>
                  <li>Are responsible for ensuring your content does not infringe others&apos; rights</li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:robot" className="w-5 h-5 mr-2 text-teal-500" />
                7. AI-Powered Features
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Our platform includes AI-powered features such as tutoring, content generation, and recommendations. By using these features, you acknowledge:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>AI-generated content is provided for educational assistance only</li>
                  <li>AI responses may not always be accurate or complete</li>
                  <li>You should verify important information from authoritative sources</li>
                  <li>AI features may use your interactions to improve service quality</li>
                  <li>Usage limits may apply to AI features</li>
                </ul>
                <p className="mt-4">AI features are tools to support learning, not replacements for instructor guidance or independent study.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:chat" className="w-5 h-5 mr-2 text-blue-500" />
                8. Communication Features
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>The platform provides various communication tools including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Discussions:</strong> Course and global discussion forums for academic collaboration</li>
                  <li><strong>Messaging:</strong> Private messages and group chats for direct communication</li>
                  <li><strong>Video Conferencing:</strong> Live sessions for interactive learning</li>
                  <li><strong>Announcements:</strong> Official communications from instructors and administrators</li>
                </ul>
                <p className="mt-4">All communications should be respectful, constructive, and relevant to educational purposes. We may moderate content that violates our policies.</p>
              </div>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:alert-circle" className="w-5 h-5 mr-2 text-yellow-500" />
                9. Disclaimers
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>THE PLATFORM AND ALL CONTENT ARE PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Warranties of merchantability and fitness for a particular purpose</li>
                  <li>Warranties that the platform will be uninterrupted or error-free</li>
                  <li>Warranties regarding the accuracy or completeness of content</li>
                  <li>Warranties that content will meet your learning objectives</li>
                </ul>
                <p className="mt-4">Educational content is provided for learning purposes and should not be relied upon as professional advice.</p>
              </div>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:scale-balance" className="w-5 h-5 mr-2 text-gray-500" />
                10. Limitation of Liability
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Indirect, incidental, consequential, or punitive damages</li>
                  <li>Loss of profits, data, or opportunities</li>
                  <li>Damages arising from your use or inability to use the platform</li>
                  <li>Actions of other users or third parties</li>
                </ul>
                <p className="mt-4">Our total liability for any claims shall not exceed the amount you paid for the services in the 12 months preceding the claim.</p>
              </div>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:shield-check" className="w-5 h-5 mr-2 text-green-500" />
                11. Indemnification
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>You agree to indemnify and hold harmless {siteName || 'the platform'}, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, or expenses arising from:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your violation of these Terms</li>
                  <li>Your content or submissions</li>
                  <li>Your violation of any third-party rights</li>
                  <li>Your use of the platform</li>
                </ul>
              </div>
            </section>

            {/* Section 12 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:cancel" className="w-5 h-5 mr-2 text-red-500" />
                12. Termination
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We may suspend or terminate your account if you:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violate these Terms of Use</li>
                  <li>Engage in academic dishonesty</li>
                  <li>Abuse or harass other users</li>
                  <li>Engage in illegal activities</li>
                  <li>Attempt to compromise platform security</li>
                </ul>
                <p className="mt-4">Upon termination, your right to access the platform and its content will cease. Provisions regarding intellectual property, indemnification, and limitation of liability survive termination.</p>
              </div>
            </section>

            {/* Section 13 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:update" className="w-5 h-5 mr-2 text-purple-500" />
                13. Changes to Terms
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We may modify these Terms of Use at any time. We will notify you of material changes through the platform or by email. Your continued use after changes are posted constitutes acceptance of the modified terms.</p>
                <p className="mt-4">We encourage you to review these Terms periodically to stay informed of any updates.</p>
              </div>
            </section>

            {/* Section 14 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:file-document-multiple" className="w-5 h-5 mr-2 text-indigo-500" />
                14. General Provisions
              </h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and us.</li>
                  <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect.</li>
                  <li><strong>Waiver:</strong> Failure to enforce any provision does not constitute a waiver of that provision.</li>
                  <li><strong>Assignment:</strong> You may not assign these Terms without our consent. We may assign our rights freely.</li>
                  <li><strong>Governing Law:</strong> These Terms are governed by applicable laws. Any disputes will be resolved in the appropriate jurisdiction.</li>
                </ul>
              </div>
            </section>

            {/* Section 15 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:email" className="w-5 h-5 mr-2 text-blue-500" />
                15. Contact Information
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>If you have questions about these Terms of Use, please contact:</p>
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <p className="font-medium">{siteName || 'Learning Management System'}</p>
                  <p>Legal Inquiries</p>
                  <p className="text-blue-600">mypdoecs@gmail.com</p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer Links */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link href="/privacy" className="text-blue-600 hover:text-blue-800 transition-colors">
                Privacy Policy
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
