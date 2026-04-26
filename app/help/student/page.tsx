'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import AIChatWidget from '@/app/components/ai/AIChatWidget';
import AIHelpEnhancement from '@/app/components/ai/AIHelpEnhancement';
import AISearchBox from '@/app/components/ai/AISearchBox';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function StudentHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInitialMessage, setAiInitialMessage] = useState('');
  const [aiMessageKey, setAiMessageKey] = useState(0);

  const selectSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleAISearch = (query: string) => {
    const q = (query || '').trim().toLowerCase();
    if (q) {
      const firstMatch = helpSections.find(s => s.title.toLowerCase().includes(q));
      if (firstMatch) setActiveSection(firstMatch.id);
    }
    setAiInitialMessage(query || '');
    setAiMessageKey(k => k + 1);
    setShowAIChat(true);
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
                  <strong>Welcome, Student!</strong> This guide will help you navigate the LMS and make the most of your learning experience.
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
                  <p className="text-sm text-gray-600">Add your bio, avatar, and learning preferences in Profile settings</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Browse available courses</p>
                  <p className="text-sm text-gray-600">Visit the "Courses" section to explore available courses</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Enroll in courses</p>
                  <p className="text-sm text-gray-600">Click "Enroll" on any course that interests you</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Access your dashboard</p>
                  <p className="text-sm text-gray-600">View enrolled courses, assignments, and progress from your Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'enrolling',
      title: 'Enrolling in Courses',
      icon: <Icon icon="mdi:school" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">How to Enroll in Courses</h3>
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Finding Courses</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Go to the "Courses" page from the main navigation</li>
                <li>Browse featured courses on the homepage</li>
                <li>Use the search bar to find specific courses</li>
                <li>Filter by difficulty level or category</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✏️ Enrollment Process</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click on a course to view details</li>
                <li>Review course description, objectives, and requirements</li>
                <li>Click the "Enroll" button</li>
                <li>Access enrolled courses from "My Courses"</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'programmes',
      title: 'Learning Programmes',
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
                  <strong>New Feature!</strong> Programmes are structured learning paths that group multiple courses together. Complete all courses in a programme to earn a programme certificate with an aggregated final score.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">What are Programmes?</h3>
          <p className="text-sm text-gray-700">Programmes are curated collections of courses designed to help you master a specific topic or skill area. Each programme has a passing score requirement, and your final programme score is calculated as a weighted average of all course grades.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Finding Programmes</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Go to the "Programmes" page from the main navigation or dashboard</li>
                <li>Browse available programmes by category or difficulty</li>
                <li>Use the search bar to find specific programmes</li>
                <li>View programme details including courses, duration, and passing requirements</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✏️ Enrolling in a Programme</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click on a programme to view its details</li>
                <li>Review the programme description and course list</li>
                <li>Check the passing score requirement (e.g., 70%)</li>
                <li>Click "Enroll Now" to join the programme</li>
                <li>You'll be automatically enrolled in all programme courses</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Tracking Your Progress</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View your enrolled programmes on the Dashboard under "My Programmes"</li>
                <li>See progress bars showing how many courses you've completed</li>
                <li>Track your current weighted score compared to the passing requirement</li>
                <li>Click on a programme to see detailed progress for each course</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎓 Programme Completion</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Complete all required courses in the programme</li>
                <li>Achieve the minimum passing score (weighted average of all course grades)</li>
                <li>Your final programme score is calculated automatically</li>
                <li>Programme status changes to "Completed" when you meet all requirements</li>
              </ol>
            </div>

            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">💡 How Scoring Works</h4>
              <p className="text-sm text-blue-700 mb-2">Your programme score is a weighted average of your course grades:</p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                <li>Each course has a weight (shown as a percentage)</li>
                <li>Your grade in each course is multiplied by its weight</li>
                <li>The weighted grades are summed to get your final score</li>
                <li>You must complete all required courses and meet the passing score</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Tip:</strong> Focus on doing well in courses with higher weights, as they have a bigger impact on your final programme score!
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'course-content',
      title: 'Course Content Types',
      icon: <Icon icon="mdi:book-open-variant" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Understanding Course Content</h3>
          <p className="text-sm text-gray-700">Courses include various types of content to support your learning. Here's what you'll encounter:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Text Content</h4>
              <p className="text-sm text-gray-600">Rich text with formatting, instructions, and reading materials.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎥 Video</h4>
              <p className="text-sm text-gray-600">Embedded videos from YouTube, Vimeo, or uploaded video files.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">🎬 Interactive Video (NEW)</h4>
              <p className="text-sm text-blue-700">Videos that pause at checkpoints to ask questions. Answer to continue watching and track your progress.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-purple-50">
              <h4 className="font-medium text-purple-900 mb-2">🎵 Audio/Podcast (NEW)</h4>
              <p className="text-sm text-purple-700">Audio content with playback controls, speed adjustment, and optional transcripts for accessibility.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-emerald-50">
              <h4 className="font-medium text-emerald-900 mb-2">💻 Code Sandbox (NEW)</h4>
              <p className="text-sm text-emerald-700">Interactive code editor where you can write, edit, and run code in multiple languages (JavaScript, Python, HTML/CSS, etc.).</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🖼️ Images</h4>
              <p className="text-sm text-gray-600">Images and visual content to support learning.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📄 PDF Documents</h4>
              <p className="text-sm text-gray-600">PDF files you can view and download.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📎 Files</h4>
              <p className="text-sm text-gray-600">Downloadable files and resources.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔗 Embedded Content</h4>
              <p className="text-sm text-gray-600">External interactive content and tools.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Slideshows</h4>
              <p className="text-sm text-gray-600">Presentation slides and visual materials.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">❓ Quizzes</h4>
              <p className="text-sm text-gray-600">Interactive assessments to test your knowledge.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📋 Assignments</h4>
              <p className="text-sm text-gray-600">Tasks and projects to submit for grading.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-indigo-50">
              <h4 className="font-medium text-indigo-900 mb-2">🧊 3D Model (NEW)</h4>
              <p className="text-sm text-indigo-700">An interactive 3D viewer you can rotate, zoom, and view in <strong>fullscreen</strong>. On mobile, tap <strong>View in AR</strong> to drop the model into your real environment via your phone&apos;s camera.</p>
            </div>
          </div>

          <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-indigo-700">
                  <strong>Tip:</strong> Interactive content like Code Sandbox, Interactive Video, and the 3D Model viewer provide hands-on learning experiences. Take advantage of these features to deepen your understanding!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:format-list-bulleted-square" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Learning Outcomes sidebar:</strong> On lessons that have learning outcomes attached, the outcomes panel now opens by default on desktop so you can see what you&apos;re aiming for as you work through the page. Collapse it if you want a wider reading view.
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
          <h3 className="text-lg font-semibold text-gray-900">Submitting Assignments & Taking Quizzes</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Submitting Assignments</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to the assignment in your course</li>
                <li>Read instructions and requirements carefully</li>
                <li>Upload your files (PDF, DOC, DOCX up to 10MB)</li>
                <li>Add any additional comments or notes</li>
                <li>Click "Submit Assignment" before the due date</li>
                <li>Track submission status and view grades</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🧠 Taking Quizzes</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click on the quiz from your course page</li>
                <li>Read all questions thoroughly</li>
                <li>Select your answers (multiple choice, true/false, etc.)</li>
                <li>Review your answers before submitting</li>
                <li>Submit and view your results immediately</li>
                <li>Check instructor feedback if available</li>
              </ol>
            </div>

            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-900 mb-2">🔒 Safe Browser Mode (Proctored Quizzes)</h4>
              <p className="text-sm text-red-700 mb-3">Some quizzes use Safe Browser Mode to ensure academic integrity. Here's what you need to know:</p>
              <ol className="text-sm text-red-700 space-y-1 ml-4 list-decimal">
                <li><strong>Consent Screen:</strong> Before starting, you'll see a consent screen explaining the proctoring requirements. Click "I Understand, Start Quiz" to begin.</li>
                <li><strong>Fullscreen Mode:</strong> The quiz will enter fullscreen mode automatically. Stay in fullscreen until you submit.</li>
                <li><strong>Monitoring:</strong> The system monitors for:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Switching to other tabs or windows</li>
                    <li>Exiting fullscreen mode</li>
                    <li>Right-clicking or using keyboard shortcuts</li>
                    <li>Copy/paste attempts</li>
                  </ul>
                </li>
                <li><strong>Violation Warnings:</strong> If you accidentally trigger a violation, you'll see a warning with your current violation count. Most quizzes allow 3 violations before auto-submit.</li>
                <li><strong>Auto-Submit:</strong> If you exceed the maximum violations, your quiz will be automatically submitted with your current answers.</li>
              </ol>
              <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
                <strong>Tips for Success:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Close all other browser tabs and applications before starting</li>
                  <li>Ensure you have a stable internet connection</li>
                  <li>Use a desktop or laptop computer (not a mobile device)</li>
                  <li>Don't use your browser's back button - use the quiz navigation instead</li>
                  <li>If you need to step away, submit your quiz first</li>
                </ul>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Viewing Grades</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Check your Dashboard for recent grades - The dashboard displays your most recent grades in the "Recent Grades" widget, making it easy to see feedback on your latest submissions.</li>
                <li>View detailed grades in the course Gradebook - Each course has a dedicated Gradebook section where you can see all your assignment and quiz scores, track your progress throughout the course, and identify areas where you may need to improve.</li>
                <li>Receive email notifications when grades are posted - You'll automatically receive an email notification whenever an instructor posts a grade, so you don't have to constantly check the platform for updates.</li>
                <li>Track your overall course progress - The Gradebook shows your cumulative grade, completion percentage, and how you're performing relative to course requirements, helping you stay on track to complete the course successfully.</li>
              </ol>
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
      id: 'certificates',
      title: 'Certificates & Achievements',
      icon: <Icon icon="mdi:certificate" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Earning Certificates</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎓 Earning a Certificate</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Complete all required lessons in a course - Each course has specific lessons that must be completed. Make sure you've viewed all lesson content, watched any embedded videos, and read through all materials. You can track your progress in the course overview.</li>
                <li>Submit all assignments and pass all quizzes - Assignments must be submitted before their due dates, and quizzes must be completed with a passing score (typically 60% or higher, depending on course settings). Review your Gradebook to ensure all items are marked as complete.</li>
                <li>Achieve the minimum passing grade (if applicable) - Some courses require a minimum overall grade (often 70% or higher) to qualify for a certificate. Check the course requirements to understand the specific passing criteria.</li>
                <li>Certificates are automatically issued upon completion - Once you meet all requirements, the system automatically generates your certificate. You'll receive an email notification when it's ready, and it will appear in your profile's certificate section.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📥 Accessing Certificates</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Go to "Profile" → "Certificates" - Navigate to your profile page by clicking your name or avatar in the top navigation, then select the "Certificates" tab to see all certificates you've earned across different courses.</li>
                <li>Download certificates as PDF files - Each certificate can be downloaded as a professional PDF document that you can save to your computer, print, or attach to job applications. The PDF includes course details and your verification code.</li>
                <li>Share certificates on LinkedIn - Use the "Share on LinkedIn" button to create a professional post highlighting your achievement. This helps showcase your learning accomplishments to your professional network and potential employers.</li>
                <li>Verify certificate authenticity using verification codes - Each certificate includes a unique verification code that employers or others can use to confirm the certificate is legitimate. Share this code along with your certificate when needed.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔗 Sharing Certificates</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click "Share on LinkedIn" to post your achievement - This feature automatically formats a professional post with your certificate details, including the course name and completion date, making it easy to share with your professional network.</li>
                <li>Copy the verification link to share with employers - Each certificate has a unique verification URL that you can copy and send to employers. When they visit the link, they can verify that your certificate is authentic and view course completion details.</li>
                <li>Anyone can verify your certificate using the verification code - The verification system is public, meaning anyone with the code can verify your certificate's authenticity. This adds credibility to your achievements and helps employers trust your credentials.</li>
              </ol>
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
          <h3 className="text-lg font-semibold text-gray-900">Participating in Discussions</h3>

          <div className="space-y-3">
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">🌐 Global Discussions (NEW)</h4>
              <p className="text-sm text-blue-700 mb-3">Connect with the entire learning community through platform-wide discussions. These are not tied to any specific course - anyone can participate!</p>
              <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                <li>Access Global Discussions from the "Discussions" link in the main navigation - Click on "Discussions" in the navbar to see all platform-wide discussion threads organized by category.</li>
                <li>Browse discussions by category - Filter discussions by topics like General, Academic Help, Campus Life, Career & Jobs, Tech Support, and Announcements to find conversations that interest you.</li>
                <li>Create new discussion threads - Click "New Discussion" to start a conversation about any topic. Choose a category, write a descriptive title, and share your thoughts or questions with the community.</li>
                <li>Upvote and downvote posts - Show appreciation for helpful discussions by upvoting them. Highly upvoted discussions appear more prominently, helping the best content rise to the top.</li>
                <li>Reply with threaded comments - Join the conversation by replying to discussions. Replies are threaded, making it easy to follow different conversation branches.</li>
                <li>Search for specific topics - Use the search bar to find discussions about specific subjects, keywords, or questions you have.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💬 Course Discussions</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access discussions from the course page - Each course has a dedicated "Discussions" tab where you can view all discussion threads. Navigate to your course and click on the Discussions tab to see topics created by your instructor and classmates.</li>
                <li>Read posts from instructors and classmates - Discussions are a great way to learn from others. Instructors often post questions to spark conversation, and your classmates may share insights or ask questions that help clarify course material for everyone.</li>
                <li>Post questions and share insights - Don't hesitate to ask questions or share your thoughts about course material. Active participation in discussions can help deepen your understanding and may even earn you XP points for engagement.</li>
                <li>Reply to other students' posts - When you see questions from classmates that you can answer, or if you want to add to the conversation, use the reply feature. This builds a collaborative learning community and helps everyone succeed.</li>
                <li>Use @mentions to notify specific users - If you want to direct a question to a specific person (like your instructor or a classmate), type @ followed by their username. They'll receive an email notification about your mention, ensuring they see your message.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📧 Contacting Instructors</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Use the email icon next to instructor names - Throughout the platform, you'll see email icons next to instructor names. Clicking this icon opens your default email client with a pre-formatted message, making it easy to reach out for help.</li>
                <li>Pre-filled subject and body for course inquiries - The email includes a professional subject line and greeting that identifies you as a student in their course. You can customize the message with your specific question or concern.</li>
                <li>Opens your default email client - The system opens your computer's default email application (like Outlook, Gmail, or Apple Mail) so you can send the message immediately. Make sure you have an email client configured on your device.</li>
                <li>Professional communication is encouraged - When contacting instructors, use a professional tone, be clear about your question or concern, and include relevant details. This helps instructors provide you with the best assistance possible.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📢 Course Announcements</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Check the "Announcements" section in each course - Instructors post important updates, schedule changes, assignment reminders, and other critical information in the Announcements tab. Make it a habit to check this section regularly, especially at the start of each week.</li>
                <li>Important updates from instructors appear here - Announcements might include deadline extensions, additional resources, clarification on assignments, exam schedules, or changes to the course structure. Missing announcements could impact your performance.</li>
                <li>Receive email notifications for new announcements - You'll automatically receive an email whenever your instructor posts a new announcement. The email includes the announcement title and a preview, with a link to view the full message on the platform.</li>
                <li>Pinned announcements appear at the top - Instructors can "pin" especially important announcements (like course policies or semester schedules) so they always appear at the top of the list, making them easy to find even as new announcements are posted.</li>
              </ol>
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
      id: 'messaging',
      title: 'Private Messaging',
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
                  <strong>New Feature!</strong> Send private messages to other students and instructors. Create direct conversations or group chats for study groups and project collaboration.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Private Messaging</h3>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💬 Direct Messages</h4>
              <p className="text-sm text-gray-600 mb-3">Send private one-on-one messages to other students, instructors, or staff members.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access Messages from the chat icon in the navbar — click it to open the messaging centre, where all your rooms appear sorted by most recent activity.</li>
                <li>Start a new conversation — click <strong>New Message</strong>, search by name or email, and select someone to open a private DM room.</li>
                <li>Send text, files, or images — type and press Enter, or attach a file/image with the paperclip icon (great for sharing notes or screenshots).</li>
                <li>Reply to a specific message — click the reply action on any message to thread your response under it.</li>
                <li>Unread badge — each room shows your personal unread count, which resets when you open the room.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👥 Group Chats</h4>
              <p className="text-sm text-gray-600 mb-3">Create group conversations for study groups, project teams, or any group of people you want to communicate with together.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create a group chat — click <strong>New Message</strong>, switch to <strong>Group</strong> mode, and give it a name like &quot;Math Study Group&quot; or &quot;Project Team&quot;.</li>
                <li>Add members — search and add multiple users at once. You can add classmates and instructors.</li>
                <li>Roles — the room creator becomes the <strong>owner</strong> and can promote others to <strong>admin</strong>. Admins manage the member list; everyone else is a regular member.</li>
                <li>Mute or leave — mute a noisy room without leaving it, or leave any group from the room settings.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎓 Course Rooms (Auto-Created)</h4>
              <p className="text-sm text-gray-600 mb-3">Every course you&apos;re enrolled in automatically has its own course chat room. The membership tracks the course&apos;s enrolment list — when someone joins or leaves the course, the room updates to match.</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>Open a course chat from the course detail page or from your messages list.</li>
                <li>Use it for class-wide questions, study coordination, or asking your instructor in front of the rest of the cohort.</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📍 &quot;Online Now&quot; on the Course Page</h4>
              <p className="text-sm text-gray-600 mb-3">Each course detail page has a collapsible <strong>Online Now</strong> card showing classmates who&apos;ve been active recently.</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>Click <strong>Message</strong> next to anyone&apos;s name to jump straight into a DM with them — if you don&apos;t already have one, the room is created on the spot.</li>
                <li>Anyone you&apos;ve blocked is hidden from this list.</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🚫 Blocking &amp; Privacy</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li><strong>Block a user</strong> — opens the user&apos;s profile or DM and blocks them. After blocking: you can&apos;t open new DMs with them, and any messages they send to existing rooms are hidden from your view.</li>
                <li>Unblock from your account settings to restore the conversation.</li>
                <li><strong>Privacy</strong> — DMs and group rooms are only visible to participants. Admins cannot read private rooms; admin tooling stops at the room metadata (name, member list, message counts) for moderation purposes.</li>
                <li><strong>Reporting</strong> — if you receive harassment or inappropriate content, report it to your administrator with a screenshot of the message ID.</li>
              </ol>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Pro Tip:</strong> Use group chats to form study groups with classmates. Sharing notes, discussing difficult concepts, and quizzing each other can significantly improve your learning outcomes!
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'gamification',
      title: 'XP, Levels & Streaks',
      icon: <Icon icon="mdi:star-circle" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">How Gamification Works</h3>
          <p className="text-sm text-gray-700">Earn XP for learning activities, level up as you learn, and maintain daily streaks by staying active.</p>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">📈 Earning XP</h4>
            <p className="text-sm text-gray-600 mb-3">Experience Points (XP) are rewards you earn for engaging with the learning platform. The more active you are, the more XP you accumulate, helping you track your learning progress and maintain motivation.</p>
            <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
              <li>Daily login: +5 XP - Simply logging into the platform each day earns you 5 XP. This encourages regular engagement and helps you build a consistent learning habit. You can only earn this once per day, so make it a daily routine.</li>
              <li>Complete a lesson: +25 XP - Finishing a lesson (viewing all content, watching videos, reading materials) rewards you with 25 XP. This recognizes the time and effort you invest in learning new material.</li>
              <li>Attempt a quiz: +10 XP - Even attempting a quiz (regardless of your score) earns you 10 XP. This encourages you to take quizzes and not worry about perfect scores on the first try.</li>
              <li>Pass a quiz: +40 XP - Successfully passing a quiz (usually 60% or higher) earns you 40 XP. This is in addition to the 10 XP for attempting, so passing gives you a total of 50 XP per quiz.</li>
              <li>Submit an assignment: +30 XP - Completing and submitting an assignment rewards you with 30 XP. This recognizes the effort you put into assignments, regardless of the grade you receive.</li>
              <li>Post in discussions: +5 XP - Contributing to course discussions by posting questions, answers, or insights earns you 5 XP per post. This encourages active participation and collaborative learning.</li>
            </ol>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">🎮 Levels</h4>
              <p className="text-sm text-gray-600">Level up every 1000 XP. Your dashboard shows a progress bar to the next level.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">🔥 Streaks</h4>
              <p className="text-sm text-gray-600">Your streak increments when you're active on consecutive days. A long gap resets it.</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700"><strong>Where to see it:</strong> The Gamification widget on your dashboard shows Level, XP, and Streak, with progress to the next level.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Icon icon="mdi:bell" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Notifications</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔔 In-App Notifications</h4>
              <p className="text-sm text-gray-600 mb-3">In-app notifications appear in the bell icon at the top of your screen. These keep you informed about important activities without requiring you to check email constantly.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click the bell icon in the navbar to see notifications - The bell icon in the top navigation bar shows a red badge with the number of unread notifications. Click it to open a dropdown showing all your recent notifications, organized by date.</li>
                <li>Get notified when grades are posted - Whenever an instructor grades your assignment or quiz, you'll receive an in-app notification. Click on the notification to go directly to view your grade and any feedback provided.</li>
                <li>Receive alerts for course announcements - New course announcements from instructors trigger notifications, ensuring you don't miss important updates about deadlines, schedule changes, or course information.</li>
                <li>See when someone replies to your discussion posts - Stay engaged in course discussions by receiving notifications when instructors or classmates reply to your posts or mention you using @mentions.</li>
                <li>Mark notifications as read individually or all at once - You can click on individual notifications to mark them as read, or use the "Mark all as read" button to clear all notifications at once. This helps you keep track of what you've already seen.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📧 Email Notifications</h4>
              <p className="text-sm text-gray-600 mb-3">Email notifications keep you informed even when you're not actively using the platform. You can customize which notifications you receive via email in your profile settings.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Manage email preferences in Profile → Notifications - Go to your profile page and navigate to the Notifications section to control which types of emails you receive. You can enable or disable specific notification types to match your preferences.</li>
                <li>Receive assignment due reminders - Get helpful email reminders before assignments are due (typically 24-48 hours in advance). This helps you stay on top of deadlines and avoid late submissions.</li>
                <li>Get course announcement emails - Important announcements are sent via email so you don't miss critical updates, even if you haven't logged into the platform recently. The email includes the full announcement content.</li>
                <li>Receive email when grades are posted - Get immediate email notifications when your assignments or quizzes are graded, including your score and any instructor comments. This lets you review feedback as soon as it's available.</li>
                <li>Opt-in for daily or weekly email digests - Instead of individual emails, you can choose to receive a summary digest that compiles all notifications from a day or week. This reduces email volume while still keeping you informed.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ai-tutor',
      title: 'AI Tutor',
      icon: <Icon icon="mdi:robot" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:sparkles" className="h-5 w-5 text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-purple-700">
                  <strong>AI-Powered Learning!</strong> Get instant help with course material using our AI Tutor. Available 24/7 to answer your questions and explain concepts.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Using the AI Tutor</h3>
          <p className="text-sm text-gray-700">The AI Tutor is your personal learning assistant that can help you understand course material, answer questions, and provide explanations.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🤖 Accessing the AI Tutor</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Look for the AI Tutor widget in your lesson viewer - A floating chat button appears when viewing lessons.</li>
                <li>Click on the chat icon to open the AI conversation - The AI Tutor opens in a panel where you can type questions.</li>
                <li>The AI has context about your current lesson - It understands the course material you&apos;re viewing.</li>
                <li>Ask questions in natural language - Type your question as you would ask a human tutor.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💡 What You Can Ask</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li><strong>Concept explanations:</strong> &quot;Can you explain this concept in simpler terms?&quot;</li>
                <li><strong>Examples:</strong> &quot;Give me an example of how this works&quot;</li>
                <li><strong>Clarifications:</strong> &quot;I don&apos;t understand this part. Can you clarify?&quot;</li>
                <li><strong>Practice questions:</strong> &quot;Can you quiz me on this topic?&quot;</li>
                <li><strong>Summaries:</strong> &quot;Summarize the key points from this lesson&quot;</li>
                <li><strong>Related topics:</strong> &quot;How does this relate to what we learned before?&quot;</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Tips for Better Responses</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Be specific - Instead of &quot;explain this&quot;, try &quot;explain how X relates to Y&quot;</li>
                <li>Provide context - Mention what you already understand</li>
                <li>Ask follow-up questions - Build on previous answers</li>
                <li>Request examples - Ask for real-world applications</li>
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
                  <strong>Important:</strong> The AI Tutor is a learning aid, not a replacement for your instructor. For grading questions or official course matters, contact your instructor directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'surveys',
      title: 'Surveys & Feedback',
      icon: <Icon icon="mdi:clipboard-list" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Participating in Surveys</h3>
          <p className="text-sm text-gray-700">Surveys help instructors and administrators gather feedback to improve courses and the learning experience.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Finding Surveys</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access surveys from your dashboard - Active surveys appear in your dashboard notifications or the Surveys section.</li>
                <li>Course-specific surveys appear in your enrolled courses - Look for survey links in course announcements or the course sidebar.</li>
                <li>Platform-wide surveys may appear as notifications - System administrators may request feedback on the overall platform.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✍️ Completing Surveys</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click on a survey to open it - Read any instructions provided at the beginning.</li>
                <li>Answer all required questions - Required questions are marked with an asterisk (*).</li>
                <li>Choose from multiple choice, rating scales, or text responses - Different question types require different response formats.</li>
                <li>Submit your responses - Click the Submit button when you&apos;ve completed all questions.</li>
                <li>Your responses may be anonymous - Check the survey description to see if responses are anonymous.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📈 Types of Surveys</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li><strong>Course Evaluations:</strong> Rate your experience with specific courses and instructors</li>
                <li><strong>Mid-Course Feedback:</strong> Provide feedback during the course to help improve it</li>
                <li><strong>Platform Feedback:</strong> Share your thoughts on the learning platform</li>
                <li><strong>Research Surveys:</strong> Participate in educational research studies</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Your feedback matters!</strong> Survey responses help improve courses and the learning experience for everyone.
                </p>
              </div>
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
          <h3 className="text-lg font-semibold text-gray-900">Exploring Learning Paths</h3>
          <p className="text-sm text-gray-700">Learning Paths are curated sequences of courses designed to help you master a specific skill or topic area.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🛤️ What is a Learning Path?</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>A structured sequence of related courses</li>
                <li>Designed to build skills progressively from beginner to advanced</li>
                <li>May include prerequisites and recommended order</li>
                <li>Completion may result in a specialized certificate</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔍 Finding Learning Paths</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to Learning Paths from the main navigation menu</li>
                <li>Browse available paths by category or skill area</li>
                <li>View path details including courses, duration, and requirements</li>
                <li>See which courses you&apos;ve already completed that apply to the path</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Following a Learning Path</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click on a path to view its courses in order</li>
                <li>Start with the first course or enroll in the entire path</li>
                <li>Complete courses in the recommended sequence</li>
                <li>Track your progress through the path</li>
                <li>Earn a path completion certificate when finished</li>
              </ol>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Tip:</strong> Learning Paths are great for career development! Choose paths that align with your professional goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'student-tools',
      title: 'Student Tools',
      icon: <Icon icon="mdi:toolbox" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Productivity Tools for Students</h3>
          <p className="text-sm text-gray-700">The platform provides several tools to help you stay organized and enhance your learning experience.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔖 Bookmarks</h4>
              <p className="text-sm text-gray-600 mb-3">Save important content for quick access later.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Click the bookmark icon on any lesson or content item to save it</li>
                <li>Access your bookmarks from the dashboard or Bookmarks page</li>
                <li>Organize bookmarks by course or add notes</li>
                <li>Remove bookmarks when no longer needed</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Notes</h4>
              <p className="text-sm text-gray-600 mb-3">Take personal notes while learning.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access the Notes feature from the student tools menu</li>
                <li>Create notes associated with specific lessons or courses</li>
                <li>Use rich text formatting to organize your notes</li>
                <li>Search through your notes to find information quickly</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✅ Todo List</h4>
              <p className="text-sm text-gray-600 mb-3">Keep track of your learning tasks and deadlines.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access your Todo list from the dashboard widget</li>
                <li>Add personal tasks and reminders</li>
                <li>Set due dates and priorities</li>
                <li>Mark tasks as complete when done</li>
                <li>Tasks sync across devices when you log in</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👥 Study Groups</h4>
              <p className="text-sm text-gray-600 mb-3">Collaborate with classmates on learning.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create or join study groups for your courses</li>
                <li>Invite classmates to join your group</li>
                <li>Share resources and discuss course material</li>
                <li>Schedule virtual study sessions together</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📅 Calendar</h4>
              <p className="text-sm text-gray-600 mb-3">View upcoming deadlines and events.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access the calendar widget on your dashboard</li>
                <li>View assignment due dates and quiz schedules</li>
                <li>See upcoming video conference sessions</li>
                <li>Plan your study schedule around important dates</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'adaptive-learning',
      title: 'Adaptive Learning',
      icon: <Icon icon="mdi:brain" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Adaptive Learning</h3>
          <p className="text-gray-600">The platform personalizes your learning experience based on your performance and preferences.</p>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">How It Works</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Navigate to <strong>Adaptive Learning</strong> from your dashboard</li>
              <li>The system analyzes your quiz scores, assignment grades, and engagement</li>
              <li>Personalized recommendations appear based on areas where you need support</li>
              <li>Recommendations update automatically as your performance improves</li>
            </ul>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Getting the Most from Recommendations</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Review recommended supplementary lessons and materials</li>
              <li>Set your difficulty preference in your profile for better recommendations</li>
              <li>Complete recommended content to strengthen weak areas before moving on</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      title: 'Your Profile',
      icon: <Icon icon="mdi:account-circle" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Profile</h3>
          <p className="text-gray-600">Manage your personal information, avatar, and learning preferences.</p>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Editing Your Profile</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Click your avatar or name in the navigation bar, then select <strong>Profile</strong></li>
              <li>Update your name, bio, and profile picture</li>
              <li>Set your learning preferences (difficulty level, subject interests)</li>
              <li>View your Student ID if one has been assigned</li>
            </ul>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Notification Preferences</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Go to <strong>Profile → Notifications</strong></li>
              <li>Choose which notifications you receive (email and in-app)</li>
              <li>Options include: grade alerts, assignment reminders, announcements, discussion replies</li>
            </ul>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Your Certificates</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Go to <strong>Profile → Certificates</strong> to view all earned certificates</li>
              <li>Download certificates as PDF</li>
              <li>Share certificates using the unique verification link</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'courses-subjects',
      title: 'Courses & Subjects',
      icon: <Icon icon="mdi:school" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Courses & Subjects</h3>
          <p className="text-gray-600">Courses are structured learning experiences with lessons, assessments, attendance tracking, and their own gradebook.</p>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Viewing Your Courses</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Navigate to <strong>My Courses</strong> to see all courses you are enrolled in</li>
              <li>Each course shows the instructor, schedule, and progress</li>
              <li>Click a course to view details, curriculum, and gradebook</li>
            </ul>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Attendance</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Your instructor tracks attendance for each live session</li>
              <li>View your attendance record in the course detail page</li>
              <li>Consistent attendance may affect your grade in some courses</li>
            </ul>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">My Subjects</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Navigate to <strong>My Subjects</strong> for an alternative view of your academic subjects</li>
              <li>Group your courses by subject area for easier navigation</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'admissions',
      title: 'Admissions & Applications',
      icon: <Icon icon="mdi:clipboard-text" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Admissions & Applications</h3>
          <p className="text-gray-600">Apply to programmes and track your application status.</p>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Applying</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Application links are shared by your institution</li>
              <li>Fill in the application form with required information</li>
              <li>Upload any supporting documents as requested</li>
              <li>Submit your application and note your application reference</li>
            </ul>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Checking Application Status</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>Visit the <strong>Admissions Status</strong> page</li>
              <li>Enter your email or application reference to check status</li>
              <li>Statuses include: pending, under review, accepted, rejected</li>
              <li>You will also receive email notifications when your status changes</li>
            </ul>
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
              <p className="text-sm text-red-700 mb-3">If pages are slow to load or not displaying correctly, try these troubleshooting steps in order:</p>
              <ol className="text-sm text-red-700 space-y-1 ml-4 list-decimal">
                <li>Refresh the page (Ctrl+F5 or Cmd+Shift+R) - A hard refresh clears cached content and reloads the page fresh from the server. On Windows, press Ctrl+F5; on Mac, press Cmd+Shift+R. This often resolves display issues or outdated content.</li>
                <li>Clear your browser cache and cookies - Sometimes stored data conflicts with the current site version. Go to your browser settings and clear browsing data, making sure to select cached images/files and cookies. You may need to log in again after this.</li>
                <li>Check your internet connection - Slow or unstable internet can cause loading issues. Test your connection speed, try loading other websites, or switch to a different network (like mobile data) to see if the problem persists.</li>
                <li>Try a different browser - If the issue is browser-specific, try accessing the site in Chrome, Firefox, Safari, or Edge. This helps determine if the problem is with your browser or the platform itself.</li>
              </ol>
            </div>

            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Assignment Submission Issues</h4>
              <p className="text-sm text-yellow-700 mb-3">Having trouble submitting assignments? Check these common issues:</p>
              <ol className="text-sm text-yellow-700 space-y-1 ml-4 list-decimal">
                <li>Check file size limits (usually 10MB max) - Most assignments accept files up to 10MB. If your file is larger, try compressing it or converting it to a more efficient format. You can use online tools or built-in compression features in most document software.</li>
                <li>Ensure file format is supported (PDF, DOC, DOCX, etc.) - The platform accepts common file types like PDF, DOC, DOCX, TXT, and sometimes images. If you're using a less common format, try converting your file to PDF, which is universally accepted and preserves formatting.</li>
                <li>Verify you're logged in properly - Sometimes session timeouts can prevent submissions. Make sure you're still logged in (check that your name appears in the top right). If needed, log out and log back in, then try submitting again.</li>
                <li>Contact instructor if problems persist - If you've tried all these steps and still can't submit, contact your instructor immediately. They may be able to extend the deadline or provide an alternative submission method. Include details about what error messages you're seeing.</li>
              </ol>
            </div>

            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-medium text-green-900 mb-2">✅ Login Problems</h4>
              <p className="text-sm text-green-700 mb-3">Can't access your account? Follow these steps:</p>
              <ol className="text-sm text-green-700 space-y-1 ml-4 list-decimal">
                <li>Use the "Forgot Password" link if needed - If you've forgotten your password, click "Forgot Password" on the login page. Enter your email address, and you'll receive instructions to reset your password. Check your spam folder if the email doesn't arrive within a few minutes.</li>
                <li>Check your email for account verification - New accounts require email verification before you can log in. Check your email (including spam/junk folders) for a verification link. Click the link to activate your account, then try logging in again.</li>
                <li>Ensure you're using the correct email address - Make sure you're entering the exact email address you used when creating your account. Check for typos, and verify whether you used a personal email or school email address. Some email providers have similar-sounding domains that can cause confusion.</li>
                <li>Contact support if account is locked - After multiple failed login attempts, accounts may be temporarily locked for security. If you're certain your credentials are correct but still can't access your account, contact the system administrator or support team. They can unlock your account and help you regain access.</li>
              </ol>
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

  const q = searchQuery.trim().toLowerCase();
  const filteredSections = helpSections.filter(section => {
    if (!q) return true;
    return section.title.toLowerCase().includes(q) || section.id.toLowerCase().includes(q);
  });

  const currentSection = helpSections.find(section => section.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Icon icon="mdi:help-circle" className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Student Help Center</span>
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
                currentPage="/help/student"
                userRole="student"
                activeSection={activeSection}
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
                        <h1 className="text-xl font-normal text-slate-900 tracking-tight">{currentSection.title}</h1>
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
          key={aiMessageKey}
          currentPage="/help/student"
          context={{ userRole: 'student', activeSection }}
          initialMessage={aiInitialMessage}
        />
      )}
    </div>
  );
}

