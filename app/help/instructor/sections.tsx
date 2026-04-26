import React from 'react';
import { Icon } from '@iconify/react';
import Callout from '@/app/help/_components/Callout';
import HelpCard from '@/app/help/_components/HelpCard';
import type { HelpSection } from '@/app/help/_components/types';

const QuickStart = ({ icon, title, body }: { icon: string; title: string; body: string }) => (
  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
      <Icon icon={icon} className="w-4 h-4" aria-hidden />
    </div>
    <div>
      <p className="font-medium text-slate-900 text-sm">{title}</p>
      <p className="text-sm text-slate-600 mt-0.5">{body}</p>
    </div>
  </div>
);

const ContentTypeChip = ({
  number,
  icon,
  title,
  body,
  accent = 'slate',
}: {
  number: number;
  icon: string;
  title: string;
  body: string;
  accent?: 'slate' | 'emerald' | 'violet' | 'blue' | 'indigo';
}) => {
  const tone = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  }[accent];
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${tone}`}>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white/60 text-xs font-semibold">
        {number}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium text-sm">
          <Icon icon={icon} className="w-4 h-4" aria-hidden />
          <span>{title}</span>
        </p>
        <p className="text-xs mt-0.5 opacity-80">{body}</p>
      </div>
    </div>
  );
};

const AIModeChip = ({ icon, name, body }: { icon: string; name: string; body: string }) => (
  <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
    <Icon icon={icon} className="h-4 w-4 flex-shrink-0 text-slate-500 mt-0.5" aria-hidden />
    <div>
      <p className="text-sm font-semibold text-slate-800">{name}</p>
      <p className="text-xs text-slate-600">{body}</p>
    </div>
  </div>
);

export const instructorHelpSections: HelpSection[] = [
  // ---------------------------------------------------------------------------
  {
    id: 'getting-started',
    title: 'Getting Started as Instructor',
    description: 'A short orientation to your teaching tools.',
    icon: 'mdi:account-tie',
    group: 'Get started',
    searchText: 'instructor dashboard quick start course content grading announcements discussions',
    content: (
      <div className="space-y-5">
        <Callout variant="info" title="Welcome, Instructor">
          This guide covers all instructor-specific features and tools available to you.
        </Callout>

        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-3">Quick start</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickStart
              icon="mdi:view-dashboard-outline"
              title="Access your instructor dashboard"
              body="See courses you're teaching and student progress."
            />
            <QuickStart
              icon="mdi:book-edit-outline"
              title="Create and manage course content"
              body="Add lessons, assignments, quizzes, and resources."
            />
            <QuickStart
              icon="mdi:clipboard-check-outline"
              title="Grade assignments and quizzes"
              body="Provide feedback and track student performance."
            />
            <QuickStart
              icon="mdi:forum-outline"
              title="Engage with students"
              body="Post announcements and participate in discussions."
            />
          </div>
        </div>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'course-management',
    title: 'Course Management',
    description: 'Build, organise, and configure your courses.',
    icon: 'mdi:book-cog-outline',
    group: 'Courses & content',
    searchText: 'course content lessons modules prerequisites enrollments progress visibility publish difficulty',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:book-open-page-variant-outline" title="Creating course content">
          <p className="mb-2">Build comprehensive learning experiences by combining several content types. Well-structured content keeps students engaged.</p>
          <ol>
            <li>Add lessons with rich text, videos, and resources via the lesson editor.</li>
            <li>Organise content using subjects and modules for clear navigation.</li>
            <li>Set lesson prerequisites and unlock conditions to control the learning path.</li>
            <li>Upload supplementary materials (PDFs, slides, worksheets).</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:account-multiple-outline" title="Managing enrolments">
          <ol>
            <li>View all enrolled students from the course settings.</li>
            <li>Track progress and completion per student.</li>
            <li>Monitor engagement and activity levels.</li>
            <li>Export enrolment lists when needed.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:tune" title="Course settings">
          <ol>
            <li>Update the course description and learning objectives.</li>
            <li>Set difficulty (beginner, intermediate, advanced) and prerequisites.</li>
            <li>Configure enrolment options — open, by approval, or restricted.</li>
            <li>Manage visibility and publish status (draft, visible, published).</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'content-creation',
    title: 'Content Creation',
    description: 'All 13 content types and how to use them effectively.',
    icon: 'mdi:pencil-outline',
    group: 'Courses & content',
    searchText: 'content types text video interactive audio podcast code sandbox image pdf file embed slideshow quiz assignment 3d model lesson editor proctoring safe browser',
    content: (
      <div className="space-y-4">
        <HelpCard
          icon="mdi:shape-outline"
          title="Available content types (13 types)"
          description="Mix content types to create engaging, diverse learning experiences."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <ContentTypeChip number={1} icon="mdi:format-text" title="Text Content" body="Rich text editor" />
            <ContentTypeChip number={2} icon="mdi:video-outline" title="Video" body="YouTube, Vimeo, embeds" />
            <ContentTypeChip number={3} icon="mdi:movie-open-play-outline" title="Interactive Video" body="Questions at checkpoints" accent="emerald" />
            <ContentTypeChip number={4} icon="mdi:podcast" title="Audio / Podcast" body="Audio with player" accent="violet" />
            <ContentTypeChip number={5} icon="mdi:code-tags" title="Code Sandbox" body="Live code editor" accent="blue" />
            <ContentTypeChip number={6} icon="mdi:image-outline" title="Images" body="Image uploads" />
            <ContentTypeChip number={7} icon="mdi:file-pdf-box" title="PDF Documents" body="Inline PDF viewer" />
            <ContentTypeChip number={8} icon="mdi:paperclip" title="File Uploads" body="Any file type" />
            <ContentTypeChip number={9} icon="mdi:link-variant" title="Embedded Content" body="External embeds" />
            <ContentTypeChip number={10} icon="mdi:presentation-play" title="Slideshows" body="Presentation embeds" />
            <ContentTypeChip number={11} icon="mdi:help-circle-outline" title="Quizzes" body="Assessments" />
            <ContentTypeChip number={12} icon="mdi:clipboard-text-outline" title="Assignments" body="Student tasks" />
            <ContentTypeChip number={13} icon="mdi:cube-outline" title="3D Model" body="Interactive 3D + AR" accent="indigo" />
          </div>
        </HelpCard>

        <Callout variant="feature" title="3D Model block (NEW)" icon="mdi:cube-outline">
          <p>
            Embed a real 3D model students can rotate, zoom, and view in AR on supported devices.
            Powered by <code>&lt;model-viewer&gt;</code>.
          </p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Add a <strong>3D Model</strong> content block to your lesson.</li>
            <li>
              Upload a <code>.glb</code>, <code>.gltf</code>, or <code>.usdz</code> file. GLB is best general-purpose;
              USDZ enables native iOS Quick Look AR.
            </li>
            <li>
              Optionally add <strong>instructions</strong> (rich text) and choose to show them <strong>before</strong> or <strong>after</strong> the model.
            </li>
            <li>
              Students get orbit/zoom controls, a <strong>fullscreen</strong> toggle, and a <strong>View in AR</strong> button on mobile.
            </li>
          </ol>
          <p className="text-xs">
            <strong>Tip:</strong> Keep models under ~25 MB for snappy loading. Compress textures (Draco, KTX2) and remove unused animations.
          </p>
        </Callout>

        <HelpCard icon="mdi:movie-open-play-outline" title="Interactive Video (NEW)">
          <p className="mb-2">Embed questions at specific timestamps — perfect for tutorials and knowledge checks.</p>
          <ol>
            <li>Upload a video or use a YouTube/Vimeo URL.</li>
            <li>Add checkpoints at specific timestamps to pause and ask questions.</li>
            <li>Create questions (multiple choice, true/false, short answer).</li>
            <li>Set feedback and points for each checkpoint.</li>
            <li>Students see progress and can review answers afterwards.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:podcast" title="Audio / Podcast content (NEW)">
          <p className="mb-2">Audio with full playback controls and accessibility features.</p>
          <ol>
            <li>Upload audio files (MP3, WAV, OGG, M4A).</li>
            <li>Add transcripts for accessibility.</li>
            <li>Players include speed control (0.5×–2×), volume, and download.</li>
            <li>Ideal for language learning, lectures, and interviews.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:code-tags" title="Code Sandbox (NEW)">
          <p className="mb-2">Interactive coding exercises with live execution.</p>
          <ol>
            <li>Pick a language (JavaScript, TypeScript, HTML/CSS, Python, Java, C++, SQL, JSON).</li>
            <li>Provide starter code or use language templates.</li>
            <li>Add instructions and learning objectives.</li>
            <li>Enable read-only mode for reference code or solutions.</li>
            <li>JS and HTML/CSS run directly in the browser; other languages show syntax-highlighted code.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:format-text" title="Lesson editor basics">
          <ol>
            <li>Use the rich text editor for headings, bold, italic, lists, and colours.</li>
            <li>Paste or drag images directly into the editor.</li>
            <li>Embed YouTube, Vimeo, slides, or other web-based resources.</li>
            <li>Add code blocks with syntax highlighting for technical content.</li>
            <li>Switch between visual (WYSIWYG) and HTML code view for fine-tuning.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:clipboard-text-outline" title="Assignments">
          <p className="mb-2">Clear instructions and appropriate settings help students submit quality work on time.</p>
          <ol>
            <li>Write detailed instructions explaining requirements and expectations.</li>
            <li>Set due dates and point values aligned with importance.</li>
            <li>Choose accepted file types (PDF, DOC, DOCX, etc.).</li>
            <li>Decide on late submissions, grace periods, and lateness penalties.</li>
            <li>Add rubric criteria for consistent grading and clearer feedback.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:help-circle-outline" title="Quizzes">
          <p className="mb-2">Assess understanding and provide immediate feedback. Mix question types to test different levels of knowledge.</p>
          <ol>
            <li>Create multiple choice, true/false, and short answer questions.</li>
            <li>Set correct answers and point values per question.</li>
            <li>Configure time limits, attempts, and answer-visibility settings.</li>
            <li>Always preview a quiz from the student perspective before publishing.</li>
            <li>Review results and analytics to identify low-success questions.</li>
          </ol>
        </HelpCard>

        <Callout variant="danger" title="Safe Browser Mode (proctored quizzes)">
          <p>Enable Safe Browser Mode for high-stakes quizzes — it monitors behaviour and can auto-submit on violations.</p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Toggle <strong>Enable Safe Browser Mode</strong> when creating or editing a quiz.</li>
            <li>
              Configure proctoring settings:
              <ul className="ml-5 list-disc">
                <li><strong>Max violations</strong> — count before auto-submit (default: 3).</li>
                <li><strong>Fullscreen required</strong> — keep students in fullscreen.</li>
                <li><strong>Block right-click</strong> — disable context menu.</li>
                <li><strong>Block keyboard shortcuts</strong> — disable copy/paste, etc.</li>
                <li><strong>Auto-submit on violation</strong> — submit at max violations.</li>
              </ul>
            </li>
            <li>
              Detected violations include tab switching, exiting fullscreen, right-clicks, shortcuts, and copy/paste attempts.
            </li>
            <li>Students see a consent screen before starting.</li>
            <li>Review violation logs in the quiz results.</li>
          </ol>
          <p className="text-xs">
            <strong>Best practice:</strong> Reserve Safe Browser Mode for high-stakes assessments (midterms, finals). For practice quizzes, allow unlimited attempts without proctoring to encourage learning.
          </p>
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'grading',
    title: 'Grading & Feedback',
    description: 'Grade student work and manage your gradebook.',
    icon: 'mdi:clipboard-check-outline',
    group: 'Outcomes & insights',
    searchText: 'grading assignments gradebook quiz results feedback rubric export',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:file-document-edit-outline" title="Grading assignments">
          <ol>
            <li>Navigate to the assignment in your course.</li>
            <li>View all student submissions.</li>
            <li>Review submitted files and work.</li>
            <li>Enter grades and provide written feedback.</li>
            <li>Save grades — students receive email notifications.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:table-large" title="Gradebook management">
          <p className="mb-2">The Gradebook is your central hub for tracking student performance.</p>
          <ol>
            <li>Access the Gradebook from course navigation.</li>
            <li>View all students and their grades in one place.</li>
            <li>Update grades directly in the Gradebook interface.</li>
            <li>Track completion status for assignments.</li>
            <li>Calculate final course grades automatically based on weights.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:check-circle-outline" title="Quiz results">
          <ol>
            <li>View automatic quiz grading results for objective questions.</li>
            <li>Review student answers and performance.</li>
            <li>Identify questions with low success rates to refine teaching.</li>
            <li>Export results for analysis or record-keeping.</li>
          </ol>
        </HelpCard>

        <Callout variant="tip" title="Tip">
          Provide timely, constructive feedback. Students receive an email each time you post a grade.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'announcements',
    title: 'Course Announcements',
    description: 'Post, schedule, and manage course announcements.',
    icon: 'mdi:bullhorn-outline',
    group: 'Communications',
    searchText: 'announcements pin schedule expire email notifications students',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:bullhorn-variant-outline" title="Creating announcements">
          <ol>
            <li>Open your course page.</li>
            <li>Click the <strong>Announcements</strong> tab.</li>
            <li>Click <strong>Create Announcement</strong>.</li>
            <li>Enter title and content.</li>
            <li>Optionally attach files or schedule for later.</li>
            <li>Pin important announcements to keep them at the top.</li>
            <li>Publish.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:email-fast-outline" title="Email notifications">
          <p className="mb-2">When you post an announcement, students automatically receive an email so they don&apos;t miss critical updates.</p>
          <ol>
            <li>All enrolled students receive notifications automatically.</li>
            <li>Announcements also appear in the course&apos;s Announcements section as a permanent record.</li>
            <li>Email delivery happens in the background.</li>
            <li>The email includes title, preview, and a link to the full announcement.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:pin-outline" title="Managing announcements">
          <ol>
            <li>Edit or delete existing announcements.</li>
            <li>Pin important announcements to the top.</li>
            <li>Schedule announcements for future dates.</li>
            <li>Set expiration dates for time-sensitive announcements.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'discussions',
    title: 'Discussion Management',
    description: 'Foster productive discussions in and beyond your course.',
    icon: 'mdi:forum-outline',
    group: 'Engagement',
    searchText: 'discussions global course threads pin moderate mentions notifications',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Global Discussions (NEW)">
          <p>Platform-wide discussions let you engage with the broader learning community beyond your courses.</p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Access from the <strong>Discussions</strong> link in the main navigation.</li>
            <li>Start discussions on topics that benefit students across courses.</li>
            <li>
              Browse by category — General, Academic Help, Campus Life, Career &amp; Jobs, Tech Support, Announcements.
            </li>
            <li>Upvote valuable content to help it surface.</li>
            <li>Build presence as an approachable, helpful instructor.</li>
          </ol>
        </Callout>

        <HelpCard icon="mdi:message-text-outline" title="Course discussions">
          <p className="mb-2">Active instructor participation creates a collaborative learning environment.</p>
          <ol>
            <li>Create discussion topics with thought-provoking prompts.</li>
            <li>Reply promptly to student questions and posts.</li>
            <li>Pin important discussion threads.</li>
            <li>Moderate to keep conversations on topic and respectful.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:bell-outline" title="Student notifications">
          <ol>
            <li>Students receive email notifications when you reply.</li>
            <li>You receive notifications when students <strong>@mention</strong> you.</li>
            <li>Track discussion engagement metrics to see what works.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'student-messaging',
    title: 'Student Messaging',
    description: 'Private DMs and group chats for personalised support.',
    icon: 'mdi:chat-outline',
    group: 'Engagement',
    searchText: 'messaging direct message group chat students files response time mute',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Private messaging (NEW)">
          Communicate directly with students through private messages — perfect for office hours, individual questions, or personalised feedback.
        </Callout>

        <HelpCard icon="mdi:message-outline" title="Direct messages with students">
          <p className="mb-2">A direct communication channel for personalised support.</p>
          <ol>
            <li>Open Messages from the chat icon in the navbar.</li>
            <li>Respond to incoming student messages — unread counts appear in the navbar.</li>
            <li>Start conversations by searching for students by name.</li>
            <li>Share files and resources via attachments.</li>
            <li>Keep conversations professional — they create a record.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:account-group-outline" title="Group messaging">
          <p className="mb-2">Group chats for project teams, study groups, or course-wide communications.</p>
          <ol>
            <li>Create or join group chats for project teams.</li>
            <li>Set up course-based groups for targeted communications.</li>
            <li>Manage membership as a group admin.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:lightning-bolt-outline" title="Best practices">
          <ol>
            <li>Set response-time expectations (e.g., 24–48 hours on weekdays).</li>
            <li>Use announcements for general communications, DMs for individual matters.</li>
            <li>Encourage common questions in discussions where everyone benefits.</li>
            <li>Mute conversations to reduce notification noise.</li>
          </ol>
        </HelpCard>

        <Callout variant="tip" title="Pro tip">
          Private messaging is excellent for sensitive feedback, grade concerns, or encouraging struggling students in a private setting.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'video-conferences',
    title: 'Video Conferences',
    description: 'Schedule live sessions with attendance tracking.',
    icon: 'mdi:video-outline',
    group: 'Engagement',
    searchText: 'video conference jitsi google meet bigbluebutton attendance recording recurring session',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:video-plus-outline" title="Creating conferences">
          <p className="mb-2">Real-time interaction for lectures, Q&amp;A, office hours, and group discussions.</p>
          <ol>
            <li>Schedule meetings for specific lessons or your entire course.</li>
            <li>Set duration and participant limits.</li>
            <li>Toggle recording and waiting-room features.</li>
            <li>Choose between 8x8.vc (Jitsi Meet), Google Meet, or BigBlueButton.</li>
            <li>Meeting links auto-generate and share with enrolled students.</li>
          </ol>
        </HelpCard>

        <Callout variant="success" title="Google Meet integration" icon="mdi:google">
          <ol className="ml-5 list-decimal space-y-1">
            <li>Select <strong>Google Meet</strong> when creating the conference.</li>
            <li>
              For instant meetings, paste a link from{' '}
              <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">
                meet.google.com/new
              </a>
              .
            </li>
            <li>For scheduled meetings, links can auto-generate if Google Calendar API is configured.</li>
            <li>Students click <strong>Join Meeting</strong> to open Google Meet directly.</li>
            <li>Supports screen sharing, recording (with Workspace), and breakout rooms.</li>
          </ol>
        </Callout>

        <Callout variant="info" title="Attendance tracking" icon="mdi:account-check-outline">
          <ol className="ml-5 list-decimal space-y-1">
            <li>Automatic check-in when students click <strong>Join Meeting</strong>.</li>
            <li>View attendance records on the conference details page.</li>
            <li>Track patterns to identify students who need encouragement.</li>
            <li>Export attendance data for grading or reporting.</li>
            <li>Use attendance for participation grades.</li>
          </ol>
        </Callout>

        <HelpCard icon="mdi:calendar-clock-outline" title="Managing sessions">
          <ol>
            <li>View all scheduled conferences in one place.</li>
            <li>Edit or cancel — students are auto-notified of changes.</li>
            <li>Set up recurring sessions for office hours.</li>
            <li>Monitor attendance per session.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'analytics',
    title: 'Student Analytics',
    description: 'Track course performance and individual progress.',
    icon: 'mdi:chart-line',
    group: 'Outcomes & insights',
    searchText: 'analytics enrollment completion engagement individual progress export report',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:chart-bar" title="Course analytics">
          <p className="mb-2">Identify trends, measure success, and make data-driven improvements.</p>
          <ol>
            <li>View enrolment and completion rates.</li>
            <li>Track average grades and performance metrics.</li>
            <li>Monitor engagement (logins, time on materials, discussion activity).</li>
            <li>Identify students who may need extra support.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:account-outline" title="Individual progress">
          <ol>
            <li>View each student&apos;s progress in course settings.</li>
            <li>Track lesson completion and quiz scores.</li>
            <li>Monitor assignment submission rates.</li>
            <li>Export individual or aggregate progress reports.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'lecturer-collaboration',
    title: 'Lecturer Collaboration',
    description: 'Connect with peers, share resources, and chat in real time.',
    icon: 'mdi:account-group-outline',
    group: 'Engagement',
    searchText: 'lecturer collaboration discussions resources virtual staff room chat upload share',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Connect with fellow lecturers">
          Access these features from the <strong>Lecturer Collaboration</strong> section in the main navigation.
        </Callout>

        <HelpCard icon="mdi:forum-outline" title="Lecturer discussions">
          <p className="mb-2">Share teaching strategies, ask questions, and exchange ideas.</p>
          <ol>
            <li>Browse by category (Pedagogy, Technology, Assessment, Curriculum Design, etc.).</li>
            <li>Create discussions on topics you care about.</li>
            <li>Post questions and share insights from your practice.</li>
            <li>Reply and engage to build a community of practice.</li>
            <li>Upvote valuable contributions.</li>
            <li>Edit or delete your own posts.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:bookshelf" title="Resource sharing hub">
          <p className="mb-2">Upload, discover, and share educational resources with colleagues.</p>
          <ol>
            <li>Upload documents, presentations, videos, worksheets, lesson plans.</li>
            <li>Browse and search shared resources by subject, type, or rating.</li>
            <li>Rate resources (1–5 stars) to help others identify quality.</li>
            <li>Bookmark favourites for quick access later.</li>
            <li>Filter by subject, type, and rating.</li>
            <li>Download resources for your own courses.</li>
            <li>View descriptions, ratings, and download counts.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:chat-processing-outline" title="Virtual staff room">
          <p className="mb-2">Chat in real time with other lecturers in topic-based rooms.</p>
          <ol>
            <li>Browse rooms you&apos;re a member of, sorted by recent activity.</li>
            <li>Create new rooms for departments, projects, or interest groups.</li>
            <li>Join public rooms or accept invitations to private ones.</li>
            <li>Send real-time messages.</li>
            <li>Reply to specific messages to thread conversations.</li>
            <li>React with emoji to acknowledge or agree.</li>
            <li>Manage members (admins, moderators) as a room creator.</li>
            <li>Receive instant notifications for mentions and new messages.</li>
          </ol>
        </HelpCard>

        <Callout variant="tip" title="Pro tip">
          Use Lecturer Collaboration to build a professional learning community — share resources, discuss best practices, and support each other in creating better experiences for students.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'ai-generation',
    title: 'AI Content Generation',
    description: 'Generate quizzes, assignments, rubrics, and rich lessons with AI.',
    icon: 'mdi:robot-outline',
    group: 'Courses & content',
    searchText: 'ai quiz generation assignment rubric content enhancement lesson editor proseforge beautify expand summarize simplify grammar',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="AI-powered creation" icon="mdi:sparkles">
          Save hours of content creation time. Use AI to generate quizzes, assignments, rubrics, and to enhance lessons.
        </Callout>

        <HelpCard icon="mdi:brain" title="AI quiz generation">
          <p className="mb-2">Generate quiz questions automatically from your lesson content or topic.</p>
          <ol>
            <li>Open the quiz builder and click <strong>Generate with AI</strong>.</li>
            <li>Enter a topic or paste lesson content for context.</li>
            <li>Select question types (multiple choice, true/false, short answer).</li>
            <li>Choose difficulty and number of questions.</li>
            <li>Review generated questions and edit as needed.</li>
            <li>Add to your quiz or regenerate.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:clipboard-edit-outline" title="AI assignment generation">
          <ol>
            <li>Open the assignment builder and click <strong>Generate with AI</strong>.</li>
            <li>Describe the learning objectives and topic.</li>
            <li>Specify type (essay, project, case study).</li>
            <li>Set parameters like length and format requirements.</li>
            <li>Review and customise the generated assignment.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:format-list-checks" title="AI rubric generation">
          <ol>
            <li>When creating an assignment, click <strong>Generate Rubric with AI</strong>.</li>
            <li>The AI analyses your assignment description.</li>
            <li>Review generated criteria and point values.</li>
            <li>Edit criteria, descriptions, and scoring as needed.</li>
            <li>Save for consistent grading.</li>
          </ol>
        </HelpCard>

        <HelpCard
          icon="mdi:auto-fix"
          title="AI content enhancement (lesson editor)"
          description="Inside the rich-text editor (ProseForge), the AI Enhance button rewrites or restyles the current selection (or whole document) using one of seven modes."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <AIModeChip icon="mdi:auto-fix" name="Beautify" body="Styled headings, blockquotes & callouts" />
            <AIModeChip icon="mdi:book-open-outline" name="Lesson Format" body="Textbook-style layout" />
            <AIModeChip icon="mdi:palette-outline" name="Add Visuals" body="Boxes, grids & styled lists" />
            <AIModeChip icon="mdi:expand-all" name="Expand" body="More detail, examples & tables" />
            <AIModeChip icon="mdi:format-list-bulleted-square" name="Summarize" body="Key takeaways & bullets" />
            <AIModeChip icon="mdi:format-letter-case-lower" name="Simplify" body="Simpler text, keep styling" />
            <AIModeChip icon="mdi:spellcheck" name="Fix Grammar" body="Corrections only" />
          </div>
          <ol className="mt-3">
            <li>Select text to enhance (or leave nothing selected for the whole document).</li>
            <li>Click the AI button in the toolbar and pick a mode.</li>
            <li>Optionally add custom instructions (&quot;keep British spellings&quot;, &quot;add an example about photosynthesis&quot;).</li>
            <li>Review the preview pane. Click <strong>Accept</strong> to insert, or pick another mode.</li>
          </ol>
          <Callout variant="info" title="Recent changes" icon="mdi:information-outline" className="mt-3">
            The AI no longer adds <code>&lt;mark&gt;</code> yellow-highlight markers — emphasis routes through bold, headings, callouts, and styled blockquotes. <strong>Blockquotes</strong> are now first-class: every blockquote in your source survives, and Beautify, Lesson Format, Expand, and Add Visuals modes use styled blockquotes for quoted material or pull quotes.
          </Callout>
        </HelpCard>

        <Callout variant="warning" title="Important">
          Always review AI-generated content before publishing. Verify accuracy, appropriateness, and alignment with your learning objectives.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'surveys',
    title: 'Surveys',
    description: 'Gather student feedback to improve your courses.',
    icon: 'mdi:clipboard-list-outline',
    group: 'Outcomes & insights',
    searchText: 'survey feedback rating questions anonymous results export',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Gather feedback from students to improve your courses and teaching.
        </p>

        <HelpCard icon="mdi:format-list-checks" title="Creating surveys">
          <ol>
            <li>Navigate to your course and click <strong>Create Survey</strong>.</li>
            <li>Add a title and description explaining the survey purpose.</li>
            <li>
              Add questions of different types:
              <ul className="ml-5 list-disc">
                <li>Multiple choice (single or multiple selection).</li>
                <li>Rating scales (1–5 or 1–10).</li>
                <li>Short text responses.</li>
                <li>Long text/essay responses.</li>
              </ul>
            </li>
            <li>Mark questions as required or optional.</li>
            <li>Set whether responses are anonymous.</li>
            <li>Publish when ready.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:chart-pie-outline" title="Viewing survey results">
          <ol>
            <li>Access results from the survey management page.</li>
            <li>View aggregate statistics for each question.</li>
            <li>See charts and visualisations for quantitative data.</li>
            <li>Read individual text responses.</li>
            <li>Export results for further analysis.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:lightbulb-on-outline" title="Survey best practices">
          <ul>
            <li>Keep surveys short and focused (5–10 questions).</li>
            <li>Use clear, unambiguous wording.</li>
            <li>Mix question types for richer feedback.</li>
            <li>Use anonymity when honest feedback matters.</li>
            <li>Send mid-course surveys to make improvements before the end.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'anonymous-grading',
    title: 'Anonymous Grading',
    description: 'Reduce bias by hiding student identities while grading.',
    icon: 'mdi:incognito',
    group: 'Outcomes & insights',
    searchText: 'anonymous grading bias hidden identity reveal essay subjective',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Grade assignments without seeing student names to reduce bias and ensure fair evaluation.
        </p>

        <HelpCard icon="mdi:account-question-outline" title="How anonymous grading works">
          <ul>
            <li>Student names are hidden during grading.</li>
            <li>Submissions are identified by anonymous IDs.</li>
            <li>You grade based solely on work quality.</li>
            <li>Names are revealed after grading is complete.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:cog-outline" title="Enabling anonymous grading">
          <ol>
            <li>Create or edit an assignment.</li>
            <li>Enable <strong>Anonymous Grading</strong> in assignment settings.</li>
            <li>Save.</li>
            <li>When grading, identities are hidden.</li>
            <li>After grading all submissions, reveal identities to post grades.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:check-circle-outline" title="Best practices">
          <ul>
            <li>Use for high-stakes assignments where fairness is critical.</li>
            <li>Remind students not to include identifying info in submissions.</li>
            <li>Grade all submissions before revealing identities.</li>
            <li>Use rubrics for consistent evaluation.</li>
          </ul>
        </HelpCard>

        <Callout variant="tip" title="Tip">
          Anonymous grading is especially valuable for essays and subjective evaluations where unconscious bias can affect grading.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'peer-review',
    title: 'Peer Review',
    description: 'Let students review each other&apos;s work.',
    icon: 'mdi:account-multiple-check-outline',
    group: 'Outcomes & insights',
    searchText: 'peer review feedback rubric reassign weight grading',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Enable students to review and provide feedback on each other&apos;s work, promoting collaborative learning.
        </p>

        <HelpCard icon="mdi:hand-clap-outline" title="How peer review works">
          <ol>
            <li>Students submit their assignments by the deadline.</li>
            <li>After the deadline, peer submissions are assigned for review.</li>
            <li>Reviewers provide feedback using a rubric or guidelines you set.</li>
            <li>Students receive feedback from their peers.</li>
            <li>You view all peer reviews and optionally grade them.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:cog-outline" title="Setting up peer review">
          <ol>
            <li>Create or edit an assignment.</li>
            <li>Enable <strong>Peer Review</strong> in assignment settings.</li>
            <li>Set the number of reviews per student.</li>
            <li>Configure the peer-review deadline.</li>
            <li>Create a review rubric or guidelines.</li>
            <li>Choose whether reviews are anonymous.</li>
            <li>Optionally weight peer-review grades.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:clipboard-list-outline" title="Managing peer reviews">
          <ol>
            <li>View peer-review assignments and completion status.</li>
            <li>Read all peer feedback per submission.</li>
            <li>Reassign reviews if needed.</li>
            <li>Grade the quality of peer reviews.</li>
            <li>Combine peer scores with instructor grades.</li>
          </ol>
        </HelpCard>

        <Callout variant="success" title="Benefits">
          Peer review helps students learn from each other, develop critical evaluation skills, and gain multiple perspectives on their work.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'course-management-tools',
    title: 'Course Management Tools',
    description: 'Cohorts, attendance, and gradebook setup.',
    icon: 'mdi:school-outline',
    group: 'Courses & content',
    searchText: 'cohorts groups attendance gradebook participants my courses',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Manage your courses with cohorts, attendance tracking, and gradebook tools.
        </p>

        <HelpCard icon="mdi:account-group-outline" title="Cohorts &amp; groups">
          <ul>
            <li>Create cohorts to group students into scheduled batches.</li>
            <li>Set up course groups for collaborative assignments.</li>
            <li>Manage enrolment and capacity per cohort.</li>
            <li>View all your courses from <strong>My Courses</strong>.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:calendar-check-outline" title="Attendance tracking">
          <ul>
            <li>Open a course and navigate to <strong>Attendance</strong>.</li>
            <li>Mark students as present, absent, or late per session.</li>
            <li>View attendance history and patterns.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:table-large" title="Course gradebook">
          <ul>
            <li>Each course has its own gradebook.</li>
            <li>Configure grade categories and weights in <strong>Gradebook Setup</strong>.</li>
            <li>Enter grades directly in the gradebook view.</li>
            <li>View course <strong>Participants</strong> for the enrolment list.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'question-banks',
    title: 'Question Banks',
    description: 'Reusable question pools for your quizzes.',
    icon: 'mdi:database-search-outline',
    group: 'Courses & content',
    searchText: 'question banks reusable quiz random tag',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Build reusable pools of questions that can be shared across multiple quizzes.
        </p>

        <HelpCard icon="mdi:format-list-bulleted-square" title="Creating question banks">
          <ul>
            <li>Navigate to <strong>Question Banks</strong> from admin or course settings.</li>
            <li>Create banks organised by subject, topic, or difficulty.</li>
            <li>Add questions of any type.</li>
            <li>Tag questions for easy filtering.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:dice-multiple-outline" title="Using banks in quizzes">
          <ul>
            <li>Select questions from your banks when creating a quiz.</li>
            <li>Set the number of random questions to draw from each bank.</li>
            <li>Students receive unique randomised question sets.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'learning-paths',
    title: 'Learning Paths',
    description: 'Structured course sequences for guided learning.',
    icon: 'mdi:road-variant',
    group: 'Courses & content',
    searchText: 'learning paths sequence prerequisites completion certificate',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Create structured sequences of courses that guide students through a learning journey.
        </p>

        <HelpCard icon="mdi:source-branch-plus" title="Creating a learning path">
          <ul>
            <li>Navigate to <strong>Learning Paths</strong> and create a new path.</li>
            <li>Add courses in the desired sequence.</li>
            <li>Configure prerequisites between courses.</li>
            <li>Set completion criteria for the overall path.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:chart-line" title="Student progress">
          <ul>
            <li>Students enrol and progress through courses in order.</li>
            <li>Track enrolment and completion rates per path.</li>
            <li>Students earn a completion certificate when finished.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'adaptive-learning',
    title: 'Adaptive Learning',
    description: 'Personalise learning based on student performance.',
    icon: 'mdi:brain',
    group: 'Outcomes & insights',
    searchText: 'adaptive learning recommendation difficulty supplementary content',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The platform can personalise the learning experience based on student performance.
        </p>

        <HelpCard icon="mdi:gauge" title="How it works">
          <ul>
            <li>Adaptive rules (configured by admins) evaluate student performance.</li>
            <li>When a student scores below a threshold, supplementary content is recommended.</li>
            <li>Students see personalised recommendations in their Adaptive Learning dashboard.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:account-cog-outline" title="For instructors">
          <ul>
            <li>Create supplementary lessons and materials for struggling students.</li>
            <li>Review which students are receiving adaptive recommendations.</li>
            <li>Adjust course difficulty and pacing based on overall performance.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },
];

export const instructorGroupOrder: string[] = [
  'Get started',
  'Courses & content',
  'Engagement',
  'Communications',
  'Outcomes & insights',
];
