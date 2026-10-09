'use client';

import React, { useState } from 'react';
import { 
  Sparkle, 
  Quotes, 
  FileText, 
  PuzzlePiece, 
  Graph, 
  User, 
  CaretDown, 
  CaretRight, 
  Code,
  CalendarBlank,
  FolderSimple
} from '@phosphor-icons/react';
import { ContentCardModel, InlineChip } from '@/lib/types/contentBlocks';
import { ContentSectionRenderer } from './ContentSectionRenderer';

interface ContentCardShellProps {
  card: ContentCardModel;
  defaultExpanded?: boolean;
  onCitationClick?: (href: string) => void;
  onChipClick?: (chip: InlineChip) => void;
  className?: string;
}

export const ContentCardShell: React.FC<ContentCardShellProps> = ({
  card,
  defaultExpanded = true,
  onCitationClick,
  onChipClick,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

  const getSourceBadge = () => {
    const grayscaleBadge = 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700';
    switch (card.sourceType) {
      case 'ai':
        return { label: 'Researchie AI', icon: Sparkle, badgeClass: grayscaleBadge, iconClass: 'text-[#325FEC] dark:text-[#518FFF]' };
      case 'pdf':
        return { label: 'Document Vault', icon: FileText, badgeClass: grayscaleBadge, iconClass: 'text-emerald-600 dark:text-emerald-400' };
      case 'clip':
        return { label: 'Web Clip', icon: Quotes, badgeClass: grayscaleBadge, iconClass: 'text-purple-600 dark:text-purple-400' };
      case 'plugin':
        return { label: 'Extension', icon: PuzzlePiece, badgeClass: grayscaleBadge, iconClass: 'text-indigo-600 dark:text-indigo-400' };
      case 'canvas':
        return { label: 'Canvas', icon: Graph, badgeClass: grayscaleBadge, iconClass: 'text-sky-600 dark:text-sky-400' };
      case 'user':
      default:
        return { label: 'Note', icon: User, badgeClass: grayscaleBadge, iconClass: 'text-slate-600 dark:text-zinc-400' };
    }
  };

  const badge = getSourceBadge();
  const SourceIcon = badge.icon;

  // Extract one-liner summary for collapsed row preview
  const firstSummary = card.sections.flatMap(s => s.blocks).find(b => b.type === 'summary' || b.type === 'paragraph');
  const summaryPreview = firstSummary && 'text' in firstSummary ? firstSummary.text : card.title;

  return (
    <article className={`rounded-xl border border-[#E2E8F0] dark:border-[#222225] bg-white dark:bg-[#0E0E10] shadow-xs overflow-hidden transition-all ${className}`}>
      {/* L1 Card Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 bg-[#FAFBFD] dark:bg-[#08080A] border-b border-[#E2E8F0] dark:border-[#1E1E22] flex items-center justify-between gap-3 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-medium flex-shrink-0 ${badge.badgeClass}`}>
            <SourceIcon size={12} weight="bold" className={badge.iconClass} />
            <span>{badge.label}</span>
          </span>

          {card.workspace && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#64748B] dark:text-[#71717A] truncate">
              <FolderSimple size={11} />
              <span>{card.workspace}</span>
              {card.subspace && <span>/ {card.subspace}</span>}
            </span>
          )}

          <h3 className="text-xs font-semibold font-display text-[#0F172A] dark:text-white truncate">
            {card.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 text-slate-400">
          {card.createdAt && (
            <span className="text-[10px] font-mono text-[#64748B] dark:text-[#71717A] hidden md:inline-flex items-center gap-1">
              <CalendarBlank size={11} />
              <span>{new Date(card.createdAt).toLocaleDateString()}</span>
            </span>
          )}

          <div className="p-0.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
            {isExpanded ? <CaretDown size={13} /> : <CaretRight size={13} />}
          </div>
        </div>
      </div>

      {/* Collapsed State: One-line summary */}
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          className="px-3.5 py-2 text-xs text-[#64748B] dark:text-[#94A3B8] truncate cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-[#141416] transition-colors"
        >
          {summaryPreview}
        </div>
      )}

      {/* Expanded State: Structured L2 Sections & L3 Blocks */}
      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {/* Never show raw markdown unless explicitly toggled */}
          {showRawMarkdown && card.rawMarkdownBackup ? (
            <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#050507] border border-[#E2E8F0] dark:border-[#222225] font-mono text-[11px] text-[#334155] dark:text-[#CBD5E1] whitespace-pre-wrap">
              {card.rawMarkdownBackup}
            </div>
          ) : (
            card.sections.map((section) => (
              <ContentSectionRenderer
                key={section.id}
                section={section}
                onCitationClick={onCitationClick}
                onChipClick={onChipClick}
              />
            ))
          )}

          {/* Footer Controls: Inspector toggle for Raw Markdown (hidden by default) */}
          {card.rawMarkdownBackup && (
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#222225] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[#64748B] dark:text-[#71717A] hover:text-[#325FEC] dark:hover:text-[#518FFF] cursor-pointer"
                title="Toggle raw markdown inspector"
              >
                <Code size={11} />
                <span>{showRawMarkdown ? 'View Structured Blocks' : 'Inspect Raw Markdown'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
