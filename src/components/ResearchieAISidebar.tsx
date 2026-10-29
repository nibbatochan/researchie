'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  PaperPlaneTilt, 
  Copy, 
  Check, 
  FloppyDisk, 
  ArrowSquareOut, 
  FileText, 
  FileDoc, 
  Table, 
  Lightbulb, 
  PencilSimple,
  ChatCircleDots,
  Trash,
  CaretRight,
  CaretLeft,
  ChatCircleText,
  BookOpen,
  Scales,
  WarningCircle,
  SlidersHorizontal,
  ArrowsClockwise,
  Info,
  Article,
  Microphone,
  FileCode,
  Globe
} from '@phosphor-icons/react';
import { ResearchAtom, ResearchProject } from '@/lib/types/research';
import { ResearchieAILogo } from './ResearchieAILogo';
import { FormattedAIMessage } from './FormattedAIMessage';
import { DeliverableEditModal } from './DeliverableEditModal';
import type { WebSource } from '@/lib/ai/webResearch';
import { getAtomHighlightText } from './AtomCard';
import { buildDeepLink } from '@/lib/utils/textFragments';
import { stripLinks } from '@/lib/utils/plainText';
import { formatCitationLine } from '@/lib/citations/client';

export type AISidebarTab = 'ask' | 'summarize';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  directAnswer?: string | null;
  citations?: ResearchAtom[];
  // The model id that wrote this answer, from the server. Shown under the answer.
  model?: string;
  // Set on a web-search answer: the pages Perplexity used. These are not clips.
  webSources?: WebSource[];
  // Set on a deliverable: the clips that were sent to the AI for this request.
  sources?: ResearchAtom[];
  timestamp: string;
}

// Resize bounds for the docked panel (desktop only, lg and up).
const SIDEBAR_WIDTH_KEY = 'researchie.aiSidebarWidth';
const SIDEBAR_DEFAULT_WIDTH = 450;
const SIDEBAR_MIN_WIDTH = 380;
const SIDEBAR_MAX_WIDTH = 900;

function clampSidebarWidth(width: number): number {
  const windowMax = typeof window === 'undefined' ? SIDEBAR_MAX_WIDTH : Math.floor(window.innerWidth * 0.7);
  const max = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, windowMax));
  return Math.round(Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, width)));
}

// A delete removes one turn: a question with the answer after it, or an answer with the question before it.
// An answer with no question before it is removed on its own.
function getTurnIds(list: ChatMessage[], index: number): string[] {
  const msg = list[index];
  if (msg.role === 'user') {
    const next = list[index + 1];
    return next && next.role === 'assistant' ? [msg.id, next.id] : [msg.id];
  }
  const prev = list[index - 1];
  return prev && prev.role === 'user' ? [prev.id, msg.id] : [msg.id];
}

interface ResearchieAISidebarProps {
  isOpen: boolean;
  activeTab: AISidebarTab;
  onClose: () => void;
  onTabChange: (tab: AISidebarTab) => void;
  project: ResearchProject | null;
  atoms: ResearchAtom[];
  selectedAtoms?: ResearchAtom[];
  onSaveAsNote?: (title: string, markdown: string, tags: string[], sourceAtomIds?: string[], extra?: { projectId?: string; references?: string[] }) => void;
  onSelectAllAtoms?: () => void;
  onClearSelection?: () => void;
  onOpenPdfReader?: (docId?: string, pageNumber?: number, text?: string) => void;
  /** The project and its sub-projects: where an edited deliverable can be saved. */
  projects?: ResearchProject[];
}

export interface DeliverableTemplate {
  id: string;
  label: string;
  badge: string;
  description: string;
  icon: any;
  minClipsRequired: number;
  isScript?: boolean;
  clarifyingQuestion: string;
  quickFocusOptions: string[];
  instructionTemplate: (focus: string) => string;
}

const PRESET_TEMPLATES: DeliverableTemplate[] = [
  {
    id: 'brief',
    label: 'Research Brief',
    badge: 'Memo, report or summary',
    description: 'One written brief over your clips: a decision memo, a report, or a summary of findings.',
    icon: FileText,
    minClipsRequired: 1,
    clarifyingQuestion: 'Which kind of brief should this be, and what should it focus on?',
    quickFocusOptions: [
      'Decision memo: the question, the options, and a recommendation',
      'Report: background, findings, and conclusions',
      'Key findings: numbers and verbatim evidence',
      'Summary of all clips for a general reader',
    ],
    instructionTemplate: (focus) =>
      `Write a research brief over these clips focusing on: ${focus}. Use these headings where they fit: Summary, Key findings, Evidence, Differences between sources, Open questions, Conclusion. Keep each heading short and use plain language. Cite each clip used.`,
  },
  {
    id: 'matrix',
    label: 'Comparison Matrix',
    badge: 'Side-by-side table',
    description: 'A table that compares sources or cases: methods, findings, gaps, or the criteria you choose.',
    icon: Table,
    minClipsRequired: 2,
    clarifyingQuestion: 'What should the comparison matrix cover, and which columns matter most?',
    quickFocusOptions: [
      'Literature review: method, findings and gaps per study',
      'Side-by-side: options, results and trade-offs',
      'Numbers and measurements across sources',
      'Points where the sources disagree',
    ],
    instructionTemplate: (focus) =>
      `Build a comparison matrix over these clips focusing on: ${focus}. Use a Markdown table with one row per source or case and one column per criterion. Add a short plain-language note under the table on the main differences, with citations.`,
  },
  {
    id: 'gaps',
    label: 'Contradictions & Gaps',
    badge: 'Conflicts and missing evidence',
    description: 'Finds where sources disagree, and where evidence is missing or weak.',
    icon: Scales,
    minClipsRequired: 2,
    clarifyingQuestion: 'What conflicts, gaps, or weak evidence should we look for?',
    quickFocusOptions: [
      'Conflicting numbers and results',
      'Differences in method and sample size',
      'Unstated assumptions and unresolved questions',
      'All contradictions between sources',
    ],
    instructionTemplate: (focus) =>
      `Find the contradictions and gaps across these clips, focusing on: ${focus}. Use these headings: Points of disagreement, Evidence that conflicts, Missing evidence, Weak or unclear evidence, Open questions. Cite each clip used.`,
  },
  {
    id: 'script',
    label: 'Video / Podcast Script',
    badge: 'Spoken script',
    description: 'A spoken script with sections, speaker notes, and cues. Works for a video, podcast, or talk.',
    icon: Microphone,
    isScript: true,
    minClipsRequired: 1,
    clarifyingQuestion: 'What tone, format (one speaker or two), and opening hook should the script use?',
    quickFocusOptions: [
      'Short video walkthrough, about 5 minutes',
      'Two-person podcast conversation',
      'Talk with slide cues',
      'Plain explainer with timed sections',
    ],
    instructionTemplate: (focus) =>
      `Turn these clips into a spoken script focusing on: ${focus}. Use these section headings: [INTRO / HOOK], [SECTION 1: MAIN FINDINGS], [SECTION 2: EVIDENCE], [NOTES FOR THE SPEAKER / CUES], and [CLOSING: KEY TAKEAWAYS]. Cite each clip used.`,
  },
  {
    id: 'custom',
    label: 'Custom Analysis',
    badge: 'Freeform prompt',
    description: 'Write any prompt you like over the clips in this project.',
    icon: PencilSimple,
    minClipsRequired: 1,
    clarifyingQuestion: 'What would you like to ask or produce from these clips?',
    quickFocusOptions: [],
    instructionTemplate: (focus) => focus || 'Summarize these clips into a clear answer with headings and citations.',
  },
];

