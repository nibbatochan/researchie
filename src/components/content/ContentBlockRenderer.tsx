'use client';

import React, { useState } from 'react';
import { 
  Quotes, 
  Table as TableIcon, 
  Code as CodeIcon, 
  LinkSimple, 
  ArrowSquareOut, 
  Check, 
  Copy, 
  WarningCircle, 
  Info, 
  ShieldCheck, 
  FileText,
  CaretDown,
  CaretRight,
  Eye,
  PuzzlePiece,
  Graph
} from '@phosphor-icons/react';
import { ContentBlock, InlineChip, assertNever } from '@/lib/types/contentBlocks';
import { SEMANTIC_TOKENS } from '@/lib/design/semanticTokens';

interface ContentBlockRendererProps {
  block: ContentBlock;
  onCitationClick?: (href: string) => void;
  onChipClick?: (chip: InlineChip) => void;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onCitationClick,
  onChipClick,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [isOcrExpanded, setIsOcrExpanded] = useState(false);

  // Matt Pocock Exhaustive Pattern Matcher
  switch (block.type) {
    case 'summary':
      return (
        <div className="py-1">
          <p className="text-[13.5px] font-medium leading-relaxed text-[#0F172A] dark:text-[#F8FAFC]">
            {block.text}
          </p>
          {block.confidence !== undefined && (
            <span className="text-[10px] font-mono text-[#64748B] dark:text-[#71717A] mt-0.5 block">
              Confidence score: {Math.round(block.confidence * 100)}%
            </span>
          )}
        </div>
      );

    case 'heading': {
      const headingStyles = {
        1: 'text-[17px] font-bold font-display text-[#0F172A] dark:text-white mt-3 mb-1 pb-1 border-b border-[#E2E8F0] dark:border-[#27272A]',
        2: 'text-[15px] font-semibold font-display text-[#0F172A] dark:text-white mt-2.5 mb-1',
        3: 'text-[13.5px] font-semibold font-display text-[#334155] dark:text-[#CBD5E1] mt-2 mb-0.5',
        4: 'text-[11px] font-mono uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mt-1.5 mb-0.5',
      }[block.level];

      return <div className={headingStyles}>{block.text}</div>;
    }

    case 'paragraph':
      return (
        <p className="text-[13px] leading-relaxed text-[#334155] dark:text-[#CBD5E1] my-1.5 break-words">
          {block.text}
          {block.inlineChips && block.inlineChips.length > 0 && (
            <span className="inline-flex flex-wrap gap-1 ml-1.5 align-middle">
              {block.inlineChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (chip.href && onCitationClick) onCitationClick(chip.href);
                    else if (onChipClick) onChipClick(chip);
                  }}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10.5px] font-mono font-medium transition-colors cursor-pointer bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 ${
                    chip.variant === 'citation'
                      ? 'text-[#325FEC] dark:text-[#518FFF] hover:underline'
                      : chip.variant === 'evidence'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : chip.variant === 'warning'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <span>{chip.label}</span>
                </button>
              ))}
            </span>
          )}
        </p>
      );

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={`my-2 space-y-1 pl-4 text-[13px] text-[#334155] dark:text-[#CBD5E1] ${block.ordered ? 'list-decimal' : 'list-disc marker:text-[#94A3B8]'}`}>
          {block.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-0.5 break-words">
              {item}
            </li>
          ))}
        </ListTag>
      );
    }

    case 'table': {
      const MAX_PREVIEW_ROWS = 8;
      const rowsToRender = isTableExpanded ? block.rows : block.rows.slice(0, MAX_PREVIEW_ROWS);
      const hasOverflow = block.rows.length > MAX_PREVIEW_ROWS;

      return (
        <div className="my-2.5 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#222225] bg-white dark:bg-[#0E0E10]">
          <div className="overflow-x-auto max-h-[360px] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAFC] dark:bg-[#08080A] border-b border-[#E2E8F0] dark:border-[#222225] sticky top-0 z-10">
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i} className="py-2 px-3 font-semibold text-[#0F172A] dark:text-white font-mono text-[11px] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#222225]">
                {rowsToRender.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#F8FAFC] dark:hover:bg-[#141416] transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-1.5 px-3 text-[#334155] dark:text-[#CBD5E1] text-[12px] break-words">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasOverflow && (
            <div className="p-1.5 border-t border-[#E2E8F0] dark:border-[#222225] bg-[#F8FAFC] dark:bg-[#08080A] text-center">
              <button
                type="button"
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                className="text-[11px] font-mono text-[#325FEC] dark:text-[#518FFF] hover:underline cursor-pointer"
              >
                {isTableExpanded ? 'Show less rows' : `View all ${block.rows.length} rows`}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'quote':
      return (
        <div className="my-2 pl-3 py-1.5 border-l-2 border-[#325FEC] dark:border-[#518FFF] bg-slate-50 dark:bg-[#0E0E10] border border-slate-200/70 dark:border-[#222225] rounded-r-lg">
          <p className="text-[13px] italic leading-relaxed text-[#0F172A] dark:text-[#F8FAFC]">
            "{block.quote}"
          </p>
          {(block.sourceTitle || block.pageNumber || block.deepLink) && (
            <div className="mt-1 flex items-center gap-2 text-[10.5px] font-mono text-[#64748B] dark:text-[#94A3B8]">
              {block.sourceTitle && <span>— {block.sourceTitle}</span>}
              {block.pageNumber && <span>[p. {block.pageNumber}]</span>}
              {block.deepLink && (
                <a
                  href={block.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[#325FEC] dark:text-[#518FFF] hover:underline"
                >
                  <ArrowSquareOut size={10} />
                  <span>source</span>
                </a>
              )}
            </div>
          )}
        </div>
      );

    case 'image':
      return (
        <div className="my-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222225] bg-white dark:bg-[#0E0E10] overflow-hidden">
          <img src={block.url} alt={block.caption || 'Captured visual'} className="w-full max-h-72 object-contain bg-black/5 dark:bg-white/5" />
          {block.caption && (
            <div className="p-2 border-t border-[#E2E8F0] dark:border-[#222225] text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              {block.caption}
            </div>
          )}
          {block.ocrText && (
            <div className="border-t border-[#E2E8F0] dark:border-[#222225] p-2 bg-[#F8FAFC] dark:bg-[#08080A]">
              <button
                type="button"
                onClick={() => setIsOcrExpanded(!isOcrExpanded)}
                className="flex items-center justify-between w-full text-[10.5px] font-mono text-[#64748B] dark:text-[#94A3B8] cursor-pointer"
              >
                <span>Extracted OCR Text</span>
                {isOcrExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
              </button>
              {isOcrExpanded && (
                <p className="mt-1.5 text-[11px] font-mono leading-relaxed text-[#334155] dark:text-[#CBD5E1] whitespace-pre-wrap">
                  {block.ocrText}
                </p>
              )}
            </div>
          )}
        </div>
      );

    case 'code':
      return (
        <div className="my-2 rounded-xl border border-[#E2E8F0] dark:border-[#222225] bg-[#F8FAFC] dark:bg-[#050507] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1 border-b border-[#E2E8F0] dark:border-[#222225] bg-black/5 dark:bg-white/5">
            <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] uppercase">
              {block.language || 'code'}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(block.code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 1500);
              }}
              className="inline-flex items-center gap-1 text-[10px] font-mono text-[#64748B] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
            >
              {copiedCode ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-3 text-[11.5px] font-mono overflow-x-auto text-[#0F172A] dark:text-[#F8FAFC]">
            <code>{block.code}</code>
          </pre>
        </div>
      );

    case 'chips':
      return (
        <div className="my-1.5 flex flex-wrap gap-1.5">
          {block.items.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChipClick?.(chip)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      );

    case 'source':
      return (
        <div className="my-1 p-2 rounded-xl border border-[#E2E8F0] dark:border-[#222225] bg-slate-50 dark:bg-[#08080A] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#325FEC] dark:text-[#518FFF] hover:underline truncate block"
            >
              {block.title}
            </a>
            {block.domain && (
              <span className="text-[10px] font-mono text-[#64748B] dark:text-[#71717A]">
                {block.domain} {block.timestampOffset ? `[${Math.floor(block.timestampOffset / 60)}:${(block.timestampOffset % 60).toString().padStart(2, '0')}]` : ''}
              </span>
            )}
          </div>
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
          >
            <ArrowSquareOut size={13} />
          </a>
        </div>
      );

    case 'plugin-card':
      return (
        <div className="my-2 p-2.5 rounded-xl border border-slate-200 dark:border-[#222225] bg-slate-50 dark:bg-[#0E0E10]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
            <PuzzlePiece size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span>{block.title}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-700 dark:text-zinc-300">
            {JSON.stringify(block.payload, null, 2)}
          </div>
        </div>
      );

    case 'canvas-card':
      return (
        <div className="my-2 p-2.5 rounded-xl border border-slate-200 dark:border-[#222225] bg-slate-50 dark:bg-[#0E0E10] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Graph size={15} className="text-sky-600 dark:text-sky-400" />
            <div>
              <span className="text-xs font-medium text-slate-800 dark:text-zinc-200 block">{block.title}</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">{block.nodeCount} connected nodes</span>
            </div>
          </div>
        </div>
      );

    case 'qa-pair':
      return (
        <div className="my-2 space-y-1">
          <div className="text-xs font-semibold text-[#0F172A] dark:text-white">
            Q: {block.question}
          </div>
          <div className="text-[12.5px] leading-relaxed text-[#334155] dark:text-[#CBD5E1] pl-2 border-l border-[#CBD5E1] dark:border-[#3F3F46]">
            {block.answer}
          </div>
        </div>
      );

    case 'callout': {
      const intents = {
        info: { icon: Info, iconColor: 'text-[#325FEC] dark:text-[#518FFF]' },
        success: { icon: ShieldCheck, iconColor: 'text-emerald-600 dark:text-emerald-400' },
        warning: { icon: WarningCircle, iconColor: 'text-amber-600 dark:text-amber-400' },
        danger: { icon: WarningCircle, iconColor: 'text-rose-600 dark:text-rose-400' },
      }[block.intent];

      const Icon = intents.icon;

      return (
        <div className="my-2 p-2.5 rounded-xl border border-slate-200 dark:border-[#222225] bg-slate-50 dark:bg-[#0E0E10] text-slate-800 dark:text-zinc-200">
          <div className="flex items-start gap-2.5">
            <Icon size={15} className={`mt-0.5 flex-shrink-0 ${intents.iconColor}`} weight="bold" />
            <div className="space-y-0.5 min-w-0">
              {block.title && <div className="text-xs font-semibold text-[#0F172A] dark:text-white">{block.title}</div>}
              <div className="text-[12px] leading-relaxed text-[#334155] dark:text-[#CBD5E1]">{block.body}</div>
            </div>
          </div>
        </div>
      );
    }

    default:
      return assertNever(block);
  }
};
