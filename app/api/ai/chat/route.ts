import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { AIContextManager, AIContext } from '@/lib/ai-context';
import { authenticateUser } from '@/lib/api-auth';

// Lazy initialization of OpenAI client
function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: Partial<AIContext>;
  currentPage?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    const openai = getOpenAIClient();
    if (!openai || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service configuration error - OpenAI API key not found' 
      }, { status: 500 });
    }

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const contextManager = new AIContextManager(tq.raw, user.id);

    // Parse request body
    const { message, conversationId, context: additionalContext, currentPage = '/' }: ChatRequest = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get current context
    const context = await contextManager.getCurrentContext(currentPage, additionalContext);
    
    // Build system prompt
    const systemPrompt = contextManager.buildSystemPrompt(context);

    // Get or create conversation (with fallback if tables don't exist)
    let conversationIdToUse = conversationId;
    if (!conversationIdToUse) {
      try {
        // Create new conversation
        const { data: newConversation, error: createError } = await tq
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            context: context
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          // If table doesn't exist, generate a temporary conversation ID
          conversationIdToUse = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else {
          conversationIdToUse = newConversation.id;
        }
      } catch (error) {
        console.error('Database error, using temporary conversation ID:', error);
        conversationIdToUse = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    }

    // Get conversation history (with fallback if tables don't exist)
    let messages = [];
    try {
      const { data: messageData } = await tq
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationIdToUse)
        .order('created_at', { ascending: true })
        .limit(20); // Limit to last 20 messages for context
      messages = messageData || [];
    } catch (error) {
      console.error('Error fetching messages, using empty array:', error);
      messages = [];
    }

    // Prepare messages for OpenAI
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    // Save user message (with fallback if tables don't exist)
    try {
      await tq
        .from('ai_messages')
        .insert({
          conversation_id: conversationIdToUse,
          role: 'user',
          content: message,
          metadata: { context: context }
        });
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    // Save AI response (with fallback if tables don't exist)
    try {
      await tq
        .from('ai_messages')
        .insert({
          conversation_id: conversationIdToUse,
          role: 'assistant',
          content: aiResponse,
          metadata: { 
            model: 'gpt-4',
            tokens_used: completion.usage?.total_tokens || 0,
            context: context
          }
        });
    } catch (error) {
      console.error('Error saving AI response:', error);
    }

    // Update conversation timestamp (with fallback if tables don't exist)
    try {
      await tq
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationIdToUse);
    } catch (error) {
      console.error('Error updating conversation timestamp:', error);
    }

    // Track usage (with fallback if tables don't exist)
    const tokensUsed = completion.usage?.total_tokens || 0;
    const estimatedCost = (tokensUsed / 1000) * 0.03; // Rough estimate for GPT-4

    try {
      await tq.raw.rpc('update_ai_usage', {
        user_uuid: user.id,
        additional_calls: 1,
        additional_tokens: tokensUsed,
        additional_cost: estimatedCost
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }

    return NextResponse.json({
      response: aiResponse,
      conversationId: conversationIdToUse,
      usage: {
        tokens: tokensUsed,
        estimatedCost: estimatedCost
      }
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('OpenAI')) {
        return NextResponse.json({ error: 'AI service configuration error - OpenAI API key not found' }, { status: 500 });
      }
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json({ error: 'AI service temporarily unavailable - rate limit exceeded' }, { status: 429 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get user's conversations
    const { data: conversations, error } = await tq
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations || [] });

  } catch (error) {
    console.error('AI Conversations API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
