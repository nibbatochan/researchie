import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface FormattedAIMessageProps {
  content: string;
  className?: string;
  searchQuery?: string;
  onCitationClick?: (citation: string) => void;
}

export const FormattedAIMessage: React.FC<FormattedAIMessageProps> = ({ content, className = '', searchQuery, onCitationClick }) => {
  return (
    <div className={`ai-formatted-message space-y-3 font-sans text-slate-900 dark:text-zinc-100 ${className}`}>
      <MarkdownRenderer content={content} searchQuery={searchQuery} size="ai" onCitationClick={onCitationClick} />
    </div>
  );
};
