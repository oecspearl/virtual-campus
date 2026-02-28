import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from "@/lib/database-helpers";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { message, lessonId, courseId, context } = await request.json();
    if (!message || !lessonId) {
      return NextResponse.json({ error: "Message and lesson ID required" }, { status: 400 });
    }

    // For now, we'll use a mock AI response since we don't have OpenAI configured
    // In production, this would integrate with OpenAI GPT-4 or similar
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

// Generate AI response using OpenAI API or fallback to mock
async function generateAIResponse(message: string, context: any, user: any): Promise<string> {
  // Try OpenAI API first if key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateOpenAIResponse(message, context, user);
    } catch (error) {
      console.error('OpenAI API error, falling back to mock:', error);
      // Fall back to mock response if OpenAI fails
    }
  }

  // Fallback to mock responses
  return generateMockResponse(message, context, user);
}

// Generate response using OpenAI API
async function generateOpenAIResponse(message: string, context: any, user: any): Promise<string> {
  const { OpenAI } = require('openai');
  // Lazy initialization - only create client if API key exists
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service configuration error - OpenAI API key not found');
  }
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Extract lesson context
  const lessonTitle = context?.lesson?.title || "this lesson";
  const lessonDescription = context?.lesson?.description || "";
  const concepts = context?.concepts || [];
  const learningObjectives = context?.learningObjectives || [];
  const courseSubject = context?.course?.subject || "this subject";
  const studentProgress = context?.studentProgress || 0;

  // Build context-aware prompt
  const systemPrompt = `You are an AI tutor helping a student with their lesson "${lessonTitle}" in ${courseSubject}.

LESSON CONTEXT:
- Title: ${lessonTitle}
- Description: ${lessonDescription}
- Key Concepts: ${concepts.join(', ')}
- Learning Objectives: ${learningObjectives.join(', ')}
- Student Progress: ${studentProgress}%

INSTRUCTIONS:
- Provide helpful, educational responses based on the lesson content
- Use the key concepts and learning objectives to give relevant examples
- Adapt your explanation style to be clear and engaging
- If the student asks about something not in the lesson, guide them back to the lesson content
- Encourage active learning and critical thinking
- Keep responses concise but comprehensive

RESPONSE STYLE:
- Be encouraging and supportive
- Use examples when helpful
- Ask follow-up questions to deepen understanding
- Break down complex concepts into simpler parts`;

  const response = await client.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
}

// Generate mock response (fallback)
async function generateMockResponse(message: string, context: any, user: any): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Extract lesson context
  const lessonTitle = context?.lesson?.title || "this lesson";
  const lessonDescription = context?.lesson?.description || "";
  const concepts = context?.concepts || [];
  const learningObjectives = context?.learningObjectives || [];
  const courseSubject = context?.course?.subject || "this subject";

  // Generate context-aware responses
  if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('what does')) {
    return generateExplanationResponse(message, concepts, lessonTitle, courseSubject);
  } else if (lowerMessage.includes('example') || lowerMessage.includes('give me an example')) {
    return generateExampleResponse(concepts, lessonTitle, courseSubject);
  } else if (lowerMessage.includes('help') || lowerMessage.includes('stuck') || lowerMessage.includes('confused')) {
    return generateHelpResponse(learningObjectives, lessonTitle);
  } else if (lowerMessage.includes('practice') || lowerMessage.includes('exercise') || lowerMessage.includes('problem')) {
    return generatePracticeResponse(concepts, lessonTitle, courseSubject);
  } else if (lowerMessage.includes('summary') || lowerMessage.includes('recap') || lowerMessage.includes('overview')) {
    return generateSummaryResponse(learningObjectives, concepts, lessonTitle);
  } else {
    return generateGeneralResponse(message, concepts, lessonTitle, courseSubject);
  }
}

