// SERVER-ONLY sanitiser. Pairs DOMPurify with jsdom so the same allow-list
// (tags, attributes, iframe-sandbox hook) used by the browser variant in
// lib/sanitize.ts can run inside Node API routes — where there's no
// `window` for DOMPurify to bind to.
//
// Do not import this file from a client component. Client code should
// import { sanitizeHtml } from '@/lib/sanitize' instead.

import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const { window } = new JSDOM('');
const purify = createDOMPurify(window as unknown as Window & typeof globalThis);

// Same iframe-sandbox hook as the browser variant — registered once at
// module load.
purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    node.removeAttribute('allow');
    node.removeAttribute('allowfullscreen');
  }
});

/**
 * Sanitize HTML on the server (Node) before persisting to the database.
 * Mirrors the browser-side sanitizeHtml in `lib/sanitize.ts` — same
 * tag/attribute allow-list and iframe-sandbox hook.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";

  return purify.sanitize(String(dirty), {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "ul", "ol", "li",
      "strong", "em", "b", "i", "u", "s", "del", "ins", "mark", "sub", "sup",
      "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "div", "span",
      "figure", "figcaption",
      "video", "audio", "source",
      "iframe",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "title", "width", "height",
      "class", "style", "colspan", "rowspan", "controls", "type",
      "frameborder", "loading", "referrerpolicy", "sandbox",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
