/**
 * Activity-types registry — the live map.
 *
 * Modules call `registerActivity` from `./modules/*` (re-exported via
 * `./index.ts`). Callers use:
 *   - `getActivity(id)` for the strict lookup (throws on unknown id)
 *   - `tryGetActivity(id)` when the id is user-supplied / nullable
 *   - `listActivities()` to render the create-lesson type picker
 *   - `hasCapability(id, key)` for switch-statement replacement
 *
 * The registry is process-wide. Re-registering an id silently overwrites
 * — fine for hot-reload during dev, and the only way a registration
 * happens twice in production is if a refactor accidentally imports
 * the same module file via two paths, which we want to surface as
 * "the second wins."
 */

import type { ActivityCapabilities, ActivityModule } from './types';

const modules = new Map<string, ActivityModule>();

export function registerActivity(module: ActivityModule): void {
  modules.set(module.id, module);
}

export function getActivity(id: string): ActivityModule {
  const m = modules.get(id);
  if (!m) {
    throw new Error(`Unknown activity type: ${id}`);
  }
  return m;
}

export function tryGetActivity(
  id: string | null | undefined
): ActivityModule | null {
  if (!id) return null;
  return modules.get(id) ?? null;
}

export function listActivities(): ActivityModule[] {
  return Array.from(modules.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function hasCapability(
  id: string | null | undefined,
  key: keyof ActivityCapabilities
): boolean {
  const m = tryGetActivity(id);
  if (!m) return false;
  return m.capabilities[key];
}
