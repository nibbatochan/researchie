'use client';

import React, { useState, useMemo } from 'react';
import { Code } from '@phosphor-icons/react';
import { parseMarkdownToSections } from '@/lib/adapters/markdownToBlocks';
import { ContentSectionRenderer } from './content/ContentSectionRenderer';

interface FormattedAIMessageProps {
  content: string;
  className?: string;
  searchQuery?: string;
  onCitationClick?: (citation: string) => void;
}

export const FormattedAIMessage: React.FC<FormattedAIMessageProps> = ({ 
  content, 
  className = '', 
  onCitationClick 
}) => {
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

  const sections = useMemo(() => {
    return parseMarkdownToSections(content);
  }, [content]);

  return (
    <div className={`ai-formatted-message space-y-3 font-sans text-slate-900 dark:text-zinc-100 ${className}`}>
      {/* Raw Markdown is concealed by default */}
      {showRawMarkdown ? (
        <pre className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#09090B] border border-[#E2E8F0] dark:border-[#27272A] font-mono text-[11px] text-[#334155] dark:text-[#CBD5E1] whitespace-pre-wrap overflow-x-auto">
          <code>{content}</code>
        </pre>
      ) : (
        <div className="space-y-3">
          {sections.map((sec) => (
            <ContentSectionRenderer
              key={sec.id}
              section={sec}
              onCitationClick={onCitationClick}
            />
          ))}
        </div>
      )}

      {/* Discrete raw markdown inspector button */}
      <div className="pt-1 flex justify-end">
        <button
          type="button"
          onClick={() => setShowRawMarkdown(!showRawMarkdown)}
          className="inline-flex items-center gap-1 text-[10px] font-mono text-[#64748B] dark:text-[#71717A] hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors cursor-pointer"
          title="Toggle Raw Markdown"
        >
          <Code size={11} />
          <span>{showRawMarkdown ? 'View Structured Blocks' : 'Inspect Raw Markdown'}</span>
        </button>
      </div>
    </div>
  );
};
