import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const { message, lessonId, courseId, context } = await request.json();
    if (!message || !lessonId) {
      return NextResponse.json({ error: "Message and lesson ID required" }, { status: 400 });
    }

    const aiResponse = await generateAIResponse(message, context, user);

    // Store the conversation in the database for analytics
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    await tq
      .from("ai_tutor_conversations")
      .insert([{
        student_id: user.id,
        lesson_id: lessonId,
        course_id: courseId,
        user_message: message,
        ai_response: aiResponse,
        created_at: new Date().toISOString()
      }]);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (e: any) {
    console.error('AI tutor chat API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── AI Response Generation ────────────────────────────────────────────────────

async function generateAIResponse(message: string, context: any, user: any): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateOpenAIResponse(message, context, user);
    } catch (error) {
      console.error('OpenAI API error, falling back to mock:', error);
    }
  }
  return generateMockResponse(message, context, user);
}

async function generateOpenAIResponse(message: string, context: any, user: any): Promise<string> {
  const { OpenAI } = require('openai');
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service configuration error - OpenAI API key not found');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = buildSystemPrompt(context);

  // Build message array: system prompt + conversation history + current message
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Include conversation history from context (last 10 exchanges = 20 messages)
  if (context?.conversationHistory && Array.isArray(context.conversationHistory)) {
    for (const msg of context.conversationHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  // Current user message
  messages.push({ role: 'user', content: message });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 1500,
    temperature: 0.7,
  });

  return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
}

// ── System Prompt Builder ─────────────────────────────────────────────────────

function buildSystemPrompt(context: any): string {
  const lessonTitle = context?.lesson?.title || "this lesson";
  const lessonDescription = context?.lesson?.description || "";
  const contentType = context?.lesson?.content_type || "rich_text";
  const concepts = context?.concepts || [];
  const learningObjectives = context?.learningObjectives || [];
  const courseTitle = context?.course?.title || "";
  const courseSubject = context?.course?.subject_area || "this subject";
  const studentProgress = context?.studentProgress || 0;
  const contentSummary = context?.contentSummary || "";

  let prompt = `You are an AI tutor helping a student with the lesson "${lessonTitle}" in the course "${courseTitle}" (${courseSubject}).

LESSON CONTEXT:
- Title: ${lessonTitle}
- Content Type: ${contentType}
- Description: ${lessonDescription}
- Content Structure: ${contentSummary}
- Key Concepts: ${concepts.join(', ') || 'Not yet extracted'}
- Learning Objectives: ${learningObjectives.join('; ') || 'Not specified'}
- Student Progress: ${studentProgress}%`;

  // ── Video transcript context ──
  if (context?.videoTranscript) {
    // Truncate transcript to ~3000 chars to avoid prompt bloat
    const transcript = context.videoTranscript.length > 3000
      ? context.videoTranscript.substring(0, 3000) + '\n[... transcript continues ...]'
      : context.videoTranscript;

    prompt += `

VIDEO TRANSCRIPT (timestamped):
${transcript}`;
  }

  // ── SCORM context ──
  if (context?.scormContext) {
    prompt += `

INTERACTIVE MODULE (SCORM):
- Module Title: ${context.scormContext.title || 'N/A'}`;
    if (context.scormContext.description) {
      prompt += `\n- Description: ${context.scormContext.description}`;
    }
    if (context.scormContext.objectives?.length) {
      prompt += `\n- Module Sections/Objectives:\n${context.scormContext.objectives.map((o: string) => `  • ${o}`).join('\n')}`;
    }
  }

  // ── Attached resources ──
  if (context?.attachedResources?.length) {
    prompt += `

ATTACHED RESOURCES:
${context.attachedResources.map((r: any) =>
    `- [${r.type}] ${r.title}${r.description ? ': ' + r.description : ''}`
  ).join('\n')}`;
  }

  // ── Related lessons for cross-referencing ──
  if (context?.relatedLessons?.length) {
    const lessonList = context.relatedLessons
      .slice(0, 8)
      .map((l: any) => l.title)
      .join(', ');
    prompt += `

OTHER LESSONS IN THIS COURSE: ${lessonList}`;
  }

  // ── Instructions ──
  prompt += `

TUTORING INSTRUCTIONS:
- Provide helpful, educational responses grounded in the lesson content above
- When the lesson is a video, reference specific moments from the transcript (e.g., "Around the 5:30 mark, the video discusses...")
- When the lesson is a SCORM module, reference the module sections and objectives
- Reference the attached resources when relevant (e.g., "You can find more detail in the attached document...")
- Use the key concepts and learning objectives to keep answers focused
- If the student asks about something outside the lesson, relate it back to the lesson content
- Adapt explanations to the student's progress level (${studentProgress}% through the course)
- Be encouraging, use examples, and ask follow-up questions to deepen understanding
- Break down complex concepts into simpler parts
- Keep responses concise but comprehensive (aim for 200-400 words)
- Use markdown formatting for readability (bold, lists, headers)`;

  return prompt;
}

