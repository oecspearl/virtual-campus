import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticateUser } from '@/lib/api-auth';

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface SuggestionsRequest {
  currentPage: string;
  userRole: string;
  activeSection?: string;
}

export async function POST(request: NextRequest) {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({ suggestions: getFallbackSuggestions('student') });
    }

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPage, userRole, activeSection }: SuggestionsRequest = await request.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are a help assistant for a university Learning Management System (LMS) called OECS Virtual Campus. Generate 4 contextual help questions that a ${userRole} would likely ask based on their current context. Return ONLY a JSON array of 4 strings, no other text. Each question should be specific, actionable, and relevant to the LMS platform. Keep questions under 60 characters.`
        },
        {
          role: 'user',
          content: `The user is a "${userRole}" currently viewing the "${currentPage}" help page${activeSection ? `, specifically the "${activeSection}" section` : ''}. Generate 4 relevant help questions they might want to ask.`
        }
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() || '[]';

    try {
      // Parse the JSON array from the response
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return NextResponse.json({ suggestions: parsed.slice(0, 4) });
      }
    } catch {
      // If parsing fails, try to extract questions from the text
      const lines = content.split('\n').filter((l: string) => l.trim().endsWith('?'));
      if (lines.length > 0) {
        return NextResponse.json({ suggestions: lines.slice(0, 4).map((l: string) => l.replace(/^[\d\.\-\*]+\s*/, '').trim()) });
      }
    }

    return NextResponse.json({ suggestions: getFallbackSuggestions(userRole) });
  } catch (error) {
    console.error('Error generating help suggestions:', error);
    return NextResponse.json({ suggestions: getFallbackSuggestions('student') });
  }
}

function getFallbackSuggestions(role: string): string[] {
  const fallbacks: Record<string, string[]> = {
    student: [
      'How do I submit an assignment?',
      'How do I join a live session?',
      'How do I check my grades?',
      'How do I track my progress?',
    ],
    instructor: [
      'How do I create a quiz?',
      'How do I grade submissions?',
      'How do I schedule a live session?',
      'How do I manage enrollments?',
    ],
    admin: [
      'How do I manage user accounts?',
      'How do I view system analytics?',
      'How do I configure settings?',
      'How do I manage courses?',
    ],
  };
  return fallbacks[role] || fallbacks.student;
}
