/**
 * Turnitin Integration via LTI
 * Handles plagiarism detection using Turnitin LTI integration
 */

import { createLTILaunchJWT, getLTIToolById, mapRoleToLTI } from '@/lib/lti/core';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface TurnitinCheckConfig {
  submission_id: string;
  assignment_id: string;
  student_id: string;
  course_id: string;
  file_url?: string;
  file_content?: string;
  title?: string;
}

/**
 * Get Turnitin LTI tool
 */
export async function getTurnitinTool(): Promise<any> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('lti_tools')
    .select('*')
    .ilike('name', '%turnitin%')
    .eq('status', 'active')
    .single();

  return data;
}

/**
 * Launch Turnitin for plagiarism check
 */
export async function launchTurnitinCheck(
  config: TurnitinCheckConfig,
  userId: string,
  userRole: string
): Promise<string> {
  const turnitinTool = await getTurnitinTool();
  
  if (!turnitinTool) {
    throw new Error('Turnitin LTI tool not configured');
  }

  // Get user info
  const supabase = createServiceSupabaseClient();
  const { data: user } = await supabase
    .from('users')
    .select('email, name, role')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Map role to LTI roles
  const isInstructor = userRole === 'instructor' || userRole === 'admin' || userRole === 'super_admin';
  const ltiRoles = mapRoleToLTI(userRole, isInstructor);

  // Create LTI launch with custom parameters for Turnitin
  const launchJWT = await createLTILaunchJWT({
    tool_id: turnitinTool.id,
    user_id: userId,
    course_id: config.course_id,
    roles: ltiRoles,
    custom_parameters: {
      submission_id: config.submission_id,
      assignment_id: config.assignment_id,
      file_url: config.file_url,
      title: config.title || 'Assignment Submission',
    },
    return_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/api/plagiarism/callback`,
  }, turnitinTool);

  // Create plagiarism check record
  await supabase.from('plagiarism_checks').insert({
    submission_id: config.submission_id,
    assignment_id: config.assignment_id,
    student_id: config.student_id,
    course_id: config.course_id,
    service_type: 'turnitin',
    lti_tool_id: turnitinTool.id,
    status: 'pending',
  });

  return launchJWT;
}

/**
 * Handle Turnitin callback with results
 */
export async function handleTurnitinCallback(
  checkId: string,
  similarityScore: number,
  reportUrl: string,
  reportId: string,
  matches?: any[]
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  
  await supabase
    .from('plagiarism_checks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      similarity_score: similarityScore,
      originality_score: 100 - similarityScore,
      report_url: reportUrl,
      report_id: reportId,
      matches: matches || [],
      match_count: matches?.length || 0,
    })
    .eq('id', checkId);
}

/**
 * Get plagiarism check results
 */
export async function getPlagiarismCheck(checkId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('plagiarism_checks')
    .select('*')
    .eq('id', checkId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

