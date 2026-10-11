'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowsClockwise,
  Warning,
  CaretLeft,
  SquaresFour,
  BookmarkSimple,
  Plus,
  Trash,
  ArrowSquareOut,
  X,
  Bookmark,
  FileText
} from '@phosphor-icons/react';

interface SavedHighlight {
  id: string;
  text: string;
  pageNumber: number;
  docId: string;
  savedAt: string;
}

interface CustomPDFViewerProps {
  pdfData?: string | Uint8Array | ArrayBuffer;
  pdfUrl?: string;
  filename?: string;
  pages?: Array<{ pageNumber: number; title?: string; content: string; highlights?: any[] }>;
  zoomLevel: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesDetected?: (totalPages: number, extractedPages: Array<{ pageNumber: number; title: string; content: string; highlights: any[] }>) => void;
  searchQuery?: string;
  targetHighlightText?: string;
  onTextSelected?: (text: string, pageNumber: number, position: { x: number; y: number }) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  savedHighlights: SavedHighlight[];
  activeDocId?: string;
  onDeleteHighlight?: (id: string) => void;
  onSaveHighlightManually?: (text: string, page: number) => void;
  onJumpToHighlight?: (text: string, pageNumber: number) => void;
  onClearActiveHighlight?: () => void;
}

export const CustomPDFViewer: React.FC<CustomPDFViewerProps> = ({
  pdfData,
  pdfUrl,
  filename,
  pages,
  zoomLevel,
  currentPage,
  onPageChange,
  onTotalPagesDetected,
  searchQuery = '',
  targetHighlightText = '',
  onTextSelected,
  isSidebarOpen,
  onToggleSidebar,
  savedHighlights = [],
  activeDocId = '',
  onDeleteHighlight,
  onSaveHighlightManually,
  onJumpToHighlight,
  onClearActiveHighlight,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightOriginPageRef = useRef<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'highlights'>('thumbnails');
  const [isManualClipOpen, setIsManualClipOpen] = useState<boolean>(false);
  const [manualClipText, setManualClipText] = useState<string>('');
  const [manualClipPage, setManualClipPage] = useState<number>(currentPage || 1);
  const [highlightToDelete, setHighlightToDelete] = useState<string | null>(null);
  const [isNonPdf, setIsNonPdf] = useState<boolean>(false);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isProgrammaticScroll = useRef<boolean>(false);

  // 1. Initialize PDF.js and Load Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadPdf() {
      try {
        const ext = filename ? filename.split('.').pop()?.toLowerCase() : '';
        if (ext && ['doc', 'docx', 'txt', 'md', 'markdown', 'rtf'].includes(ext)) {
          if (isMounted) {
            setIsNonPdf(true);
            setTotalPages(pages?.length || 1);
            setLoading(false);
          }
          return;
        }

        setIsNonPdf(false);
        const pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        let source: any = null;
        if (pdfData) {
          if (typeof pdfData === 'string' && pdfData.startsWith('data:')) {
            const base64 = pdfData.split(',')[1];
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            source = { data: bytes };
          } else if (typeof pdfData === 'string') {
            source = { url: pdfData };
          } else {
            source = { data: pdfData };
          }
        } else if (pdfUrl) {
          source = { url: pdfUrl };
        } else {
          setLoading(false);
          return;
        }

        const loadingTask = pdfjsLib.getDocument({
          ...source,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        // Extract all text client-side for immediate Doc Assistant accessibility
        const extracted: Array<{ pageNumber: number; title: string; content: string; highlights: any[] }> = [];
        for (let i = 1; i <= doc.numPages; i++) {
          try {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items
              .map((item: any) => ('str' in item ? item.str : ''))
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();

            extracted.push({
              pageNumber: i,
              title: `Page ${i}`,
              content: text || `[Page ${i} content]`,
              highlights: [],
            });
          } catch (pageErr) {
            console.warn(`Failed extracting page ${i}:`, pageErr);
          }
        }

        if (isMounted && onTotalPagesDetected) {
          onTotalPagesDetected(doc.numPages, extracted);
        }
      } catch (err: any) {
        console.error('PDF.js loading error:', err);
        if (isMounted) setError(err.message || 'Failed to load PDF');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfData, pdfUrl, filename, activeDocId]);

  // Track highlight origin page when targetHighlightText is activated
  useEffect(() => {
    if (targetHighlightText && targetHighlightText.trim()) {
      highlightOriginPageRef.current = currentPage;
    } else {
      highlightOriginPageRef.current = null;
    }
  }, [targetHighlightText, currentPage]);

  // 2. Continuous Scroll IntersectionObserver (Detects which page is in viewport)
  useEffect(() => {
    if (!scrollContainerRef.current || totalPages === 0) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        let maxRatio = 0;
        let activePageNum = currentPage;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const num = parseInt(entry.target.getAttribute('data-page-number') || '0', 10);
            if (num > 0) activePageNum = num;
          }
        });

        if (activePageNum > 0 && activePageNum !== currentPage) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (!isProgrammaticScroll.current) {
              onPageChange(activePageNum);
              setManualClipPage(activePageNum);

              // Auto-clear active highlight if user scrolls >= 2 pages away
              if (
                highlightOriginPageRef.current !== null &&
                Math.abs(activePageNum - highlightOriginPageRef.current) >= 2
              ) {
                onClearActiveHighlight?.();
                highlightOriginPageRef.current = null;
              }
            }
          }, 80);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.2, 0.5, 0.8],
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [totalPages, pdfDoc, currentPage, onPageChange, onClearActiveHighlight]);

  // Scroll to active page smoothly with retry if page elements are still mounting
  const scrollToPage = useCallback((pageNum: number) => {
    if (!pageNum || pageNum < 1) return;
    const el = pageRefs.current.get(pageNum);
    if (el && scrollContainerRef.current) {
      isProgrammaticScroll.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onPageChange(pageNum);
      setManualClipPage(pageNum);

      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 700);
    } else {
      let attempts = 0;
      const retryInterval = setInterval(() => {
        attempts++;
        const targetEl = pageRefs.current.get(pageNum);
        if (targetEl && scrollContainerRef.current) {
          clearInterval(retryInterval);
          isProgrammaticScroll.current = true;
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          onPageChange(pageNum);
          setManualClipPage(pageNum);
          setTimeout(() => {
            isProgrammaticScroll.current = false;
          }, 700);
        } else if (attempts >= 8) {
          clearInterval(retryInterval);
        }
      }, 100);
    }
  }, [onPageChange]);

  // External currentPage change handler (Always scrolls precisely without false skips)
  useEffect(() => {
    if (currentPage && !isProgrammaticScroll.current) {
      scrollToPage(currentPage);
    }
  }, [currentPage, scrollToPage]);

  // Handle Precise Character/Line-Level Text Selection with word boundary snapping
  const handleMouseUp = (pageNum?: number) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      // Clicking out or deselecting text: revert active highlight back to normal mode
      if (targetHighlightText) {
        onClearActiveHighlight?.();
      }
      return;
    }

    const rawText = selection.toString();
    // Normalize and clean text: collapse multiple blank lines, trim surrounding whitespace
    const cleanText = rawText
      .replace(/\r?\n\s*\r?\n/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (cleanText.length < 2) {
      if (targetHighlightText) {
        onClearActiveHighlight?.();
      }
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      let targetPage = pageNum || currentPage || 1;
      const startEl = (
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement
      )?.closest('[data-page-number]');

      if (startEl) {
        const detected = parseInt(startEl.getAttribute('data-page-number') || '', 10);
        if (detected > 0) targetPage = detected;
      }

      if (onTextSelected) {
        onTextSelected(cleanText, targetPage, {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      }
    } catch {}
  };

  const docHighlights = savedHighlights.filter((h) => !activeDocId || h.docId === activeDocId);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 dark:text-zinc-500 select-none">
        <ArrowsClockwise size={24} className="animate-spin mb-2 text-[#325FEC]" />
        <span className="text-xs font-mono">Loading PDF pages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto select-none">
        <Warning size={32} className="text-amber-500 mb-2" />
        <h4 className="text-xs font-display font-bold text-[#0F172A] dark:text-[#FAFAFA]">Unable to render PDF</h4>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">{error}</p>
      </div>
    );
  }

  if ((!pdfDoc && !isNonPdf) || totalPages === 0) {
    return null;
  }

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full relative">

      {/* ── Integrated Native-Style Left Panel (Thumbnails & Highlights Tabs) ── */}
      {isSidebarOpen ? (
        <aside className="w-48 md:w-56 border-r border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#121214] flex flex-col flex-shrink-0 select-none z-10 transition-all">
          
          {/* Panel Header with Segmented Tabs */}
          <div className="p-2 border-b border-[#E2E5EB] dark:border-[#27272A] bg-[#F8F9FB] dark:bg-[#18181B] flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 bg-[#E2E5EB]/60 dark:bg-[#27272A] p-0.5 rounded-md flex-1">
              <button
                onClick={() => setSidebarTab('thumbnails')}
                className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono font-medium flex items-center justify-center gap-1 transition-colors ${
                  sidebarTab === 'thumbnails'
                    ? 'bg-white dark:bg-[#121214] text-[#0F172A] dark:text-[#FAFAFA] shadow-2xs font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <SquaresFour size={12} />
                <span>Pages ({totalPages})</span>
              </button>
              <button
                onClick={() => setSidebarTab('highlights')}
                className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono font-medium flex items-center justify-center gap-1 transition-colors ${
                  sidebarTab === 'highlights'
                    ? 'bg-white dark:bg-[#121214] text-[#0F172A] dark:text-[#FAFAFA] shadow-2xs font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <BookmarkSimple size={12} />
                <span>Clips ({docHighlights.length})</span>
              </button>
            </div>

            {/* Left Arrow Collapse Button (Feedback 1) */}
            <button
              onClick={onToggleSidebar}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
              title="Collapse sidebar panel"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
          </div>

          {/* Tab 1: Visual Page Thumbnails */}
          {sidebarTab === 'thumbnails' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                isNonPdf ? (
                  <NonPdfThumbnailCanvas
                    key={pageNum}
                    pageNumber={pageNum}
                    isActive={currentPage === pageNum}
                    onClick={() => scrollToPage(pageNum)}
                  />
                ) : (
                  <PDFThumbnailCanvas
                    key={pageNum}
                    pdfDoc={pdfDoc}
                    pageNumber={pageNum}
                    isActive={currentPage === pageNum}
                    onClick={() => scrollToPage(pageNum)}
                  />
                )
              ))}
            </div>
          )}

          {/* Tab 2: Saved Highlights */}
          {sidebarTab === 'highlights' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-[#E2E5EB] dark:border-[#27272A] flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                  {docHighlights.length} Saved {docHighlights.length === 1 ? 'Highlight' : 'Highlights'}
                </span>
                <button
                  onClick={() => setIsManualClipOpen(!isManualClipOpen)}
                  className="p-1 text-slate-500 hover:text-[#325FEC] dark:hover:text-[#518FFF] rounded"
                  title="Add highlight manually"
                >
                  <Plus size={12} weight="bold" />
                </button>
              </div>

              {/* Manual Clip Drawer */}
              {isManualClipOpen && (
                <div className="p-2 border-b border-[#E2E5EB] dark:border-[#27272A] bg-blue-50/50 dark:bg-blue-950/20 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono font-semibold text-[#325FEC] dark:text-[#518FFF]">
                      Add Quote Clip
                    </span>
                    <button onClick={() => setIsManualClipOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={10} />
                    </button>
                  </div>
                  <textarea
                    value={manualClipText}
                    onChange={(e) => setManualClipText(e.target.value)}
                    placeholder="Paste quote text..."
                    rows={2}
                    className="w-full p-1.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded text-[10.5px] text-[#0F172A] dark:text-[#FAFAFA] outline-none focus:border-[#325FEC] resize-none"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono text-slate-400">p.</span>
                      <input
                        type="number"
                        value={manualClipPage}
                        onChange={(e) => setManualClipPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-10 px-1 py-0.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded text-[10px] font-mono text-center outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (manualClipText.trim() && onSaveHighlightManually) {
                          onSaveHighlightManually(manualClipText.trim(), manualClipPage);
                          setManualClipText('');
                          setIsManualClipOpen(false);
                        }
                      }}
                      disabled={!manualClipText.trim()}
                      className="px-2 py-0.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-40 text-white text-[10px] font-medium rounded shadow-xs transition-colors"
                    >
                      Save Clip
                    </button>
                  </div>
                </div>
              )}

              {/* Highlights Scrollable List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {docHighlights.length === 0 ? (
                  <div className="text-center py-8 px-2">
                    <Bookmark size={18} className="mx-auto mb-1 text-slate-300 dark:text-zinc-600" />
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal">
                      Select any text in the PDF to save highlights
                    </p>
                  </div>
                ) : (
                  docHighlights.map((hl) => (
                    <div
                      key={hl.id}
                      className="group relative flex flex-col p-1.5 rounded-md border border-[#E2E5EB] dark:border-[#27272A] bg-[#F8F9FB] dark:bg-[#18181B] hover:bg-white dark:hover:bg-[#222226] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <button
                          onClick={() => {
                            scrollToPage(hl.pageNumber);
                            if (onJumpToHighlight) onJumpToHighlight(hl.text, hl.pageNumber);
                          }}
                          className="text-[9px] font-mono text-[#325FEC] dark:text-[#518FFF] hover:underline font-semibold"
                        >
                          Page {hl.pageNumber}
                        </button>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              scrollToPage(hl.pageNumber);
                              if (onJumpToHighlight) onJumpToHighlight(hl.text, hl.pageNumber);
                            }}
                            className="text-slate-400 hover:text-[#0F172A] dark:hover:text-white p-0.5"
                            title="Jump to highlight position"
                          >
                            <ArrowSquareOut size={10} />
                          </button>
                          {onDeleteHighlight && (
                            <button
                              onClick={() => setHighlightToDelete(hl.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition-opacity"
                              title="Delete highlight"
                            >
                              <Trash size={10} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p
                        data-testid="saved-clip-item"
                        onClick={() => {
                          scrollToPage(hl.pageNumber);
                          if (onJumpToHighlight) onJumpToHighlight(hl.text, hl.pageNumber);
                        }}
                        className="text-[10.5px] text-slate-700 dark:text-zinc-300 line-clamp-2 leading-relaxed cursor-pointer"
                      >
                        "{hl.text.slice(0, 90)}{hl.text.length > 90 ? '...' : ''}"
                      </p>

                      {highlightToDelete === hl.id && (
                        <div className="mt-1 p-2 bg-white dark:bg-[#18181B] border border-red-300/80 dark:border-red-900/60 rounded-md text-[10px] space-y-1.5 shadow-xs animate-fadeIn">
                          <p className="text-slate-700 dark:text-zinc-200 font-medium">Delete highlight?</p>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setHighlightToDelete(null)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded text-[9.5px] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                if (onDeleteHighlight) onDeleteHighlight(hl.id);
                                setHighlightToDelete(null);
                              }}
                              className="px-2 py-0.5 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900 rounded font-medium text-[9.5px] transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      ) : (
        /* ── Collapsed Vertical Rail (Feedback 2 & 7) ── */
        <aside className="w-9 border-r border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#121214] flex flex-col items-center py-2.5 gap-2.5 flex-shrink-0 select-none z-10 transition-all">
          <button
            onClick={() => { onToggleSidebar(); setSidebarTab('thumbnails'); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] transition-colors"
            title={`Pages (${totalPages})`}
          >
            <SquaresFour size={16} />
          </button>
          <button
            onClick={() => { onToggleSidebar(); setSidebarTab('highlights'); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] transition-colors"
            title={`Saved Clips (${docHighlights.length})`}
          >
            <BookmarkSimple size={16} />
          </button>
        </aside>
      )}

      {/* ── Main Scrollable PDF Pages Canvas (Full Page Continuous Scroll) ── */}
      <div
        ref={scrollContainerRef}
        onMouseUp={() => handleMouseUp()}
        onClick={(e) => {
          const target = e.target as HTMLElement | null;
          if (target && (target.closest('button') || target.closest('a') || target.closest('input'))) {
            return;
          }
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            if (targetHighlightText) {
              onClearActiveHighlight?.();
            }
          }
        }}
        className="flex-1 overflow-y-auto overflow-x-auto flex flex-col items-center gap-6 py-6 px-4 select-text relative w-full h-full bg-[#EAEEF4] dark:bg-[#09090B]"
      >
        {/* Floating Active Highlight Banner & Exit Button (Bug 4) */}
        {targetHighlightText && targetHighlightText.trim() && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="sticky top-2 z-30 flex items-center gap-2 bg-[#0F172A] dark:bg-[#18181B] text-white px-3.5 py-1.5 rounded-full shadow-xl border border-slate-700/80 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            <span className="text-[11px] font-sans text-slate-200">
              Active highlight on <span className="font-mono font-semibold text-[#518FFF]">p. {currentPage}</span>
            </span>
            <button
              type="button"
              data-testid="clear-highlight-button"
              onClick={() => onClearActiveHighlight?.()}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white pl-1.5 border-l border-slate-700 transition-colors cursor-pointer"
              title="Exit highlight mode"
            >
              <span>Clear</span>
              <X size={12} weight="bold" />
            </button>
          </div>
        )}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          isNonPdf ? (
            <NonPdfPageCanvas
              key={pageNum}
              pageContent={pages?.find(p => p.pageNumber === pageNum)?.content || ''}
              pageNumber={pageNum}
              scale={zoomLevel / 100}
              searchQuery={searchQuery}
              targetHighlightText={targetHighlightText}
              savedHighlights={savedHighlights.filter((h) => h.pageNumber === pageNum && (!activeDocId || h.docId === activeDocId))}
              onMouseUp={() => handleMouseUp(pageNum)}
              pageRef={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
            />
          ) : (
            <PDFPageCanvas
              key={pageNum}
              pdfDoc={pdfDoc}
              pageNumber={pageNum}
              scale={zoomLevel / 100}
              searchQuery={searchQuery}
              targetHighlightText={targetHighlightText}
              savedHighlights={savedHighlights.filter((h) => h.pageNumber === pageNum && (!activeDocId || h.docId === activeDocId))}
              onMouseUp={() => handleMouseUp(pageNum)}
              pageRef={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
            />
          )
        ))}
      </div>
    </div>
  );
};

