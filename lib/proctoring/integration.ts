/**
 * Proctoring Service Integration
 * Handles integration with remote proctoring services
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface ProctoringService {
  id: string;
  name: string;
  display_name: string;
  service_type: 'browser_lock' | 'remote_proctoring' | 'ai_proctoring' | 'hybrid';
  api_endpoint?: string;
  configuration: Record<string, any>;
}

export interface ProctoringSessionConfig {
  quiz_id?: string;
  assignment_id?: string;
  student_id: string;
  course_id?: string;
  session_type: 'browser_lock' | 'remote_proctoring' | 'ai_proctoring' | 'hybrid';
  proctoring_service?: string;
  browser_lock_config?: {
    prevent_copy_paste?: boolean;
    prevent_new_tabs?: boolean;
    prevent_printing?: boolean;
    prevent_screen_capture?: boolean;
    require_fullscreen?: boolean;
    allow_switching_tabs?: boolean;
    max_tab_switches?: number;
  };
  remote_proctoring_config?: {
    require_webcam?: boolean;
    require_microphone?: boolean;
    require_screen_share?: boolean;
    ai_monitoring?: boolean;
    human_review?: boolean;
  };
}

/**
 * Get proctoring service configuration
 */
export async function getProctoringService(serviceName: string): Promise<ProctoringService | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('proctoring_services')
    .select('*')
    .eq('name', serviceName)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProctoringService;
}

/**
 * Create a proctoring session
 */
export async function createProctoringSession(config: ProctoringSessionConfig): Promise<string> {
  const supabase = createServiceSupabaseClient();
  
  const sessionData: any = {
    quiz_id: config.quiz_id || null,
    assignment_id: config.assignment_id || null,
    student_id: config.student_id,
    course_id: config.course_id || null,
    session_type: config.session_type,
    proctoring_service: config.proctoring_service || null,
    status: 'pending',
    started_at: new Date().toISOString(),
  };

  // Add browser lock settings
  if (config.browser_lock_config) {
    sessionData.browser_lock_enabled = true;
    sessionData.prevent_copy_paste = config.browser_lock_config.prevent_copy_paste ?? true;
    sessionData.prevent_new_tabs = config.browser_lock_config.prevent_new_tabs ?? true;
    sessionData.prevent_printing = config.browser_lock_config.prevent_printing ?? true;
    sessionData.prevent_screen_capture = config.browser_lock_config.prevent_screen_capture ?? true;
    sessionData.require_fullscreen = config.browser_lock_config.require_fullscreen ?? false;
    sessionData.allow_switching_tabs = config.browser_lock_config.allow_switching_tabs ?? false;
    sessionData.max_tab_switches = config.browser_lock_config.max_tab_switches ?? 0;
  }

  // Add remote proctoring settings
  if (config.remote_proctoring_config) {
    sessionData.require_webcam = config.remote_proctoring_config.require_webcam ?? false;
    sessionData.require_microphone = config.remote_proctoring_config.require_microphone ?? false;
    sessionData.require_screen_share = config.remote_proctoring_config.require_screen_share ?? false;
    sessionData.ai_monitoring = config.remote_proctoring_config.ai_monitoring ?? false;
    sessionData.human_review = config.remote_proctoring_config.human_review ?? false;
  }

  const { data, error } = await supabase
    .from('proctoring_sessions')
    .insert([sessionData])
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create proctoring session');
  }

  return data.id;
}

/**
 * Record a proctoring event
 */
export async function recordProctoringEvent(
  sessionId: string,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  
  await supabase.from('proctoring_events').insert({
    session_id: sessionId,
    event_type: eventType,
    severity,
    metadata: metadata || {},
    auto_flagged: severity === 'high' || severity === 'critical',
  });

  // Update violation count if needed
  if (severity === 'high' || severity === 'critical') {
    const { data: session } = await supabase
      .from('proctoring_sessions')
      .select('violation_count, violations')
      .eq('id', sessionId)
      .single();

    if (session) {
      const violations = Array.isArray(session.violations) ? session.violations : [];
      violations.push({
        type: eventType,
        severity,
        timestamp: new Date().toISOString(),
        metadata,
      });

      await supabase
        .from('proctoring_sessions')
        .update({
          violation_count: (session.violation_count || 0) + 1,
          violations,
          status: severity === 'critical' ? 'violated' : 'flagged',
        })
        .eq('id', sessionId);
    }
  }
}

/**
 * End a proctoring session
 */
export async function endProctoringSession(sessionId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  
  // Get session to calculate duration
  const { data: session } = await supabase
    .from('proctoring_sessions')
    .select('started_at')
    .eq('id', sessionId)
    .single();

  if (session && session.started_at) {
    const duration = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
    
    await supabase
      .from('proctoring_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq('id', sessionId);
  }
}

/**
 * Get proctoring session
 */
export async function getProctoringSession(sessionId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('proctoring_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

