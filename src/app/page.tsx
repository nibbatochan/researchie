'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { ShareProjectModal } from '@/components/ShareProjectModal';
import { ResearchProject, ResearchAtom, AtomType, ProjectSharingSettings } from '@/lib/types/research';
import { withPinned, savePinned } from '@/lib/atoms/pin';

export default function DashboardPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [atoms, setAtoms] = useState<ResearchAtom[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingAtoms, setLoadingAtoms] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'dashboard' | 'feed' | 'canvas' | 'reader'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [targetDocId, setTargetDocId] = useState<string | undefined>(undefined);
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined);
  const [targetHighlightText, setTargetHighlightText] = useState<string | undefined>(undefined);

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
              prev.every((p, idx) => p.id === json.data[idx]?.id && p.atomCount === json.data[idx]?.atomCount && p.title === json.data[idx]?.title)
            ) {
              return prev;
            }
            return json.data;
          });
          setActiveProjectId((prev) => {
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

  // Fetch Atoms for Active Project
  const fetchAtoms = useCallback(async (projId: string, background = false) => {
    if (!background) setLoadingAtoms(true);
    try {
      const url = projId === 'all' ? '/api/atoms' : `/api/atoms?projectId=${encodeURIComponent(projId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
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
      console.error('Failed to load atoms:', err);
    } finally {
      if (!background) setLoadingAtoms(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // When activeProjectId changes, fetch its atoms
  useEffect(() => {
    if (activeProjectId) {
      fetchAtoms(activeProjectId);
    }
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

  // 2.5-Second Auto-Sync Polling for Real-Time Extension Updates & Project Counts
  useEffect(() => {
    if (!activeProjectId) return;

    const interval = setInterval(() => {
      fetchAtoms(activeProjectId, true);
      // Also refresh projects count in background
      fetch('/api/projects')
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
    }, 2500);

    return () => clearInterval(interval);
  }, [activeProjectId, fetchAtoms]);

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

  const handleOpenShareModal = (proj?: ResearchProject | null) => {
    const target = proj || activeProject;
    if (target && target.id !== 'all') {
      setSharingProject(target);
      setIsShareModalOpen(true);
    }
  };

  const handleUpdateSharing = async (projectId: string, settings: ProjectSharingSettings) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, sharing: settings } : p))
    );
    if (sharingProject && sharingProject.id === projectId) {
      setSharingProject((prev) => (prev ? { ...prev, sharing: settings } : null));
    }
    try {
      await fetch(`/api/share/${encodeURIComponent(projectId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error('Failed to sync sharing settings:', err);
    }
  };

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
    <div className="flex flex-col h-screen overflow-hidden bg-[#EAEEF4] dark:bg-[#09090B] text-[#0F172A] dark:text-[#FAFAFA] transition-colors">
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
        />

        {/* Dynamic Main Workspace View */}
        {workspaceMode === 'dashboard' ? (
          <DashboardHome
            projects={projects}
            atoms={atoms}
            onSelectProject={(id, mode = 'feed') => handleSelectProject(id, mode)}
            onOpenCreateModal={handleOpenCreateModal}
            onDeleteProject={handleRequestDeleteProject}
            onOpenShareModal={(proj) => handleOpenShareModal(proj)}
            onOpenDocuments={() => {
              setWorkspaceMode('reader');
            }}
          />
        ) : (
          <ProjectTimeline
            project={activeProject}
            atoms={atoms}
            loading={loadingAtoms}
            onDeleteAtom={handleDeleteAtom}
            onTogglePin={handleTogglePin}
            onOpenManualModal={() => setIsManualClipOpen(true)}
            onCreateAtom={handleCreateAtom}
            workspaceMode={workspaceMode}
            onWorkspaceModeChange={(mode) => setWorkspaceMode(mode)}
            targetDocId={targetDocId}
            targetPage={targetPage}
            targetHighlightText={targetHighlightText}
            onOpenPdfReader={handleOpenPdfReader}
            onOpenTrashModal={() => setIsTrashModalOpen(true)}
            trashCount={deletedAtomsHistory.length}
            onOpenShareModal={() => handleOpenShareModal(activeProject)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          />
        )}
      </div>

      {/* Modals & Safeguards */}
      <ShareProjectModal
        isOpen={isShareModalOpen}
        project={sharingProject}
        onClose={() => setIsShareModalOpen(false)}
        onUpdateSharing={handleUpdateSharing}
      />
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
        durationMs={8000}
      />

      {/* Authentication & Social Login Modal */}
      <AuthModal />

      {/* Workspace & Engine Settings Modal */}
      <SettingsModal atoms={atoms} projects={projects} />
    </div>
  );
}
