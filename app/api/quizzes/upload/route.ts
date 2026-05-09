import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { createLogger } from '@/lib/logger';

interface QuizCsvRow {
  // Quiz metadata (first row)
  title?: string;
  description?: string;
  instructions?: string;
  time_limit?: string;
  attempts_allowed?: string;
  points?: string;
  published?: string;
  randomize_questions?: string;
  randomize_answers?: string;
  show_correct_answers?: string;
  show_feedback?: string;
  passing_score?: string;
  due_date?: string;
  available_from?: string;
  available_until?: string;
  // Question data (subsequent rows)
  question_type?: string;
  question_text?: string;
  question_points?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  option5?: string;
  option6?: string;
  correct_answer?: string;
  case_sensitive?: string;
  feedback_correct?: string;
  feedback_incorrect?: string;
}

type Logger = ReturnType<typeof createLogger>;

export async function POST(request: Request) {
  const log = createLogger('api/quizzes/upload', request as unknown as { headers: { get(name: string): string | null } });

  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      log.warn('Forbidden: user lacks required role', { userId: user.id, role: user.role });
      return createAuthResponse("Forbidden", 403);
    }

    const formData = await request.formData();
    const file = formData.get('csv') as File;
    const lessonId = formData.get('lesson_id') as string | null;
    const courseId = formData.get('course_id') as string | null;
    const formTitle = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      log.warn('Invalid file type', { fileType: file.type, fileName: file.name });
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      log.warn('File too large', { fileSize: file.size });
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const csvContent = await file.text();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    log.info('Quiz upload started', {
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      csvLength: csvContent.length,
      lessonId,
      courseId,
    });

    const result = await parseAndImportQuiz(csvContent, tq, user.id, lessonId, courseId, file.name, formTitle, log);

    log.info('Quiz upload completed', {
      quizId: result.quiz?.id,
      questionsCreated: result.questionsCreated,
      errorCount: result.errors?.length ?? 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('Quiz upload failed', undefined, error);
    return NextResponse.json({
      error: 'Failed to process CSV file',
      details: errorMessage,
    }, { status: 500 });
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

async function parseAndImportQuiz(
  csvContent: string,
  tq: ReturnType<typeof createTenantQuery>,
  creatorId: string,
  lessonId: string | null,
  courseId: string | null,
  fileName: string | undefined,
  formTitle: string | null | undefined,
  log: Logger,
) {
  const lines = csvContent.trim().split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse headers
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));

  if (headers.length === 0) {
    throw new Error('CSV header row is empty or invalid');
  }

  // Find quiz metadata row and question header row
  let quizMetadataRow: QuizCsvRow = {};
  let questionStartIndex = 1;
  let questionHeaders = headers; // Default to using the first header row

  // Check if first header row contains quiz metadata columns (title, description, etc.)
  const hasQuizMetadataHeaders = headers.includes('title') || headers.includes('description') || headers.includes('time_limit');
  const hasQuestionHeaders = headers.includes('question_type') || headers.includes('question_text');

  // If first header row has quiz metadata columns, the first data row should be quiz metadata
  if (hasQuizMetadataHeaders && !hasQuestionHeaders && lines.length > 1) {
    const firstDataRow = parseCsvLine(lines[1]);
    const firstRowData: QuizCsvRow = {};
    headers.forEach((header, idx) => {
      if (firstDataRow[idx] !== undefined && firstDataRow[idx] !== null && firstDataRow[idx] !== '') {
        firstRowData[header as keyof QuizCsvRow] = firstDataRow[idx].trim();
      }
    });

    // This is quiz metadata row
    quizMetadataRow = firstRowData;
    questionStartIndex = 2;

    // Look for question header row (should be the next row after metadata)
    if (lines.length > 2) {
      const potentialQuestionHeaderRow = parseCsvLine(lines[2]);
      const potentialQuestionHeaders = potentialQuestionHeaderRow.map(h => h.trim().toLowerCase().replace(/"/g, ''));

      // Check if this row looks like a header row (has question_type or question_text)
      if (potentialQuestionHeaders.includes('question_type') || potentialQuestionHeaders.includes('question_text')) {
        questionHeaders = potentialQuestionHeaders;
        questionStartIndex = 3; // Questions start after the question header row
      } else {
        log.warn('No question header row found after quiz metadata');
      }
    }
  } else if (hasQuestionHeaders) {
    // First header row is question headers, no quiz metadata row
    questionHeaders = headers;
    questionStartIndex = 1;
  } else {
    // Ambiguous - try to detect by checking first data row
    if (lines.length > 1) {
      const firstDataRow = parseCsvLine(lines[1]);
      const firstRowData: QuizCsvRow = {};
      headers.forEach((header, idx) => {
        if (firstDataRow[idx] !== undefined && firstDataRow[idx] !== null && firstDataRow[idx] !== '') {
          firstRowData[header as keyof QuizCsvRow] = header.includes('question') ? firstDataRow[idx].trim() : firstDataRow[idx].trim();
        }
      });

      // Check if first data row values look like question data
      const firstRowLower = firstDataRow.map(v => v.trim().toLowerCase());
      if (firstRowLower.includes('multiple_choice') || firstRowLower.includes('true_false') || firstRowLower.includes('short_answer')) {
        // First data row contains question type, so first header is question header
        questionHeaders = headers;
        questionStartIndex = 1;
      } else if (firstRowData.title) {
        // First row has title, treat as quiz metadata
        quizMetadataRow = firstRowData;
        questionStartIndex = 2;
        // Try to find question headers in next row
        if (lines.length > 2) {
          const potentialQuestionHeaderRow = parseCsvLine(lines[2]);
          const potentialQuestionHeaders = potentialQuestionHeaderRow.map(h => h.trim().toLowerCase().replace(/"/g, ''));
          if (potentialQuestionHeaders.includes('question_type') || potentialQuestionHeaders.includes('question_text')) {
            questionHeaders = potentialQuestionHeaders;
            questionStartIndex = 3;
          }
        }
      }
    }
  }

  // Generate a better default title if none is provided
  const generateDefaultTitle = () => {
    // Priority: 1. Form title, 2. CSV title, 3. Filename-based, 4. Timestamp-based
    if (formTitle && formTitle.trim()) {
      return formTitle.trim();
    }
    if (quizMetadataRow.title && quizMetadataRow.title.trim()) {
      return quizMetadataRow.title.trim();
    }
    if (fileName) {
      const nameWithoutExt = fileName.replace(/\.csv$/i, '').trim();
      if (nameWithoutExt) {
        return nameWithoutExt;
      }
    }
    // Fallback to timestamp-based name
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Quiz ${timestamp}`;
  };

  // Extract quiz metadata
  const quizData = {
    title: generateDefaultTitle(),
    description: quizMetadataRow.description || '',
    instructions: quizMetadataRow.instructions || '',
    time_limit: quizMetadataRow.time_limit ? parseInt(quizMetadataRow.time_limit) : null,
    attempts_allowed: quizMetadataRow.attempts_allowed ? parseInt(quizMetadataRow.attempts_allowed) : 1,
    points: quizMetadataRow.points ? parseInt(quizMetadataRow.points) : 100,
    published: quizMetadataRow.published?.toLowerCase() === 'true' || quizMetadataRow.published === '1',
    randomize_questions: quizMetadataRow.randomize_questions?.toLowerCase() === 'true' || quizMetadataRow.randomize_questions === '1',
    randomize_answers: quizMetadataRow.randomize_answers?.toLowerCase() === 'true' || quizMetadataRow.randomize_answers === '1',
    show_correct_answers: quizMetadataRow.show_correct_answers?.toLowerCase() === 'true' || quizMetadataRow.show_correct_answers === '1',
    show_feedback: quizMetadataRow.show_feedback || 'after_submit',
    passing_score: quizMetadataRow.passing_score ? parseInt(quizMetadataRow.passing_score) : null,
    due_date: quizMetadataRow.due_date || null,
    available_from: quizMetadataRow.available_from || null,
    available_until: quizMetadataRow.available_until || null,
  };

  // Resolve course_id from lesson if needed
  let finalCourseId = courseId;
  if (!finalCourseId && lessonId) {
    const { data: lesson, error: lessonError } = await tq
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      log.error('Lesson lookup failed', { lessonId }, lessonError);
      throw new Error("Lesson not found");
    }
    finalCourseId = lesson.course_id;
  }

  if (!finalCourseId) {
    throw new Error("Course is required. Please select a course or provide a lesson that belongs to a course.");
  }

  // Create quiz
  const quizPayload = {
    lesson_id: lessonId,
    course_id: finalCourseId,
    title: quizData.title,
    description: quizData.description,
    instructions: quizData.instructions,
    time_limit: quizData.time_limit,
    attempts_allowed: quizData.attempts_allowed,
    show_correct_answers: quizData.show_correct_answers,
    show_feedback: quizData.show_feedback,
    randomize_questions: quizData.randomize_questions,
    randomize_answers: quizData.randomize_answers,
    passing_score: quizData.passing_score,
    due_date: quizData.due_date,
    available_from: quizData.available_from,
    available_until: quizData.available_until,
    points: quizData.points,
    published: quizData.published,
    creator_id: creatorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: quiz, error: quizError } = await tq
    .from("quizzes")
    .insert([quizPayload])
    .select()
    .single();

  if (quizError || !quiz) {
    log.error('Quiz creation failed', { courseId: finalCourseId, lessonId, title: quizPayload.title }, quizError);
    throw new Error(`Failed to create quiz: ${quizError?.message || 'Unknown error'}`);
  }

  // Parse questions
  const questions: any[] = [];
  const errors: any[] = [];

  let rowsProcessed = 0;
  let rowsSkipped = 0;
  let rowsWithErrors = 0;

  for (let i = questionStartIndex; i < lines.length; i++) {
    rowsProcessed++;
    const line = lines[i].trim();
    if (!line) {
      rowsSkipped++;
      continue;
    }

    try {
      const values = parseCsvLine(line);
      const rowData: QuizCsvRow = {};
      questionHeaders.forEach((header, idx) => {
        if (values[idx] !== undefined && values[idx] !== null && values[idx] !== '') {
          rowData[header as keyof QuizCsvRow] = values[idx].trim();
        }
      });

      // Skip if this row doesn't have question data
      if (!rowData.question_text && !rowData.question_type) {
        rowsSkipped++;
        continue;
      }

      // Skip if this looks like a duplicate header row
      const isHeaderRow = values.every((val, idx) => {
        const valLower = val.trim().toLowerCase();
        const headerLower = questionHeaders[idx]?.toLowerCase();
        return valLower === headerLower;
      });

      if (isHeaderRow && i > questionStartIndex) {
        rowsSkipped++;
        continue;
      }

      const questionTypeRaw = (rowData.question_type || 'multiple_choice').toLowerCase().trim();
      const validQuestionTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching'];
      const questionType = validQuestionTypes.includes(questionTypeRaw) ? questionTypeRaw : 'multiple_choice';

      const questionText = rowData.question_text || '';
      const points = rowData.question_points ? parseInt(rowData.question_points) : 1;

      if (!questionText) {
        errors.push({ row: i + 1, message: 'Question text is required' });
        continue;
      }

      let options: any[] = [];
      let correctAnswer: any = null;

      // Handle different question types
      if (questionType === 'multiple_choice' || questionType === 'true_false') {
        // Collect options
        const optionFields = ['option1', 'option2', 'option3', 'option4', 'option5', 'option6'];
        optionFields.forEach(field => {
          const optionText = rowData[field as keyof QuizCsvRow];
          if (optionText) {
            options.push({
              id: `opt-${options.length + 1}`,
              text: optionText,
              is_correct: false,
            });
          }
        });

        // Set correct answer
        const correctAnswerValue = rowData.correct_answer?.trim();
        if (correctAnswerValue) {
          // Check if it's an option number/index
          const optionIndex = parseInt(correctAnswerValue) - 1;
          if (optionIndex >= 0 && optionIndex < options.length) {
            options[optionIndex].is_correct = true;
            correctAnswer = options[optionIndex].id;
          } else {
            // Try to match by text
            const matchingOption = options.find(opt =>
              opt.text.toLowerCase().trim() === correctAnswerValue.toLowerCase().trim(),
            );
            if (matchingOption) {
              matchingOption.is_correct = true;
              correctAnswer = matchingOption.id;
            } else {
              correctAnswer = correctAnswerValue;
            }
          }
        }

        // For true/false, ensure we have at least 2 options
        if (questionType === 'true_false' && options.length < 2) {
          options = [
            { id: 'opt-1', text: 'True', is_correct: false },
            { id: 'opt-2', text: 'False', is_correct: false },
          ];
          if (correctAnswerValue?.toLowerCase() === 'true' || correctAnswerValue === '1') {
            options[0].is_correct = true;
            correctAnswer = 'opt-1';
          } else {
            options[1].is_correct = true;
            correctAnswer = 'opt-2';
          }
        }
      } else if (questionType === 'short_answer') {
        correctAnswer = rowData.correct_answer || '';
      }

      // Ensure correct_answer is properly formatted for JSONB
      let formattedCorrectAnswer: any = correctAnswer;
      if (questionType === 'multiple_choice' || questionType === 'true_false') {
        formattedCorrectAnswer = correctAnswer ? String(correctAnswer) : null;
      } else if (questionType === 'short_answer') {
        formattedCorrectAnswer = correctAnswer ? String(correctAnswer) : null;
      } else {
        formattedCorrectAnswer = correctAnswer;
      }

      const questionOrder = questions.length;

      const questionPayload = {
        quiz_id: quiz.id,
        type: questionType,
        question_text: questionText,
        points: points || 1, // Ensure points is at least 1
        order: questionOrder,
        options: options.length > 0 ? options : null,
        correct_answer: formattedCorrectAnswer,
        case_sensitive: rowData.case_sensitive?.toLowerCase() === 'true' || rowData.case_sensitive === '1',
        feedback_correct: rowData.feedback_correct || null,
        feedback_incorrect: rowData.feedback_incorrect || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Validate required fields before insertion
      if (!questionPayload.quiz_id) {
        errors.push({ row: i + 1, message: 'Quiz ID is required' });
        continue;
      }

      if (!questionPayload.type) {
        errors.push({ row: i + 1, message: 'Question type is required' });
        continue;
      }

      if (!questionPayload.question_text || questionPayload.question_text.trim() === '') {
        errors.push({ row: i + 1, message: 'Question text is required' });
        continue;
      }

      const { data: question, error: questionError } = await tq
        .from("questions")
        .insert([questionPayload])
        .select()
        .single();

      if (questionError) {
        log.error('Question insert failed', {
          quizId: quiz.id,
          row: i + 1,
          questionType,
          errorCode: questionError.code,
        }, questionError);
        errors.push({ row: i + 1, message: questionError.message || 'Unknown error', code: questionError.code });
        rowsWithErrors++;
      } else if (!question) {
        log.error('Question insert returned no data (possible RLS or constraint issue)', {
          quizId: quiz.id,
          row: i + 1,
          questionType,
        });
        errors.push({ row: i + 1, message: 'Question creation returned no data' });
        rowsWithErrors++;
      } else {
        questions.push(question);
      }
    } catch (error) {
      log.error('Exception processing question row', { quizId: quiz.id, row: i + 1 }, error);
      errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : 'Unknown error parsing question',
      });
      rowsWithErrors++;
    }
  }

  // If quiz was created with a lesson_id, automatically add it to the lesson content
  if (quiz.lesson_id && questions.length > 0) {
    try {
      const { data: lesson, error: lessonError } = await tq
        .from("lessons")
        .select("content, course_id")
        .eq("id", quiz.lesson_id)
        .single();

      if (!lessonError && lesson) {
        const currentContent = lesson.content || [];
        const quizContentItem = {
          type: 'quiz',
          title: quiz.title,
          data: {
            quizId: quiz.id,
            description: quiz.description || '',
            points: quiz.points || 100,
            timeLimit: quiz.time_limit,
            attemptsAllowed: quiz.attempts_allowed || 1,
          },
          id: `quiz-${quiz.id}`,
        };

        const updatedContent = [...currentContent, quizContentItem];
        await tq
          .from("lessons")
          .update({
            content: updatedContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", quiz.lesson_id);

        // Add to gradebook if course_id is available
        if (lesson.course_id) {
          try {
            const { data: existingGradeItem, error: checkError } = await tq
              .from("course_grade_items")
              .select("id")
              .eq("course_id", lesson.course_id)
              .eq("type", "quiz")
              .eq("assessment_id", quiz.id)
              .single();

            if (checkError && checkError.code !== 'PGRST116') {
              log.warn('Existing gradebook item check failed', { quizId: quiz.id, errorCode: checkError.code });
            } else if (!existingGradeItem) {
              // Calculate actual total points from questions (not from quiz.points field)
              const { data: questionRows, error: questionsError } = await tq
                .from("questions")
                .select("points")
                .eq("quiz_id", quiz.id);

              let totalPoints = 0;
              if (!questionsError && questionRows) {
                totalPoints = questionRows.reduce((sum: number, q: any) => sum + Number(q.points ?? 0), 0);
              }
              const pointsToUse = totalPoints > 0 ? totalPoints : (quiz.points || 100);

              const { error: insertError } = await tq
                .from("course_grade_items")
                .insert([{
                  course_id: lesson.course_id,
                  title: quiz.title,
                  type: "quiz",
                  category: "Quizzes",
                  points: pointsToUse,
                  assessment_id: quiz.id,
                  due_date: quiz.due_date,
                  weight: 1.0,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }]);

              if (insertError) {
                log.warn('Gradebook insert failed (non-critical)', { quizId: quiz.id, errorMessage: insertError.message });
              }
            }
          } catch (gradebookError) {
            // Catch any errors (including RLS recursion) and log but don't fail
            log.warn('Gradebook insert threw (non-critical)', {
              quizId: quiz.id,
              errorMessage: gradebookError instanceof Error ? gradebookError.message : String(gradebookError),
            });
          }
        }
      }
    } catch (error) {
      log.error('Failed to attach quiz to lesson content', { quizId: quiz.id, lessonId: quiz.lesson_id }, error);
    }
  }

  // Verify questions were actually created in the database
  const { data: verifyQuestions, error: verifyError } = await tq
    .from("questions")
    .select("id, quiz_id, type, question_text, order")
    .eq("quiz_id", quiz.id)
    .order("order", { ascending: true });

  if (verifyError) {
    log.warn('Question verification query failed', { quizId: quiz.id, errorMessage: verifyError.message });
  } else if (verifyQuestions && verifyQuestions.length !== questions.length) {
    log.warn('Verified question count differs from inserted count', {
      quizId: quiz.id,
      inserted: questions.length,
      verified: verifyQuestions.length,
    });
  }

  log.info('Import summary', {
    quizId: quiz.id,
    rowsProcessed,
    rowsSkipped,
    rowsWithErrors,
    questionsCreated: questions.length,
    questionsInDatabase: verifyQuestions?.length ?? 0,
    errorCount: errors.length,
  });

  if (questions.length === 0 && errors.length === 0) {
    log.warn('Upload completed with no questions and no errors — likely a parsing issue', { quizId: quiz.id });
  }

  return {
    success: true,
    quiz, // Return full quiz object so form can be populated
    questionsCreated: questions.length,
    totalRows: lines.length - questionStartIndex,
    errors: errors.length > 0 ? errors : undefined,
    warning: questions.length === 0 ? 'No questions were created. Please check your CSV format.' : undefined,
  };
}
