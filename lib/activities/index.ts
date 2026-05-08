/**
 * Activity-types registry — entrypoint.
 *
 * Importing this file from anywhere registers the 5 built-in activity
 * types. Future modules (forum, wiki, h5p, …) add a file under
 * `./modules/` and an additional `registerActivity` line below.
 *
 *   import '@/lib/activities';
 *   import { listActivities, hasCapability } from '@/lib/activities/registry';
 */

import { registerActivity } from './registry';
import { assignmentActivity } from './modules/assignment';
import { quizActivity } from './modules/quiz';
import { richTextActivity, textLegacyActivity } from './modules/rich-text';
import { scormActivity } from './modules/scorm';
import { videoActivity } from './modules/video';

registerActivity(richTextActivity);
registerActivity(textLegacyActivity);
registerActivity(videoActivity);
registerActivity(scormActivity);
registerActivity(quizActivity);
registerActivity(assignmentActivity);

export {
  registerActivity,
  getActivity,
  tryGetActivity,
  listActivities,
  hasCapability,
} from './registry';
export type { ActivityModule, ActivityCapabilities } from './types';
