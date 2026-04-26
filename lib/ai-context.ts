import { createServerSupabaseClient } from './supabase-server';

/**
 * Canonical capability list the AI assistant references when answering
 * "what can this platform do?" / "how do I…?" questions. Keep this in
 * sync with the help center sections (app/help/{admin,instructor,
 * student}/sections.tsx). Each entry is one line that names the feature
 * and notes the most likely entry point or the audience that uses it.
 */
const PLATFORM_FEATURES: string[] = [
  // Course & content
  'Course Management — create, publish, edit, and delete courses; multiple course formats (lessons, topics, weekly, grid, player); featured-course flag for the homepage',
  'Lesson Content Blocks (13 types) — text, video, interactive video (questions at checkpoints), audio/podcast, code sandbox (8 languages incl. JS/Python/HTML/CSS), images, PDFs, file uploads, embeds, slideshows, quizzes, assignments, and 3D models (.glb/.gltf/.usdz with AR + fullscreen)',
  'SCORM — in-app SCORM 2004 builder for slide+quiz packages, plus AI generation that turns a topic or pasted text into a complete SCORM package; uploaded packages render via a built-in player',
  'Rich-Text (ProseForge) Editor — light toolbar with formatting, tables, images, source view; AI Enhance modes: Beautify, Lesson Format, Add Visuals, Expand, Summarize, Simplify, Fix Grammar (no <mark> highlights — emphasis via headings/callouts/blockquotes)',
  'Question Banks & Adaptive Learning — reusable question pools, adaptive rules engine, peer review, anonymous grading',
  'Quiz Proctoring — Safe Browser Mode with violation logging and optional auto-submit',

  // Assessment & grading
  'Assignments & Quizzes — rubrics, due dates, late-submission policies, AI rubric generation, peer review, gradebook + bulk grade upload',
  'Surveys — anonymous or named feedback surveys per course',
  'Anonymous Grading — hide student identities while marking',

  // Communication
  'Discussions — graded or ungraded, threaded replies, "Mark as Solution", styled rubric display, instructor grader modal',
  'Announcements — per-course announcements with email + in-app delivery',
  'Video Conferences — 8x8.vc / Google Meet / BigBlueButton with attendance tracking',
  'Student Messaging — DMs, group chats, course rooms (auto-populated from enrolment), file/image attachments, threaded replies, blocking, "Online Now" classmate panel on course pages',
  'AI Tutor — context-aware lesson tutor that reads the lesson HTML; available on shared-course lessons too',

  // Multi-tenancy & cross-tenant
  'Multi-Tenancy — each institution is its own tenant with isolated data, custom subdomain, custom branding/theming, per-tenant email templates, tenant-admin role',
  'Cross-Tenant Course Sharing — share a course to one or more target tenants with delegation flags (target-tenant grading / supplements / live sessions); target admin accepts the share before students see it; "Forked from {Institution}" chip on forked courses',
  'Regional Credit Transfer — student-initiated transfer requests, registrar review with cross-tenant transcript reads, threaded comments + email notifications, per-tenant participation flag, regional date filter',

  // Programmes & learning paths
  'Programmes — multi-course programme structure with enrolments and completion tracking',
  'Learning Paths — curated sequences of courses with prerequisites and progress',
  'CRM & Enrolment Pipeline — applicant tracking from lead to enrolled student',
  'Admissions Management — application workflow with custom forms',
  'SIS Integration — SonisWeb sync for student records',
  'LTI Integrations — LTI 1.3 launch into external tools',

  // Engagement & analytics
  'Gamification — XP, levels, daily streaks, achievement badges',
  'Notifications — in-app + email notifications across courses, assignments, discussions, messages',
  'Student Analytics & At-Risk Monitoring — instructor dashboards, custom reports, predictive at-risk flags',
  'Adaptive Rules — rules-based content unlock and recommendation engine',

  // Admin & operations
  'User Management — invite/add/edit users, bulk CSV import + update, bulk email, bulk welcome emails, user reports',
  'Branding & Theming — per-tenant logo, hero, features, courses, testimonials, footer, colour theme + custom palette, featured-course picker',
  'Categories — group courses for catalogue browsing',
  'Certificates — auto-issued completion certificates with verification codes',
  'Proctoring Services — Safe Browser Mode + optional external proctoring providers',
  'Help Center — role-specific help (admin / instructor / student) plus this AI assistant',
];

export interface AIContext {
  userRole: string;
  currentPage: string;
  courseId?: string;
  lessonId?: string;
  recentActions: string[];
  userPreferences: {
    learningStyle?: string;
    subjectInterests?: string[];
    difficultyPreference?: string;
  };
  platformInfo: {
    name: string;
    version: string;
    features: string[];
  };
}

