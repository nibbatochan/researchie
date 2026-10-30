'use client';

import { postWithProgress } from '@/lib/net/postWithProgress';
import { EmptyLibraryIllustration } from './illustrations';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileText,
  FilePdf,
  FileDoc,
  CaretLeft,
  CaretRight,
  CaretUp,
  CaretDown,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  MagnifyingGlass,
  ChatCircleText,
  BookmarkSimple,
  Check,
  UploadSimple,
  ArrowsClockwise,
  X,
  PaperPlaneRight,
  Trash,
  ArrowSquareOut,
  FolderSimple,
  Plus,
  LinkSimple,
  User,
  CheckCircle,
  Warning,
  Bookmark,
  SidebarSimple,
  BookOpen,
  ArrowRight,
  Copy,
  FolderPlus,
  ArrowLeft
} from '@phosphor-icons/react';
import { ResearchDocument, AtomType } from '@/lib/types/research';
import type { CitationRecord } from '@/lib/citations/types.ts';
import { formatCitationLine, resolveCitation } from '@/lib/citations/client.ts';
import { CitationStyleBar, CitationPreview, useCitationStyle } from './CitationStyleBar';
import { readPdfDois } from '@/lib/citations/pdfReader.ts';
import { assessCitation, readConfidence, titlesMatch, isRetracted, RETRACTED_MESSAGE } from '@/lib/citations/verify.ts';
import { unwrapPdfLines } from '@/lib/utils/pdfText';
import { stripLinks } from '@/lib/utils/plainText';
import { buildAnswerLinks, quoteIsOnPage, linkTitle, quoteHighlightText, type AnswerCitation } from '@/lib/qa/answerLinks.ts';
import { buildManualCitation, isValidManualYear } from '@/lib/citations/manual.ts';
import { CustomPDFViewer } from './CustomPDFViewer';
import { useDeleteToast } from './DeleteToast';
import { FormattedAIMessage } from './FormattedAIMessage';
import { usePrefs } from '@/lib/prefs/prefsContext';

// ─── Saved Highlight type ──────────────────────────────────────────
interface SavedHighlight {
  id: string;
  text: string;
  pageNumber: number;
  docId: string;
  savedAt: string;
}

// ─── Toast Notification type ───────────────────────────────────────
interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ─── Accurate File Size Formatter & Normalizer ─────────────────────
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '1.2 MB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const normalizeDocFileSize = (fileSize?: string, pagesCount: number = 1): string => {
  if (!fileSize || fileSize === '0.1 KB' || fileSize === '0.0 KB' || fileSize === '0 KB' || fileSize.trim() === '') {
    const estimatedKb = Math.max(160, pagesCount * 240);
    return estimatedKb >= 1024 ? `${(estimatedKb / 1024).toFixed(1)} MB` : `${estimatedKb} KB`;
  }
  return fileSize;
};

// ─── Complete Date Formatter (Day Month Year) ───────────────────────
export const formatDocDate = (dateStr?: string): string => {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // If it's a string like "March 2024", return it cleanly
    return dateStr;
  }
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Props ─────────────────────────────────────────────────────────
interface PDFReaderViewProps {
  projectId: string;
  projectTitle: string;
  targetDocId?: string;
  targetPage?: number;
  targetHighlightText?: string;
  onClose?: () => void;
  onCreateAtom?: (atom: {
    projectId: string;
    type: AtomType;
    title?: string;
    content: { text?: string; description?: string; targetUrl?: string; markdownContent?: string };
    metadata?: {
      sourceUrl?: string;
      pageTitle?: string;
      documentType?: 'pdf' | 'web';
      documentName?: string;
      documentId?: string;
      pageNumber?: number;
      totalDocumentPages?: number;
    };
    tags?: string[];
  }) => void;
}

