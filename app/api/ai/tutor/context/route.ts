import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { parseTranscript, condenseTranscript, transcriptToPlainText } from "@/lib/ai/transcript-utils";
import { validateCourseShare } from "@/lib/share-validation";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const { lessonId, courseId, shareId } = await request.json();
    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // When shareId is present, the lesson + related content live in the
    // SOURCE tenant, not the caller's tenant. We validate the share, then
    // use tq.raw (unscoped) for those reads. Progress history still lives
    // in the caller's tenant (cross_tenant_enrollments + _lesson_progress).
    let crossTenant = false;
    let sharedCourseId: string | null = null;
    if (shareId) {
      const shareValidation = await validateCourseShare(shareId, tenantId);
      if (!shareValidation.valid) {
        return NextResponse.json({ error: shareValidation.error }, { status: 404 });
      }
      crossTenant = true;
      sharedCourseId = shareValidation.share!.course_id;
    }

    // Use raw client for source-tenant reads when cross-tenant; otherwise
    // use tenant-scoped reads for the caller's own courses. Cast to any so
    // the two client types (TenantFilteredQuery vs raw Supabase) unify at
    // this call-site — we only hit shared surface (.from().select()).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lessonClient: any = crossTenant ? tq.raw : tq;

    // ── Parallel data fetches ────────────────────────────────────────────

    const [lessonResult, scormResult, captionsResult, resourceLinksResult, libraryResult] =
      await Promise.allSettled([
        // 1. Lesson with course context
        lessonClient.from("lessons")
          .select(`*, course:courses(title, description, subject_area)`)
          .eq("id", lessonId)
          .single(),

        // 2. SCORM package (if this is a SCORM lesson)
        lessonClient.from("scorm_packages")
          .select("title, description, scorm_version, manifest_xml")
          .eq("lesson_id", lessonId)
          .single(),

        // 3. Video captions / transcripts
        lessonClient.from("video_captions")
          .select("language, label, caption_content, caption_url, caption_format")
          .eq("lesson_id", lessonId)
          .eq("is_default", true)
          .limit(1),

        // 4. Resource links attached to this lesson
        lessonClient.from("resource_links")
          .select("title, description, link_type, url")
          .eq("lesson_id", lessonId)
          .order("order", { ascending: true })
          .limit(10),

        // 5. Library resources attached to this lesson
        lessonClient.from("course_library_resources")
          .select("resource:library_resources(title, description, resource_type, file_name)")
          .eq("lesson_id", lessonId)
          .limit(10),
      ]);

    // ── Extract lesson data ──────────────────────────────────────────────
    const lessonData = lessonResult.status === 'fulfilled' ? lessonResult.value : null;
    if (!lessonData?.data) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    const lesson = lessonData.data;
    const resolvedCourseId = sharedCourseId || courseId || lesson.course_id;

    // ── Fetch student progress & related lessons (depend on resolvedCourseId) ──
    // Progress: for shared courses, progress lives in the caller's tenant as
    // cross_tenant_enrollments; otherwise it's the local enrollments table.
    const enrollmentPromise = crossTenant
      ? tq.from("cross_tenant_enrollments")
          .select("progress_percentage")
          .eq("student_id", user.id)
          .eq("source_course_id", resolvedCourseId)
          .single()
      : tq.from("enrollments")
          .select("progress_percentage")
          .eq("student_id", user.id)
          .eq("course_id", resolvedCourseId)
          .single();

    const [enrollmentResult, relatedResult, historyResult] = await Promise.allSettled([
      enrollmentPromise,

      // Related lessons in the same course — in source tenant for shared courses
      lessonClient.from("lessons")
        .select("id, title, description, difficulty")
        .eq("course_id", resolvedCourseId)
        .neq("id", lessonId)
        .order("created_at", { ascending: true })
        .limit(20),

      // Recent AI tutor conversation history for this student + lesson
      tq.from("ai_tutor_conversations")
        .select("user_message, ai_response, created_at")
        .eq("student_id", user.id)
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // ── Extract all content from lesson blocks ───────────────────────────
    const contentContext = extractAllContentBlocks(lesson.content);

    // ── Extract video transcript ─────────────────────────────────────────
    let videoTranscript = '';
    let videoTranscriptCondensed = '';
    if (captionsResult.status === 'fulfilled' && captionsResult.value.data?.length) {
      const caption = captionsResult.value.data[0];
      if (caption.caption_content) {
        const entries = parseTranscript(caption.caption_content);
        if (entries.length > 0) {
          videoTranscript = transcriptToPlainText(entries);
          videoTranscriptCondensed = condenseTranscript(entries);
        }
      }
    }

    // ── Extract SCORM metadata ───────────────────────────────────────────
    let scormContext: { title?: string; description?: string; objectives: string[] } | null = null;
    if (scormResult.status === 'fulfilled' && scormResult.value.data) {
      const scorm = scormResult.value.data;
      scormContext = {
        title: scorm.title,
        description: scorm.description || undefined,
        objectives: extractSCORMObjectives(scorm.manifest_xml),
      };
    }

    // ── Extract resources ────────────────────────────────────────────────
    const resources: { title: string; description?: string; type: string }[] = [];

    if (resourceLinksResult.status === 'fulfilled' && resourceLinksResult.value.data) {
      for (const r of resourceLinksResult.value.data) {
        resources.push({ title: r.title, description: r.description || undefined, type: r.link_type || 'external' });
      }
    }

    if (libraryResult.status === 'fulfilled' && libraryResult.value.data) {
      for (const item of libraryResult.value.data) {
        const r = (item as any).resource;
        if (r) {
          resources.push({
            title: r.title,
            description: r.description || undefined,
            type: r.resource_type || 'document',
          });
        }
      }
    }

    // ── Extract concepts from ALL available text ─────────────────────────
    const allText = [
      lesson.description || '',
      lesson.lesson_instructions || '',
      contentContext.textContent,
      videoTranscript,
      scormContext?.description || '',
      ...resources.map(r => `${r.title} ${r.description || ''}`),
    ].join(' ');

    const concepts = extractConceptsFromText(allText);

    // ── Build learning objectives ────────────────────────────────────────
    const learningObjectives: string[] = [];
    if (lesson.learning_outcomes && Array.isArray(lesson.learning_outcomes)) {
      learningObjectives.push(...lesson.learning_outcomes);
    }
    if (scormContext?.objectives?.length) {
      for (const obj of scormContext.objectives) {
        if (!learningObjectives.includes(obj)) {
          learningObjectives.push(obj);
        }
      }
    }

    // ── Build conversation history ───────────────────────────────────────
    let conversationHistory: { role: string; content: string }[] = [];
    if (historyResult.status === 'fulfilled' && historyResult.value.data) {
      // Reverse to chronological order (query was DESC)
      conversationHistory = historyResult.value.data
        .reverse()
        .flatMap((c: any) => [
          { role: 'user', content: c.user_message },
          { role: 'assistant', content: c.ai_response },
        ]);
    }

    // ── Return enriched context ──────────────────────────────────────────
    return NextResponse.json({
      success: true,
      context: {
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          difficulty: lesson.difficulty,
          content_type: lesson.content_type,
          learning_outcomes: lesson.learning_outcomes,
          content: lesson.content,
          resources: lesson.resources,
        },
        course: {
          title: lesson.course?.title,
          description: lesson.course?.description,
          subject_area: lesson.course?.subject_area,
        },
        // Enriched content from all sources
        videoTranscript: videoTranscriptCondensed || undefined,
        scormContext: scormContext || undefined,
        attachedResources: resources.length > 0 ? resources : undefined,
        contentSummary: contentContext.summary,
        // Extracted concepts from ALL content (not just text blocks)
        concepts,
        learningObjectives,
        studentProgress: enrollmentResult.status === 'fulfilled'
          ? enrollmentResult.value.data?.progress_percentage || 0
          : 0,
        relatedLessons: relatedResult.status === 'fulfilled'
          ? relatedResult.value.data || []
          : [],
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      }
    });

  } catch (e: any) {
    console.error('AI tutor context API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Content block extraction ──────────────────────────────────────────────────

interface ContentBlockSummary {
  /** Concatenated plain text from all readable blocks */
  textContent: string;
  /** Short summary of what content types are present */
  summary: string;
}

/**
 * Extract readable text and metadata from ALL content block types,
 * not just 'text' blocks.
 */
function extractAllContentBlocks(content: any): ContentBlockSummary {
  if (!content || !Array.isArray(content)) {
    return { textContent: '', summary: 'No content blocks' };
  }

  const texts: string[] = [];
  const typeCounts: Record<string, number> = {};

  for (const block of content) {
    const type = block.type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    switch (type) {
      case 'text':
        if (block.data?.content) {
          texts.push(stripHtml(block.data.content));
        }
        break;

      case 'video':
        if (block.title) texts.push(`Video: ${block.title}`);
        if (block.data?.description) texts.push(block.data.description);
        break;

      case 'image':
        if (block.title) texts.push(`Image: ${block.title}`);
        if (block.data?.caption) texts.push(block.data.caption);
        if (block.data?.alt) texts.push(block.data.alt);
        break;

      case 'slideshow':
        if (block.title) texts.push(`Slideshow: ${block.title}`);
        if (block.data?.slides && Array.isArray(block.data.slides)) {
          for (const slide of block.data.slides) {
            if (slide.title) texts.push(slide.title);
            if (slide.content) texts.push(stripHtml(slide.content));
            if (slide.description) texts.push(slide.description);
          }
        }
        break;

      case 'file':
      case 'pdf':
        if (block.title) texts.push(`Document: ${block.title}`);
        if (block.data?.description) texts.push(block.data.description);
        if (block.data?.filename) texts.push(`File: ${block.data.filename}`);
        break;

      case 'embed':
        if (block.title) texts.push(`Embedded content: ${block.title}`);
        if (block.data?.description) texts.push(block.data.description);
        break;

      case 'audio':
        if (block.title) texts.push(`Audio: ${block.title}`);
        if (block.data?.description) texts.push(block.data.description);
        break;

      case 'interactive_video':
        if (block.title) texts.push(`Interactive video: ${block.title}`);
        if (block.data?.description) texts.push(block.data.description);
        break;

      case 'code_sandbox':
        if (block.title) texts.push(`Code sandbox: ${block.title}`);
        if (block.data?.language) texts.push(`Language: ${block.data.language}`);
        if (block.data?.instructions) texts.push(block.data.instructions);
        break;

      case 'label':
        if (block.data?.content) texts.push(stripHtml(block.data.content));
        if (block.title) texts.push(block.title);
        break;

      case 'quiz':
        if (block.title) texts.push(`Quiz: ${block.title}`);
        break;

      case 'assignment':
        if (block.title) texts.push(`Assignment: ${block.title}`);
        break;

      case 'survey':
        if (block.title) texts.push(`Survey: ${block.title}`);
        break;

      case 'whiteboard':
        if (block.title) texts.push(`Whiteboard activity: ${block.title}`);
        break;

      default:
        if (block.title) texts.push(block.title);
        break;
    }
  }

  const summaryParts = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');

  return {
    textContent: texts.join(' '),
    summary: summaryParts || 'No content blocks',
  };
}

// ── SCORM manifest parsing ────────────────────────────────────────────────────

/**
 * Extract learning objectives and activity titles from a SCORM imsmanifest.xml.
 * Uses simple regex extraction to avoid needing an XML parser at runtime.
 */
function extractSCORMObjectives(manifestXml: string | null): string[] {
  if (!manifestXml) return [];

  const objectives: string[] = [];

  // Extract <title> elements (activity/resource titles)
  const titleMatches = manifestXml.matchAll(/<title>\s*<langstring[^>]*>(.*?)<\/langstring>\s*<\/title>/gi);
  for (const match of titleMatches) {
    const title = match[1]?.trim();
    if (title && title.length > 3 && !objectives.includes(title)) {
      objectives.push(title);
    }
  }

  // Also try plain <title> tags (SCORM 1.2 style)
  const plainTitleMatches = manifestXml.matchAll(/<title>([^<]+)<\/title>/gi);
  for (const match of plainTitleMatches) {
    const title = match[1]?.trim();
    if (title && title.length > 3 && !objectives.includes(title)) {
      objectives.push(title);
    }
  }

  // Extract <adlcp:objectives> or <imsss:objective> descriptions
  const objectiveMatches = manifestXml.matchAll(/<(?:adlcp|imsss):objectiveDescription[^>]*>(.*?)<\/(?:adlcp|imsss):objectiveDescription>/gi);
  for (const match of objectiveMatches) {
    const obj = match[1]?.trim();
    if (obj && !objectives.includes(obj)) {
      objectives.push(obj);
    }
  }

  // Extract <description> elements
  const descMatches = manifestXml.matchAll(/<description>\s*<langstring[^>]*>(.*?)<\/langstring>\s*<\/description>/gi);
  for (const match of descMatches) {
    const desc = match[1]?.trim();
    if (desc && desc.length > 10 && !objectives.includes(desc)) {
      objectives.push(desc);
    }
  }

  return objectives.slice(0, 20); // Cap at 20 to avoid prompt bloat
}

// ── Text utilities ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Simple concept extraction from text
function extractConceptsFromText(text: string): string[] {
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, ' ');

  // Extract potential concepts (words that might be important)
  const words = cleanText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const stopWords = new Set([
    'this', 'that', 'with', 'from', 'they', 'will', 'have', 'been', 'were',
    'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could',
    'other', 'after', 'first', 'well', 'also', 'because', 'these', 'give',
    'many', 'some', 'very', 'when', 'much', 'then', 'them', 'only', 'about',
    'more', 'into', 'over', 'such', 'than', 'most', 'your', 'what', 'just',
    'like', 'make', 'know', 'take', 'come', 'made', 'find', 'back', 'long',
    'look', 'here', 'thing', 'does', 'should', 'being', 'through', 'before',
    'between', 'those', 'under', 'where', 'same', 'while', 'during',
    'might', 'still', 'every', 'must', 'without', 'within', 'along',
    'until', 'always', 'both', 'often', 'upon', 'next', 'following',
    'used', 'using', 'content', 'lesson', 'video', 'image', 'file',
    'document', 'audio', 'slide', 'embed', 'title', 'description',
  ]);

  const importantWords = words.filter(word => !stopWords.has(word));

  // Take top 15 most frequent words as concepts
  const wordCount: Record<string, number> = {};
  importantWords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);
}
