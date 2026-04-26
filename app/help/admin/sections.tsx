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

export const adminHelpSections: HelpSection[] = [
  // ---------------------------------------------------------------------------
  {
    id: 'getting-started',
    title: 'Getting Started as Admin',
    description: 'A short orientation to the admin tools.',
    icon: 'mdi:shield-account',
    group: 'Get started',
    searchText: 'admin dashboard quick start manage users courses analytics',
    content: (
      <div className="space-y-5">
        <Callout variant="info" title="Welcome, Administrator">
          This guide covers all administrative features and system-management tools available across your tenant.
        </Callout>

        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-3">Quick start</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickStart
              icon="mdi:view-dashboard-outline"
              title="Access the Admin Dashboard"
              body="System-wide statistics and quick links to management tools."
            />
            <QuickStart
              icon="mdi:account-group-outline"
              title="Manage users"
              body="Create accounts, assign roles, and manage permissions."
            />
            <QuickStart
              icon="mdi:book-multiple-outline"
              title="Manage courses"
              body="Create courses, assign instructors, and control visibility."
            />
            <QuickStart
              icon="mdi:chart-line"
              title="View analytics"
              body="Monitor performance, engagement, and learning outcomes."
            />
          </div>
        </div>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'user-management',
    title: 'User Management',
    description: 'Create accounts, assign roles, and manage user records.',
    icon: 'mdi:account-group',
    group: 'People',
    searchText: 'user accounts roles permissions super admin tenant instructor curriculum designer student parent edit reset password activate deactivate',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:account-plus-outline" title="Creating user accounts">
          <ol>
            <li>Navigate to <strong>Admin → Users → Manage Users</strong>.</li>
            <li>Click <strong>Add New User</strong>.</li>
            <li>Enter user details (name, email, role).</li>
            <li>Set an initial password or send a password-reset email.</li>
            <li>Assign a role (student, instructor, admin, etc.).</li>
            <li>Save — the user receives their account details by email.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:shield-key-outline" title="User roles and permissions">
          <ul>
            <li><strong>Super Admin</strong> — Full system access, including role changes and tenant management.</li>
            <li><strong>Tenant Admin</strong> — Manages own tenant settings, users, and branding.</li>
            <li><strong>Admin</strong> — User and course management within a tenant.</li>
            <li><strong>Instructor</strong> — Creates courses, grades assignments, manages students.</li>
            <li><strong>Curriculum Designer</strong> — Full course creation and editing.</li>
            <li><strong>Student</strong> — Enrols, submits, and participates in discussions.</li>
            <li><strong>Parent</strong> — Views linked student progress, grades, and activity.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:pencil-outline" title="Editing users">
          <ul>
            <li>Update name, email, and profile information.</li>
            <li>Change roles (Super Admin only).</li>
            <li>Reset passwords.</li>
            <li>Activate or deactivate accounts.</li>
            <li>View activity and enrolment history.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'course-management',
    title: 'Course Management',
    description: 'Create courses, assign instructors, and curate the catalogue.',
    icon: 'mdi:book-multiple',
    group: 'Courses & content',
    searchText: 'create course instructors featured delete content types proctoring video conference jitsi google meet bigbluebutton interactive video audio code sandbox 3d model',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:book-plus-outline" title="Creating courses">
          <ol>
            <li>Navigate to <strong>Admin → Courses → Manage Courses</strong>.</li>
            <li>Click <strong>Add New Course</strong>.</li>
            <li>Enter title, description, and objectives.</li>
            <li>Set difficulty and prerequisites.</li>
            <li>Assign instructors.</li>
            <li>Mark as featured for the homepage if desired.</li>
            <li>Publish when ready.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:account-tie-outline" title="Assigning instructors">
          <ul>
            <li>Add multiple instructors per course.</li>
            <li>Distinguish primary and secondary instructors.</li>
            <li>Instructors can author content and grade assignments.</li>
            <li>Reassign instructors at any time.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:star-outline" title="Featured courses">
          <ul>
            <li>Toggle <strong>Featured</strong> to highlight courses on the homepage.</li>
            <li>Featured courses appear in the Featured Courses section.</li>
            <li>Use this to promote new or popular content.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:delete-outline" title="Deleting courses">
          <ul>
            <li>From <strong>Admin → Courses → Manage</strong>, click the delete icon on a course row.</li>
            <li>A two-step confirmation shows the course title and enrolment count before any destructive action.</li>
            <li>Deletion cascades to lessons, content blocks, quizzes, assignments, and uploads — there is no undo.</li>
            <li>If the course has been shared to another tenant, deleting at the source removes the forks too — review <strong>Course Sharing</strong> first.</li>
            <li>Prefer unpublishing or archiving when possible.</li>
          </ul>
        </HelpCard>

        <HelpCard
          icon="mdi:shape-outline"
          title="Course content types (13 available)"
          description="The platform supports 13 content types instructors can add to lessons. Knowing the options helps when reviewing courses or supporting instructors."
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

          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-900 mb-2">New interactive content types</p>
            <ul className="text-xs">
              <li><strong>Interactive Video</strong> — Pauses at checkpoints to ask questions, increasing engagement.</li>
              <li><strong>Audio / Podcast</strong> — Playback controls, speed adjustment, and optional transcripts.</li>
              <li><strong>Code Sandbox</strong> — 8 languages (JavaScript, TypeScript, HTML/CSS, Python, Java, C++, SQL, JSON) with live execution.</li>
              <li><strong>3D Model</strong> — Renders <code>.glb</code>, <code>.gltf</code>, or <code>.usdz</code> via <code>&lt;model-viewer&gt;</code>. Supports orbit/zoom, fullscreen, and AR (USDZ on iOS, GLB on Android).</li>
            </ul>
          </div>
        </HelpCard>

        <Callout variant="danger" title="Quiz proctoring (Safe Browser Mode)">
          <p>The platform includes a built-in proctoring system instructors can enable for high-stakes assessments.</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>How it works:</strong> Quizzes run in fullscreen and monitor for tab switching, window blur, and keyboard shortcuts.</li>
            <li><strong>Violation tracking:</strong> Logged to <code>quiz_proctor_logs</code> with timestamps.</li>
            <li><strong>Auto-submit:</strong> Quizzes can submit automatically once a student exceeds the maximum violation count.</li>
            <li><strong>Instructor access:</strong> Instructors view violation logs to identify integrity issues.</li>
            <li><strong>Database columns:</strong> <code>proctored_mode</code> (boolean) and <code>proctor_settings</code> (JSONB) on the quizzes table.</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Note:</strong> Client-side, deterrent-grade — not a full secure-browser replacement, but reasonable protection for online assessments.
          </p>
        </Callout>

        <Callout variant="success" title="Video conference providers" icon="mdi:video-outline">
          <p>The platform supports multiple providers for live sessions.</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>8x8.vc (Jitsi Meet)</strong> — Free, open-source, no account required for students. Links auto-generated.</li>
            <li><strong>Google Meet</strong> — Familiar UI, requires Google account. Paste existing links or auto-generate via Calendar API.</li>
            <li><strong>BigBlueButton</strong> — Open-source, classroom-focused. Requires server configuration.</li>
            <li><strong>Attendance:</strong> Logged automatically when students join via the platform.</li>
          </ul>
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'content-types',
    title: 'Content Types Overview',
    description: 'How each lesson content type works and when to use it.',
    icon: 'mdi:file-document-multiple',
    group: 'Courses & content',
    searchText: 'content types text video interactive audio podcast code sandbox image pdf file embed slideshow quiz assignment 3d',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The platform supports 12 content types instructors can use to create engaging lessons. Knowing each option helps you support instructors and review courses.
        </p>

        <HelpCard icon="mdi:shape-outline" title="All content types">
          <div className="grid gap-2 sm:grid-cols-2">
            <ContentTypeChip number={1} icon="mdi:format-text" title="Text Content" body="Rich text editor with formatting" />
            <ContentTypeChip number={2} icon="mdi:video-outline" title="Video" body="YouTube, Vimeo, embeds" />
            <ContentTypeChip number={3} icon="mdi:movie-open-play-outline" title="Interactive Video (NEW)" body="Embedded questions at checkpoints" accent="emerald" />
            <ContentTypeChip number={4} icon="mdi:podcast" title="Audio / Podcast (NEW)" body="Player and transcripts" accent="violet" />
            <ContentTypeChip number={5} icon="mdi:code-tags" title="Code Sandbox (NEW)" body="Live editor, 8 languages" accent="blue" />
            <ContentTypeChip number={6} icon="mdi:image-outline" title="Images" body="Image uploads and displays" />
            <ContentTypeChip number={7} icon="mdi:file-pdf-box" title="PDF Documents" body="PDF viewer" />
            <ContentTypeChip number={8} icon="mdi:paperclip" title="File Uploads" body="Any file type for download" />
            <ContentTypeChip number={9} icon="mdi:link-variant" title="Embedded Content" body="External content embeds" />
            <ContentTypeChip number={10} icon="mdi:presentation-play" title="Slideshows" body="Presentation embeds" />
            <ContentTypeChip number={11} icon="mdi:help-circle-outline" title="Quizzes" body="Interactive assessments" />
            <ContentTypeChip number={12} icon="mdi:clipboard-text-outline" title="Assignments" body="Student work tasks" />
          </div>
        </HelpCard>

        <Callout variant="success" title="Interactive Video" icon="mdi:movie-open-play-outline">
          <p>Videos pause at specified timestamps to ask questions — increases engagement and verifies comprehension.</p>
          <ul className="ml-5 list-disc space-y-1 text-xs">
            <li>Instructors add checkpoints at specific timestamps.</li>
            <li>Multiple choice, true/false, or short answer.</li>
            <li>Students must answer to continue watching.</li>
            <li>Immediate feedback and progress tracking.</li>
            <li>Ideal for tutorials and case studies.</li>
          </ul>
        </Callout>

        <Callout variant="feature" title="Audio / Podcast content" icon="mdi:podcast">
          <p>Audio content with full playback controls and accessibility features. Essential for language learning and mobile use.</p>
          <ul className="ml-5 list-disc space-y-1 text-xs">
            <li>MP3, WAV, OGG, M4A.</li>
            <li>Speed control (0.5× to 2×).</li>
            <li>Volume and download options.</li>
            <li>Optional transcripts.</li>
            <li>Great for language learning, lectures, interviews.</li>
          </ul>
        </Callout>

        <Callout variant="info" title="Code Sandbox" icon="mdi:code-tags">
          <p>Interactive editor with live execution — critical for programming and technical courses.</p>
          <ul className="ml-5 list-disc space-y-1 text-xs">
            <li>JavaScript, TypeScript, HTML/CSS, Python, Java, C++, SQL, JSON.</li>
            <li>JS and HTML/CSS execute directly in the browser.</li>
            <li>Real-time output and error messages.</li>
            <li>Templates per language.</li>
            <li>Read-only mode for demonstrations.</li>
          </ul>
        </Callout>

        <Callout variant="tip" title="Admin tip">
          When reviewing courses, check that instructors are using appropriate content types for their learning objectives. The new interactive content types (Video, Audio, Code Sandbox) significantly enhance engagement.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'certificates',
    title: 'Certificate Management',
    description: 'Templates, issuance, and verification.',
    icon: 'mdi:certificate',
    group: 'Outcomes & insights',
    searchText: 'certificate template variables student name course pdf supabase storage verification code',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:file-document-edit-outline" title="Certificate templates">
          <ol>
            <li>Navigate to <strong>Admin → Certificates → Certificate Templates</strong>.</li>
            <li>Click <strong>Create Template</strong>.</li>
            <li>Use the rich text editor or HTML view.</li>
            <li>Add template variables: <code>{'{{student_name}}'}</code>, <code>{'{{course_name}}'}</code>, etc.</li>
            <li>Upload logo and background images.</li>
            <li>Preview before saving.</li>
            <li>Set a default for automatic issuance.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:school-outline" title="Certificate issuance">
          <ul>
            <li>Issued automatically when students complete a course.</li>
            <li>Each certificate has a unique verification code.</li>
            <li>Stored as PDFs in Supabase Storage.</li>
            <li>Students can download and share.</li>
            <li>Public verification portal confirms authenticity.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:archive-outline" title="Managing issued certificates">
          <ul>
            <li>View all in <strong>Admin → Certificates → Manage Certificates</strong>.</li>
            <li>Search and filter by student or course.</li>
            <li>Download PDFs.</li>
            <li>Regenerate when needed.</li>
            <li>View verification codes.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'analytics',
    title: 'Analytics & Reporting',
    description: 'Engagement, completion, and trend tracking.',
    icon: 'mdi:chart-bar',
    group: 'Outcomes & insights',
    searchText: 'analytics dashboard dau daily active users engagement completion top courses time spent quiz performance export csv',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:chart-areaspline" title="Analytics dashboard">
          <ul>
            <li>Access via <strong>Admin → Analytics</strong>.</li>
            <li>Daily Active Users (DAU) tracking.</li>
            <li>Course engagement metrics.</li>
            <li>Activity-type breakdowns.</li>
            <li>Course completion rates.</li>
            <li>Student progress tracking.</li>
            <li>Top courses by enrolment.</li>
            <li>Time-spent analysis.</li>
            <li>Quiz and assignment performance.</li>
            <li>Engagement trends over time.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:download-outline" title="Exporting data">
          <ul>
            <li>Export analytics to CSV.</li>
            <li>Filter by date range.</li>
            <li>Download metric-specific reports.</li>
            <li>Use exports for external analysis and reporting.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'email-notifications',
    title: 'Email Notifications',
    description: 'Resend setup, templates, and scheduled email.',
    icon: 'mdi:email-outline',
    group: 'Communications',
    searchText: 'email resend api key domain verification templates grade posted assignment due enrollment digest cron rate limit',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:cog-outline" title="Email service setup">
          <ul>
            <li>System uses the Resend API for delivery.</li>
            <li>Configure <code>RESEND_API_KEY</code> in environment variables.</li>
            <li>Verify a domain with Resend for production email.</li>
            <li>Test from <strong>Admin → Test Email</strong>.</li>
            <li>Use <code>onboarding@resend.dev</code> for testing without domain verification.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:email-edit-outline" title="Email templates">
          <ul>
            <li>Customise templates for each notification type.</li>
            <li>Templates include grade-posted, assignment-due, enrolment confirmation.</li>
            <li>Course announcements and discussion replies.</li>
            <li>Daily and weekly digests.</li>
            <li>Variable substitution supported.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:clock-outline" title="Scheduled emails">
          <ul>
            <li>Assignment-due reminders before due dates.</li>
            <li>Daily and weekly digests.</li>
            <li>Configure cron jobs for scheduled tasks.</li>
            <li>Rate limiting (2 requests/second with Resend).</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'global-discussions',
    title: 'Global Discussions',
    description: 'Platform-wide community forum and moderation.',
    icon: 'mdi:forum-outline',
    group: 'Engagement',
    searchText: 'global discussions categories academic help campus life career tech support announcements moderation pin lock delete upvote',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Platform-wide discussions">
          Community engagement beyond individual courses — users discuss academic topics, share resources, and connect across the platform.
        </Callout>

        <HelpCard icon="mdi:earth" title="Overview">
          <p className="mb-2">A platform-wide forum where all users can participate regardless of course enrolment.</p>
          <ul>
            <li><strong>Categories:</strong> General, Academic Help, Campus Life, Career &amp; Jobs, Tech Support, Announcements.</li>
            <li><strong>Features:</strong> Threaded replies, upvoting/downvoting, pinning, locking.</li>
            <li><strong>Access:</strong> All authenticated users.</li>
            <li><strong>Moderation:</strong> Admins can delete content and lock discussions.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:shield-check-outline" title="Moderation tools">
          <ol>
            <li>Delete discussions or replies that violate community guidelines.</li>
            <li>Lock discussions to prevent further replies while keeping content visible.</li>
            <li>Pin announcements to keep them at the top of the list.</li>
            <li>Monitor activity to identify potential issues early.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:database-outline" title="Database tables">
          <p className="mb-2">Global discussions use these tables:</p>
          <ul>
            <li><code>global_discussion_categories</code> — Categories.</li>
            <li><code>global_discussions</code> — Main threads.</li>
            <li><code>global_discussion_replies</code> — Threaded replies.</li>
            <li><code>global_discussion_votes</code> — Upvotes/downvotes.</li>
            <li><code>global_discussion_subscriptions</code> — Notification subscriptions.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'student-messaging',
    title: 'Student Messaging System',
    description: 'Private messaging, group chats, and course rooms.',
    icon: 'mdi:chat-outline',
    group: 'Engagement',
    searchText: 'messaging direct messages group chat course chat file sharing realtime supabase block privacy online now',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Private messaging">
          A messaging system for students and instructors. Supports direct messages, group chats, course rooms, and file sharing.
        </Callout>

        <HelpCard icon="mdi:message-text-outline" title="System overview">
          <p className="mb-2">Private communication between platform users.</p>
          <ul>
            <li><strong>Direct messages:</strong> One-on-one private conversations.</li>
            <li><strong>Group chats:</strong> Multi-user rooms for study groups and project teams.</li>
            <li><strong>Course chats:</strong> Automatic rooms for enrolled members.</li>
            <li><strong>File sharing:</strong> Attach files and images.</li>
            <li><strong>Real-time:</strong> Delivered via Supabase Realtime.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:lock-outline" title="Privacy &amp; safety">
          <ol>
            <li><strong>Blocking</strong> — Users can block others. Blocked users cannot send messages or see the blocker&apos;s messages.</li>
            <li><strong>Message privacy</strong> — Only conversation participants can read DMs. Admins do <strong>not</strong> have access.</li>
            <li><strong>Room-level RLS</strong> — Users can only access rooms they&apos;re members of.</li>
            <li><strong>Soft delete</strong> — Deleted messages are flagged but retained for audit.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:database-outline" title="Database tables">
          <p className="mb-2">
            Backed by four tenant-scoped tables (see migration <code>037-student-chat.sql</code>):
          </p>
          <ul>
            <li><code>student_chat_rooms</code> — Direct, group, course, study_group types; <code>last_message_at</code> auto-updated by trigger.</li>
            <li><code>student_chat_members</code> — Membership, roles, mute flag, per-user <code>unread_count</code>.</li>
            <li><code>student_chat_messages</code> — text/image/file/system with file attachments and threaded replies (<code>reply_to_id</code>); soft-deleted via <code>is_deleted</code>.</li>
            <li><code>student_chat_blocked_users</code> — Per-user block list filtering DM creation and inbound messages.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:map-marker-radius-outline" title="Course detail “Online Now” card">
          <p className="mb-2">Each course detail page shows recently active classmates with a one-click DM button.</p>
          <ul>
            <li>Derived from <code>student_chat_members.last_read_at</code> and the <code>last_login</code> column on users.</li>
            <li>Clicking <strong>Message</strong> opens or creates a DM room with that classmate.</li>
            <li>Blocked users are filtered out automatically.</li>
          </ul>
        </HelpCard>

        <Callout variant="warning" title="Privacy note">
          Administrators should respect user privacy. Admins cannot read private conversations between users — only intervene if users report serious violations.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'system-settings',
    title: 'System Settings',
    description: 'General, security, and storage configuration.',
    icon: 'mdi:cog',
    group: 'System',
    searchText: 'settings branding feature flags upload limits security session timeout rate limiting two factor storage media supabase',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:tune" title="General settings">
          <ul>
            <li>Site branding and customisation.</li>
            <li>System-wide notification preferences.</li>
            <li>Feature flags and toggles.</li>
            <li>File upload limits.</li>
            <li>Default course settings.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:shield-lock-outline" title="Security settings">
          <ul>
            <li>Password policies.</li>
            <li>Session timeouts.</li>
            <li>Rate-limiting rules.</li>
            <li>Security logs and events.</li>
            <li>Two-factor authentication (if enabled).</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:database-cog-outline" title="Storage &amp; media">
          <ul>
            <li>Manage Supabase Storage buckets.</li>
            <li>Configure certificate-storage permissions.</li>
            <li>Set media upload size limits.</li>
            <li>Manage file-retention policies.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'programmes',
    title: 'Programmes Management',
    description: 'Bundle courses into structured programmes with weighted scoring.',
    icon: 'material-symbols:school',
    group: 'Courses & content',
    searchText: 'programmes courses weight passing score certificate enrollment',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="What programmes are">
          Programmes are structured collections of courses students complete to earn a programme certificate with an aggregated score.
        </Callout>

        <HelpCard icon="mdi:book-plus-multiple-outline" title="Creating programmes">
          <ol>
            <li>Navigate to <strong>Admin → Programmes</strong>.</li>
            <li>Click <strong>Create Programme</strong>.</li>
            <li>Enter name, description, and passing score.</li>
            <li>Add courses and set their weights.</li>
            <li>Configure programme image and category.</li>
            <li>Publish when ready for enrolment.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:scale-balance" title="How programme scoring works">
          <ul>
            <li>Each course has a weight (percentage).</li>
            <li>Final score = weighted average of all course grades.</li>
            <li>Students must complete all required courses.</li>
            <li>Students must meet the passing score to complete the programme.</li>
            <li>Programme certificates show the final weighted score.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:account-multiple-outline" title="Managing programme enrolments">
          <ol>
            <li>View enrolled students from the programme details page.</li>
            <li>Track progress through programme courses.</li>
            <li>See completion status and final scores.</li>
            <li>Students are auto-enrolled in programme courses on signup.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:database-outline" title="Database structure">
          <p className="mb-2">Programmes use these tables:</p>
          <ul>
            <li><code>programmes</code> — Programme definitions.</li>
            <li><code>programme_courses</code> — Courses in programmes with weights.</li>
            <li><code>programme_enrollments</code> — Student enrolments and progress.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'learning-paths',
    title: 'Learning Paths',
    description: 'Curated course sequences with prerequisites.',
    icon: 'mdi:road-variant',
    group: 'Courses & content',
    searchText: 'learning paths sequence prerequisites locked courses tracking',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Learning Paths are curated sequences of courses designed to help learners master specific skills or topics.
        </p>

        <HelpCard icon="mdi:source-branch-plus" title="Creating learning paths">
          <ol>
            <li>Navigate to Learning Paths from the main navigation.</li>
            <li>Click <strong>Create Learning Path</strong>.</li>
            <li>Enter name, description, and category.</li>
            <li>Add courses in the recommended completion order.</li>
            <li>Set prerequisites between courses (optional).</li>
            <li>Configure path image and estimated duration.</li>
            <li>Publish.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:lock-pattern" title="Configuring prerequisites">
          <ul>
            <li>Set which courses must be completed before others.</li>
            <li>Create sequential or branching paths.</li>
            <li>Students see locked courses until prerequisites are met.</li>
            <li>Prerequisites ensure proper knowledge building.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:chart-line" title="Tracking path progress">
          <ul>
            <li>View overall path enrolment statistics.</li>
            <li>See completion rates per course.</li>
            <li>Identify common drop-off points.</li>
            <li>Track average completion time.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'categories',
    title: 'Course Categories',
    description: 'Hierarchical organisation for the catalogue.',
    icon: 'mdi:folder-multiple-outline',
    group: 'Courses & content',
    searchText: 'categories hierarchy parent child filter browse',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Organise courses into hierarchical categories so students find relevant content faster.
        </p>

        <HelpCard icon="mdi:folder-plus-outline" title="Creating categories">
          <ol>
            <li>Navigate to <strong>Admin → Categories</strong>.</li>
            <li>Click <strong>Add Category</strong>.</li>
            <li>Enter name and optional description.</li>
            <li>Set a parent category for nesting (optional).</li>
            <li>Configure display order.</li>
            <li>Save.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:tag-outline" title="Assigning categories to courses">
          <ul>
            <li>Edit a course to assign categories.</li>
            <li>Courses can belong to multiple categories.</li>
            <li>Categories appear in course filters and navigation.</li>
            <li>Students browse the catalogue by category.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:file-tree-outline" title="Category hierarchy">
          <ul>
            <li>Create parent and child categories.</li>
            <li>Example: Technology → Programming → Python.</li>
            <li>Child categories inherit visibility from parents.</li>
            <li>Courses in child categories also appear in parent.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'bulk-user-operations',
    title: 'Bulk User Operations',
    description: 'Manage many users at once from the advanced page.',
    icon: 'mdi:account-multiple-check-outline',
    group: 'People',
    searchText: 'bulk users select all welcome email custom email delete invite csv import enroll report',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The Advanced User Management page (<strong>Admin → Users → Manage</strong>) provides bulk operations for managing many users at once.
        </p>

        <HelpCard icon="mdi:checkbox-multiple-marked-outline" title="Selecting users">
          <ul>
            <li>Use the checkbox on each row to select individual users.</li>
            <li>Click <strong>Select All</strong> to select every user matching current filters.</li>
            <li>A blue actions bar appears when users are selected.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:lightning-bolt-outline" title="Available bulk actions">
          <ul>
            <li><strong>Send Welcome Email</strong> — Generates temporary passwords and sends login instructions.</li>
            <li><strong>Send Custom Email</strong> — Compose and send to selected users.</li>
            <li><strong>Delete Selected</strong> — Permanently removes accounts, profiles, and associated data.</li>
            <li><strong>Clear Selection</strong> — Deselect all users.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:tools" title="Other management tools">
          <ul>
            <li><strong>Invite User</strong> — Send email invitations to join.</li>
            <li><strong>Bulk Update</strong> — Upload a CSV to update many user records.</li>
            <li><strong>Basic CSV Import</strong> — Import users from CSV (email, name, role).</li>
            <li><strong>Download Report</strong> — Export the user list.</li>
            <li><strong>Add New User</strong> — Manually create a new account.</li>
            <li><strong>Enrol User in Course</strong> — Directly enrol a user in a specific course.</li>
          </ul>
        </HelpCard>

        <Callout variant="warning" title="Bulk delete is permanent">
          A confirmation dialog appears, and for 10+ users a second confirmation is required. There is no undo.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'course-management-tools',
    title: 'Course Management Tools',
    description: 'Cohorts, attendance, gradebook, and course features.',
    icon: 'mdi:school-outline',
    group: 'Courses & content',
    searchText: 'cohorts groups attendance gradebook participants schedule',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Manage courses with cohorts, groups, attendance tracking, and gradebook tools.
        </p>

        <HelpCard icon="mdi:account-group-outline" title="Cohorts &amp; groups">
          <ul>
            <li>Organise students into scheduled batches.</li>
            <li>Set up course groups for collaborative work.</li>
            <li>Set capacity, schedule, and enrolment windows.</li>
            <li>Assign instructors and facilitators.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:view-grid-plus-outline" title="Course features">
          <ul>
            <li><strong>Participants</strong> — View and manage enrolled students.</li>
            <li><strong>Attendance</strong> — Track attendance per session.</li>
            <li><strong>Gradebook</strong> — Course gradebook with customisable setup.</li>
            <li><strong>Gradebook Setup</strong> — Configure categories, weights, and grading scale.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'question-banks',
    title: 'Question Banks',
    description: 'Reusable question pools for quizzes.',
    icon: 'mdi:database-search-outline',
    group: 'Courses & content',
    searchText: 'question banks reusable pool quiz random tag subject',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Question Banks are reusable pools of questions that can be shared across multiple quizzes.
        </p>

        <HelpCard icon="mdi:format-list-bulleted-square" title="Managing question banks">
          <ul>
            <li>Navigate to <strong>Admin → Question Banks</strong>.</li>
            <li>Create named banks organised by subject or topic.</li>
            <li>Add questions of any type (multiple choice, true/false, short answer, etc.).</li>
            <li>Tag questions for easy searching and filtering.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:dice-multiple-outline" title="Using in quizzes">
          <ul>
            <li>Pull random questions from a bank when creating a quiz.</li>
            <li>Set the number to draw from each bank.</li>
            <li>Each student can receive a unique randomised set.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'crm',
    title: 'CRM & Enrollment Pipeline',
    description: 'Manage student relationships from inquiry to graduation.',
    icon: 'mdi:account-heart-outline',
    group: 'Admissions & CRM',
    searchText: 'crm pipeline kanban segments campaigns workflows tasks lifecycle risk engagement',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The built-in CRM helps manage student relationships, track enrolment pipelines, and automate communications from inquiry through graduation.
        </p>

        <HelpCard icon="mdi:view-dashboard-outline" title="CRM dashboard">
          <ul>
            <li>Navigate to <strong>CRM</strong> from the main navigation.</li>
            <li>View lifecycle stages, risk levels, and engagement scores at a glance.</li>
            <li>Access students, pipeline, tasks, and communications from the sidebar.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:view-column-outline" title="Enrolment pipeline">
          <ul>
            <li><strong>Pipeline View</strong> — Kanban-style board of students at each stage.</li>
            <li>Drag and drop students between stages.</li>
            <li>Track conversion rates from inquiry to enrolment.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:filter-variant" title="Student segments">
          <ul>
            <li>Create segments by criteria (status, engagement, risk).</li>
            <li>Target communications and campaigns by segment.</li>
            <li>Manage at <strong>CRM → Segments</strong>.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:bullhorn-outline" title="Communications &amp; campaigns">
          <ul>
            <li>Create targeted email campaigns for specific segments.</li>
            <li>Track open, click, and engagement rates.</li>
            <li>Schedule for optimal delivery times.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:robot-outline" title="Automation workflows">
          <ul>
            <li>Navigate to <strong>CRM → Workflows</strong>.</li>
            <li>Create automated actions triggered by student behaviour.</li>
            <li>Examples: follow-up email when an application is submitted, assign a task when a student is at risk.</li>
            <li>Toggle workflows on or off.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:checkbox-marked-circle-outline" title="CRM tasks">
          <ul>
            <li>Manage follow-up tasks for staff (calls, emails, meetings).</li>
            <li>Assign to team members.</li>
            <li>Set due dates and priorities.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'admissions',
    title: 'Admissions Management',
    description: 'Application forms, applicant tracking, and decisions.',
    icon: 'mdi:clipboard-check-outline',
    group: 'Admissions & CRM',
    searchText: 'admissions application forms applicants status pending review accept reject',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Create admissions campaigns with custom application forms, track applicants, and process applications.
        </p>

        <HelpCard icon="mdi:file-document-edit-outline" title="Admissions forms">
          <ul>
            <li>Navigate to <strong>CRM → Admissions → Forms</strong>.</li>
            <li>Create custom forms with various field types.</li>
            <li>Each form generates a public URL for applicants.</li>
            <li>Edit or deactivate at any time.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:clipboard-list-outline" title="Processing applications">
          <ul>
            <li>View all submissions in <strong>CRM → Applications</strong>.</li>
            <li>Review individual applications with full details.</li>
            <li>Update status (pending, under review, accepted, rejected).</li>
            <li>Applicants check status at <code>/admissions/status</code>.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'sis-integration',
    title: 'SIS Integration (SonisWeb)',
    description: 'Sync students, courses, enrolments, and grades.',
    icon: 'mdi:swap-horizontal-bold',
    group: 'Integrations',
    searchText: 'sis sonisweb ims enterprise xml import student sync enrollment grade passback cron schedule',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Integrate with SonisWeb Student Information System to sync students, courses, enrolments, and grades.
        </p>

        <HelpCard icon="mdi:upload-outline" title="IMS Enterprise XML import">
          <ul>
            <li>Navigate to <strong>Admin → SIS Integration</strong>.</li>
            <li>Upload an IMS Enterprise XML file from SonisWeb.</li>
            <li>The system parses persons, groups (courses), and memberships (enrolments).</li>
            <li>Large files are processed in batches automatically.</li>
            <li>Progress bar shows real-time status.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:sync" title="Sync features">
          <ul>
            <li><strong>Student Sync</strong> — Import and update student records.</li>
            <li><strong>Enrolment Sync</strong> — Sync enrolments and instructor assignments.</li>
            <li><strong>Grade Passback</strong> — Send grades back to SonisWeb.</li>
            <li><strong>Scheduled Sync</strong> — Daily cron at 02:00.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:cog-outline" title="Configuration">
          <ul>
            <li>Configure SonisWeb credentials in the SIS dashboard.</li>
            <li>Set up grade-sync configuration to map columns.</li>
            <li>View sync logs to monitor success and failures.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'at-risk-students',
    title: 'At-Risk Student Monitoring',
    description: 'Identify and support struggling students.',
    icon: 'mdi:alert-octagon-outline',
    group: 'Admissions & CRM',
    searchText: 'at risk students grades missing assignments engagement login risk score intervention',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Identify and support students who may be struggling academically or disengaging from courses.
        </p>

        <HelpCard icon="mdi:gauge" title="How it works">
          <ul>
            <li>Navigate to <strong>Admin → At-Risk Students</strong>.</li>
            <li>Students are flagged based on risk scores from multiple factors.</li>
            <li>Factors: low grades, missing assignments, low engagement, infrequent logins.</li>
            <li>View risk levels and drill into individual student details.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:hand-extended-outline" title="Taking action">
          <ul>
            <li>Contact at-risk students via messaging.</li>
            <li>Create CRM tasks for follow-up interventions.</li>
            <li>Use adaptive learning rules to provide additional support content.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'adaptive-rules',
    title: 'Adaptive Learning Rules',
    description: 'Personalise the learning experience based on performance.',
    icon: 'mdi:brain',
    group: 'Admissions & CRM',
    searchText: 'adaptive rules conditions actions recommendation difficulty personalize',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Configure rules that personalise the learning experience based on student performance and behaviour.
        </p>

        <HelpCard icon="mdi:cogs" title="Managing rules">
          <ul>
            <li>Navigate to <strong>Admin → Adaptive Rules</strong>.</li>
            <li>Create rules with conditions (e.g., quiz score below 60%).</li>
            <li>Define actions (e.g., recommend a supplementary lesson, lower difficulty).</li>
            <li>Rules evaluate automatically when conditions are met.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:account-star-outline" title="Student experience">
          <ul>
            <li>Students see personalised recommendations at <strong>My Courses → Adaptive Learning</strong>.</li>
            <li>Recommendations update based on performance.</li>
            <li>Difficulty preference can be set on the profile.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'lti-integrations',
    title: 'LTI Integrations',
    description: 'Connect external tools via LTI 1.3.',
    icon: 'mdi:puzzle-outline',
    group: 'Integrations',
    searchText: 'lti 1.3 outbound inbound tool platform turnitin labster h5p sso grade passback jwks',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Connect external learning tools and platforms using the LTI 1.3 standard for seamless single sign-on and grade exchange.
        </p>

        <HelpCard icon="mdi:export" title="LTI tools (outbound)">
          <ul>
            <li>Navigate to <strong>Admin → LTI Tools</strong>.</li>
            <li>Register external tools (e.g., Turnitin, Labster, H5P).</li>
            <li>Configure client ID, deployment ID, and key set URL.</li>
            <li>Launch external tools from within courses.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:import" title="LTI platforms (inbound)">
          <ul>
            <li>Navigate to <strong>Admin → LTI Platforms</strong>.</li>
            <li>Register this LMS as a tool provider for external LMS platforms.</li>
            <li>Share JWKS URL and launch URL with partners.</li>
            <li>Supports grade passback via LTI Assignment and Grade Services.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'proctoring',
    title: 'Proctoring Services',
    description: 'Built-in safe browser and external proctoring.',
    icon: 'mdi:eye-check-outline',
    group: 'Integrations',
    searchText: 'proctoring safe browser fullscreen violations auto submit external third party',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Configure and manage quiz proctoring to ensure exam integrity.
        </p>

        <HelpCard icon="mdi:fullscreen" title="Built-in safe browser mode">
          <ul>
            <li>Enable Safe Browser Mode on any quiz.</li>
            <li>Forces fullscreen during the attempt.</li>
            <li>Blocks right-click context menus and keyboard shortcuts.</li>
            <li>Tracks violations (tab switches, exiting fullscreen).</li>
            <li>Auto-submits the quiz after configurable max violations.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:account-eye-outline" title="External proctoring">
          <ul>
            <li>Navigate to <strong>Admin → Proctoring Services</strong>.</li>
            <li>Configure third-party proctoring integrations.</li>
            <li>Events are logged and can be reviewed per student.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'custom-reports',
    title: 'Custom Reports',
    description: 'Build and run custom data reports.',
    icon: 'mdi:chart-box-outline',
    group: 'Outcomes & insights',
    searchText: 'custom reports builder data sources filter group sort csv export',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Build and run custom data reports tailored to your institution&apos;s needs.
        </p>

        <HelpCard icon="mdi:hammer-wrench" title="Report builder">
          <ul>
            <li>Navigate to <strong>Admin → Reports → Builder</strong>.</li>
            <li>Select data sources (users, courses, enrolments, grades, etc.).</li>
            <li>Add filters, groupings, and sort order.</li>
            <li>Save reports for future use.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:play-circle-outline" title="Running reports">
          <ul>
            <li>View saved reports in <strong>Admin → Reports</strong>.</li>
            <li>Execute on-demand to get current data.</li>
            <li>Export results as CSV for further analysis.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'branding',
    title: 'Branding & Theming',
    description: 'Customise look and feel with your brand.',
    icon: 'mdi:palette-outline',
    group: 'Multi-tenant',
    searchText: 'branding theme logo primary color secondary tagline tenant',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Customise the look and feel of your campus with your institution&apos;s branding.
        </p>

        <HelpCard icon="mdi:palette-swatch-outline" title="Branding settings">
          <ul>
            <li>Navigate to <strong>Admin → Settings → Branding</strong>.</li>
            <li>Upload your institution&apos;s logo.</li>
            <li>Set primary and secondary brand colours.</li>
            <li>Customise the site name and tagline.</li>
            <li>Changes apply across the entire platform for your tenant.</li>
          </ul>
        </HelpCard>

        <Callout variant="info" title="Multi-tenant">
          Each tenant (institution) can have its own unique branding, scoped to the tenant subdomain.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'multi-tenancy',
    title: 'Multi-Tenancy & Tenants',
    description: 'Multiple institutions on a shared platform.',
    icon: 'mdi:domain',
    group: 'Multi-tenant',
    searchText: 'multi tenant tenants subdomain custom domain isolation roles super admin tenant admin',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The platform supports multiple institutions (tenants), each with their own users, courses, data, and branding.
        </p>

        <HelpCard icon="mdi:earth" title="How tenants work">
          <ul>
            <li>Each tenant has a unique subdomain (e.g., <code>salcc.oecscampus.org</code>).</li>
            <li>Data is fully isolated between tenants.</li>
            <li>Each tenant has its own admins, instructors, and students.</li>
            <li>Custom branding per tenant.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:office-building-cog-outline" title="Managing tenants (Super Admin)">
          <ul>
            <li>Navigate to <strong>Admin → Tenants</strong> (Super Admin only).</li>
            <li>Create new tenants with name, slug, and custom domain.</li>
            <li>Manage settings, members, and suspension status.</li>
            <li>Use <strong>Admin → System</strong> for a global overview of all tenants.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:account-key-outline" title="Roles">
          <ul>
            <li><strong>Super Admin</strong> — Manages all tenants and global settings.</li>
            <li><strong>Tenant Admin</strong> — Manages own tenant&apos;s settings and users.</li>
            <li><strong>Admin</strong> — Full administrative access within a tenant.</li>
            <li>Other roles (instructor, student, etc.) are scoped to their tenant.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'course-sharing',
    title: 'Cross-Tenant Course Sharing',
    description: 'Publish courses from one tenant to others.',
    icon: 'mdi:share-variant-outline',
    group: 'Multi-tenant',
    searchText: 'course sharing share fork target source delegation flags grading supplements live sessions ai tutor',
    content: (
      <div className="space-y-4">
        <Callout variant="info" title="What this is">
          A source tenant can publish a course to one or more target tenants. Each target gets its own forked copy that students enrol in normally, while the source institution retains control over the canonical content.
        </Callout>

        <HelpCard icon="mdi:share-outline" title="Sharing a course">
          <ol>
            <li>Open the course at the source tenant and go to <strong>Course → Share</strong>.</li>
            <li>Pick one or more target tenants via the multi-tenant checkbox list.</li>
            <li>Set the per-share <strong>delegation flags</strong> (described below).</li>
            <li>Submit. The target tenant&apos;s admin receives the share for review.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:check-decagram-outline" title="Acceptance workflow (target tenant)">
          <ul>
            <li>Incoming shares appear under <strong>Admin → Shared Courses</strong> as &quot;pending&quot;.</li>
            <li>The target admin reviews and clicks <strong>Accept</strong> to add it to their catalogue, or <strong>Reject</strong> to discard.</li>
            <li>Only after acceptance does the forked course show up to instructors and students at the target tenant.</li>
            <li>Forked courses display a <strong>&quot;Forked from {'{Institution}'}&quot;</strong> chip on the course detail page so users see the canonical source.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:tune-vertical" title="Delegation flags">
          <p className="mb-2">Each share can independently delegate the following to the target tenant:</p>
          <ul>
            <li><strong>Target-tenant grading</strong> — Target instructors grade their own students&apos; submissions on the source assessments.</li>
            <li><strong>Target-tenant supplements</strong> — Target instructors add their own announcements and resource links alongside the shared content.</li>
            <li><strong>Target-tenant live sessions</strong> — Target instructors run their own video conferences for the shared course.</li>
            <li>Flags can be changed after the share is created; existing data is preserved.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:robot-happy-outline" title="AI tutor across tenants">
          <p>
            The AI tutor is available on shared-course lesson pages and reads content across the source/target boundary, so target-tenant students can ask questions about the canonical material without re-uploading it.
          </p>
        </HelpCard>

        <HelpCard icon="mdi:package-variant-closed" title="What forks with the course">
          <p className="mb-2">When a target tenant accepts a share, the fork includes:</p>
          <ul>
            <li>Course metadata, lessons, and content blocks.</li>
            <li>Quizzes and assignments (assessments stay anchored to the source unless graded locally).</li>
            <li>SCORM packages, video captions, and lesson-level resource links.</li>
            <li>Announcements and resource links flagged as supplements stay tenant-local.</li>
          </ul>
        </HelpCard>

        <Callout variant="warning" title="Heads-up on deletion">
          Deleting the source course removes its forks at every target tenant — review <strong>Course Management → Deleting Courses</strong> before destructive actions on a shared course.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'credit-transfer',
    title: 'Regional Credit Transfer',
    description: 'Cross-tenant credit-transfer workflow for registrars.',
    icon: 'mdi:swap-horizontal-circle-outline',
    group: 'Multi-tenant',
    searchText: 'credit transfer registrar regional transcript opt in date filter notification email template',
    content: (
      <div className="space-y-4">
        <Callout variant="info" title="What this is">
          A regional workflow that lets registrars at one tenant request, review, and accept course credits earned by students at another tenant on the platform.
        </Callout>

        <HelpCard icon="mdi:transit-connection-variant" title="The flow">
          <ol>
            <li>A student requests credit transfer from their dashboard, naming the source tenant + course and (optionally) attaching submissions.</li>
            <li>The receiving tenant&apos;s registrar opens <strong>Admin → Credit Transfer</strong> to see incoming requests.</li>
            <li>Registrars view the transcript (including cross-tenant grades from shared courses), past submissions, and any attached evidence.</li>
            <li>Reviewers leave threaded comments — each new comment fires an email to the other party.</li>
            <li>Approve, reject, or request more information. The decision and audit trail are recorded against the request.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:gavel" title="Per-tenant governance">
          <ul>
            <li>Each tenant can opt in or out of regional participation via a tenant-level flag.</li>
            <li>Non-participating tenants are hidden from the source-tenant picker on student requests.</li>
            <li>The registrar dashboard shows a comment-count badge so threads needing attention surface fast.</li>
            <li>Supports a <strong>regional date filter</strong> to scope by intake window.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:email-newsletter" title="Notifications &amp; templates">
          <ul>
            <li>Email templates for credit-transfer events live alongside the other branding email templates and can be customised per tenant.</li>
            <li>Each request has a linkable detail route, so emailed comments deep-link straight to the case.</li>
          </ul>
        </HelpCard>

        <Callout variant="warning" title="Privacy">
          Transcripts are pulled live across tenants when a request is opened; we don&apos;t store student records at the receiving tenant unless the credit is ultimately accepted.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and how to resolve them.',
    icon: 'mdi:alert-circle-outline',
    group: 'System',
    searchText: 'troubleshoot email not sending resend domain certificate generation supabase storage analytics not updating materialized views',
    content: (
      <div className="space-y-4">
        <Callout variant="danger" title="Email not sending" icon="mdi:close-circle-outline">
          <ul className="ml-5 list-disc space-y-1">
            <li>Verify <code>RESEND_API_KEY</code> is set in environment variables.</li>
            <li>Check domain verification status in the Resend dashboard.</li>
            <li>Test from <strong>Admin → Test Email</strong>.</li>
            <li>Check rate limits (2 requests/second).</li>
            <li>Review email logs for delivery errors.</li>
          </ul>
        </Callout>

        <Callout variant="warning" title="Certificate generation issues">
          <ul className="ml-5 list-disc space-y-1">
            <li>Verify Supabase Storage bucket permissions.</li>
            <li>Check certificate template syntax.</li>
            <li>Ensure course completion criteria are met.</li>
            <li>Review certificate generation logs.</li>
            <li>Manually trigger certificate generation if needed.</li>
          </ul>
        </Callout>

        <Callout variant="info" title="Analytics not updating">
          <ul className="ml-5 list-disc space-y-1">
            <li>Refresh materialized views if needed.</li>
            <li>Check database connection status.</li>
            <li>Verify student-activity logging is enabled.</li>
            <li>Clear analytics cache if data seems stale.</li>
          </ul>
        </Callout>
      </div>
    ),
  },
];

export const sectionGroupOrder: string[] = [
  'Get started',
  'People',
  'Courses & content',
  'Engagement',
  'Outcomes & insights',
  'Communications',
  'Admissions & CRM',
  'Integrations',
  'Multi-tenant',
  'System',
];