export const PDFReaderView: React.FC<PDFReaderViewProps> = ({
  projectId,
  projectTitle,
  targetDocId,
  targetPage = 1,
  targetHighlightText,
  onClose,
  onCreateAtom,
}) => {
  // ─── Documents state ───────────────────────────────────────────
  const [documents, setDocuments] = useState<ResearchDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(targetDocId || null);
  const [currentPage, setCurrentPage] = useState<number>(targetPage);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isLibraryView, setIsLibraryView] = useState<boolean>(!targetDocId);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // ─── Document Quick Switcher state ─────────────────────────────
  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState(false);
  const docDropdownRef = useRef<HTMLDivElement>(null);

  // ─── Sidebar Toggle state (Saved Highlights panel) ─────────────
  const [isHighlightsSidebarOpen, setIsHighlightsSidebarOpen] = useState(true);

  // ─── Document Search state ─────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // ─── Selection pill state ──────────────────────────────────────
  const [selectedText, setSelectedText] = useState('');
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── Quick Highlight Creator Drawer ───────────────────────────
  const [isQuickClipOpen, setIsQuickClipOpen] = useState(false);
  const [quickClipText, setQuickClipText] = useState('');
  const [quickClipPage, setQuickClipPage] = useState(1);

  // ─── Saved highlights ──────────────────────────────────────────
  const [savedHighlights, setSavedHighlights] = useState<SavedHighlight[]>([]);
  // Only the selected saved highlight is drawn on the pages; null when none is selected.
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const prefs = usePrefs();
  // Assistant panel width in px. Dragged by its left edge, kept for next time.
  const [assistantWidth, setAssistantWidth] = useState<number>(() => {
    try {
      const saved = Number(prefs.get('researchie.assistantWidth'));
      return saved >= 260 && saved <= 720 ? saved : 320;
    } catch {
      return 320;
    }
  });

  const startAssistantResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = assistantWidth;
    let latest = startWidth;
    const onMove = (ev: PointerEvent) => {
      // The panel is on the right, so dragging left makes it wider.
      latest = Math.min(720, Math.max(260, startWidth + (startX - ev.clientX)));
      setAssistantWidth(latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      try {
        prefs.set('researchie.assistantWidth', String(latest));
      } catch {}
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const [highlightToDelete, setHighlightToDelete] = useState<string | null>(null);

  // ─── AI Assistant drawer ───────────────────────────────────────
  const [activeHighlightText, setActiveHighlightText] = useState<string>(targetHighlightText || '');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{
    role: 'user' | 'assistant';
    text: string;
    sourcePageNumber?: number;
    citationQuote?: string;
    citations?: Array<{ quote: string; pageNumber?: number; start?: number; end?: number; textFragment?: string; supported?: boolean }>;
    hasUnsupportedClaims?: boolean;
  }>>([]);
  // Set when a clicked citation's quote cannot be found on its page.
  const [citeNotice, setCiteNotice] = useState<{ msgIndex: number; page: number } | null>(null);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  // Keeps the newest question or answer in view as the chat grows.
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [aiMessages.length, isAiLoading]);
  const [savedAiMessages, setSavedAiMessages] = useState<Set<number>>(new Set());

  // ─── Document Manager & Deletion state ─────────────────────────
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<ResearchDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // ─── Toast Notifications state ──────────────────────────────────
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const notifyDeleted = useDeleteToast();
  const showToast = (t: Omit<ToastNotification, 'id'>) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const newToast = { ...t, id: String(Date.now()) };
    setToast(newToast);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // ─── Pre-Upload Modal state (Single File Name field) ───────────
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  // Library view (projectId 'all') has no project of its own: the upload picks one.
  const [libraryProjects, setLibraryProjects] = useState<{ id: string; title: string; parentId?: string | null }[]>([]);
  const [uploadTargetId, setUploadTargetId] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadSourceUrl, setUploadSourceUrl] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadPages, setUploadPages] = useState<any[]>([]);
  const [uploadFileSize, setUploadFileSize] = useState('');
  const [uploadFileUrl, setUploadFileUrl] = useState<string | null>(null);
  const [uploadCitation, setUploadCitation] = useState<CitationRecord | undefined>(undefined);
  const [docCitationOpen, setDocCitationOpen] = useState(false);
  const [docCitationStyle, setDocCitationStyle] = useCitationStyle();
  const [showAdvancedUploadMeta, setShowAdvancedUploadMeta] = useState(false);
  // Shown after parsing when no DOI citation was found. Nothing is saved until "Save citation".
  const [citationPromptOpen, setCitationPromptOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualSourceType, setManualSourceType] = useState<'unknown' | 'journal_article'>('unknown');

  // ─── Refs ──────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ─── Local Storage Cache Keys ──────────────────────────────────
  const localCacheKey = `researchie_docs_${projectId}`;
  const localDeletedCacheKey = `researchie_deleted_docs_${projectId}`;
  // Local development caches documents in the browser. On the tester site they come from the account, so nothing is cached.
  const cacheGet = (key: string) => (prefs.inAccount ? null : localStorage.getItem(key));
  const cacheSet = (key: string, value: string) => {
    if (!prefs.inAccount) localStorage.setItem(key, value);
  };

  // ─── Fetch documents from API & Local Storage ──────────────────
  const fetchDocs = async () => {
    setIsLoadingDocs(true);
    try {
      // When projectId is 'all', fetch documents from all projects (Document Library)
      const url = projectId === 'all'
        ? '/api/documents'
        : `/api/documents?projectId=${encodeURIComponent(projectId)}`;
      const res = await fetch(url);
      let serverDocs: ResearchDocument[] = [];
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          serverDocs = json.data;
        }
      }

      let cachedDocs: ResearchDocument[] = [];
      try {
        const saved = cacheGet(localCacheKey);
        if (saved) cachedDocs = JSON.parse(saved);
      } catch {}

      // Retrieve deleted document IDs for this project to prevent ghost resurrections
      let deletedIds: string[] = [];
      try {
        const delSaved = cacheGet(localDeletedCacheKey);
        if (delSaved) deletedIds = JSON.parse(delSaved);
      } catch {}
      const deletedSet = new Set(deletedIds);

      const mergedMap = new Map<string, ResearchDocument>();
      [...serverDocs, ...cachedDocs].forEach((d) => {
        if (d && d.id && !deletedSet.has(d.id)) {
          mergedMap.set(d.id, {
            ...d,
            fileSize: normalizeDocFileSize(d.fileSize, d.totalPages || d.pages?.length || 1),
            publicationDate: formatDocDate(d.publicationDate || d.uploadedAt),
          });
        }
      });

      const mergedDocs = Array.from(mergedMap.values());
      setDocuments(mergedDocs);

      // Verify active document or fallback
      if (activeDocId && !mergedDocs.some((d) => d.id === activeDocId)) {
        const fallback = mergedDocs.length > 0 ? mergedDocs[0] : null;
        setActiveDocId(fallback ? fallback.id : null);
        setCurrentPage(1);
        setQuickClipPage(1);
      } else if (!activeDocId && mergedDocs.length > 0) {
        const initial = targetDocId
          ? mergedDocs.find((d) => d.id === targetDocId) || mergedDocs[0]
          : mergedDocs[0];
        setActiveDocId(initial.id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [projectId]);

  useEffect(() => {
    if (targetDocId && targetDocId !== activeDocId) {
      setActiveDocId(targetDocId);
    }
    if (targetPage) {
      setCurrentPage(targetPage);
      setQuickClipPage(targetPage);
    }
    if (targetHighlightText) {
      setActiveHighlightText(targetHighlightText);
    }
    if (targetPage) {
      jumpToPage(targetPage, targetHighlightText);
    }
  }, [targetDocId, targetPage, targetHighlightText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (docDropdownRef.current && !docDropdownRef.current.contains(event.target as Node)) {
        setIsDocDropdownOpen(false);
      }
    };
    if (isDocDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDocDropdownOpen]);

  // Global Alt+P / Option+P shortcut to toggle Doc Assistant in PDF view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        e.preventDefault();
        setIsAiOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Deselection & Click-Out Dismissal: Revert Save Clip button and active highlight when clicking away
  useEffect(() => {
    const handleSelectionChange = () => {
      if (justSaved) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-testid="save-clip-pill"]')) {
        return;
      }
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          if (!justSaved) {
            setSelectedText('');
            setSelectionPosition(null);
          }
        }
      }, 10);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedText('');
        setSelectionPosition(null);
        setActiveHighlightText('');
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [justSaved]);

  // Global clean copy interceptor for selected PDF text (prevents unintended metadata/newlines)
  useEffect(() => {
    const handleWindowCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const raw = selection.toString();
      if (raw && raw.trim().length > 0) {
        const clean = raw
          .replace(/\r?\n\s*\r?\n/g, '\n\n')
          .replace(/[\t ]+/g, ' ')
          .trim();
        if (clean && e.clipboardData) {
          e.clipboardData.setData('text/plain', clean);
          e.preventDefault();
        }
      }
    };

    document.addEventListener('copy', handleWindowCopy);
    return () => document.removeEventListener('copy', handleWindowCopy);
  }, []);

  const activeDocument = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || documents[0] || null;
  }, [documents, activeDocId]);

  // Copying from the PDF text layer: the browser puts a line break at every printed line. Join the wrapped lines.
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      const node = sel && sel.anchorNode;
      const el = node && (node.nodeType === 1 ? (node as Element) : node.parentElement);
      if (!el || !el.closest || !el.closest('.textLayer')) return;
      const text = unwrapPdfLines(sel!.toString());
      if (!text || !e.clipboardData) return;
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
    };
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, []);

  // The plugin reads a page's citation from its citation_* meta tags. A paper open in the reader carries its own citation,
  // so text clipped from the reader through the plugin keeps it.
  const readerCitation = activeDocument?.citation;
  useEffect(() => {
    if (!readerCitation) return;
    const added: HTMLMetaElement[] = [];
    const add = (name: string, content?: string | number) => {
      if (!content) return;
      const tag = document.createElement('meta');
      tag.name = name;
      tag.content = String(content);
      document.head.appendChild(tag);
      added.push(tag);
    };
    add('citation_doi', readerCitation.doi);
    add('citation_pmid', readerCitation.pmid);
    add('citation_title', readerCitation.title);
    add('citation_author', readerCitation.authors?.[0] ? [readerCitation.authors[0].given, readerCitation.authors[0].family].filter(Boolean).join(' ') : '');
    add('citation_publication_date', readerCitation.year);
    return () => added.forEach((tag) => tag.remove());
  }, [readerCitation]);

  // The project new clips and notes are saved to. In library view that is the open document's project.
  const writeProjectId = projectId === 'all' ? activeDocument?.projectId || '' : projectId;

  const saveDocsToLocal = (updatedDocs: ResearchDocument[]) => {
    try {
      cacheSet(localCacheKey, JSON.stringify(updatedDocs));
    } catch {}
  };

  // ─── Search Matches Calculation ────────────────────────────────
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !activeDocument) return [];
    const q = searchQuery.toLowerCase();
    const matches: Array<{ pageNumber: number; textSnippet: string }> = [];

    activeDocument.pages.forEach((page) => {
      const content = page.content.toLowerCase();
      let pos = 0;
      while ((pos = content.indexOf(q, pos)) !== -1) {
        const start = Math.max(0, pos - 20);
        const end = Math.min(page.content.length, pos + q.length + 30);
        matches.push({
          pageNumber: page.pageNumber,
          textSnippet: page.content.slice(start, end),
        });
        pos += q.length;
      }
    });

    return matches;
  }, [searchQuery, activeDocument]);

  const handleNextSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    const target = searchMatches[nextIdx];
    jumpToPage(target.pageNumber, searchQuery.trim());
  };

  const handlePrevSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    const target = searchMatches[prevIdx];
    jumpToPage(target.pageNumber, searchQuery.trim());
  };

  // ─── Local File Dialog Trigger & Real Server-Side Parser ─────────
  const processUploadedFile = async (file: File) => {
    if (!file) return;

    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);

    const rawName = file.name;
    const formattedSize = formatFileSize(file.size);

    setUploadFileName(rawName);
    setUploadFileSize(formattedSize);
    setIsUploadingFile(true);
    setUploadProgress(3);
    setUploadStatusText('Sending the PDF to the server...');
    setIsUploadModalOpen(true);

    showToast({
      type: 'info',
      message: `Processing "${rawName}" (${formattedSize})...`,
    });

    // Create base64 data URL for client preview
    const fileReader = new FileReader();
    fileReader.onload = () => {
      if (typeof fileReader.result === 'string') {
        setUploadFileUrl(fileReader.result);
      }
    };
    fileReader.readAsDataURL(file);

    let extractedPages: any[] = [];
    let extractedContent = '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      // The bar follows the bytes sent (3 to 55), then the server's reading (to 70), then the citation lookup.
      const parseRes = await postWithProgress('/api/documents/parse', formData, {
        onUpload: (f) => {
          setUploadProgress(Math.round(3 + f * 52));
          if (f >= 1) setUploadStatusText('Reading the PDF on the server...');
        },
      });
      setUploadProgress(70);
      setUploadStatusText('Looking for a citation...');

      if (parseRes.ok) {
        const json = await parseRes.json();
        if (json.success && json.pages) {
          extractedPages = json.pages;
          extractedContent = json.extractedText || '';
        }
      }
    } catch (err) {
      console.warn('Document parsing server note:', err);
    }

    setUploadProgress((p) => Math.max(p, 70));
    // DOIs in the PDF give a citation. Prefer the one whose title matches the PDF's.
    // A failure here must not block the upload.
    setUploadCitation(undefined);
    setCitationPromptOpen(false);
    let foundCitation = false;
    let pdfTitle: string | undefined;
    try {
      const { dois, title } = await readPdfDois(file);
      pdfTitle = title;
      const lookups = await Promise.all(dois.slice(0, 3).map((doi) => resolveCitation({ doi })));
      const records = lookups.map((o) => o.record).filter((r): r is CitationRecord => r !== null);
      const matched = title ? records.find((r) => r.title && titlesMatch(title, r.title)) : undefined;
      const pick = matched ?? records[0];
      if (pick) {
        // Count only DOIs that resolved, so a broken fragment does not raise the warning.
        // If no DOI matched the PDF's title, the pick still gets saved, with the verify warning.
        const checked = assessCitation(pick, title, { userEntered: false, warnOnMismatch: true });
        // Count only DOIs that resolved, so a broken fragment does not trigger this note.
        if (records.length > 1) checked.confidence!.notes.push('More than one resolvable DOI was found on the first page.');
        setUploadCitation(checked);
        foundCitation = true;
      }
    } catch (err) {
      console.warn('PDF DOI lookup skipped:', err);
    }

    // No DOI citation: ask the user for title, author and year. Prefill from the PDF's
    // metadata title, or the file name without its extension.
    if (!foundCitation) {
      setManualTitle(pdfTitle?.trim() || rawName.replace(/\.[^/.]+$/, ''));
      setManualAuthor('');
      setManualYear('');
      setManualSourceType('unknown');
      setCitationPromptOpen(true);
    }

    setUploadPages(extractedPages);
    setUploadContent(extractedContent);
    setUploadProgress(100);
    setUploadStatusText('Document parsed & ready');
    setIsUploadingFile(false);
  };

  // Opens the file picker straight away. The upload window appears once a file is chosen.
  const handleTriggerUpload = () => {
    setUploadFileName('');
    setUploadPages([]);
    setUploadContent('');
    setUploadFileUrl(null);
    setUploadCitation(undefined);
    setCitationPromptOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  useEffect(() => {
    if (projectId !== 'all') return;
    let live = true;
    fetch('/api/projects', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!live || !Array.isArray(j.data)) return;
        const list = j.data.filter((p: any) => p.id !== 'all');
        setLibraryProjects(list);
        setUploadTargetId((prev) => prev || list[0]?.id || '');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [projectId]);

  const handleConfirmUpload = async () => {
    if (!uploadFileName.trim() || isUploadingFile) return;
    const targetProjectId = projectId === 'all' ? uploadTargetId : projectId;
    if (!targetProjectId) {
      setUploadStatusText('Choose a project to save this document in.');
      return;
    }
    setIsUploadingFile(true);
    setUploadProgress(2);
    setUploadStatusText('Saving document to project library...');

    const cleanTitle = uploadFileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');

    try {
      // Real progress: the bar follows the bytes of this save (2 to 96); it reaches 100 only when the server says yes.
      const res = await postWithProgress(
        '/api/documents',
        JSON.stringify({
          projectId: targetProjectId,
          title: cleanTitle,
          filename: uploadFileName.trim(),
          fileSize: uploadFileSize, // <--- Accurately pass the formatted file size
          author: uploadAuthor.trim() || 'Uploaded Document',
          sourceUrl: uploadSourceUrl.trim() || undefined,
          fileUrl: uploadFileUrl || undefined,
          content: uploadContent.trim(),
          pages: uploadPages.length > 0 ? uploadPages : undefined,
          tags: ['uploaded-doc'],
          citation: uploadCitation,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          onUpload: (f) => setUploadProgress(Math.round(2 + f * 94)),
        }
      );

      if (res.ok) {
        setUploadProgress(100);
        setUploadStatusText('Document opened successfully!');
        const json = await res.json();
        if (json.data) {
          const newDoc: ResearchDocument = {
            ...json.data,
            fileSize: uploadFileSize || json.data.fileSize,
            fileUrl: uploadFileUrl || json.data.fileUrl,
            pages: uploadPages.length > 0 ? uploadPages : json.data.pages,
          };

          // Remove newDoc.id from deleted cache if it was previously deleted
          try {
            const delSaved = cacheGet(localDeletedCacheKey);
            if (delSaved) {
              const list: string[] = JSON.parse(delSaved);
              const filtered = list.filter((id) => id !== newDoc.id);
              cacheSet(localDeletedCacheKey, JSON.stringify(filtered));
            }
          } catch {}

          setDocuments((prev) => {
            const updated = [newDoc, ...prev.filter((d) => d.id !== newDoc.id)];
            saveDocsToLocal(updated);
            return updated;
          });
          setActiveDocId(newDoc.id);
          setCurrentPage(1);
          setQuickClipPage(1);
          setIsUploadModalOpen(false);
          setIsDocManagerOpen(false);
          showToast({
            type: 'success',
            message: `Uploaded "${newDoc.filename}" (${newDoc.fileSize})`,
          });
        }
      } else {
        setUploadStatusText('Could not save the document. Try again.');
        showToast({
          type: 'error',
          message: res.status === 413 ? 'This file is too large to upload here.' : 'Failed to save document. Please try again.',
        });
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
      showToast({
        type: 'error',
        message: 'Failed to upload document.',
      });
    } finally {
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
      setIsUploadingFile(false);
    }
  };

  // ─── Callback when Custom PDF.js Viewer Detects / Extracts Pages ──
  const handlePdfPagesExtracted = useCallback((detectedTotalPages: number, extractedPages: any[]) => {
    if (!activeDocument) return;

    // Avoid triggering state updates if totalPages and pages are already extracted and matching
    if (
      activeDocument.totalPages === detectedTotalPages &&
      activeDocument.pages &&
      activeDocument.pages.length === detectedTotalPages
    ) {
      return;
    }

    if (extractedPages && extractedPages.length > 0) {
      setDocuments((prev) => {
        const target = prev.find((d) => d.id === activeDocument.id);
        if (target && target.totalPages === detectedTotalPages && target.pages && target.pages.length === detectedTotalPages) {
          return prev;
        }

        const updated = prev.map((d) => {
          if (d.id === activeDocument.id) {
            return {
              ...d,
              totalPages: detectedTotalPages || extractedPages.length,
              pages: extractedPages,
            };
          }
          return d;
        });
        saveDocsToLocal(updated);
        return updated;
      });
    }
  }, [activeDocument]);

  // ─── Instant Document Deletion Handler with Cache Synchronization ──
  const handleDeleteDoc = async (docId: string) => {
    if (!docId) return;
    setIsDeletingDoc(true);

    const docName = docToDelete?.filename || documents.find((d) => d.id === docId)?.filename || 'Document';

    try {
      // 1. DELETE from server
      await fetch(`/api/documents?id=${encodeURIComponent(docId)}`, {
        method: 'DELETE',
      }).catch((e) => console.warn('Server delete error:', e));

      // 2. Track deleted ID in localStorage cache to prevent ghost resurrection
      try {
        const rawDel = cacheGet(localDeletedCacheKey);
        const deletedIds: string[] = rawDel ? JSON.parse(rawDel) : [];
        if (!deletedIds.includes(docId)) {
          deletedIds.push(docId);
          cacheSet(localDeletedCacheKey, JSON.stringify(deletedIds));
        }
      } catch {}

      // 3. Synchronize local state and localStorage cache
      setDocuments((prev) => {
        const next = prev.filter((d) => d.id !== docId);
        saveDocsToLocal(next);

        // 4. Automatically fallback to next available document (or empty state) and reset page to 1
        if (activeDocId === docId) {
          const fallback = next.length > 0 ? next[0] : null;
          setActiveDocId(fallback ? fallback.id : null);
          setCurrentPage(1);
          setQuickClipPage(1);
        }
        return next;
      });

      // 5. Clean up associated highlights
      setSavedHighlights((prev) => prev.filter((h) => h.docId !== docId));
      setDocToDelete(null);

      notifyDeleted({ kind: 'document', name: docName });
    } catch (err) {
      console.error('Failed to delete doc:', err);
      showToast({
        type: 'error',
        message: `Failed to delete "${docName}".`,
      });
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // ─── Handle Text Selection from Custom PDF Viewer Layer ────────
  const handleCustomPdfTextSelected = (text: string, pageNum: number, position: { x: number; y: number }) => {
    setSelectedText(text);
    setSelectedPageNum(pageNum);
    setCurrentPage(pageNum);
    setQuickClipPage(pageNum);
    setSelectionPosition(position);
    setJustSaved(false);
    setCopied(false);
    if (activeHighlightText) {
      setActiveHighlightText('');
    }
  };

  // ─── Accurate Text Copy Handler ────────────────────────────────
  const handleCopySelectedText = (customText?: string) => {
    const raw = customText || selectedText;
    if (!raw) return;
    const clean = raw
      .replace(/\r?\n\s*\r?\n/g, '\n\n')
      .replace(/[\t ]+/g, ' ')
      .trim();

    if (!clean) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(clean).then(() => {
        setCopied(true);
        showToast({
          type: 'success',
          message: 'Copied exact text to clipboard',
        });
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopyText(clean);
      });
    } else {
      fallbackCopyText(clean);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      showToast({
        type: 'success',
        message: 'Copied exact text to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({
        type: 'error',
        message: 'Failed to copy text',
      });
    }
  };

  // ─── Save as Highlight Handler ─────────────────────────────────
  const handleSaveHighlight = (textToSave?: string, pageNumToSave?: number) => {
    // text copied from a PDF breaks at every printed line; join the wrapped lines so the clip has no half-empty gaps
    const highlightText = unwrapPdfLines((textToSave || selectedText || quickClipText).trim());
    const pageNum = pageNumToSave || selectedPageNum || currentPage || quickClipPage || 1;

    if (!highlightText || !activeDocument) return;

    const highlight: SavedHighlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: highlightText,
      pageNumber: pageNum,
      docId: activeDocument.id,
      savedAt: new Date().toISOString(),
    };
    setSavedHighlights((prev) => [highlight, ...prev]);
    setSelectedHighlightId(highlight.id);

    // Send citation directly to project stream feed if callback provided
    if (onCreateAtom) {
      onCreateAtom({
        projectId: writeProjectId,
        type: 'quote',
        title: `"${highlightText.slice(0, 50)}..." — p. ${pageNum}`,
        content: {
          text: highlightText,
          description: `From "${activeDocument.title}", Page ${pageNum}`,
        },
        metadata: {
          sourceUrl: activeDocument.sourceUrl || `/reader?doc=${activeDocument.id}&page=${pageNum}`,
          pageTitle: `${activeDocument.title} (Page ${pageNum})`,
          documentType: 'pdf',
          documentName: activeDocument.filename,
          documentId: activeDocument.id,
          pageNumber: pageNum,
          totalDocumentPages: activeDocument.totalPages,
          ...(activeDocument.citation ? { citation: activeDocument.citation } : {}),
        },
        tags: ['doc-highlight', 'pdf-clip'],
      });
    }

    setJustSaved(true);
    setQuickClipText('');
    setIsQuickClipOpen(false);

    setTimeout(() => {
      setSelectedText('');
      setSelectionPosition(null);
      window.getSelection()?.removeAllRanges();
      setJustSaved(false);
    }, 1200);
  };

  const handleDeleteHighlight = (id: string) => {
    notifyDeleted({ kind: 'highlight' });
    setSavedHighlights((prev) => prev.filter((h) => h.id !== id));
    setSelectedHighlightId((cur) => (cur === id ? null : cur));
    setHighlightToDelete(null);
  };

  // A click anywhere except a citation link or a saved-highlight row clears what is highlighted.
  useEffect(() => {
    if (!activeHighlightText && !selectedHighlightId) return;
    const clearOnOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.('[data-keep-highlight]')) return;
      setActiveHighlightText('');
      setSelectedHighlightId(null);
    };
    document.addEventListener('mousedown', clearOnOutsideClick);
    return () => document.removeEventListener('mousedown', clearOnOutsideClick);
  }, [activeHighlightText, selectedHighlightId]);

  const jumpToPage = (pageNum: number, highlightQuote?: string) => {
    const hasQuote = !!highlightQuote && !!highlightQuote.trim();
    const alreadyThere = pageNum === currentPage;
    setCurrentPage(pageNum);
    setQuickClipPage(pageNum);
    if (hasQuote) {
      setActiveHighlightText(highlightQuote!.trim());
    }
    // The viewer scrolls when the page changes and again to a quote. Scroll here only for a
    // repeat jump to the same page with no quote, which neither of those would move.
    if (!alreadyThere || hasQuote) return;
    setTimeout(() => {
      const pageEl = document.getElementById(`pdf-page-${pageNum}`) || pageRefs.current.get(pageNum);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        setTimeout(() => {
          const retryEl = document.getElementById(`pdf-page-${pageNum}`) || pageRefs.current.get(pageNum);
          if (retryEl) {
            retryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      }
    }, 80);
  };

  // Open a verified citation: check its quote is really on the page, then jump and highlight it.
  const openCitation = (c: AnswerCitation, msgIndex: number) => {
    const page = c.pageNumber;
    if (!page) return;
    const pageText = activeDocument?.pages?.find((p) => p.pageNumber === page)?.content;
    if (!quoteIsOnPage(c, pageText)) {
      setCiteNotice({ msgIndex, page });
      return;
    }
    setCiteNotice(null);
    // Re-set the highlight so clicking the same quote twice re-applies it.
    setActiveHighlightText('');
    // The whole quote is highlighted when it is all on the page, else its first verified sentence.
    setTimeout(() => jumpToPage(page, quoteHighlightText(c, pageText)), 0);
  };

  const jumpToHighlight = (hl: SavedHighlight) => {
    if (hl.docId !== activeDocId) setActiveDocId(hl.docId);
    setSelectedHighlightId(hl.id);
    jumpToPage(hl.pageNumber, hl.text);
  };

  // ─── AI Q&A Handler (Comprehensive Document RAG Analysis) ────────────
  const handleAiQuestion = async () => {
    if (!aiInput.trim() || !activeDocument || isAiLoading) return;
    const q = aiInput.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', text: q }]);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          pages: activeDocument.pages,
          documentId: activeDocument.id,
          title: activeDocument.title,
          currentPage: currentPage,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const answer = json.data.answer || json.data.text || 'No response found.';
          // Page numbers written in the answer text are not trusted. Only a
          // supported (verified) citation gives a source page.
          const citationList: any[] = Array.isArray(json.data.citations) ? json.data.citations : [];
          const firstSupported = citationList.find((c) => c?.supported === true && typeof c.pageNumber === 'number');
          const sourcePage: number | undefined = firstSupported?.pageNumber;
          const primaryCitationQuote = firstSupported?.quote || '';

          setAiMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: answer,
              sourcePageNumber: sourcePage,
              citationQuote: primaryCitationQuote,
              citations: json.data.citations || [],
              hasUnsupportedClaims: json.data.hasUnsupportedClaims === true,
            },
          ]);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: errJson.error || "Unable to process document context right now. Please try again.",
          },
        ]);
      }
    } catch (err) {
      console.error('AI Q&A error:', err);
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "Unable to connect to AI assistant. Please check your network and try again." },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAiResponse = async (msg: any, index: number) => {
    if (!activeDocument) return;

    let questionTitle = "AI Answer";
    if (index > 0 && aiMessages[index - 1]?.role === 'user') {
      questionTitle = aiMessages[index - 1].text;
    }

    // Save the clean answer (no raw page markers) and the PDF's own citation. The page comes
    // from the first verified citation, never from the model's page text.
    // The timeline gets the plain answer: no page links or markers (those stay in the chat only).
    const cleanText = stripLinks(buildAnswerLinks(msg.text, msg.citations).map((p) => p.text).join('\n\n'));
    const firstCite = (msg.citations || []).find((c: any) => c.supported === true && c.pageNumber);
    const savedPage = firstCite?.pageNumber || currentPage;

    const payload = {
      projectId: writeProjectId,
      type: 'note' as AtomType,
      title: questionTitle,
      content: {
        text: cleanText,
        markdownContent: cleanText,
      },
      metadata: {
        sourceUrl: activeDocument.sourceUrl || `/reader?doc=${activeDocument.id}&page=${savedPage}`,
        pageTitle: `${activeDocument.title} (Page ${savedPage})`,
        documentType: 'pdf' as const,
        documentName: activeDocument.filename,
        documentId: activeDocument.id,
        pageNumber: savedPage,
        totalDocumentPages: activeDocument.totalPages,
        ...(firstCite?.quote ? { citationQuote: firstCite.quote } : {}),
        ...(activeDocument.citation ? { citation: activeDocument.citation } : {}),
      },
      tags: ['ai-generated', 'doc-assistant'],
    };

    if (onCreateAtom) {
      onCreateAtom(payload);
      showToast({ type: 'success', message: 'Saved AI response to project.' });
    } else {
      try {
        const res = await fetch('/api/atoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast({ type: 'success', message: 'Saved AI response to project.' });
        } else {
          showToast({ type: 'error', message: 'Failed to save AI response.' });
        }
      } catch (err) {
        showToast({ type: 'error', message: 'Failed to save AI response.' });
      }
    }
  };

  const currentDocHighlights = useMemo(() => {
    return savedHighlights.filter((h) => h.docId === activeDocId);
  }, [savedHighlights, activeDocId]);

  // ─── 1. RENDER MAIN VIEW (LIBRARY OR READER + MODALS) ────────────
  const recentDoc = documents.length > 0 ? documents[0] : null;
  const filteredOtherDocs = (documents.length > 1 ? documents.slice(1) : []).filter((d) => {
    if (!librarySearchQuery.trim()) return true;
    const q = librarySearchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.filename.toLowerCase().includes(q) ||
      d.author?.toLowerCase().includes(q) ||
      (d.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#EAEEF4] dark:bg-[#09090B] text-[#0F172A] dark:text-[#FAFAFA] font-sans overflow-hidden transition-colors select-none">
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.txt,.md,.rtf"
        className="hidden"
      />

      {isLibraryView ? (
        <div className="flex-1 flex flex-col h-full bg-[#EAEEF4] dark:bg-[#09090B] text-[#0F172A] dark:text-[#FAFAFA] font-sans overflow-hidden transition-colors">
          {/* Library Header */}
          <div className="px-5 py-3 bg-[#FAFBFD] dark:bg-[#121214] border-b border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
              <h1 className="font-display font-bold text-sm md:text-base text-[#0F172A] dark:text-white">
                Document Vault & Knowledge Library
              </h1>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B] text-slate-600 dark:text-zinc-400 border border-[#D2DCEA] dark:border-[#27272A]">
                {documents.length} documents
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#325FEC] hover:bg-[#274AC4] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UploadSimple size={13} weight="bold" />
                <span>Upload PDF</span>
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Close Documents View"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Library Scroll Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

              {isLoadingDocs ? (
                /* ── Sleek Library Loading Skeleton (No blank flashes on sub-project switch) ── */
                <div className="space-y-6 animate-pulse select-none">
                  {/* Hero Card Skeleton */}
                  <div className="space-y-2">
                    <div className="h-3.5 w-48 bg-slate-200 dark:bg-zinc-800 rounded" />
                    <div className="bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="w-14 h-18 rounded-xl bg-slate-200 dark:bg-zinc-800 flex-shrink-0" />
                        <div className="space-y-2.5 flex-1 min-w-0">
                          <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
                          <div className="h-5 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded" />
                          <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-zinc-800 rounded" />
                          <div className="h-3 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded pt-1" />
                        </div>
                      </div>
                      <div className="h-9 w-36 bg-slate-200 dark:bg-zinc-800 rounded-xl flex-shrink-0" />
                    </div>
                  </div>

                  {/* Grid Skeleton */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#D2DCEA] dark:border-[#27272A]">
                      <div className="h-4 w-44 bg-slate-200 dark:bg-zinc-800 rounded" />
                      <div className="h-8 w-60 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div
                          key={n}
                          className="bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl p-4 space-y-4 min-h-[140px] flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-800" />
                              <div className="w-16 h-4 rounded-full bg-slate-200 dark:bg-zinc-800" />
                            </div>
                            <div className="space-y-1.5">
                              <div className="h-4 w-full bg-slate-200 dark:bg-zinc-800 rounded" />
                              <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-zinc-800 rounded" />
                            </div>
                          </div>
                          <div className="pt-2.5 border-t border-[#D2DCEA]/50 dark:border-[#27272A] flex items-center justify-between">
                            <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
                            <div className="h-3 w-10 bg-slate-200 dark:bg-zinc-800 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : documents.length === 0 ? (
                <div className="max-w-md mx-auto my-12 text-center p-8 rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEF3F8] dark:bg-[#18181B] flex items-center justify-center text-[#325FEC] dark:text-[#518FFF] mx-auto">
                    <FilePdf size={28} weight="fill" />
                  </div>
                  <h3 className="text-base font-display font-semibold text-[#0F172A] dark:text-white">
                    Nothing uploaded yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    Upload research papers, PDF preprints, or documents to read, save highlights, and extract citations.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTriggerUpload}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#325FEC] hover:bg-[#274AC4] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Upload Research Paper</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. HERO: MOST RECENTLY VIEWED / READ DOCUMENT */}
                  {recentDoc && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        <BookmarkSimple size={14} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
                        <span>Most Recently Viewed Document</span>
                      </div>

                      <div className="bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] hover:border-[#325FEC] dark:hover:border-[#518FFF] rounded-2xl p-6 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-14 h-18 rounded-xl bg-[#EEF3F8] dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex flex-col items-center justify-center p-2 text-center flex-shrink-0 shadow-xs">
                            <FilePdf size={28} className="text-red-500 mb-1" weight="fill" />
                            <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-400">PDF</span>
                          </div>

                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-blue-50/80 dark:bg-blue-950/40 text-[#325FEC] dark:text-[#518FFF] border border-blue-200 dark:border-blue-900 font-semibold">
                                Active Reading
                              </span>
                              <span className="text-xs font-mono text-slate-400 dark:text-zinc-500">
                                {recentDoc.totalPages || 1} pages · {normalizeDocFileSize(recentDoc.fileSize, recentDoc.totalPages)}
                              </span>
                            </div>

                            <h2 className="font-display font-bold text-base md:text-lg text-[#0F172A] dark:text-white line-clamp-1">
                              {recentDoc.title || recentDoc.filename}
                            </h2>

                            {recentDoc.author && (
                              <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
                                By {recentDoc.author}
                              </p>
                            )}

                            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-zinc-500 pt-1">
                              <span>{savedHighlights.filter((h) => h.docId === recentDoc.id).length} highlights saved</span>
                              <span>•</span>
                              <span>Updated {formatDocDate(recentDoc.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDocId(recentDoc.id);
                              setIsLibraryView(false);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-xs font-semibold shadow-sm transition-all cursor-pointer"
                          >
                            <BookOpen size={14} weight="bold" />
                            <span>Resume Reading (p. {currentPage || 1})</span>
                            <ArrowRight size={13} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocToDelete(recentDoc);
                            }}
                            className="p-2 rounded-xl border border-[#D2DCEA] dark:border-[#27272A] hover:border-red-300 dark:hover:border-red-900/60 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title={`Delete ${recentDoc.filename}`}
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. ALL OTHER UPLOADED DOCUMENTS */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#D2DCEA] dark:border-[#27272A]">
                      <div className="flex items-center gap-2">
                        <FolderSimple size={16} className="text-slate-500 dark:text-zinc-400" weight="bold" />
                        <h3 className="font-display font-semibold text-sm text-[#0F172A] dark:text-white">
                          All Project Documents ({documents.length > 1 ? documents.length - 1 : documents.length})
                        </h3>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search documents by title or author..."
                          value={librarySearchQuery}
                          onChange={(e) => setLibrarySearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Grid of Other Documents */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {filteredOtherDocs.map((doc) => {
                        const docHlCount = savedHighlights.filter((h) => h.docId === doc.id).length;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => {
                              setActiveDocId(doc.id);
                              setCurrentPage(1);
                              setIsLibraryView(false);
                            }}
                            className="group bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] hover:border-[#325FEC] dark:hover:border-[#518FFF] rounded-2xl p-4 cursor-pointer transition-all shadow-xs flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="w-8 h-8 rounded-lg bg-[#EEF3F8] dark:bg-[#18181B] flex items-center justify-center text-red-500 border border-[#D2DCEA] dark:border-[#27272A]">
                                  <FilePdf size={18} weight="fill" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B] text-slate-600 dark:text-zinc-400 border border-[#D2DCEA] dark:border-[#27272A]">
                                    {doc.totalPages || 1} pages
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDocToDelete(doc);
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                    title={`Delete ${doc.filename}`}
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              </div>

                              <h4 className="font-display font-semibold text-xs md:text-sm text-[#0F172A] dark:text-white group-hover:text-[#325FEC] dark:group-hover:text-[#518FFF] transition-colors line-clamp-2">
                                {doc.title || doc.filename}
                              </h4>

                              {projectId === 'all' && (
                                <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate" title={doc.projectId}>
                                  {(() => {
                                    const own = libraryProjects.find((p) => p.id === doc.projectId);
                                    const parent = own?.parentId ? libraryProjects.find((p) => p.id === own.parentId) : undefined;
                                    return parent ? `${parent.title} / ${own?.title}` : own?.title || 'Unknown project';
                                  })()}
                                </p>
                              )}

                              {doc.author && (
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                                  {doc.author}
                                </p>
                              )}
                            </div>

                            <div className="mt-4 pt-2.5 border-t border-[#D2DCEA]/50 dark:border-[#27272A] flex items-center justify-between text-[11px]">
                              <span className="font-mono text-slate-400 dark:text-zinc-500">
                                {docHlCount} highlights
                              </span>
                              <span className="text-[#325FEC] dark:text-[#518FFF] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                <span>Read</span>
                                <ArrowRight size={11} weight="bold" />
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Upload New Document Card */}
                      <button
                        type="button"
                        onClick={handleTriggerUpload}
                        className="border-2 border-dashed border-[#CBD5E1] dark:border-[#38383F] hover:border-[#325FEC] dark:hover:border-[#518FFF] hover:bg-[#EEF3F8]/50 dark:hover:bg-[#18181B]/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group/upload cursor-pointer min-h-[140px]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#EEF3F8] dark:bg-[#18181B] flex items-center justify-center text-[#325FEC] dark:text-[#518FFF] mb-2 group-hover/upload:scale-110 transition-transform">
                          <Plus size={20} weight="bold" />
                        </div>
                        <span className="font-display font-semibold text-xs text-[#0F172A] dark:text-white">
                          Upload Research Paper
                        </span>
                        <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          PDF, DOCX, or Markdown
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      ) : (
        /* Active Reader Content */
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">

      {/* ───── COMPACT TOOLBAR (Design System Matched) ───── */}
      <header className="h-11 px-3 border-b border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] flex items-center justify-between gap-3 flex-shrink-0 select-none">

        {/* Left: Library Back Button & Active Document Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setIsLibraryView(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF3F8] hover:bg-[#E2EAF4] dark:bg-[#18181B] dark:hover:bg-[#222226] text-xs font-sans font-semibold text-[#0F172A] dark:text-zinc-200 border border-[#D2DCEA] dark:border-[#27272A] transition-colors flex-shrink-0 cursor-pointer"
            title="Back to Document Vault"
          >
            <BookOpen size={14} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
            <span>Library</span>
          </button>

          <div className="h-4 w-px bg-[#D2DCEA] dark:bg-[#27272A]" />

          {activeDocument ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <FilePdf size={16} className="text-red-500 flex-shrink-0" weight="fill" />
                <span
                  title={
                    activeDocument.citation
                      ? `${isRetracted(activeDocument.citation) ? 'RETRACTED. ' : ''}${readConfidence(activeDocument.citation).warnings.length ? 'Verify this source. ' : ''}${formatCitationLine(activeDocument.citation)}`
                      : undefined
                  }
                  className="text-xs md:text-sm font-display font-semibold text-[#0F172A] dark:text-[#FAFAFA] truncate max-w-[220px] md:max-w-[360px]"
                >
                  {activeDocument.title || activeDocument.filename}
                </span>
              </div>

              {activeDocument.sourceUrl && (
                <a
                  href={activeDocument.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#18181B]"
                  title={`Source: ${activeDocument.sourceUrl}`}
                >
                  <ArrowSquareOut size={13} />
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleTriggerUpload}
              className="text-xs text-slate-400 dark:text-zinc-500 hover:text-[#325FEC] dark:hover:text-[#518FFF] italic flex items-center gap-1.5 cursor-pointer"
            >
              <UploadSimple size={14} />
              <span>No document loaded • Click to upload</span>
            </button>
          )}
        </div>

        {/* Center: Search & Page Controls */}
        {activeDocument && (
          <div className="flex items-center gap-2 select-none">

            {/* In-Document Search */}
            <div className="relative flex items-center">
              <MagnifyingGlass size={13} className="absolute left-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentMatchIndex(0); }}
                placeholder="Find in PDF..."
                className="pl-7 pr-14 py-1 w-36 md:w-48 bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-lg text-xs text-[#0F172A] dark:text-[#FAFAFA] placeholder-slate-400 outline-none focus:border-[#325FEC] dark:focus:border-[#518FFF] transition-colors"
              />
              {searchQuery && (
                <div className="absolute right-1.5 flex items-center gap-0.5 text-[9.5px] font-mono text-slate-400">
                  <span>{searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0'}</span>
                  <button onClick={handlePrevSearchMatch} className="p-0.5 hover:text-[#0F172A] dark:hover:text-white">
                    <CaretUp size={10} weight="bold" />
                  </button>
                  <button onClick={handleNextSearchMatch} className="p-0.5 hover:text-[#0F172A] dark:hover:text-white">
                    <CaretDown size={10} weight="bold" />
                  </button>
                </div>
              )}
            </div>

            {/* Compact Page Controls */}
            <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] px-2 py-1 rounded-lg text-xs">
              <button
                onClick={() => jumpToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-0.5 text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white disabled:opacity-30"
                title="Previous Page"
              >
                <CaretLeft size={13} weight="bold" />
              </button>
              <div className="flex items-center gap-1 font-mono text-xs text-[#0F172A] dark:text-[#FAFAFA] whitespace-nowrap px-1">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={activeDocument.totalPages || 1}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val >= 1 && val <= (activeDocument.totalPages || 1)) {
                      jumpToPage(val);
                    }
                  }}
                  className="w-8 text-center bg-transparent border-b border-slate-300 dark:border-zinc-700 outline-none focus:border-[#325FEC] dark:focus:border-[#518FFF] font-semibold"
                />
                <span className="text-slate-400 dark:text-zinc-500">/ {activeDocument.totalPages || 1}</span>
              </div>
              <button
                onClick={() => jumpToPage(Math.min(activeDocument.totalPages || 1, currentPage + 1))}
                disabled={currentPage >= (activeDocument.totalPages || 1)}
                className="p-0.5 text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white disabled:opacity-30"
                title="Next Page"
              >
                <CaretRight size={13} weight="bold" />
              </button>

              <span className="w-px h-3 bg-[#E2E5EB] dark:bg-[#27272A] mx-1" />

              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                className="p-0.5 text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                title="Zoom Out"
              >
                <MagnifyingGlassMinus size={13} />
              </button>
              <span className="font-mono text-xs text-slate-600 dark:text-zinc-300 min-w-[28px] text-center font-medium">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
                className="p-0.5 text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                title="Zoom In"
              >
                <MagnifyingGlassPlus size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Right: Upload File + Doc Assistant */}
        <div className="flex items-center gap-2 flex-shrink-0 select-none">
          <button
            onClick={handleTriggerUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium bg-white dark:bg-[#18181B] hover:bg-[#F1F4F9] dark:hover:bg-[#222226] text-slate-700 dark:text-zinc-300 border border-[#E2E5EB] dark:border-[#27272A] transition-colors cursor-pointer"
            title="Upload PDF or document"
          >
            <UploadSimple size={14} className="text-slate-500 dark:text-zinc-400" />
            <span>Upload PDF</span>
          </button>

          {activeDocument?.citation && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDocCitationOpen(!docCitationOpen)}
                title="Show citation"
                className="p-1.5 rounded-lg text-[#325FEC] dark:text-[#518FFF] hover:bg-[#E4ECF6] dark:hover:bg-[#222226] transition-colors cursor-pointer"
              >
                <BookOpen size={15} weight="bold" />
              </button>
              {docCitationOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-lg border border-[#E4ECF6] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-3 shadow-lg text-xs text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${readConfidence(activeDocument.citation!).warnings.length || isRetracted(activeDocument.citation) ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      {activeDocument.citation!.status === 'page_tags' ? 'Web page' : activeDocument.citation!.status.replace(/_/g, ' ')}
                    </span>
                    <CitationStyleBar record={activeDocument.citation!} style={docCitationStyle} onStyleChange={setDocCitationStyle} testIdPrefix="doc-citation" />
                  </div>
                  <CitationPreview record={activeDocument.citation!} style={docCitationStyle} testIdPrefix="doc-citation" />
                  {isRetracted(activeDocument.citation) ? (
                    <div data-testid="doc-retraction-warning" className="mt-2 rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-2 text-[11px]">
                      <p className="font-medium text-amber-700 dark:text-amber-400">{RETRACTED_MESSAGE}</p>
                    </div>
                  ) : null}
                  {readConfidence(activeDocument.citation!).warnings.length ? (
                    <div className="mt-2 rounded-md bg-[#F4F4F5] dark:bg-[#1F1F23] p-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <p className="font-medium text-amber-700 dark:text-amber-400">This might not be the source. Please verify.</p>
                      <p className="mt-0.5">{readConfidence(activeDocument.citation!).warnings.join(' ')}</p>
                    </div>
                  ) : null}
                  {readConfidence(activeDocument.citation!).notes.length ? (
                    <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">{readConfidence(activeDocument.citation!).notes.join(' ')}</p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
              isAiOpen
                ? 'bg-[#325FEC] text-white shadow-xs'
                : 'bg-white dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#E2E5EB] dark:border-[#27272A] hover:bg-[#F1F4F9] dark:hover:bg-[#222226]'
            }`}
          >
            <ChatCircleText size={14} weight="fill" className={isAiOpen ? 'text-white' : 'text-[#325FEC] dark:text-[#518FFF]'} />
            <span>Doc Assistant</span>
          </button>
        </div>
      </header>

      {/* ───── MAIN CANVAS & SIDEBAR ───── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Custom Native-Style PDF Canvas (PDF.js Renderer with Integrated Left Panel) ── */}
        <div
          ref={pagesContainerRef}
          className="grid-soft flex-1 overflow-hidden flex flex-col items-center bg-[#E3EAF6] dark:bg-[#09090B] relative transition-colors"
        >
          {isLoadingDocs ? (
            /* ── Rich Document Reader Loading Skeleton (Smooth transition between sub-projects) ── */
            <div className="flex-1 flex w-full h-full animate-pulse select-none overflow-hidden">
              {/* Left sidebar thumbnails skeleton */}
              <div className="w-48 md:w-56 border-r border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#121214] p-3 space-y-3 flex-shrink-0">
                <div className="h-6 w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="space-y-3 pt-2">
                  <div className="h-36 w-full bg-slate-100 dark:bg-zinc-800/60 rounded-lg" />
                  <div className="h-36 w-full bg-slate-100 dark:bg-zinc-800/60 rounded-lg" />
                  <div className="h-36 w-full bg-slate-100 dark:bg-zinc-800/60 rounded-lg" />
                </div>
              </div>
              {/* Center document canvas page skeleton */}
              <div className="flex-1 flex flex-col items-center py-6 px-4 bg-[#EAEEF4] dark:bg-[#09090B] overflow-y-auto">
                <div className="w-full max-w-2xl min-h-[820px] bg-white dark:bg-[#121214] border border-[#CBD5E1]/80 dark:border-[#27272A] rounded-sm p-12 space-y-5 shadow-md flex-shrink-0">
                  <div className="h-6 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded-md pb-2" />
                  <div className="space-y-3 pt-4">
                    <div className="h-3.5 w-full bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    <div className="h-3.5 w-full bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    <div className="h-3.5 w-11/12 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    <div className="h-3.5 w-4/5 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                  </div>
                  <div className="space-y-3 pt-4">
                    <div className="h-3.5 w-full bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    <div className="h-3.5 w-full bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    <div className="h-3.5 w-5/6 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                  </div>
                  <div className="space-y-3 pt-4">
                    <div className="h-3.5 w-full bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    <div className="h-3.5 w-3/4 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ) : !activeDocument ? (
            <div className="max-w-md mx-auto my-14 text-center p-6 rounded-xl border border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#121214] shadow-xs select-none">
              <FilePdf size={32} className="mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
              <h3 className="text-xs font-display font-bold text-[#0F172A] dark:text-[#FAFAFA]">No PDF document loaded</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Upload a PDF file from your computer to load the document and start clipping highlights.
              </p>
              <button
                onClick={handleTriggerUpload}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
              >
                <UploadSimple size={13} weight="bold" />
                <span>Upload PDF</span>
              </button>
            </div>
          ) : (
            /* ───── Custom PDF.js Viewer (With Integrated Collapsible Left Panel) ───── */
            <CustomPDFViewer
              pdfData={activeDocument.fileUrl}
              zoomLevel={zoomLevel}
              currentPage={currentPage}
              onPageChange={(p) => setCurrentPage(p)}
              onTotalPagesDetected={handlePdfPagesExtracted}
              searchQuery={searchQuery}
              targetHighlightText={activeHighlightText}
              onTextSelected={handleCustomPdfTextSelected}
              isSidebarOpen={isHighlightsSidebarOpen}
              onToggleSidebar={() => setIsHighlightsSidebarOpen(!isHighlightsSidebarOpen)}
              savedHighlights={savedHighlights}
              selectedHighlightId={selectedHighlightId}
              activeDocId={activeDocument.id}
              onDeleteHighlight={handleDeleteHighlight}
              onSaveHighlightManually={(text, page) => handleSaveHighlight(text, page)}
              onJumpToHighlight={(text, page) => {
                const hl = savedHighlights.find((h) => h.docId === activeDocument.id && h.pageNumber === page && h.text === text);
                setSelectedHighlightId(hl ? hl.id : null);
                jumpToPage(page, text);
              }}
              onClearActiveHighlight={() => {
                setActiveHighlightText('');
                setSelectedHighlightId(null);
              }}
              filename={activeDocument.filename}
              pages={activeDocument.pages}
            />
          )}
        </div>

        {/* ── Floating Selection Action Pill (Save Highlight Clip - Clamped Viewport) ── */}
        {selectedText && selectionPosition && (() => {
          const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
          const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
          const clampedX = Math.max(120, Math.min(winW - 120, selectionPosition.x));
          const clampedY = Math.max(72, Math.min(winH - 60, selectionPosition.y));
          return (
            <div
              data-testid="save-clip-pill"
              style={{
                position: 'fixed',
                left: `${clampedX}px`,
                top: `${clampedY - 8}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999
              }}
              className="bg-[#0F172A] dark:bg-[#18181B] text-white border border-slate-700/80 dark:border-zinc-700 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150 select-none z-50 cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
              onClick={() => !justSaved && handleSaveHighlight()}
            >
              {justSaved ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 select-none">
                  <Check size={13} weight="bold" />
                  <span>Saved highlight</span>
                </span>
              ) : (
                <button
                  type="button"
                  data-testid="save-clip-button"
                  className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-white hover:text-[#518FFF] transition-colors select-none cursor-pointer"
                >
                  <BookmarkSimple size={13} weight="bold" className="text-[#518FFF]" />
                  <span>Save Clip</span>
                  <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 dark:bg-zinc-800 px-1.5 py-0.2 rounded-full">
                    p. {selectedPageNum}
                  </span>
                </button>
              )}
            </div>
          );
        })()}

        {/* ── Doc Assistant Drawer (Grounded in Active Uploaded PDF) ── */}
        {isAiOpen && (
          <aside
            style={{ width: assistantWidth }}
            data-testid="assistant-panel"
            className="relative border-l border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#121214] flex flex-col flex-shrink-0 z-20 shadow-xl select-none"
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize assistant panel"
              data-testid="assistant-resize-handle"
              onPointerDown={startAssistantResize}
              className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize z-30 hover:bg-[#325FEC]/40 active:bg-[#325FEC]/60 transition-colors"
            />
            <div className="px-3 py-2 border-b border-[#E2E5EB] dark:border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ChatCircleText size={14} className="text-[#325FEC] dark:text-[#518FFF]" weight="fill" />
                <span className="text-xs font-display font-bold text-[#0F172A] dark:text-[#FAFAFA]">Doc Assistant</span>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="p-0.5 text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 select-text">
              {aiMessages.length === 0 && !isAiLoading && (
                <p data-testid="doc-assistant-empty" className="px-1 py-1 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                  Ask a question about this paper. Answers use only its text.
                </p>
              )}
              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  data-testid={msg.role === 'assistant' ? 'assistant-answer' : 'user-message'}
                  className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#F1F4F9] dark:bg-[#18181B] text-[#0F172A] dark:text-[#FAFAFA] ml-3 font-medium'
                      : 'relative group/aimsg bg-white dark:bg-[#0E0E10] border border-[#E2E5EB] dark:border-[#27272A] text-slate-700 dark:text-zinc-300 mr-1 space-y-2'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      {/* Right padding keeps the hover toolbar from covering the link icons. */}
                      <div className="space-y-2 pr-9">
                        {buildAnswerLinks(msg.text, msg.citations || []).map((para, pi) => (
                          <div key={pi} className="space-y-1">
                            {para.segments.map((seg, si) => (
                              <div key={si} className="flex items-end gap-1">
                                <div className="min-w-0">
                                  {seg.text && <FormattedAIMessage content={seg.text} hideSectionHeaders />}
                                </div>
                                {seg.citationIndexes.length > 0 && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
                                    {seg.citationIndexes.map((ci) => {
                                      const c = msg.citations![ci];
                                      return (
                                        <button
                                          key={ci}
                                          type="button"
                                          data-testid="answer-citation-link"
                                          data-keep-highlight
                                          data-page={c.pageNumber}
                                          title={linkTitle(c)}
                                          aria-label={linkTitle(c)}
                                          onClick={() => openCitation(c, i)}
                                          className="inline-flex items-center p-0.5 rounded text-slate-400 dark:text-zinc-500 hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors cursor-pointer"
                                        >
                                          <LinkSimple size={12} weight="bold" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/aimsg:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            handleSaveAiResponse(msg, i);
                            setSavedAiMessages(prev => new Set(prev).add(i));
                            setTimeout(() => {
                              setSavedAiMessages(prev => {
                                const next = new Set(prev);
                                next.delete(i);
                                return next;
                              });
                            }, 2000);
                          }}
                          className="p-1.5 rounded-md bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] shadow-xs text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors cursor-pointer"
                          title="Save AI answer to project"
                        >
                          {savedAiMessages.has(i) ? (
                            <Check size={14} className="text-emerald-500" weight="bold" />
                          ) : (
                            <FolderPlus size={14} />
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}

                  {/* Grounded Page Citations and 1-Click Jumping */}
                  {msg.role === 'assistant' && citeNotice?.msgIndex === i && (
                    <div data-testid="citation-not-located" className="mt-2 p-2 rounded-md bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] text-[10.5px] text-slate-500 dark:text-zinc-400">
                      Source passage could not be located on page {citeNotice.page}.
                    </div>
                  )}

                  {/* Claim support warning: only when a claim is not backed by a quote in the document */}
                  {msg.role === 'assistant' && msg.hasUnsupportedClaims && (
                    <div className="mt-2 p-2 rounded-md bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] text-[10.5px] text-amber-600 dark:text-amber-400">
                      This might not be the source. Please verify.
                    </div>
                  )}
                </div>
              ))}
              {isAiLoading && (
                <div className="p-2.5 bg-[#F8F9FB] dark:bg-[#18181B] rounded-lg text-xs text-slate-400 flex items-center gap-2 select-none">
                  <ArrowsClockwise size={12} className="animate-spin" />
                  <span>Reading uploaded PDF context...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-2 border-t border-[#E2E5EB] dark:border-[#27272A] flex items-center gap-1 select-none">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAiQuestion(); }}
                placeholder="Ask about this document..."
                className="flex-1 bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-md px-2 py-1 text-xs text-[#0F172A] dark:text-[#FAFAFA] placeholder-slate-400 outline-none focus:border-[#325FEC] dark:focus:border-[#518FFF]"
              />
              <button
                onClick={handleAiQuestion}
                disabled={!aiInput.trim() || isAiLoading}
                className="p-1 btn-gradient disabled:opacity-40 rounded-md transition-colors shadow-xs"
              >
                <PaperPlaneRight size={12} weight="fill" />
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* ───── 1. DOCUMENT MANAGER MODAL ───── */}
      {isDocManagerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl w-full max-w-lg shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 max-h-[85vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E5EB] dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <FolderSimple size={16} className="text-slate-500 dark:text-zinc-400" weight="bold" />
                <h3 className="text-xs font-display font-bold text-[#0F172A] dark:text-[#FAFAFA]">Document Manager</h3>
                <span className="text-[9.5px] font-mono text-slate-400 dark:text-zinc-500 bg-[#F1F4F9] dark:bg-[#18181B] px-1.5 py-0.2 rounded border border-[#E2E5EB] dark:border-[#27272A]">
                  {documents.length} docs
                </span>
              </div>
              <button onClick={() => { setIsDocManagerOpen(false); setDocToDelete(null); }} className="text-slate-400 hover:text-[#0F172A] dark:hover:text-white">
                <X size={14} />
              </button>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {documents.length === 0 ? (
                <div className="animate-popIn text-center py-6">
                  <EmptyLibraryIllustration className="w-20 h-14 mx-auto mb-1" />
                  <p className="text-xs text-slate-400 dark:text-zinc-500">No documents listed yet.</p>
                </div>
              ) : (
                documents.map((doc) => {
                  const isCurrent = doc.id === activeDocId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setActiveDocId(doc.id);
                        setCurrentPage(1);
                        setIsDocManagerOpen(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#325FEC] dark:border-[#518FFF] bg-blue-50/40 dark:bg-[#18181B]'
                          : 'border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#0E0E10] hover:bg-[#F8F9FB] dark:hover:bg-[#18181B]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <div className="w-7 h-7 rounded-md bg-[#F1F4F9] dark:bg-[#18181B] flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-zinc-400 border border-[#E2E5EB] dark:border-[#27272A]">
                          {doc.filename.endsWith('.pdf') ? (
                            <FilePdf size={15} />
                          ) : doc.filename.includes('doc') ? (
                            <FileDoc size={15} />
                          ) : (
                            <FileText size={15} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-[#0F172A] dark:text-[#FAFAFA] truncate">
                              {doc.filename}
                            </p>
                            {isCurrent && (
                              <span className="text-[9px] font-mono text-[#325FEC] dark:text-[#518FFF] bg-blue-100 dark:bg-blue-950 px-1 py-0.2 rounded border border-blue-200 dark:border-blue-900 flex-shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-slate-400 dark:text-zinc-500 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1C1C1F] text-slate-600 dark:text-zinc-300 font-medium">
                              {doc.totalPages || 1} {doc.totalPages === 1 ? 'page' : 'pages'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1C1C1F] text-slate-600 dark:text-zinc-400 font-medium">
                              {normalizeDocFileSize(doc.fileSize, doc.totalPages)}
                            </span>
                            {doc.publicationDate && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1C1C1F] text-slate-600 dark:text-zinc-400 font-medium">
                                {formatDocDate(doc.publicationDate)}
                              </span>
                            )}
                            {doc.author && (
                              <>
                                <span className="text-slate-300 dark:text-zinc-600">•</span>
                                <span className="truncate max-w-[110px]">{doc.author}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocToDelete(doc);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                        title="Delete document"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer with Upload Action */}
            <div className="p-3 border-t border-[#E2E5EB] dark:border-[#27272A] bg-[#F8F9FB] dark:bg-[#09090B]/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Click any document to load it onto the canvas
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsDocManagerOpen(false);
                  handleTriggerUpload();
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#325FEC] hover:bg-[#274AC4] text-white text-xs font-medium rounded-md shadow-xs transition-colors"
              >
                <Plus size={12} weight="bold" />
                <span>Upload New PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    )}

      {/* ───── 2. DEDICATED DOCUMENT DELETION CONFIRMATION MODAL (High Z-Index, Clean Styling) ───── */}
      {docToDelete && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => !isDeletingDoc && setDocToDelete(null)}
        >
          <div
            className="bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150 relative pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clean Header with Simple Red Trash Icon */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <Trash size={20} weight="bold" className="text-red-500 flex-shrink-0" />
                <div>
                  <h4 className="font-display font-bold text-sm text-[#0F172A] dark:text-[#FAFAFA]">Delete Document</h4>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">Remove from project library</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingDoc && setDocToDelete(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Document Preview Details Card */}
            <div className="p-3.5 bg-[#F8F9FB] dark:bg-[#18181B] rounded-xl border border-[#E2E5EB] dark:border-[#27272A] space-y-2">
              <div className="flex items-center gap-2.5">
                <FilePdf size={20} className="text-slate-500 dark:text-zinc-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#0F172A] dark:text-[#FAFAFA] truncate">
                    {docToDelete.filename}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    {docToDelete.title}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-[#E2E5EB]/60 dark:border-[#27272A]">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-[#27272A] text-slate-700 dark:text-zinc-300 font-medium">
                  {docToDelete.totalPages || 1} {docToDelete.totalPages === 1 ? 'page' : 'pages'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-[#27272A] text-slate-700 dark:text-zinc-300 font-medium">
                  {normalizeDocFileSize(docToDelete.fileSize, docToDelete.totalPages)}
                </span>
                {docToDelete.publicationDate && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-[#222226] px-2 py-0.5 rounded-md">
                    {formatDocDate(docToDelete.publicationDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#27272A]">
              <button
                type="button"
                disabled={isDeletingDoc}
                onClick={() => setDocToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#18181B] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingDoc}
                onClick={() => handleDeleteDoc(docToDelete.id)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingDoc ? (
                  <>
                    <ArrowsClockwise size={13} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash size={13} weight="bold" />
                    <span>Delete Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── 3. CLEAN SINGLE-FIELD PRE-UPLOAD MODAL (WITH LIVE PERCENTAGE LOADING BAR & DROPZONE) ───── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-2xl w-full max-w-md shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E5EB] dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <UploadSimple size={16} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
                <h3 className="text-sm font-display font-bold text-[#0F172A] dark:text-[#FAFAFA]">
                  Upload Document to Vault
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-[#0F172A] dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-5 space-y-4">
              {!uploadFileName ? (
                /* Empty Dropzone State */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) processUploadedFile(file);
                  }}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                  className="border-2 border-dashed border-[#CBD5E1] dark:border-[#38383F] hover:border-[#325FEC] dark:hover:border-[#518FFF] bg-[#F8F9FB] dark:bg-[#18181B]/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-[#325FEC] dark:text-[#518FFF] group-hover:scale-105 transition-transform shadow-xs">
                    <FilePdf size={28} weight="fill" className="text-[#325FEC] dark:text-[#518FFF]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                      Drag & drop your PDF here, or click to browse
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                      Supports PDF, DOCX, TXT, or Markdown documents (up to 50 MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-[#325FEC] hover:bg-[#274AC4] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
                  >
                    <UploadSimple size={13} weight="bold" />
                    <span>Choose PDF File</span>
                  </button>
                </div>
              ) : (
                /* File Selected / Parsed State */
                <>
                  {/* Single File Name Input with Plain Neutral File Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-mono font-semibold uppercase text-slate-500 dark:text-zinc-400">
                        Document Title
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                            fileInputRef.current.click();
                          }
                        }}
                        className="text-[10px] font-mono text-[#325FEC] dark:text-[#518FFF] hover:underline cursor-pointer"
                      >
                        Change file
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <FilePdf size={16} className="absolute left-3 text-red-500 flex-shrink-0" weight="fill" />
                      <input
                        type="text"
                        value={uploadFileName}
                        onChange={(e) => setUploadFileName(e.target.value)}
                        placeholder="e.g. research_paper.pdf"
                        className="w-full pl-9 pr-3 py-2 bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl text-xs font-medium text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC] dark:focus:border-[#518FFF] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Animated Upload Percentage Loading Bar Box */}
                  <div className="p-4 rounded-xl bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#325FEC] dark:text-[#518FFF] flex-shrink-0">
                          {uploadProgress < 100 ? (
                            <UploadSimple size={18} className="animate-pulse" weight="bold" />
                          ) : (
                            <CheckCircle size={18} weight="bold" className="text-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#0F172A] dark:text-[#FAFAFA] truncate">
                            {uploadProgress < 100 ? uploadStatusText || 'Parsing...' : 'Document parsed & ready'}
                          </p>
                          <p className="text-[10.5px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                            {uploadPages.length > 0
                              ? `${uploadPages.length} pages extracted · ${uploadFileSize}`
                              : `${uploadFileSize} • Processing document structures`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#325FEC] dark:text-[#518FFF] flex-shrink-0">
                        {uploadProgress}%
                      </span>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-[#27272A] rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-zinc-800">
                      <div
                        className="h-full bg-[#325FEC] rounded-full transition-all duration-300 ease-out relative"
                        style={{ width: `${Math.max(4, uploadProgress)}%` }}
                      >
                        {uploadProgress < 100 && (
                          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* No DOI found: the user confirms the citation details. Nothing is saved until "Save citation". */}
                  {citationPromptOpen && uploadProgress >= 100 && !isUploadingFile && (
                    <div className="p-3 rounded-xl bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] space-y-2.5">
                      <div>
                        <p className="text-[11px] font-semibold text-[#0F172A] dark:text-[#FAFAFA]">No DOI found in this PDF</p>
                        <p className="text-[10.5px] text-slate-400 dark:text-zinc-500">Enter the citation details, or skip. Only what you enter is saved.</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-slate-400">Title</label>
                        <input
                          type="text"
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                          className="w-full bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-slate-400">Author</label>
                          <input
                            type="text"
                            value={manualAuthor}
                            onChange={(e) => setManualAuthor(e.target.value)}
                            placeholder="Smith, Jones"
                            className="w-full bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-slate-400">Year</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={manualYear}
                            onChange={(e) => setManualYear(e.target.value)}
                            placeholder="2024"
                            className="w-full bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC]"
                          />
                        </div>
                      </div>
                      {!isValidManualYear(manualYear) && (
                        <p className="text-[10.5px] text-amber-700 dark:text-amber-400">Year must be four digits, or left empty.</p>
                      )}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-slate-400">Type</label>
                        <select
                          value={manualSourceType}
                          onChange={(e) => setManualSourceType(e.target.value as 'unknown' | 'journal_article')}
                          className="w-full bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC]"
                        >
                          <option value="unknown">Unknown</option>
                          <option value="journal_article">Journal article</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setCitationPromptOpen(false)}
                          className="px-3 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:bg-[#E2E5EB] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!manualTitle.trim() || !isValidManualYear(manualYear)) return;
                            setUploadCitation(
                              buildManualCitation({
                                title: manualTitle,
                                author: manualAuthor,
                                year: manualYear,
                                sourceType: manualSourceType,
                              }),
                            );
                            setCitationPromptOpen(false);
                          }}
                          disabled={!manualTitle.trim() || !isValidManualYear(manualYear)}
                          className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#E4ECF6] dark:bg-[#27272A] hover:bg-[#D4DFF0] dark:hover:bg-[#33333A] text-[#0F172A] dark:text-[#FAFAFA] disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Save citation
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadCitation?.resolvedFrom === 'manual' && !citationPromptOpen && (
                    <div className="flex items-start justify-between gap-2 text-[10.5px] text-slate-500 dark:text-zinc-400">
                      <p className="leading-relaxed break-words">Citation: {formatCitationLine(uploadCitation)}</p>
                      <button
                        type="button"
                        onClick={() => setCitationPromptOpen(true)}
                        className="flex-shrink-0 text-[#325FEC] dark:text-[#518FFF] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  )}

                  {projectId === 'all' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Save to project</label>
                      <select
                        value={uploadTargetId}
                        onChange={(e) => setUploadTargetId(e.target.value)}
                        className="w-full bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC]"
                      >
                        {libraryProjects.length === 0 && <option value="">No projects yet</option>}
                        {libraryProjects.map((p) => {
                          const parent = libraryProjects.find((x) => x.id === p.parentId);
                          return (
                            <option key={p.id} value={p.id}>{parent ? `${parent.title} / ${p.title}` : p.title}</option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Optional Collapsible Metadata */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedUploadMeta(!showAdvancedUploadMeta)}
                      className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CaretDown size={11} className={`transform transition-transform ${showAdvancedUploadMeta ? 'rotate-180' : ''}`} />
                      <span>{showAdvancedUploadMeta ? 'Hide extra details' : 'Add author or source link (optional)'}</span>
                    </button>

                    {showAdvancedUploadMeta && (
                      <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-[#27272A] animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                            <User size={11} />
                            <span>Author / Organization</span>
                          </label>
                          <input
                            type="text"
                            value={uploadAuthor}
                            onChange={(e) => setUploadAuthor(e.target.value)}
                            placeholder="e.g. Anthropic Research"
                            className="w-full bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                            <LinkSimple size={11} />
                            <span>Source URL</span>
                          </label>
                          <input
                            type="url"
                            value={uploadSourceUrl}
                            onChange={(e) => setUploadSourceUrl(e.target.value)}
                            placeholder="https://arxiv.org/abs/..."
                            className="w-full bg-[#F8F9FB] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3 border-t border-[#E2E5EB] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#09090B]/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFileName('');
                  setUploadPages([]);
                  setUploadContent('');
                  setCitationPromptOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-[#E2E5EB] dark:hover:bg-[#18181B] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {uploadFileName && (
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={!uploadFileName.trim() || isUploadingFile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isUploadingFile ? (
                    <ArrowsClockwise size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} weight="bold" />
                  )}
                  <span>{isUploadingFile ? 'Uploading...' : 'Save & Open in Reader'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───── 4. TOAST NOTIFICATION PILL ───── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] shadow-2xl animate-in slide-in-from-bottom-3 fade-in duration-200 select-none">
          {toast.type === 'success' ? (
            <CheckCircle size={18} weight="bold" className="text-emerald-500 flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <Warning size={18} weight="bold" className="text-red-500 flex-shrink-0" />
          ) : (
            <FileText size={18} className="text-[#325FEC] flex-shrink-0" />
          )}
          <span className="text-xs font-medium text-[#0F172A] dark:text-[#FAFAFA]">
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-0.5 rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
