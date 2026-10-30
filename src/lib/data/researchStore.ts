import { ResearchProject, ResearchAtom } from '../types/research';
import { RAG_PROJECT, RAG_ATOMS } from './ragResearchProject';
import { DOTS_PROJECT, DOTS_ATOMS } from './dotsResearchProject';
import fs from 'fs';
import path from 'path';

export const INITIAL_PROJECTS: ResearchProject[] = [
  // ─── Main Project 1: AI & RAG Systems ────────────────────────────
  {
    id: 'proj-ai-main',
    userId: 'user-01',
    parentId: null,
    title: 'Artificial Intelligence & RAG',
    description: 'Core research umbrella covering vector retrieval architectures, multimodal synthesis, and knowledge graph augmentation.',
    color: '#325FEC',
    tags: ['ai', 'rag', 'llm', 'vectors'],
    atomCount: 0,
    lastAccessedAt: new Date().toISOString(),
    createdAt: '2026-09-25T08:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    ...RAG_PROJECT,
    parentId: 'proj-ai-main',
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'proj-ai-graph-rag',
    userId: 'user-01',
    parentId: 'proj-ai-main',
    title: 'Graph RAG & Knowledge Graphs',
    description: 'Investigating Cognee entity extraction, hierarchical knowledge graphs, and hybrid graph-vector reranking.',
    color: '#518FFF',
    tags: ['graph-rag', 'cognee', 'triplets', 'ontologies'],
    atomCount: 0,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdAt: '2026-09-26T10:00:00Z',
    updatedAt: '2026-09-26T10:00:00Z',
  },
  {
    id: 'proj-ai-ethics',
    userId: 'user-01',
    parentId: 'proj-ai-main',
    title: 'AI Ethics, Safety & Alignment',
    description: 'Benchmarking factual grounding, hallucination guardrails, and constitutional AI moderation.',
    color: '#6366F1',
    tags: ['safety', 'alignment', 'evals', 'grounding'],
    atomCount: 0,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    createdAt: '2026-09-26T11:00:00Z',
    updatedAt: '2026-09-26T11:00:00Z',
  },

  // ─── Main Project 2: Primatology & Bioacoustics ──────────────────
  {
    id: 'proj-primatology-main',
    userId: 'user-01',
    parentId: null,
    title: 'Primatology & Ethology Studies',
    description: 'Field research on wild primate behavioral adaptations, bioacoustic signaling, and high-altitude foraging energetics.',
    color: '#0D9488',
    tags: ['primatology', 'field-study', 'bioacoustics', 'ecology'],
    atomCount: 0,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: '2026-09-26T09:00:00Z',
    updatedAt: '2026-09-26T09:00:00Z',
  },
  {
    id: 'proj-gorilla-ethology',
    userId: 'user-01',
    parentId: 'proj-primatology-main',
    title: 'Mountain Gorilla Acoustic Dynamics',
    description: 'Field study data on chest-beating acoustics, silverback dominance hierarchies, and high-altitude foraging energetics.',
    color: '#10B981',
    tags: ['primatology', 'acoustics', 'hierarchy', 'conservation'],
    atomCount: 0,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    createdAt: '2026-09-26T09:00:00Z',
    updatedAt: '2026-09-26T09:00:00Z',
  },
  DOTS_PROJECT,
];

export const INITIAL_ATOMS: ResearchAtom[] = [...RAG_ATOMS, ...DOTS_ATOMS];

const STORE_FILE = path.join(process.cwd(), '.research-store.json');

interface PersistedState {
  projects: ResearchProject[];
  atoms: ResearchAtom[];
  deletedProjectIds?: string[];
}

function loadPersistedState(): PersistedState {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.projects) && Array.isArray(data.atoms)) {
        const deletedSet = new Set<string>(Array.isArray(data.deletedProjectIds) ? data.deletedProjectIds : []);
        // Only keep projects that were not deleted
        const activeProjects = data.projects.filter((p: any) => !deletedSet.has(p.id));
        const existingProjectIds = new Set(activeProjects.map((p: any) => p.id));
        const missingProjects = INITIAL_PROJECTS.filter((p) => !existingProjectIds.has(p.id) && !deletedSet.has(p.id));
        const finalProjects = [...activeProjects, ...missingProjects];

        const initialAtomsMap = new Map(INITIAL_ATOMS.map((a) => [a.id, a]));
        const mergedAtoms = data.atoms
          .filter((a: any) => !deletedSet.has(a.projectId))
          .map((a: any) => {
            const init = initialAtomsMap.get(a.id);
            if (init) {
              return {
                ...init,
                ...a,
                content: { ...init.content, ...a.content },
                metadata: { ...init.metadata, ...a.metadata },
              };
            }
            return a;
          });

        const existingAtomIds = new Set(mergedAtoms.map((a: any) => a.id));
        const missingInitialAtoms = INITIAL_ATOMS.filter((a) => !existingAtomIds.has(a.id) && !deletedSet.has(a.projectId));
        const finalAtoms = [...mergedAtoms, ...missingInitialAtoms];

        return { 
          projects: finalProjects, 
          atoms: finalAtoms,
          deletedProjectIds: Array.from(deletedSet),
        };
      }
    }
  } catch (err) {
    console.warn('Failed to read .research-store.json:', err);
  }
  return {
    projects: [...INITIAL_PROJECTS],
    atoms: [...INITIAL_ATOMS],
    deletedProjectIds: [],
  };
}

