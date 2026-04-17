import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

export const maxDuration = 60;

interface GenerateSCORMRequest {
  source: 'topic' | 'content' | 'lesson';
  topic?: string;
  content?: string;
  lessonId?: string;
  slideCount?: number;
  includeQuiz?: boolean;
  quizQuestionCount?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    if (!hasRole(user.role, ['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin'])) {
      return createAuthResponse('Forbidden', 403);
    }

    const body: GenerateSCORMRequest = await request.json();
    const {
      source,
      topic,
      content,
      lessonId,
      slideCount = 5,
      includeQuiz = true,
      quizQuestionCount = 3,
      difficulty = 'intermediate',
    } = body;

    if (!source) {
      return NextResponse.json({ error: 'Source type is required' }, { status: 400 });
    }

    // ─── Resolve source content ────────────────────────────────────────────
    let sourceContent = '';
    let sourceTitle = '';

    if (source === 'lesson' && lessonId) {
      const tenantId = getTenantIdFromRequest(request);
      const tq = createTenantQuery(tenantId);
      const { data: lesson, error } = await tq
        .from('lessons')
        .select('title, description, content')
        .eq('id', lessonId)
        .single();

      if (error || !lesson) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }

      sourceTitle = lesson.title || 'Lesson';
      sourceContent = extractLessonText(lesson);
    } else if (source === 'content' && content) {
      sourceContent = content;
      sourceTitle = 'Custom Content';
    } else if (source === 'topic' && topic) {
      sourceContent = topic;
      sourceTitle = topic;
    } else {
      return NextResponse.json({ error: 'Invalid source configuration' }, { status: 400 });
    }

    // ─── Generate with AI ──────────────────────────────────────────────────
    const result = await generateSCORMContent({
      sourceContent,
      sourceTitle,
      slideCount: Math.min(Math.max(slideCount, 2), 15),
      includeQuiz,
      quizQuestionCount: Math.min(Math.max(quizQuestionCount, 1), 10),
      difficulty,
    });

    return NextResponse.json({ success: true, builderData: result });
  } catch (e: any) {
    console.error('AI SCORM generation error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractLessonText(lesson: any): string {
  let text = `${lesson.title || ''}\n${lesson.description || ''}\n`;
  if (lesson.content && Array.isArray(lesson.content)) {
    for (const block of lesson.content) {
      if (block.type === 'text' && block.content) {
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

interface GenerateParams {
  sourceContent: string;
  sourceTitle: string;
  slideCount: number;
  includeQuiz: boolean;
  quizQuestionCount: number;
  difficulty: string;
}

async function generateSCORMContent(params: GenerateParams) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(params);
    } catch (error: any) {
      console.error('OpenAI error, falling back to structured generation:', error?.message);
    }
  }
  return generateFallback(params);
}

async function generateWithOpenAI(params: GenerateParams) {
  const { OpenAI } = require('openai');
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 55000,
  });

  const { sourceContent, sourceTitle, slideCount, includeQuiz, quizQuestionCount, difficulty } = params;
  const truncated = sourceContent.substring(0, 6000);

  const systemPrompt = `You are an expert instructional designer. Convert the provided content into a structured SCORM learning module with slides and optional quiz questions.

RULES:
1. Each slide should cover ONE key concept clearly
2. Use proper HTML in slide content: <h2> for headings, <p> for paragraphs, <ul>/<ol> for lists, <strong> for emphasis
3. Make content engaging — use real examples, analogies, and clear explanations
4. Quiz questions should test actual understanding, not recall of slide numbers
5. Difficulty level: ${difficulty}
6. Adapt the depth of content to the difficulty level

OUTPUT FORMAT: Return ONLY a valid JSON object with this exact structure:
{
  "title": "Module title",
  "description": "Brief module description",
  "slides": [
    {
      "id": "s-1",
      "title": "Slide title",
      "html": "<h2>Heading</h2><p>Content with <strong>emphasis</strong>...</p><ul><li>Point 1</li></ul>"
    }
  ],
  "quizQuestions": [
    {
      "id": "q-1",
      "type": "mcq",
      "prompt": "Question text",
      "options": [
        {"id": "o-1", "text": "Correct answer", "correct": true},
        {"id": "o-2", "text": "Wrong answer", "correct": false},
        {"id": "o-3", "text": "Wrong answer", "correct": false},
        {"id": "o-4", "text": "Wrong answer", "correct": false}
      ],
      "feedback": "Explanation of correct answer",
      "points": 10
    }
  ],
  "settings": {
    "passingScore": 70,
    "freeNavigation": true,
    "showProgress": true,
    "accentColor": "#1C8B63"
  }
}

REQUIREMENTS:
- Generate EXACTLY ${slideCount} slides
- First slide should be an introduction/overview
- Last content slide should be a summary
${includeQuiz ? `- Generate EXACTLY ${quizQuestionCount} quiz questions after the slides` : '- Do NOT include quiz questions (empty array)'}
- Quiz question types: "mcq" (multiple choice with 4 options), "true_false" (answer is "true" or "false"), or "fill_blank" (answer is a short text)
- For true_false type: omit "options", include "answer" field with "true" or "false"
- For fill_blank type: omit "options", include "answer" field with correct text
- Each MCQ must have exactly 1 correct option
- Return ONLY the JSON object, no markdown wrapping`;

  const userPrompt = `Create a ${slideCount}-slide SCORM learning module about: "${sourceTitle}"

Source content:
${truncated}

Generate the complete module as JSON.`;

  const maxTokens = Math.min(4000, (slideCount * 350) + (quizQuestionCount * 200) + 200);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content || '{}';

  // Extract JSON object from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid JSON response from OpenAI');

  const parsed = JSON.parse(jsonMatch[0]);

  // Normalize and validate
  return {
    title: parsed.title || sourceTitle,
    description: parsed.description || '',
    slides: (parsed.slides || []).map((s: any, i: number) => ({
      id: s.id || `s-${Date.now()}-${i}`,
      title: s.title || `Slide ${i + 1}`,
      html: s.html || '<p></p>',
    })),
    quizQuestions: (parsed.quizQuestions || []).map((q: any, i: number) => ({
      id: q.id || `q-${Date.now()}-${i}`,
      type: q.type || 'mcq',
      prompt: q.prompt || q.question_text || `Question ${i + 1}`,
      options: q.options || undefined,
      answer: q.answer || undefined,
      feedback: q.feedback || '',
      points: q.points || 10,
    })),
    settings: {
      passingScore: parsed.settings?.passingScore || 70,
      freeNavigation: parsed.settings?.freeNavigation ?? true,
      showProgress: parsed.settings?.showProgress ?? true,
      accentColor: parsed.settings?.accentColor || '#1C8B63',
    },
  };
}