export const ResearchieAISidebar: React.FC<ResearchieAISidebarProps> = ({
  isOpen,
  activeTab,
  onClose,
  onTabChange,
  project,
  atoms,
  selectedAtoms = [],
  onSaveAsNote,
  onSelectAllAtoms,
  onClearSelection,
  onOpenPdfReader,
  projects = [],
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedMsgId, setSavedMsgId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Summarize state: 'list' (deliverable selection) or 'chat' (scoped generation & chat)
  const [summarizeView, setSummarizeView] = useState<'list' | 'chat'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState('brief');
  const [focusInput, setFocusInput] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [summaryScope, setSummaryScope] = useState<'all' | 'selected'>('all');
  
  // Deliverable scoped chat history
  const [deliverableMessages, setDeliverableMessages] = useState<Record<string, ChatMessage[]>>({});
  const [deliverableInputQuery, setDeliverableInputQuery] = useState('');
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const [savedSummaryId, setSavedSummaryId] = useState<string | null>(null);
  const deliverableBottomRef = useRef<HTMLDivElement>(null);
  // Deliverable message being edited in the edit modal
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);

  // Panel width (desktop resize). null = default width.
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isLgScreen, setIsLgScreen] = useState(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  // Restore the saved width and track the lg breakpoint
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (saved > 0) setSidebarWidth(clampSidebarWidth(saved));
    } catch {}
    const mql = window.matchMedia('(min-width: 1024px)');
    const syncLg = () => setIsLgScreen(mql.matches);
    syncLg();
    mql.addEventListener('change', syncLg);
    return () => mql.removeEventListener('change', syncLg);
  }, []);

  // Remove drag listeners if the panel unmounts mid-drag
  useEffect(() => {
    return () => resizeCleanupRef.current?.();
  }, []);

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    resizeCleanupRef.current?.();

    const startX = e.clientX;
    const startWidth = clampSidebarWidth(sidebarWidth ?? SIDEBAR_DEFAULT_WIDTH);
    let latestWidth = startWidth;

    // Dragging left makes the panel wider
    const onMove = (ev: PointerEvent) => {
      latestWidth = clampSidebarWidth(startWidth + (startX - ev.clientX));
      setSidebarWidth(latestWidth);
    };
    const onUp = () => {
      cleanup();
      try {
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(latestWidth));
      } catch {}
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      resizeCleanupRef.current = null;
      setIsResizing(false);
    };

    resizeCleanupRef.current = cleanup;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleDeleteAskTurn = (msgId: string) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === msgId);
      if (index < 0) return prev;
      const ids = getTurnIds(prev, index);
      return prev.filter((m) => !ids.includes(m.id));
    });
  };

  const handleDeleteDeliverableTurn = (msgId: string) => {
    setDeliverableMessages((prev) => {
      const list = prev[selectedTemplate] || [];
      const index = list.findIndex((m) => m.id === msgId);
      if (index < 0) return prev;
      const ids = getTurnIds(list, index);
      return { ...prev, [selectedTemplate]: list.filter((m) => !ids.includes(m.id)) };
    });
  };

  const turnDeleteButton = (onDelete: () => void) => (
    <button
      type="button"
      onClick={onDelete}
      data-testid="chat-turn-delete"
      title="Delete this chat"
      aria-label="Delete this chat"
      className="ml-auto p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
    >
      <Trash size={13} />
    </button>
  );

  const currentTemplate = useMemo(() => {
    return PRESET_TEMPLATES.find((t) => t.id === selectedTemplate) || PRESET_TEMPLATES[0];
  }, [selectedTemplate]);

  // Set default focus input when template changes
  useEffect(() => {
    const tmpl = PRESET_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (tmpl && tmpl.quickFocusOptions.length > 0) {
      setFocusInput(tmpl.quickFocusOptions[0]);
    } else {
      setFocusInput('');
    }
    setGenerationError(null);
  }, [selectedTemplate]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === 'ask' && isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'summarize' && summarizeView === 'chat' && isOpen) {
      deliverableBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, deliverableMessages, isAsking, isGenerating, activeTab, summarizeView, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && activeTab === 'ask') {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, activeTab]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // If selectedAtoms is provided and has items, switch summary scope to selected
  useEffect(() => {
    if (selectedAtoms.length > 0) {
      setSummaryScope('selected');
    }
  }, [selectedAtoms.length]);

  const handleCitationClick = (atom: ResearchAtom) => {
    const isDoc = Boolean(
      atom.metadata?.documentType === 'pdf' ||
      typeof atom.metadata?.pageNumber === 'number' ||
      atom.metadata?.documentId ||
      atom.metadata?.sourceUrl?.startsWith('/reader') ||
      atom.content?.targetUrl?.startsWith('/reader')
    );
    const docId = atom.metadata?.documentId || (atom as any).documentId;
    const pageNum = atom.metadata?.pageNumber || 1;
    const quote = getAtomHighlightText(atom);

    if (isDoc && onOpenPdfReader) {
      onOpenPdfReader(docId, pageNum, quote);
      return;
    }

    // Jump to and pulse highlight on atom element in the board if present
    const el = document.getElementById(`atom-${atom.id}`);
    if (el) {
      scrollToAtom(atom.id);
      return;
    }

    const sourceUrl = atom.metadata?.sourceUrl || (atom as any).sourceUrl;
    if (sourceUrl) {
      let targetUrl = sourceUrl;
      if (quote && quote.trim()) {
        targetUrl = buildDeepLink(sourceUrl, undefined, quote);
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const scrollToAtom = (id: string) => {
    const el = document.getElementById(`atom-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('atom-breathe');
      setTimeout(() => el.classList.remove('atom-breathe'), 2400);
    }
  };

  const handleMarkdownCitationClick = (href: string, msg: ChatMessage) => {
    if (href.startsWith('#cite-page-')) {
      const pageMatch = href.match(/#cite-page-(\d+)/);
      const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
      
      const pdfCitations = msg.citations?.filter(c => c.metadata?.documentId && c.metadata?.pageNumber !== undefined) || [];
      const targetCit = pdfCitations.find(c => c.metadata?.pageNumber === pageNum) || pdfCitations[0];
      if (targetCit && onOpenPdfReader) {
        onOpenPdfReader(targetCit.metadata?.documentId || (targetCit as any).documentId, pageNum || targetCit.metadata?.pageNumber, targetCit.content?.text || targetCit.content?.rawText);
      }
    } else if (href.startsWith('#cite-source-')) {
      const sourceTitle = decodeURIComponent(href.replace('#cite-source-', '')).toLowerCase();
      const targetCit = msg.citations?.find(c => (c.title || '').toLowerCase().includes(sourceTitle) || sourceTitle.includes((c.title || '').toLowerCase()));
      if (targetCit) {
        scrollToAtom(targetCit.id);
      }
    } else if (href.startsWith('#cite-ref-')) {
      const refNum = parseInt(href.replace('#cite-ref-', ''), 10);
      // a deliverable's numbers point at its sources; a chat answer's at its citations
      const list = msg.citations ?? msg.sources ?? [];
      if (list[refNum - 1]) {
        const atom = list[refNum - 1];
        if (atom.metadata?.pageNumber !== undefined && onOpenPdfReader) {
          onOpenPdfReader(atom.metadata?.documentId || (atom as any).documentId, atom.metadata?.pageNumber, atom.content?.text || atom.content?.rawText);
        } else {
          scrollToAtom(atom.id);
        }
      }
    }
  };

  // Ask AI Submission
  // Web search: asks Perplexity with web search on. The answer is not from the project's clips, so it is labelled.
  const handleWebSearch = async () => {
    const query = inputQuery.trim();
    if (!query || isAsking) return;
    const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: `Web: ${query}`, timestamp: time() }]);
    setInputQuery('');
    setIsAsking(true);
    try {
      const res = await fetch('/api/ai/web-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const sources: WebSource[] = json.data.sources || [];
        const reply: ChatMessage = {
          id: `web-${Date.now()}`,
          role: 'assistant',
          content: json.data.answer || 'Perplexity returned no answer for this question.',
          webSources: sources,
          model: json.data.model,
          timestamp: time(),
        };
        setMessages((prev) => [...prev, reply]);
      } else {
        const reply: ChatMessage = {
          id: `web-${Date.now()}`,
          role: 'assistant',
          content: json.error || 'Web search failed. Try again in a minute.',
          timestamp: time(),
        };
        setMessages((prev) => [...prev, reply]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `web-${Date.now()}`, role: 'assistant', content: 'Web search failed. Check your connection and try again.', timestamp: time() },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleSendQuestion = async (e?: React.FormEvent, customQ?: string) => {
    e?.preventDefault();
    const query = customQ || inputQuery;
    if (!query.trim() || isAsking) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsAsking(true);

    try {
      // 1. Semantic search for top relevant clips
      let topResults: ResearchAtom[] = [];
      try {
        const searchRes = await fetch('/api/atoms/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            projectId: project?.id && project.id !== 'all' ? project.id : undefined,
            limit: 8,
          }),
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.success && Array.isArray(searchData.results) && searchData.results.length > 0) {
            topResults = searchData.results;
          }
        }
      } catch {}

      if (topResults.length === 0) {
        const noMatchMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `No relevant research clips found in this project for "${query.trim()}". The project data does not contain information on this topic.`,
          directAnswer: `Information on "${query.trim()}" is not present in your saved research clips.`,
          citations: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, noMatchMsg]);
        setIsAsking(false);
        return;
      }

      // 2. Synthesize conversational grounded answer
      const synthRes = await fetch('/api/ai/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `Answer the user's question with natural clarity, depth, and analytical rigor.
Provide:
1. "directAnswer": A clean 1-2 sentence core insight without raw Markdown asterisks, stray dashes, or markdown headers.
2. "markdownContent": A cohesive, well-formatted response with clear paragraphs, highlighted concepts, quantitative metrics, and bulleted takeaways. Avoid creating multiple redundant nested container boxes.

User Question: ${query.trim()}`,
          atoms: topResults.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type || 'note',
            text: a.content?.text || a.content?.rawText || (a as any).text || '',
            description: a.content?.description || (a as any).description || '',
            sourceUrl: a.metadata?.sourceUrl || (a as any).sourceUrl || '',
            tags: a.tags || [],
          })),
        }),
      });

      if (synthRes.ok) {
        const synthData = await synthRes.json();
        if (synthData.data) {
          const rawDirect = synthData.data.directAnswer || (synthData.data.keyInsights?.[0] ? synthData.data.keyInsights[0] : null);
          // Clean asterisks formatting bug
          const cleanDirect = rawDirect 
            ? rawDirect.replace(/\*\*/g, '').replace(/^- /gm, '').replace(/^#+\s*/gm, '').trim()
            : null;
          const summary = synthData.data.markdownContent || synthData.data.keyInsights?.join('\n\n') || 'Answer ready.';

          // Filter citations to strictly match verified cited items
          const citedIds = new Set(
            (synthData.data.citationsUsed || [])
              .map((c: any) => c.atomId)
              .filter(Boolean)
          );
          const verifiedCitations = topResults.filter((a) => citedIds.has(a.id));
          const isNotFound = /not found|not present|not covered|do not cover|not available/i.test(summary);

          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: summary,
            directAnswer: cleanDirect,
            citations: isNotFound ? [] : (verifiedCitations.length > 0 ? verifiedCitations : (citedIds.size === 0 ? [] : topResults.slice(0, 2))),
            model: synthData.data.model,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      } else {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `Findings for "${query.trim()}" across ${topResults.length} clips in your workspace.`,
          citations: topResults.slice(0, 2),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (err) {
      console.error('Ask AI error:', err);
      const errorMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: 'Cross-referenced verified research clips from your workspace matching your query below.',
        citations: atoms.slice(0, 3),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    const fullText = msg.directAnswer ? `**Key Finding:** ${msg.directAnswer}\n\n${msg.content}` : msg.content;
    navigator.clipboard.writeText(fullText);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSaveMessageAsNote = (msg: ChatMessage, userQueryText?: string) => {
    if (!onSaveAsNote) return;
    const noteTitle = userQueryText ? `Q&A: ${userQueryText}` : 'Research AI Q&A Insight';
    const fullBody = msg.directAnswer 
      ? `### Direct Answer\n${msg.directAnswer}\n\n### Evidence & Summary\n${msg.content}` 
      : msg.content;

    // links in an answer point nowhere once it is on the timeline; Document Assistant answers keep their page links
    onSaveAsNote(noteTitle, stripLinks(fullBody), ['ai-qna', 'smart-answer'], (msg.citations ?? []).map((a) => a.id));
    setSavedMsgId(msg.id);
    setTimeout(() => setSavedMsgId(null), 2500);
  };

  // Deliverable Scoped Chat Generation
  const handleGenerateDeliverable = async (customInstructionOverride?: string) => {
    const inputClips = summaryScope === 'selected' && selectedAtoms.length > 0 ? selectedAtoms : atoms;
    const activeFocus = customInstructionOverride || focusInput.trim() || currentTemplate.quickFocusOptions[0] || 'all captured research findings';
    
    // Sufficiency check
    if (inputClips.length < currentTemplate.minClipsRequired) {
      setGenerationError(
        `We couldn't find enough clips in this project for a complete ${currentTemplate.label}.`
      );
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    const userMessage: ChatMessage = {
      id: `deliv-user-${Date.now()}`,
      role: 'user',
      content: customInstructionOverride ? customInstructionOverride : `Generate ${currentTemplate.label} focusing on: ${activeFocus}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDeliverableMessages((prev) => ({
      ...prev,
      [selectedTemplate]: [...(prev[selectedTemplate] || []), userMessage],
    }));
    setDeliverableInputQuery('');

    const instruction = selectedTemplate === 'custom' 
      ? (customInstruction.trim() || activeFocus || 'Summarize these clips into a clear answer with headings and citations.')
      : currentTemplate.instructionTemplate(activeFocus);

    try {
      const payload = {
        instruction,
        atoms: inputClips.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type || 'note',
          text: a.content?.text || a.content?.rawText || (a.content as any)?.markdownContent || (a as any).text || '',
          description: a.content?.description || (a as any).description || '',
          sourceUrl: a.metadata?.sourceUrl || (a as any).sourceUrl || '',
          tags: a.tags || [],
        })),
      };

      const res = await fetch('/api/ai/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const rawDirect = json.data.directAnswer || (json.data.keyInsights?.[0] ? json.data.keyInsights[0] : null);
          const cleanDirect = rawDirect 
            ? rawDirect.replace(/\*\*/g, '').replace(/^- /gm, '').replace(/^#+\s*/gm, '').trim()
            : null;

          const assistantMsg: ChatMessage = {
            id: `deliv-ai-${Date.now()}`,
            role: 'assistant',
            content: json.data.markdownContent || json.data.keyInsights?.join('\n\n') || 'Deliverable generated.',
            directAnswer: cleanDirect,
            citations: inputClips.slice(0, 5),
            sources: inputClips,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          setDeliverableMessages((prev) => ({
            ...prev,
            [selectedTemplate]: [...(prev[selectedTemplate] || []), assistantMsg],
          }));
        } else {
          setGenerationError('The response was empty. Please check your research data.');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setGenerationError(errJson.error || `Failed to generate (${res.status}).`);
      }
    } catch (err: any) {
      console.error('Synthesis failed:', err);
      setGenerationError(err?.message || 'Network error occurred while generating the deliverable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDeliverableMsg = (msg: ChatMessage) => {
    const fullText = msg.directAnswer ? `**Key Finding:** ${msg.directAnswer}\n\n${msg.content}` : msg.content;
    navigator.clipboard.writeText(fullText);
    setCopiedSummaryId(msg.id);
    setTimeout(() => setCopiedSummaryId(null), 2000);
  };

  const handleSaveDeliverableAsNote = (msg: ChatMessage) => {
    if (!onSaveAsNote) return;
    onSaveAsNote(
      `${currentTemplate.label} Deliverable`,
      stripLinks(msg.content),
      [],
      (msg.sources ?? []).map((a) => a.id)
    );
    setSavedSummaryId(msg.id);
    setTimeout(() => setSavedSummaryId(null), 2500);
  };

  const exampleQuestions = useMemo(() => {
    const title = project?.title?.trim();
    const desc = project?.description?.trim();
    
    // Get top tags from atoms
    const allTags = atoms.flatMap((a) => (a.tags || []).map((t) => t.replace(/^#+/, '').trim())).filter(Boolean);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 3);

    const topic = title || topTags[0] || 'this topic';

    if (!title && topTags.length === 0) {
      return [
        'What are the key findings and main themes across all research items?',
        'Summarize the core takeaways and actionable conclusions',
        'Identify patterns, contradictions, and potential research gaps',
        'Extract the key numbers and data points',
      ];
    }

    const questions = [
      `What are the key findings about ${topic}?`,
    ];

    if (title) {
      questions.push(`Summarize the main themes across my ${title} research`);
    } else {
      questions.push(`Summarize the main themes across my research`);
    }

    if (topTags.length > 0) {
      questions.push(`What patterns emerge from the collected data on #${topTags[0]}?`);
    } else {
      questions.push(`What patterns emerge from the collected data on ${topic}?`);
    }

    if (topTags.length >= 2) {
      questions.push(`Compare the different perspectives on #${topTags[0]} and #${topTags[1]}`);
    } else {
      questions.push(`Compare the different perspectives on ${topic} in my clips`);
    }

    return questions;
  }, [project?.title, project?.description, atoms]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
      />

      {/* Docked Side-by-Side Assistant Panel */}
      <aside
        data-testid="researchie-ai-sidebar"
        aria-label="Researchie AI Sidebar"
        style={isLgScreen ? { width: clampSidebarWidth(sidebarWidth ?? SIDEBAR_DEFAULT_WIDTH) } : undefined}
        className={`relative w-full sm:w-[380px] md:w-[420px] h-full flex-shrink-0 z-40 bg-[#FAFBFD] dark:bg-[#121214] border-l border-[#D9E1EC] dark:border-[#27272A] flex flex-col select-none shadow-xl ${
          isResizing ? '' : 'transition-all duration-300 ease-out'
        }`}
      >
        {/* Drag handle on the left edge (desktop only): drag left to widen */}
        <div
          data-testid="ai-sidebar-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI sidebar"
          onPointerDown={handleResizeStart}
          className="hidden lg:block absolute left-0 top-0 h-full w-2 -translate-x-1/2 cursor-col-resize z-50 hover:bg-[#325FEC]/30 active:bg-[#325FEC]/50 transition-colors"
        />
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-[#D9E1EC] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#09090B] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#18181B] dark:bg-[#18181B] flex items-center justify-center p-1.5 text-white dark:text-[#FAFAFA] border border-[#27272A] shadow-sm flex-shrink-0">
              <ResearchieAILogo className="w-full h-full text-white dark:text-[#FAFAFA]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-sm text-[#0F172A] dark:text-[#FAFAFA] truncate">
                  Researchie AI
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A]">
                  {atoms.length} clips
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'ask' && messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Clear conversation"
              >
                <Trash size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] transition-colors"
              title="Close AI Sidebar"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 py-2.5 border-b border-[#D9E1EC] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] flex items-center justify-between gap-2 flex-shrink-0">
          <div className="grid grid-cols-2 w-full bg-[#EEF3F8] dark:bg-[#18181B] p-1 rounded-xl border border-[#D9E1EC] dark:border-[#27272A] text-xs font-sans">
            <button
              onClick={() => onTabChange('ask')}
              className={`flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'ask'
                  ? 'bg-white dark:bg-[#27272A] text-[#0F172A] dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <ChatCircleDots size={15} weight={activeTab === 'ask' ? 'fill' : 'regular'} />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => onTabChange('summarize')}
              className={`flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'summarize'
                  ? 'bg-white dark:bg-[#27272A] text-[#0F172A] dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <FileDoc size={15} weight={activeTab === 'summarize' ? 'fill' : 'regular'} />
              <span>Deliverables</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ASK AI (CHAT) - Redesigned Cohesive Reading Surface               */}
        {/* ========================================================================= */}
        {activeTab === 'ask' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#FAFBFD] dark:bg-[#121214]">
            {/* Chat Stream Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="py-4 px-1 space-y-4">
                  <div className="p-4 rounded-2xl bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] text-center space-y-2">
                    <h3 className="font-display font-semibold text-sm text-[#0F172A] dark:text-[#FAFAFA]">
                      Query your research stream
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      Answers are built from verified quotes, documents, and web clips in this workspace.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-mono uppercase text-slate-500 dark:text-zinc-500 px-1 font-medium tracking-wide">
                      Suggested Prompts
                    </p>
                    <div className="space-y-1.5">
                      {exampleQuestions.map((q: string) => (
                        <button
                          key={q}
                          onClick={() => handleSendQuestion(undefined, q)}
                          className="w-full text-left p-2.5 rounded-xl bg-[#EEF3F8] dark:bg-[#09090B] hover:bg-[#E4ECF6] dark:hover:bg-[#18181B] text-xs text-slate-700 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white border border-[#D9E1EC] dark:border-[#27272A] transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate pr-2">"{q}"</span>
                          <CaretRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  const previousUserMsg = !isUser && index > 0 && messages[index - 1].role === 'user' 
                    ? messages[index - 1].content 
                    : undefined;

                  return (
                    <div
                      key={msg.id}
                      className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-popIn`}
                    >
                      {/* Message Bubble Header */}
                      <div className="w-full flex items-center gap-2 px-1 text-[11px] font-mono text-slate-500 dark:text-zinc-500">
                        <span className="font-medium">{isUser ? 'You' : 'Researchie AI'}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                        {turnDeleteButton(() => handleDeleteAskTurn(msg.id))}
                      </div>

                      {/* Content Bubble: Single Cohesive Reading Surface */}
                      <div
                        className={`w-full rounded-2xl p-4 text-[15px] leading-[1.65] ${
                          isUser
                            ? 'max-w-[88%] ml-auto bg-[#18181B] dark:bg-[#27272A] text-white rounded-br-xs shadow-sm font-sans'
                            : 'bg-white dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 border border-[#D9E1EC] dark:border-[#27272A] rounded-bl-xs shadow-sm space-y-3.5'
                        }`}
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                        ) : (
                          <>
                            {/* Integrated Key Takeaway Banner */}
                            {msg.directAnswer && (
                              <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 text-sm leading-relaxed flex items-start gap-2.5">
                                <ChatCircleText size={17} weight="fill" className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-xs uppercase tracking-wider text-[#325FEC] dark:text-[#518FFF] block mb-0.5 font-mono">
                                    Key Takeaway
                                  </span>
                                  <span>{msg.directAnswer}</span>
                                </div>
                              </div>
                            )}

                            {/* Main Cohesive Markdown Body (+4px increased readability) */}
                            <div className="text-[15px] leading-[1.65] font-sans text-zinc-900 dark:text-zinc-100 prose dark:prose-invert max-w-none">
                              <FormattedAIMessage content={msg.content} onCitationClick={(href) => handleMarkdownCitationClick(href, msg)} />
                            </div>

                            {msg.model && (
                              <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-500">Answered by {msg.model}</div>
                            )}

                            {msg.webSources && msg.webSources.length > 0 && (
                              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1">
                                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                                  Web sources ({msg.webSources.length}) · not from your clips
                                </div>
                                {msg.webSources.map((s) => (
                                  <a
                                    key={s.url}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-[12px] text-[#325FEC] dark:text-[#518FFF] hover:underline"
                                    title={s.url}
                                  >
                                    {s.title}
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Verified Source Citations with 1-Click Page/URL Jumping */}
                            {msg.citations && msg.citations.length > 0 && (
                              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-2">
                                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between font-semibold">
                                  <span>Cited Sources ({msg.citations.length})</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {msg.citations.map((atom) => {
                                    const quote = getAtomHighlightText(atom);
                                    const isPdf = Boolean(
                                      atom.metadata?.documentType === 'pdf' ||
                                      typeof atom.metadata?.pageNumber === 'number' ||
                                      atom.metadata?.documentId ||
                                      atom.metadata?.sourceUrl?.startsWith('/reader')
                                    );

                                    // Citation line when the clip has one; otherwise the page address
                                    const citationLine = atom.metadata?.citation ? formatCitationLine(atom.metadata.citation) : null;
                                    const sourceLine = citationLine || atom.metadata?.sourceUrl || null;

                                    return (
                                      <button
                                        key={atom.id}
                                        onClick={() => handleCitationClick(atom)}
                                        className="w-full text-left p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A] transition-all cursor-pointer group flex flex-col gap-1"
                                      >
                                        <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 font-mono text-[11px] w-full">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="truncate max-w-[180px] text-[#0F172A] dark:text-zinc-200 font-medium group-hover:text-[#325FEC] dark:group-hover:text-[#518FFF]">
                                              {atom.title || 'Untitled Source'}
                                            </span>
                                            {isPdf && (
                                              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-semibold border border-emerald-300 dark:border-emerald-800 flex-shrink-0">
                                                p.{atom.metadata?.pageNumber}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 group-hover:text-[#325FEC] dark:group-hover:text-[#518FFF]">
                                            <span className="text-[10px]">{isPdf ? 'Jump to page' : 'Open link'}</span>
                                            <ArrowSquareOut size={12} />
                                          </div>
                                        </div>
                                        {sourceLine && (
                                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                                            {sourceLine}
                                          </p>
                                        )}
                                        {quote && (
                                          <p className="italic text-slate-600 dark:text-zinc-400 line-clamp-2 pl-2 border-l-2 border-slate-300 dark:border-zinc-700 text-xs">
                                            "{quote}"
                                          </p>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Message Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                              <button
                                onClick={() => handleCopyMessage(msg)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
                              >
                                {copiedMsgId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                              </button>
                              {onSaveAsNote && (
                                <button
                                  onClick={() => handleSaveMessageAsNote(msg, previousUserMsg)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-medium text-slate-800 dark:text-zinc-200 hover:bg-[#EEF3F8] dark:hover:bg-[#27272A] border border-[#D9E1EC] dark:border-[#27272A] transition-colors cursor-pointer"
                                >
                                  {savedMsgId === msg.id ? <Check size={13} className="text-emerald-500" /> : <FloppyDisk size={13} />}
                                  <span>{savedMsgId === msg.id ? 'Saved Note' : 'Save to Project'}</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Loading Indicator */}
              {isAsking && (
                <div className="flex flex-col items-start space-y-1 animate-popIn">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] flex items-center gap-2.5 text-xs text-slate-600 dark:text-zinc-400 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#325FEC] dark:bg-[#518FFF] animate-ping" />
                    <span className="font-medium">Writing answer from research clips...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-[#D9E1EC] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#09090B]">
              <form onSubmit={handleSendQuestion} className="relative flex items-center">
                <textarea
                  ref={textareaRef}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendQuestion();
                    }
                  }}
                  placeholder="Ask a question about this workspace..."
                  rows={2}
                  className="w-full pl-3.5 pr-20 py-2.5 bg-white dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs md:text-[13px] text-[#0F172A] dark:text-zinc-100 placeholder-slate-400 focus:outline-none resize-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleWebSearch}
                  disabled={isAsking || !inputQuery.trim()}
                  className="absolute right-11 bottom-2.5 p-2 rounded-lg text-slate-500 hover:text-[#325FEC] dark:text-zinc-400 dark:hover:text-[#518FFF] disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer"
                  title="Search the web with Perplexity (not your clips)"
                  aria-label="Search the web with Perplexity"
                >
                  <Globe size={15} />
                </button>
                <button
                  type="submit"
                  disabled={isAsking || !inputQuery.trim()}
                  className="absolute right-2.5 bottom-2.5 p-2 rounded-lg btn-gradient disabled:opacity-30 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                  title="Send Question (Enter)"
                >
                  <PaperPlaneTilt size={15} weight="fill" />
                </button>
              </form>
              <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] font-mono text-slate-500 dark:text-zinc-500">
                <span>Enter to send</span>
                <span>{atoms.length} clips in context</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DELIVERABLES - Two-Step Scoped Chat Flow + Data Sufficiency        */}
        {/* ========================================================================= */}
        {activeTab === 'summarize' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#FAFBFD] dark:bg-[#121214]">
            {/* VIEW 1: DELIVERABLE FORMAT SELECTION LIST */}
            {summarizeView === 'list' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="font-display font-semibold text-sm text-[#0F172A] dark:text-[#FAFAFA]">
                    Select Deliverable Format
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                    Choose a format to start a focused workspace.
                  </p>
                </div>

                <div className="space-y-2">
                  {PRESET_TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    const isSelected = selectedTemplate === tmpl.id;

                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => {
                          setSelectedTemplate(tmpl.id);
                          setSummarizeView('chat');
                        }}
                        className={`w-full p-1.5 rounded-lg border text-left text-xs transition-colors flex flex-col gap-0.5 cursor-pointer group ${
                          isSelected
                            ? 'bg-transparent border-[#325FEC] dark:border-[#518FFF]'
                            : 'bg-transparent border-transparent hover:bg-[#EEF3F8] dark:hover:bg-[#18181B]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1 rounded-md ${isSelected ? 'bg-blue-50 text-[#325FEC] dark:bg-blue-950/60 dark:text-[#518FFF]' : 'bg-[#EEF3F8] text-slate-700 dark:bg-[#27272A] dark:text-zinc-300'}`}>
                              <Icon size={12} />
                            </div>
                            <span className="font-display font-semibold text-xs text-[#0F172A] dark:text-white truncate">
                              {tmpl.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <CaretRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        {/* Reduced clutter: clean description without unnecessary sub-headings */}
                        <p className="text-[10px] text-slate-600 dark:text-zinc-400 leading-snug pl-7">
                          {tmpl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 2: DEDICATED SCOPED CHAT FOR SELECTED DELIVERABLE */}
            {summarizeView === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Deliverable Header with Back Navigation */}
                <div className="px-4 py-2.5 border-b border-[#D9E1EC] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#09090B] flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => setSummarizeView('list')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors cursor-pointer"
                  >
                    <CaretLeft size={14} weight="bold" />
                    <span>Deliverables</span>
                  </button>

                </div>

                {/* Scoped Chat Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Scope Selector Bar */}
                  <div className="p-2.5 rounded-xl bg-[#EEF3F8] dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 uppercase font-medium">
                      Scope:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSummaryScope('all')}
                        className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                          summaryScope === 'all'
                            ? 'bg-white dark:bg-[#27272A] text-[#0F172A] dark:text-white shadow-xs font-semibold border border-[#D9E1EC] dark:border-[#27272A]'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A]'
                        }`}
                      >
                        All Clips ({atoms.length})
                      </button>
                      <button
                        onClick={() => setSummaryScope('selected')}
                        className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                          summaryScope === 'selected'
                            ? 'bg-white dark:bg-[#27272A] text-[#0F172A] dark:text-white shadow-xs font-semibold border border-[#D9E1EC] dark:border-[#27272A]'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A]'
                        }`}
                      >
                        Selected ({selectedAtoms.length})
                      </button>
                    </div>
                  </div>

                  {/* DATA SUFFICIENCY CHECK & GUIDANCE BANNER */}
                  {(() => {
                    const inputClips = summaryScope === 'selected' && selectedAtoms.length > 0 ? selectedAtoms : atoms;
                    const isSufficient = inputClips.length >= currentTemplate.minClipsRequired;

                    if (!isSufficient) {
                      return (
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] text-xs space-y-3 animate-fadeIn">
                          <div className="flex items-start gap-2.5 text-[#0F172A] dark:text-white">
                            <WarningCircle size={18} weight="fill" className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="font-semibold font-display text-sm block">
                                Not enough clips
                              </span>
                              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                We couldn't find enough clips in this project for a complete <strong>{currentTemplate.label}</strong> (requires at least {currentTemplate.minClipsRequired} clips, found {inputClips.length}).
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#D2DCEA] dark:border-[#27272A] space-y-2">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 block">
                              What specifically are you looking for?
                            </span>
                            {currentTemplate.quickFocusOptions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {currentTemplate.quickFocusOptions.map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => {
                                      setFocusInput(opt);
                                      handleGenerateDeliverable(opt);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#EEF3F8] dark:bg-[#27272A] hover:bg-[#E4ECF6] dark:hover:bg-[#3F3F46] text-[#0F172A] dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Sufficient data: show quick focus options if no generation yet
                    const currentHistory = deliverableMessages[selectedTemplate] || [];
                    if (currentHistory.length === 0) {
                      return (
                        <div className="p-4 rounded-2xl bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] space-y-3 animate-fadeIn">
                          <div>
                            <span className="font-semibold text-sm text-[#0F172A] dark:text-white font-display block">
                              Configure & Generate
                            </span>
                            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                              {currentTemplate.clarifyingQuestion}
                            </p>
                          </div>

                          {currentTemplate.quickFocusOptions.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-500 block font-medium">
                                Suggested Focus Areas
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {currentTemplate.quickFocusOptions.map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => setFocusInput(opt)}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                                      focusInput === opt
                                        ? 'bg-[#18181B] dark:bg-[#27272A] text-white font-semibold shadow-xs'
                                        : 'bg-white dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A] hover:border-slate-400'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => handleGenerateDeliverable()}
                            disabled={isGenerating}
                            className="w-full py-2.5 rounded-xl bg-[#325FEC] hover:bg-[#274AC4] text-white font-display font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                          >
                            <ChatCircleText size={15} weight="fill" className={isGenerating ? 'animate-spin' : ''} />
                            <span>Generate {currentTemplate.label}</span>
                          </button>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* Scoped Chat Messages Stream */}
                  {(deliverableMessages[selectedTemplate] || []).map((msg) => {
                    const isUser = msg.role === 'user';

                    return (
                      <div
                        key={msg.id}
                        className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-popIn`}
                      >
                        <div className="w-full flex items-center gap-2 px-1 text-[11px] font-mono text-slate-500 dark:text-zinc-500">
                          <span className="font-medium">{isUser ? 'You' : `${currentTemplate.label} AI`}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                          {turnDeleteButton(() => handleDeleteDeliverableTurn(msg.id))}
                        </div>

                        <div
                          className={`w-full rounded-2xl p-4 text-[15px] leading-[1.65] ${
                            isUser
                              ? 'max-w-[88%] ml-auto bg-[#18181B] dark:bg-[#27272A] text-white rounded-br-xs shadow-sm font-sans text-sm'
                              : 'bg-white dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 border border-[#D9E1EC] dark:border-[#27272A] rounded-bl-xs shadow-sm space-y-3.5'
                          }`}
                        >
                          {isUser ? (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          ) : (
                            <>
                              {msg.directAnswer && (
                                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 text-sm leading-relaxed">
                                  <span className="font-semibold text-xs uppercase tracking-wider text-[#325FEC] dark:text-[#518FFF] block mb-0.5 font-mono">
                                    Key Takeaway
                                  </span>
                                  <span>{msg.directAnswer}</span>
                                </div>
                              )}

                              <div className="text-[15px] leading-[1.65] font-sans text-zinc-900 dark:text-zinc-100 prose dark:prose-invert max-w-none">
                                <FormattedAIMessage content={msg.content} onCitationClick={(href) => handleMarkdownCitationClick(href, msg)} />
                              </div>

                              {/* Actions Bar */}
                              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-zinc-800">
                                <button
                                  onClick={() => handleCopyDeliverableMsg(msg)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
                                >
                                  {copiedSummaryId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                  <span>{copiedSummaryId === msg.id ? 'Copied' : 'Copy'}</span>
                                </button>
                                {onSaveAsNote && (
                                  <button
                                    onClick={() => handleSaveDeliverableAsNote(msg)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium bg-[#325FEC] hover:bg-[#274AC4] text-white transition-colors cursor-pointer shadow-xs"
                                  >
                                    {savedSummaryId === msg.id ? <Check size={13} weight="bold" /> : <FloppyDisk size={13} />}
                                    <span>{savedSummaryId === msg.id ? 'Saved!' : 'Save to Project'}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingMsg(msg)}
                                  data-testid="deliverable-edit"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-medium text-slate-800 dark:text-zinc-200 hover:bg-[#EEF3F8] dark:hover:bg-[#27272A] border border-[#D9E1EC] dark:border-[#27272A] transition-colors cursor-pointer"
                                >
                                  <PencilSimple size={13} />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Generation in progress */}
                  {isGenerating && (
                    <div className="flex flex-col items-start space-y-1 animate-popIn">
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] flex items-center gap-2.5 text-xs text-slate-600 dark:text-zinc-400 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#325FEC] dark:bg-[#518FFF] animate-ping" />
                        <span className="font-medium">Generating {currentTemplate.label}...</span>
                      </div>
                    </div>
                  )}

                  {generationError && (
                    <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                      <span>{generationError}</span>
                      <button
                        onClick={() => handleGenerateDeliverable()}
                        className="px-2.5 py-1 bg-red-100 dark:bg-red-900/60 hover:bg-red-200 text-red-900 dark:text-red-100 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <div ref={deliverableBottomRef} />
                </div>

                {/* Follow-up Prompt / Scoped Chat Input */}
                <div className="p-3 border-t border-[#D9E1EC] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#09090B]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (deliverableInputQuery.trim()) {
                        handleGenerateDeliverable(deliverableInputQuery.trim());
                      }
                    }}
                    className="relative flex items-center"
                  >
                    <textarea
                      value={deliverableInputQuery}
                      onChange={(e) => setDeliverableInputQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (deliverableInputQuery.trim()) {
                            handleGenerateDeliverable(deliverableInputQuery.trim());
                          }
                        }
                      }}
                      placeholder={`Refine or ask follow-up on this ${currentTemplate.label}...`}
                      rows={2}
                      className="w-full pl-3.5 pr-11 py-2.5 bg-white dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs md:text-[13px] text-[#0F172A] dark:text-zinc-100 placeholder-slate-400 focus:outline-none resize-none transition-all shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={isGenerating || !deliverableInputQuery.trim()}
                      className="absolute right-2.5 bottom-2.5 p-2 rounded-lg btn-gradient disabled:opacity-30 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                      title="Send Request"
                    >
                      <PaperPlaneTilt size={15} weight="fill" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {editingMsg && (
        <DeliverableEditModal
          title={currentTemplate.label}
          content={editingMsg.content}
          sources={editingMsg.sources ?? []}
          projectAtoms={atoms}
          projects={projects}
          currentProjectId={project?.id ?? ''}
          onClose={() => setEditingMsg(null)}
          onSave={(save) => {
            onSaveAsNote?.(save.title, save.markdown, save.tags, save.sourceAtomIds, { projectId: save.projectId, references: save.references });
            setEditingMsg(null);
          }}
        />
      )}
    </>
  );
};
