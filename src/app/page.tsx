'use client';

import dynamic from 'next/dynamic';
import { PaperWorkspace } from '@/components/PaperWorkspace';
import type { Paper } from '@/lib/data/papers';

// The paper editor (ProseMirror, KaTeX) is its own chunk, loaded when the person opens a paper.
const PaperEditor = dynamic(() => import('@/components/PaperEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center text-xs text-slate-500" aria-busy="true">Opening paper…</div>,
});
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectList } from '@/components/ProjectList';
import { ProjectTimeline } from '@/components/ProjectTimeline';
import { DashboardHome } from '@/components/DashboardHome';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ManualClipModal } from '@/components/ManualClipModal';
import { ExtensionGuideModal } from '@/components/ExtensionGuideModal';
import { DeleteProjectSafeguardModal } from '@/components/DeleteProjectSafeguardModal';
import { TrashModal } from '@/components/TrashModal';
import { UndoToast } from '@/components/UndoToast';
import { AuthModal } from '@/components/AuthModal';
import { SettingsModal } from '@/components/SettingsModal';
import { ShareAccessModal } from '@/components/ShareAccessModal';
import { useAuth } from '@/lib/auth/authContext';
import { ResearchProject, ResearchAtom, AtomType } from '@/lib/types/research';
import { withPinned, savePinned } from '@/lib/atoms/pin';

