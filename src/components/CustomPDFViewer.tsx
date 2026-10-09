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
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  // 2. Continuous Scroll IntersectionObserver (Detects which page is in viewport)
  useEffect(() => {
    if (!scrollContainerRef.current || totalPages === 0) return;

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
          onPageChange(activePageNum);
          setManualClipPage(activePageNum);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.15, 0.4, 0.7],
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [totalPages, pdfDoc, currentPage, onPageChange]);

  // Scroll to active page smoothly
  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    if (el && scrollContainerRef.current) {
      isProgrammaticScroll.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onPageChange(pageNum);
      setManualClipPage(pageNum);

      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
    }
  }, [onPageChange]);

  // External currentPage change handler
  useEffect(() => {
    if (currentPage && !isProgrammaticScroll.current) {
      const el = pageRefs.current.get(currentPage);
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = scrollContainerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const isVisible = rect.top >= containerRect.top - 50 && rect.bottom <= containerRect.bottom + 50;
          if (!isVisible) {
            scrollToPage(currentPage);
          }
        }
      }
    }
  }, [currentPage, scrollToPage]);

  // Handle Precise Character/Line-Level Text Selection
  const handleMouseUp = (pageNum: number) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const rawText = selection.toString();
    // Normalize and clean text: collapse multiple blank lines, trim surrounding noise
    const cleanText = rawText
      .replace(/\r?\n\s*\r?\n/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (cleanText.length < 2) return;

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (onTextSelected) {
        onTextSelected(cleanText, pageNum, {
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
                        onClick={() => {
                          scrollToPage(hl.pageNumber);
                          if (onJumpToHighlight) onJumpToHighlight(hl.text, hl.pageNumber);
                        }}
                        className="text-[10.5px] text-slate-700 dark:text-zinc-300 line-clamp-2 leading-relaxed cursor-pointer"
                      >
                        "{hl.text.slice(0, 90)}{hl.text.length > 90 ? '...' : ''}"
                      </p>

                      {highlightToDelete === hl.id && (
                        <div className="mt-1 p-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded text-[9.5px] space-y-1 animate-fadeIn">
                          <p className="text-red-700 dark:text-red-300 font-medium">Delete highlight?</p>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setHighlightToDelete(null)}
                              className="px-1.5 py-0.5 bg-white dark:bg-[#18181B] border rounded text-slate-600 dark:text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                if (onDeleteHighlight) onDeleteHighlight(hl.id);
                                setHighlightToDelete(null);
                              }}
                              className="px-1.5 py-0.5 bg-red-600 text-white rounded font-medium"
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
        className="flex-1 overflow-y-auto overflow-x-auto flex flex-col items-center gap-6 py-6 px-4 select-text relative w-full h-full bg-[#EAEEF4] dark:bg-[#09090B]"
      >
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
    const spans = textLayerRef.current.querySelectorAll('span');
    if (!spans || spans.length === 0) return;

    const sq = (searchQuery || '').trim().toLowerCase();
    const tq = (targetHighlightText || '').trim().toLowerCase();
    const clipTexts = (savedHighlights || []).map((h) => h.text.trim().toLowerCase());

    let targetElementToScroll: HTMLSpanElement | null = null;

    spans.forEach((span) => {
      const text = (span.textContent || '').trim().toLowerCase();
      if (!text) return;

      span.classList.remove('pdf-match-highlight', 'pdf-active-citation-highlight', 'pdf-saved-highlight');

      let isMatch = false;

      // 1. Target Citation / Quote Highlight (Active glow & auto-scroll)
      if (tq && (text.includes(tq) || tq.includes(text) || (text.length > 5 && tq.includes(text.slice(0, 15))))) {
        span.classList.add('pdf-active-citation-highlight');
        if (!targetElementToScroll) targetElementToScroll = span;
        isMatch = true;
      }

      // 2. Search Query Match
      if (sq && text.includes(sq)) {
        span.classList.add('pdf-match-highlight');
        isMatch = true;
      }

      // 3. Saved Clip Highlight
      if (!isMatch && clipTexts.some((c) => text.includes(c) || c.includes(text))) {
        span.classList.add('pdf-saved-highlight');
      }
    });

    if (targetElementToScroll && targetHighlightText) {
      (targetElementToScroll as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchQuery, targetHighlightText, savedHighlights, dimensions]);

  return (
    <div
      ref={pageRef}
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      onMouseUp={onMouseUp}
      style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
      className="pdf-page-wrapper relative bg-white dark:bg-[#121214] border border-[#CBD5E1]/80 dark:border-[#27272A] rounded-sm shadow-md flex-shrink-0 flex flex-col justify-center items-center overflow-hidden transition-all select-text"
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

  const renderContentWithHighlights = () => {
    let html = pageContent || '';
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Very basic wrapping for paragraphs
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
