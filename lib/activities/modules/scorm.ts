import type { ActivityModule } from '../types';

export const scormActivity: ActivityModule = {
  id: 'scorm',
  name: 'SCORM package',
  description:
    'SCORM 1.2 / 2004 package launched in an iframe; reports completion and score back to the LMS.',
  capabilities: {
    gradable: true,
    completion: true,
    attempts: true,
    requires_content: false,
    has_native_renderer: true,
  },
};
