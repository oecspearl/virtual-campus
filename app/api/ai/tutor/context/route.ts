import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from "@/lib/database-helpers";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { lessonId, courseId } = await request.json();
    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch lesson data with course context
    const { data: lesson, error: lessonError } = await tq
      .from("lessons")
      .select(`
        *,
        course:courses(title, description)
      `)
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Extract key concepts and learning objectives
    const context = await extractLessonContext(lesson);

    // Get student's learning history for this course
    const { data: enrollments } = await tq
      .from("enrollments")
      .select("progress_percentage")
      .eq("student_id", user.id)
      .eq("course_id", courseId || lesson.course_id)
      .single();

    // Get related lessons for context
    const { data: relatedLessons } = await tq
      .from("lessons")
      .select("id, title, description, difficulty")
      .eq("course_id", courseId || lesson.course_id)
      .neq("id", lessonId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      success: true,
      context: {
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          difficulty: lesson.difficulty,
          learning_outcomes: lesson.learning_outcomes,
          content: lesson.content,
          resources: lesson.resources
        },
        course: {
          title: lesson.course?.title,
          description: lesson.course?.description
        },
        concepts: context.concepts,
        learningObjectives: context.learningObjectives,
        studentProgress: enrollments?.progress_percentage || 0,
        relatedLessons: relatedLessons || []
      }
    });

  } catch (e: any) {
    console.error('AI tutor context API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Extract key concepts and learning objectives from lesson content
async function extractLessonContext(lesson: any) {
  const concepts: string[] = [];
  const learningObjectives: string[] = [];

  // Extract from lesson description
  if (lesson.description) {
    const descConcepts = extractConceptsFromText(lesson.description);
    concepts.push(...descConcepts);
  }

  // Extract from learning outcomes
  if (lesson.learning_outcomes && Array.isArray(lesson.learning_outcomes)) {
    learningObjectives.push(...lesson.learning_outcomes);
  }

  // Extract from lesson content
  if (lesson.content && Array.isArray(lesson.content)) {
    lesson.content.forEach((item: any) => {
      if (item.type === 'text' && item.data?.content) {
        const textConcepts = extractConceptsFromText(item.data.content);
        concepts.push(...textConcepts);
      }
    });
  }

  // Extract from lesson instructions
  if (lesson.lesson_instructions) {
    const instructionConcepts = extractConceptsFromText(lesson.lesson_instructions);
    concepts.push(...instructionConcepts);
  }

  // Remove duplicates and return
  return {
    concepts: [...new Set(concepts)],
    learningObjectives: [...new Set(learningObjectives)]
  };
}

// Simple concept extraction from text
function extractConceptsFromText(text: string): string[] {
  const concepts: string[] = [];
  
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  
  // Extract potential concepts (words that might be important)
  const words = cleanText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  // Simple keyword extraction (in a real implementation, you'd use NLP)
  const importantWords = words.filter(word => 
    !['this', 'that', 'with', 'from', 'they', 'will', 'have', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'new', 'because', 'these', 'give', 'day', 'may', 'use', 'her', 'many', 'some', 'time', 'very', 'when', 'much', 'then', 'them', 'can', 'only', 'other', 'new', 'some', 'these', 'time', 'very', 'when', 'much', 'then', 'them', 'can', 'only', 'other', 'new', 'some', 'these', 'time', 'very', 'when', 'much', 'then', 'them', 'can', 'only'].includes(word)
  );

  // Take top 10 most frequent words as concepts
  const wordCount: Record<string, number> = {};
  importantWords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  const sortedWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  return sortedWords;
}
