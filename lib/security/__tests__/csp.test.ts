import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildCspDirectives, serializeCsp, buildCspHeader } from '../csp';

// ─── Helpers ───────────────────────────────────────────────────────────────

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'CSP_EXTRA_SCRIPT_SRC',
  'CSP_EXTRA_STYLE_SRC',
  'CSP_EXTRA_FONT_SRC',
  'CSP_EXTRA_IMG_SRC',
  'CSP_EXTRA_MEDIA_SRC',
  'CSP_EXTRA_CONNECT_SRC',
  'CSP_EXTRA_FRAME_SRC',
  'CSP_EXTRA_WORKER_SRC',
] as const;

function clearCspEnv() {
  for (const k of ENV_KEYS) vi.stubEnv(k, '');
}

beforeEach(() => {
  clearCspEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── serializeCsp ──────────────────────────────────────────────────────────

describe('serializeCsp', () => {
  it('joins directives with "; " and spaces within a directive', () => {
    const output = serializeCsp({
      scriptSrc: ["'self'", 'https://a.com'],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      workerSrc: ["'self'"],
    });

    expect(output).toContain("script-src 'self' https://a.com");
    expect(output).toContain("default-src 'self'");
    expect(output.split('; ').length).toBe(9);
  });
});

// ─── buildCspDirectives — defaults ─────────────────────────────────────────

describe('buildCspDirectives — defaults', () => {
  it('always allows self on every directive', () => {
    const d = buildCspDirectives();
    expect(d.scriptSrc).toContain("'self'");
    expect(d.styleSrc).toContain("'self'");
    expect(d.fontSrc).toContain("'self'");
    expect(d.imgSrc).toContain("'self'");
    expect(d.connectSrc).toContain("'self'");
    expect(d.frameSrc).toContain("'self'");
    expect(d.workerSrc).toContain("'self'");
  });

  it('allows data: and blob: on img-src for inline images and uploads', () => {
    const d = buildCspDirectives();
    expect(d.imgSrc).toContain('data:');
    expect(d.imgSrc).toContain('blob:');
  });

  it('allows unsafe-inline on script-src and style-src (required by Tailwind / dynamic styles)', () => {
    const d = buildCspDirectives();
    expect(d.scriptSrc).toContain("'unsafe-inline'");
    expect(d.styleSrc).toContain("'unsafe-inline'");
  });

  it('allows blob: on worker-src (PWA service workers)', () => {
    const d = buildCspDirectives();
    expect(d.workerSrc).toContain('blob:');
  });
});

// ─── Supabase origin derivation ────────────────────────────────────────────

describe('buildCspDirectives — Supabase origin', () => {
  it('derives the specific project origin from NEXT_PUBLIC_SUPABASE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdef.supabase.co');

    const d = buildCspDirectives();
    expect(d.connectSrc).toContain('https://abcdef.supabase.co');
    expect(d.connectSrc).toContain('wss://abcdef.supabase.co');
  });

  it('does NOT include the wildcard when a specific URL is derived', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdef.supabase.co');

    const d = buildCspDirectives();
    expect(d.connectSrc).not.toContain('https://*.supabase.co');
    expect(d.connectSrc).not.toContain('wss://*.supabase.co');
  });

  it('falls back to the wildcard when NEXT_PUBLIC_SUPABASE_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');

    const d = buildCspDirectives();
    expect(d.connectSrc).toContain('https://*.supabase.co');
    expect(d.connectSrc).toContain('wss://*.supabase.co');
  });

  it('falls back to the wildcard when NEXT_PUBLIC_SUPABASE_URL is malformed', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not-a-url');

    const d = buildCspDirectives();
    expect(d.connectSrc).toContain('https://*.supabase.co');
  });
});

// ─── Env-var extras ────────────────────────────────────────────────────────

describe('buildCspDirectives — deployment overrides', () => {
  it('appends CSP_EXTRA_SCRIPT_SRC origins to script-src', () => {
    vi.stubEnv('CSP_EXTRA_SCRIPT_SRC', 'https://cdn.tiny.cloud https://unpkg.com');

    const d = buildCspDirectives();
    expect(d.scriptSrc).toContain('https://cdn.tiny.cloud');
    expect(d.scriptSrc).toContain('https://unpkg.com');
  });

  it('appends CSP_EXTRA_FRAME_SRC origins to frame-src', () => {
    vi.stubEnv('CSP_EXTRA_FRAME_SRC', 'https://www.youtube.com https://player.vimeo.com');

    const d = buildCspDirectives();
    expect(d.frameSrc).toContain('https://www.youtube.com');
    expect(d.frameSrc).toContain('https://player.vimeo.com');
  });

  it('appends CSP_EXTRA_CONNECT_SRC origins to connect-src', () => {
    vi.stubEnv('CSP_EXTRA_CONNECT_SRC', 'https://api.openai.com');

    const d = buildCspDirectives();
    expect(d.connectSrc).toContain('https://api.openai.com');
  });

  it('appends CSP_EXTRA_FONT_SRC origins to font-src', () => {
    vi.stubEnv('CSP_EXTRA_FONT_SRC', 'https://fonts.gstatic.com');

    const d = buildCspDirectives();
    expect(d.fontSrc).toContain('https://fonts.gstatic.com');
  });

  it('handles extra-origins env vars with multiple whitespace separators', () => {
    vi.stubEnv('CSP_EXTRA_SCRIPT_SRC', '  https://a.com  \n  https://b.com   ');

    const d = buildCspDirectives();
    expect(d.scriptSrc).toContain('https://a.com');
    expect(d.scriptSrc).toContain('https://b.com');
  });

  it('ignores empty extra-origins env vars', () => {
    vi.stubEnv('CSP_EXTRA_SCRIPT_SRC', '');

    const d = buildCspDirectives();
    // Only the two defaults: 'self' and 'unsafe-inline'
    expect(d.scriptSrc).toEqual(["'self'", "'unsafe-inline'"]);
  });
});

// ─── Integration ───────────────────────────────────────────────────────────

describe('buildCspHeader', () => {
  it('returns a valid single-line CSP header string', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co');
    vi.stubEnv('CSP_EXTRA_FRAME_SRC', 'https://www.youtube.com');

    const header = buildCspHeader();
    expect(header).toContain("default-src 'self'");
    expect(header).toContain('https://xyz.supabase.co');
    expect(header).toContain('https://www.youtube.com');
    expect(header).not.toContain('\n');
  });
});
