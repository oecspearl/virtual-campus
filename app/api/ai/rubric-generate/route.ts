import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

// Extend timeout for AI generation
export const maxDuration = 30;

interface RubricCriterion {
  id: string;
  criteria: string;
  levels: { name: string; description: string; points: number }[];
}

interface GenerateRubricRequest {
  source: 'topic' | 'discussion' | 'course';
  topic?: string;
  discussionId?: string;
  courseId?: string;
  criteriaCount?: number;
  rubricType?: 'discussion' | 'assignment' | 'project' | 'presentation';
  focusAreas?: string[];
  maxPoints?: number;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only instructors and above can generate rubrics
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: GenerateRubricRequest = await request.json();
    const {
      source,
      topic,
      discussionId,
      courseId,
      criteriaCount = 4,
      rubricType = 'discussion',
      focusAreas,
      maxPoints = 100
    } = body;

    // Validate input
    if (!source) {
      return NextResponse.json({ error: "Source type is required" }, { status: 400 });
    }

    let sourceContent = '';
    let sourceTitle = '';

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get content based on source
    if (source === 'discussion' && discussionId) {
      const { data: discussion, error } = await tq
        .from('course_discussions')
        .select('title, content, grading_criteria')
        .eq('id', discussionId)
        .single();

      if (error || !discussion) {
        return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
      }

      sourceTitle = discussion.title;
      sourceContent = `${discussion.title}\n${stripHtml(discussion.content)}\n${discussion.grading_criteria || ''}`;
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
      sourceContent = `${course.title}\n${course.description || ''}`;
    } else if (source === 'topic' && topic) {
      sourceContent = topic;
      sourceTitle = topic;
    } else {
      return NextResponse.json({ error: "Invalid source configuration" }, { status: 400 });
    }

    // Generate rubric using AI
    const rubric = await generateRubric({
      sourceContent,
      sourceTitle,
      criteriaCount,
      rubricType,
      focusAreas,
      maxPoints
    });