export interface AIConversation {
  id: string;
  title: string;
  context: AIContext;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export class AIContextManager {
  private supabase: any;
  private userId: string;

  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Get current user context based on their session and current page
   */
  async getCurrentContext(currentPage: string, additionalContext?: Partial<AIContext>): Promise<AIContext> {
    try {
      // Get user profile (with fallback)
      let profile = null;
      try {
        const { data: profileData } = await this.supabase
          .from('user_profiles')
          .select('learning_preferences')
          .eq('user_id', this.userId)
          .single();
        profile = profileData;
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }

      // Get user role (with fallback)
      let userData = null;
      try {
        const { data: userDataResult } = await this.supabase
          .from('users')
          .select('role')
          .eq('id', this.userId)
          .single();
        userData = userDataResult;
      } catch (error) {
        console.error('Error fetching user role:', error);
      }

      // Get recent actions (last 5 actions) (with fallback)
      let recentActions = [];
      try {
        const { data: actionsData } = await this.supabase
          .from('user_activity_log')
          .select('action')
          .eq('user_id', this.userId)
          .order('created_at', { ascending: false })
          .limit(5);
        recentActions = actionsData || [];
      } catch (error) {
        console.error('Error fetching recent actions:', error);
      }

      const context: AIContext = {
        userRole: userData?.role || 'student',
        currentPage,
        recentActions: recentActions?.map((action: any) => action.action) || [],
        userPreferences: {
          learningStyle: profile?.learning_preferences?.learning_style || 'visual',
          subjectInterests: Array.isArray(profile?.learning_preferences?.subject_interests) 
            ? profile.learning_preferences.subject_interests 
            : (profile?.learning_preferences?.subject_interests ? [profile.learning_preferences.subject_interests] : []),
          difficultyPreference: profile?.learning_preferences?.difficulty_preference || 'intermediate'
        },
        platformInfo: {
          name: 'OECS Learning Management System',
          version: '1.0.0',
          features: PLATFORM_FEATURES,
        },
        ...additionalContext
      };

      return context;
    } catch (error) {
      console.error('Error getting AI context:', error);
      // Return minimal context on error
      return {
        userRole: 'student',
        currentPage,
        recentActions: [],
        userPreferences: {
          learningStyle: 'visual',
          subjectInterests: [],
          difficultyPreference: 'intermediate'
        },
        platformInfo: {
          name: 'OECS Learning Management System',
          version: '1.0.0',
          features: PLATFORM_FEATURES,
        },
        ...additionalContext
      };
    }
  }

  /**
   * Build system prompt for OpenAI based on context
   */
  buildSystemPrompt(context: AIContext): string {
    const roleDescription = this.getRoleDescription(context.userRole);
    const pageContext = this.getPageContext(context.currentPage);
    
    return `You are an AI assistant for the OECS Learning Management System (LearnBoard). You help users navigate and use the platform effectively.

USER CONTEXT:
- Role: ${context.userRole} (${roleDescription})
- Current Page: ${context.currentPage}${pageContext}
- Learning Style: ${context.userPreferences.learningStyle}
- Subject Interests: ${Array.isArray(context.userPreferences.subjectInterests) 
      ? context.userPreferences.subjectInterests.join(', ') 
      : (context.userPreferences.subjectInterests || 'None specified')}
- Difficulty Preference: ${context.userPreferences.difficultyPreference}

PLATFORM FEATURES:
${context.platformInfo.features.map(feature => `- ${feature}`).join('\n')}

RECENT USER ACTIONS:
${context.recentActions.length > 0 ? context.recentActions.map(action => `- ${action}`).join('\n') : '- No recent actions'}

INSTRUCTIONS:
1. Provide helpful, accurate responses about using the LMS platform
2. Be context-aware and reference the user's current page when relevant
3. Offer specific guidance based on their role and preferences
4. If you don't know something, suggest checking the help system or contacting support
5. Only describe features that appear in the PLATFORM FEATURES list above. If a user asks about something not on that list, say you don't have information about it rather than inventing capabilities.
6. When a user is best served by reading documentation, point them at the role-specific help center: /help/admin, /help/instructor, or /help/student (match the user's role).
5. Keep responses concise but comprehensive
6. Use a friendly, professional tone
7. When appropriate, suggest related features or next steps

RESPONSE FORMAT:
- Use markdown for formatting when helpful
- Include code examples for technical tasks
- Provide step-by-step instructions for complex processes
- Use bullet points for lists
- Include relevant links or references when possible

Remember: You are helping users succeed in their learning journey on the OECS platform.`;
  }

  private getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      'student': 'A learner enrolled in courses',
      'parent': 'A parent or guardian linked to one or more student accounts',
      'instructor': 'A teacher who creates and manages courses',
      'curriculum_designer': 'A content creator who designs learning materials but does not necessarily teach',
      'admin': 'A tenant-scoped administrator with full access within their institution',
      'tenant_admin': 'A tenant administrator who can manage users, settings, and billing for their own tenant',
      'super_admin': 'A platform-wide super administrator who can manage every tenant'
    };
    return descriptions[role] || 'A platform user';
  }

  private getPageContext(page: string): string {
    const pageContexts: Record<string, string> = {
      // Public + student
      '/dashboard': ' - User dashboard with course overview and progress',
      '/courses': ' - Course catalogue and enrolment page',
      '/my-courses': ' - The user\'s enrolled courses',
      '/my-subjects': ' - Subjects (modules) the user is taking',
      '/help': ' - Help center and documentation',
      '/profile': ' - User profile and settings',
      '/assignments': ' - Assignment list and submissions',
      '/quizzes': ' - Quiz list and attempts',
      '/discussions': ' - Discussion forums (course or global)',
      '/messages': ' - In-app messaging — DMs, group chats, course rooms',
      '/student/calendar': ' - Personal calendar with assignments + events',
      '/student/bookmarks': ' - Saved bookmarks across courses',
      '/student/notes': ' - Personal notes',
      '/student/study-groups': ' - Student study groups',
      '/student/todos': ' - To-do list',
      '/student/adaptive-learning': ' - Adaptive learning recommendations',
      '/surveys': ' - Survey list',
      '/submissions': ' - Submitted assignments and feedback',
      '/credit-transfer': ' - Cross-tenant credit transfer requests',
      // Admin
      '/admin': ' - Admin home',
      '/admin/users': ' - User management',
      '/admin/users/manage': ' - Detailed user manage view (filter, bulk actions, enrolments)',
      '/admin/courses/manage': ' - Course management (create/edit/delete/publish, share to other tenants)',
      '/admin/tenants': ' - (Super-admin) cross-tenant management',
      '/admin/settings/branding': ' - Per-tenant branding, colours, homepage content, footer, featured courses',
      '/admin/credit-transfer': ' - Registrar review of incoming credit-transfer requests',
      '/admin/at-risk-students': ' - At-risk student monitoring',
      '/admin/library': ' - Question bank library',
      '/admin/shared-courses': ' - Incoming course shares awaiting acceptance',
      // Instructor
      '/courses/create': ' - Create-course form',
      '/lessons': ' - Lesson editor (rich text, content blocks, ProseForge editor)',
      '/quizzes/create': ' - Quiz builder',
      '/assignments/create': ' - Assignment builder',
      // Other
      '/conferences': ' - Video conferences and live sessions',
      '/programmes': ' - Programme catalogue and enrolments',
      '/learning-paths': ' - Curated learning paths',
      '/shared-courses': ' - Courses shared from another tenant',
    };
    // Match the longest path prefix so /admin/courses/manage/[id]/edit
    // still resolves to the admin/courses/manage entry.
    const matches = Object.keys(pageContexts)
      .filter((p) => page === p || page.startsWith(p + '/'))
      .sort((a, b) => b.length - a.length);
    return matches.length > 0 ? pageContexts[matches[0]] : '';
  }

  /**
   * Cache context data to avoid repeated API calls
   */
  async cacheContext(contextKey: string, contextData: AIContext, ttlMinutes: number = 30): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      await this.supabase
        .from('ai_context_cache')
        .upsert({
          user_id: this.userId,
          context_key: contextKey,
          context_data: contextData,
          expires_at: expiresAt.toISOString()
        });
    } catch (error) {
      console.error('Error caching AI context:', error);
    }
  }

  /**
   * Get cached context data
   */
  async getCachedContext(contextKey: string): Promise<AIContext | null> {
    try {
      const { data } = await this.supabase
        .from('ai_context_cache')
        .select('context_data')
        .eq('user_id', this.userId)
        .eq('context_key', contextKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      return data?.context_data || null;
    } catch (error) {
      console.error('Error getting cached AI context:', error);
      return null;
    }
  }

  /**
   * Clean up expired context cache
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      await this.supabase.rpc('cleanup_expired_ai_context');
    } catch (error) {
      console.error('Error cleaning up expired AI context cache:', error);
    }
  }
}
