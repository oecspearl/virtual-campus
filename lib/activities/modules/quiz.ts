import type { ActivityModule } from '../types';

export const quizActivity: ActivityModule = {
  id: 'quiz',
  name: 'Quiz',
  description:
    'Auto-graded quiz built from question banks; feeds the gradebook.',
  capabilities: {
    gradable: true,
    completion: true,
    attempts: true,
    requires_content: false,
    has_native_renderer: true,
  },
};
