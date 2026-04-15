import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

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

export async function POST(request: Request) {
  console.log('[Quiz Upload] ===== CSV UPLOAD STARTED =====');
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    console.log('[Quiz Upload] User authenticated:', user?.id, 'Role:', user?.role);

    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      console.error('[Quiz Upload] Forbidden: User does not have required role');
      return createAuthResponse("Forbidden", 403);
    }

    const formData = await request.formData();
    const file = formData.get('csv') as File;
    const lessonId = formData.get('lesson_id') as string | null;
    const courseId = formData.get('course_id') as string | null;
    const formTitle = formData.get('title') as string | null; // Get title from form if provided

    console.log('[Quiz Upload] Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      lessonId,
      courseId,
      formTitle
    });

    if (!file) {
      console.error('[Quiz Upload] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      console.error('[Quiz Upload] Invalid file type:', file.type, file.name);
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      console.error('[Quiz Upload] File too large:', file.size);
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Read and parse CSV
    console.log('[Quiz Upload] Reading CSV file...');
    const csvContent = await file.text();
    console.log('[Quiz Upload] CSV content length:', csvContent.length);
    console.log('[Quiz Upload] CSV content preview (first 500 chars):', csvContent.substring(0, 500));
    
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    console.log('[Quiz Upload] Calling parseAndImportQuiz...');
    const result = await parseAndImportQuiz(csvContent, tq, user.id, lessonId, courseId, file.name, formTitle);
    console.log('[Quiz Upload] ===== CSV UPLOAD COMPLETED =====');
    console.log('[Quiz Upload] Result:', JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Quiz Upload] Error details:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Quiz Upload] Error message:', errorMessage);
    console.error('[Quiz Upload] Error stack:', errorStack);
    return NextResponse.json({ 
      error: 'Failed to process CSV file',
      details: errorMessage
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
  fileName?: string,
  formTitle?: string | null
) {
  console.log('[Quiz Upload] parseAndImportQuiz called with:', {
    csvLength: csvContent.length,
    creatorId,
    lessonId,
    courseId,
    fileName,
    formTitle
  });
  
  try {
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    console.log('[Quiz Upload] Split CSV into', lines.length, 'lines (after filtering empty lines)');
    
    if (lines.length < 2) {
      console.error('[Quiz Upload] CSV has insufficient lines:', lines.length);
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse headers
    const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    console.log('[Quiz Upload] Parsed headers:', headers);
    console.log('[Quiz Upload] Number of headers:', headers.length);
    
    if (headers.length === 0) {
      console.error('[Quiz Upload] Headers array is empty');
      throw new Error('CSV header row is empty or invalid');
    }
    
    console.log('[Quiz Upload] CSV headers:', headers);
    console.log('[Quiz Upload] Total lines:', lines.length);
    console.log('[Quiz Upload] First few lines:', lines.slice(0, 5).map((line, idx) => `Line ${idx}: ${line.substring(0, 100)}`));
  
  // Find quiz metadata row and question header row
  let quizMetadataRow: QuizCsvRow = {};
  let questionStartIndex = 1;
  let questionHeaders = headers; // Default to using the first header row
  
  // Check if first header row contains quiz metadata columns (title, description, etc.)
  const hasQuizMetadataHeaders = headers.includes('title') || headers.includes('description') || headers.includes('time_limit');
  const hasQuestionHeaders = headers.includes('question_type') || headers.includes('question_text');
  
  console.log('[Quiz Upload] Header analysis:', {
    hasQuizMetadataHeaders,
    hasQuestionHeaders,
    headers: headers.slice(0, 5) // Log first 5 headers
  });
  
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
        console.log('[Quiz Upload] Found question header row at line 3:', potentialQuestionHeaders.slice(0, 5));
      } else {
        // No question header row found, use the original headers but skip quiz metadata columns
        // This shouldn't happen with proper CSV format, but handle it gracefully
        console.warn('[Quiz Upload] No question header row found after quiz metadata');
      }
    }
  } else if (hasQuestionHeaders) {
    // First header row is question headers, no quiz metadata row
    questionHeaders = headers;
    questionStartIndex = 1; // Questions start immediately after header
    console.log('[Quiz Upload] First row is question header, no quiz metadata row');
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
        console.log('[Quiz Upload] Detected question data in first row');
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
            console.log('[Quiz Upload] Found question header row at line 3');
          }
        }
      }
    }
  }
  
  console.log('[Quiz Upload] Final configuration:', {
    questionHeaders: questionHeaders.slice(0, 5),
    questionStartIndex,
    totalLines: lines.length,
    expectedQuestionRows: lines.length - questionStartIndex
  });

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
      // Remove .csv extension and use filename
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
      minute: '2-digit' 
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

  // Get course_id from lesson if lesson_id is provided, or use provided courseId
  // Use service client to bypass RLS and prevent infinite recursion
  let finalCourseId = courseId;
  if (!finalCourseId && lessonId) {
    const { data: lesson, error: lessonError } = await tq
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();

      if (lessonError || !lesson) {
        console.error('[Quiz Upload] Lesson fetch error:', lessonError);
        throw new Error("Lesson not found");
      }
    finalCourseId = lesson.course_id;
    console.log('[Quiz Upload] Found course_id from lesson:', finalCourseId);
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

  console.log('[Quiz Upload] Creating quiz with payload:', {
    title: quizPayload.title,
    lesson_id: quizPayload.lesson_id,
    course_id: quizPayload.course_id,
    points: quizPayload.points
  });

  const { data: quiz, error: quizError } = await tq
    .from("quizzes")
    .insert([quizPayload])
    .select()
    .single();

  if (quizError || !quiz) {
    console.error('[Quiz Upload] Quiz creation error:', quizError);
    console.error('[Quiz Upload] Quiz payload was:', JSON.stringify(quizPayload, null, 2));
    throw new Error(`Failed to create quiz: ${quizError?.message || 'Unknown error'}`);
  }

  console.log('[Quiz Upload] Quiz created successfully:', quiz.id);
  console.log('[Quiz Upload] Using service client for question insertion (bypasses RLS)');

  // Parse questions
  const questions: any[] = [];
  const errors: any[] = [];

  console.log('[Quiz Upload] ===== STARTING QUESTION PARSING =====');
  console.log('[Quiz Upload] Starting question parsing from row', questionStartIndex + 1);
  console.log('[Quiz Upload] Total lines in CSV:', lines.length);
  console.log('[Quiz Upload] Will process rows from', questionStartIndex, 'to', lines.length - 1);
  console.log('[Quiz Upload] Expected number of question rows:', lines.length - questionStartIndex);
  
  let rowsProcessed = 0;
  let rowsSkipped = 0;
  let rowsWithErrors = 0;
  
  for (let i = questionStartIndex; i < lines.length; i++) {
    rowsProcessed++;
    const line = lines[i].trim();
    if (!line) {
      console.log(`[Quiz Upload] Skipping empty row ${i + 1}`);
      rowsSkipped++;
      continue;
    }

    try {
      const values = parseCsvLine(line);
      const rowData: QuizCsvRow = {};
      // Use questionHeaders instead of headers for question rows
      questionHeaders.forEach((header, idx) => {
        if (values[idx] !== undefined && values[idx] !== null && values[idx] !== '') {
          rowData[header as keyof QuizCsvRow] = values[idx].trim();
        }
      });
      
      console.log(`[Quiz Upload] Processing row ${i + 1}:`, {
        hasQuestionType: !!rowData.question_type,
        hasQuestionText: !!rowData.question_text,
        questionType: rowData.question_type,
        questionText: rowData.question_text?.substring(0, 50),
        valuesCount: values.length,
        headersCount: questionHeaders.length
      });

      // Skip if this row doesn't have question data
      // Check both question_text and question_type to be more lenient
      if (!rowData.question_text && !rowData.question_type) {
        console.log(`[Quiz Upload] Skipping row ${i + 1} - no question data detected`);
        console.log(`[Quiz Upload] Row data keys:`, Object.keys(rowData));
        console.log(`[Quiz Upload] Row data values:`, Object.values(rowData).slice(0, 5));
        rowsSkipped++;
        continue;
      }
      
      // Also skip if this looks like a header row (all values match headers)
      const isHeaderRow = values.every((val, idx) => {
        const valLower = val.trim().toLowerCase();
        const headerLower = questionHeaders[idx]?.toLowerCase();
        return valLower === headerLower;
      });
      
      if (isHeaderRow && i > questionStartIndex) {
        console.log(`[Quiz Upload] Skipping row ${i + 1} - appears to be a duplicate header row`);
        rowsSkipped++;
        continue;
      }

      const questionTypeRaw = (rowData.question_type || 'multiple_choice').toLowerCase().trim();
      // Validate question type
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
              is_correct: false
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
              opt.text.toLowerCase().trim() === correctAnswerValue.toLowerCase().trim()
            );
            if (matchingOption) {
              matchingOption.is_correct = true;
              correctAnswer = matchingOption.id;
            } else {
              // Use the value as-is
              correctAnswer = correctAnswerValue;
            }
          }
        }

        // For true/false, ensure we have at least 2 options
        if (questionType === 'true_false' && options.length < 2) {
          options = [
            { id: 'opt-1', text: 'True', is_correct: false },
            { id: 'opt-2', text: 'False', is_correct: false }
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
        // For multiple choice, store as string (option ID)
        formattedCorrectAnswer = correctAnswer ? String(correctAnswer) : null;
      } else if (questionType === 'short_answer') {
        // For short answer, store as string
        formattedCorrectAnswer = correctAnswer ? String(correctAnswer) : null;
      } else {
        formattedCorrectAnswer = correctAnswer;
      }

      // Calculate order based on successfully created questions count
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
        updated_at: new Date().toISOString()
      };

      // Validate required fields before insertion
      if (!questionPayload.quiz_id) {
        console.error(`[Quiz Upload] ERROR: quiz_id is required but missing`);
        errors.push({ row: i + 1, message: 'Quiz ID is required' });
        continue;
      }
      
      if (!questionPayload.type) {
        console.error(`[Quiz Upload] ERROR: question type is required but missing`);
        errors.push({ row: i + 1, message: 'Question type is required' });
        continue;
      }
      
      if (!questionPayload.question_text || questionPayload.question_text.trim() === '') {
        console.error(`[Quiz Upload] ERROR: question_text is required but missing or empty`);
        errors.push({ row: i + 1, message: 'Question text is required' });
        continue;
      }

      console.log(`[Quiz Upload] Creating question ${questions.length + 1} (row ${i + 1}):`, {
        type: questionType,
        hasText: !!questionText,
        textPreview: questionText.substring(0, 50),
        hasOptions: options.length > 0,
        optionsCount: options.length,
        hasCorrectAnswer: !!formattedCorrectAnswer,
        correctAnswer: formattedCorrectAnswer
      });

      console.log(`[Quiz Upload] Inserting question with quiz_id:`, questionPayload.quiz_id);

      const { data: question, error: questionError } = await tq
        .from("questions")
        .insert([questionPayload])
        .select()
        .single();

      if (questionError) {
        console.error(`[Quiz Upload] ❌ ERROR creating question at row ${i + 1}:`, questionError);
        console.error(`[Quiz Upload] Error code:`, questionError.code);
        console.error(`[Quiz Upload] Error details:`, questionError.details);
        console.error(`[Quiz Upload] Error hint:`, questionError.hint);
        console.error(`[Quiz Upload] Question payload was:`, JSON.stringify(questionPayload, null, 2));
        errors.push({ row: i + 1, message: questionError.message || 'Unknown error', code: questionError.code });
        rowsWithErrors++;
      } else if (!question) {
        console.error(`[Quiz Upload] ❌ Question creation returned no data at row ${i + 1}`);
        console.error(`[Quiz Upload] This might indicate an RLS policy issue or database constraint violation`);
        console.error(`[Quiz Upload] Question payload was:`, JSON.stringify(questionPayload, null, 2));
        errors.push({ row: i + 1, message: 'Question creation returned no data' });
        rowsWithErrors++;
      } else {
        console.log(`[Quiz Upload] ✓✓✓ Successfully created question ${questions.length + 1} (row ${i + 1}):`, question.id);
        console.log(`[Quiz Upload] Question details:`, {
          id: question.id,
          quiz_id: question.quiz_id,
          type: question.type,
          order: question.order,
          question_text: question.question_text?.substring(0, 50)
        });
        questions.push(question);
      }
    } catch (error) {
      console.error(`[Quiz Upload] ❌ Exception while processing row ${i + 1}:`, error);
      errors.push({ 
        row: i + 1, 
        message: error instanceof Error ? error.message : 'Unknown error parsing question' 
      });
      rowsWithErrors++;
    }
  }
  
  console.log('[Quiz Upload] ===== QUESTION PARSING COMPLETE =====');
  console.log('[Quiz Upload] Summary:', {
    rowsProcessed,
    rowsSkipped,
    rowsWithErrors,
    questionsCreated: questions.length,
    totalErrors: errors.length
  });

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
            attemptsAllowed: quiz.attempts_allowed || 1
          },
          id: `quiz-${quiz.id}`
        };

        const updatedContent = [...currentContent, quizContentItem];
        await tq
          .from("lessons")
          .update({ 
            content: updatedContent,
            updated_at: new Date().toISOString()
          })
          .eq("id", quiz.lesson_id);

        // Add to gradebook if course_id is available
        // Wrap in try-catch to prevent RLS recursion errors from failing the entire upload
        if (lesson.course_id) {
          try {
            const { data: existingGradeItem, error: checkError } = await tq
              .from("course_grade_items")
              .select("id")
              .eq("course_id", lesson.course_id)
              .eq("type", "quiz")
              .eq("assessment_id", quiz.id)
              .single();

            // If check fails due to RLS, skip gradebook insertion
            if (checkError && checkError.code !== 'PGRST116') {
              console.warn('[Quiz Upload] Error checking existing grade item:', checkError.message);
            } else if (!existingGradeItem) {
              // Calculate actual total points from questions (not from quiz.points field)
              const { data: questions, error: questionsError } = await tq
                .from("questions")
                .select("points")
                .eq("quiz_id", quiz.id);
              
              let totalPoints = 0;
              if (!questionsError && questions) {
                totalPoints = questions.reduce((sum: number, q: any) => sum + Number(q.points ?? 0), 0);
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
                  updated_at: new Date().toISOString()
                }]);

              if (insertError) {
                console.warn('[Quiz Upload] Error inserting gradebook item (non-critical):', insertError.message);
                // Don't throw - gradebook insertion is not critical for quiz creation
              } else {
                console.log('[Quiz Upload] Successfully added quiz to gradebook');
              }
            }
          } catch (gradebookError) {
            // Catch any errors (including RLS recursion) and log but don't fail
            console.warn('[Quiz Upload] Gradebook insertion failed (non-critical):', gradebookError);
          }
        }
      }
    } catch (error) {
      console.error('Error adding quiz to lesson content:', error);
    }
  }

  // Verify questions were actually created in the database
  console.log('[Quiz Upload] Verifying questions in database...');
  const { data: verifyQuestions, error: verifyError } = await tq
    .from("questions")
    .select("id, quiz_id, type, question_text, order")
    .eq("quiz_id", quiz.id)
    .order("order", { ascending: true });

  if (verifyError) {
    console.error('[Quiz Upload] Error verifying questions:', verifyError);
  } else {
    console.log('[Quiz Upload] Questions found in database:', verifyQuestions?.length || 0);
    if (verifyQuestions && verifyQuestions.length > 0) {
      console.log('[Quiz Upload] First few questions:', verifyQuestions.slice(0, 3).map(q => ({
        id: q.id,
        type: q.type,
        order: q.order,
        textPreview: q.question_text?.substring(0, 30)
      })));
    }
  }

  console.log('[Quiz Upload] Import complete:', {
    quizId: quiz.id,
    quizTitle: quiz.title,
    questionsCreated: questions.length,
    questionsInDatabase: verifyQuestions?.length || 0,
    totalQuestionRows: lines.length - questionStartIndex,
    errors: errors.length,
    questionStartIndex,
    totalLines: lines.length
  });

  if (questions.length === 0 && errors.length === 0) {
    console.warn('[Quiz Upload] WARNING: No questions were created and no errors were reported!');
    console.warn('[Quiz Upload] This might indicate a parsing issue. Check the logs above.');
  }

  if (questions.length > 0 && verifyQuestions && verifyQuestions.length !== questions.length) {
    console.warn(`[Quiz Upload] WARNING: Created ${questions.length} questions but found ${verifyQuestions.length} in database!`);
    console.warn('[Quiz Upload] This might indicate some questions failed to insert silently.');
  }

  return {
    success: true,
    quiz: quiz, // Return full quiz object so form can be populated
    questionsCreated: questions.length,
    totalRows: lines.length - questionStartIndex,
    errors: errors.length > 0 ? errors : undefined,
    warning: questions.length === 0 ? 'No questions were created. Please check your CSV format.' : undefined
  };
  } catch (error) {
    console.error('[Quiz Upload] Error in parseAndImportQuiz:', error);
    throw error;
  }
}

