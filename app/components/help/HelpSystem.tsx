'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  subsections?: HelpSection[];
}

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export default function HelpSystem({ isOpen, onClose, userRole = 'student' }: HelpSystemProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Icon icon="mdi:book-open" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Welcome to the OECS Learning Management System!</strong> This guide will help you navigate and use all the features available to you.
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
                  <p className="font-medium">Complete your profile</p>
                  <p className="text-sm text-gray-600">Add your bio, avatar, and learning preferences</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Browse available courses</p>
                  <p className="text-sm text-gray-600">Explore courses in the "Courses" section</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Enroll in courses</p>
                  <p className="text-sm text-gray-600">Click "Enroll" on courses that interest you</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Access your dashboard</p>
                  <p className="text-sm text-gray-600">View your enrolled courses and progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Navigation & Interface',
      icon: <Icon icon="mdi:cog" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Main Navigation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Dashboard</h4>
              <p className="text-sm text-gray-600">Your personal learning hub with course progress, assignments, and announcements.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Courses</h4>
              <p className="text-sm text-gray-600">Browse and enroll in available courses.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">My Courses</h4>
              <p className="text-sm text-gray-600">View your enrolled courses and track progress.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Profile</h4>
              <p className="text-sm text-gray-600">Manage your account settings and preferences.</p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:alert-circle" className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Tip:</strong> Use the search bar at the top to quickly find courses, lessons, or any content.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'courses',
      title: 'Courses & Learning',
      icon: <Icon icon="mdi:book-open" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Course Features</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Course Content Types (12 Available)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">1. 📝 Text Content</strong> - Rich text with formatting
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">2. 🎥 Video</strong> - YouTube, Vimeo, embedded videos
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">3. 🎬 Interactive Video</strong> - Videos with questions at checkpoints
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">4. 🎵 Audio/Podcast</strong> - Audio files with player controls
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">5. 💻 Code Sandbox</strong> - Interactive code editor and execution
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">6. 🖼️ Images</strong> - Image uploads and displays
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">7. 📄 PDF Documents</strong> - PDF uploads and viewers
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">8. 📎 File Uploads</strong> - Any file type for download
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">9. 🔗 Embedded Content</strong> - External content embedding
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">10. 📊 Slideshows</strong> - Presentation embeds
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">11. ❓ Quizzes</strong> - Interactive assessments
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">12. 📋 Assignments</strong> - Student work tasks
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Interactive Features:</strong> Code Sandbox allows you to write and run code in multiple languages. 
                  Interactive Video pauses at checkpoints to ask questions. Audio content includes transcripts for accessibility.
                </p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Assignments & Quizzes</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Submit assignments and track grades</li>
                <li>• Take quizzes to test your knowledge</li>
                <li>• View detailed feedback from instructors</li>
                <li>• Track your performance over time</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💬 Discussions</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Participate in course discussions</li>
                <li>• Ask questions and get help from peers</li>
                <li>• Share insights and collaborate</li>
                <li>• Connect with instructors and classmates</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:check-circle" className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Best Practice:</strong> Complete lessons in order and participate in discussions to get the most out of your learning experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'video-conferences',
      title: 'Video Conferences',
      icon: <Icon icon="mdi:video" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Video Conference Features</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎥 Joining Conferences</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Click "Join Conference" on scheduled meetings</li>
                <li>• Conferences open in a new tab for better experience</li>
                <li>• No additional software installation required</li>
                <li>• Works on desktop and mobile devices</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📅 Scheduling (Instructors Only)</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Schedule meetings for specific lessons or courses</li>
                <li>• Set meeting duration and participant limits</li>
                <li>• Enable/disable recording and waiting room features</li>
                <li>• Send meeting links to participants</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔧 Conference Types</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-medium text-blue-900">8x8.vc (Jitsi Meet)</p>
                  <p className="text-xs text-blue-700">High-quality video conferencing with advanced features</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="font-medium text-green-900">Google Meet</p>
                  <p className="text-xs text-green-700">Familiar interface with Google integration</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Pro Tip:</strong> Test your camera and microphone before joining important conferences.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'assignments',
      title: 'Assignments & Quizzes',
      icon: <Icon icon="mdi:file-document" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Assignment & Quiz System</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Submitting Assignments</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to the assignment in your course</li>
                <li>Read the instructions carefully</li>
                <li>Upload your files or provide your response</li>
                <li>Click "Submit Assignment"</li>
                <li>Track your submission status and grades</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🧠 Taking Quizzes</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click on the quiz you want to take</li>
                <li>Read all questions carefully</li>
                <li>Select your answers (multiple choice, true/false, etc.)</li>
                <li>Review your answers before submitting</li>
                <li>Submit and view your results</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Tracking Progress</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• View grades and feedback in your dashboard</li>
                <li>• Track completion status for all assignments</li>
                <li>• See quiz scores and attempt history</li>
                <li>• Monitor overall course progress</li>
              </ul>
            </div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:alert-circle" className="h-5 w-5 text-orange-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>Important:</strong> Always check due dates and submit assignments on time. Late submissions may not be accepted.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'discussions',
      title: 'Discussions & Communication',
      icon: <Icon icon="mdi:message" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Discussion Features</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💬 Participating in Discussions</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Click on discussion topics to read and respond</li>
                <li>• Post questions and share insights</li>
                <li>• Reply to other students' posts</li>
                <li>• Use @mentions to notify specific users</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📧 Contacting Instructors</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Use the email icon next to instructor names</li>
                <li>• Pre-filled subject and body for course inquiries</li>
                <li>• Opens your default email client</li>
                <li>• Professional communication is encouraged</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👥 Course Team</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• View all course instructors and their roles</li>
                <li>• See instructor contact information</li>
                <li>• Understand who to contact for different issues</li>
                <li>• Access to course support team</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-purple-700">
                  <strong>Community Guidelines:</strong> Be respectful, constructive, and helpful in all discussions. This creates a positive learning environment for everyone.
                </p>
              </div>
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
          <h3 className="text-lg font-semibold text-gray-900">Common Issues & Solutions</h3>
          
          <div className="space-y-3">
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-900 mb-2">❌ Page Not Loading</h4>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>• Refresh the page (Ctrl+F5 or Cmd+Shift+R)</li>
                <li>• Clear your browser cache and cookies</li>
                <li>• Check your internet connection</li>
                <li>• Try a different browser</li>
              </ul>
            </div>

            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Video Conference Issues</h4>
              <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                <li>• Allow camera and microphone permissions</li>
                <li>• Check your internet connection speed</li>
                <li>• Try refreshing the conference page</li>
                <li>• Use Chrome or Firefox for best compatibility</li>
              </ul>
            </div>

            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">ℹ️ Assignment Submission Issues</h4>
              <ul className="text-sm text-blue-700 space-y-1 ml-4">
                <li>• Check file size limits (usually 10MB max)</li>
                <li>• Ensure file format is supported (PDF, DOC, DOCX, etc.)</li>
                <li>• Verify you're logged in properly</li>
                <li>• Contact instructor if problems persist</li>
              </ul>
            </div>

            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-medium text-green-900 mb-2">✅ Login Problems</h4>
              <ul className="text-sm text-green-700 space-y-1 ml-4">
                <li>• Use the "Forgot Password" link if needed</li>
                <li>• Check your email for account verification</li>
                <li>• Ensure you're using the correct email address</li>
                <li>• Contact support if account is locked</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border-l-4 border-gray-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:help-circle" className="h-5 w-5 text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  <strong>Still having issues?</strong> Contact your course instructor or the system administrator for additional support.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Add role-specific sections
  if (userRole === 'instructor' || userRole === 'curriculum_designer' || userRole === 'admin' || userRole === 'super_admin') {
    helpSections.push({
      id: 'instructor-features',
      title: 'Instructor Features',
      icon: <Icon icon="mdi:account-group" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Instructor Tools & Features</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Course Management</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Create and edit course content</li>
                <li>• Add lessons, assignments, and quizzes</li>
                <li>• Manage course enrollment and participants</li>
                <li>• Track student progress and engagement</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✏️ Content Creation</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Use the rich text editor for lesson content</li>
                <li>• Upload and manage course materials (12 content types available)</li>
                <li>• Create interactive quizzes and assignments</li>
                <li>• Add Code Sandbox for programming exercises</li>
                <li>• Create Interactive Videos with embedded questions</li>
                <li>• Upload Audio content with transcripts</li>
                <li>• Schedule video conferences and meetings</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-900 mb-1">New Content Types:</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4">
                  <li>• <strong>Code Sandbox:</strong> Interactive code editor supporting JavaScript, Python, HTML/CSS, and more</li>
                  <li>• <strong>Interactive Video:</strong> Add questions at specific timestamps for engagement</li>
                  <li>• <strong>Audio/Podcast:</strong> Audio content with playback controls and transcript support</li>
                </ul>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Grading & Feedback</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Grade assignments and provide feedback</li>
                <li>• View quiz results and analytics</li>
                <li>• Track student participation in discussions</li>
                <li>• Generate progress reports</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎥 Video Conferences</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Schedule meetings for specific lessons</li>
                <li>• Set up recurring conference sessions</li>
                <li>• Manage participant access and permissions</li>
                <li>• Record sessions for later viewing</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
              <h4 className="font-medium text-gray-900 mb-2">🤝 Lecturer Collaboration</h4>
              <p className="text-sm text-gray-600 mb-3">Connect and collaborate with fellow lecturers through dedicated collaboration tools.</p>
              
              <div className="space-y-3 mt-3">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-1 flex items-center">
                    <Icon icon="mdi:forum" className="w-4 h-4 mr-2 text-purple-600" />
                    Lecturer Forums
                  </h5>
                  <ul className="text-xs text-gray-600 space-y-1 ml-6">
                    <li>• Create and participate in discussion forums</li>
                    <li>• Organize discussions by categories (Pedagogy, Technology, Assessment, etc.)</li>
                    <li>• Post questions, share ideas, and get feedback</li>
                    <li>• Vote on posts and replies to highlight valuable content</li>
                    <li>• Reply to posts and engage in threaded discussions</li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-1 flex items-center">
                    <Icon icon="mdi:library" className="w-4 h-4 mr-2 text-blue-600" />
                    Resource Sharing Hub
                  </h5>
                  <ul className="text-xs text-gray-600 space-y-1 ml-6">
                    <li>• Upload educational resources (documents, presentations, videos, etc.)</li>
                    <li>• Browse and search resources shared by other lecturers</li>
                    <li>• Rate resources to help others find quality materials</li>
                    <li>• Bookmark favorite resources for quick access</li>
                    <li>• Filter by subject, type, and rating</li>
                    <li>• Download resources to use in your courses</li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-1 flex items-center">
                    <Icon icon="mdi:chat" className="w-4 h-4 mr-2 text-green-600" />
                    Virtual Staff Room
                  </h5>
                  <ul className="text-xs text-gray-600 space-y-1 ml-6">
                    <li>• Real-time chat with other lecturers</li>
                    <li>• Create and join chat rooms for different topics or departments</li>
                    <li>• Send messages, share files, and react to messages</li>
                    <li>• Reply to specific messages in threaded conversations</li>
                    <li>• Manage room members and permissions</li>
                    <li>• Receive instant notifications for new messages</li>
                  </ul>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Access:</strong> Navigate to "Lecturer Collaboration" in the main menu to access Forums, Resource Library, and Staff Room.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-indigo-700">
                  <strong>Pro Tip:</strong> Use the lesson stream to quickly access and manage all course content from one central location.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    });
  }

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content?.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Help Center</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-4">
              <div className="relative">
                <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search help topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {filteredSections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      setActiveSection(section.id);
                      toggleSection(section.id);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {section.icon}
                      <span className="font-medium">{section.title}</span>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <Icon icon="mdi:chevron-down" className="w-4 h-4" />
                    ) : (
                      <Icon icon="mdi:chevron-right" className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <div className="p-8">
            {filteredSections.find(s => s.id === activeSection)?.content || (
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
  );
}
