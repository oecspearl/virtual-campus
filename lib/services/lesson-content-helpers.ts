/**
 * Shared helper for appending a content block (quiz, assignment, etc.) to
 * a lesson's JSONB content array. Uses the `append_lesson_content` RPC when
 * available (atomic, race-free) and falls back to a read-modify-write pattern
 * when the RPC isn't present.
 */

import type { TenantQuery } from '@/lib/tenant-query';

export interface LessonContentBlock {
  /** Block kind — e.g. 'quiz', 'assignment', 'video'. */
  type: string;
  title: string;
  /** Stable unique id for idempotency (e.g. `quiz-${id}`). */
  id: string;
  /** Block-specific payload. */
  data: Record<string, unknown>;
}

/**
 * Append a content block to a lesson. Idempotent by `block.id`.
 * Returns true when the block was appended (or was already present), false
 * on unrecoverable errors.
 */
export async function appendLessonContentBlock(
  tq: TenantQuery,
  lessonId: string,
  block: LessonContentBlock
): Promise<boolean> {
  // Try the atomic RPC first.
  const { error: rpcError } = await tq.raw.rpc('append_lesson_content', {
    p_lesson_id: lessonId,
    p_content_item: block,
  });

  if (!rpcError) return true;

  // Postgres error 42883 = undefined function. Fall back to read-modify-write.
  if (rpcError.code !== '42883') {
    throw new Error(`append_lesson_content RPC failed: ${rpcError.message}`);
  }

  const { data: lesson, error: fetchError } = await tq
    .from('lessons')
    .select('content')
    .eq('id', lessonId)
    .single();

  if (fetchError || !lesson) return false;

  const currentContent: LessonContentBlock[] = lesson.content || [];
  const alreadyExists = currentContent.some((item) => item.id === block.id);
  if (alreadyExists) return true;

  const { error: updateError } = await tq
    .from('lessons')
    .update({
      content: [...currentContent, block],
      updated_at: new Date().toISOString(),
    })
    .eq('id', lessonId);

  if (updateError) {
    throw new Error(`Failed to update lesson content: ${updateError.message}`);
  }

  return true;
}
