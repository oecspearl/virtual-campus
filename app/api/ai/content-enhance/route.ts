import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// ─── Rich HTML component templates the AI can use ───
const HTML_COMPONENTS = `
## RICH HTML COMPONENTS YOU MUST USE

You have access to styled inline HTML. Use these patterns to make content visually engaging:

### Info/Tip/Warning Callout Boxes
<div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:16px 20px; margin:16px 0; border-radius:0 8px 8px 0;">
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
    <span style="font-size:18px;">💡</span>
    <strong style="color:#1e40af; font-size:14px;">KEY CONCEPT</strong>
  </div>
  <p style="margin:0; color:#1e3a5f; font-size:15px;">Content here</p>
</div>

Variants — change colors per type:
- Info/Tip: background:#eff6ff, border:#3b82f6, title:#1e40af, text:#1e3a5f, icon: 💡
- Success/Example: background:#f0fdf4, border:#22c55e, title:#166534, text:#14532d, icon: ✅
- Warning/Caution: background:#fffbeb, border:#f59e0b, title:#92400e, text:#78350f, icon: ⚠️
- Important/Alert: background:#fef2f2, border:#ef4444, title:#991b1b, text:#7f1d1d, icon: 🔴
- Note: background:#f5f3ff, border:#8b5cf6, title:#5b21b6, text:#4c1d95, icon: 📝

### Highlighted Key Terms
<mark style="background:#fef08a; padding:2px 6px; border-radius:3px;">key term</mark>
or for different colors:
<span style="background:#dbeafe; color:#1e40af; padding:2px 8px; border-radius:4px; font-weight:600; font-size:13px;">Badge Label</span>

### Styled Definition / Term-Value Lists
<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:12px 0;">
  <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0;">
    <span style="font-weight:600; color:#334155;">Term</span>
    <span style="color:#64748b;">Definition</span>
  </div>
</div>

### Numbered Step Cards
<div style="display:flex; gap:14px; align-items:flex-start; margin:14px 0;">
  <div style="min-width:32px; height:32px; background:#3b82f6; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">1</div>
  <div style="flex:1;">
    <strong style="display:block; margin-bottom:4px;">Step Title</strong>
    <p style="margin:0; color:#475569; font-size:15px;">Step description here.</p>
  </div>
</div>

### Feature / Comparison Grid (2 columns)
<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:16px 0;">
  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
    <strong style="color:#0f172a;">Card Title</strong>
    <p style="margin:8px 0 0; color:#475569; font-size:14px;">Card content</p>
  </div>
  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
    <strong style="color:#0f172a;">Card Title</strong>
    <p style="margin:8px 0 0; color:#475569; font-size:14px;">Card content</p>
  </div>
</div>

### Styled Tables
<table style="width:100%; border-collapse:collapse; margin:16px 0; border-radius:8px; overflow:hidden;">
  <thead>
    <tr style="background:#1e293b;">
      <th style="padding:12px 16px; text-align:left; color:#f1f5f9; font-size:13px; font-weight:600;">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:12px 16px; font-size:14px; color:#334155;">Cell</td>
    </tr>
    <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
      <td style="padding:12px 16px; font-size:14px; color:#334155;">Alternating row</td>
    </tr>
  </tbody>
</table>

### Styled Blockquotes
<blockquote style="border-left:4px solid #8b5cf6; background:#f5f3ff; padding:16px 20px; margin:16px 0; border-radius:0 8px 8px 0; font-style:italic; color:#4c1d95;">
  <p style="margin:0;">Quote text here</p>
  <footer style="margin-top:8px; font-size:13px; color:#6b7280; font-style:normal;">— Attribution</footer>
</blockquote>

### Styled List Groups (with icons or bullets)
<ul style="list-style:none; padding:0; margin:12px 0;">
  <li style="display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-bottom:1px solid #f1f5f9;">
    <span style="color:#22c55e; font-size:18px;">✓</span>
    <span style="color:#334155; font-size:15px;">List item with custom icon</span>
  </li>
</ul>

### Section Dividers with Labels
<div style="display:flex; align-items:center; gap:12px; margin:24px 0 16px;">
  <hr style="flex:1; border:none; border-top:1px solid #e2e8f0; margin:0;" />
  <span style="font-size:12px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em;">Section Label</span>
  <hr style="flex:1; border:none; border-top:1px solid #e2e8f0; margin:0;" />
</div>

### Summary / Key Takeaways Box
<div style="background:linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%); border:1px solid #c7d2fe; border-radius:8px; padding:20px; margin:20px 0;">
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
    <span style="font-size:18px;">📌</span>
    <strong style="color:#312e81; font-size:15px;">Key Takeaways</strong>
  </div>
  <ul style="margin:0; padding-left:20px; color:#3730a3;">
    <li style="margin-bottom:6px;">Takeaway 1</li>
  </ul>
</div>
`;

