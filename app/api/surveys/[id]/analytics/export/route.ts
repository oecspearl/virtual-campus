import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/surveys/[id]/analytics/export
 * Export survey responses as CSV
 * Query params: format=csv|json
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: surveyId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check survey exists and user has permission
    const { data: survey } = await tq
      .from('surveys')
      .select(`
        id,
        title,
        is_anonymous,
        creator_id,
        survey_questions(id, type, question_text, "order")
      `)
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const isCreator = userProfile.id === survey.creator_id;
    const isAdmin = ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get all submitted responses
    const { data: responses, error } = await tq
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching responses:', error);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    // Sort questions by order
    const questions = (survey.survey_questions || []).sort((a: any, b: any) => a.order - b.order);

    if (format === 'json') {
      // Return structured JSON
      const exportData = {
        survey: {
          id: survey.id,
          title: survey.title
        },
        questions: questions.map((q: any) => ({
          id: q.id,
          text: q.question_text,
          type: q.type
        })),
        responses: responses?.map(r => ({
          response_id: r.id,
          respondent_id: survey.is_anonymous ? null : r.respondent_id,
          submitted_at: r.submitted_at,
          completion_time: r.completion_time,
          answers: r.answers
        })) || [],
        exported_at: new Date().toISOString()
      };

      return NextResponse.json(exportData);
    }

    // Generate CSV
    const headers = [
      'Response ID',
      survey.is_anonymous ? '' : 'Respondent ID',
      'Submitted At',
      'Completion Time (seconds)',
      ...questions.map((q: any) => q.question_text)
    ].filter(h => h !== '');

    const rows = (responses || []).map(response => {
      const row: string[] = [
        response.id,
        ...(survey.is_anonymous ? [] : [response.respondent_id || '']),
        response.submitted_at || '',
        response.completion_time?.toString() || ''
      ];

      // Add answer for each question
      for (const question of questions) {
        const answer = response.answers?.find((a: any) => a.question_id === question.id);
        let value = '';

        if (answer?.answer !== undefined && answer?.answer !== null) {
          if (Array.isArray(answer.answer)) {
            value = answer.answer.join('; ');
          } else if (typeof answer.answer === 'object') {
            value = JSON.stringify(answer.answer);
          } else {
            value = String(answer.answer);
          }
        }

        row.push(value);
      }

      return row;
    });

    // Build CSV string
    const escapeCSV = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Return CSV file
    const filename = `survey-${surveyId}-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Survey export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
