export type AtomType = 'text' | 'link' | 'image' | 'block' | 'quote' | 'note' | 'document';

import type { CitationRecord } from '../citations/types';
import type { SourceHealth } from '../health/types';

export interface ProvenanceMetadata {
  health?: SourceHealth; // source health checks (retraction, page); see src/lib/health/types.ts
  citation?: CitationRecord; // resolved on demand; see src/lib/citations/metadata.ts
  pageIdentifiers?: { doi?: string; pmid?: string }; // read from the page's citation meta tags at clip time
  pageInfo?: { url: string; title?: string; siteName?: string; author?: string; published?: string; updated?: string }; // web-source fallback
  pinnedAt?: string; // set when the atom is pinned to the top of the feed; see src/lib/atoms/pin.ts
  evidenceKind?: 'quote' | 'ai-summary' | 'mine'; // how the clip may be used in a paper; see src/lib/atoms/evidence.ts
  sourceAtomIds?: string[]; // a note saved from Researchie AI: the clips it cites, so a paper can cite them when the note is placed
  origin?: 'research-ai'; // a note that came from Researchie AI: named by its origin, not its web address
  references?: string[]; // that note's reference list, shown under Get citation rather than in the text
  sourceUrl: string;
  pageTitle: string;
  domainFavicon?: string;
  scrollToTextFragment?: string; // e.g. #:~:text=start_phrase,end_phrase
  textFragment?: string;
  deepLink?: string;
  domCssSelector?: string;
  selector?: string;
  authorOrByline?: string;
  publishedTime?: string;
  sectionHeading?: string;
  contextPrefix?: string;
  contextSuffix?: string;
  surroundingContext?: string;
  surroundingParagraphs?: string[];
  contextRebuiltAt?: string;
  siteName?: string;
  
  // PDF & Local Document Provenance
  documentType?: 'web' | 'pdf' | 'epub' | 'markdown';
  documentName?: string;
  documentId?: string;
  documentUrl?: string;
  docId?: string;
  pdfDocId?: string;
  pageNumber?: number;
  page?: number;
  totalDocumentPages?: number;
  pdfBoundingRect?: { x: number; y: number; width: number; height: number };
  citationQuote?: string;
  quote?: string;
  selectedText?: string;
}

export interface ContentPayload {
  rawText?: string;
  text?: string;
  markdownContent?: string;
  sanitizedHtml?: string;
  imageUrl?: string;
  targetUrl?: string;
  sourceUrl?: string;
  description?: string;
  surroundingParagraphs?: string[];
  ocrText?: string;
  ocrConfidence?: number;
}

export interface ResearchAtom {
  id: string;
  projectId: string;
  project_id?: string;
  userId?: string;
  user_id?: string;
  type: AtomType;
  title: string;
  content: ContentPayload;
  metadata: ProvenanceMetadata;
  tags?: string[];
  userNotes?: string;
  user_notes?: string;
  embedding?: number[];
  similarity?: number;
  visualSnapshot?: {
    rasterSnapshotUrl?: string;
    htmlSnapshot?: string;
    capturedAt?: string;
    capturedViewport?: string | { width: number; height: number };
    width?: number;
    height?: number;
  };
  capturedAt?: string; // ISO 8601
  created_at?: string;
}

export interface ResearchDocumentPage {
  pageNumber: number;
  title?: string;
  content: string;
  highlights?: {
    id: string;
    text: string;
    atomId?: string;
    color?: string;
    createdAt?: string;
  }[];
}

export interface ResearchDocument {
  id: string;
  projectId: string;
  title: string;
  filename: string;
  author?: string;
  publicationDate?: string;
  fileSize?: string;
  totalPages: number;
  pages: ResearchDocumentPage[];
  uploadedAt: string;
  sourceUrl?: string;
  fileUrl?: string;
  fileData?: string;
  tags?: string[];
  citation?: CitationRecord; // from the PDF's DOI, when one is found at upload
}

export interface Collaborator {
  id: string;
  email: string;
  name?: string;
  role: 'owner' | 'editor' | 'viewer';
  avatarUrl?: string;
  invitedAt?: string;
  status: 'active' | 'pending';
}

export interface ProjectSharingSettings {
  isPublic: boolean;
  publicSlug?: string;
  allowGuestComments: boolean;
  allowDuplication: boolean;
  collaborators: Collaborator[];
}

export interface ResearchProject {
  id: string;
  userId?: string;
  user_id?: string;
  parentId?: string | null;
  parent_id?: string | null;
  folderIcon?: string;
  title: string;
  description: string;
  color?: string;
  color_badge?: string;
  tags?: string[];
  atomCount?: number;
  atom_count?: number;
  lastAccessedAt?: string;
  last_accessed_at?: string;
  sharing?: ProjectSharingSettings;
  /** What the signed-in user may do here. Set on the accounts deployment; absent locally (everything is allowed). */
  role?: 'owner' | 'editor' | 'viewer';
  /** For the owner: how many people have asked for access and are waiting. */
  pendingRequests?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}
