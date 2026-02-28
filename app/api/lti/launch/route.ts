/**
 * LTI 1.3 Launch Endpoint
 * Handles LTI resource link launches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createLTILaunchJWT, getLTIToolById, mapRoleToLTI } from '@/lib/lti/core';
import { authenticateUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user || !authResult.userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user, userProfile } = authResult;
    const body = await request.json();
    const { tool_id, course_id, class_id, resource_link_id, return_url, custom_parameters } = body;

    if (!tool_id) {
      return NextResponse.json(
        { error: 'tool_id is required' },
        { status: 400 }
      );
    }

    // Get tool
    const tool = await getLTIToolById(tool_id);
    if (!tool || (tool as any).status !== 'active') {
      return NextResponse.json(
        { error: 'LTI tool not found or inactive' },
        { status: 404 }
      );
    }

    // Map user role to LTI roles
    const isInstructor = userProfile.role === 'instructor' || userProfile.role === 'admin' || userProfile.role === 'super_admin';
    const ltiRoles = mapRoleToLTI(userProfile.role, isInstructor);

    // Get course context if provided
    let contextId = course_id;
    let contextTitle = null;
    let contextLabel = null;

    if (course_id) {
      const supabase = await createServerSupabaseClient();
      const { data: course } = await supabase
        .from('courses')
        .select('id, title, subject_area')
        .eq('id', course_id)
        .single();

      if (course) {
        contextId = course.id;
        contextTitle = course.title;
        contextLabel = course.subject_area || null;
      }
    }

    // Create launch JWT
    const launchJWT = await createLTILaunchJWT({
      tool_id: tool.id,
      user_id: user.id,
      course_id: course_id || undefined,
      class_id: class_id || undefined,
      resource_link_id: resource_link_id || undefined,
      context_id: contextId || undefined,
      context_title: contextTitle || undefined,
      context_label: contextLabel || undefined,
      roles: ltiRoles,
      custom_parameters: custom_parameters || {},
      return_url: return_url || undefined,
    }, tool);

    // Return launch form (auto-submit to tool)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Launching ${tool.name}...</title>
        </head>
        <body>
          <form id="ltiLaunchForm" method="POST" action="${tool.launch_url}">
            <input type="hidden" name="id_token" value="${launchJWT}" />
            <input type="hidden" name="state" value="${Date.now()}" />
            <noscript>
              <p>Please click the button below to launch ${tool.name}.</p>
              <button type="submit">Launch Tool</button>
            </noscript>
          </form>
          <script>
            document.getElementById('ltiLaunchForm').submit();
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('LTI launch error:', error);
    return NextResponse.json(
      { error: 'Failed to launch LTI tool' },
      { status: 500 }
    );
  }
}

