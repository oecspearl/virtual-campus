'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import AIChatWidget from '@/app/components/AIChatWidget';
import AIHelpEnhancement from '@/app/components/AIHelpEnhancement';
import AISearchBox from '@/app/components/AISearchBox';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function AdminHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [showAIChat, setShowAIChat] = useState(false);

  const selectSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleAISearch = (query: string) => {
    const q = (query || '').trim().toLowerCase();
    if (q) {
      const firstMatch = helpSections.find(s => s.title.toLowerCase().includes(q));
      if (firstMatch) setActiveSection(firstMatch.id);
    }
    setShowAIChat(true);
  };

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started as Admin',
      icon: <Icon icon="mdi:shield-account" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Welcome, Administrator!</strong> This guide covers all administrative features and system management tools.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Quick Start Guide</h3>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Access the Admin Dashboard</p>
                  <p className="text-sm text-gray-600">View system-wide statistics and quick access to management tools</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Manage Users</p>
                  <p className="text-sm text-gray-600">Create accounts, assign roles, and manage user permissions</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Manage Courses</p>
                  <p className="text-sm text-gray-600">Create courses, assign instructors, and control course visibility</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">View Analytics</p>
                  <p className="text-sm text-gray-600">Monitor system performance, engagement, and learning outcomes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'user-management',
      title: 'User Management',
      icon: <Icon icon="mdi:account-group" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Users</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👤 Creating User Accounts</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to Admin → Users → Manage Users</li>
                <li>Click "Add New User"</li>
                <li>Enter user details (name, email, role)</li>
                <li>Set initial password or send password reset email</li>
                <li>Assign appropriate role (student, instructor, admin, etc.)</li>
                <li>Save and user will receive account details</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔐 User Roles & Permissions</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <strong>Student:</strong> Enroll in courses, submit assignments, participate in discussions</li>
                <li>• <strong>Instructor:</strong> Create courses, grade assignments, manage enrolled students</li>
                <li>• <strong>Curriculum Designer:</strong> Full course creation and editing capabilities</li>
                <li>• <strong>Admin:</strong> User and course management, system settings</li>
                <li>• <strong>Super Admin:</strong> Full system access including user role changes</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✏️ Editing Users</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Update user name, email, and profile information</li>
                <li>• Change user roles (Super Admin only)</li>
                <li>• Reset user passwords</li>
                <li>• Activate or deactivate user accounts</li>
                <li>• View user activity and enrollment history</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'course-management',
      title: 'Course Management',
      icon: <Icon icon="mdi:book-multiple" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Courses</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Creating Courses</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to Admin → Courses → Manage Courses</li>
                <li>Click "Add New Course"</li>
                <li>Enter course details (title, description, objectives)</li>
                <li>Set course difficulty and prerequisites</li>
                <li>Assign instructors to the course</li>
                <li>Set course as featured for homepage display</li>
                <li>Publish the course when ready</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👨‍🏫 Assigning Instructors</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Add multiple instructors to a single course</li>
                <li>• Assign primary and secondary instructors</li>
                <li>• Instructors can create content and grade assignments</li>
                <li>• Change instructor assignments at any time</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⭐ Featured Courses</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Mark courses as "Featured" to display on homepage</li>
                <li>• Featured courses appear in the "Featured Courses" section</li>
                <li>• Toggle featured status from the course management page</li>
                <li>• Use featured courses to highlight important or popular content</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🗑️ Deleting Courses</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Delete courses that are no longer needed</li>
                <li>• System will warn about enrolled students</li>
                <li>• Consider archiving instead of deleting</li>
                <li>• Deleted courses cannot be recovered</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Course Content Types (12 Available)</h4>
              <p className="text-sm text-gray-600 mb-3">The platform supports 12 different content types that instructors can add to lessons. Admins should understand these options when managing courses and supporting instructors.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 mb-3">
                <div className="text-sm text-gray-600">1. 📝 <strong>Text Content</strong> - Rich text editor</div>
                <div className="text-sm text-gray-600">2. 🎥 <strong>Video</strong> - YouTube, Vimeo, embedded videos</div>
                <div className="text-sm text-emerald-600">3. 🎬 <strong>Interactive Video</strong> - Videos with questions at checkpoints</div>
                <div className="text-sm text-purple-600">4. 🎵 <strong>Audio/Podcast</strong> - Audio files with player</div>
                <div className="text-sm text-blue-600">5. 💻 <strong>Code Sandbox</strong> - Interactive code editor</div>
                <div className="text-sm text-gray-600">6. 🖼️ <strong>Images</strong> - Image uploads</div>
                <div className="text-sm text-gray-600">7. 📄 <strong>PDF Documents</strong> - PDF viewer</div>
                <div className="text-sm text-gray-600">8. 📎 <strong>File Uploads</strong> - Any file type</div>
                <div className="text-sm text-gray-600">9. 🔗 <strong>Embedded Content</strong> - External embeds</div>
                <div className="text-sm text-gray-600">10. 📊 <strong>Slideshows</strong> - Presentations</div>
                <div className="text-sm text-gray-600">11. ❓ <strong>Quizzes</strong> - Assessments</div>
                <div className="text-sm text-gray-600">12. 📋 <strong>Assignments</strong> - Student tasks</div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-900 mb-2">New Interactive Content Types:</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4">
                  <li>• <strong>Interactive Video:</strong> Videos pause at checkpoints to ask questions, increasing engagement and comprehension</li>
                  <li>• <strong>Audio/Podcast:</strong> Audio content with playback controls, speed adjustment, and optional transcripts for accessibility</li>
                  <li>• <strong>Code Sandbox:</strong> Interactive code editor supporting 8 languages (JavaScript, Python, HTML/CSS, Java, C++, SQL, JSON) with live execution</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Note:</strong> Admins can view all content types when reviewing courses. These features enhance learning engagement and support diverse teaching methods.
                </p>
              </div>
            </div>

            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-900 mb-2">🔒 Quiz Proctoring (Safe Browser Mode)</h4>
              <p className="text-sm text-red-700 mb-3">The platform includes a built-in proctoring system that instructors can enable for high-stakes assessments.</p>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>• <strong>How it works:</strong> When enabled, quizzes run in fullscreen mode and monitor for suspicious activity like tab switching, window blur, and keyboard shortcuts.</li>
                <li>• <strong>Violation tracking:</strong> All violations are logged to the <code className="bg-red-100 px-1 rounded">quiz_proctor_logs</code> table with timestamps and details.</li>
                <li>• <strong>Auto-submit:</strong> Quizzes can be configured to automatically submit when a student exceeds the maximum violation count.</li>
                <li>• <strong>Instructor access:</strong> Instructors can view violation logs for their quizzes to identify potential academic integrity issues.</li>
                <li>• <strong>Database columns:</strong> <code className="bg-red-100 px-1 rounded">proctored_mode</code> (boolean) and <code className="bg-red-100 px-1 rounded">proctor_settings</code> (JSONB) on the quizzes table.</li>
              </ul>
              <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
                <strong>Admin Note:</strong> The proctoring system uses client-side JavaScript and is designed as a deterrent. It is not a full secure browser replacement but provides reasonable protection for online assessments.
              </div>
            </div>

            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-medium text-green-900 mb-2">📹 Video Conference Providers</h4>
              <p className="text-sm text-green-700 mb-3">The platform supports multiple video conferencing providers for live sessions.</p>
              <ul className="text-sm text-green-700 space-y-1 ml-4">
                <li>• <strong>8x8.vc (Jitsi Meet):</strong> Free, open-source, no account required for students. Links are auto-generated.</li>
                <li>• <strong>Google Meet:</strong> Familiar interface, requires Google account. Instructors can paste existing meet links or use auto-generation if Calendar API is configured.</li>
                <li>• <strong>BigBlueButton:</strong> Open-source classroom-focused solution. Requires server configuration.</li>
                <li>• <strong>Attendance tracking:</strong> Student attendance is automatically logged when they join meetings via the platform.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'content-types',
      title: 'Content Types Overview',
      icon: <Icon icon="mdi:file-document-multiple" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Understanding Course Content Types</h3>
          <p className="text-sm text-gray-700">The platform supports 12 different content types that instructors can use to create engaging lessons. As an admin, understanding these types helps you support instructors and ensure courses are well-structured.</p>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 All Content Types</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">1. 📝 Text Content</p>
                  <p className="text-xs text-gray-600">Rich text editor with formatting options</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">2. 🎥 Video</p>
                  <p className="text-xs text-gray-600">YouTube, Vimeo, and embedded videos</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                  <p className="font-medium text-sm text-emerald-900">3. 🎬 Interactive Video (NEW)</p>
                  <p className="text-xs text-emerald-700">Videos with embedded questions at checkpoints</p>
                </div>
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <p className="font-medium text-sm text-purple-900">4. 🎵 Audio/Podcast (NEW)</p>
                  <p className="text-xs text-purple-700">Audio files with interactive player and transcripts</p>
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="font-medium text-sm text-blue-900">5. 💻 Code Sandbox (NEW)</p>
                  <p className="text-xs text-blue-700">Interactive code editor with execution (8 languages)</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">6. 🖼️ Images</p>
                  <p className="text-xs text-gray-600">Image uploads and displays</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">7. 📄 PDF Documents</p>
                  <p className="text-xs text-gray-600">PDF uploads with viewer</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">8. 📎 File Uploads</p>
                  <p className="text-xs text-gray-600">Any file type for download</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">9. 🔗 Embedded Content</p>
                  <p className="text-xs text-gray-600">External content embedding</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">10. 📊 Slideshows</p>
                  <p className="text-xs text-gray-600">Presentation embeds</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">11. ❓ Quizzes</p>
                  <p className="text-xs text-gray-600">Interactive assessments</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-sm text-gray-900">12. 📋 Assignments</p>
                  <p className="text-xs text-gray-600">Student work tasks</p>
                </div>
              </div>
            </div>

            <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
              <h4 className="font-medium text-emerald-900 mb-2">🎬 Interactive Video</h4>
              <p className="text-sm text-emerald-700 mb-2">Videos that pause at specified timestamps to ask questions. This increases engagement and helps verify comprehension.</p>
              <ul className="text-xs text-emerald-700 space-y-1 ml-4">
                <li>• Instructors add checkpoints at specific timestamps</li>
                <li>• Questions can be multiple choice, true/false, or short answer</li>
                <li>• Students must answer to continue watching</li>
                <li>• Immediate feedback and progress tracking</li>
                <li>• Perfect for step-by-step tutorials and case studies</li>
              </ul>
            </div>

            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <h4 className="font-medium text-purple-900 mb-2">🎵 Audio/Podcast Content</h4>
              <p className="text-sm text-purple-700 mb-2">Audio content with full playback controls and accessibility features. Essential for language learning and mobile learning.</p>
              <ul className="text-xs text-purple-700 space-y-1 ml-4">
                <li>• Supports MP3, WAV, OGG, M4A formats</li>
                <li>• Playback speed control (0.5x to 2x)</li>
                <li>• Volume control and download option</li>
                <li>• Optional transcripts for accessibility</li>
                <li>• Perfect for language learning, lectures, interviews</li>
              </ul>
            </div>

            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">💻 Code Sandbox</h4>
              <p className="text-sm text-blue-700 mb-2">Interactive code editor with live execution. Critical for programming and technical courses.</p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4">
                <li>• Supports 8 languages: JavaScript, TypeScript, HTML/CSS, Python, Java, C++, SQL, JSON</li>
                <li>• JavaScript and HTML/CSS execute directly in browser</li>
                <li>• Real-time output and error messages</li>
                <li>• Code templates for each language</li>
                <li>• Read-only mode for demonstrations</li>
                <li>• Perfect for programming courses and coding exercises</li>
              </ul>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Icon icon="mdi:lightbulb" className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-indigo-700">
                    <strong>Admin Tip:</strong> When reviewing courses, check that instructors are using appropriate content types for their learning objectives. The new interactive content types (Video, Audio, Code Sandbox) can significantly enhance student engagement and learning outcomes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'certificates',
      title: 'Certificate Management',
      icon: <Icon icon="mdi:certificate" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Certificates</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Certificate Templates</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to Admin → Certificates → Certificate Templates</li>
                <li>Click "Create Template" to design a new certificate</li>
                <li>Use the rich text editor or HTML code view</li>
                <li>Add template variables: {'{{'}student_name{'}}'}, {'{{'}course_name{'}}'}, etc.</li>
                <li>Upload logo and background images</li>
                <li>Preview certificate before saving</li>
                <li>Set a template as default for automatic issuance</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎓 Certificate Issuance</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Certificates are automatically issued when students complete courses</li>
                <li>• Each certificate has a unique verification code</li>
                <li>• Certificates are stored as PDF files in Supabase Storage</li>
                <li>• Students can download and share certificates</li>
                <li>• Public verification portal for certificate authenticity</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Managing Issued Certificates</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• View all issued certificates in Admin → Certificates → Manage Certificates</li>
                <li>• Search and filter certificates by student or course</li>
                <li>• Download certificate PDFs</li>
                <li>• Regenerate certificates if needed</li>
                <li>• View certificate verification codes</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      icon: <Icon icon="mdi:chart-bar" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">System Analytics</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Analytics Dashboard</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Access via Admin → Analytics</li>
                <li>• Daily Active Users (DAU) tracking</li>
                <li>• Course engagement metrics</li>
                <li>• Activity type breakdowns</li>
                <li>• Course completion rates</li>
                <li>• Student progress tracking</li>
                <li>• Top courses by enrollment</li>
                <li>• Time spent analysis</li>
                <li>• Quiz and assignment performance</li>
                <li>• Engagement trends over time</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📥 Exporting Data</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Export analytics data to CSV format</li>
                <li>• Filter data by date range</li>
                <li>• Download reports for specific metrics</li>
                <li>• Use exports for external analysis and reporting</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'email-notifications',
      title: 'Email Notifications',
      icon: <Icon icon="mdi:email" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Email System Configuration</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ Email Service Setup</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• System uses Resend API for email delivery</li>
                <li>• Configure RESEND_API_KEY in environment variables</li>
                <li>• Verify domain with Resend for production emails</li>
                <li>• Test email functionality from Admin → Test Email</li>
                <li>• Use onboarding@resend.dev for testing without domain verification</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📧 Email Templates</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Customize email templates for different notification types</li>
                <li>• Templates include: grade posted, assignment due, enrollment confirmation</li>
                <li>• Course announcements and discussion replies</li>
                <li>• Email digests (daily/weekly summaries)</li>
                <li>• Templates support variable substitution</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⏰ Scheduled Emails</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Assignment due reminders (sent before due dates)</li>
                <li>• Daily/weekly email digests</li>
                <li>• Configure cron jobs for scheduled tasks</li>
                <li>• Email rate limiting (2 requests/second with Resend)</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'global-discussions',
      title: 'Global Discussions',
      icon: <Icon icon="mdi:forum" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:new-box" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>New Feature!</strong> Platform-wide discussions enable community engagement beyond individual courses. Users can discuss academic topics, share resources, and connect with the broader learning community.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Managing Global Discussions</h3>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🌐 Overview</h4>
              <p className="text-sm text-gray-600 mb-3">Global Discussions provide a platform-wide discussion forum where all users can participate regardless of course enrollment.</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <strong>Categories:</strong> General, Academic Help, Campus Life, Career & Jobs, Tech Support, Announcements</li>
                <li>• <strong>Features:</strong> Threaded replies, upvoting/downvoting, pinning, locking discussions</li>
                <li>• <strong>Access:</strong> All authenticated users can view and participate</li>
                <li>• <strong>Moderation:</strong> Admins can delete inappropriate content and lock discussions</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🛡️ Moderation Tools</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Delete inappropriate discussions or replies - Admins can remove content that violates community guidelines or platform policies.</li>
                <li>Lock discussions - Prevent further replies to controversial or completed discussions while keeping the content visible.</li>
                <li>Pin important announcements - Keep critical information at the top of the discussions list for visibility.</li>
                <li>Monitor activity - Track discussion engagement and identify potential issues early.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Database Tables</h4>
              <p className="text-sm text-gray-600 mb-3">Global discussions are stored in the following database tables:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <code className="bg-gray-100 px-1 rounded">global_discussion_categories</code> - Discussion categories</li>
                <li>• <code className="bg-gray-100 px-1 rounded">global_discussions</code> - Main discussion threads</li>
                <li>• <code className="bg-gray-100 px-1 rounded">global_discussion_replies</code> - Threaded replies</li>
                <li>• <code className="bg-gray-100 px-1 rounded">global_discussion_votes</code> - Upvotes and downvotes</li>
                <li>• <code className="bg-gray-100 px-1 rounded">global_discussion_subscriptions</code> - User subscriptions for notifications</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'student-messaging',
      title: 'Student Messaging System',
      icon: <Icon icon="mdi:chat" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:new-box" className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>New Feature!</strong> Private messaging system for students and instructors. Supports direct messages, group chats, and file sharing.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Student Messaging System</h3>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💬 System Overview</h4>
              <p className="text-sm text-gray-600 mb-3">The messaging system enables private communication between platform users.</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <strong>Direct Messages:</strong> One-on-one private conversations between users</li>
                <li>• <strong>Group Chats:</strong> Multi-user chat rooms for study groups and project teams</li>
                <li>• <strong>Course Chats:</strong> Automatic chat rooms for enrolled course members</li>
                <li>• <strong>File Sharing:</strong> Users can attach files and images to messages</li>
                <li>• <strong>Real-time Updates:</strong> Messages delivered instantly via Supabase Realtime</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔒 Privacy & Safety</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>User blocking - Users can block other users to prevent unwanted messages. Blocked users cannot send messages or see the blocker's messages.</li>
                <li>Message privacy - Private messages are only visible to conversation participants. Admins do NOT have access to read private messages.</li>
                <li>Room-level security - Row-Level Security (RLS) policies ensure users can only access rooms they're members of.</li>
                <li>Soft delete - Deleted messages are marked as deleted but retained for audit purposes if needed.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Database Tables</h4>
              <p className="text-sm text-gray-600 mb-3">Student messaging uses the following database tables:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <code className="bg-gray-100 px-1 rounded">student_chat_rooms</code> - Chat rooms (direct, group, course, study_group types)</li>
                <li>• <code className="bg-gray-100 px-1 rounded">student_chat_members</code> - Room membership and roles</li>
                <li>• <code className="bg-gray-100 px-1 rounded">student_chat_messages</code> - Messages with file attachment support</li>
                <li>• <code className="bg-gray-100 px-1 rounded">student_chat_reactions</code> - Emoji reactions on messages</li>
                <li>• <code className="bg-gray-100 px-1 rounded">student_chat_blocked_users</code> - User blocking for safety</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ Realtime Configuration</h4>
              <p className="text-sm text-gray-600 mb-3">For real-time messaging to work, ensure the following is configured in Supabase:</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Enable Realtime for <code className="bg-gray-100 px-1 rounded">student_chat_messages</code> table in Supabase Dashboard → Database → Replication</li>
                <li>Verify RLS policies are enabled and working correctly</li>
                <li>Check that helper functions (<code className="bg-gray-100 px-1 rounded">is_student_chat_member</code>, <code className="bg-gray-100 px-1 rounded">is_student_chat_admin</code>) exist with SECURITY DEFINER</li>
              </ol>
            </div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:alert" className="h-5 w-5 text-orange-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>Privacy Note:</strong> Administrators should respect user privacy. The messaging system is designed so that admins cannot read private conversations between users. Only intervene if users report serious violations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      icon: <Icon icon="mdi:cog" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ General Settings</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Configure site branding and customization</li>
                <li>• Set system-wide notification preferences</li>
                <li>• Manage feature flags and toggles</li>
                <li>• Configure file upload limits</li>
                <li>• Set default course settings</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔒 Security Settings</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Manage password policies</li>
                <li>• Configure session timeouts</li>
                <li>• Set up rate limiting rules</li>
                <li>• Monitor security logs and events</li>
                <li>• Configure two-factor authentication (if enabled)</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💾 Storage & Media</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Manage Supabase Storage buckets</li>
                <li>• Configure certificate storage permissions</li>
                <li>• Set media upload size limits</li>
                <li>• Manage file retention policies</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'programmes',
      title: 'Programmes Management',
      icon: <Icon icon="material-symbols:school" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:new-box" className="h-5 w-5 text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-purple-700">
                  <strong>New Feature!</strong> Programmes are structured collections of courses that students complete to earn a programme certificate with an aggregated score.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Managing Programmes</h3>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Creating Programmes</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to Admin → Programmes</li>
                <li>Click &quot;Create Programme&quot;</li>
                <li>Enter programme name, description, and passing score requirement</li>
                <li>Add courses to the programme and set their weights</li>
                <li>Configure programme image and category</li>
                <li>Publish when ready for enrollment</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚖️ How Programme Scoring Works</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Each course in a programme has a weight (percentage)</li>
                <li>Student&apos;s final score = weighted average of all course grades</li>
                <li>Students must complete all required courses</li>
                <li>Students must meet the passing score to complete the programme</li>
                <li>Programme certificates show the final weighted score</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👥 Managing Programme Enrollments</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View enrolled students from the programme details page</li>
                <li>Track student progress through programme courses</li>
                <li>See completion status and final scores</li>
                <li>Students are auto-enrolled in programme courses when they enroll in the programme</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Database Structure</h4>
              <p className="text-sm text-gray-600 mb-2">Programmes use the following tables:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li><code className="bg-gray-100 px-1 rounded">programmes</code> - Programme definitions</li>
                <li><code className="bg-gray-100 px-1 rounded">programme_courses</code> - Courses in programmes with weights</li>
                <li><code className="bg-gray-100 px-1 rounded">programme_enrollments</code> - Student enrollments and progress</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'learning-paths',
      title: 'Learning Paths',
      icon: <Icon icon="mdi:road-variant" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Learning Paths</h3>
          <p className="text-sm text-gray-700">Learning Paths are curated sequences of courses designed to help learners master specific skills or topics.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🛤️ Creating Learning Paths</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to Admin → Learning Paths</li>
                <li>Click &quot;Create Learning Path&quot;</li>
                <li>Enter path name, description, and category</li>
                <li>Add courses in the recommended completion order</li>
                <li>Set prerequisites between courses (optional)</li>
                <li>Configure path image and estimated duration</li>
                <li>Publish the learning path</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ Configuring Prerequisites</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Set which courses must be completed before others</li>
                <li>Create sequential or branching learning paths</li>
                <li>Students see locked courses until prerequisites are met</li>
                <li>Prerequisites ensure proper knowledge building</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📈 Tracking Path Progress</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>View overall path enrollment statistics</li>
                <li>See completion rates for each course in the path</li>
                <li>Identify where students commonly drop off</li>
                <li>Track average completion time</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'categories',
      title: 'Course Categories',
      icon: <Icon icon="mdi:folder-multiple" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Course Categories</h3>
          <p className="text-sm text-gray-700">Organize courses into hierarchical categories to help students find relevant content.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📁 Creating Categories</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to Admin → Categories</li>
                <li>Click &quot;Add Category&quot;</li>
                <li>Enter category name and optional description</li>
                <li>Set parent category for nested organization (optional)</li>
                <li>Configure display order</li>
                <li>Save the category</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🏷️ Assigning Categories to Courses</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Edit a course to assign categories</li>
                <li>Courses can belong to multiple categories</li>
                <li>Categories appear in course filters and navigation</li>
                <li>Students can browse courses by category</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Category Hierarchy</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Create parent and child categories</li>
                <li>Example: Technology → Programming → Python</li>
                <li>Child categories inherit visibility from parents</li>
                <li>Courses in child categories also appear in parent</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <Icon icon="mdi:alert-circle" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Common Admin Issues</h3>
          
          <div className="space-y-3">
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-900 mb-2">❌ Email Not Sending</h4>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>• Verify RESEND_API_KEY is set in environment variables</li>
                <li>• Check domain verification status in Resend dashboard</li>
                <li>• Test email functionality from Admin → Test Email</li>
                <li>• Check rate limits (2 requests/second)</li>
                <li>• Review email logs for delivery errors</li>
              </ul>
            </div>

            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Certificate Generation Issues</h4>
              <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                <li>• Verify Supabase Storage bucket permissions</li>
                <li>• Check certificate template syntax</li>
                <li>• Ensure course completion criteria are met</li>
                <li>• Review certificate generation logs</li>
                <li>• Manually trigger certificate generation if needed</li>
              </ul>
            </div>

            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">ℹ️ Analytics Not Updating</h4>
              <ul className="text-sm text-blue-700 space-y-1 ml-4">
                <li>• Refresh materialized views if needed</li>
                <li>• Check database connection status</li>
                <li>• Verify student activity logging is enabled</li>
                <li>• Clear analytics cache if data seems stale</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const q = searchQuery.trim().toLowerCase();
  const filteredSections = helpSections.filter(section => {
    if (!q) return true;
    return section.title.toLowerCase().includes(q) || section.id.toLowerCase().includes(q);
  });

  const currentSection = helpSections.find(section => section.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Icon icon="mdi:help-circle" className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Admin Help Center</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <div className="mb-6">
                <AISearchBox 
                  onSearch={(query) => {
                    setSearchQuery(query);
                    handleAISearch(query);
                  }}
                  placeholder="Search help topics or ask AI..."
                />
              </div>

              <nav className="space-y-1">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => selectSection(section.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-500'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{section.title}</span>
                    </div>
                    {activeSection === section.id && (
                      <Icon icon="mdi:check" className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <AIHelpEnhancement 
                onAISearch={handleAISearch}
                currentPage="/help/admin"
                userRole="admin"
              />
              
              {currentSection ? (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        {currentSection.icon}
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">{currentSection.title}</h1>
                      </div>
                    </div>
                  </div>

                  {/* Section Content */}
                  <div className="prose prose-lg max-w-none">
                    {currentSection.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Icon icon="mdi:help-circle" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No help topic selected</h3>
                  <p className="text-gray-600">Choose a topic from the sidebar to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Widget */}
      {showAIChat && (
        <AIChatWidget 
          currentPage="/help/admin"
          context={{ userRole: 'admin', activeSection }}
        />
      )}
    </div>
  );
}
