import type { ActivityModule } from '../types';

export const assignmentActivity: ActivityModule = {
  id: 'assignment',
  name: 'Assignment',
  description:
    'File / text submission graded by an instructor; feeds the gradebook.',
  capabilities: {
    gradable: true,
    completion: true,
    attempts: false,
    requires_content: false,
    has_native_renderer: true,
  },
};
