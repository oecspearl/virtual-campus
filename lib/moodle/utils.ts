/**
 * Decode HTML entities in XML content
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  // Replace common HTML entities
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Get text content from XML element, handling both <name> and <n> tags
 */
export function getTextContent(data: any, path: string): string {
  if (!data) return '';

  const parts = path.split('.');
  let current = data;

  for (const part of parts) {
    if (!current || typeof current !== 'object') return '';

    // Handle array access
    if (Array.isArray(current)) {
      current = current[0];
      if (!current) return '';
    }

    // Try the path directly
    if (current[part] !== undefined) {
      current = current[part];
      continue;
    }

    // Try alternative names (e.g., 'n' instead of 'name')
    if (part === 'name' && current['n'] !== undefined) {
      current = current['n'];
      continue;
    }

    // Try with underscore (some XML parsers use _ for text content)
    if (current['_'] !== undefined) {
      current = current['_'];
      continue;
    }

    return '';
  }

  // Extract text from array if needed
  if (Array.isArray(current)) {
    const first = current[0];
    // Handle text content in XML2JS format
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && first['_']) return first['_'];
    return String(first || '');
  }

  // Handle text content in XML2JS format (text is in _ property)
  if (typeof current === 'object' && current !== null && current['_'] !== undefined) {
    return String(current['_']);
  }

  // If it's already a string, return it
  if (typeof current === 'string') {
    return current;
  }

  return String(current || '');
}
