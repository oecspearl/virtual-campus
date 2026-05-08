/**
 * Activity-types registry — type definitions.
 *
 * Each lesson activity (rich_text, video, scorm, quiz, assignment, and
 * future types like forum/wiki/h5p) is described by an `ActivityModule`.
 * The registry (`./registry.ts`) holds the live map; module files in
 * `./modules/*` register themselves at import time.
 *
 * In Phase B we model metadata only: id, name, capabilities. The lesson
 * renderer still owns the per-type display logic. In Phase C, modules
 * will additionally export AuthorView / LearnerView components and the
 * renderer will dispatch via the registry.
 */

export interface ActivityCapabilities {
  /** Produces a grade that flows into the gradebook. */
  gradable: boolean;
  /** Tracks per-student completion. */
  completion: boolean;
  /** Allows multiple attempts (quiz-style). */
  attempts: boolean;
  /** Requires `lessons.content` (rich-text/video) versus a separate config table (quiz, scorm). */
  requires_content: boolean;
  /** True when the existing lesson page already knows how to render this. False until Phase C wiring. */
  has_native_renderer: boolean;
}

export interface ActivityModule {
  /** Stable string id matching `activity_module_types.id` and `lessons.content_type`. */
  id: string;
  /** Human-readable name for UI ("Rich text", "Video", etc.). */
  name: string;
  /** Optional one-line description for the create dialog. */
  description?: string;
  /** Capability flags consumed by callers to decide UI affordances. */
  capabilities: ActivityCapabilities;
}