// ─── Fallback: structured content without AI ────────────────────────────────

function generateFallback(params: GenerateParams) {
  const { sourceContent, sourceTitle, slideCount, includeQuiz, quizQuestionCount } = params;

  // Split content into chunks for slides
  const sentences = sourceContent.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const paragraphs: string[] = [];
  const chunkSize = Math.max(1, Math.ceil(sentences.length / (slideCount - 2))); // -2 for intro+summary

  for (let i = 0; i < sentences.length; i += chunkSize) {
    paragraphs.push(sentences.slice(i, i + chunkSize).join('. ').trim() + '.');
  }

  // Extract key terms for quiz
  const words = sourceContent.split(/\s+/).filter((w) => w.length > 4 && /^[A-Za-z]/.test(w));
  const keyTerms = [...new Set(words)].slice(0, 20);

  // Build slides
  const slides = [];

  // Intro slide
  slides.push({
    id: `s-${Date.now()}-0`,
    title: 'Introduction',
    html: `<h2>${escHtml(sourceTitle)}</h2><p>In this module, you will learn about the key concepts and principles related to <strong>${escHtml(sourceTitle)}</strong>.</p><p>Navigate through the slides to explore the content, then complete the assessment to test your understanding.</p>`,
  });

  // Content slides
  for (let i = 0; i < slideCount - 2 && i < paragraphs.length; i++) {
    slides.push({
      id: `s-${Date.now()}-${i + 1}`,
      title: `Key Concepts ${i + 1}`,
      html: `<h2>Key Concepts ${i + 1}</h2><p>${escHtml(paragraphs[i])}</p>`,
    });
  }

  // Pad if needed
  while (slides.length < slideCount - 1) {
    slides.push({
      id: `s-${Date.now()}-${slides.length}`,
      title: `Section ${slides.length}`,
      html: `<h2>Section ${slides.length}</h2><p>Additional content related to <strong>${escHtml(sourceTitle)}</strong>.</p>`,
    });
  }

  // Summary slide
  slides.push({
    id: `s-${Date.now()}-${slides.length}`,
    title: 'Summary',
    html: `<h2>Summary</h2><p>In this module, you explored the fundamentals of <strong>${escHtml(sourceTitle)}</strong>.</p><ul>${keyTerms
      .slice(0, 5)
      .map((t) => `<li>${escHtml(t)}</li>`)
      .join('')}</ul><p>Complete the assessment to verify your understanding.</p>`,
  });

  // Quiz questions
  const quizQuestions = [];
  if (includeQuiz) {
    for (let i = 0; i < quizQuestionCount && i < keyTerms.length; i++) {
      const term = keyTerms[i];
      quizQuestions.push({
        id: `q-${Date.now()}-${i}`,
        type: 'mcq' as const,
        prompt: `Which of the following best describes the role of "${term}" in ${sourceTitle}?`,
        options: [
          { id: `o-${Date.now()}-${i}-0`, text: `It is a key component of ${sourceTitle}`, correct: true },
          { id: `o-${Date.now()}-${i}-1`, text: 'It is unrelated to the subject matter', correct: false },
          { id: `o-${Date.now()}-${i}-2`, text: 'It only applies in theoretical contexts', correct: false },
          { id: `o-${Date.now()}-${i}-3`, text: 'It has been replaced by newer approaches', correct: false },
        ],
        feedback: `"${term}" is an important concept within ${sourceTitle}.`,
        points: 10,
      });
    }
  }

  return {
    title: sourceTitle,
    description: `Learning module about ${sourceTitle}`,
    slides,
    quizQuestions,
    settings: {
      passingScore: 70,
      freeNavigation: true,
      showProgress: true,
      accentColor: '#1C8B63',
    },
  };
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
