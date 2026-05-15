/**
 * Bounded date-range parsing for analytics endpoints.
 *
 * Without these caps, a client can pass `start=2020-01-01&end=2026-01-01`
 * and force the server to scan years of activity_log / quiz_attempts /
 * grades. The helper clamps the requested range to a hard ceiling and
 * supplies a sensible default if the caller omits either side.
 *
 * Usage:
 *   const { startIso, endIso, capped } = boundDateRange(
 *     searchParams.get('start_date'),
 *     searchParams.get('end_date'),
 *     { maxDays: 365, defaultDays: 30 },
 *   );
 */

export interface DateRangeBounds {
  /** Hard ceiling on `end - start`. Anything wider is shrunk from the start. */
  maxDays: number;
  /** Used when both inputs are missing; window ends at now and stretches back this far. */
  defaultDays: number;
}

export interface DateRangeResult {
  /** Inclusive lower bound as an ISO 8601 string. */
  startIso: string;
  /** Inclusive upper bound as an ISO 8601 string. */
  endIso: string;
  /** True when the requested range exceeded maxDays and was clamped. */
  capped: boolean;
}

const MS_PER_DAY = 86_400_000;

function parseFlexibleDate(raw: string | null): Date | null {
  if (!raw) return null;
  // Accept YYYY-MM-DD or full ISO timestamps. Reject anything else so a
  // garbage param can't silently fall through to "now".
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function boundDateRange(
  startInput: string | null,
  endInput: string | null,
  opts: DateRangeBounds,
): DateRangeResult {
  const now = Date.now();
  const maxMs = opts.maxDays * MS_PER_DAY;
  const defaultMs = opts.defaultDays * MS_PER_DAY;

  let end = parseFlexibleDate(endInput);
  let start = parseFlexibleDate(startInput);

  // If the upper bound is missing, anchor it at "now".
  if (!end) end = new Date(now);

  // If the lower bound is missing, fall back to the default window.
  if (!start) start = new Date(end.getTime() - defaultMs);

  // Swap if the client passed them backwards.
  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  // Clamp the requested window to maxDays. We shrink the start (keep the
  // most recent maxDays) because analytics callers almost always care
  // about the trailing edge, not the leading one.
  let capped = false;
  if (end.getTime() - start.getTime() > maxMs) {
    start = new Date(end.getTime() - maxMs);
    capped = true;
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    capped,
  };
}

/**
 * Convenience: just clamp a single `days` query param to a max.
 * Returns the clamped integer day count.
 */
export function boundDaysParam(
  raw: string | null,
  opts: { defaultDays: number; maxDays: number },
): number {
  const parsed = raw === null ? NaN : parseInt(raw, 10);
  const days = Number.isFinite(parsed) && parsed > 0 ? parsed : opts.defaultDays;
  return Math.min(days, opts.maxDays);
}
