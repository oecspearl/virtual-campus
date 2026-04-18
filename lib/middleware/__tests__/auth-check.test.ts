import { describe, it, expect } from 'vitest';
import { isExemptFromAuth, isPublicPath } from '../auth-check';

describe('isExemptFromAuth', () => {
  it('exempts API routes (auth happens inside handlers)', () => {
    expect(isExemptFromAuth('/api/courses')).toBe(true);
    expect(isExemptFromAuth('/api/auth/signin')).toBe(true);
  });

  it('exempts Next.js internals', () => {
    expect(isExemptFromAuth('/_next/static/chunks/main.js')).toBe(true);
    expect(isExemptFromAuth('/_next/image')).toBe(true);
  });

  it('exempts PWA and service worker assets', () => {
    expect(isExemptFromAuth('/service-worker.js')).toBe(true);
    expect(isExemptFromAuth('/manifest.json')).toBe(true);
    expect(isExemptFromAuth('/site.webmanifest')).toBe(true);
  });

  it('exempts favicons and PNG assets', () => {
    expect(isExemptFromAuth('/favicon.ico')).toBe(true);
    expect(isExemptFromAuth('/favicon-32x32.png')).toBe(true);
    expect(isExemptFromAuth('/icon-192.png')).toBe(true);
    expect(isExemptFromAuth('/apple-icon')).toBe(true);
  });

  it('does NOT exempt page routes', () => {
    expect(isExemptFromAuth('/dashboard')).toBe(false);
    expect(isExemptFromAuth('/courses')).toBe(false);
    expect(isExemptFromAuth('/admin/users')).toBe(false);
  });
});

describe('isPublicPath', () => {
  it('allows root and common unauthenticated pages', () => {
    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/about')).toBe(true);
    expect(isPublicPath('/contact')).toBe(true);
    expect(isPublicPath('/blog')).toBe(true);
    expect(isPublicPath('/events')).toBe(true);
    expect(isPublicPath('/offline')).toBe(true);
    expect(isPublicPath('/suspended')).toBe(true);
  });

  it('allows all auth paths', () => {
    expect(isPublicPath('/auth/signin')).toBe(true);
    expect(isPublicPath('/auth/signup')).toBe(true);
    expect(isPublicPath('/auth/reset-password')).toBe(true);
    expect(isPublicPath('/auth/callback/anything')).toBe(true);
  });

  it('allows /apply and /admissions subtrees', () => {
    expect(isPublicPath('/apply')).toBe(true);
    expect(isPublicPath('/apply/campaign-123')).toBe(true);
    expect(isPublicPath('/admissions')).toBe(true);
    expect(isPublicPath('/admissions/form-456')).toBe(true);
  });

  it('does NOT allow authenticated-only pages', () => {
    expect(isPublicPath('/dashboard')).toBe(false);
    expect(isPublicPath('/courses')).toBe(false);
    expect(isPublicPath('/admin/users')).toBe(false);
    expect(isPublicPath('/profile')).toBe(false);
  });
});
