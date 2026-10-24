/**
 * Storage helpers for managing soft-deleted JumpLeague module IDs in localStorage.
 * Acts as an offline/instant-load backup so deleted default/mock modules never
 * reappear after a page reload (Cmd+R), even before Supabase responds.
 */

export const DELETED_MODULES_STORAGE_KEY = 'jumpleague_deleted_modules';

/**
 * Reads the list of deleted module IDs from localStorage.
 */
export function getLocalDeletedModuleIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_MODULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Persists an iterable of deleted module IDs to localStorage (deduplicated).
 */
export function saveLocalDeletedModuleIds(ids: Iterable<string>): void {
  if (typeof window === 'undefined') return;
  try {
    const unique = Array.from(new Set(ids));
    localStorage.setItem(DELETED_MODULES_STORAGE_KEY, JSON.stringify(unique));
  } catch (err) {
    console.warn('[Storage] Failed to save deleted module IDs to localStorage:', err);
  }
}

/**
 * Adds a single module ID to the deleted modules list in localStorage.
 */
export function addLocalDeletedModuleId(id: string): void {
  const current = getLocalDeletedModuleIds();
  if (!current.includes(id)) {
    current.push(id);
    saveLocalDeletedModuleIds(current);
  }
}

/**
 * Removes module IDs from the deleted modules list in localStorage (e.g. for restore).
 */
export function removeLocalDeletedModuleIds(idsToRemove: Iterable<string>): void {
  const toRemove = new Set(idsToRemove);
  const current = getLocalDeletedModuleIds();
  const next = current.filter((id) => !toRemove.has(id));
  saveLocalDeletedModuleIds(next);
}
