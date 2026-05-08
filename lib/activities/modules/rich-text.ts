import type { ActivityModule } from '../types';

export const richTextActivity: ActivityModule = {
  id: 'rich_text',
  name: 'Rich text',
  description: 'Authored content with text, images, embeds, and inline media.',
  capabilities: {
    gradable: false,
    completion: true,
    attempts: false,
    requires_content: true,
    has_native_renderer: true,
  },
};

// `text` is a legacy alias for rich_text. The lesson renderer treats them
// identically; we register both so old data doesn't 404 the registry.
export const textLegacyActivity: ActivityModule = {
  ...richTextActivity,
  id: 'text',
  name: 'Text (legacy)',
  description: 'Legacy text type. Treated as rich_text by the renderer.',
};
