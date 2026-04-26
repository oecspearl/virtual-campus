import DOMPurify from "dompurify";

// This file is the BROWSER-side sanitiser used by client components and
// rich-text editors. dompurify auto-initialises against the global window
// in the browser, so the default import gives us a working instance.
//
// For server-side sanitisation (API routes), import `sanitizeHtml` from
// `@/lib/sanitize-server` instead — that variant pairs DOMPurify with
// jsdom so it works in Node where there's no global window.

// Register the iframe sandbox hook ONCE at module load (not per call)
let hookRegistered = false;

function ensureHook() {
  if (hookRegistered) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'IFRAME') {
      node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
      node.removeAttribute('allow');
      node.removeAttribute('allowfullscreen');
    }
  });
  hookRegistered = true;
}

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe HTML tags (formatting, links, images, tables) but strips scripts and event handlers.
 * Iframes are sandboxed to prevent full page access.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";

  ensureHook();

  return DOMPurify.sanitize(String(dirty), {
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
