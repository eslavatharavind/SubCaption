/**
 * Device-local list of projects the signed-in user has created in this browser.
 *
 * The backend does not yet persist a per-user project list (GET /api/projects is a
 * placeholder), so the dashboard reads from here. Entries are keyed by Supabase user id.
 * Removing an entry only forgets it on this device; it never deletes files on the server.
 */

export interface RecentProject {
  id: string;
  name: string;
  filename: string;
  language: string;
  fileSize?: number;
  duration?: number | null;
  createdAt: string;
  lastOpenedAt?: string;
}

const KEY_PREFIX = 'cc_recent_projects_v1:';
const CHANGE_EVENT = 'cc-recent-projects-change';
const MAX_ENTRIES = 100;

const storageKey = (userId: string) => `${KEY_PREFIX}${userId}`;

function isRecentProject(v: any): v is RecentProject {
  return v && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.createdAt === 'string';
}

export function getRecentProjects(userId: string): RecentProject[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecentProject) : [];
  } catch {
    return [];
  }
}

function save(userId: string, list: RecentProject[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(list.slice(0, MAX_ENTRIES)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addRecentProject(userId: string, project: RecentProject) {
  try {
    const rest = getRecentProjects(userId).filter((p) => p.id !== project.id);
    save(userId, [project, ...rest]);
  } catch {
    // Storage full or unavailable: the upload itself still succeeded, so fail silently.
  }
}

export function markRecentProjectOpened(userId: string, id: string) {
  try {
    const list = getRecentProjects(userId).map((p) =>
      p.id === id ? { ...p, lastOpenedAt: new Date().toISOString() } : p
    );
    save(userId, list);
  } catch {}
}

export function removeRecentProject(userId: string, id: string) {
  save(userId, getRecentProjects(userId).filter((p) => p.id !== id));
}

export function subscribeRecentProjects(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith(KEY_PREFIX)) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

/** Same URL shape the upload flow uses to open the editor. */
export function editorHref(p: Pick<RecentProject, 'id' | 'filename' | 'language'>) {
  return `/editor/${p.id}?filename=${encodeURIComponent(p.filename)}&language=${encodeURIComponent(p.language)}`;
}
