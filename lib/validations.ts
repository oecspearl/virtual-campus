import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Shared Zod schemas for API route input validation.
 */

// ── Course schemas ──

export const courseUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).optional(),
  // Form fields that aren't filled keep their default empty string ('') —
  // accept '' alongside null/valid URL and normalise '' → null before the
  // route writes to Postgres so we don't store empty strings.
  thumbnail: z
    .union([z.string().url().max(2000), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v)),
  grade_level: z.string().max(100).optional(),
  subject_area: z.string().max(200).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  modality: z.string().max(50).optional(),
  estimated_duration: z.string().max(100).optional(),
  syllabus: z.string().max(100000).optional(),
  published: z.boolean().optional(),
  is_public: z.boolean().optional(),
  allow_lesson_personalisation: z.boolean().optional(),
  featured: z.boolean().optional(),
  course_format: z.enum(['lessons', 'topics', 'weekly', 'grid', 'player']).optional(),
  start_date: z.string().nullable().optional(),
});

// ── User schemas ──

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  role: z.enum(['super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent']),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say', '']).nullable().optional(),
  student_id: z.string().max(100).nullable().optional(),
  password: z.string().min(6).max(128).optional(),
  bio: z.string().max(5000).nullable().optional(),
  avatar: z.string().url().max(2000).nullable().optional(),
  learning_preferences: z.any().optional(),
  grade_level: z.string().max(50).nullable().optional(),
  subject_areas: z.array(z.string()).nullable().optional(),
  learning_style: z.string().max(50).nullable().optional(),
  difficulty_preference: z.string().max(50).nullable().optional(),
  parent_email: z.string().email().max(320).nullable().optional(),
  school_id: z.string().uuid().nullable().optional(),
});

// ── Lesson schemas ──

export const lessonUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(500000).optional(),
  video_url: z.string().url().max(2000).nullable().optional(),
  order: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
  section_id: z.string().uuid().nullable().optional(),
  lesson_type: z.string().max(50).optional(),
  estimated_duration: z.number().int().min(0).optional(),
});

// ── Standalone validators (single source of truth — used outside schemas) ──

const emailSchema = z.string().email().max(254);
const httpUrlSchema = z.string().url().refine(
  (u) => {
    try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; }
  },
  { message: 'URL must use http:// or https://' }
);

export function isValidEmail(value: unknown): boolean {
  return emailSchema.safeParse(value).success;
}

export function isValidHttpUrl(value: unknown): boolean {
  return httpUrlSchema.safeParse(value).success;
}

// ── Helper ──

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or a NextResponse error on failure.
 */
type ValidationSuccess<T> = { success: true; data: T; response?: never };
type ValidationFailure = { success: false; response: NextResponse; data?: never };

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ValidationSuccess<T> | ValidationFailure {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
