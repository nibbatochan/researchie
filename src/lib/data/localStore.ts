// The local-files implementation of the data layer (see store.ts). One demo user, so the userId argument is
// ignored. It reads and writes only the local files: nothing is sent to Supabase from here.
import {
  getLocalProjects,
  getLocalAtoms,
  addLocalAtom,
  updateLocalAtom,
  deleteLocalAtom,
  createLocalProject,
  deleteLocalProject,
} from './researchStore';
import { getProjectDocuments, getDocumentById, addDocument as addLocalDocument, deleteDocument as deleteLocalDocument } from './sampleDocuments';
import type { DataStore } from './store';
import type { ResearchAtom } from '../types/research';

export const localStore: DataStore = {
  async ownsProject(_userId, projectId) {
    return getLocalProjects().some((p) => p.id === projectId);
  },

  // The local store accepts ids as given: the demo ids and the extension's default exist locally.
  async resolveProjectId(_userId, projectId) {
    return projectId;
  },

  async projectFamily(_userId, projectId) {
    const projects = getLocalProjects();
    return [projectId, ...projects.filter((p) => p.parentId === projectId).map((p) => p.id)];
  },

  async listProjects() {
    return getLocalProjects();
  },

  async createProject(_userId, input) {
    return createLocalProject({
      title: input.title,
      description: input.description ?? '',
      color: input.color ?? '#325FEC',
      tags: input.tags ?? [],
      parentId: input.parentId ?? null,
      folderIcon: input.folderIcon,
    });
  },

  // Deleting a project that is already gone still answers "done": a repeated delete is harmless.
  async deleteProject(_userId, projectId, moveTo) {
    const family = new Set([projectId, ...getLocalProjects().filter((p) => p.parentId === projectId).map((p) => p.id)]);
    if (moveTo) {
      if (family.has(moveTo)) return false;
      // Keep the clips: they move out of this project and its sub-projects before anything is deleted.
      for (const atom of getLocalAtoms().filter((a) => family.has(a.projectId))) {
        updateLocalAtom(atom.id, { projectId: moveTo } as Partial<ResearchAtom>);
      }
    }
    deleteLocalProject(projectId);
    return true;
  },

  async listAtoms(_userId, scope) {
    return getLocalAtoms(scope);
  },

  async getAtom(_userId, id) {
    return getLocalAtoms().find((a) => a.id === id) ?? null;
  },

  async insertAtom(userId, atom) {
    // A retry after a lost reply carries the same id: hand back the clip that is already there.
    const existing = getLocalAtoms().find((a) => a.id === atom.id);
    if (existing) return existing;
    return addLocalAtom({ ...atom, userId });
  },

  async updateAtom(_userId, id, patch) {
    const changes: Partial<ResearchAtom> = {};
    if (patch.title !== undefined) changes.title = patch.title as string;
    if (patch.tags !== undefined) changes.tags = patch.tags as string[];
    if (patch.user_notes !== undefined) changes.userNotes = patch.user_notes as string;
    if (patch.metadata !== undefined) changes.metadata = patch.metadata as ResearchAtom['metadata'];
    if (patch.content !== undefined) changes.content = patch.content as ResearchAtom['content'];
    return updateLocalAtom(id, changes);
  },

  async deleteAtom(_userId, id) {
    return deleteLocalAtom(id);
  },

  async listDocuments(_userId, scope) {
    return getProjectDocuments(scope);
  },

  async getDocument(_userId, id) {
    return getDocumentById(id) ?? null;
  },

  async addDocument(_userId, doc) {
    return addLocalDocument(doc);
  },

  async deleteDocument(_userId, id) {
    return deleteLocalDocument(id);
  },
};
