'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { CAPTION_OUTPUT_MODES } from '@/types/project';
import { projectsApi } from '@/lib/api/projects';
import {
  RecentProject,
  editorHref,
  getRecentProjects,
  markRecentProjectOpened,
  removeRecentProject,
  subscribeRecentProjects,
} from '@/lib/recentProjects';

type SortKey = 'recent' | 'newest' | 'name';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-500 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10]';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#262D36] bg-[#151A21] px-5 py-3 text-sm font-semibold text-[#E8ECF2] transition-colors hover:bg-[#1B2129] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400';

function languageName(code: string) {
  return CAPTION_OUTPUT_MODES.find((m) => m.id === code)?.name || code.toUpperCase();
}

function relativeTime(iso?: string) {
  if (!iso) return '';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'just now';
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function ProjectCard({
  project,
  index,
  onOpen,
  onRemove,
}: {
  project: RecentProject;
  index: number;
  onOpen: (p: RecentProject) => void;
  onRemove: (p: RecentProject) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const duration = formatDuration(project.duration);
  const size = formatSize(project.fileSize);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen]);

  return (
    <li
      className="group relative flex flex-col rounded-2xl border border-[#262D36] bg-[#151A21] transition-colors hover:border-[#36404D] animate-slide-up motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: 'both' }}
    >
      {/* Preview area (no server thumbnails exist yet, so show a neutral frame with real metadata) */}
      <Link
        href={editorHref(project)}
        onClick={() => onOpen(project)}
        className="relative block h-32 overflow-hidden rounded-t-2xl border-b border-[#262D36] bg-[linear-gradient(160deg,#1F2631_0%,#12161C_100%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
        aria-label={`Open ${project.name} in the editor`}
      >
        <div className="absolute inset-x-6 bottom-5 flex gap-1" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-white/15" />
          <span className="h-1.5 w-16 rounded-full bg-primary-500/50" />
          <span className="h-1.5 w-8 rounded-full bg-white/15" />
        </div>
        <span className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
          {languageName(project.language)}
        </span>
        {duration && (
          <span className="absolute right-3 top-3 rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-white/80 backdrop-blur-sm">
            {duration}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
            <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </Link>

      <div className="flex flex-1 items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[#F2F4F7]" title={project.name}>
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-[#7C8696]">
            {project.lastOpenedAt ? `Opened ${relativeTime(project.lastOpenedAt)}` : `Uploaded ${relativeTime(project.createdAt)}`}
            {size && <span> · {size}</span>}
          </p>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C8696] transition-colors hover:bg-[#1B2129] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            aria-label={`More actions for ${project.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute bottom-11 right-0 z-20 w-48 rounded-xl border border-[#262D36] bg-[#1B2129] p-1 shadow-xl animate-fade-in"
            >
              <Link
                role="menuitem"
                href={editorHref(project)}
                onClick={() => onOpen(project)}
                className="block rounded-lg px-3 py-2.5 text-sm text-[#E8ECF2] hover:bg-white/[0.06]"
              >
                Open in editor
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onRemove(project);
                }}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-950/40"
              >
                Remove from list
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonCard() {
  return (
    <li className="overflow-hidden rounded-2xl border border-[#262D36] bg-[#151A21]" aria-hidden="true">
      <div className="h-32 animate-pulse bg-[#1B2129]" />
      <div className="space-y-2 p-4">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#1B2129]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[#1B2129]" />
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<RecentProject[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [pendingRemoval, setPendingRemoval] = useState<RecentProject | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const local = getRecentProjects(user.id);
      setProjects(local);
      setLoadError(null);

      // Fetch projects from Supabase via backend API
      try {
        const res = await projectsApi.list();
        if (res.data?.projects) {
          const dbProjects: RecentProject[] = res.data.projects.map((p) => ({
            id: p.id,
            name: p.name,
            filename: p.filename || `${p.name}.mp4`,
            language: p.language,
            duration: p.duration ?? null,
            fileSize: p.file_size,
            createdAt: p.created_at || new Date().toISOString(),
          }));

          const mergedMap = new Map<string, RecentProject>();
          dbProjects.forEach((p) => mergedMap.set(p.id, p));
          local.forEach((lp) => {
            if (mergedMap.has(lp.id)) {
              mergedMap.set(lp.id, { ...mergedMap.get(lp.id)!, ...lp });
            } else {
              mergedMap.set(lp.id, lp);
            }
          });
          setProjects(Array.from(mergedMap.values()));
        }
      } catch (apiErr) {
        // Fall back gracefully to local device list
        console.debug('Projects API fetch error, using local storage cache', apiErr);
      }
    } catch {
      setLoadError('Your project list could not be read from this browser.');
      setProjects([]);
    }
  }, [user]);

  useEffect(() => {
    load();
    return subscribeRecentProjects(load);
  }, [load]);

  const visible = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? projects.filter((p) => p.name.toLowerCase().includes(q) || languageName(p.language).toLowerCase().includes(q))
      : projects;
    const ts = (p: RecentProject) => new Date(p.lastOpenedAt || p.createdAt).getTime();
    return [...filtered].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'newest'
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : ts(b) - ts(a)
    );
  }, [projects, query, sort]);

  const latest = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return [...projects].sort(
      (a, b) => new Date(b.lastOpenedAt || b.createdAt).getTime() - new Date(a.lastOpenedAt || a.createdAt).getTime()
    )[0];
  }, [projects]);

  const handleOpen = (p: RecentProject) => {
    if (user) markRecentProjectOpened(user.id, p.id);
  };

  const confirmRemoval = async () => {
    if (user && pendingRemoval) {
      removeRecentProject(user.id, pendingRemoval.id);
      try {
        await projectsApi.delete(pendingRemoval.id);
      } catch (err) {
        console.warn('Could not delete project from database', err);
      }
    }
    setPendingRemoval(null);
  };

  const hasProjects = !!projects && projects.length > 0;
  const showTools = !!projects && projects.length > 3;

  return (
    <AppShell>
      <div className="space-y-10 pb-[env(safe-area-inset-bottom)]">
        {/* Welcome */}
        <section className="animate-slide-up motion-reduce:animate-none">
          <h2 className="text-2xl font-semibold tracking-tight text-[#F5F7FA] sm:text-3xl">
            Ready to create your next video?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9AA4B2] sm:text-[15px]">
            Upload a video and captions are generated automatically. You can then pick a style, adjust the text, and
            export a finished MP4.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/upload" className={btnPrimary}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
              </svg>
              Create Video
            </Link>
            {latest && (
              <Link href={editorHref(latest)} onClick={() => handleOpen(latest)} className={btnSecondary}>
                <span className="truncate">Continue “{latest.name}”</span>
              </Link>
            )}
          </div>
        </section>

        {/* Projects */}
        <section aria-labelledby="projects-heading" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="projects-heading" className="text-lg font-semibold text-[#F2F4F7]">
                Your projects
              </h3>
              <p className="mt-0.5 text-xs text-[#7C8696]">
                Videos you have uploaded from this browser.
              </p>
            </div>
            {showTools && (
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                  <span className="sr-only">Search projects</span>
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search projects"
                    className="input-base w-full py-2 pl-9 text-sm"
                  />
                </label>
                <label className="shrink-0">
                  <span className="sr-only">Sort projects</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="input-base h-full py-2 pr-8 text-sm"
                  >
                    <option value="recent">Recently opened</option>
                    <option value="newest">Newest upload</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {loadError && (
            <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button size="sm" variant="secondary" onClick={load}>
                Try again
              </Button>
            </div>
          )}

          {projects === null ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading projects">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </ul>
          ) : hasProjects ? (
            visible.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} onOpen={handleOpen} onRemove={setPendingRemoval} />
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-[#262D36] p-8 text-center text-sm text-[#9AA4B2]">
                No projects match “{query}”.
              </p>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-[#2E3744] bg-[#11151A] px-5 py-10 text-center sm:px-10 sm:py-14 animate-fade-in motion-reduce:animate-none">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#262D36] bg-[#151A21] text-primary-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="mt-4 text-base font-semibold text-[#F2F4F7]">No projects yet</h4>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#9AA4B2]">
                Videos you create will appear here.
              </p>
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={!!pendingRemoval}
        onClose={() => setPendingRemoval(null)}
        title="Remove from your list?"
        description={pendingRemoval ? `“${pendingRemoval.name}” will no longer appear on this dashboard.` : undefined}
      >
        <p className="text-sm text-[#9AA4B2]">
          Only the shortcut in this browser is removed. The uploaded video itself is not deleted.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setPendingRemoval(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRemoval}>
            Remove
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
