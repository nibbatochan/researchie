'use client';

import React, { useState } from 'react';
import { Copy, Check, ArrowsOut, ArrowsIn, ArrowSquareOut, FileText, Eye } from '@phosphor-icons/react';
import { buildIsolatedBlockDoc } from '@/lib/utils/htmlBlockNormalizer';
import { formatCitationLine } from '@/lib/citations/client.ts';
import type { CitationRecord } from '@/lib/citations/types.ts';

interface BlockAtomCardProps {
  sanitizedHtml?: string;
  standaloneHtml?: string;
  rawText?: string;
  selector?: string;
  sourceUrl?: string;
  /** The page's citation, when the page had one. Shown in full under the block. */
  citation?: CitationRecord;
  /** The page's title, used when there is no citation. */
  pageTitle?: string;
  searchQuery?: string;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

function highlightMatch(text: string | undefined, query?: string): React.ReactNode {
  if (!text) return '';
  if (!query || !query.trim()) return text;

  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={index}
            className="bg-blue-500/20 text-blue-900 dark:text-blue-200 font-semibold px-1 py-0.2 rounded mx-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export const BlockAtomCard: React.FC<BlockAtomCardProps> = ({
  sanitizedHtml,
  standaloneHtml,
  rawText,
  selector,
  sourceUrl,
  citation,
  pageTitle,
  searchQuery = '',
}) => {
  // Two views: the block as it looks on the page (Interactive DOM), and its plain text (Extracted Text).
  const [activeTab, setActiveTab] = useState<'preview' | 'text'>('preview');
  const [copied, setCopied] = useState(false);
  const [previewBg, setPreviewBg] = useState<'auto' | 'light' | 'dark'>('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopy = (contentToCopy?: string) => {
    const text = contentToCopy || rawText || '';
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build isolated standalone document with normalized CSS
  const iframeSrcDoc = buildIsolatedBlockDoc({
    sanitizedHtml,
    standaloneHtml,
    rawText,
    sourceUrl,
    theme: previewBg,
    searchQuery,
  });

  const bgClasses =
    previewBg === 'light'
      ? 'bg-white text-slate-900'
      : previewBg === 'dark'
      ? 'bg-[#121214] text-zinc-100'
      : 'bg-white/60 dark:bg-[#121214]/60 text-slate-900 dark:text-zinc-100';

  const hasMatchingText = searchQuery && rawText && rawText.toLowerCase().includes(searchQuery.toLowerCase());
  const citationLine = citation ? formatCitationLine(citation) : null;

  const tabClass = (on: boolean) =>
    `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
      on
        ? 'bg-[#FAFBFD] dark:bg-[#27272A] text-[#325FEC] dark:text-[#518FFF] font-bold shadow-xs'
        : 'text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
    }`;

  return (
    <>
      <div className="my-2 border border-[#D9E1EC] dark:border-[#27272A] rounded-xl overflow-hidden bg-[#FAFBFD] dark:bg-[#121214] transition-all">
        {/* Tab Bar & Controls */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#EEF3F8] dark:bg-[#18181B] border-b border-[#D9E1EC] dark:border-[#27272A] text-xs">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setActiveTab('preview')} className={tabClass(activeTab === 'preview')}>
              <Eye size={11} />
              <span>Interactive DOM</span>
            </button>

            {rawText && (
              <button onClick={() => setActiveTab('text')} className={tabClass(activeTab === 'text')}>
                <FileText size={11} />
                <span>Extracted Text</span>
              </button>
            )}

            {selector && (
              <span className="hidden sm:inline-block font-mono text-[9px] text-slate-400 dark:text-zinc-500 px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded max-w-[150px] truncate" title={selector}>
                {selector}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'preview' && (
              <div className="flex items-center bg-[#FAFBFD] dark:bg-[#18181B] rounded-lg p-0.5 text-[9px] font-mono border border-[#D9E1EC] dark:border-[#27272A]">
                <button
                  onClick={() => setPreviewBg('auto')}
                  className={`px-1.5 py-0.2 rounded transition-colors ${previewBg === 'auto' ? 'bg-[#EEF3F8] dark:bg-[#27272A] text-[#325FEC] dark:text-[#518FFF] font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
                  title="Auto page background"
                >
                  Auto
                </button>
                <button
                  onClick={() => setPreviewBg('light')}
                  className={`px-1.5 py-0.2 rounded transition-colors ${previewBg === 'light' ? 'bg-[#EEF3F8] dark:bg-[#27272A] text-[#325FEC] dark:text-[#518FFF] font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
                  title="Force Light background"
                >
                  Light
                </button>
                <button
                  onClick={() => setPreviewBg('dark')}
                  className={`px-1.5 py-0.2 rounded transition-colors ${previewBg === 'dark' ? 'bg-[#EEF3F8] dark:bg-[#27272A] text-[#325FEC] dark:text-[#518FFF] font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
                  title="Force Dark background"
                >
                  Dark
                </button>
              </div>
            )}

            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
              title="Expand full block preview"
            >
              <ArrowsOut size={12} />
            </button>

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] rounded transition-colors"
                title="Open source website"
              >
                <ArrowSquareOut size={12} />
              </a>
            )}

            {activeTab === 'text' && (
              <button
                onClick={() => handleCopy(rawText)}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white transition-colors ml-1 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800"
              >
                {copied ? <Check size={11} className="text-[#325FEC] dark:text-[#518FFF]" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area - Fixed 300px height */}
        <div className="p-1">
          {activeTab === 'preview' ? (
            <div className={`w-full h-[300px] rounded-lg overflow-hidden transition-colors border border-[#D9E1EC] dark:border-[#27272A] ${bgClasses}`}>
              <iframe
                srcDoc={iframeSrcDoc}
                title="DOM Block Preview"
                sandbox="allow-scripts"
                className="w-full h-[300px] border-0 rounded bg-transparent"
              />
            </div>
          ) : (
            <div className="h-[300px] overflow-auto p-4 bg-[#FAFBFD] dark:bg-[#09090B] rounded-lg font-sans text-xs text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap border border-[#D9E1EC] dark:border-[#27272A]">
              {highlightMatch(rawText || 'No plain text extracted for this block.', searchQuery)}
            </div>
          )}
        </div>

        {/* The source: the full citation when the page had one, otherwise the page title and its site */}
        {(citationLine || pageTitle || sourceUrl) && (
          <div data-testid="block-citation" className="px-3 py-1.5 border-t border-[#D9E1EC] dark:border-[#27272A] text-[11px] leading-snug text-slate-600 dark:text-zinc-400">
            {citationLine ? (
              citationLine
            ) : (
              <>
                {pageTitle && <span className="font-medium text-slate-700 dark:text-zinc-300">{pageTitle}</span>}
                {pageTitle && sourceUrl && <span className="mx-1 text-slate-400">·</span>}
                {sourceUrl && <span className="font-mono">{hostOf(sourceUrl)}</span>}
              </>
            )}
          </div>
        )}

        {/* Matching Text Snippet Bar */}
        {hasMatchingText && (
          <div className="px-3 py-1.5 bg-[#EEF3F8]/90 dark:bg-[#18181B] border-t border-[#D9E1EC] dark:border-[#27272A] text-xs text-slate-700 dark:text-zinc-200">
            <span className="text-[10px] font-mono text-[#325FEC] dark:text-[#518FFF] uppercase font-semibold mr-1.5">Matched in block:</span>
            <span className="font-sans leading-relaxed">{highlightMatch(rawText, searchQuery)}</span>
          </div>
        )}
      </div>

      {/* Expanded / Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[85vh] bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#EEF3F8] dark:bg-[#18181B] border-b border-[#D9E1EC] dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#0F172A] dark:text-white">
                  DOM Block Inspector
                </span>
                {selector && (
                  <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded">
                    {selector}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-600 dark:text-zinc-300 hover:text-[#325FEC] dark:hover:text-[#518FFF] bg-[#FAFBFD] dark:bg-[#27272A] border border-[#D9E1EC] dark:border-transparent transition-colors"
                  >
                    <span>Open Source</span>
                    <ArrowSquareOut size={12} />
                  </a>
                )}
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-[#FAFBFD] dark:hover:bg-[#27272A] transition-colors"
                  title="Close expanded view"
                >
                  <ArrowsIn size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-4 overflow-auto bg-[#F4F6F9] dark:bg-[#09090B]">
              <div className={`w-full h-full rounded-xl overflow-hidden border border-[#D9E1EC] dark:border-[#27272A] shadow-inner ${bgClasses}`}>
                <iframe
                  srcDoc={iframeSrcDoc}
                  title="Expanded DOM Block Preview"
                  sandbox="allow-scripts"
                  className="w-full h-full border-0 rounded bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
