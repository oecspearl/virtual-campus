/**
 * Content Security Policy builder.
 *
 * CSP directives were previously hardcoded in addSecurityHeaders(), which
 * was brittle across deployments — swapping editor, removing YouTube, using
 * a self-hosted font server, etc. all required editing code. This module
 * takes a base CSP (safe defaults that preserve the original behaviour) and
 * allows each deployment to extend individual directives via environment
 * variables.
 *
 * Env vars (all optional, space-separated origins):
 *   CSP_EXTRA_SCRIPT_SRC
 *   CSP_EXTRA_STYLE_SRC
 *   CSP_EXTRA_FONT_SRC
 *   CSP_EXTRA_IMG_SRC
 *   CSP_EXTRA_MEDIA_SRC
 *   CSP_EXTRA_CONNECT_SRC
 *   CSP_EXTRA_FRAME_SRC
 *   CSP_EXTRA_WORKER_SRC
 */

export interface CspDirectives {
  scriptSrc: string[];
  styleSrc: string[];
  fontSrc: string[];
  imgSrc: string[];
  mediaSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  workerSrc: string[];
}

/**
 * Parse a space-separated origins env var into a list.
 * Empty / unset env vars return an empty array.
 */
function parseEnvOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Derive the Supabase origin(s) from NEXT_PUBLIC_SUPABASE_URL so the
 * CSP targets the specific project instead of `*.supabase.co` (which
 * would permit connections to any Supabase project).
 *
 * Returns `[]` when the env var is unset or malformed — the caller can
 * decide whether to fall back to a wildcard.
 */
function deriveSupabaseOrigins(): { https: string[]; ws: string[] } {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return { https: [], ws: [] };

  try {
    const url = new URL(raw);
    const host = url.host;
    return {
      https: [`https://${host}`],
      ws: [`wss://${host}`],
    };
  } catch {
    return { https: [], ws: [] };
  }
}

/**
 * Build the full set of CSP directives from safe defaults + env-var extras.
 * Exported for testability.
 */
export function buildCspDirectives(): CspDirectives {
  const supabase = deriveSupabaseOrigins();

  // When the Supabase env var isn't set (e.g. local smoke tests, build-time
  // static analysis), fall back to the wildcard so the app doesn't simply
  // break. Production deployments always have the env var set.
  const supabaseHttpsOrigins = supabase.https.length > 0 ? supabase.https : ['https://*.supabase.co'];
  const supabaseWsOrigins = supabase.ws.length > 0 ? supabase.ws : ['wss://*.supabase.co'];

  return {
    scriptSrc: ["'self'", "'unsafe-inline'", ...parseEnvOrigins(process.env.CSP_EXTRA_SCRIPT_SRC)],
    styleSrc: ["'self'", "'unsafe-inline'", ...parseEnvOrigins(process.env.CSP_EXTRA_STYLE_SRC)],
    fontSrc: ["'self'", 'data:', ...parseEnvOrigins(process.env.CSP_EXTRA_FONT_SRC)],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:', ...parseEnvOrigins(process.env.CSP_EXTRA_IMG_SRC)],
    mediaSrc: ["'self'", 'blob:', 'https:', ...parseEnvOrigins(process.env.CSP_EXTRA_MEDIA_SRC)],
    connectSrc: [
      "'self'",
      ...supabaseHttpsOrigins,
      ...supabaseWsOrigins,
      ...parseEnvOrigins(process.env.CSP_EXTRA_CONNECT_SRC),
    ],
    frameSrc: ["'self'", ...parseEnvOrigins(process.env.CSP_EXTRA_FRAME_SRC)],
    workerSrc: ["'self'", 'blob:', ...parseEnvOrigins(process.env.CSP_EXTRA_WORKER_SRC)],
  };
}

/**
 * Serialize a CspDirectives object into the `Content-Security-Policy`
 * header value.
 */
export function serializeCsp(directives: CspDirectives): string {
  return [
    `default-src 'self'`,
    `script-src ${directives.scriptSrc.join(' ')}`,
    `style-src ${directives.styleSrc.join(' ')}`,
    `font-src ${directives.fontSrc.join(' ')}`,
    `img-src ${directives.imgSrc.join(' ')}`,
    `media-src ${directives.mediaSrc.join(' ')}`,
    `connect-src ${directives.connectSrc.join(' ')}`,
    `frame-src ${directives.frameSrc.join(' ')}`,
    `worker-src ${directives.workerSrc.join(' ')}`,
  ].join('; ');
}

/**
 * Build the CSP header string for the current deployment.
 * Convenience wrapper that combines buildCspDirectives + serializeCsp.
 */
export function buildCspHeader(): string {
  return serializeCsp(buildCspDirectives());
}
