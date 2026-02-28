import DOMPurify from "dompurify";

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe HTML tags (formatting, links, images, tables) but strips scripts and event handlers.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
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
      "frameborder", "allowfullscreen", "allow", "loading", "referrerpolicy",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
