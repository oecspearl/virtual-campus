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

export default function InstructorHelpPage() {
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
      title: 'Getting Started as Instructor',
      icon: <Icon icon="mdi:account-group" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Welcome, Instructor!</strong> This guide covers all instructor-specific features and tools available to you.
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
                  <p className="font-medium">Access your instructor dashboard</p>
                  <p className="text-sm text-gray-600">View courses you're teaching and student progress</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Create and manage course content</p>
                  <p className="text-sm text-gray-600">Add lessons, assignments, quizzes, and resources</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Grade assignments and quizzes</p>
                  <p className="text-sm text-gray-600">Provide feedback and track student performance</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Engage with students</p>
                  <p className="text-sm text-gray-600">Post announcements, participate in discussions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'course-management',
      title: 'Course Management',
      icon: <Icon icon="mdi:book-education" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Your Courses</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Creating Course Content</h4>
              <p className="text-sm text-gray-600 mb-3">Build comprehensive learning experiences by adding various types of content to your courses. Well-structured content helps students learn effectively and stay engaged throughout the course.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Add lessons with rich text content, videos, and resources - Use the lesson editor to create engaging content with formatted text, embedded videos from YouTube or other platforms, downloadable resources, and interactive elements. Rich formatting helps highlight key concepts and makes content more readable.</li>
                <li>Organize content using subjects and modules - Structure your course into logical modules or units, and categorize lessons by subject. This helps students understand the course flow and makes it easier for them to navigate and find specific topics.</li>
                <li>Set lesson prerequisites and unlock conditions - Control the learning path by requiring students to complete certain lessons before accessing others. This ensures students build foundational knowledge before moving to advanced topics, and helps maintain a logical learning progression.</li>
                <li>Upload course materials and resources - Provide supplementary materials like PDFs, slides, worksheets, or other documents that support your lessons. These resources give students additional reference materials and can be accessed throughout the course.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👥 Managing Enrollments</h4>
              <p className="text-sm text-gray-600 mb-3">Monitor and manage student enrollments to ensure your course runs smoothly and you can provide appropriate support to all students.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View all enrolled students in course settings - Access the enrollment list from your course settings page. This shows all students currently enrolled, along with their enrollment dates, allowing you to see who's participating in your course.</li>
                <li>Track student progress and completion - Monitor how students are progressing through course materials, including which lessons they've completed, quiz scores, and assignment submissions. This helps you identify students who may need additional support or encouragement.</li>
                <li>Monitor engagement and activity levels - Review student activity metrics to see how actively students are participating. This includes login frequency, discussion participation, and time spent on course materials, helping you gauge overall course engagement.</li>
                <li>Export enrollment lists if needed - Download enrollment information as a spreadsheet for administrative purposes, record-keeping, or to use in other tools. This is useful for reporting, coordinating with other instructors, or maintaining official records.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ Course Settings</h4>
              <p className="text-sm text-gray-600 mb-3">Configure your course settings to control how students access and interact with your course. These settings help you customize the learning experience to fit your teaching style and course objectives.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Update course description and objectives - Keep your course description current and clearly communicate learning objectives to help students understand what they'll gain from the course. A well-written description can improve enrollment and set appropriate expectations.</li>
                <li>Set course difficulty and prerequisites - Specify the difficulty level (beginner, intermediate, advanced) and list any prerequisites students should complete first. This helps students choose courses appropriate for their skill level and ensures they have necessary background knowledge.</li>
                <li>Configure enrollment options - Control whether enrollment is open to all students, requires approval, or is restricted to specific groups. You can also set enrollment limits if you want to cap class size for a more personalized learning experience.</li>
                <li>Manage course visibility and publish status - Control when your course becomes visible to students. You can keep it in draft mode while building content, make it visible but require enrollment, or publish it fully. This gives you control over the launch timeline.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'content-creation',
      title: 'Content Creation',
      icon: <Icon icon="mdi:pencil" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Creating Course Content</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📚 Available Content Types (12 Types)</h4>
              <p className="text-sm text-gray-600 mb-3">The platform supports 12 different content types to create engaging, diverse learning experiences. Here's what's available:</p>
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
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎬 Interactive Video (NEW)</h4>
              <p className="text-sm text-gray-600 mb-3">Create engaging video experiences with embedded questions at specific timestamps. Perfect for step-by-step tutorials and knowledge checks.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Upload a video file or use a YouTube/Vimeo URL - Interactive videos work best with uploaded files, but YouTube/Vimeo URLs are also supported.</li>
                <li>Add checkpoints at specific timestamps - Set timestamps where you want the video to pause and ask questions. This helps ensure students are paying attention and understanding the content.</li>
                <li>Create questions (multiple choice, true/false, short answer) - Choose question types that match your learning objectives. Multiple choice works well for quick checks, while short answer allows deeper assessment.</li>
                <li>Set feedback and points for each checkpoint - Provide immediate feedback after students answer, and assign point values to motivate participation.</li>
                <li>Students see progress and can review answers - The system tracks checkpoint completion and allows students to review their answers after the video ends.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎵 Audio/Podcast Content (NEW)</h4>
              <p className="text-sm text-gray-600 mb-3">Add audio content with full playback controls and accessibility features. Ideal for language learning, lectures, and mobile learning.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Upload audio files (MP3, WAV, OGG, M4A) - The platform supports common audio formats. Upload your audio file directly through the lesson editor.</li>
                <li>Add transcripts for accessibility - Optional transcripts can be displayed alongside audio, making content accessible to hearing-impaired students and supporting language learners.</li>
                <li>Features include playback speed control, volume, and download - Students can adjust playback speed (0.5x to 2x), control volume, and download audio files for offline listening.</li>
                <li>Perfect for language learning, lectures, interviews - Audio content is versatile and works well for many educational scenarios, especially when students need to listen multiple times.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💻 Code Sandbox (NEW)</h4>
              <p className="text-sm text-gray-600 mb-3">Create interactive coding exercises with live code execution. Essential for programming and technical courses.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Select programming language (JavaScript, Python, HTML/CSS, Java, C++, SQL, JSON) - Choose from 8 supported languages, each with syntax highlighting and code templates.</li>
                <li>Enter initial code or use templates - Provide starter code for students to work with, or use default templates that demonstrate basic concepts for each language.</li>
                <li>Add instructions and learning objectives - Explain what students should accomplish, provide hints, and set clear expectations for the coding exercise.</li>
                <li>Enable read-only mode for demonstrations - Use read-only mode to display reference code, solutions, or examples without allowing edits.</li>
                <li>Students can run JavaScript and HTML/CSS directly in browser - JavaScript executes immediately with console output, and HTML/CSS renders in a live preview panel.</li>
                <li>Other languages show code with execution instructions - For Python, Java, C++, etc., students see syntax-highlighted code and instructions for running it in external environments.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Lesson Editor Basics</h4>
              <p className="text-sm text-gray-600 mb-3">The lesson editor provides powerful tools for creating engaging, well-formatted course content.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Use the rich text editor for formatted content - Format text with headings, bold, italic, lists, and colors to make your content visually appealing and easy to scan. Well-formatted content improves comprehension and keeps students engaged.</li>
                <li>Upload images directly by pasting or dragging - Easily add images to your lessons by copying and pasting from your clipboard, or by dragging and dropping image files directly into the editor. Images help illustrate concepts and break up text-heavy content.</li>
                <li>Embed videos and external content - Include educational videos by embedding YouTube, Vimeo, or other video links directly in your lessons. You can also embed interactive content, slides, or other web-based resources to enrich the learning experience.</li>
                <li>Add code blocks and formatted text - For technical courses, use code blocks with syntax highlighting to display programming examples clearly. Properly formatted code helps students learn programming concepts more effectively.</li>
                <li>Switch between visual and code view - Toggle between the visual editor (WYSIWYG) and HTML code view. This gives you full control over formatting and allows you to fine-tune the appearance or add custom HTML when needed.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📄 Assignments</h4>
              <p className="text-sm text-gray-600 mb-3">Create assignments that challenge students and assess their understanding. Clear instructions and appropriate settings help students submit quality work on time.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create assignments with detailed instructions - Write clear, comprehensive instructions that explain what students need to do, any specific requirements or formatting guidelines, and what you're looking for in their submissions. Good instructions reduce confusion and improve submission quality.</li>
                <li>Set due dates and point values - Establish clear deadlines to help students manage their time effectively. Assign point values that reflect the assignment's importance and complexity, helping students prioritize their work appropriately.</li>
                <li>Accept file submissions (PDF, DOC, DOCX, etc.) - Choose which file types students can submit. Common options include PDF (great for preserving formatting), DOC/DOCX (for editable documents), images, and other formats. Consider what's easiest for you to grade.</li>
                <li>Enable or disable late submissions - Decide whether to accept late submissions and how to handle them. You can set a grace period, reduce points for late work, or lock submissions after the deadline. Clear policies help students understand expectations.</li>
                <li>Add rubric criteria for grading - Create grading rubrics that specify evaluation criteria and point breakdowns. Rubrics help students understand how they'll be evaluated, make grading more consistent and efficient, and provide clearer feedback.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🧠 Quizzes</h4>
              <p className="text-sm text-gray-600 mb-3">Quizzes are an effective way to assess student understanding and provide immediate feedback. Use different question types to test various levels of knowledge.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create multiple choice, true/false, and short answer questions - Use multiple choice for quick knowledge checks, true/false for concept verification, and short answer for deeper assessment. Mixing question types helps evaluate different levels of understanding and keeps quizzes engaging.</li>
                <li>Set correct answers and point values - Define the correct answer for each question and assign point values. Point values can vary based on question difficulty - simpler questions might be worth fewer points, while complex questions can be worth more.</li>
                <li>Configure quiz settings (time limits, attempts, etc.) - Set a time limit to simulate exam conditions or allow unlimited time for learning-focused quizzes. Control how many attempts students get, whether they can see answers immediately, and other settings that affect the quiz experience.</li>
                <li>Preview quizzes before publishing - Always preview your quiz from a student's perspective before making it available. This helps you catch typos, verify questions are clear, ensure formatting looks correct, and confirm all settings work as expected.</li>
                <li>View quiz results and analytics - After students take quizzes, review results to see overall performance, identify questions that were consistently missed (which may indicate unclear wording or difficult content), and track individual student progress. This data helps you improve your teaching.</li>
              </ol>
            </div>

            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-900 mb-2">🔒 Safe Browser Mode (Proctored Quizzes)</h4>
              <p className="text-sm text-red-700 mb-3">Enable Safe Browser Mode to prevent cheating during high-stakes quizzes. This feature monitors student behavior and can automatically submit quizzes if violations are detected.</p>
              <ol className="text-sm text-red-700 space-y-1 ml-4 list-decimal">
                <li>Enable Safe Browser Mode in quiz settings - Toggle "Enable Safe Browser Mode" when creating or editing a quiz. This activates proctoring features that monitor for suspicious activity during the quiz.</li>
                <li>Configure proctoring settings:
                  <ul className="mt-1 ml-4 list-disc">
                    <li><strong>Max Violations:</strong> Set how many violations are allowed before auto-submit (default: 3)</li>
                    <li><strong>Fullscreen Required:</strong> Force students to stay in fullscreen mode</li>
                    <li><strong>Block Right-Click:</strong> Prevent right-click context menu access</li>
                    <li><strong>Block Keyboard Shortcuts:</strong> Disable copy/paste and other shortcuts</li>
                    <li><strong>Auto-Submit on Violation:</strong> Automatically submit when max violations reached</li>
                  </ul>
                </li>
                <li>Violations detected include:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Tab switching or opening new windows</li>
                    <li>Exiting fullscreen mode</li>
                    <li>Right-clicking or using keyboard shortcuts</li>
                    <li>Copy/paste attempts</li>
                  </ul>
                </li>
                <li>Students see a consent screen before starting - Students are informed about proctoring requirements and must accept before beginning the quiz.</li>
                <li>View violation logs in quiz results - Review detailed logs showing what violations occurred, when they happened, and whether auto-submit was triggered. Access these from the quiz results page.</li>
              </ol>
              <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
                <strong>Best Practice:</strong> Reserve Safe Browser Mode for high-stakes assessments like midterms and finals. For practice quizzes, consider allowing unlimited attempts without proctoring to encourage learning.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'grading',
      title: 'Grading & Feedback',
      icon: <Icon icon="mdi:clipboard-check" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Grading Student Work</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 Grading Assignments</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to the assignment in your course</li>
                <li>View all student submissions</li>
                <li>Review submitted files and work</li>
                <li>Enter grades and provide written feedback</li>
                <li>Save grades (students receive email notifications)</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Gradebook Management</h4>
              <p className="text-sm text-gray-600 mb-3">The Gradebook is your central hub for tracking student performance. Use it to monitor progress, identify students who need help, and maintain accurate grade records.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access the Gradebook from course navigation - Find the Gradebook tab in your course navigation menu. This provides a comprehensive view of all student grades organized in a spreadsheet-like format, making it easy to see the big picture.</li>
                <li>View all students and their grades - See a complete overview of all enrolled students and their performance across assignments, quizzes, and other graded activities. The Gradebook shows individual scores, percentages, and overall course grades.</li>
                <li>Update grades directly in the gradebook - Make grade corrections or adjustments right in the Gradebook interface. This is convenient for updating scores after re-grading or applying curve adjustments, and changes are immediately visible to students.</li>
                <li>Track completion status for assignments - Monitor which students have submitted assignments and which are missing. This helps you identify students who may be struggling or falling behind, allowing you to reach out proactively with support.</li>
                <li>Calculate final course grades - The Gradebook automatically calculates overall course grades based on point values and weights you've set. Review these calculations periodically to ensure accuracy, and make manual adjustments if needed based on your grading policies.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✅ Quiz Results</h4>
              <p className="text-sm text-gray-600 mb-3">Quiz results provide valuable insights into student understanding and help you identify areas where instruction may need adjustment.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View automatic quiz grading results - Multiple choice and true/false questions are automatically graded, giving you instant access to results. This saves time and provides immediate feedback to students, helping them learn from mistakes quickly.</li>
                <li>Review student answers and performance - Examine individual student responses to understand their thought processes and identify common misconceptions. This detailed review helps you provide targeted feedback and adjust your teaching approach.</li>
                <li>Identify questions with low success rates - Questions with consistently low scores may indicate unclear wording, overly difficult content, or topics that need more instruction. Use this data to refine questions, revisit teaching materials, or provide additional clarification.</li>
                <li>Export quiz results for analysis - Download quiz results as a spreadsheet for deeper analysis, record-keeping, or to use in external analytics tools. This is useful for identifying trends, preparing reports, or conducting educational research on your courses.</li>
              </ol>
            </div>
          </div>

          <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-indigo-700">
                  <strong>Tip:</strong> Provide timely and constructive feedback to help students improve. Students receive email notifications when grades are posted.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'announcements',
      title: 'Course Announcements',
      icon: <Icon icon="mdi:bullhorn" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Posting Announcements</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📢 Creating Announcements</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to your course page</li>
                <li>Click on the "Announcements" tab</li>
                <li>Click "Create Announcement"</li>
                <li>Enter title and content</li>
                <li>Optionally attach files or schedule for later</li>
                <li>Pin important announcements to keep them at the top</li>
                <li>Publish the announcement</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📧 Email Notifications</h4>
              <p className="text-sm text-gray-600 mb-3">When you post announcements, students automatically receive email notifications to ensure they see important updates even when not actively using the platform.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>All enrolled students automatically receive email notifications - Every student enrolled in your course receives an email when you post an announcement. This ensures critical information reaches everyone, regardless of their platform login frequency.</li>
                <li>Students can view announcements in the course - Announcements also appear in the course's Announcements section, creating a permanent record. Students can reference these later, making announcements a reliable way to communicate important information.</li>
                <li>Notifications are sent in the background - Email delivery happens automatically without requiring any action from you. You can continue working while emails are being sent, and the system handles all delivery logistics.</li>
                <li>Email includes announcement title, preview, and link - The notification email includes the announcement title and a preview of the content, with a direct link to view the full announcement on the platform. This gives students enough information to understand the importance and decide if they need to take immediate action.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📌 Managing Announcements</h4>
              <p className="text-sm text-gray-600 mb-3">Maintain effective communication by organizing and managing your course announcements. Good announcement management helps students stay informed without feeling overwhelmed.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Edit or delete existing announcements - Update announcements if information changes, or remove outdated announcements to keep the list relevant. This helps maintain an accurate, current communication record and prevents confusion from conflicting information.</li>
                <li>Pin important announcements to the top - Keep critical information (like course policies, semester schedules, or major deadlines) visible by pinning announcements. Pinned items stay at the top regardless of when they were posted, ensuring students always see the most important information first.</li>
                <li>Schedule announcements for future dates - Plan ahead by scheduling announcements to post automatically at a specific date and time. This is useful for assignment reminders, exam schedules, or other time-sensitive information you want to release at the right moment.</li>
                <li>Set expiration dates for time-sensitive announcements - Automatically remove or archive announcements after they're no longer relevant. This keeps your announcement list clean and prevents students from seeing outdated information that might cause confusion.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'discussions',
      title: 'Discussion Management',
      icon: <Icon icon="mdi:forum" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Managing Discussions</h3>

          <div className="space-y-3">
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">🌐 Global Discussions (NEW)</h4>
              <p className="text-sm text-blue-700 mb-3">Platform-wide discussions allow you to engage with the broader learning community beyond your specific courses.</p>
              <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                <li>Access Global Discussions from the "Discussions" link in the main navigation - Participate in platform-wide conversations about teaching, learning, and academic topics.</li>
                <li>Start discussions on topics that benefit all students - Share insights, answer questions, and contribute your expertise to help students across all courses.</li>
                <li>Browse by category - Find discussions organized by General, Academic Help, Campus Life, Career & Jobs, Tech Support, and Announcements.</li>
                <li>Upvote valuable content - Help surface the best discussions and answers by upvoting helpful posts.</li>
                <li>Build your presence in the learning community - Regular participation helps establish you as an approachable, helpful instructor.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💬 Course Discussions</h4>
              <p className="text-sm text-gray-600 mb-3">Active instructor participation in discussions encourages student engagement and helps create a collaborative learning environment. Your presence helps clarify concepts and guide conversations productively.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create discussion topics to engage students - Start conversations by posting thought-provoking questions, case studies, or prompts related to course material. Well-crafted discussion topics encourage critical thinking and help students apply what they've learned in meaningful ways.</li>
                <li>Reply to student questions and posts - Respond promptly to student questions and comments to show you're engaged and available. Your responses help clarify misunderstandings, provide additional context, and encourage further discussion among students.</li>
                <li>Pin important discussion threads - Highlight particularly valuable or frequently referenced discussions by pinning them to the top. This makes important conversations easy to find and helps students discover useful information without scrolling through many posts.</li>
                <li>Moderate discussions and provide guidance - Monitor discussions to ensure they stay on topic, remain respectful, and follow course guidelines. Gently guide conversations back on track if needed, and intervene if inappropriate behavior occurs to maintain a positive learning environment.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📧 Student Notifications</h4>
              <p className="text-sm text-gray-600 mb-3">The platform automatically notifies students of your discussion activity, helping maintain engagement even when students aren't actively checking the platform.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Students receive email notifications when you reply - Every time you reply to a student's post or comment, they automatically get an email notification. This ensures students see your responses quickly, even if they're not currently using the platform, helping maintain responsive communication.</li>
                <li>Get notified when students mention you (@mentions) - When students use @mentions to direct questions to you, you'll receive an email notification. This helps you respond promptly to students who specifically need your attention, improving the support you provide.</li>
                <li>Track discussion engagement metrics - Monitor how actively students participate in discussions through engagement metrics. This data helps you identify which topics generate the most interest, which students are most engaged, and whether you need to encourage more participation in specific areas.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'student-messaging',
      title: 'Student Messaging',
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
                  <strong>New Feature!</strong> Communicate directly with students through private messages. Perfect for office hours, answering individual questions, or providing personalized feedback.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Messaging with Students</h3>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💬 Direct Messages with Students</h4>
              <p className="text-sm text-gray-600 mb-3">Private messaging provides a direct communication channel with individual students for personalized support.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access Messages from the chat icon in the navbar - Click the chat icon to open the messaging center and view all your conversations.</li>
                <li>Respond to student messages - Students can initiate conversations with you. You'll see unread message notifications in the navbar.</li>
                <li>Start conversations with students - Search for students by name to start a private conversation. Useful for reaching out about performance concerns or providing individual guidance.</li>
                <li>Share files and resources - Attach documents, images, or other files to help students with specific questions or to provide additional materials.</li>
                <li>Keep conversations professional - Private messages create a record of your communication. Maintain professional boundaries and redirect sensitive matters to appropriate channels when necessary.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👥 Group Messaging</h4>
              <p className="text-sm text-gray-600 mb-3">Create group chats for project teams, study groups, or course-wide communications.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create group chats for project teams - If students are working in groups, you can create or join their group chats to provide guidance and monitor progress.</li>
                <li>Course-based group discussions - Create group chats for sections or groups within your course for targeted communications.</li>
                <li>Manage group membership - As a group admin, you can add or remove members to keep groups relevant and focused.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚡ Best Practices</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Set response time expectations - Let students know when they can expect responses (e.g., within 24-48 hours on weekdays).</li>
                <li>Use course announcements for general communications - Private messages are best for individual matters; use announcements for course-wide information.</li>
                <li>Encourage students to use discussions for common questions - Questions that benefit all students should be posted in discussions where everyone can see the answer.</li>
                <li>Mute conversations when needed - If you're receiving too many notifications, you can mute specific conversations while still being able to check them when convenient.</li>
              </ol>
            </div>
          </div>

          <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-indigo-700">
                  <strong>Pro Tip:</strong> Private messaging is excellent for providing sensitive feedback, discussing grade concerns, or offering encouragement to struggling students in a supportive, private setting.
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
          <h3 className="text-lg font-semibold text-gray-900">Scheduling Video Conferences</h3>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎥 Creating Conferences</h4>
              <p className="text-sm text-gray-600 mb-3">Video conferences enable real-time interaction with students, making them ideal for live lectures, Q&A sessions, office hours, or group discussions. The platform integrates with popular video conferencing services.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Schedule meetings for specific lessons or courses - Associate video conferences with particular lessons or your entire course. This helps students understand the context and purpose of each meeting, and allows you to organize sessions around specific topics or learning objectives.</li>
                <li>Set meeting duration and participant limits - Specify how long the meeting will last to help students plan their time. You can also set participant limits if needed (useful for small group sessions or when platform resources are limited), ensuring meetings run smoothly.</li>
                <li>Enable/disable recording and waiting room features - Choose whether to record sessions for students who can't attend live, and enable waiting rooms to control who enters the meeting. Recordings are valuable for review and for students who miss sessions, while waiting rooms help maintain security and control.</li>
                <li>Choose between 8x8.vc (Jitsi Meet), Google Meet, or BigBlueButton - Select the video platform that works best for you and your students. All options are integrated, so links are automatically generated and shared with students.</li>
                <li>Generate meeting links for students - The system automatically creates and shares meeting links with enrolled students. They'll receive notifications and can access the meeting directly from the course page, making it easy for everyone to join without manually sharing links.</li>
              </ol>
            </div>

            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-medium text-green-900 mb-2">📹 Google Meet Integration</h4>
              <p className="text-sm text-green-700 mb-3">Use Google Meet for familiar, reliable video conferencing. Students can join with their existing Google accounts.</p>
              <ol className="text-sm text-green-700 space-y-1 ml-4 list-decimal">
                <li>Select "Google Meet" as the video provider when creating a conference</li>
                <li>For instant meetings, provide your Google Meet link manually - Create a meeting at <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="underline">meet.google.com/new</a> and paste the link</li>
                <li>For scheduled meetings, links can be auto-generated if Google Calendar API is configured by your administrator</li>
                <li>Students click "Join Meeting" to open Google Meet directly in their browser</li>
                <li>Google Meet supports screen sharing, recording (with Google Workspace), and breakout rooms</li>
              </ol>
            </div>

            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">📊 Attendance Tracking</h4>
              <p className="text-sm text-blue-700 mb-3">Track student attendance for video conferences to monitor engagement and maintain participation records.</p>
              <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                <li>Automatic check-in when students join - When students click "Join Meeting", their attendance is automatically recorded with a timestamp.</li>
                <li>View attendance records - Access the conference details to see who attended, when they joined, and total participants.</li>
                <li>Track attendance patterns - Monitor which students consistently attend live sessions and identify those who may need encouragement.</li>
                <li>Export attendance data - Download attendance records for grading, reporting, or administrative purposes.</li>
                <li>Use attendance for participation grades - Consider conference attendance as part of class participation when calculating grades.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📅 Managing Sessions</h4>
              <p className="text-sm text-gray-600 mb-3">Effectively manage your video conference schedule to maintain organized, well-attended sessions. Good session management helps you provide consistent learning opportunities.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View all scheduled conferences for your courses - Access a centralized calendar or list showing all upcoming video conferences across all your courses. This overview helps you manage your schedule, avoid conflicts, and plan your teaching time effectively.</li>
                <li>Edit or cancel scheduled meetings - Update meeting details (time, duration, settings) or cancel sessions when necessary. Students are automatically notified of changes, so they always have current information. This flexibility helps you adapt to unexpected circumstances.</li>
                <li>Set up recurring conference sessions - Create repeating meetings (like weekly office hours or regular class sessions) with a single setup. This saves time and ensures consistent scheduling, making it easier for students to plan and attend regularly scheduled sessions.</li>
                <li>Monitor participant attendance - Track which students attended each session to monitor engagement and participation. This attendance data helps you identify students who may need encouragement to attend, and provides a record of participation for grading or reporting purposes.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Student Analytics',
      icon: <Icon icon="mdi:chart-line" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Tracking Student Progress</h3>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Course Analytics</h4>
              <p className="text-sm text-gray-600 mb-3">Analytics provide insights into how your course is performing overall. Use this data to identify trends, measure success, and make data-driven improvements to your teaching.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View student enrollment and completion rates - Track how many students enroll in your course and how many complete it. High enrollment and completion rates indicate course appeal and effectiveness, while lower rates may suggest areas for improvement in course structure or content.</li>
                <li>Track average grades and performance metrics - Monitor overall student performance through average grades, grade distributions, and performance trends over time. This helps you assess whether course difficulty is appropriate and whether students are meeting learning objectives.</li>
                <li>Monitor student engagement - Review engagement metrics like login frequency, time spent on course materials, discussion participation, and assignment submission rates. High engagement typically correlates with better learning outcomes and student satisfaction.</li>
                <li>Identify students who may need extra support - Use analytics to spot students with declining performance, low engagement, or missing assignments. Early identification allows you to reach out proactively with support, potentially preventing students from falling behind or dropping out.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">👤 Individual Progress</h4>
              <p className="text-sm text-gray-600 mb-3">Track each student's progress individually to provide personalized support and understand how different students are experiencing your course. This detailed view helps you tailor your teaching approach.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View individual student progress in course settings - Access detailed progress reports for each enrolled student showing their journey through the course. This individual view helps you understand each student's learning path and identify specific areas where they excel or struggle.</li>
                <li>Track lesson completion and quiz scores - Monitor which lessons students have completed and their quiz performance. This helps you see if students are keeping up with the pace, understand the material, and progressing through the course as expected.</li>
                <li>Monitor assignment submission rates - Track whether students are submitting assignments on time and completing all required work. This data helps you identify students who may be struggling with time management, course load, or specific assignment requirements.</li>
                <li>Export progress reports - Download individual or aggregate progress data for record-keeping, reporting to administrators, or analysis in external tools. These reports provide documentation of student progress and can inform curriculum decisions or accreditation requirements.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'lecturer-collaboration',
      title: 'Lecturer Collaboration',
      icon: <Icon icon="mdi:account-group" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Collaborating with Fellow Lecturers</h3>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:lightbulb" className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>New Feature!</strong> Connect and collaborate with fellow lecturers through dedicated collaboration tools. Access these features from the "Lecturer Collaboration" section in the main navigation menu.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Icon icon="mdi:forum" className="w-5 h-5 mr-2 text-purple-600" />
                Lecturer Forums
              </h4>
              <p className="text-sm text-gray-600 mb-3">Join discussion forums to share teaching strategies, ask questions, and exchange ideas with fellow educators.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Browse forums by category - Forums are organized by topics like Pedagogy, Technology, Assessment, Curriculum Design, and more. This helps you find discussions relevant to your interests and expertise.</li>
                <li>Create new forums - Start your own discussion forum on a topic you're passionate about. Set the category, description, and guidelines to attract like-minded lecturers who want to discuss the same subject.</li>
                <li>Post questions and share ideas - Ask questions about teaching methods, share successful strategies you've used, or start discussions about educational trends. Your posts help build a community of practice among lecturers.</li>
                <li>Reply to posts and engage in discussions - Participate actively by replying to posts, providing insights, and building on others' ideas. Thoughtful engagement creates valuable knowledge-sharing opportunities.</li>
                <li>Vote on posts and replies - Use the voting system to highlight particularly valuable content. Upvoting helps other lecturers discover the most useful discussions and contributions.</li>
                <li>Edit and delete your own posts - Maintain control over your contributions by editing posts to add updates or corrections, or deleting posts if they're no longer relevant.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Icon icon="mdi:library" className="w-5 h-5 mr-2 text-blue-600" />
                Resource Sharing Hub
              </h4>
              <p className="text-sm text-gray-600 mb-3">Upload, discover, and share educational resources with your colleagues. Build a collective library of quality teaching materials.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Upload educational resources - Share documents, presentations, videos, worksheets, lesson plans, or any other educational materials that might help fellow lecturers. Include clear descriptions and tags to help others find your resources.</li>
                <li>Browse and search shared resources - Discover materials uploaded by other lecturers. Use search and filters to find resources by subject, type, rating, or keywords. This saves time by leveraging the collective knowledge of your colleagues.</li>
                <li>Rate resources (1-5 stars) - Help others identify quality resources by rating materials you've used. Your ratings contribute to a quality filter that helps lecturers find the best resources quickly.</li>
                <li>Bookmark favorite resources - Save resources you find useful for quick access later. Your bookmarks create a personal library of materials you can reference when creating courses or lessons.</li>
                <li>Filter by subject, type, and rating - Use advanced filters to narrow down resources to exactly what you need. Filter by subject area, resource type (PDF, video, presentation, etc.), or minimum rating to find high-quality materials efficiently.</li>
                <li>Download resources for your courses - Download resources directly to use in your own courses. This allows you to adapt and customize materials while building on the work of your colleagues.</li>
                <li>View resource details and usage statistics - See descriptions, ratings, download counts, and other metadata before downloading. This helps you assess whether a resource fits your needs.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-purple-50">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Icon icon="mdi:chat" className="w-5 h-5 mr-2 text-green-600" />
                Virtual Staff Room
              </h4>
              <p className="text-sm text-gray-600 mb-3">Chat in real-time with other lecturers. Create topic-based rooms for instant communication and collaboration.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Browse available chat rooms - View all chat rooms you're a member of, organized by most recent activity. See room names, descriptions, member counts, and last message timestamps to find active discussions.</li>
                <li>Create new chat rooms - Start your own chat room for a specific topic, department, project, or interest group. Set the room name, description, and choose whether it's public (all lecturers can join) or private (invite-only).</li>
                <li>Join existing rooms - Discover and join public rooms that interest you, or accept invitations to private rooms. Being part of multiple rooms lets you participate in different conversations and communities.</li>
                <li>Send real-time messages - Type and send messages that appear instantly for all room members. Real-time messaging enables quick questions, brainstorming sessions, and spontaneous collaboration.</li>
                <li>Reply to specific messages - Create threaded conversations by replying to specific messages. This keeps discussions organized and makes it easy to follow multiple conversation threads within a single room.</li>
                <li>React to messages - Use emoji reactions to quickly respond to messages without typing. Reactions provide a lightweight way to acknowledge, agree with, or show appreciation for messages.</li>
                <li>Manage room members - As a room creator or admin, invite lecturers to join, remove members, or assign admin/moderator roles. Good member management helps maintain focused, productive discussions.</li>
                <li>Receive instant notifications - Get notified immediately when someone mentions you, sends a message in your active rooms, or invites you to a new room. Notifications keep you connected even when you're not actively using the platform.</li>
              </ol>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Icon icon="mdi:lightbulb" className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-indigo-700">
                    <strong>Pro Tip:</strong> Use Lecturer Collaboration features to build a professional learning community. Share resources, discuss best practices, and support each other in creating better learning experiences for students.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ai-generation',
      title: 'AI Content Generation',
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
                  <strong>AI-Powered!</strong> Use artificial intelligence to generate quizzes, assignments, and rubrics quickly. Save hours of content creation time.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">AI-Assisted Content Creation</h3>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🧠 AI Quiz Generation</h4>
              <p className="text-sm text-gray-600 mb-3">Generate quiz questions automatically based on your lesson content or topic.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Open the quiz builder and click "Generate with AI"</li>
                <li>Enter a topic or paste lesson content for context</li>
                <li>Select question types (multiple choice, true/false, short answer)</li>
                <li>Choose difficulty level and number of questions</li>
                <li>Review generated questions and edit as needed</li>
                <li>Add to your quiz or regenerate if needed</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📝 AI Assignment Generation</h4>
              <p className="text-sm text-gray-600 mb-3">Create assignment prompts and instructions using AI assistance.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Open the assignment builder and click "Generate with AI"</li>
                <li>Describe the learning objectives and topic</li>
                <li>Specify the type of assignment (essay, project, case study)</li>
                <li>Set parameters like length and format requirements</li>
                <li>Review and customize the generated assignment</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 AI Rubric Generation</h4>
              <p className="text-sm text-gray-600 mb-3">Generate grading rubrics that align with your assignment objectives.</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>When creating an assignment, click "Generate Rubric with AI"</li>
                <li>The AI analyzes your assignment description</li>
                <li>Review the generated criteria and point values</li>
                <li>Edit criteria, descriptions, and scoring as needed</li>
                <li>Save the rubric for consistent grading</li>
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
                  <strong>Important:</strong> Always review AI-generated content before publishing. Verify accuracy, appropriateness, and alignment with your learning objectives.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'surveys',
      title: 'Surveys',
      icon: <Icon icon="mdi:clipboard-list" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Creating and Managing Surveys</h3>
          <p className="text-sm text-gray-700">Gather feedback from students using surveys to improve your courses and teaching.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Creating Surveys</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Navigate to your course and click "Create Survey"</li>
                <li>Add a title and description explaining the survey purpose</li>
                <li>Add questions using different types:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Multiple choice (single or multiple selection)</li>
                    <li>Rating scales (1-5 or 1-10)</li>
                    <li>Short text responses</li>
                    <li>Long text/essay responses</li>
                  </ul>
                </li>
                <li>Mark questions as required or optional</li>
                <li>Set whether responses are anonymous</li>
                <li>Publish when ready for students</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📈 Viewing Survey Results</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Access survey results from the survey management page</li>
                <li>View aggregate statistics for each question</li>
                <li>See charts and visualizations for quantitative data</li>
                <li>Read individual text responses</li>
                <li>Export results for further analysis</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">💡 Survey Best Practices</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Keep surveys short and focused (5-10 questions)</li>
                <li>Use clear, unambiguous question wording</li>
                <li>Mix question types for richer feedback</li>
                <li>Consider anonymous surveys for honest feedback</li>
                <li>Send mid-course surveys to make improvements</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'anonymous-grading',
      title: 'Anonymous Grading',
      icon: <Icon icon="mdi:incognito" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Anonymous Grading</h3>
          <p className="text-sm text-gray-700">Grade assignments without seeing student names to reduce bias and ensure fair evaluation.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎭 How Anonymous Grading Works</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Student names are hidden during the grading process</li>
                <li>Submissions are identified by anonymous IDs</li>
                <li>You grade based solely on the work quality</li>
                <li>Student names are revealed after grading is complete</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ Enabling Anonymous Grading</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create or edit an assignment</li>
                <li>In the assignment settings, enable "Anonymous Grading"</li>
                <li>Save the assignment</li>
                <li>When grading, student identities will be hidden</li>
                <li>After grading all submissions, reveal identities to post grades</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">✅ Best Practices</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Use for high-stakes assignments where fairness is critical</li>
                <li>Remind students not to include identifying info in submissions</li>
                <li>Grade all submissions before revealing identities</li>
                <li>Consider using rubrics for consistent evaluation</li>
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
                  <strong>Tip:</strong> Anonymous grading is especially valuable for essay assignments and subjective evaluations where unconscious bias might affect grading.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'peer-review',
      title: 'Peer Review',
      icon: <Icon icon="mdi:account-multiple-check" className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Peer Review Assignments</h3>
          <p className="text-sm text-gray-700">Enable students to review and provide feedback on each other&apos;s work, promoting collaborative learning.</p>

          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🤝 How Peer Review Works</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Students submit their assignments by the deadline</li>
                <li>After the deadline, students are assigned peer submissions to review</li>
                <li>Reviewers provide feedback using a rubric or guidelines you set</li>
                <li>Students receive feedback from their peers</li>
                <li>You can view all peer reviews and optionally grade them</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ Setting Up Peer Review</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create or edit an assignment</li>
                <li>Enable "Peer Review" in assignment settings</li>
                <li>Set the number of reviews each student should complete</li>
                <li>Configure the peer review deadline</li>
                <li>Create a review rubric or guidelines</li>
                <li>Choose whether reviews are anonymous</li>
                <li>Optionally weight peer review grades</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Managing Peer Reviews</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>View peer review assignments and completion status</li>
                <li>Read all peer feedback for each submission</li>
                <li>Reassign reviews if needed</li>
                <li>Grade the quality of peer reviews</li>
                <li>Combine peer scores with instructor grades</li>
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
                  <strong>Benefits:</strong> Peer review helps students learn from each other, develop critical evaluation skills, and gain multiple perspectives on their work.
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Icon icon="mdi:help-circle" className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Instructor Help Center</span>
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
                currentPage="/help/instructor"
                userRole="instructor"
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
          currentPage="/help/instructor"
          context={{ userRole: 'instructor', activeSection }}
        />
      )}
    </div>
  );
}