function savePersistedState(state: PersistedState) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write .research-store.json:', err);
  }
}

// Global persistent state across Next.js dev HMR reloads
const globalStore = globalThis as unknown as {
  __RESEARCH_PROJECTS_STORE__?: ResearchProject[];
  __RESEARCH_ATOMS_STORE__?: ResearchAtom[];
  __DELETED_PROJECT_IDS__?: string[];
};

const loaded = loadPersistedState();
globalStore.__RESEARCH_PROJECTS_STORE__ = loaded.projects;
globalStore.__RESEARCH_ATOMS_STORE__ = loaded.atoms;
globalStore.__DELETED_PROJECT_IDS__ = loaded.deletedProjectIds || [];

export function getLocalProjects(): ResearchProject[] {
  const projects = globalStore.__RESEARCH_PROJECTS_STORE__ || [...INITIAL_PROJECTS];
  const atoms = globalStore.__RESEARCH_ATOMS_STORE__ || [...INITIAL_ATOMS];
  
  // Keep counts in sync
  projects.forEach((p) => {
    // Count direct atoms + children atoms if it's a parent
    const directCount = atoms.filter((a) => a.projectId === p.id).length;
    const childrenIds = projects.filter((cp) => cp.parentId === p.id).map((cp) => cp.id);
    const childrenCount = atoms.filter((a) => childrenIds.includes(a.projectId)).length;
    p.atomCount = directCount + (p.parentId ? 0 : childrenCount);
  });
  return projects;
}

export function touchProjectAccess(projectId: string): void {
  const projects = globalStore.__RESEARCH_PROJECTS_STORE__ || [...INITIAL_PROJECTS];
  const target = projects.find((p) => p.id === projectId);
  if (target) {
    target.lastAccessedAt = new Date().toISOString();
    savePersistedState({
      projects,
      atoms: globalStore.__RESEARCH_ATOMS_STORE__ || [],
    });
  }
}

