import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

/**
 * POST /api/surveys/upload
 * Upload a CSV file to create a survey with questions
 *
 * CSV Format:
 * Row 1: title,description,survey_type,is_anonymous
 * Row 2: Survey Title,Survey Description,course_evaluation,true
 * Row 3: (empty or header)
 * Row 4: question_type,question_text,required,option1,option2,option3,option4,option5,scale_min,scale_max,category
 * Row 5+: Questions data
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Only instructors and admins can upload surveys
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('course_id') as string | null;
    const lessonId = formData.get('lesson_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length < 4) {
      return NextResponse.json({
        error: 'CSV must have at least 4 rows: survey header, survey data, questions header, question data'
      }, { status: 400 });
    }

    // Parse survey metadata from row 2
    const surveyRow = parseCSVLine(lines[1]);
    const surveyData = {
      title: surveyRow[0] || 'Imported Survey',
      description: surveyRow[1] || null,
      survey_type: surveyRow[2] || 'custom',
      is_anonymous: surveyRow[3]?.toLowerCase() === 'true'
    };

    // Parse questions starting from row 5 (after question headers at row 4)
    const questions: any[] = [];
    for (let i = 4; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < 2 || !row[0] || !row[1]) continue;

      const questionType = row[0].toLowerCase().replace(/\s+/g, '_');
      const questionText = row[1];
      const required = row[2]?.toLowerCase() !== 'false';

      // Parse options and scale based on question type
      let options: any = null;

      switch (questionType) {
        case 'likert_scale':
          options = {
            min: parseInt(row[8]) || 1,
            max: parseInt(row[9]) || 5,
            labels: [row[3], row[4], row[5], row[6], row[7]].filter(Boolean)
          };
          break;

        case 'rating_scale':
        case 'slider':
          options = {
            min: parseInt(row[8]) || 1,
            max: parseInt(row[9]) || 10,
            step: 1
          };
          break;

        case 'nps':
          options = {
            min: 0,
            max: 10
          };
          break;

        case 'multiple_choice':
        case 'multiple_select':
        case 'ranking':
          const choices = [row[3], row[4], row[5], row[6], row[7]].filter(Boolean);
          options = choices.map((text, idx) => ({
            id: `option_${idx + 1}`,
            text
          }));
          break;

        case 'matrix':
          // Matrix expects rows and columns in specific format
          // For CSV, we'll parse it as: rows|row2|row3;col1|col2|col3
          if (row[3]) {
            const [rowsPart, colsPart] = row[3].split(';');
            const matrixRows = rowsPart?.split('|').map((text, idx) => ({ id: `row_${idx + 1}`, text })) || [];
            const matrixCols = colsPart?.split('|').map((text, idx) => ({ id: `col_${idx + 1}`, text })) || [];
            options = { rows: matrixRows, columns: matrixCols };
          }
          break;

        case 'text':
          options = { maxLength: parseInt(row[3]) || 500 };
          break;

        case 'essay':
          options = {
            minLength: parseInt(row[3]) || 100,
            maxLength: parseInt(row[4]) || 2000
          };
          break;
      }

      questions.push({
        type: questionType,
        question_text: questionText,
        required,
        options,
        category: row[10] || null,
        order: questions.length
      });
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No valid questions found in CSV' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Create survey
    const { data: survey, error: surveyError } = await tq
      .from('surveys')
      .insert({
        ...surveyData,
        course_id: courseId || null,
        lesson_id: lessonId || null,
        creator_id: userProfile.id,
        published: false
      })
      .select()
      .single();

    if (surveyError) {
      console.error('Error creating survey:', surveyError);
      return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
    }

    // Create questions
    const questionsToInsert = questions.map(q => ({
      ...q,
      survey_id: survey.id
    }));

    const { data: insertedQuestions, error: questionsError } = await tq
      .from('survey_questions')
      .insert(questionsToInsert)
      .select();

    if (questionsError) {
      console.error('Error creating questions:', questionsError);
      // Delete the survey if questions failed
      await tq.from('surveys').delete().eq('id', survey.id);
      return NextResponse.json({ error: 'Failed to create questions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      survey: {
        ...survey,
        survey_questions: insertedQuestions
      },
      question_count: insertedQuestions?.length || 0
    }, { status: 201 });
  } catch (error) {
    console.error('Survey upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      current += '"';
      i++;
    } else if (char === '"') {
      // Toggle quote mode
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push last field
  result.push(current.trim());

  return result;
}
