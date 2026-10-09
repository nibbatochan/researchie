'use client';

import React, { useMemo } from 'react';
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
  const sections = useMemo(() => {
    return parseMarkdownToSections(content);
  }, [content]);

  return (
    <div className={`ai-formatted-message space-y-3 font-sans text-slate-900 dark:text-zinc-100 ${className}`}>
      <div className="space-y-3">
        {sections.map((sec) => (
          <ContentSectionRenderer
            key={sec.id}
            section={sec}
            onCitationClick={onCitationClick}
          />
        ))}
      </div>
    </div>
  );
};