export function createLocalProject(p: { 
  id?: string; 
  title: string; 
  description: string; 
  color: string; 
  tags: string[];
  parentId?: string | null;
  folderIcon?: string;
}): ResearchProject {
  const projects = globalStore.__RESEARCH_PROJECTS_STORE__ || [...INITIAL_PROJECTS];
  const newProj: ResearchProject = {
    id: p.id || `proj-${Date.now()}`,
    userId: 'user-01',
    parentId: p.parentId || null,
    folderIcon: p.folderIcon,
    title: p.title,
    description: p.description,
    color: p.color || '#325FEC',
    tags: p.tags || [],
    atomCount: 0,
    lastAccessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projects.unshift(newProj);
  globalStore.__RESEARCH_PROJECTS_STORE__ = projects;
  savePersistedState({
    projects,
    atoms: globalStore.__RESEARCH_ATOMS_STORE__ || [],
  });
  return newProj;
}

export function getLocalAtoms(projectId?: string): ResearchAtom[] {
  const atoms = globalStore.__RESEARCH_ATOMS_STORE__ || [...INITIAL_ATOMS];
  if (!projectId || projectId === 'all') {
    return atoms;
  }
  const projects = globalStore.__RESEARCH_PROJECTS_STORE__ || [...INITIAL_PROJECTS];
  const childrenIds = projects.filter((cp) => cp.parentId === projectId).map((cp) => cp.id);
  const targetIds = new Set([projectId, ...childrenIds]);
  return atoms.filter((a) => targetIds.has(a.projectId));
}

export function addLocalAtom(atomData: Partial<ResearchAtom>): ResearchAtom {
  const atoms = globalStore.__RESEARCH_ATOMS_STORE__ || [...INITIAL_ATOMS];
  const projects = globalStore.__RESEARCH_PROJECTS_STORE__ || [...INITIAL_PROJECTS];

  const newAtom: ResearchAtom = {
    id: atomData.id || `atom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    projectId: atomData.projectId || 'proj-ai-main',
    userId: atomData.userId || 'user-01',
    type: atomData.type || 'text',
    title: atomData.title || 'Captured Note',
    content: atomData.content || {},
    metadata: atomData.metadata || {
      sourceUrl: 'https://example.com',
      pageTitle: 'Web Source',
    },
    tags: atomData.tags || [],
    userNotes: atomData.userNotes || '',
    capturedAt: new Date().toISOString(),
  };

  atoms.unshift(newAtom);
  globalStore.__RESEARCH_ATOMS_STORE__ = atoms;

  // Update project atom count
  const project = projects.find((p) => p.id === newAtom.projectId);
  if (project) {
    project.atomCount = (project.atomCount || 0) + 1;
    project.updatedAt = new Date().toISOString();
  }

  savePersistedState({
    projects,
    atoms,
  });

  return newAtom;
}

export function updateLocalAtom(id: string, updates: Partial<ResearchAtom>): ResearchAtom | null {
  const atoms = globalStore.__RESEARCH_ATOMS_STORE__ || [...INITIAL_ATOMS];
  const index = atoms.findIndex((a) => a.id === id);
  if (index === -1) return null;

  // A field that is not being changed arrives as undefined (a pin request sends no title or tags). Copying
  // it over would erase the real value, so only fields that were actually given are applied.
  const given = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
  atoms[index] = {
    ...atoms[index],
    ...given,
  };

  globalStore.__RESEARCH_ATOMS_STORE__ = atoms;
  savePersistedState({
    projects: globalStore.__RESEARCH_PROJECTS_STORE__ || [],
    atoms,
  });

  return atoms[index];
}

export function deleteLocalAtom(id: string): boolean {
  const atoms = globalStore.__RESEARCH_ATOMS_STORE__ || [...INITIAL_ATOMS];
  const projects = globalStore.__RESEARCH_PROJECTS_STORE__ || [...INITIAL_PROJECTS];

  const target = atoms.find((a) => a.id === id);
  if (!target) return false;

  const nextAtoms = atoms.filter((a) => a.id !== id);
  globalStore.__RESEARCH_ATOMS_STORE__ = nextAtoms;

  const project = projects.find((p) => p.id === target.projectId);
  if (project) {
    project.atomCount = Math.max(0, (project.atomCount || 1) - 1);
    project.updatedAt = new Date().toISOString();
  }

  savePersistedState({
    projects,
    atoms: nextAtoms,
  });

  return true;
}

export function updateLocalProject(
  id: string,
  patch: { title?: string; description?: string; color?: string; folderIcon?: string | null },
): ResearchProject | null {
  const projects = getLocalProjects();
  const target = projects.find((p) => p.id === id);
  if (!target) return null;
  Object.assign(target, patch, { updatedAt: new Date().toISOString() });
  globalStore.__RESEARCH_PROJECTS_STORE__ = projects;
  savePersistedState({ projects, atoms: getLocalAtoms() });
  return target;
}

export function deleteLocalProject(id: string): boolean {
  const projects = globalStore.__RESEARCH_PROJECTS_STORE__ || [...INITIAL_PROJECTS];
  const atoms = globalStore.__RESEARCH_ATOMS_STORE__ || [...INITIAL_ATOMS];

  // Find all children project ids if this is a parent project
  const childrenIds = projects.filter((p) => p.parentId === id).map((p) => p.id);
  const allIdsToDelete = new Set([id, ...childrenIds]);

  const nextProjects = projects.filter((p) => !allIdsToDelete.has(p.id));
  const nextAtoms = atoms.filter((a) => !allIdsToDelete.has(a.projectId));

  globalStore.__RESEARCH_PROJECTS_STORE__ = nextProjects;
  globalStore.__RESEARCH_ATOMS_STORE__ = nextAtoms;

  const currentDeleted = globalStore.__DELETED_PROJECT_IDS__ || [];
  const updatedDeleted = Array.from(new Set([...currentDeleted, ...Array.from(allIdsToDelete)]));
  globalStore.__DELETED_PROJECT_IDS__ = updatedDeleted;

  savePersistedState({
    projects: nextProjects,
    atoms: nextAtoms,
    deletedProjectIds: updatedDeleted,
  });

  return true;
}

export function resetStoreToGorillaOnly() {
  const projects = [...INITIAL_PROJECTS];
  const atoms: ResearchAtom[] = [];
  globalStore.__RESEARCH_PROJECTS_STORE__ = projects;
  globalStore.__RESEARCH_ATOMS_STORE__ = atoms;
  savePersistedState({ projects, atoms });
  return { projects, atoms };
}