// ── Mock Response Fallback ────────────────────────────────────────────────────

async function generateMockResponse(message: string, context: any, user: any): Promise<string> {
  const lowerMessage = message.toLowerCase();

  const lessonTitle = context?.lesson?.title || "this lesson";
  const concepts = context?.concepts || [];
  const learningObjectives = context?.learningObjectives || [];
  const courseSubject = context?.course?.subject_area || "this subject";
  const contentType = context?.lesson?.content_type || "rich_text";

  // Content-type aware responses
  const contentNote = contentType === 'video'
    ? context?.videoTranscript
      ? "\n\n*I have access to the video transcript for this lesson, so feel free to ask about specific topics covered in the video.*"
      : "\n\n*This is a video lesson. While I have the lesson details, I don't have the full video transcript yet.*"
    : contentType === 'scorm'
      ? "\n\n*This is an interactive SCORM module. I can help you with the learning objectives and concepts covered.*"
      : '';

  if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('what does')) {
    return generateExplanationResponse(message, concepts, lessonTitle, courseSubject) + contentNote;
  } else if (lowerMessage.includes('example') || lowerMessage.includes('give me an example')) {
    return generateExampleResponse(concepts, lessonTitle, courseSubject) + contentNote;
  } else if (lowerMessage.includes('help') || lowerMessage.includes('stuck') || lowerMessage.includes('confused')) {
    return generateHelpResponse(learningObjectives, lessonTitle) + contentNote;
  } else if (lowerMessage.includes('practice') || lowerMessage.includes('exercise') || lowerMessage.includes('problem')) {
    return generatePracticeResponse(concepts, lessonTitle, courseSubject) + contentNote;
  } else if (lowerMessage.includes('summary') || lowerMessage.includes('recap') || lowerMessage.includes('overview')) {
    return generateSummaryResponse(learningObjectives, concepts, lessonTitle) + contentNote;
  } else if (lowerMessage.includes('video') || lowerMessage.includes('transcript')) {
    return generateVideoResponse(context, lessonTitle) + contentNote;
  } else {
    return generateGeneralResponse(message, concepts, lessonTitle, courseSubject) + contentNote;
  }
}

function generateVideoResponse(context: any, lessonTitle: string): string {
  if (context?.videoTranscript) {
    return `I have the transcript for the video in "${lessonTitle}". Here's what I can help with:

**Topics Covered in the Video:**
${(context.concepts || []).slice(0, 5).map((c: string) => `• ${c}`).join('\n')}

**How I Can Help:**
- Ask me to explain a specific topic from the video
- Ask "What does the video say about [topic]?"
- Request a summary of a section
- Ask for clarification on anything discussed

What part of the video would you like to explore?`;
  }

  return `This lesson "${lessonTitle}" is a video-based lesson. While I have the lesson objectives and key concepts, I can still help you understand the material.

**What I Can Help With:**
- Explaining the key concepts covered in this lesson
- Providing additional examples related to the topics
- Breaking down the learning objectives
- Answering questions about the subject matter

What would you like to know?`;
}

