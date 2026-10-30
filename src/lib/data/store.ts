// The one data layer the API routes talk to (S-49). It has two implementations behind the same methods:
//   cloud      Supabase, one owner per row. Used when AUTH_REQUIRED=true (the tester deployment).
//   localStore the local files (.research-store.json, .documents-store.json). Used in local development and the
//              browser tests, where there is a single demo user.
// A route calls `store` and does not care which one it got; the choice is made once, here.
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { cloud } from './cloudStore';
import { localStore } from './localStore';
import type { ResearchAtom, ResearchDocument, ResearchProject } from '../types/research';
import type { CitationRecord } from '../citations/types';
import type { Role } from './roles';

export interface DataStore {
  /** What the user may do in the project: owner, editor, viewer, or null for no access. */
  roleOn(userId: string, projectId: string): Promise<Role | null>;
  /** True when the user is the owner (the person who can delete the project and change who has access). */
  ownsProject(userId: string, projectId: string): Promise<boolean>;
  /** Maps the "all projects" and demo ids to a real project the user has, for saving. */
  resolveProjectId(userId: string, projectId: string): Promise<string>;
  /** The project and its sub-projects. Empty when the user has no such project. */
  projectFamily(userId: string, projectId: string): Promise<string[]>;

  listProjects(userId: string): Promise<ResearchProject[]>;
  createProject(
    userId: string,
    input: { title: string; description?: string; color?: string; tags?: string[]; parentId?: string | null; folderIcon?: string },
  ): Promise<ResearchProject | null>;
  /** With moveTo the clips go to that project first. False when the project or the target cannot be used. */
  deleteProject(userId: string, projectId: string, moveTo?: string): Promise<boolean>;
  /** Changes name, description, colour or avatar. Only the owner can; null when the project is not theirs. */
  updateProject(
    userId: string,
    projectId: string,
    patch: { title?: string; description?: string; color?: string; folderIcon?: string | null },
  ): Promise<ResearchProject | null>;

  listAtoms(userId: string, scope?: string): Promise<ResearchAtom[]>;
  /** A cheap fingerprint of the clips in scope (how many, and the newest capture time), so the page can tell whether the full list changed. */
  atomsStamp(userId: string, scope?: string): Promise<{ count: number; latest: string | null }>;
  getAtom(userId: string, id: string): Promise<ResearchAtom | null>;
  /** Returns the clip, or null when the project is not usable. A second save of the same id returns the first. */
  insertAtom(userId: string, atom: ResearchAtom): Promise<ResearchAtom | null>;
  /** patch uses the database column names: title, tags, user_notes, metadata, content. */
  updateAtom(userId: string, id: string, patch: Record<string, unknown>): Promise<ResearchAtom | null>;
  deleteAtom(userId: string, id: string): Promise<boolean>;

  listDocuments(userId: string, scope?: string): Promise<ResearchDocument[]>;
  getDocument(userId: string, id: string): Promise<ResearchDocument | null>;
  addDocument(userId: string, doc: ResearchDocument): Promise<ResearchDocument | null>;
  deleteDocument(userId: string, id: string): Promise<boolean>;
  /** Sets the citation of a saved PDF (for example from an imported reference). Returns the document, or null when it is not usable. */
  updateDocumentCitation(userId: string, id: string, citation: CitationRecord): Promise<ResearchDocument | null>;
}

export const store: DataStore = AUTH_REQUIRED ? cloud : localStore;

/** What the routes report as `source` in their answers. */
export const STORE_SOURCE = AUTH_REQUIRED ? 'supabase' : 'local_store';
