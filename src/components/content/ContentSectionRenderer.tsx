'use client';

import React, { useState } from 'react';
import { CaretDown, CaretRight, Sparkle, Quotes, LinkSimple, ListChecks, Question } from '@phosphor-icons/react';
import { ContentSection, InlineChip } from '@/lib/types/contentBlocks';
import { ContentBlockRenderer } from './ContentBlockRenderer';

interface ContentSectionRendererProps {
  section: ContentSection;
  onCitationClick?: (href: string) => void;
  onChipClick?: (chip: InlineChip) => void;
}

export const ContentSectionRenderer: React.FC<ContentSectionRendererProps> = ({
  section,
  onCitationClick,
  onChipClick,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(section.defaultCollapsed ?? false);

  const getSectionIcon = () => {
    switch (section.kind) {
      case 'summary':
        return Sparkle;
      case 'key_points':
        return ListChecks;
      case 'evidence':
        return Quotes;
      case 'sources':
        return LinkSimple;
      case 'follow_ups':
        return Question;
      default:
        return null;
    }
  };

  const SectionIcon = getSectionIcon();

  return (
    <div className="border-t border-[#E2E8F0] dark:border-[#27272A] first:border-t-0 pt-2.5 first:pt-0">
      {/* Section Header */}
      <div 
        onClick={() => section.isCollapsible && setIsCollapsed(!isCollapsed)}
        className={`flex items-center justify-between py-1 select-none ${section.isCollapsible ? 'cursor-pointer group' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {SectionIcon && (
            <SectionIcon size={13} className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0" />
          )}
          <span className="font-display font-semibold text-xs tracking-tight text-[#0F172A] dark:text-white uppercase font-mono">
            {section.title}
          </span>
          <span className="text-[10px] font-mono text-[#64748B] dark:text-[#71717A]">
            ({section.blocks.length})
          </span>
        </div>

        {section.isCollapsible && (
          <div className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
            {isCollapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
          </div>
        )}
      </div>

      {/* Section Blocks */}
      {!isCollapsed && (
        <div className="space-y-1.5 mt-1">
          {section.blocks.map((block, idx) => (
            <ContentBlockRenderer
              key={idx}
              block={block}
              onCitationClick={onCitationClick}
              onChipClick={onChipClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