// ─── Visual Page Thumbnail Component (Real Rendered Mini Canvas with Aspect Ratio) ───
interface PDFThumbnailCanvasProps {
  pdfDoc: any;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}

const PDFThumbnailCanvas: React.FC<PDFThumbnailCanvasProps> = ({
  pdfDoc,
  pageNumber,
  isActive,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspectDimensions, setAspectDimensions] = useState<{ width: number; height: number }>({ width: 120, height: 160 });

  useEffect(() => {
    let isCancelled = false;

    async function renderThumbnail() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 120;
        const thumbScale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: thumbScale });

        setAspectDimensions({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        });

        const canvas = canvasRef.current;
        if (canvas) {
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const context = canvas.getContext('2d');
          if (context) {
            const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null;
            await page.render({
              canvasContext: context,
              transform: transform,
              viewport: viewport,
            }).promise;
          }
        }
      } catch (err) {
        console.warn(`Thumbnail page ${pageNumber} render error:`, err);
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
        isActive
          ? 'border-[#325FEC] dark:border-[#518FFF] bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-[#325FEC]/25 shadow-xs'
          : 'border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-slate-300 dark:hover:border-zinc-500'
      }`}
    >
      <div
        style={{ width: `${aspectDimensions.width}px`, height: `${aspectDimensions.height}px` }}
        className="bg-white dark:bg-[#121214] rounded overflow-hidden flex items-center justify-center border border-slate-200/80 dark:border-zinc-800 shadow-2xs transition-all"
      >
        <canvas ref={canvasRef} className="block pointer-events-none" />
      </div>
      <span className={`text-[10px] font-mono ${isActive ? 'text-[#325FEC] dark:text-[#518FFF] font-bold' : 'text-slate-500 dark:text-zinc-400'}`}>
        Page {pageNumber}
      </span>
    </div>
  );
};

// ─── Single Page Canvas + High DPI + Official PDF.js Text Layer + Source Text Highlighting ────
interface PDFPageCanvasProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  searchQuery?: string;
  targetHighlightText?: string;
  savedHighlights?: SavedHighlight[];
  onMouseUp: () => void;
  pageRef: (el: HTMLDivElement | null) => void;
}

const PDFPageCanvas: React.FC<PDFPageCanvasProps> = ({
  pdfDoc,
  pageNumber,
  scale,
  searchQuery,
  targetHighlightText,
  savedHighlights = [],
  onMouseUp,
  pageRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 680, height: 880 });
  const [textLayerReady, setTextLayerReady] = useState<number>(0);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const effectiveScale = scale * 1.15;
        const viewport = page.getViewport({ scale: effectiveScale });

        const width = Math.floor(viewport.width);
        const height = Math.floor(viewport.height);
        setDimensions({ width, height });

        // 1. High-DPI Vector Canvas Rendering
        const canvas = canvasRef.current;
        if (canvas) {
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(width * pixelRatio);
          canvas.height = Math.floor(height * pixelRatio);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;

          const context = canvas.getContext('2d');
          if (context) {
            if (renderTaskRef.current) {
              try { renderTaskRef.current.cancel(); } catch {}
            }

            const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null;
            const task = page.render({
              canvasContext: context,
              transform: transform,
              viewport: viewport,
            });
            renderTaskRef.current = task;
            await task.promise;
          }
        }

        // 2. Official PDF.js Text Layer (Transparent text overlay)
        const textContent = await page.getTextContent();
        if (!isCancelled && textLayerRef.current) {
          const container = textLayerRef.current;
          container.innerHTML = '';
          container.style.width = `${width}px`;
          container.style.height = `${height}px`;
          container.style.setProperty('--scale-factor', `${effectiveScale}`);
          container.style.setProperty('--total-scale-factor', `${effectiveScale}`);

          const pdfjsLib = await import('pdfjs-dist');
          if (pdfjsLib.TextLayer) {
            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container,
              viewport,
            });
            await textLayer.render();
          } else {
            for (const item of textContent.items as any[]) {
              if (!item.str) continue;
              const span = document.createElement('span');
              span.textContent = item.str;
              span.style.left = `${item.transform[4] * effectiveScale}px`;
              span.style.top = `${viewport.height - item.transform[5] * effectiveScale - (item.height || 10) * effectiveScale}px`;
              span.style.fontSize = `${Math.sqrt(item.transform[0] ** 2 + item.transform[1] ** 2) * effectiveScale}px`;
              span.style.fontFamily = item.fontName || 'sans-serif';
              container.appendChild(span);
            }
          }
          if (!isCancelled) {
            setTextLayerReady((v) => v + 1);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render error:`, err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  // 3. Highlight Matching & Direct Text Positioning (Search, AI Citation & Saved Highlights)
  useEffect(() => {
    if (!textLayerRef.current) return;
    const spans = Array.from(textLayerRef.current.querySelectorAll('span'));
    if (!spans || spans.length === 0) return;

    // Reset previous classes
    spans.forEach((s) => s.classList.remove('pdf-match-highlight', 'pdf-active-citation-highlight', 'pdf-saved-highlight'));

    // Build concatenated page text map with exact character offsets per span
    let fullPageText = '';
    const spanRanges: Array<{ span: HTMLSpanElement; start: number; end: number }> = [];

    spans.forEach((span) => {
      const txt = span.textContent || '';
      const start = fullPageText.length;
      fullPageText += txt + ' ';
      const end = fullPageText.length;
      spanRanges.push({ span, start, end });
    });

    const lowerPageText = fullPageText.toLowerCase();

    // Helper to highlight spans overlapping [matchStart, matchEnd]
    const applyHighlightToRange = (matchStart: number, matchEnd: number, className: string): HTMLSpanElement | null => {
      let firstSpan: HTMLSpanElement | null = null;
      spanRanges.forEach(({ span, start, end }) => {
        if (Math.max(start, matchStart) < Math.min(end, matchEnd)) {
          span.classList.add(className);
          if (!firstSpan) firstSpan = span;
        }
      });
      return firstSpan;
    };

    // Helper to find all occurrences of a phrase in lowerPageText (Full-Clip Highlighting)
    const highlightPhrase = (phrase: string, className: string): HTMLSpanElement | null => {
      let cleanPhrase = phrase
        .replace(/^[“"']+|[”"']+$/g, '')
        .replace(/[*#_`]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      // Strip trailing page citations if passed with title (e.g. "— p. 5" or "— Page 12")
      cleanPhrase = cleanPhrase.replace(/\s*[—–-]\s*(?:page|p\.?)\s*\d+.*$/i, '').trim();

      if (cleanPhrase.length < 2) return null;

      let firstMatched: HTMLSpanElement | null = null;
      let pos = 0;
      while ((pos = lowerPageText.indexOf(cleanPhrase, pos)) !== -1) {
        const span = applyHighlightToRange(pos, pos + cleanPhrase.length, className);
        if (!firstMatched) firstMatched = span;
        pos += cleanPhrase.length;
      }

      // If verbatim full phrase was not found in one contiguous string (line breaks, hyphenation, formatting)
      if (!firstMatched && cleanPhrase.length > 15) {
        // Method A: Anchor matching (first 4-6 words and last 4-6 words)
        const words = cleanPhrase.split(/\s+/).filter(Boolean);
        if (words.length >= 4) {
          const startAnchor = words.slice(0, Math.min(5, words.length)).join(' ');
          const endAnchor = words.slice(Math.max(0, words.length - 5)).join(' ');
          const startPos = lowerPageText.indexOf(startAnchor);
          const endPos = lowerPageText.lastIndexOf(endAnchor);

          if (startPos !== -1 && endPos !== -1 && endPos >= startPos) {
            firstMatched = applyHighlightToRange(startPos, endPos + endAnchor.length, className);
          }
        }

        // Method B: De-hyphenated normalized matching if still not matched
        if (!firstMatched) {
          const dehyphenated = cleanPhrase.replace(/-\s+/g, '');
          const dehyphenatedPage = lowerPageText.replace(/-\s+/g, '');
          const dhPos = dehyphenatedPage.indexOf(dehyphenated);
          if (dhPos !== -1) {
            firstMatched = applyHighlightToRange(dhPos, dhPos + cleanPhrase.length, className);
          }
        }

        // Method C: Sliding multi-chunk coverage (chunks of 4 words) so the FULL clip lights up
        if (!firstMatched && words.length >= 6) {
          let chunkFirst: HTMLSpanElement | null = null;
          for (let w = 0; w < words.length - 2; w += 2) {
            const chunk = words.slice(w, w + 4).join(' ');
            const cPos = lowerPageText.indexOf(chunk);
            if (cPos !== -1) {
              const span = applyHighlightToRange(cPos, cPos + chunk.length, className);
              if (!chunkFirst) chunkFirst = span;
            }
          }
          if (chunkFirst) firstMatched = chunkFirst;
        }

        // Method D: Distinct first 4-5 words match
        if (!firstMatched && words.length >= 4) {
          const firstWords = words.slice(0, 5).join(' ');
          const startPos = lowerPageText.indexOf(firstWords);
          if (startPos !== -1) {
            firstMatched = applyHighlightToRange(startPos, startPos + firstWords.length, className);
          }
        }
      }

      return firstMatched;
    };

    let targetElementToScroll: HTMLSpanElement | null = null;

    // 1. Saved Clip Highlights
    (savedHighlights || []).forEach((h) => {
      if (h.text) {
        highlightPhrase(h.text, 'pdf-saved-highlight');
      }
    });

    // 2. Search Query Match
    if (searchQuery && searchQuery.trim()) {
      highlightPhrase(searchQuery, 'pdf-match-highlight');
    }

    // 3. Target Citation / Quote Highlight (Active glow & auto-scroll)
    if (targetHighlightText && targetHighlightText.trim()) {
      const targetSpan = highlightPhrase(targetHighlightText, 'pdf-active-citation-highlight');
      if (targetSpan && !targetElementToScroll) {
        targetElementToScroll = targetSpan;
      }
    }

    // Scroll to citation target element if active
    if (targetElementToScroll && targetHighlightText) {
      setTimeout(() => {
        targetElementToScroll?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [searchQuery, targetHighlightText, savedHighlights, dimensions, textLayerReady]);

  return (
    <div
      ref={pageRef}
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      onMouseUp={onMouseUp}
      style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
      className="pdf-page-wrapper relative bg-white dark:bg-[#121214] ring-1 ring-[#CBD5E1]/80 dark:ring-[#27272A] rounded-sm shadow-md flex-shrink-0 flex flex-col justify-center items-center overflow-hidden transition-all select-text"
    >
      {/* 1. High-DPI Vector Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-none select-none" />

      {/* 2. Official PDF.js Text Layer + Interactive Highlights */}
      <div
        ref={textLayerRef}
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        className="pdf-text-layer textLayer"
      />

      {/* 3. Page Number Badge */}
      <div className="absolute bottom-2 right-3 pointer-events-none select-none text-[9px] font-mono font-semibold text-slate-400 dark:text-zinc-600 bg-white/90 dark:bg-[#121214]/90 px-1.5 py-0.5 rounded border border-[#E2E5EB] dark:border-[#27272A] shadow-2xs">
        Page {pageNumber}
      </div>
    </div>
  );
};
 // ─── Non-PDF Visual Page Thumbnail Component ───
interface NonPdfThumbnailCanvasProps {
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}

const NonPdfThumbnailCanvas: React.FC<NonPdfThumbnailCanvasProps> = ({
  pageNumber,
  isActive,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
        isActive
          ? 'border-[#325FEC] dark:border-[#518FFF] bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-[#325FEC]/25 shadow-xs'
          : 'border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-slate-300 dark:hover:border-zinc-500'
      }`}
    >
      <div
        style={{ width: '120px', height: '160px' }}
        className="bg-white dark:bg-[#121214] rounded overflow-hidden flex items-center justify-center border border-slate-200/80 dark:border-zinc-800 shadow-2xs transition-all relative"
      >
        <FileText size={32} className="text-slate-300 dark:text-zinc-700" />
      </div>
      <span className={`text-[10px] font-mono ${isActive ? 'text-[#325FEC] dark:text-[#518FFF] font-bold' : 'text-slate-500 dark:text-zinc-400'}`}>
        Page {pageNumber}
      </span>
    </div>
  );
};

// ─── Non-PDF Text Page Canvas (Styled like Notion/Word) ───
interface NonPdfPageCanvasProps {
  pageContent: string;
  pageNumber: number;
  scale: number;
  searchQuery?: string;
  targetHighlightText?: string;
  savedHighlights?: SavedHighlight[];
  onMouseUp: () => void;
  pageRef: (el: HTMLDivElement | null) => void;
}

const NonPdfPageCanvas: React.FC<NonPdfPageCanvasProps> = ({
  pageContent,
  pageNumber,
  scale,
  searchQuery,
  targetHighlightText,
  savedHighlights = [],
  onMouseUp,
  pageRef,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const effectiveScale = scale * 1.15;

  useEffect(() => {
    if (targetHighlightText && contentRef.current) {
      const el = contentRef.current.querySelector('.pdf-active-citation-highlight');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    }
  }, [targetHighlightText]);

  const renderContentWithHighlights = () => {
    let html = pageContent || '';
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (targetHighlightText && targetHighlightText.trim()) {
      const cleanTarget = targetHighlightText.replace(/^[“"']+|[”"']+$/g, '').trim();
      if (cleanTarget.length >= 2) {
        try {
          const regex = new RegExp(`(${cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          html = html.replace(regex, '<mark class="pdf-active-citation-highlight">$1</mark>');
        } catch {}
      }
    }

    // Basic wrapping for paragraphs
    html = html.split('\n\n').map(p => `<p style="margin-bottom: 1em;">${p.replace(/\n/g, '<br/>')}</p>`).join('');

    return { __html: html };
  };

  return (
    <div
      ref={pageRef}
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      onMouseUp={onMouseUp}
      style={{
        width: `${680 * effectiveScale}px`,
        minHeight: `${880 * effectiveScale}px`
      }}
      className="pdf-page-wrapper relative bg-white dark:bg-[#121214] border border-[#CBD5E1]/80 dark:border-[#27272A] rounded-sm shadow-md flex-shrink-0 flex flex-col p-12 overflow-hidden transition-all select-text text-[#0F172A] dark:text-[#FAFAFA]"
    >
      <div 
        ref={contentRef}
        dangerouslySetInnerHTML={renderContentWithHighlights()}
        style={{ fontSize: `${13 * effectiveScale}px`, lineHeight: 1.6 }}
        className="w-full h-full font-serif"
      />
      
      <div className="absolute bottom-2 right-3 pointer-events-none select-none text-[9px] font-mono font-semibold text-slate-400 dark:text-zinc-600 bg-white/90 dark:bg-[#121214]/90 px-1.5 py-0.5 rounded border border-[#E2E5EB] dark:border-[#27272A] shadow-2xs">
        Page {pageNumber}
      </div>
    </div>
  );
};
