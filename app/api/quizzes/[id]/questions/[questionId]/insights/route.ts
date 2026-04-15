import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

// Initialize OpenAI client only if API key is available
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    // Await params first
    const { id: quizId, questionId } = await params;
    
    if (!quizId || !questionId) {
      return NextResponse.json({ 
        error: 'Quiz ID and Question ID are required' 
      }, { status: 400 });
    }

    // Get user with error handling
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Check if OpenAI API key is configured and get client
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({ 
        error: 'AI insights are not available. OpenAI API key is not configured.' 
      }, { status: 503 });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid request body. Expected JSON.' 
      }, { status: 400 });
    }

    const { userAnswer, correctAnswer, questionText, questionType, options, courseContext } = requestBody;

    const supabase = createServiceSupabaseClient();

    // Get quiz and question details for context
    let quizResult, questionResult;
    try {
      [quizResult, questionResult] = await Promise.all([
        supabase.from('quizzes').select('title, description, course_id').eq('id', quizId).single(),
        supabase.from('questions').select('*').eq('id', questionId).single()
      ]);
    } catch (dbError) {
      console.error('[Quiz Insights] Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch quiz or question data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    if (quizResult.error) {
      console.error('[Quiz Insights] Quiz fetch error:', quizResult.error);
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (questionResult.error) {
      console.error('[Quiz Insights] Question fetch error:', questionResult.error);
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const quiz = quizResult.data;
    const question = questionResult.data;

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Get course context if available
    let courseTitle = '';
    let courseDescription = '';
    if (quiz?.course_id) {
      const courseResult = await supabase
        .from('courses')
        .select('title, description')
        .eq('id', quiz.course_id)
        .single();
      if (courseResult.data) {
        courseTitle = courseResult.data.title || '';
        courseDescription = courseResult.data.description || '';
      }
    }

    // Build context-aware prompt for AI
    const systemPrompt = `You are an AI tutor helping a student understand why they got a quiz question wrong. Your goal is to provide clear, educational insights that help the student learn from their mistake.

${courseTitle ? `COURSE CONTEXT: ${courseTitle}${courseDescription ? ` - ${courseDescription}` : ''}` : ''}

${quiz?.title ? `QUIZ: ${quiz.title}${quiz?.description ? ` - ${quiz.description}` : ''}` : ''}

INSTRUCTIONS:
- Explain why the student's answer was incorrect in a supportive, non-judgmental way
- Explain what the correct answer is and why it's correct
- Provide educational context to help the student understand the concept better
- Use examples or analogies when helpful
- Keep the explanation clear and concise (2-3 paragraphs maximum)
- Focus on learning, not just the mistake
- If the question relates to specific course content, reference it appropriately

RESPONSE FORMAT:
- Start with a brief acknowledgment
- Explain why their answer was incorrect
- Explain the correct answer and why it's right
- Provide additional context or examples to deepen understanding
- End with an encouraging note`;

    // Format question details for the prompt
    let questionDetails = `Question: ${questionText || question.question_text}\n`;
    questionDetails += `Question Type: ${questionType || question.type}\n`;
    
    if (question.options && Array.isArray(question.options)) {
      questionDetails += `Options:\n`;
      question.options.forEach((opt: any, idx: number) => {
        questionDetails += `  ${idx + 1}. ${opt.text}${opt.is_correct ? ' (Correct)' : ''}\n`;
      });
    }
    
    questionDetails += `\nStudent's Answer: ${userAnswer}\n`;
    questionDetails += `Correct Answer: ${correctAnswer}\n`;

    if (question.feedback_incorrect) {
      questionDetails += `\nQuestion Feedback: ${question.feedback_incorrect}`;
    }

    const userPrompt = `The student got this question wrong. Please provide educational insights to help them understand their mistake and learn the correct concept.

${questionDetails}`;

    // Call OpenAI API with error handling
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
    } catch (openaiError) {
      console.error('[Quiz Insights] OpenAI API error:', openaiError);
      return NextResponse.json({ 
        error: 'Failed to generate insights from AI service.',
        details: openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error'
      }, { status: 500 });
    }

    const insights = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate insights at this time. Please try again.';

    // Track usage
    const tokensUsed = completion.usage?.total_tokens || 0;
    try {
      await supabase
        .from('ai_usage')
        .insert({
          user_id: user.id,
          feature: 'quiz_insights',
          tokens_used: tokensUsed,
          estimated_cost: (tokensUsed / 1000) * 0.03, // Rough estimate for GPT-4
          metadata: {
            quiz_id: quizId,
            question_id: questionId,
            course_id: quiz?.course_id
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking AI usage:', error);
      // Don't fail if usage tracking fails
    }

    return NextResponse.json({
      success: true,
      insights: insights,
      tokensUsed: tokensUsed
    });

  } catch (error) {
    console.error('[Quiz Insights] Unexpected error:', error);
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Quiz Insights] Error details:', {
      message: errorMessage,
      stack: errorStack,
      error
    });
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({ 
        error: 'AI insights are not available. OpenAI API key is not configured.' 
      }, { status: 503 });
    }

    return NextResponse.json({ 
      error: 'Failed to generate insights. Please try again later.',
      details: errorMessage
    }, { status: 500 });
  }
}

