import type { ActivityModule } from '../types';

export const videoActivity: ActivityModule = {
  id: 'video',
  name: 'Video',
  description: 'Video-first lesson with optional supporting text.',
  capabilities: {
    gradable: false,
    completion: true,
    attempts: false,
    requires_content: true,
    has_native_renderer: true,
  },
};
