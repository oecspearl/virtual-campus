import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

// Extend timeout for AI generation
export const maxDuration = 30;

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  points: number;
  levels: {
    id: string;
    label: string;
    description: string;
    points: number;
  }[];
}

interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string;
  points: number;
  rubric: RubricCriterion[];
  suggestedDueDays: number;
  learningObjectives: string[];
  submissionGuidelines: string;
}

interface GenerateAssignmentRequest {
  source: 'topic' | 'content' | 'lesson';
  topic?: string;
  content?: string;
  lessonId?: string;
  assignmentType?: 'essay' | 'project' | 'research' | 'practical' | 'presentation' | 'case_study';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  pointsTarget?: number;
  rubricCriteriaCount?: number;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only instructors and above can generate assignments
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const body: GenerateAssignmentRequest = await request.json();
    const {
      source,
      topic,
      content,
      lessonId,
      assignmentType = 'essay',
      difficulty = 'intermediate',
      pointsTarget = 100,
      rubricCriteriaCount = 4
    } = body;

    // Validate input
    if (!source) {
      return NextResponse.json({ error: "Source type is required" }, { status: 400 });
    }

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

    // Generate assignment using AI
    const assignment = await generateAssignment({
      sourceContent,
      sourceTitle,
      assignmentType,
      difficulty,
      pointsTarget,
      rubricCriteriaCount
    });

