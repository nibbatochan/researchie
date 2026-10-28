'use client';

// The clips of a paper's data-source project (the project and its sub-projects), for the editor's sidebar and for
// drawing citation markers. A project the person can no longer read gives an empty list and a message.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ResearchAtom, ResearchProject } from '../types/research';
import { buildClipInfos } from './clipInfo.ts';

export function useProjectClips(projectId: string | null) {
  const [atoms, setAtoms] = useState<ResearchAtom[]>([]);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!projectId) {
      setAtoms([]);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/atoms?projectId=${encodeURIComponent(projectId)}`, { credentials: 'same-origin', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.data)) {
        setAtoms(json.data);
        setError('');
      } else {
        setAtoms([]);
        setError(json.error || 'The clips could not be loaded.');
      }
    } catch {
      setAtoms([]);
      setError('The clips could not be loaded. Check your connection.');
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const infos = useMemo(() => buildClipInfos(atoms), [atoms]);
  return { atoms, infos, loading, error, reload: load };
}

/** The person's projects, for choosing a data source. */
export function useProjectList() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  useEffect(() => {
    let live = true;
    fetch('/api/projects', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (live && Array.isArray(j.data)) setProjects(j.data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return projects;
}
