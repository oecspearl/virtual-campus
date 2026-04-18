import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS — enforce HTTPS for 1 year including subdomains
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy
  // Note: 'unsafe-inline' for styles is required by Tailwind CSS and dynamic style props.
  // 'unsafe-eval' is required by TinyMCE editor — restrict to its CDN domain.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.tiny.cloud",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://*.google.com",
      "worker-src 'self' blob:",
    ].join('; ')
  );
  
  return response;
}

export function validateCSRFToken(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // No origin header = same-origin request (browsers always send origin for cross-origin)
  if (!origin) return true;

  // For development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    return origin.includes('localhost') || origin.includes('127.0.0.1');
  }

  // In production, validate origin against known hosts
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    host ? `https://${host}` : null,
  ].filter(Boolean) as string[];

  return allowedOrigins.some(allowed => origin === allowed);
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof key === 'string' && key.length < 50) { // Limit key length
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  return input;
}

export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return addSecurityHeaders(response);
}