const MODE_PROMPTS: Record<string, string> = {
  beautify: `Clean up and visually enhance the HTML content. You MUST:
- Add proper heading hierarchy (<h2>, <h3>) with clear section titles
- Convert run-on text into short, focused paragraphs
- Use <mark> to highlight key terms on first use
- Convert any listed items into styled <ul> or <ol> lists
- Add a styled info callout box for any important concept or definition
- Use a styled table if the content has any comparative or structured data
- Add section dividers between major topics
- Preserve all original information while making it visually scannable`,

  lesson_format: `Transform this into rich, professional educational content. You MUST use:
- Section headings (<h2>, <h3>) with a section divider between major topics
- Numbered step cards (with circle number badges) for any sequential process
- Info/tip callout boxes for key concepts, definitions, and important notes
- <mark> highlights on critical terms when first introduced
- Styled list groups with checkmark icons for feature lists or requirements
- A styled comparison table if the content has contrasting ideas
- A "Key Takeaways" summary box at the end with the main points
- Short paragraphs (2-3 sentences max) for readability
Make it look like a polished textbook page.`,

  simplify: `Simplify the content for easier reading while keeping it visually engaging:
- Use shorter sentences and simpler vocabulary
- Break complex ideas into numbered step cards
- Add info callout boxes to define any remaining technical terms
- Use <mark> to highlight the most essential terms
- Remove jargon or replace with plain language
- Keep all key information but restructure for clarity
- Preserve any existing visual formatting (tables, lists, callouts)`,

  expand: `Expand the content with more detail and rich visual formatting:
- Add illustrative examples in success callout boxes
- Flesh out brief points into full paragraphs
- Add comparison grids or tables where concepts can be contrasted
- Include tip callout boxes for practical advice
- Add numbered step cards for any processes
- Use <mark> to highlight key terms
- Add a "Key Takeaways" box at the end
Keep the educational tone and make it visually rich.`,

  summarize: `Condense the content to its key points with visual hierarchy:
- Start with a 1-2 sentence overview paragraph
- Create a "Key Takeaways" summary box with the main points
- Use a styled list group with checkmark icons for the most important facts
- If there was structured data, condense it into a compact styled table
- Keep only essential information — remove examples and redundancy
- Use <mark> on the 3-5 most critical terms`,

  fix_grammar: `Correct all grammar, spelling, and punctuation errors. Improve sentence flow and clarity. Do NOT change the meaning, overall structure, or visual formatting. Only fix language issues. Preserve all existing HTML tags, inline styles, and structure exactly as they are.`,

  add_visuals: `Add rich visual HTML components to the existing content WITHOUT changing the text. You MUST:
- Wrap key definitions or concepts in info/tip callout boxes (blue or purple)
- Add warning callout boxes for common mistakes or pitfalls
- Convert plain lists to styled list groups with icons
- Convert any sequential instructions to numbered step cards
- Wrap any comparative content in a styled table or comparison grid
- Add <mark> highlighting to important terms
- Add a "Key Takeaways" summary box at the end
- Add section dividers between major topics
- Convert any plain blockquotes to styled blockquotes
DO NOT rewrite or change the actual text content — only add visual formatting around it.`,
};

const SYSTEM_PROMPT = `You are an expert educational content designer for a learning management system. Your job is to produce visually rich, beautifully formatted HTML for lesson pages that looks like a professional textbook or Notion document.

CRITICAL RULES:
1. Return ONLY valid HTML — no markdown, no code fences, no explanations outside HTML
2. Use inline styles directly on elements (style="...") for all visual formatting
3. Use these allowed tags: h2, h3, h4, h5, h6, p, br, hr, ul, ol, li, strong, em, b, i, u, s, mark, sub, sup, a, blockquote, pre, code, table, thead, tbody, tr, th, td, div, span, figure, figcaption
4. Do NOT use <h1> (reserved for page titles)
5. Do NOT add <html>, <head>, <body> tags
6. Do NOT wrap output in code fences or backticks
7. Do NOT use class attributes — use inline style="" for everything
8. Use modern, clean colors (slate/blue/emerald/amber/violet palettes)

${HTML_COMPONENTS}

ALWAYS produce visually rich output. Plain unstyled HTML is NOT acceptable. Every response should include at least 2-3 different visual components from the list above.`;

interface EnhanceRequest {
  html: string;
  mode: string;
  instructions?: string;
}

export async function POST(request: NextRequest) {
  try {
    const openai = getOpenAIClient();
    if (!openai || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'AI service configuration error - OpenAI API key not found'
      }, { status: 500 });
    }

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const { html, mode, instructions }: EnhanceRequest = await request.json();

    if (!html || html.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.beautify;

    let userPrompt = `${modePrompt}\n\nContent to enhance:\n${html}`;
    if (instructions && instructions.trim()) {
      userPrompt += `\n\nAdditional instructions: ${instructions.trim()}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const enhancedHtml = completion.choices[0]?.message?.content || '';

    // Track usage
    const tokensUsed = completion.usage?.total_tokens || 0;
    const estimatedCost = (tokensUsed / 1000) * 0.005;

    try {
      const tenantId = getTenantIdFromRequest(request);
      const tqUsage = createTenantQuery(tenantId);
      await tqUsage.raw.rpc('update_ai_usage', {
        user_uuid: user.id,
        additional_calls: 1,
        additional_tokens: tokensUsed,
        additional_cost: estimatedCost,
      });
    } catch (error) {
      console.error('Error tracking AI usage:', error);
    }

    return NextResponse.json({
      enhanced_html: enhancedHtml,
      mode,
      tokens_used: tokensUsed,
    });

  } catch (error) {
    console.error('AI Content Enhance Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('OpenAI')) {
        return NextResponse.json({ error: 'AI service configuration error' }, { status: 500 });
      }
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json({ error: 'AI service temporarily unavailable - rate limit exceeded' }, { status: 429 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
