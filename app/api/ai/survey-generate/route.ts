import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// Extend timeout for AI generation
export const maxDuration = 30;

interface GeneratedQuestion {
  type: 'likert_scale' | 'rating_scale' | 'multiple_choice' | 'multiple_select' | 'text' | 'essay' | 'matrix' | 'ranking' | 'nps' | 'slider';
  question_text: string;
  description?: string;
  required: boolean;
  options?: any;
  category?: string;
}

interface GenerateSurveyRequest {
  source: 'topic' | 'content' | 'lesson' | 'course' | 'template';
  topic?: string;
  content?: string;
  lessonId?: string;
  courseId?: string;
  templateType?: 'course_evaluation' | 'instructor_feedback' | 'lesson_feedback' | 'nps' | 'end_of_module';
  questionCount?: number;
  questionTypes?: string[];
  focusAreas?: string[];
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Only instructors and above can generate surveys
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return createAuthResponse("Forbidden", 403);
    }

    const body: GenerateSurveyRequest = await request.json();
    const {
      source,
      topic,
      content,
      lessonId,
      courseId,
      templateType,
      questionCount = 8,
      questionTypes = ['likert_scale', 'rating_scale', 'multiple_choice', 'text'],
      focusAreas
    } = body;

    // Validate input
    if (!source) {
      return NextResponse.json({ error: "Source type is required" }, { status: 400 });
    }

    let sourceContent = '';
    let sourceTitle = '';
    let surveyType = 'custom';

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get content based on source
    if (source === 'lesson' && lessonId) {
      const { data: lesson, error } = await tq
        .from('lessons')
        .select('title, description')
        .eq('id', lessonId)
        .single();

      if (error || !lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }

      sourceTitle = lesson.title;
      sourceContent = `Lesson: ${lesson.title}\n${lesson.description || ''}`;
      surveyType = 'lesson_feedback';

    } else if (source === 'course' && courseId) {
      const { data: course, error } = await tq
        .from('courses')
        .select('title, description')
        .eq('id', courseId)
        .single();

      if (error || !course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }

      sourceTitle = course.title;
      sourceContent = `Course: ${course.title}\n${course.description || ''}`;
      surveyType = 'course_evaluation';

    } else if (source === 'template' && templateType) {
      sourceTitle = getTemplateTitle(templateType);
      sourceContent = getTemplateContext(templateType);
      surveyType = templateType;

    } else if (source === 'content' && content) {
      sourceContent = content;
      sourceTitle = 'Custom Survey';

    } else if (source === 'topic' && topic) {
      sourceContent = topic;
      sourceTitle = topic;

    } else {
      return NextResponse.json({ error: "Invalid source configuration" }, { status: 400 });
    }

    // Generate questions using AI
    const questions = await generateSurveyQuestions({
      sourceContent,
      sourceTitle,
      surveyType,
      questionCount,
      questionTypes,
      focusAreas
    });

    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        source,
        sourceTitle,
        surveyType,
        questionCount: questions.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (e: any) {
    console.error('AI survey generation error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getTemplateTitle(templateType: string): string {
  const titles: Record<string, string> = {
    'course_evaluation': 'Course Evaluation Survey',
    'instructor_feedback': 'Instructor Feedback Survey',
    'lesson_feedback': 'Lesson Feedback Survey',
    'nps': 'Net Promoter Score Survey',
    'end_of_module': 'End of Module Survey'
  };
  return titles[templateType] || 'Survey';
}

function getTemplateContext(templateType: string): string {
  const contexts: Record<string, string> = {
    'course_evaluation': 'Evaluate overall course quality including content, structure, pacing, materials, and learning outcomes. Focus on what worked well and areas for improvement.',
    'instructor_feedback': 'Assess instructor effectiveness including teaching methods, communication, engagement, availability, and expertise. Gather constructive feedback for professional development.',
    'lesson_feedback': 'Quick feedback on specific lesson including clarity, usefulness, difficulty level, and suggestions for improvement.',
    'nps': 'Net Promoter Score survey to measure overall satisfaction and likelihood to recommend. Include follow-up questions for promoters and detractors.',
    'end_of_module': 'Comprehensive module review covering content comprehension, skill development, practical application, and readiness for next module.'
  };
  return contexts[templateType] || '';
}

interface GenerateQuestionsParams {
  sourceContent: string;
  sourceTitle: string;
  surveyType: string;
  questionCount: number;
  questionTypes: string[];
  focusAreas?: string[];
}

async function generateSurveyQuestions(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  // Try OpenAI API first if key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateQuestionsWithOpenAI(params);
    } catch (error: any) {
      console.error('OpenAI API error, falling back to mock:', error?.message || error);
    }
  }

  // Fallback to template-based generation
  console.log('Using template-based survey question generation');
  return generateTemplateQuestions(params);
}