function generateExplanationResponse(message: string, concepts: string[], lessonTitle: string, subject: string): string {
  const relevantConcepts = concepts.slice(0, 3).join(', ');

  return `I'd be happy to explain that concept from "${lessonTitle}"!

**Key Concepts in This Lesson:**
${concepts.map(concept => `• ${concept}`).join('\n')}

**Explanation:**
The concept you're asking about relates to ${subject} and builds on the foundational ideas covered in this lesson. ${relevantConcepts ? `Specifically, it connects to ${relevantConcepts}.` : ''}

**To help you better understand:**
1. Try to identify which specific part of the lesson content relates to your question
2. Look for examples or illustrations in the lesson materials
3. Consider how this concept connects to what you've learned previously

Would you like me to break this down further or provide a specific example?`;
}

function generateExampleResponse(concepts: string[], lessonTitle: string, subject: string): string {
  const mainConcept = concepts[0] || 'the main concept';

  return `Great question! Let me give you a practical example related to **${mainConcept}** from "${lessonTitle}":

**Real-World Application:**
Imagine you're applying ${mainConcept} in the context of ${subject}:

1. **Scenario**: A relatable situation where this concept applies
2. **Application**: How the concept works in practice
3. **Outcome**: What happens when you apply this correctly

**Try This:**
Can you think of another example from your own experience? This will help reinforce your understanding!

Would you like a different type of example or more detail?`;
}

function generateHelpResponse(learningObjectives: string[], lessonTitle: string): string {
  return `I'm here to help you with "${lessonTitle}"! Let me break down what you're working on:

**Learning Objectives:**
${learningObjectives.length > 0 ? learningObjectives.map(obj => `• ${obj}`).join('\n') : '• Review the lesson content and identify the main ideas'}

**How I Can Help:**
1. **Clarify Concepts** — Ask me to explain any confusing terms
2. **Provide Examples** — Request real-world examples
3. **Step-by-Step Guidance** — Get help working through problems
4. **Study Strategies** — Learn effective ways to understand the material

What specifically are you stuck on? The more specific you can be, the better I can help!`;
}

function generatePracticeResponse(concepts: string[], lessonTitle: string, subject: string): string {
  const mainConcept = concepts[0] || 'the main concept';

  return `Practice is key to mastering **${mainConcept}** from "${lessonTitle}".

**Practice Activities:**
1. **Concept Application**: Find examples of ${mainConcept} in your daily life
2. **Self-Assessment**: Can you explain ${mainConcept} without looking at notes?
3. **Teaching Others**: Explain the concept to someone else
4. **Create Your Own Examples**: Make up scenarios where this applies

**Questions to Test Yourself:**
- How would you explain ${mainConcept} in simple terms?
- What would happen if you changed one aspect of this concept?
- How does this relate to other topics in ${subject}?

Would you like more targeted practice questions?`;
}

function generateSummaryResponse(learningObjectives: string[], concepts: string[], lessonTitle: string): string {
  return `Here's a summary of "${lessonTitle}":

**What You Should Have Learned:**
${learningObjectives.length > 0 ? learningObjectives.map(obj => `• ${obj}`).join('\n') : '• The main concepts and ideas presented in this lesson'}

**Key Concepts:**
${concepts.length > 0 ? concepts.map(concept => `• ${concept}`).join('\n') : '• Review the lesson content for key terms'}

**Main Takeaways:**
1. The fundamental principles covered in this lesson
2. How these concepts apply in real-world situations
3. How this builds on previous lessons and prepares you for what's next

**Check Your Understanding:**
- Can you explain the main concepts in your own words?
- What was the most important thing you learned?
- How does this connect to what you knew before?

Would you like me to elaborate on any part?`;
}

function generateGeneralResponse(message: string, concepts: string[], lessonTitle: string, subject: string): string {
  return `I understand you're asking about "${message}" in the context of "${lessonTitle}".

**As your AI tutor for this ${subject} lesson, I can help with:**
• **Explanations** — Breaking down complex concepts
• **Examples** — Real-world applications
• **Problem Solving** — Guided exercises
• **Study Strategies** — Effective learning approaches
• **Connections** — Linking concepts together

**Key Concepts in This Lesson:**
${concepts.length > 0 ? concepts.map(concept => `• ${concept}`).join('\n') : '• Ask me about specific topics from the lesson'}

Could you be more specific about what you'd like to know? For example:
- "Can you explain [specific concept] in simpler terms?"
- "How does [concept A] relate to [concept B]?"
- "Can you give me an example of [concept]?"`;
}
