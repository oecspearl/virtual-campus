import { createServerSupabaseClient } from './supabase-server';

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
          features: [
            'Course Management',
            'Video Conferences',
            'Assignments & Quizzes',
            'Discussions',
            'Progress Tracking',
            'Help System'
          ]
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
          features: []
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
      'instructor': 'A teacher who creates and manages courses',
      'curriculum_designer': 'A content creator who designs learning materials',
      'admin': 'A system administrator with full access',
      'super_admin': 'A super administrator with all privileges'
    };
    return descriptions[role] || 'A platform user';
  }

  private getPageContext(page: string): string {
    const pageContexts: Record<string, string> = {
      '/dashboard': ' - User dashboard with course overview and progress',
      '/courses': ' - Course catalog and enrollment page',
      '/my-courses': ' - User\'s enrolled courses',
      '/help': ' - Help center and documentation',
      '/profile': ' - User profile and settings',
      '/assignments': ' - Assignment management',
      '/quizzes': ' - Quiz management',
      '/discussions': ' - Discussion forums'
    };
    return pageContexts[page] || '';
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