async function generateQuestionsWithOpenAI(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  const { OpenAI } = require('openai');

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 25000,
  });

  const { sourceContent, sourceTitle, surveyType, questionCount, questionTypes, focusAreas } = params;

  const systemPrompt = `You are an expert survey designer for educational feedback collection.

CREATE ${questionCount} SURVEY QUESTIONS for: "${sourceTitle}"

QUESTION TYPES TO USE: ${questionTypes.join(', ')}

QUESTION TYPE SPECIFICATIONS:
- likert_scale: Agreement scale with options: {min:1, max:5, labels:["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]}
- rating_scale: Numeric rating with options: {min:1, max:10}
- multiple_choice: Single selection, options as array: [{id:"opt1",text:"Option 1"},...]
- multiple_select: Multiple selections allowed, same format as multiple_choice
- text: Short text response, options: {maxLength:500}
- essay: Long text response, options: {minLength:50, maxLength:2000}
- matrix: Grid questions, options: {rows:[{id,text}], columns:[{id,text}]}
- ranking: Order items by preference, options as array of items to rank
- nps: Net Promoter Score 0-10, options: {min:0, max:10}
- slider: Continuous scale, options: {min:0, max:100, step:1}

${focusAreas && focusAreas.length > 0 ? `FOCUS AREAS: ${focusAreas.join(', ')}` : ''}

RULES:
1. Questions should gather actionable feedback
2. Mix question types for engagement
3. Include both quantitative and qualitative questions
4. Be specific and clear
5. Avoid leading questions

CONTEXT: ${sourceContent}

RETURN ONLY A JSON ARRAY:
[{
  "type": "likert_scale",
  "question_text": "The course content was well-organized",
  "description": "Consider the logical flow of topics",
  "required": true,
  "options": {"min":1,"max":5,"labels":["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]},
  "category": "Content Quality"
}]`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${questionCount} survey questions for a ${surveyType} survey. Return only the JSON array.` }
      ],
      max_tokens: 3000,
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
      type: q.type || 'likert_scale',
      question_text: q.question_text || `Question ${idx + 1}`,
      description: q.description,
      required: q.required !== false,
      options: q.options || null,
      category: q.category || null
    }));

  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw error;
  }
}

function generateTemplateQuestions(params: GenerateQuestionsParams): GeneratedQuestion[] {
  const { surveyType, questionCount, questionTypes } = params;
  const questions: GeneratedQuestion[] = [];

  // Template questions for different survey types
  const templates: Record<string, GeneratedQuestion[]> = {
    'course_evaluation': [
      {
        type: 'likert_scale',
        question_text: 'The course content was well-organized and easy to follow',
        required: true,
        options: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        category: 'Content Quality'
      },
      {
        type: 'likert_scale',
        question_text: 'The course met my learning expectations',
        required: true,
        options: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        category: 'Learning Outcomes'
      },
      {
        type: 'rating_scale',
        question_text: 'How would you rate the overall quality of this course?',
        required: true,
        options: { min: 1, max: 10 },
        category: 'Overall Rating'
      },
      {
        type: 'multiple_choice',
        question_text: 'The pace of the course was:',
        required: true,
        options: [
          { id: 'too_slow', text: 'Too slow' },
          { id: 'just_right', text: 'Just right' },
          { id: 'too_fast', text: 'Too fast' }
        ],
        category: 'Pacing'
      },
      {
        type: 'multiple_select',
        question_text: 'Which aspects of the course were most valuable? (Select all that apply)',
        required: false,
        options: [
          { id: 'videos', text: 'Video lectures' },
          { id: 'readings', text: 'Reading materials' },
          { id: 'exercises', text: 'Practical exercises' },
          { id: 'quizzes', text: 'Quizzes and assessments' },
          { id: 'discussions', text: 'Discussion forums' }
        ],
        category: 'Content Preferences'
      },
      {
        type: 'text',
        question_text: 'What was the most valuable thing you learned in this course?',
        required: false,
        options: { maxLength: 500 },
        category: 'Open Feedback'
      },
      {
        type: 'nps',
        question_text: 'How likely are you to recommend this course to a colleague or friend?',
        required: true,
        options: { min: 0, max: 10 },
        category: 'NPS'
      },
      {
        type: 'essay',
        question_text: 'What suggestions do you have for improving this course?',
        required: false,
        options: { minLength: 20, maxLength: 1000 },
        category: 'Suggestions'
      }
    ],
    'instructor_feedback': [
      {
        type: 'likert_scale',
        question_text: 'The instructor explained concepts clearly',
        required: true,
        options: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        category: 'Teaching Quality'
      },
      {
        type: 'likert_scale',
        question_text: 'The instructor was engaging and maintained my interest',
        required: true,
        options: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        category: 'Engagement'
      },
      {
        type: 'likert_scale',
        question_text: 'The instructor was responsive to questions and feedback',
        required: true,
        options: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        category: 'Communication'
      },
      {
        type: 'rating_scale',
        question_text: 'Overall, how would you rate the instructor?',
        required: true,
        options: { min: 1, max: 10 },
        category: 'Overall Rating'
      },
      {
        type: 'text',
        question_text: 'What did the instructor do particularly well?',
        required: false,
        options: { maxLength: 500 },
        category: 'Strengths'
      },
      {
        type: 'text',
        question_text: 'What could the instructor improve?',
        required: false,
        options: { maxLength: 500 },
        category: 'Areas for Improvement'
      }
    ],
    'lesson_feedback': [
      {
        type: 'likert_scale',
        question_text: 'This lesson was easy to understand',
        required: true,
        options: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        category: 'Clarity'
      },
      {
        type: 'multiple_choice',
        question_text: 'How would you rate the difficulty of this lesson?',
        required: true,
        options: [
          { id: 'too_easy', text: 'Too easy' },
          { id: 'just_right', text: 'Just right' },
          { id: 'challenging', text: 'Appropriately challenging' },
          { id: 'too_difficult', text: 'Too difficult' }
        ],
        category: 'Difficulty'
      },
      {
        type: 'slider',
        question_text: 'How relevant was this lesson to your learning goals?',
        required: true,
        options: { min: 0, max: 100, step: 10 },
        category: 'Relevance'
      },
      {
        type: 'text',
        question_text: 'Any suggestions for improving this lesson?',
        required: false,
        options: { maxLength: 300 },
        category: 'Suggestions'
      }
    ],
    'nps': [
      {
        type: 'nps',
        question_text: 'On a scale of 0-10, how likely are you to recommend this learning platform to others?',
        required: true,
        options: { min: 0, max: 10 },
        category: 'NPS'
      },
      {
        type: 'text',
        question_text: 'What is the primary reason for your score?',
        required: true,
        options: { maxLength: 500 },
        category: 'Reason'
      },
      {
        type: 'multiple_select',
        question_text: 'What do you value most about our platform? (Select up to 3)',
        required: false,
        options: [
          { id: 'content_quality', text: 'Quality of content' },
          { id: 'ease_of_use', text: 'Ease of use' },
          { id: 'variety', text: 'Course variety' },
          { id: 'support', text: 'Customer support' },
          { id: 'value', text: 'Value for money' },
          { id: 'community', text: 'Learning community' }
        ],
        category: 'Value Drivers'
      },
      {
        type: 'essay',
        question_text: 'What would make you more likely to recommend us?',
        required: false,
        options: { minLength: 20, maxLength: 500 },
        category: 'Improvement'
      }
    ],
    'end_of_module': [
      {
        type: 'likert_scale',
        question_text: 'I achieved the learning objectives for this module',
        required: true,
        options: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        category: 'Learning Outcomes'
      },
      {
        type: 'rating_scale',
        question_text: 'Rate your confidence in applying what you learned',
        required: true,
        options: { min: 1, max: 10 },
        category: 'Confidence'
      },
      {
        type: 'ranking',
        question_text: 'Rank the following topics by how well you understood them (1 = best understood)',
        required: false,
        options: [
          { id: 'topic1', text: 'Key Concepts' },
          { id: 'topic2', text: 'Practical Applications' },
          { id: 'topic3', text: 'Theory and Principles' },
          { id: 'topic4', text: 'Best Practices' }
        ],
        category: 'Comprehension'
      },
      {
        type: 'multiple_choice',
        question_text: 'Do you feel ready to move to the next module?',
        required: true,
        options: [
          { id: 'yes', text: 'Yes, I\'m ready' },
          { id: 'mostly', text: 'Mostly, but need some review' },
          { id: 'no', text: 'No, I need more practice' }
        ],
        category: 'Readiness'
      },
      {
        type: 'text',
        question_text: 'What topics would you like to explore further?',
        required: false,
        options: { maxLength: 300 },
        category: 'Future Learning'
      }
    ]
  };

  // Get template questions for the survey type
  const templateQuestions = templates[surveyType] || templates['course_evaluation'];

  // Select questions up to the requested count
  for (let i = 0; i < Math.min(questionCount, templateQuestions.length); i++) {
    const q = templateQuestions[i];
    // Only include if the question type is in the allowed types
    if (questionTypes.includes(q.type) || questionTypes.length === 0) {
      questions.push({ ...q });
    }
  }

  // If we need more questions, cycle through templates
  while (questions.length < questionCount) {
    const idx = questions.length % templateQuestions.length;
    const q = templateQuestions[idx];
    if (questionTypes.includes(q.type) || questionTypes.length === 0) {
      questions.push({
        ...q,
        question_text: q.question_text + ` (${questions.length + 1})`
      });
    } else {
      break; // Avoid infinite loop if no matching types
    }
  }

  return questions.slice(0, questionCount);
}