    return NextResponse.json({
      success: true,
      rubric,
      metadata: {
        source,
        sourceTitle,
        criteriaCount: rubric.length,
        rubricType,
        maxPoints,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (e: any) {
    console.error('AI rubric generation error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

interface GenerateRubricParams {
  sourceContent: string;
  sourceTitle: string;
  criteriaCount: number;
  rubricType: string;
  focusAreas?: string[];
  maxPoints: number;
}

async function generateRubric(params: GenerateRubricParams): Promise<RubricCriterion[]> {
  // Try OpenAI API first if key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateRubricWithOpenAI(params);
    } catch (error: any) {
      console.error('OpenAI API error, falling back to template:', error?.message || error);
    }
  }

  // Fallback to template-based generation
  console.log('Using template rubric generation');
  return generateTemplateRubric(params);
}

async function generateRubricWithOpenAI(params: GenerateRubricParams): Promise<RubricCriterion[]> {
  const { OpenAI } = require('openai');

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 25000,
  });

  const { sourceContent, sourceTitle, criteriaCount, rubricType, focusAreas, maxPoints } = params;
  const pointsPerCriterion = Math.round(maxPoints / criteriaCount);

  const truncatedContent = sourceContent.substring(0, 3000);

  const systemPrompt = `You are an expert educational assessment designer specializing in creating detailed rubrics.

Create a grading rubric with EXACTLY ${criteriaCount} criteria for a ${rubricType}.
Each criterion should have 4 performance levels: Excellent, Good, Satisfactory, Needs Improvement.

REQUIREMENTS:
- Total max points across all criteria should equal approximately ${maxPoints} points
- Each criterion gets approximately ${pointsPerCriterion} max points
- Levels should be: Excellent (${pointsPerCriterion}pts), Good (${Math.round(pointsPerCriterion * 0.8)}pts), Satisfactory (${Math.round(pointsPerCriterion * 0.6)}pts), Needs Improvement (${Math.round(pointsPerCriterion * 0.4)}pts)
${focusAreas && focusAreas.length > 0 ? `- Focus areas: ${focusAreas.join(', ')}` : ''}

FORMAT: Return ONLY a JSON array:
[{
  "id": "unique-id",
  "criteria": "Criterion Name",
  "levels": [
    {"name": "Excellent", "description": "Detailed description of excellent performance", "points": ${pointsPerCriterion}},
    {"name": "Good", "description": "Detailed description of good performance", "points": ${Math.round(pointsPerCriterion * 0.8)}},
    {"name": "Satisfactory", "description": "Detailed description of satisfactory performance", "points": ${Math.round(pointsPerCriterion * 0.6)}},
    {"name": "Needs Improvement", "description": "Detailed description of needs improvement", "points": ${Math.round(pointsPerCriterion * 0.4)}}
  ]
}]

Return ONLY valid JSON array with ${criteriaCount} criteria.`;

  const userPrompt = `Create a ${rubricType} rubric for: "${sourceTitle}"

Context:
${truncatedContent}

Generate exactly ${criteriaCount} criteria as JSON array.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '[]';

    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI');
    }

    const rubric = JSON.parse(jsonMatch[0]) as RubricCriterion[];

    // Validate and normalize rubric
    return rubric.map((c, idx) => ({
      id: c.id || crypto.randomUUID(),
      criteria: c.criteria || `Criterion ${idx + 1}`,
      levels: c.levels?.map(l => ({
        name: l.name || 'Level',
        description: l.description || '',
        points: l.points || 0
      })) || []
    }));

  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw error;
  }
}

function generateTemplateRubric(params: GenerateRubricParams): RubricCriterion[] {
  const { criteriaCount, rubricType, maxPoints } = params;
  const pointsPerCriterion = Math.round(maxPoints / criteriaCount);

  // Default criteria templates based on rubric type
  const discussionCriteria = [
    { name: 'Content Quality', description: 'Depth and relevance of contribution' },
    { name: 'Critical Thinking', description: 'Analysis and evaluation of ideas' },
    { name: 'Engagement', description: 'Responses to peers and participation' },
    { name: 'Communication', description: 'Clarity and organization of writing' },
    { name: 'Use of Evidence', description: 'Support for claims with examples or sources' },
    { name: 'Timeliness', description: 'Meeting deadlines and ongoing participation' },
  ];

  const assignmentCriteria = [
    { name: 'Understanding', description: 'Demonstration of concept comprehension' },
    { name: 'Application', description: 'Ability to apply concepts correctly' },
    { name: 'Analysis', description: 'Depth of analytical thinking' },
    { name: 'Presentation', description: 'Organization and formatting' },
    { name: 'Accuracy', description: 'Correctness of work' },
    { name: 'Completeness', description: 'Addressing all requirements' },
  ];

  const projectCriteria = [
    { name: 'Research & Planning', description: 'Quality of research and project planning' },
    { name: 'Execution', description: 'Quality of implementation' },
    { name: 'Creativity', description: 'Innovation and originality' },
    { name: 'Documentation', description: 'Quality of written documentation' },
    { name: 'Presentation', description: 'Effectiveness of final presentation' },
    { name: 'Teamwork', description: 'Collaboration and contribution' },
  ];

  const presentationCriteria = [
    { name: 'Content Knowledge', description: 'Understanding and accuracy of content' },
    { name: 'Organization', description: 'Logical flow and structure' },
    { name: 'Delivery', description: 'Speaking skills and engagement' },
    { name: 'Visual Aids', description: 'Quality of slides/materials' },
    { name: 'Time Management', description: 'Appropriate length and pacing' },
    { name: 'Q&A Handling', description: 'Response to questions' },
  ];

  const templates: Record<string, { name: string; description: string }[]> = {
    discussion: discussionCriteria,
    assignment: assignmentCriteria,
    project: projectCriteria,
    presentation: presentationCriteria,
  };

  const selectedTemplates = templates[rubricType] || discussionCriteria;
  const rubric: RubricCriterion[] = [];

  for (let i = 0; i < criteriaCount; i++) {
    const template = selectedTemplates[i % selectedTemplates.length];

    rubric.push({
      id: crypto.randomUUID(),
      criteria: template.name,
      levels: [
        {
          name: 'Excellent',
          description: `Exceptional ${template.description.toLowerCase()}. Exceeds expectations in all aspects.`,
          points: pointsPerCriterion
        },
        {
          name: 'Good',
          description: `Strong ${template.description.toLowerCase()}. Meets expectations with minor areas for improvement.`,
          points: Math.round(pointsPerCriterion * 0.8)
        },
        {
          name: 'Satisfactory',
          description: `Adequate ${template.description.toLowerCase()}. Meets basic requirements but needs development.`,
          points: Math.round(pointsPerCriterion * 0.6)
        },
        {
          name: 'Needs Improvement',
          description: `Limited ${template.description.toLowerCase()}. Does not meet minimum expectations.`,
          points: Math.round(pointsPerCriterion * 0.4)
        }
      ]
    });
  }

  return rubric;
}
