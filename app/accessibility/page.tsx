'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useBranding } from '@/lib/hooks/useBranding';

export default function AccessibilityPage() {
  const { siteName } = useBranding();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Icon icon="mdi:wheelchair-accessibility" className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Accessibility</span>
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
                <Icon icon="mdi:wheelchair-accessibility" className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Accessibility Statement</h1>
                <p className="text-gray-500 mt-1">Last updated: February 2026</p>
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              {siteName || 'The Learning Management System'} is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:target" className="w-5 h-5 mr-2 text-blue-500" />
                1. Our Commitment
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We believe that education should be accessible to everyone, regardless of ability. Our platform is designed with inclusivity in mind, and we strive to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide equal access to educational content for all learners</li>
                  <li>Ensure compatibility with assistive technologies</li>
                  <li>Meet or exceed WCAG 2.1 Level AA standards</li>
                  <li>Continuously improve accessibility based on user feedback</li>
                  <li>Train our team on accessibility best practices</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:keyboard" className="w-5 h-5 mr-2 text-green-500" />
                2. Keyboard Navigation
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Our platform is fully navigable using a keyboard. Key features include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Tab Navigation:</strong> Use the Tab key to move through interactive elements</li>
                  <li><strong>Enter/Space:</strong> Activate buttons, links, and form controls</li>
                  <li><strong>Escape:</strong> Close modals, dropdowns, and popups</li>
                  <li><strong>Arrow Keys:</strong> Navigate within menus, tabs, and carousels</li>
                  <li><strong>Skip Links:</strong> Jump directly to main content (press Tab on page load)</li>
                </ul>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-blue-900 mb-2">Common Keyboard Shortcuts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Tab</kbd> - Move to next element</div>
                    <div><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Shift + Tab</kbd> - Move to previous element</div>
                    <div><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Enter</kbd> - Activate links/buttons</div>
                    <div><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Space</kbd> - Toggle checkboxes/buttons</div>
                    <div><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Esc</kbd> - Close dialogs</div>
                    <div><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Arrow Keys</kbd> - Navigate menus</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:text-to-speech" className="w-5 h-5 mr-2 text-purple-500" />
                3. Screen Reader Support
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Our platform is optimized for screen readers with the following features:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Semantic HTML:</strong> Proper heading hierarchy and landmark regions</li>
                  <li><strong>ARIA Labels:</strong> Descriptive labels for interactive elements</li>
                  <li><strong>Alt Text:</strong> Meaningful descriptions for images and media</li>
                  <li><strong>Live Regions:</strong> Dynamic content changes are announced</li>
                  <li><strong>Form Labels:</strong> All form fields have associated labels</li>
                </ul>

                <h4 className="font-medium text-gray-900 mt-6">Compatible Screen Readers</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>NVDA</strong> (Windows) - Free, open-source screen reader</li>
                  <li><strong>JAWS</strong> (Windows) - Comprehensive commercial screen reader</li>
                  <li><strong>VoiceOver</strong> (macOS/iOS) - Built-in Apple screen reader</li>
                  <li><strong>TalkBack</strong> (Android) - Built-in Android screen reader</li>
                  <li><strong>Narrator</strong> (Windows) - Built-in Windows screen reader</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:eye" className="w-5 h-5 mr-2 text-orange-500" />
                4. Visual Accessibility
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We provide multiple options to accommodate visual needs:</p>

                <h4 className="font-medium text-gray-900">Color and Contrast</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Text maintains a minimum contrast ratio of 4.5:1 against backgrounds</li>
                  <li>Large text (18pt+) maintains a minimum contrast ratio of 3:1</li>
                  <li>Color is never used as the sole indicator of meaning</li>
                  <li>Focus indicators are clearly visible</li>
                </ul>

                <h4 className="font-medium text-gray-900 mt-6">Text and Sizing</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Text can be resized up to 200% without loss of functionality</li>
                  <li>Responsive design adapts to different zoom levels</li>
                  <li>Line spacing and letter spacing can be adjusted by user stylesheets</li>
                  <li>No horizontal scrolling required at 320px viewport width</li>
                </ul>

                <h4 className="font-medium text-gray-900 mt-6">Browser Zoom Support</h4>
                <p>The platform supports browser zoom functionality:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl/Cmd + +</kbd> - Zoom in</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl/Cmd + -</kbd> - Zoom out</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl/Cmd + 0</kbd> - Reset zoom</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:video" className="w-5 h-5 mr-2 text-red-500" />
                5. Multimedia Accessibility
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Educational video and audio content includes accessibility features:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Captions:</strong> Videos include closed captions or subtitles</li>
                  <li><strong>Transcripts:</strong> Text alternatives for audio content</li>
                  <li><strong>Audio Descriptions:</strong> Available for video content where applicable</li>
                  <li><strong>Playback Controls:</strong> Keyboard-accessible play, pause, volume, and speed controls</li>
                  <li><strong>No Auto-Play:</strong> Media does not play automatically with sound</li>
                </ul>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Icon icon="mdi:information" className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Note:</strong> Instructors are encouraged to provide accessible media. If you encounter content without captions or transcripts, please report it to your instructor or administrator.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:form-textbox" className="w-5 h-5 mr-2 text-teal-500" />
                6. Forms and Interactive Elements
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Forms and interactive components are designed for accessibility:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Clear Labels:</strong> All form fields have visible, descriptive labels</li>
                  <li><strong>Error Identification:</strong> Errors are clearly identified with text descriptions</li>
                  <li><strong>Error Prevention:</strong> Confirmation dialogs for important actions</li>
                  <li><strong>Input Assistance:</strong> Format hints and validation messages</li>
                  <li><strong>Sufficient Time:</strong> Extended time available for timed assessments when needed</li>
                  <li><strong>Focus Management:</strong> Focus is managed appropriately in dynamic content</li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:school" className="w-5 h-5 mr-2 text-indigo-500" />
                7. Learning Features
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Our educational features include accessibility considerations:</p>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Quizzes and Assessments</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Questions and answers are fully keyboard accessible</li>
                      <li>Progress indicators announce current question number</li>
                      <li>Time remaining is announced at intervals for timed quizzes</li>
                      <li>Extended time accommodations available through instructor settings</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Discussions</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Thread structure is conveyed to screen readers</li>
                      <li>Reply and navigation controls are keyboard accessible</li>
                      <li>Rich text editor supports accessibility features</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Assignments</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>File upload supports multiple input methods</li>
                      <li>Instructions are presented in accessible formats</li>
                      <li>Submission confirmations are clearly announced</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Video Conferencing</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Live captions available during video sessions</li>
                      <li>Chat functionality for text-based participation</li>
                      <li>Keyboard shortcuts for common actions</li>
                      <li>Session recordings available with captions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:cellphone" className="w-5 h-5 mr-2 text-pink-500" />
                8. Mobile Accessibility
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Our platform is accessible on mobile devices:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Touch Targets:</strong> Interactive elements are at least 44x44 pixels</li>
                  <li><strong>Screen Reader Support:</strong> Compatible with VoiceOver (iOS) and TalkBack (Android)</li>
                  <li><strong>Orientation:</strong> Content works in both portrait and landscape modes</li>
                  <li><strong>Gestures:</strong> Standard platform gestures are supported</li>
                  <li><strong>Responsive Design:</strong> Layout adapts to different screen sizes</li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:hand-heart" className="w-5 h-5 mr-2 text-red-500" />
                9. Requesting Accommodations
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>If you need accessibility accommodations, we are here to help:</p>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">For Students</h4>
                    <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                      <li>Contact your instructor or course administrator</li>
                      <li>Provide documentation of your accessibility needs</li>
                      <li>Discuss specific accommodations (extended time, alternative formats, etc.)</li>
                      <li>Accommodations will be configured in the system</li>
                    </ol>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Available Accommodations</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Extended time on quizzes and assessments</li>
                      <li>Alternative text formats for content</li>
                      <li>Audio descriptions for visual content</li>
                      <li>Flexible deadline arrangements</li>
                      <li>Alternative assessment methods</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:clipboard-check" className="w-5 h-5 mr-2 text-green-500" />
                10. Conformance Status
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We aim to conform to the following accessibility standards:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>WCAG 2.1 Level AA:</strong> Web Content Accessibility Guidelines</li>
                  <li><strong>Section 508:</strong> US federal accessibility requirements</li>
                  <li><strong>EN 301 549:</strong> European accessibility standard</li>
                  <li><strong>AODA:</strong> Accessibility for Ontarians with Disabilities Act (where applicable)</li>
                </ul>

                <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Icon icon="mdi:check-circle" className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        <strong>Ongoing Improvement:</strong> We regularly test our platform with assistive technologies and conduct accessibility audits to identify and address issues.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:alert-circle" className="w-5 h-5 mr-2 text-yellow-500" />
                11. Known Limitations
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>While we strive for full accessibility, some limitations may exist:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Third-party Content:</strong> Some embedded content from external sources may have varying accessibility levels</li>
                  <li><strong>User-generated Content:</strong> Content uploaded by instructors may not always include accessibility features</li>
                  <li><strong>Legacy Content:</strong> Older course materials may be in the process of being updated</li>
                  <li><strong>Complex Visualizations:</strong> Some data visualizations may have limited alternative text descriptions</li>
                </ul>
                <p className="mt-4">We are actively working to address these limitations. If you encounter accessibility barriers, please report them so we can prioritize fixes.</p>
              </div>
            </section>

            {/* Section 12 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:tools" className="w-5 h-5 mr-2 text-gray-500" />
                12. Assistive Technology Tips
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Recommendations for using assistive technology with our platform:</p>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Browser Recommendations</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Chrome, Firefox, Safari, or Edge (latest versions)</li>
                      <li>Enable JavaScript for full functionality</li>
                      <li>Keep your browser updated for best compatibility</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Screen Reader Settings</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Use forms mode/focus mode for interactive elements</li>
                      <li>Enable announcement of live regions for dynamic updates</li>
                      <li>Use heading navigation (H key in NVDA/JAWS) for quick page scanning</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Voice Control</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Dragon NaturallySpeaking compatible</li>
                      <li>Voice Control (macOS) supported</li>
                      <li>Windows Voice Access compatible</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 13 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon icon="mdi:message-text" className="w-5 h-5 mr-2 text-blue-500" />
                13. Feedback and Contact
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We welcome your feedback on accessibility. Please contact us if you:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encounter accessibility barriers while using the platform</li>
                  <li>Need content in an alternative format</li>
                  <li>Have suggestions for improving accessibility</li>
                  <li>Need help accessing specific features</li>
                </ul>

                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <p className="font-medium">{siteName || 'Learning Management System'}</p>
                  <p>Accessibility Support</p>
                  <p className="text-blue-600">mypdoecs@gmail.com</p>
                </div>

                <p className="mt-4 text-sm">We aim to respond to accessibility inquiries within 2 business days.</p>
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
