import { createServiceSupabaseClient } from "@/lib/supabase-server";

export interface QuizExtension {
  id: string;
  quiz_id: string;
  student_id: string;
  course_id: string;
  extended_due_date: string | null;
  extended_available_until: string | null;
  extra_time_minutes: number | null;
  extra_attempts: number | null;
  reason: string | null;
  granted_by: string;
  created_at: string;
  updated_at: string;
}

export interface EffectiveQuizSettings {
  due_date: string | null;
  available_from: string | null;
  available_until: string | null;
  time_limit: number | null;
  attempts_allowed: number;
  has_extension: boolean;
}

/**
 * Get the extension record for a specific student and quiz.
 * Returns null if no extension exists.
 */
export async function getStudentExtension(
  quizId: string,
  studentId: string
): Promise<QuizExtension | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("quiz_extensions")
    .select("*")
    .eq("quiz_id", quizId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("[QuizExtensions] Error fetching extension:", error);
    return null;
  }
  return data;
}

/**
 * Merge quiz defaults with a student's extension to produce effective settings.
 * Pure function — no I/O.
 */
export function resolveEffectiveSettings(
  quiz: {
    due_date?: string | null;
    available_from?: string | null;
    available_until?: string | null;
    time_limit?: number | null;
    attempts_allowed?: number;
  },
  extension: QuizExtension | null
): EffectiveQuizSettings {
  const baseAttempts = Number(quiz.attempts_allowed ?? 1);
  const baseTimeLimit = quiz.time_limit ?? null;

  if (!extension) {
    return {
      due_date: quiz.due_date ?? null,
      available_from: quiz.available_from ?? null,
      available_until: quiz.available_until ?? null,
      time_limit: baseTimeLimit,
      attempts_allowed: baseAttempts,
      has_extension: false,
    };
  }

  return {
    due_date: extension.extended_due_date ?? quiz.due_date ?? null,
    available_from: quiz.available_from ?? null,
    available_until: extension.extended_available_until ?? quiz.available_until ?? null,
    time_limit:
      baseTimeLimit !== null && extension.extra_time_minutes !== null
        ? baseTimeLimit + extension.extra_time_minutes
        : baseTimeLimit,
    attempts_allowed: baseAttempts + (extension.extra_attempts ?? 0),
    has_extension: true,
  };
}

/**
 * Get all extensions for a quiz (instructor view).
 */
export async function getQuizExtensions(quizId: string): Promise<QuizExtension[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("quiz_extensions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[QuizExtensions] Error fetching extensions:", error);
    return [];
  }
  return data || [];
}
