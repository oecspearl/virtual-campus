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

const ContentTile = ({
  icon,
  title,
  body,
  accent = 'slate',
  badge,
}: {
  icon: string;
  title: string;
  body: string;
  accent?: 'slate' | 'emerald' | 'violet' | 'blue' | 'indigo';
  badge?: string;
}) => {
  const tone = {
    slate: 'border-slate-200 bg-white text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  }[accent];
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <p className="flex items-center gap-2 font-medium text-sm">
        <Icon icon={icon} className="h-4 w-4" aria-hidden />
        <span>{title}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {badge}
          </span>
        )}
      </p>
      <p className="text-xs mt-1 opacity-80">{body}</p>
    </div>
  );
};

const XPRow = ({ icon, action, xp }: { icon: string; action: string; xp: string }) => (
  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
    <span className="flex items-center gap-2 text-sm text-slate-700">
      <Icon icon={icon} className="h-4 w-4 text-slate-500" aria-hidden />
      {action}
    </span>
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
      {xp}
    </span>
  </div>
);

export const studentHelpSections: HelpSection[] = [
  // ---------------------------------------------------------------------------
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Set up your profile and start learning.',
    icon: 'mdi:book-open-outline',
    group: 'Get started',
    searchText: 'getting started profile browse courses enroll dashboard',
    content: (
      <div className="space-y-5">
        <Callout variant="info" title="Welcome, Student">
          This guide will help you navigate the platform and make the most of your learning experience.
        </Callout>

        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-3">Quick start</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickStart
              icon="mdi:account-circle-outline"
              title="Complete your profile"
              body="Add your bio, avatar, and learning preferences."
            />
            <QuickStart
              icon="mdi:magnify"
              title="Browse available courses"
              body="Visit Courses to explore what's available."
            />
            <QuickStart
              icon="mdi:school-outline"
              title="Enrol in courses"
              body="Click Enrol on any course that interests you."
            />
            <QuickStart
              icon="mdi:view-dashboard-outline"
              title="Access your dashboard"
              body="See enrolled courses, assignments, and progress."
            />
          </div>
        </div>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'enrolling',
    title: 'Enrolling in Courses',
    description: 'How to find and enrol in courses.',
    icon: 'mdi:school-outline',
    group: 'Courses',
    searchText: 'enroll courses browse search filter',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:magnify" title="Finding courses">
          <ol>
            <li>Go to <strong>Courses</strong> from the main navigation.</li>
            <li>Browse featured courses on the homepage.</li>
            <li>Use the search bar to find specific courses.</li>
            <li>Filter by difficulty level or category.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:pencil-outline" title="Enrolment process">
          <ol>
            <li>Click on a course to view details.</li>
            <li>Review description, objectives, and requirements.</li>
            <li>Click <strong>Enrol</strong>.</li>
            <li>Access enrolled courses from <strong>My Courses</strong>.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'programmes',
    title: 'Learning Programmes',
    description: 'Multi-course programmes with weighted final scores.',
    icon: 'material-symbols:school',
    group: 'Courses',
    searchText: 'programmes weighted score passing certificate enroll multi course',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Programmes">
          Programmes are structured paths grouping multiple courses. Complete all courses in a programme to earn a programme certificate with an aggregated final score.
        </Callout>

        <p className="text-sm text-slate-700">
          Each programme has a passing score requirement. Your final programme score is a weighted average of all course grades.
        </p>

        <HelpCard icon="mdi:magnify" title="Finding programmes">
          <ol>
            <li>Go to <strong>Programmes</strong> from the main navigation or dashboard.</li>
            <li>Browse by category or difficulty.</li>
            <li>Use the search bar to find specific programmes.</li>
            <li>View details — courses, duration, passing requirements.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:pencil-outline" title="Enrolling in a programme">
          <ol>
            <li>Click on a programme to view details.</li>
            <li>Review the description and course list.</li>
            <li>Check the passing score (e.g., 70%).</li>
            <li>Click <strong>Enrol Now</strong>.</li>
            <li>You&apos;ll be auto-enrolled in all programme courses.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:chart-line" title="Tracking your progress">
          <ol>
            <li>View enrolled programmes on your dashboard under <strong>My Programmes</strong>.</li>
            <li>See progress bars showing completed courses.</li>
            <li>Track your weighted score against the passing requirement.</li>
            <li>Click into a programme for detailed per-course progress.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:school-outline" title="Programme completion">
          <ol>
            <li>Complete all required courses in the programme.</li>
            <li>Achieve the minimum passing score (weighted average).</li>
            <li>Your final score is calculated automatically.</li>
            <li>Status changes to <strong>Completed</strong> when requirements are met.</li>
          </ol>
        </HelpCard>

        <Callout variant="info" title="How scoring works" icon="mdi:scale-balance">
          <p>Your programme score is a weighted average of your course grades:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Each course has a weight (shown as a percentage).</li>
            <li>Your grade in each course is multiplied by its weight.</li>
            <li>Weighted grades are summed for your final score.</li>
            <li>You must complete all required courses and meet the passing score.</li>
          </ul>
        </Callout>

        <Callout variant="tip" title="Tip">
          Focus on courses with higher weights — they have a bigger impact on your final programme score.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'course-content',
    title: 'Course Content Types',
    description: 'What you&apos;ll encounter inside lessons.',
    icon: 'mdi:book-multiple-outline',
    group: 'Courses',
    searchText: 'content types text video interactive audio podcast code sandbox image pdf file embed slideshow quiz assignment 3d model',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Courses include various content types to support your learning. Here&apos;s what you&apos;ll encounter:
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <ContentTile icon="mdi:format-text" title="Text Content" body="Rich text, instructions, and reading materials." />
          <ContentTile icon="mdi:video-outline" title="Video" body="YouTube, Vimeo, and uploaded videos." />
          <ContentTile icon="mdi:movie-open-play-outline" title="Interactive Video" body="Pauses at checkpoints to ask questions." accent="emerald" badge="New" />
          <ContentTile icon="mdi:podcast" title="Audio / Podcast" body="Player with speed control and transcripts." accent="violet" badge="New" />
          <ContentTile icon="mdi:code-tags" title="Code Sandbox" body="Write, edit, and run code in 8 languages." accent="emerald" badge="New" />
          <ContentTile icon="mdi:image-outline" title="Images" body="Visual content to support learning." />
          <ContentTile icon="mdi:file-pdf-box" title="PDF Documents" body="View and download PDF files." />
          <ContentTile icon="mdi:paperclip" title="Files" body="Downloadable files and resources." />
          <ContentTile icon="mdi:link-variant" title="Embedded Content" body="External tools and interactive content." />
          <ContentTile icon="mdi:presentation-play" title="Slideshows" body="Presentation slides and visuals." />
          <ContentTile icon="mdi:help-circle-outline" title="Quizzes" body="Interactive assessments." />
          <ContentTile icon="mdi:clipboard-text-outline" title="Assignments" body="Tasks and projects to submit." />
          <ContentTile icon="mdi:cube-outline" title="3D Model" body="Rotate, zoom, and view in AR on mobile." accent="indigo" badge="New" />
        </div>

        <Callout variant="tip" title="Tip">
          Interactive content like Code Sandbox, Interactive Video, and the 3D Model viewer are hands-on. Use them to deepen your understanding.
        </Callout>

        <Callout variant="info" title="Learning Outcomes sidebar" icon="mdi:format-list-bulleted-square">
          On lessons that have learning outcomes attached, the outcomes panel opens by default on desktop so you can see what you&apos;re aiming for. Collapse it for a wider reading view.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'assignments',
    title: 'Assignments & Quizzes',
    description: 'Submit work and take quizzes.',
    icon: 'mdi:file-document-outline',
    group: 'Courses',
    searchText: 'assignments submit quiz proctoring safe browser fullscreen grades feedback',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:upload-outline" title="Submitting assignments">
          <ol>
            <li>Navigate to the assignment in your course.</li>
            <li>Read instructions and requirements carefully.</li>
            <li>Upload your files (PDF, DOC, DOCX up to 10 MB).</li>
            <li>Add comments or notes if needed.</li>
            <li>Click <strong>Submit Assignment</strong> before the due date.</li>
            <li>Track submission status and view grades.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:help-circle-outline" title="Taking quizzes">
          <ol>
            <li>Click on the quiz from your course page.</li>
            <li>Read all questions thoroughly.</li>
            <li>Select your answers (multiple choice, true/false, etc.).</li>
            <li>Review your answers before submitting.</li>
            <li>Submit and view results immediately.</li>
            <li>Check instructor feedback if available.</li>
          </ol>
        </HelpCard>

        <Callout variant="danger" title="Safe Browser Mode (proctored quizzes)">
          <p>Some quizzes use Safe Browser Mode to ensure academic integrity. Here&apos;s what to expect:</p>
          <ol className="ml-5 list-decimal space-y-1">
            <li><strong>Consent screen</strong> — Click <strong>I understand, start quiz</strong> to begin.</li>
            <li><strong>Fullscreen mode</strong> — The quiz enters fullscreen automatically. Stay until you submit.</li>
            <li>
              <strong>Monitoring</strong> — The system watches for:
              <ul className="ml-5 list-disc">
                <li>Switching tabs or opening new windows.</li>
                <li>Exiting fullscreen mode.</li>
                <li>Right-clicks and keyboard shortcuts.</li>
                <li>Copy/paste attempts.</li>
              </ul>
            </li>
            <li><strong>Violation warnings</strong> — Most quizzes allow 3 violations before auto-submit.</li>
            <li><strong>Auto-submit</strong> — Exceeding the limit submits the quiz with current answers.</li>
          </ol>
          <Callout variant="info" title="Tips for success" icon="mdi:lightbulb-on-outline" className="mt-3">
            <ul className="ml-5 list-disc space-y-1">
              <li>Close all other tabs and apps before starting.</li>
              <li>Ensure a stable internet connection.</li>
              <li>Use a desktop or laptop, not a mobile device.</li>
              <li>Don&apos;t use the browser&apos;s back button — use the quiz navigation.</li>
              <li>If you need to step away, submit your quiz first.</li>
            </ul>
          </Callout>
        </Callout>

        <HelpCard icon="mdi:chart-bar" title="Viewing grades">
          <ol>
            <li>Check your dashboard for recent grades in the <strong>Recent Grades</strong> widget.</li>
            <li>View detailed grades in the course Gradebook.</li>
            <li>Receive email notifications when grades are posted.</li>
            <li>Track cumulative grade and completion percentage.</li>
          </ol>
        </HelpCard>

        <Callout variant="warning" title="Important">
          Always check due dates and submit on time. Late submissions may not be accepted.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'certificates',
    title: 'Certificates & Achievements',
    description: 'Earning, downloading, and sharing certificates.',
    icon: 'mdi:certificate-outline',
    group: 'Outcomes',
    searchText: 'certificates earn download pdf linkedin verification share',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:school-outline" title="Earning a certificate">
          <ol>
            <li>Complete all required lessons in a course.</li>
            <li>Submit all assignments and pass all quizzes.</li>
            <li>Achieve the minimum passing grade if required.</li>
            <li>Certificates are automatically issued upon completion — you&apos;ll get an email.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:download-outline" title="Accessing certificates">
          <ol>
            <li>Go to <strong>Profile → Certificates</strong>.</li>
            <li>Download as a professional PDF.</li>
            <li>Share on LinkedIn directly.</li>
            <li>Verify authenticity using the unique verification code.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:share-variant-outline" title="Sharing certificates">
          <ol>
            <li>Click <strong>Share on LinkedIn</strong> to post your achievement.</li>
            <li>Copy the verification link to share with employers.</li>
            <li>Anyone can verify a certificate using its verification code — adding credibility.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'discussions',
    title: 'Discussions & Communication',
    description: 'Course discussions, global discussions, and reaching instructors.',
    icon: 'mdi:message-outline',
    group: 'Engagement',
    searchText: 'discussions global course mentions instructor email announcements reply upvote',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Global Discussions (NEW)" icon="mdi:earth">
          <p>Connect with the entire learning community through platform-wide discussions — anyone can participate.</p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Access from <strong>Discussions</strong> in the main navigation.</li>
            <li>Browse by category — General, Academic Help, Campus Life, Career &amp; Jobs, Tech Support, Announcements.</li>
            <li>Click <strong>New Discussion</strong> to start a conversation.</li>
            <li>Upvote and downvote posts to surface the best content.</li>
            <li>Reply with threaded comments.</li>
            <li>Use the search bar to find specific topics.</li>
          </ol>
        </Callout>

        <HelpCard icon="mdi:message-text-outline" title="Course discussions">
          <ol>
            <li>Access the <strong>Discussions</strong> tab on your course page.</li>
            <li>Read posts from instructors and classmates.</li>
            <li>Post questions and share insights — you may earn XP.</li>
            <li>Reply to other students&apos; posts.</li>
            <li>Use <strong>@mentions</strong> to notify specific users — they&apos;ll receive an email.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:email-outline" title="Contacting instructors">
          <ol>
            <li>Use the email icon next to instructor names.</li>
            <li>Subject and body are pre-filled for course inquiries.</li>
            <li>Opens your default email client.</li>
            <li>Use a professional tone and include relevant details.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:bullhorn-outline" title="Course announcements">
          <ol>
            <li>Check the <strong>Announcements</strong> section in each course.</li>
            <li>Important updates from instructors appear here.</li>
            <li>Receive email notifications for new announcements.</li>
            <li>Pinned announcements stay at the top.</li>
          </ol>
        </HelpCard>

        <Callout variant="tip" title="Community guidelines">
          Be respectful, constructive, and helpful in all discussions. This creates a positive learning environment for everyone.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'messaging',
    title: 'Private Messaging',
    description: 'Direct messages, group chats, and course rooms.',
    icon: 'mdi:chat-outline',
    group: 'Engagement',
    searchText: 'messaging direct message group chat course rooms online now block privacy attachments',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="Private messaging (NEW)">
          Send private messages to students and instructors. Create direct conversations or group chats for study and project work.
        </Callout>

        <HelpCard icon="mdi:message-outline" title="Direct messages">
          <p className="mb-2">Send private one-on-one messages to other students, instructors, or staff.</p>
          <ol>
            <li>Open Messages from the chat icon in the navbar — rooms appear sorted by recent activity.</li>
            <li>Click <strong>New Message</strong>, search by name or email, and pick someone to start a DM.</li>
            <li>Send text, files, or images. Use the paperclip icon for attachments.</li>
            <li>Reply to a specific message to thread your response.</li>
            <li>Each room shows your personal unread count, which resets when you open it.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:account-group-outline" title="Group chats">
          <p className="mb-2">Create groups for study groups, project teams, or any group you want to message together.</p>
          <ol>
            <li>Click <strong>New Message</strong>, switch to <strong>Group</strong> mode, and give it a name.</li>
            <li>Add multiple users at once — classmates and instructors.</li>
            <li>The creator becomes the <strong>owner</strong> and can promote others to <strong>admin</strong>.</li>
            <li>Mute a noisy room or leave from the room settings.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:school-outline" title="Course rooms (auto-created)">
          <p className="mb-2">Every course you&apos;re enrolled in automatically gets its own course chat room. Membership tracks the enrolment list.</p>
          <ul>
            <li>Open a course chat from the course detail page or messages list.</li>
            <li>Use it for class-wide questions, study coordination, or instructor questions in front of the cohort.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:map-marker-radius-outline" title="“Online Now” on the course page">
          <p className="mb-2">Each course detail page has a collapsible <strong>Online Now</strong> card showing recently active classmates.</p>
          <ul>
            <li>Click <strong>Message</strong> next to anyone&apos;s name to jump straight into a DM — created on the spot if needed.</li>
            <li>Anyone you&apos;ve blocked is hidden from this list.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:cancel" title="Blocking &amp; privacy">
          <ol>
            <li><strong>Block a user</strong> — opens their profile or DM and blocks them. After: you can&apos;t open new DMs, and their messages in existing rooms are hidden from you.</li>
            <li>Unblock from your account settings to restore the conversation.</li>
            <li><strong>Privacy</strong> — DMs and group rooms are only visible to participants. Admins cannot read private rooms; tooling stops at room metadata for moderation.</li>
            <li><strong>Reporting</strong> — for harassment or inappropriate content, report it to your administrator with a screenshot of the message ID.</li>
          </ol>
        </HelpCard>

        <Callout variant="tip" title="Pro tip">
          Use group chats for study groups. Sharing notes, discussing concepts, and quizzing each other can significantly improve outcomes.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'gamification',
    title: 'XP, Levels & Streaks',
    description: 'Earn XP for activity and keep your streak alive.',
    icon: 'mdi:star-circle-outline',
    group: 'Engagement',
    searchText: 'xp levels streaks gamification points login lesson quiz assignment discussion',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Earn XP for learning activities, level up as you progress, and maintain daily streaks by staying active.
        </p>

        <HelpCard icon="mdi:trending-up" title="Earning XP">
          <p className="mb-3">Experience Points (XP) reward platform engagement. The more active you are, the more XP you earn.</p>
          <div className="space-y-2">
            <XPRow icon="mdi:login" action="Daily login" xp="+5 XP" />
            <XPRow icon="mdi:check-bold" action="Complete a lesson" xp="+25 XP" />
            <XPRow icon="mdi:help-circle-outline" action="Attempt a quiz" xp="+10 XP" />
            <XPRow icon="mdi:trophy-outline" action="Pass a quiz" xp="+40 XP" />
            <XPRow icon="mdi:upload-outline" action="Submit an assignment" xp="+30 XP" />
            <XPRow icon="mdi:forum-outline" action="Post in discussions" xp="+5 XP" />
          </div>
        </HelpCard>

        <div className="grid gap-3 sm:grid-cols-2">
          <Callout variant="info" title="Levels" icon="mdi:gamepad-variant-outline">
            Level up every 1000 XP. Your dashboard shows a progress bar to the next level.
          </Callout>
          <Callout variant="warning" title="Streaks" icon="mdi:fire">
            Your streak increments on consecutive active days. A long gap resets it.
          </Callout>
        </div>

        <Callout variant="tip" title="Where to see it">
          The Gamification widget on your dashboard shows level, XP, and streak with progress to the next level.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage in-app and email notifications.',
    icon: 'mdi:bell-outline',
    group: 'Engagement',
    searchText: 'notifications in app email digest bell alerts grades announcements replies preferences',
    content: (
      <div className="space-y-4">
        <HelpCard icon="mdi:bell-ring-outline" title="In-app notifications">
          <p className="mb-2">A bell icon at the top shows unread notifications without needing to check email constantly.</p>
          <ol>
            <li>Click the bell to see notifications grouped by date.</li>
            <li>Get notified when grades are posted.</li>
            <li>Receive alerts for course announcements.</li>
            <li>See when someone replies to your discussions or @mentions you.</li>
            <li>Mark notifications as read individually or all at once.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:email-outline" title="Email notifications">
          <p className="mb-2">Stay informed even when you&apos;re not on the platform.</p>
          <ol>
            <li>Manage email preferences in <strong>Profile → Notifications</strong>.</li>
            <li>Receive assignment-due reminders before deadlines.</li>
            <li>Get course-announcement emails so you don&apos;t miss critical updates.</li>
            <li>Receive emails when grades are posted, including feedback.</li>
            <li>Opt-in for daily or weekly digests to reduce email volume.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'ai-tutor',
    title: 'AI Tutor',
    description: 'Get instant explanations and help with course material.',
    icon: 'mdi:robot-outline',
    group: 'Tools',
    searchText: 'ai tutor chat lesson explain example clarify quiz summary',
    content: (
      <div className="space-y-4">
        <Callout variant="feature" title="AI-powered learning" icon="mdi:sparkles">
          Get instant help with course material using the AI Tutor. Available 24/7 to answer questions and explain concepts.
        </Callout>

        <p className="text-sm text-slate-700">
          The AI Tutor is your personal learning assistant — it can help you understand course material, answer questions, and provide explanations.
        </p>

        <HelpCard icon="mdi:chat-question-outline" title="Accessing the AI Tutor">
          <ol>
            <li>Look for the AI Tutor widget in your lesson viewer — a floating chat button.</li>
            <li>Click the chat icon to open the AI conversation.</li>
            <li>The AI has context about your current lesson.</li>
            <li>Ask questions in natural language.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:lightbulb-on-outline" title="What you can ask">
          <ul>
            <li><strong>Concept explanations</strong> — &quot;Can you explain this in simpler terms?&quot;</li>
            <li><strong>Examples</strong> — &quot;Give me an example of how this works.&quot;</li>
            <li><strong>Clarifications</strong> — &quot;I don&apos;t understand this part. Can you clarify?&quot;</li>
            <li><strong>Practice questions</strong> — &quot;Can you quiz me on this topic?&quot;</li>
            <li><strong>Summaries</strong> — &quot;Summarise the key points from this lesson.&quot;</li>
            <li><strong>Related topics</strong> — &quot;How does this relate to what we learned before?&quot;</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:format-text" title="Tips for better responses">
          <ol>
            <li>Be specific — &quot;Explain how X relates to Y&quot; beats &quot;explain this&quot;.</li>
            <li>Provide context — mention what you already understand.</li>
            <li>Ask follow-up questions — build on previous answers.</li>
            <li>Request examples — ask for real-world applications.</li>
          </ol>
        </HelpCard>

        <Callout variant="warning" title="Important">
          The AI Tutor is a learning aid, not a replacement for your instructor. For grading questions or official course matters, contact your instructor directly.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'surveys',
    title: 'Surveys & Feedback',
    description: 'Participate in surveys to improve courses.',
    icon: 'mdi:clipboard-list-outline',
    group: 'Engagement',
    searchText: 'surveys feedback course evaluation rating anonymous response',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Surveys help instructors and administrators gather feedback to improve courses and the learning experience.
        </p>

        <HelpCard icon="mdi:magnify" title="Finding surveys">
          <ol>
            <li>Active surveys appear in dashboard notifications or the Surveys section.</li>
            <li>Course-specific surveys appear in your enrolled courses.</li>
            <li>Platform-wide surveys may appear as notifications.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:check-circle-outline" title="Completing surveys">
          <ol>
            <li>Click on a survey to open it. Read the instructions.</li>
            <li>Answer required questions (marked with an asterisk).</li>
            <li>Choose from multiple choice, rating scales, or text responses.</li>
            <li>Submit your responses.</li>
            <li>Some surveys are anonymous — check the description.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:format-list-bulleted-square" title="Types of surveys">
          <ul>
            <li><strong>Course evaluations</strong> — Rate specific courses and instructors.</li>
            <li><strong>Mid-course feedback</strong> — Help improve a course while it&apos;s running.</li>
            <li><strong>Platform feedback</strong> — Share thoughts on the learning platform.</li>
            <li><strong>Research surveys</strong> — Participate in educational research studies.</li>
          </ul>
        </HelpCard>

        <Callout variant="info" title="Your feedback matters">
          Survey responses help improve courses and the learning experience for everyone.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'learning-paths',
    title: 'Learning Paths',
    description: 'Curated course sequences for skill mastery.',
    icon: 'mdi:road-variant',
    group: 'Courses',
    searchText: 'learning paths sequence prerequisites certificate skill',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Learning Paths are curated sequences of courses designed to help you master a specific skill or topic area.
        </p>

        <HelpCard icon="mdi:source-branch" title="What is a learning path?">
          <ul>
            <li>A structured sequence of related courses.</li>
            <li>Builds skills progressively from beginner to advanced.</li>
            <li>May include prerequisites and a recommended order.</li>
            <li>Completion may earn a specialised certificate.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:magnify" title="Finding learning paths">
          <ol>
            <li>Navigate to <strong>Learning Paths</strong> from the main navigation.</li>
            <li>Browse by category or skill area.</li>
            <li>View details — courses, duration, requirements.</li>
            <li>See which courses you&apos;ve already completed that apply.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:walk" title="Following a learning path">
          <ol>
            <li>Click on a path to view its courses in order.</li>
            <li>Start with the first course or enrol in the entire path.</li>
            <li>Complete courses in the recommended sequence.</li>
            <li>Track your progress through the path.</li>
            <li>Earn a path-completion certificate when finished.</li>
          </ol>
        </HelpCard>

        <Callout variant="success" title="Tip">
          Learning Paths are great for career development — choose paths that align with your professional goals.
        </Callout>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'student-tools',
    title: 'Student Tools',
    description: 'Bookmarks, notes, todos, study groups, and calendar.',
    icon: 'mdi:toolbox-outline',
    group: 'Tools',
    searchText: 'bookmarks notes todo study groups calendar productivity',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The platform provides several tools to help you stay organised and enhance your learning experience.
        </p>

        <HelpCard icon="mdi:bookmark-outline" title="Bookmarks">
          <p className="mb-2">Save important content for quick access later.</p>
          <ol>
            <li>Click the bookmark icon on any lesson or content item.</li>
            <li>Access bookmarks from the dashboard or Bookmarks page.</li>
            <li>Organise by course or add notes.</li>
            <li>Remove bookmarks when no longer needed.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:note-edit-outline" title="Notes">
          <p className="mb-2">Take personal notes while learning.</p>
          <ol>
            <li>Access Notes from the student tools menu.</li>
            <li>Create notes associated with specific lessons or courses.</li>
            <li>Use rich text formatting to organise your notes.</li>
            <li>Search through notes to find information quickly.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:check-circle-outline" title="Todo list">
          <p className="mb-2">Track learning tasks and deadlines.</p>
          <ol>
            <li>Access the todo widget from the dashboard.</li>
            <li>Add personal tasks and reminders.</li>
            <li>Set due dates and priorities.</li>
            <li>Mark tasks complete when done.</li>
            <li>Tasks sync across devices when you log in.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:account-group-outline" title="Study groups">
          <p className="mb-2">Collaborate with classmates.</p>
          <ol>
            <li>Create or join study groups for your courses.</li>
            <li>Invite classmates to join your group.</li>
            <li>Share resources and discuss material.</li>
            <li>Schedule virtual study sessions together.</li>
          </ol>
        </HelpCard>

        <HelpCard icon="mdi:calendar-outline" title="Calendar">
          <p className="mb-2">View upcoming deadlines and events.</p>
          <ol>
            <li>Access the calendar widget on your dashboard.</li>
            <li>View assignment due dates and quiz schedules.</li>
            <li>See upcoming video conference sessions.</li>
            <li>Plan your study schedule around important dates.</li>
          </ol>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'adaptive-learning',
    title: 'Adaptive Learning',
    description: 'Personalised recommendations based on your performance.',
    icon: 'mdi:brain',
    group: 'Tools',
    searchText: 'adaptive learning recommendations difficulty supplementary',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The platform personalises your learning experience based on your performance and preferences.
        </p>

        <HelpCard icon="mdi:gauge" title="How it works">
          <ul>
            <li>Navigate to <strong>Adaptive Learning</strong> from your dashboard.</li>
            <li>The system analyses your quiz scores, grades, and engagement.</li>
            <li>Personalised recommendations appear for areas where you need support.</li>
            <li>Recommendations update automatically as your performance improves.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:account-star-outline" title="Getting the most from recommendations">
          <ul>
            <li>Review recommended supplementary lessons and materials.</li>
            <li>Set your difficulty preference in your profile for better recommendations.</li>
            <li>Complete recommended content to strengthen weak areas before moving on.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Manage your personal info, notifications, and certificates.',
    icon: 'mdi:account-circle-outline',
    group: 'Account',
    searchText: 'profile bio avatar preferences notification certificates student id',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Manage your personal information, avatar, and learning preferences.
        </p>

        <HelpCard icon="mdi:account-edit-outline" title="Editing your profile">
          <ul>
            <li>Click your avatar or name in the navbar, then select <strong>Profile</strong>.</li>
            <li>Update your name, bio, and profile picture.</li>
            <li>Set learning preferences (difficulty level, subject interests).</li>
            <li>View your Student ID if assigned.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:bell-cog-outline" title="Notification preferences">
          <ul>
            <li>Go to <strong>Profile → Notifications</strong>.</li>
            <li>Choose which notifications you receive (email and in-app).</li>
            <li>Options: grade alerts, assignment reminders, announcements, discussion replies.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:certificate-outline" title="Your certificates">
          <ul>
            <li>Go to <strong>Profile → Certificates</strong> to view earned certificates.</li>
            <li>Download as PDF.</li>
            <li>Share using the unique verification link.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'courses-subjects',
    title: 'Courses & Subjects',
    description: 'My Courses, attendance, and the subjects view.',
    icon: 'mdi:school-outline',
    group: 'Courses',
    searchText: 'my courses attendance gradebook subjects',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Courses are structured learning experiences with lessons, assessments, attendance tracking, and a gradebook.
        </p>

        <HelpCard icon="mdi:view-list-outline" title="Viewing your courses">
          <ul>
            <li>Navigate to <strong>My Courses</strong> for all courses you&apos;re enrolled in.</li>
            <li>Each course shows the instructor, schedule, and progress.</li>
            <li>Click a course for details, curriculum, and gradebook.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:calendar-check-outline" title="Attendance">
          <ul>
            <li>Your instructor tracks attendance for each live session.</li>
            <li>View your attendance record on the course detail page.</li>
            <li>Consistent attendance may affect your grade in some courses.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:bookshelf" title="My Subjects">
          <ul>
            <li>Navigate to <strong>My Subjects</strong> for an alternative view.</li>
            <li>Group your courses by subject area for easier navigation.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'admissions',
    title: 'Admissions & Applications',
    description: 'Apply to programmes and check application status.',
    icon: 'mdi:clipboard-text-outline',
    group: 'Account',
    searchText: 'admissions applications status pending review accepted rejected',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Apply to programmes and track your application status.
        </p>

        <HelpCard icon="mdi:file-document-edit-outline" title="Applying">
          <ul>
            <li>Application links are shared by your institution.</li>
            <li>Fill in the application form with required information.</li>
            <li>Upload supporting documents as requested.</li>
            <li>Submit and note your application reference.</li>
          </ul>
        </HelpCard>

        <HelpCard icon="mdi:clipboard-search-outline" title="Checking application status">
          <ul>
            <li>Visit the <strong>Admissions Status</strong> page.</li>
            <li>Enter your email or application reference.</li>
            <li>Statuses: pending, under review, accepted, rejected.</li>
            <li>You&apos;ll also receive email notifications when status changes.</li>
          </ul>
        </HelpCard>
      </div>
    ),
  },

  // ---------------------------------------------------------------------------
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and how to resolve them.',
    icon: 'mdi:alert-circle-outline',
    group: 'Support',
    searchText: 'troubleshooting page not loading assignment submission login forgot password browser cache',
    content: (
      <div className="space-y-4">
        <Callout variant="danger" title="Page not loading" icon="mdi:close-circle-outline">
          <p>Try these steps in order:</p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Refresh the page (Ctrl+F5 on Windows, Cmd+Shift+R on Mac).</li>
            <li>Clear your browser cache and cookies.</li>
            <li>Check your internet connection or switch networks.</li>
            <li>Try a different browser (Chrome, Firefox, Safari, Edge).</li>
          </ol>
        </Callout>

        <Callout variant="warning" title="Assignment submission issues">
          <ol className="ml-5 list-decimal space-y-1">
            <li>Check file size limits (usually 10 MB max). Compress or convert if larger.</li>
            <li>Ensure file format is supported (PDF, DOC, DOCX). Convert to PDF if unsure.</li>
            <li>Verify you&apos;re still logged in. Log out and back in if needed.</li>
            <li>Contact your instructor if problems persist — include error message details.</li>
          </ol>
        </Callout>

        <Callout variant="success" title="Login problems" icon="mdi:lock-question">
          <ol className="ml-5 list-decimal space-y-1">
            <li>Use the <strong>Forgot Password</strong> link. Check your spam folder for the reset email.</li>
            <li>Check your email for an account-verification link (new accounts).</li>
            <li>Ensure you&apos;re using the correct email address — watch for typos.</li>
            <li>Contact support if your account is locked after multiple failed attempts.</li>
          </ol>
        </Callout>

        <Callout variant="info" title="Still having issues?">
          Contact your course instructor or the system administrator for additional support.
        </Callout>
      </div>
    ),
  },
];

export const studentGroupOrder: string[] = [
  'Get started',
  'Courses',
  'Engagement',
  'Tools',
  'Outcomes',
  'Account',
  'Support',
];
