import { ResearchDocument } from '../types/research';
import fs from 'fs';
import path from 'path';

export const INITIAL_DOCUMENTS: ResearchDocument[] = [
  {
    id: 'doc-just-enough-research',
    projectId: 'proj-ai-main',
    title: 'Just Enough Research — Erika Hall',
    filename: 'just-enough-research.pdf',
    author: 'Erika Hall',
    publicationDate: '2024 Edition',
    fileSize: '2.6 MB',
    fileUrl: '/fixtures/just-enough-research.pdf',
    totalPages: 163,
    uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    tags: ['research-methods', 'design-strategy', 'user-interviews', 'mental-models'],
    pages: [],
  },
];

const DOCS_STORE_FILE = path.join(process.cwd(), '.documents-store.json');

const globalStore = globalThis as unknown as {
  __RESEARCH_DOCUMENTS_STORE__?: ResearchDocument[];
};

function loadPersistedDocs(): ResearchDocument[] {
  try {
    if (fs.existsSync(DOCS_STORE_FILE)) {
      const raw = fs.readFileSync(DOCS_STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        // Ensure new initial docs are included if missing
        const missing = INITIAL_DOCUMENTS.filter((initDoc) => !data.some((d) => d.id === initDoc.id));
        if (missing.length > 0) {
          const merged = [...data, ...missing];
          savePersistedDocs(merged);
          return merged;
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to read .documents-store.json:', err);
  }
  return [...INITIAL_DOCUMENTS];
}

function savePersistedDocs(docs: ResearchDocument[]) {
  try {
    fs.writeFileSync(DOCS_STORE_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write .documents-store.json:', err);
  }
}

if (!globalStore.__RESEARCH_DOCUMENTS_STORE__) {
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = loadPersistedDocs();
}

export function getProjectDocuments(projectId?: string): ResearchDocument[] {
  const docs = loadPersistedDocs();
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = docs;
  if (!projectId || projectId === 'all') {
    return docs;
  }
  
  // Exact match first
  const exact = docs.filter((d) => d.projectId === projectId);
  if (exact.length > 0) {
    return exact;
  }

  // If projectId is a parent (like proj-ai-main), also return child sub-project docs (e.g. proj-rag-arch-2026)
  if (projectId === 'proj-ai-main') {
    const aiFamily = docs.filter((d) => d.projectId === 'proj-ai-main' || d.projectId === 'proj-rag-arch-2026' || d.projectId === 'proj-ai-graph-rag');
    if (aiFamily.length > 0) return aiFamily;
  }

  return exact;
}

export function getDocumentById(id: string): ResearchDocument | undefined {
  const docs = loadPersistedDocs();
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = docs;
  return docs.find((d) => d.id === id);
}

export function addDocument(doc: ResearchDocument): ResearchDocument {
  const docs = globalStore.__RESEARCH_DOCUMENTS_STORE__ || loadPersistedDocs();
  const nextDocs = [doc, ...docs.filter((d) => d.id !== doc.id)];
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = nextDocs;
  savePersistedDocs(nextDocs);
  return doc;
}

export function deleteDocument(id: string): boolean {
  const docs = globalStore.__RESEARCH_DOCUMENTS_STORE__ || loadPersistedDocs();
  const prevLen = docs.length;
  const nextDocs = docs.filter((d) => d.id !== id);
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = nextDocs;
  savePersistedDocs(nextDocs);
  return nextDocs.length < prevLen;
}
