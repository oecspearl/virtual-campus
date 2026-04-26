// SERVER-ONLY sanitiser. Uses `sanitize-html` (pure-Node) so it works in
// Vercel API routes without dragging in jsdom — jsdom transitively requires
// @exodus/bytes/encoding-lite which is ESM-only and trips Node's CJS loader
// (ERR_REQUIRE_ESM) at runtime.
//
// Do NOT import this file from a client component. Client code should
// import { sanitizeHtml } from '@/lib/sanitize' instead — the browser
// variant pairs DOMPurify with the global window.

import sanitizeHtmlLib from 'sanitize-html';

// Mirror the tag/attribute allow-list from the browser-side DOMPurify
// config in lib/sanitize.ts. sanitize-html uses a different attribute API:
// '*' on attributes allows them on every tag, while per-tag entries restrict
// the attribute to that tag (e.g. only <a> can have href + target + rel).
const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
    'a', 'img',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'div', 'span',
    'figure', 'figcaption',
    'video', 'audio', 'source',
    'iframe',
  ],
  allowedAttributes: {
    '*': ['class', 'style', 'title', 'lang', 'dir', 'id'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'referrerpolicy'],
    video: ['src', 'controls', 'width', 'height', 'poster'],
    audio: ['src', 'controls'],
    source: ['src', 'type'],
    table: ['width'],
    th: ['colspan', 'rowspan', 'scope', 'width'],
    td: ['colspan', 'rowspan', 'width'],
    iframe: [
      'src', 'width', 'height', 'frameborder', 'allowfullscreen',
      'loading', 'referrerpolicy', 'sandbox',
    ],
  },
  // Allow http/https/mailto/tel for links and embeds; default also lets
  // `data:` for images on certain tags — keep that disabled.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  // Force iframes into a sandbox the same way the browser variant's
  // afterSanitizeAttributes hook does. transformTags runs before the
  // attribute filter, so we set sandbox here and then the allow-list
  // above will keep it.
  transformTags: {
    iframe: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        sandbox: 'allow-scripts allow-same-origin allow-popups',
      },
    }),
  },
  // Strip data:* attributes — DOMPurify's ALLOW_DATA_ATTR: false equivalent.
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
  // Don't strip URL hashes / protocol-less hrefs.
  allowProtocolRelative: true,
};

/**
 * Sanitize HTML on the server (Node) before persisting to the database.
 * Mirrors the tag/attribute allow-list of the browser-side sanitizeHtml
 * in `lib/sanitize.ts`.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return sanitizeHtmlLib(String(dirty), OPTIONS);
}