function generateExplanationResponse(message: string, concepts: string[], lessonTitle: string, subject: string): string {
  const relevantConcepts = concepts.slice(0, 3).join(', ');
  
  return `I'd be happy to explain that concept from ${lessonTitle}! 

Based on the lesson content, here's what I understand about your question:

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
  
  return `Great question! Let me give you a practical example related to ${mainConcept} from ${lessonTitle}:

**Real-World Example:**
Imagine you're learning about ${mainConcept} in the context of ${subject}. Here's how it works in practice:

1. **Scenario**: [A relatable situation where this concept applies]
2. **Application**: How the concept works in this scenario
3. **Outcome**: What happens when you apply this concept

**Why This Example Matters:**
- It shows the practical application of what you're learning
- It helps you understand the concept in a familiar context
- It demonstrates how this knowledge is used in real situations

**Try This:**
Can you think of another example from your own experience that relates to this concept? This will help reinforce your understanding!

Would you like me to provide a different type of example or explain any part of this in more detail?`;
}

function generateHelpResponse(learningObjectives: string[], lessonTitle: string): string {
  return `I'm here to help you with ${lessonTitle}! Let me break down what you're working on:

**Learning Objectives for This Lesson:**
${learningObjectives.map(obj => `• ${obj}`).join('\n')}

**How I Can Help:**
1. **Clarify Concepts**: Ask me to explain any confusing terms or ideas
2. **Provide Examples**: Request real-world examples of what you're learning
3. **Step-by-Step Guidance**: Get help working through problems or exercises
4. **Study Strategies**: Learn the best ways to understand and remember the material

**What Specifically Are You Stuck On?**
- Is there a particular concept that's unclear?
- Are you having trouble with a specific problem or exercise?
- Do you need help connecting this lesson to previous material?

The more specific you can be about what's challenging you, the better I can help! What would you like to focus on first?`;
}

function generatePracticeResponse(concepts: string[], lessonTitle: string, subject: string): string {
  const mainConcept = concepts[0] || 'the main concept';
  
  return `Excellent! Practice is key to mastering ${mainConcept} from ${lessonTitle}. Here's how you can practice:

**Practice Activities:**
1. **Concept Application**: Try to find examples of ${mainConcept} in your daily life
2. **Problem Solving**: Work through similar problems to those in the lesson
3. **Teaching Others**: Explain the concept to someone else (even if it's just talking to yourself!)
4. **Create Your Own Examples**: Make up scenarios where this concept applies

**Practice Questions to Try:**
- How would you explain ${mainConcept} to someone who has never heard of it?
- What would happen if you changed one aspect of this concept?
- Can you think of a situation where this concept doesn't apply?

**Study Tips:**
- Break complex problems into smaller, manageable steps
- Draw diagrams or create visual representations
- Connect new concepts to things you already know
- Practice regularly rather than cramming

**Need More Specific Practice?**
Let me know what type of practice would be most helpful for you, and I can provide more targeted exercises!`;
}

function generateSummaryResponse(learningObjectives: string[], concepts: string[], lessonTitle: string): string {
  return `Here's a comprehensive summary of ${lessonTitle}:

**What You've Learned:**
${learningObjectives.map(obj => `• ${obj}`).join('\n')}

**Key Concepts Covered:**
${concepts.map(concept => `• ${concept}`).join('\n')}

**Main Takeaways:**
1. **Core Understanding**: The fundamental principles covered in this lesson
2. **Practical Application**: How these concepts apply in real-world situations
3. **Connections**: How this lesson builds on previous knowledge and prepares you for what's next

**To Reinforce Your Learning:**
- Review the main concepts and make sure you can explain them in your own words
- Practice applying these concepts to new situations
- Connect this lesson to what you've learned before
- Think about how this knowledge will help you in future lessons

**Questions to Check Your Understanding:**
- Can you explain the main concept without looking at your notes?
- What was the most important thing you learned in this lesson?
- How does this connect to what you knew before?

Is there any part of this summary you'd like me to elaborate on or clarify?`;
}

function generateGeneralResponse(message: string, concepts: string[], lessonTitle: string, subject: string): string {
  return `I understand you're asking about "${message}" in the context of ${lessonTitle}. 

**How I Can Help:**
As your AI tutor for this ${subject} lesson, I can assist you with:

• **Explanations**: Breaking down complex concepts into understandable parts
• **Examples**: Providing real-world applications and practical examples  
• **Problem Solving**: Guiding you through exercises and practice problems
• **Study Strategies**: Suggesting effective ways to learn and remember the material
• **Connections**: Helping you see how different concepts relate to each other

**Key Concepts in This Lesson:**
${concepts.map(concept => `• ${concept}`).join('\n')}

**To Give You the Best Help:**
Could you be more specific about what you'd like to know? For example:
- "Can you explain [specific concept] in simpler terms?"
- "I need help with [specific problem or exercise]"
- "Can you give me an example of [specific concept]?"
- "How does [concept A] relate to [concept B]?"

The more specific you are, the better I can tailor my response to your needs!`;
}