export default function DashboardPage() {
  const { authRequired, user } = useAuth();
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [atoms, setAtoms] = useState<ResearchAtom[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingAtoms, setLoadingAtoms] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'dashboard' | 'feed' | 'canvas' | 'reader' | 'papers'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // The paper open in the editor, if any. ?paper=<id> keeps it across a refresh.
  const [openPaper, setOpenPaper] = useState<{ id: string; full?: Paper } | null>(null);
  const [targetDocId, setTargetDocId] = useState<string | undefined>(undefined);
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined);
  const [targetHighlightText, setTargetHighlightText] = useState<string | undefined>(undefined);

  // Paper mode has nothing in the app sidebar to use but the theme switch, so it starts collapsed; leaving puts it back.
  const sidebarBeforePaper = useRef<boolean | null>(null);
  useEffect(() => {
    if (workspaceMode === 'papers') {
      setIsSidebarCollapsed((was) => {
        if (sidebarBeforePaper.current === null) sidebarBeforePaper.current = was;
        return true;
      });
    } else if (sidebarBeforePaper.current !== null) {
      setIsSidebarCollapsed(sidebarBeforePaper.current);
      sidebarBeforePaper.current = null;
    }
  }, [workspaceMode]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('paper');
    if (id) {
      setWorkspaceMode('papers');
      setOpenPaper({ id });
    }
  }, []);

  const showPaper = (paper: { id: string; doc?: unknown } | null) => {
    setOpenPaper(paper ? { id: paper.id, full: 'doc' in paper ? (paper as Paper) : undefined } : null);
    const url = new URL(window.location.href);
    if (paper) url.searchParams.set('paper', paper.id);
    else url.searchParams.delete('paper');
    window.history.replaceState(null, '', url);
  };

  const handleOpenPdfReader = (docId?: string, pageNumber?: number, text?: string) => {
    setTargetDocId(docId);
    setTargetPage(pageNumber || 1);
    setTargetHighlightText(text);
    setWorkspaceMode('reader');
  };

  // Modals
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createModalParentId, setCreateModalParentId] = useState<string | null>(null);
  const [isManualClipOpen, setIsManualClipOpen] = useState(false);
  const [isExtensionGuideOpen, setIsExtensionGuideOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingProject, setSharingProject] = useState<ResearchProject | null>(null);

  const userIdRef = useRef<string | undefined>(undefined);
  userIdRef.current = user?.id;

  // Fetch Projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setProjects((prev) => {
            if (
              prev.length === json.data.length &&
              prev.every((p, idx) => p.id === json.data[idx]?.id && p.atomCount === json.data[idx]?.atomCount && p.title === json.data[idx]?.title && p.role === json.data[idx]?.role && p.pendingRequests === json.data[idx]?.pendingRequests)
            ) {
              return prev;
            }
            return json.data;
          });
          try {
            if (userIdRef.current) localStorage.setItem(`researchie.projects.${userIdRef.current}`, JSON.stringify(json.data));
          } catch {
            // storage full or off: the cache is only a speed-up
          }
          // 'all' is a view, not a row in the list: keep it, or every refresh would jump to the first project.
          setActiveProjectId((prev) => {
            if (prev === 'all') return prev;
            const match = json.data.find((p: any) => p.id === prev);
            return match ? prev : json.data[0].id;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // The project on screen, and the clips already fetched for each project this visit. Opening a project again shows its
  // clips at once while a fresh copy loads. Only an answer for the project on screen may change the screen: a slow
  // answer for an earlier project must never replace the clips of this one (that made content jump between projects).
  const activeProjectRef = useRef<string | null>(null);
  activeProjectRef.current = activeProjectId;
  const atomsCache = useRef(new Map<string, ResearchAtom[]>());
  const atomsSeq = useRef(0);
  const atomsApplied = useRef(0);
  const atomsAbort = useRef<AbortController | null>(null);

  // Fetch Atoms for Active Project
  const fetchAtoms = useCallback(async (projId: string, background = false) => {
    const seq = ++atomsSeq.current;
    let signal: AbortSignal | undefined;
    if (!background) {
      atomsAbort.current?.abort(); // a project opened before this one no longer needs its answer
      atomsAbort.current = new AbortController();
      signal = atomsAbort.current.signal;
      setLoadingAtoms(true);
    }
    try {
      const url = projId === 'all' ? '/api/atoms' : `/api/atoms?projectId=${encodeURIComponent(projId)}`;
      const res = await fetch(url, { signal });
      if (res.ok) {
        const json = await res.json();
        if (projId !== activeProjectRef.current || seq < atomsApplied.current) return; // stale
        atomsApplied.current = seq;
        if (json.data && Array.isArray(json.data)) {
          atomsCache.current.set(projId, json.data);
          setAtoms((prev) => {
            if (
              prev.length === json.data.length &&
              prev.every((a, idx) => a.id === json.data[idx]?.id && a.capturedAt === json.data[idx]?.capturedAt && a.title === json.data[idx]?.title)
            ) {
              return prev;
            }
            return json.data;
          });
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error('Failed to load atoms:', err);
    } finally {
      if (!background && projId === activeProjectRef.current) setLoadingAtoms(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // The project list from the last visit (kept per account in this browser) paints at once; the fresh list replaces it
  // when it arrives. Without it the dashboard was empty until Supabase answered.
  const PROJECTS_CACHE = (id: string) => `researchie.projects.${id}`;
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(PROJECTS_CACHE(user.id));
      const cached = raw ? JSON.parse(raw) : null;
      if (Array.isArray(cached) && cached.length > 0) {
        setProjects((prev) => (prev.length > 0 ? prev : cached));
        setActiveProjectId((prev) => prev ?? cached[0].id);
        setLoadingProjects(false);
      }
    } catch {
      // no storage: the list just loads
    }
  }, [user?.id]);

  // When activeProjectId changes, fetch its atoms
  useEffect(() => {
    if (!activeProjectId) return;
    const cached = atomsCache.current.get(activeProjectId);
    setAtoms(cached ?? []); // never show the previous project's clips under this one
    void fetchAtoms(activeProjectId, Boolean(cached)); // cached clips show at once; no spinner while the fresh copy loads
  }, [activeProjectId, fetchAtoms]);

  // Global Alt+P / Option+P keyboard shortcut to enter feed from dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        if (workspaceMode === 'dashboard') {
          e.preventDefault();
          setWorkspaceMode('feed');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaceMode]);

  const handleSelectProject = (id: string, mode?: 'feed' | 'canvas' | 'reader') => {
    setActiveProjectId(id);
    if (mode) setWorkspaceMode(mode);
    else if (workspaceMode === 'dashboard') setWorkspaceMode('feed');

    if (typeof window !== 'undefined' && id !== 'all') {
      const activeProj = projects.find((p) => p.id === id);
      window.postMessage(
        {
          type: 'RESEARCHIE_SET_ACTIVE_PROJECT',
          projectId: id,
          projectTitle: activeProj?.title,
          projectDesc: activeProj?.description,
          projectColor: activeProj?.color,
        },
        '*'
      );
    }
  };

  // Background sync for clips the extension adds. Every 15 seconds, only while the tab is visible and only in a project
  // view (not the dashboard or papers), never two at once, and again as soon as the tab comes back. Project counts refresh
  // every fourth round. It used to run every 2.5 seconds everywhere, which queued requests faster than the server
  // could answer them and made every project open slower the longer the page stayed open.
  useEffect(() => {
    if (!activeProjectId || workspaceMode === 'dashboard' || workspaceMode === 'papers') return;

    let busy = false;
    let round = 0;
    const refresh = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        await fetchAtoms(activeProjectId, true);
        if (++round % 4 !== 0) return;
        await fetch('/api/projects')
        .then((r) => r.json())
        .then((j) => {
          if (j.data && Array.isArray(j.data)) {
            setProjects((prev) => {
              if (
                prev.length === j.data.length &&
                prev.every((p, idx) => p.id === j.data[idx]?.id && p.atomCount === j.data[idx]?.atomCount && p.title === j.data[idx]?.title)
              ) {
                return prev;
              }
              return j.data;
            });
          }
        })
        .catch(() => {});
      } finally {
        busy = false;
      }
    };

    const interval = setInterval(() => void refresh(), 15000);
    const onVisible = () => void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activeProjectId, workspaceMode, fetchAtoms]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeProjectId) {
      await Promise.all([fetchProjects(), fetchAtoms(activeProjectId)]);
    } else {
      await fetchProjects();
    }
    setIsRefreshing(false);
  };

  const handleCreateProject = async (newProj: {
    title: string;
    description: string;
    color_badge: string;
    folderIcon?: string;
    parentId?: string | null;
  }) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProj),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        setProjects((prev) => [json.data, ...prev]);
        setActiveProjectId(json.data.id);
        setWorkspaceMode('feed');
      }
    }
  };

  const handleCreateAtom = async (newAtom: {
    projectId: string;
    type: AtomType;
    title?: string;
    content: { text?: string; description?: string; targetUrl?: string };
    metadata?: any;
    tags?: string[];
  }) => {
    try {
      const res = await fetch('/api/atoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAtom),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setAtoms((prev) => [json.data, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to create atom:', err);
    }
  };

  // Destructive Deletion Safeguards & Trash Buffer State
  const [deletedAtomToast, setDeletedAtomToast] = useState<ResearchAtom | null>(null);
  const [deletedAtomsHistory, setDeletedAtomsHistory] = useState<{ atom: ResearchAtom; deletedAt: string }[]>([]);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ResearchProject | null>(null);

  const handleDeleteAtom = async (id: string) => {
    const targetAtom = atoms.find((a) => a.id === id);
    if (!targetAtom) return;

    // Optimistic removal + Undo buffer
    setAtoms((prev) => prev.filter((a) => a.id !== id));
    setDeletedAtomToast(targetAtom);
    setDeletedAtomsHistory((prev) => [{ atom: targetAtom, deletedAt: new Date().toISOString() }, ...prev]);

    try {
      await fetch(`/api/atoms?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete atom:', err);
    }
  };

  // Pin or unpin an atom. The card moves at once; if the save fails it goes back.
  const handleTogglePin = async (id: string, pinned: boolean) => {
    const setPin = (value: boolean) =>
      setAtoms((prev) => prev.map((a) => (a.id === id ? { ...a, metadata: withPinned(a.metadata, value) } : a)));
    setPin(pinned);
    try {
      await savePinned(id, pinned);
    } catch (err) {
      console.error('Failed to save pin:', err);
      setPin(!pinned);
    }
  };

  const handleUndoDeleteAtom = async (restoredAtom: ResearchAtom) => {
    // Restore atom to local state
    setAtoms((prev) => {
      if (prev.some((a) => a.id === restoredAtom.id)) return prev;
      return [restoredAtom, ...prev];
    });
    setDeletedAtomToast(null);
    setDeletedAtomsHistory((prev) => prev.filter((d) => d.atom.id !== restoredAtom.id));

    try {
      await fetch('/api/atoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoredAtom),
      });
    } catch (err) {
      console.error('Failed to restore atom:', err);
    }
  };

  const handleRestoreFromTrash = (atom: ResearchAtom) => {
    handleUndoDeleteAtom(atom);
  };

  const handleEmptyTrash = () => {
    setDeletedAtomsHistory([]);
    setDeletedAtomToast(null);
  };

  const handleRequestDeleteProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setProjectToDelete(target);
    }
  };

  const handleConfirmDeleteProject = async (projectId: string, moveAtomsToUnfiled = false) => {
    try {
      let moveTo: string | undefined;
      if (moveAtomsToUnfiled) {
        // Keep the clips: they go to the parent project, or to another top-level project, or to a new
        // "Unfiled clips" project when there is nothing else. The server moves them in the same request
        // that deletes the project, so none are lost between the two.
        const doomed = new Set([projectId, ...projects.filter((p) => p.parentId === projectId).map((p) => p.id)]);
        const target = projects.find((p) => p.id === projectId);
        moveTo = target?.parentId || projects.find((p) => !doomed.has(p.id) && !p.parentId)?.id;
        if (!moveTo) {
          const made = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Unfiled clips', description: 'Clips kept from a deleted project.' }),
          });
          const json = await made.json().catch(() => null);
          if (!made.ok || !json?.data?.id) throw new Error('Could not make a project to keep the clips in');
          moveTo = json.data.id as string;
          setProjects((prev) => [...prev, json.data]);
        }
      }

      const res = await fetch(
        `/api/projects?id=${encodeURIComponent(projectId)}${moveTo ? `&moveTo=${encodeURIComponent(moveTo)}` : ''}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        const doomedIds = new Set([projectId, ...projects.filter((p) => p.parentId === projectId).map((p) => p.id)]);
        setProjects((prev) => {
          const remaining = prev.filter((p) => !doomedIds.has(p.id));
          if (remaining.length > 0 && activeProjectId === projectId) {
            setActiveProjectId(remaining[0].id);
          }
          return remaining;
        });
        if (moveTo) {
          // Show the moved clips under their new project at once.
          setAtoms((prev) => prev.map((a) => (doomedIds.has(a.projectId) ? { ...a, projectId: moveTo as string } : a)));
        } else if (activeProjectId === projectId) {
          setAtoms([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleOpenCreateModal = (parentId?: string) => {
    setCreateModalParentId(parentId || null);
    setIsCreateProjectOpen(true);
  };

  // A person removes a project that was shared with them from their own list (the owner keeps it).
  const handleLeaveProject = async (id: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'remove', userId: user.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not remove it.');
      const gone = new Set([id, ...projects.filter((p) => p.parentId === id).map((p) => p.id)]);
      if (activeProjectId && gone.has(activeProjectId)) setWorkspaceMode('dashboard');
      await fetchProjects();
    } catch (e: any) {
      window.alert(e?.message || 'Could not remove the project from your list. Try again.');
    }
  };

  const handleOpenShareModal = (proj?: ResearchProject | null) => {
    const target = proj || activeProject;
    if (target && target.id !== 'all') {
      setSharingProject(target);
      setIsShareModalOpen(true);
    }
  };

  // Shared with the person as read-only: no way to add, pin or delete clips from the screen.
  const activeProject: ResearchProject | null = 
    activeProjectId === 'all'
      ? {
          id: 'all',
          userId: 'user-01',
          title: 'All Streams (Global Feed)',
          description: 'Unified live feed across all research workspaces and captured clips',
          color: '#325FEC',
          tags: ['all', 'global', 'live'],
          atomCount: atoms.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : projects.find((p) => p.id === activeProjectId) || (projects.length > 0 ? projects[0] : null);

  const subProjectsForDeletion = projectToDelete
    ? projects.filter((p) => p.parentId === projectToDelete.id)
    : [];

  return (
    <div className={`flex flex-col h-screen overflow-hidden text-[#0F172A] dark:text-[#FAFAFA] transition-colors ${workspaceMode === 'dashboard' ? 'dashboard-shell' : 'bg-[#EAEEF4] dark:bg-[#09090B]'}`}>
      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Project Sidebar */}
        <ProjectList
          projects={projects}
          atoms={atoms}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => handleSelectProject(id)}
          onOpenCreateModal={handleOpenCreateModal}
          onDeleteProject={handleRequestDeleteProject}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onOpenExtensionGuide={() => setIsExtensionGuideOpen(true)}
          workspaceMode={workspaceMode}
          onWorkspaceModeChange={(mode) => setWorkspaceMode(mode)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenProjectFromNotification={(id, share) => {
            handleSelectProject(id);
            const target = projects.find((p) => p.id === id);
            if (share && target) handleOpenShareModal(target);
          }}
          onProjectsMayHaveChanged={() => void fetchProjects()}
          onLeaveProject={authRequired ? (id) => void handleLeaveProject(id) : undefined}
        />

        {/* Dynamic Main Workspace View */}
        {workspaceMode === 'papers' ? (
          openPaper ? (
            <PaperEditor paperId={openPaper.id} initial={openPaper.full} onClose={() => showPaper(null)} />
          ) : (
            <PaperWorkspace projects={projects} defaultProjectId={activeProjectId} onOpenPaper={showPaper} />
          )
        ) : workspaceMode === 'dashboard' ? (
          <DashboardHome
            projects={projects}
            loading={loadingProjects}
            atoms={atoms}
            onSelectProject={(id, mode = 'feed') => handleSelectProject(id, mode)}
            onOpenCreateModal={handleOpenCreateModal}
            onDeleteProject={handleRequestDeleteProject}
            onOpenShareModal={authRequired ? (proj) => handleOpenShareModal(proj) : undefined}
            onOpenPapers={() => setWorkspaceMode('papers')}
            onOpenDocuments={() => {
              // 'all' makes the library list the PDFs of every project and sub-project.
              setActiveProjectId('all');
              setWorkspaceMode('reader');
            }}
          />
        ) : (
          <ProjectTimeline
            project={activeProject}
            projects={projects}
            atoms={atoms}
            loading={loadingAtoms}
            onDeleteAtom={activeProject?.role === 'viewer' ? undefined : handleDeleteAtom}
            onTogglePin={activeProject?.role === 'viewer' ? undefined : handleTogglePin}
            onOpenManualModal={activeProject?.role === 'viewer' ? undefined : () => setIsManualClipOpen(true)}
            onCreateAtom={activeProject?.role === 'viewer' ? undefined : handleCreateAtom}
            workspaceMode={workspaceMode}
            onWorkspaceModeChange={(mode) => setWorkspaceMode(mode)}
            targetDocId={targetDocId}
            targetPage={targetPage}
            targetHighlightText={targetHighlightText}
            onOpenPdfReader={handleOpenPdfReader}
            onOpenTrashModal={() => setIsTrashModalOpen(true)}
            trashCount={deletedAtomsHistory.length}
            onOpenShareModal={authRequired ? () => handleOpenShareModal(activeProject) : undefined}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          />
        )}
      </div>

      {/* Modals & Safeguards */}
      {/* Sharing exists on the accounts deployment only; locally there is one user, so no Share button. */}
      {authRequired && (
        <ShareAccessModal
          isOpen={isShareModalOpen}
          project={sharingProject}
          currentUserId={user?.id}
          onClose={() => setIsShareModalOpen(false)}
          onLeft={() => void fetchProjects()}
        />
      )}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        projects={projects}
        initialParentId={createModalParentId}
        onClose={() => {
          setIsCreateProjectOpen(false);
          setCreateModalParentId(null);
        }}
        onCreate={handleCreateProject}
      />

      {activeProjectId && (
        <ManualClipModal
          isOpen={isManualClipOpen}
          projectId={activeProjectId}
          onClose={() => setIsManualClipOpen(false)}
          onSubmit={handleCreateAtom}
        />
      )}

      <ExtensionGuideModal
        isOpen={isExtensionGuideOpen}
        onClose={() => setIsExtensionGuideOpen(false)}
      />

      {/* Project Deletion Safeguard Modal */}
      <DeleteProjectSafeguardModal
        isOpen={!!projectToDelete}
        project={projectToDelete}
        subProjects={subProjectsForDeletion}
        atoms={atoms}
        onClose={() => setProjectToDelete(null)}
        onConfirmDelete={handleConfirmDeleteProject}
      />

      {/* Recently Deleted Clips Trash Modal */}
      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        deletedAtoms={deletedAtomsHistory}
        onRestoreAtom={handleRestoreFromTrash}
        onPermanentlyDeleteAtom={(id) => {
          setDeletedAtomsHistory((prev) => prev.filter((d) => d.atom.id !== id));
        }}
        onEmptyTrash={handleEmptyTrash}
      />

      {/* Undo Floating Toast Notification */}
      <UndoToast
        deletedAtom={deletedAtomToast}
        onUndo={handleUndoDeleteAtom}
        onDismiss={() => setDeletedAtomToast(null)}
        durationMs={3000}
      />

      {/* Authentication & Social Login Modal */}
      <AuthModal />

      {/* Workspace & Engine Settings Modal */}
      <SettingsModal atoms={atoms} projects={projects} />
    </div>
  );
}
