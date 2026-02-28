import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import {
  reviewApplication,
  requestChanges,
  approveAndProvision,
} from '@/lib/admissions/admission-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const supabase = createServiceSupabaseClient();

    const { data: application, error } = await supabase
      .from('admission_applications')
      .select('*, admission_forms(id, title, slug, programme_id, settings)')
      .eq('id', id)
      .single();

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get fields for this form
    const { data: fields } = await supabase
      .from('admission_form_fields')
      .select('*')
      .eq('form_id', application.form_id)
      .order('order', { ascending: true });

    // Get documents
    const { data: documents } = await supabase
      .from('admission_documents')
      .select('*')
      .eq('application_id', id);

    // Get review history
    const { data: reviews } = await supabase
      .from('admission_reviews')
      .select('*, users(name, email)')
      .eq('application_id', id)
      .order('created_at', { ascending: true });

    // Enrich answers with field labels
    const fieldMap = new Map((fields || []).map(f => [f.id, f]));
    const enrichedAnswers = (application.answers || []).map((a: { field_id: string; answer: unknown }) => {
      const field = fieldMap.get(a.field_id);
      return {
        ...a,
        label: field?.label || 'Unknown Field',
        type: field?.type || 'text',
        options: field?.options || {},
      };
    });

    return NextResponse.json({
      application: {
        ...application,
        form_title: application.admission_forms?.title || 'Unknown',
        form_slug: application.admission_forms?.slug || '',
      },
      fields: fields || [],
      documents: documents || [],
      reviews: (reviews || []).map(r => ({
        ...r,
        reviewer_name: r.users?.name || r.users?.email || 'System',
      })),
      enriched_answers: enrichedAnswers,
    });
  } catch (error) {
    console.error('Application detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'curriculum_designer'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const { action, notes, message } = await request.json();
    const reviewerId = authResult.userProfile.id;

    let result: { success: boolean; error?: string };

    switch (action) {
      case 'approve':
        result = await approveAndProvision(id, reviewerId, notes);
        break;
      case 'reject':
        result = await reviewApplication(id, 'rejected', reviewerId, notes);
        break;
      case 'waitlist':
        result = await reviewApplication(id, 'waitlisted', reviewerId, notes);
        break;
      case 'under_review':
        result = await reviewApplication(id, 'under_review', reviewerId, notes);
        break;
      case 'request_changes':
        if (!message) {
          return NextResponse.json({ error: 'Feedback message is required for change requests' }, { status: 400 });
        }
        result = await requestChanges(id, reviewerId, message);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: `Application ${action} successful` });
  } catch (error) {
    console.error('Application review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
