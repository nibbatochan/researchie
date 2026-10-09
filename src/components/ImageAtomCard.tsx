'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowsOutSimple, X, ImageBroken, ArrowSquareOut, ArrowsClockwise, CaretDown, CaretRight, TextAa } from '@phosphor-icons/react';
import { semanticHighlight } from '@/lib/utils/semanticHighlight';

interface ImageAtomCardProps {
  imageUrl?: string;
  description?: string;
  title?: string;
  ocrText?: string;
  ocrConfidence?: number;
  searchQuery?: string;
  mode?: 'clean' | 'detailed';
}

export const ImageAtomCard: React.FC<ImageAtomCardProps> = ({
  imageUrl,
  description,
  title,
  ocrText: initialOcrText,
  ocrConfidence: initialOcrConfidence,
  searchQuery,
  mode = 'clean',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [localOcrText, setLocalOcrText] = useState<string | undefined>(initialOcrText);
  const [localOcrConfidence, setLocalOcrConfidence] = useState<number | undefined>(initialOcrConfidence);

  const ocrText = localOcrText;
  const ocrConfidence = localOcrConfidence;

  // Check if search query matches OCR text
  const isSearchMatchedInOcr = useMemo(() => {
    if (!searchQuery || !searchQuery.trim() || !ocrText) return false;
    const q = searchQuery.toLowerCase().trim();
    return ocrText.toLowerCase().includes(q);
  }, [searchQuery, ocrText]);

  // Default expansion: expanded in detailed mode or if search matched
  const [isOcrExpanded, setIsOcrExpanded] = useState(mode === 'detailed' || isSearchMatchedInOcr);

  // Sync expansion state when mode or search matches
  useEffect(() => {
    if (mode === 'detailed' || isSearchMatchedInOcr) {
      setIsOcrExpanded(true);
    }
  }, [mode, isSearchMatchedInOcr]);

  const handleRunOcr = async () => {
    if (!imageUrl || isOcrRunning) return;
    setIsOcrRunning(true);

    const controller = new AbortController();
    const safetyTimeout = setTimeout(() => {
      controller.abort();
      setIsOcrRunning(false);
    }, 12000);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrl.trim() }),
        signal: controller.signal,
      });
      clearTimeout(safetyTimeout);

      if (!res.ok) {
        throw new Error('OCR API responded with error');
      }

      const data = await res.json();
      if (data.text && data.text.trim()) {
        setLocalOcrText(data.text);
        setLocalOcrConfidence(data.confidence);
      }
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      console.warn('OCR processing fallback:', err?.message || err);
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Automatically trigger OCR on mount if text hasn't been extracted yet
  useEffect(() => {
    if (!localOcrText && imageUrl && !isOcrRunning) {
      handleRunOcr();
    }
  }, [imageUrl, localOcrText]);

  if (!imageUrl || !imageUrl.trim()) return null;

  // Normalize protocol-relative URLs
  let normalizedUrl = imageUrl.trim();
  if (normalizedUrl.startsWith('//')) {
    normalizedUrl = `https:${normalizedUrl}`;
  }

  // Fallback proxy CDN for cross-origin hotlink restricted images
  const isDataUrl = normalizedUrl.startsWith('data:image/');
  const displayUrl = useProxy && !isDataUrl 
    ? `https://images.weserv.nl/?url=${encodeURIComponent(normalizedUrl)}`
    : normalizedUrl;

  const handleImageError = () => {
    if (!useProxy && !isDataUrl && normalizedUrl.startsWith('http')) {
      setUseProxy(true);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="my-2 border border-[#E2E5EB] dark:border-[#27272A] rounded-xl overflow-hidden bg-[#F8F9FB] dark:bg-[#121214] group/img">
      <div className="relative max-h-80 overflow-hidden flex items-center justify-center bg-slate-100/70 dark:bg-black/50 p-2">
        {hasError ? (
          <div className="p-5 text-center text-slate-500 flex flex-col items-center gap-2">
            <ImageBroken size={28} className="text-slate-400" />
            <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">Image preview restricted by host</span>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] border border-blue-200 dark:border-blue-900/40 transition-colors"
              >
                <ArrowSquareOut size={12} />
                <span>Open Original Image</span>
              </a>
              <button
                onClick={() => {
                  setHasError(false);
                  setUseProxy(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white dark:bg-[#18181B] text-slate-600 dark:text-zinc-300 border border-[#E2E5EB] dark:border-[#27272A] transition-colors"
              >
                <ArrowsClockwise size={12} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          <img
            src={displayUrl}
            alt={title || 'Captured Image'}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={handleImageError}
            className="max-h-72 w-auto max-w-full object-contain rounded-lg transition-transform"
          />
        )}

        {!hasError && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <button
              onClick={handleRunOcr}
              disabled={isOcrRunning}
              className="p-1.5 rounded-lg bg-black/75 text-white hover:text-[#518FFF] transition-colors border border-white/10 shadow-sm disabled:opacity-60"
              title={isOcrRunning ? 'Extracting text via OCR...' : 'Extract text from image (OCR)'}
            >
              <TextAa size={13} className={isOcrRunning ? 'animate-spin text-[#518FFF]' : ''} />
            </button>
            <a
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-black/75 text-white hover:text-[#518FFF] transition-colors border border-white/10 shadow-sm"
              title="Open original in new tab"
            >
              <ArrowSquareOut size={13} />
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-lg bg-black/75 text-white hover:text-[#518FFF] transition-colors border border-white/10 shadow-sm"
              title="Fullscreen zoom"
            >
              <ArrowsOutSimple size={13} />
            </button>
          </div>
        )}
      </div>

      {description && mode === 'detailed' && (
        <div className="px-3.5 py-2 bg-[#ECEFF4]/80 dark:bg-[#18181B] border-t border-[#E2E5EB] dark:border-[#27272A] text-xs text-slate-700 dark:text-zinc-300 font-sans leading-relaxed">
          {semanticHighlight(description, searchQuery)}
        </div>
      )}

      {/* OCR Status Banner during initial auto-extraction (Detailed Mode Only) */}
      {(mode === 'detailed' || isSearchMatchedInOcr) && isOcrRunning && !ocrText && (
        <div className="px-3.5 py-1.5 border-t border-[#E2E5EB] dark:border-[#27272A] bg-blue-50/40 dark:bg-[#325FEC]/10 flex items-center justify-between text-[11px] font-mono text-[#325FEC] dark:text-[#518FFF]">
          <span className="flex items-center gap-1.5">
            <ArrowsClockwise size={12} className="animate-spin" />
            <span>Scanning text in image...</span>
          </span>
          <span className="text-[10px] text-slate-400 font-sans">Auto OCR</span>
        </div>
      )}

      {/* Extracted OCR text accordion with highlight & semantic colors */}
      {ocrText && ocrText.trim() && (
        <div className={`border-t border-[#E2E5EB] dark:border-[#27272A] ${isSearchMatchedInOcr ? 'bg-amber-500/10 dark:bg-amber-500/15' : 'bg-[#FAFBFD] dark:bg-[#18181B]/50'}`}>
          <button
            onClick={() => setIsOcrExpanded(!isOcrExpanded)}
            className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-mono">
                <TextAa size={13} className={isSearchMatchedInOcr ? 'text-amber-500 font-bold' : ''} />
                <span className="font-medium">Extracted Text (OCR)</span>
              </div>
              {ocrConfidence !== undefined && ocrConfidence > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200/70 dark:bg-zinc-800 rounded text-slate-500 dark:text-zinc-400">
                  {Math.round(ocrConfidence)}% conf
                </span>
              )}
              {isSearchMatchedInOcr && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded font-semibold">
                  Match
                </span>
              )}
            </div>
            {isOcrExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
          </button>
          
          {isOcrExpanded && (
            <div className="px-3.5 pb-3 pt-0.5">
              <div className="p-2.5 rounded-lg bg-[#F1F5F9] dark:bg-[#121214] text-[11.5px] font-mono text-slate-700 dark:text-zinc-300 whitespace-pre-wrap border border-[#E2E5EB] dark:border-[#27272A] max-h-40 overflow-y-auto select-text leading-relaxed">
                {semanticHighlight(ocrText, searchQuery)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="self-end mb-2 flex items-center gap-2">
              <a
                href={normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1 bg-slate-900/90 px-3 py-1 rounded-lg border border-white/20"
              >
                <ArrowSquareOut size={13} />
                <span>Original</span>
              </a>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1 bg-slate-900/90 px-3 py-1 rounded-lg border border-white/20"
              >
                <X size={14} />
                <span>Close</span>
              </button>
            </div>
            <img
              src={displayUrl}
              alt={title || 'Zoomed Capture'}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="max-h-[80vh] max-w-full rounded-xl object-contain border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