    return NextResponse.json({
      success: true,
      assignment,
      metadata: {
        source,
        sourceTitle,
        assignmentType,
        difficulty,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (e: any) {
    console.error('AI assignment generation error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Extract readable text from lesson content
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

interface GenerateAssignmentParams {
  sourceContent: string;
  sourceTitle: string;
  assignmentType: string;
  difficulty: string;
  pointsTarget: number;
  rubricCriteriaCount: number;
}

async function generateAssignment(params: GenerateAssignmentParams): Promise<GeneratedAssignment> {
  // Try OpenAI API first if key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateAssignmentWithOpenAI(params);
    } catch (error: any) {
      console.error('OpenAI API error, falling back to mock:', error?.message || error);
    }
  }

  // Fallback to mock generation
  console.log('Using mock assignment generation');
  return generateMockAssignment(params);
}

async function generateAssignmentWithOpenAI(params: GenerateAssignmentParams): Promise<GeneratedAssignment> {
  const { OpenAI } = require('openai');

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 25000,
  });

  const { sourceContent, sourceTitle, assignmentType, difficulty, pointsTarget, rubricCriteriaCount } = params;

  const truncatedContent = sourceContent.substring(0, 4000);

  const systemPrompt = `You are an expert educational content creator specializing in creating meaningful, well-structured assignments with detailed rubrics.

Create a comprehensive ${assignmentType} assignment that tests students' understanding and application of the subject matter.

REQUIREMENTS:
- Assignment type: ${assignmentType}
- Difficulty level: ${difficulty}
- Total points: ${pointsTarget}
- Rubric criteria: ${rubricCriteriaCount} criteria

FORMAT: Return ONLY valid JSON with this structure:
{
  "title": "Assignment title",
  "description": "Brief 2-3 sentence description of the assignment",
  "instructions": "Detailed step-by-step instructions (can be multiple paragraphs, use \\n for line breaks)",
  "points": ${pointsTarget},
  "rubric": [
    {
      "id": "criterion-1",
      "name": "Criterion Name",
      "description": "What this criterion evaluates",
      "points": 25,
      "levels": [
        {"id": "l1", "label": "Excellent", "description": "Criteria for excellent", "points": 25},
        {"id": "l2", "label": "Good", "description": "Criteria for good", "points": 20},
        {"id": "l3", "label": "Satisfactory", "description": "Criteria for satisfactory", "points": 15},
        {"id": "l4", "label": "Needs Improvement", "description": "Criteria for improvement", "points": 10}
      ]
    }
  ],
  "suggestedDueDays": 7,
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "submissionGuidelines": "What to submit and in what format"
}

IMPORTANT:
- The sum of max points for all rubric criteria should equal ${pointsTarget}
- Each criterion should have 3-4 grading levels
- Make the assignment practical and applicable to real-world scenarios
- Instructions should be clear enough for students to follow independently`;

  const userPrompt = `Create a ${assignmentType} assignment based on: "${sourceTitle}"

Subject matter content:
${truncatedContent}

Generate a well-structured assignment with a detailed rubric for fair grading.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2500,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '{}';

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI');
    }

    const assignment = JSON.parse(jsonMatch[0]) as GeneratedAssignment;

    // Validate and normalize
    return {
      title: assignment.title || `${sourceTitle} Assignment`,
      description: assignment.description || 'Complete this assignment based on the lesson content.',
      instructions: assignment.instructions || 'Follow the guidelines below to complete this assignment.',
      points: assignment.points || pointsTarget,
      rubric: normalizeRubric(assignment.rubric || [], pointsTarget, rubricCriteriaCount),
      suggestedDueDays: assignment.suggestedDueDays || 7,
      learningObjectives: assignment.learningObjectives || [],
      submissionGuidelines: assignment.submissionGuidelines || 'Submit your work in the required format.'
    };

  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw error;
  }
}

function normalizeRubric(rubric: RubricCriterion[], totalPoints: number, count: number): RubricCriterion[] {
  if (!rubric || rubric.length === 0) {
    return generateDefaultRubric(totalPoints, count);
  }

  // Ensure each criterion has required fields and valid IDs
  return rubric.map((criterion, idx) => ({
    id: criterion.id || `criterion-${idx + 1}`,
    name: criterion.name || `Criterion ${idx + 1}`,
    description: criterion.description || '',
    points: criterion.points || Math.floor(totalPoints / count),
    levels: (criterion.levels || []).map((level, levelIdx) => ({
      id: level.id || `l${levelIdx + 1}`,
      label: level.label || ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'][levelIdx] || 'Level',
      description: level.description || '',
      points: level.points || 0
    }))
  }));
}

function generateDefaultRubric(totalPoints: number, count: number): RubricCriterion[] {
  const pointsPerCriterion = Math.floor(totalPoints / count);
  const criteriaNames = [
    { name: 'Content & Understanding', description: 'Demonstrates thorough understanding of the subject matter' },
    { name: 'Analysis & Critical Thinking', description: 'Shows analytical depth and critical evaluation' },
    { name: 'Organization & Structure', description: 'Presents ideas in a clear, logical manner' },
    { name: 'Writing Quality', description: 'Uses proper grammar, spelling, and academic language' },
    { name: 'Research & Evidence', description: 'Incorporates relevant sources and evidence' },
    { name: 'Creativity & Originality', description: 'Demonstrates original thinking and creative approach' }
  ];

  const rubric: RubricCriterion[] = [];

  for (let i = 0; i < count; i++) {
    const criterionInfo = criteriaNames[i % criteriaNames.length];
    const maxPts = i === count - 1 ? totalPoints - (pointsPerCriterion * (count - 1)) : pointsPerCriterion;

    rubric.push({
      id: `criterion-${i + 1}`,
      name: criterionInfo.name,
      description: criterionInfo.description,
      points: maxPts,
      levels: [
        { id: `l1-${i}`, label: 'Excellent', description: 'Exceeds expectations in all areas', points: maxPts },
        { id: `l2-${i}`, label: 'Good', description: 'Meets expectations with minor gaps', points: Math.floor(maxPts * 0.8) },
        { id: `l3-${i}`, label: 'Satisfactory', description: 'Meets basic expectations', points: Math.floor(maxPts * 0.6) },
        { id: `l4-${i}`, label: 'Needs Improvement', description: 'Does not meet expectations', points: Math.floor(maxPts * 0.4) }
      ]
    });
  }

  return rubric;
}

function generateMockAssignment(params: GenerateAssignmentParams): GeneratedAssignment {
  const { sourceTitle, assignmentType, difficulty, pointsTarget, rubricCriteriaCount } = params;

  const typeDescriptions: Record<string, { prefix: string; instructions: string }> = {
    essay: {
      prefix: 'Write an Essay on',
      instructions: `Write a well-structured essay that demonstrates your understanding of ${sourceTitle}.

Your essay should include:
1. An introduction that presents your thesis or main argument
2. Body paragraphs that support your thesis with evidence and analysis
3. A conclusion that summarizes your key points and their significance

Requirements:
- Length: 1500-2000 words
- Include at least 3 scholarly sources
- Use proper citation format (APA or MLA)
- Submit as a PDF or Word document`
    },
    project: {
      prefix: 'Complete a Project on',
      instructions: `Complete a hands-on project that applies concepts from ${sourceTitle}.

Project Requirements:
1. Design and implement a solution that demonstrates key concepts
2. Document your process with explanations and screenshots
3. Include a reflection on challenges faced and lessons learned

Deliverables:
- Project files (code, designs, or other artifacts)
- Documentation (README or project report)
- Presentation slides (5-10 slides summarizing your work)`
    },
    research: {
      prefix: 'Research Paper on',
      instructions: `Conduct research and write a paper on an aspect of ${sourceTitle}.

Research Paper Requirements:
1. Choose a specific topic within the subject area
2. Gather and analyze information from credible sources
3. Present your findings with proper citations

Format:
- Length: 2000-3000 words
- Include an abstract, introduction, methodology, findings, and conclusion
- Minimum 5 peer-reviewed sources
- APA format`
    },
    practical: {
      prefix: 'Practical Exercise on',
      instructions: `Complete this practical exercise to apply your knowledge of ${sourceTitle}.

Exercise Steps:
1. Review the concepts covered in the lesson
2. Complete each task as described below
3. Document your work with screenshots or explanations

Submit:
- Completed exercise files
- Written responses to reflection questions
- Summary of what you learned`
    },
    presentation: {
      prefix: 'Presentation on',
      instructions: `Create and deliver a presentation on ${sourceTitle}.

Presentation Requirements:
1. Create a slide deck (10-15 slides)
2. Include visual aids and examples
3. Prepare to speak for 10-15 minutes

Content should cover:
- Key concepts and their importance
- Real-world applications
- Your own analysis or insights`
    },
    case_study: {
      prefix: 'Case Study Analysis:',
      instructions: `Analyze a case study related to ${sourceTitle}.

Analysis Requirements:
1. Read and summarize the case
2. Identify key issues and stakeholders
3. Apply relevant concepts and theories
4. Propose solutions or recommendations

Format:
- Length: 1500-2500 words
- Include an executive summary
- Use headings to organize your analysis`
    }
  };

  const typeInfo = typeDescriptions[assignmentType] || typeDescriptions.essay;

  const difficultyMultipliers: Record<string, number> = {
    beginner: 0.8,
    intermediate: 1,
    advanced: 1.2
  };

  const suggestedDays: Record<string, number> = {
    beginner: 5,
    intermediate: 7,
    advanced: 10
  };

  return {
    title: `${typeInfo.prefix} ${sourceTitle}`,
    description: `This ${assignmentType.replace('_', ' ')} assignment will help you demonstrate your understanding and application of concepts from ${sourceTitle}. Complete all requirements and submit by the due date.`,
    instructions: typeInfo.instructions,
    points: pointsTarget,
    rubric: generateDefaultRubric(pointsTarget, rubricCriteriaCount),
    suggestedDueDays: suggestedDays[difficulty] || 7,
    learningObjectives: [
      `Demonstrate understanding of key concepts from ${sourceTitle}`,
      `Apply theoretical knowledge to practical scenarios`,
      `Communicate ideas clearly and effectively`,
      `Analyze and evaluate information critically`
    ],
    submissionGuidelines: `Submit your completed ${assignmentType.replace('_', ' ')} through the learning platform. Ensure all files are properly named and formatted according to the requirements above.`
  };
}
