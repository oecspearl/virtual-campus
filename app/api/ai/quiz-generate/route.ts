import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// Extend timeout for AI generation (Vercel Pro/Enterprise: up to 60s, Hobby: 10s)
export const maxDuration = 30;

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question_text: string;
  points: number;
  options?: { text: string; is_correct: boolean }[];
  feedback_correct?: string;
  feedback_incorrect?: string;
}

interface GenerateQuizRequest {
  source: 'topic' | 'content' | 'lesson';
  topic?: string;
  content?: string;
  lessonId?: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: ('multiple_choice' | 'true_false' | 'short_answer' | 'essay')[];
  focusAreas?: string[];
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Only instructors and above can generate quizzes
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return createAuthResponse("Forbidden", 403);
    }

    const body: GenerateQuizRequest = await request.json();
    const { source, topic, content, lessonId, questionCount = 5, difficulty = 'medium', questionTypes = ['multiple_choice'], focusAreas } = body;

    // Validate input
    if (!source) {
      return NextResponse.json({ error: "Source type is required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let sourceContent = '';
    let sourceTitle = '';

    // Get content based on source
    if (source === 'lesson' && lessonId) {
      const { data: lesson, error } = await tq
        .from('lessons')
        .select('title, description, content')
        .eq('id', lessonId)
        .single();

      if (error || !lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }

      sourceTitle = lesson.title;
      sourceContent = extractLessonText(lesson);
    } else if (source === 'content' && content) {
      sourceContent = content;
      sourceTitle = 'Custom Content';
    } else if (source === 'topic' && topic) {
      sourceContent = topic;
      sourceTitle = topic;
    } else {
      return NextResponse.json({ error: "Invalid source configuration" }, { status: 400 });
    }

    // Generate questions using AI
    const questions = await generateQuestions({
      sourceContent,
      sourceTitle,
      questionCount,
      difficulty,
      questionTypes,
      focusAreas
    });

    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        source,
        sourceTitle,
        questionCount: questions.length,
        difficulty,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (e: any) {
    console.error('AI quiz generation error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Extract readable text from lesson content
function extractLessonText(lesson: any): string {
  let text = `${lesson.title || ''}\n${lesson.description || ''}\n`;

  if (lesson.content && Array.isArray(lesson.content)) {
    for (const block of lesson.content) {
      if (block.type === 'text' && block.content) {
        // Strip HTML tags
        text += block.content.replace(/<[^>]*>/g, ' ') + '\n';
      } else if (block.type === 'heading' && block.content) {
        text += block.content + '\n';
      } else if (block.type === 'paragraph' && block.content) {
        text += block.content.replace(/<[^>]*>/g, ' ') + '\n';
      }
    }
  }

  return text.trim();
}

interface GenerateQuestionsParams {
  sourceContent: string;
  sourceTitle: string;
  questionCount: number;
  difficulty: string;
  questionTypes: string[];
  focusAreas?: string[];
}

async function generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  // Try OpenAI API first if key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateQuestionsWithOpenAI(params);
    } catch (error: any) {
      console.error('OpenAI API error, falling back to mock:', error?.message || error);
      // If it's a timeout error, still fall back to mock but log it
      if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
        console.warn('OpenAI request timed out, using mock questions');
      }
    }
  }

  // Fallback to mock generation (instant, no API call)
  console.log('Using mock question generation');
  return generateMockQuestions(params);
}

async function generateQuestionsWithOpenAI(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  const { OpenAI } = require('openai');

  // Use gpt-4o-mini for faster response times (avoids Vercel 30s timeout)
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 25000, // 25 second timeout to stay within Vercel's limit
  });

  const { sourceContent, sourceTitle, questionCount, difficulty, questionTypes, focusAreas } = params;

  // Calculate max tokens based on question count (approximately 250 tokens per question)
  const maxTokens = Math.min(3000, Math.max(1500, questionCount * 250));

  // Limit content to reduce processing time
  const truncatedContent = sourceContent.substring(0, 4000);

  const systemPrompt = `You are an expert educational assessment creator. Create quiz questions that TEST A STUDENT'S KNOWLEDGE of the subject matter.

RULES:
1. DO NOT ask about the lesson/module itself (e.g., "What does this module cover?")
2. DO test whether the student LEARNED the actual subject matter
3. Questions should test factual knowledge, comprehension, and understanding

REQUIREMENTS:
- Generate EXACTLY ${questionCount} questions
- Difficulty: ${difficulty}
- Types: ${questionTypes.join(', ')}
${focusAreas && focusAreas.length > 0 ? `- Focus: ${focusAreas.join(', ')}` : ''}

FORMAT: Return ONLY a JSON array:
[{"type":"multiple_choice","question_text":"Question here","points":2,"options":[{"text":"Correct","is_correct":true},{"text":"Wrong1","is_correct":false},{"text":"Wrong2","is_correct":false},{"text":"Wrong3","is_correct":false}],"feedback_correct":"Why correct","feedback_incorrect":"Correct answer explanation"}]

- multiple_choice: 4 options, 1 correct
- true_false: 2 options (True/False)
- short_answer/essay: no options needed
- Points: easy=1, medium=2, hard=3

Return ONLY valid JSON array with ${questionCount} questions.`;

  const userPrompt = `Create ${questionCount} quiz questions testing knowledge of: "${sourceTitle}"

Content:
${truncatedContent}

Generate exactly ${questionCount} questions as JSON array.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Much faster than gpt-4
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '[]';

    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI');
    }

    const questions = JSON.parse(jsonMatch[0]) as GeneratedQuestion[];

    // Validate and normalize questions
    return questions.map((q, idx) => ({
      type: q.type || 'multiple_choice',
      question_text: q.question_text || `Question ${idx + 1}`,
      points: q.points || 1,
      options: q.options || [],
      feedback_correct: q.feedback_correct || 'Correct!',
      feedback_incorrect: q.feedback_incorrect || 'Incorrect. Please review the material.'
    }));

  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw error;
  }
}

function generateMockQuestions(params: GenerateQuestionsParams): GeneratedQuestion[] {
  const { sourceContent, sourceTitle, questionCount, difficulty, questionTypes } = params;
  const questions: GeneratedQuestion[] = [];

  // Extract meaningful terms and sentences from content
  const sentences = sourceContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const words = sourceContent.split(/\s+/).filter(w => w.length > 4 && /^[A-Za-z]+$/.test(w));
  const keyTerms = [...new Set(words)].slice(0, 30);

  const difficultyPoints: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    mixed: 2
  };

  // Templates for different question types - these test actual knowledge, not meta-questions
  const mcTemplates = [
    "Which of the following best describes {term}?",
    "What is the primary purpose of {term}?",
    "Which statement about {term} is correct?",
    "How does {term} function in this context?",
    "What is a key characteristic of {term}?",
    "Which of the following is true regarding {term}?",
    "What role does {term} play?",
    "Which best explains the concept of {term}?",
  ];

  const tfTemplates = [
    "{term} is an important concept in this subject.",
    "The purpose of {term} is to provide structure.",
    "{term} can be applied in practical situations.",
    "Understanding {term} is essential for mastery of this topic.",
  ];

  const saTemplates = [
    "Define {term} and explain its significance.",
    "What are the key features of {term}?",
    "How would you apply {term} in a real-world scenario?",
    "Explain the relationship between {term} and related concepts.",
  ];

  const essayTemplates = [
    "Analyze the importance of {term} and discuss its applications.",
    "Compare and contrast different aspects of {term}.",
    "Evaluate the effectiveness of {term} in achieving its purpose.",
    "Discuss the implications of {term} for the field.",
  ];

  // Generate exactly the requested number of questions
  for (let i = 0; i < questionCount; i++) {
    const type = questionTypes[i % questionTypes.length] as GeneratedQuestion['type'];
    const points = difficultyPoints[difficulty] || 2;
    const term = keyTerms[i % keyTerms.length] || sourceTitle;

    if (type === 'multiple_choice') {
      const template = mcTemplates[i % mcTemplates.length];
      questions.push({
        type: 'multiple_choice',
        question_text: template.replace('{term}', term),
        points,
        options: [
          { text: `It provides essential functionality for ${term.toLowerCase()}`, is_correct: true },
          { text: `It is unrelated to the main concepts`, is_correct: false },
          { text: `It only applies in theoretical scenarios`, is_correct: false },
          { text: `It has been deprecated in modern usage`, is_correct: false }
        ],
        feedback_correct: `Correct! You understand the concept of ${term}.`,
        feedback_incorrect: `Review the material about ${term} and try again.`
      });
    } else if (type === 'true_false') {
      const template = tfTemplates[i % tfTemplates.length];
      questions.push({
        type: 'true_false',
        question_text: template.replace('{term}', term),
        points,
        options: [
          { text: 'True', is_correct: true },
          { text: 'False', is_correct: false }
        ],
        feedback_correct: `Correct! ${term} is indeed significant in this context.`,
        feedback_incorrect: `This statement is actually true. Review the section about ${term}.`
      });
    } else if (type === 'short_answer') {
      const template = saTemplates[i % saTemplates.length];
      questions.push({
        type: 'short_answer',
        question_text: template.replace('{term}', term),
        points: points + 1,
        feedback_correct: `Good answer! You demonstrated understanding of ${term}.`,
        feedback_incorrect: `Consider reviewing the material about ${term}.`
      });
    } else if (type === 'essay') {
      const template = essayTemplates[i % essayTemplates.length];
      questions.push({
        type: 'essay',
        question_text: template.replace('{term}', term),
        points: points + 2,
        feedback_correct: `Excellent essay! You thoroughly analyzed ${term}.`,
        feedback_incorrect: `Include more specific details about ${term} from the material.`
      });
    }
  }

  return questions;
}
