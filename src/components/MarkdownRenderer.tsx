'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowSquareOut } from '@phosphor-icons/react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  searchQuery?: string;
  size?: 'sm' | 'base' | 'ai';
  onCitationClick?: (href: string) => void;
}

import { semanticHighlight } from '@/lib/utils/semanticHighlight';

function renderSemanticText(text: string, query?: string): React.ReactNode {
  return semanticHighlight(text, query);
}

function renderSemanticNode(node: React.ReactNode, query?: string): React.ReactNode {
  if (!node) return node;

  if (typeof node === 'string') {
    return renderSemanticText(node, query);
  }

  if (Array.isArray(node)) {
    return React.Children.map(node, (child) => renderSemanticNode(child, query));
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<any>;
    if (element.props && element.props.children) {
      return React.cloneElement(element, {
        ...element.props,
        children: renderSemanticNode(element.props.children, query),
      });
    }
  }

  return node;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '',
  searchQuery = '',
  size = 'sm',
  onCitationClick
}) => {
  const isAiScaled = size === 'ai';

  const containerClasses = isAiScaled
    ? `prose prose-zinc dark:prose-invert max-w-none text-[15px] md:text-[16px] leading-[1.65] font-sans text-zinc-900 dark:text-zinc-100 ${className}`
    : `prose prose-zinc dark:prose-invert max-w-none text-[13px] leading-relaxed font-sans text-slate-800 dark:text-zinc-200 ${className}`;

  let processedContent = content;
  // Replace [Page X] or [Page X-Y]
  processedContent = processedContent.replace(/\[Page (\d+(?:-\d+)?)\]/gi, '[Page $1](#cite-page-$1)');
  
  // Replace [Source: title]
  processedContent = processedContent.replace(/\[Source:\s*([^\]]+)\]/gi, (match, p1) => {
    return `[Source: ${p1}](#cite-source-${encodeURIComponent(p1)})`;
  });

  // Replace [1], [2] refs
  processedContent = processedContent.replace(/\[(\d+)\]/g, '[$1](#cite-ref-$1)');

  return (
    <div className={containerClasses}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children, ...props }) => (
            <h1 className={`${isAiScaled ? 'text-lg md:text-xl' : 'text-sm font-semibold'} font-display font-bold text-zinc-950 dark:text-white mt-3 mb-1.5 pb-1 border-b border-zinc-200 dark:border-zinc-800`} {...props}>
              {renderSemanticNode(children, searchQuery)}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 className={`${isAiScaled ? 'text-[16px] md:text-[17px]' : 'text-[13.5px] font-semibold'} font-display font-semibold text-zinc-900 dark:text-zinc-100 mt-3 mb-1.5`} {...props}>
              {renderSemanticNode(children, searchQuery)}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 className={`${isAiScaled ? 'text-[15px] md:text-[16px]' : 'text-[13px] font-medium'} font-display font-semibold text-zinc-800 dark:text-zinc-200 mt-2.5 mb-1`} {...props}>
              {renderSemanticNode(children, searchQuery)}
            </h3>
          ),
          h4: ({ node, children, ...props }) => (
            <h4 className={`${isAiScaled ? 'text-[14px]' : 'text-[12px]'} font-display font-semibold text-zinc-700 dark:text-zinc-300 mt-2 mb-1 uppercase tracking-wider`} {...props}>
              {renderSemanticNode(children, searchQuery)}
            </h4>
          ),
          p: ({ node, children, ...props }) => (
            <p className={`mb-2 text-zinc-800 dark:text-zinc-200 ${isAiScaled ? 'leading-[1.65]' : 'leading-relaxed'}`} {...props}>
              {renderSemanticNode(children, searchQuery)}
            </p>
          ),
          ul: ({ node, ...props }) => (
            <ul className={`list-disc list-outside pl-4 mb-2 space-y-1.5 text-zinc-800 dark:text-zinc-200 ${isAiScaled ? 'text-[15px]' : 'text-[13px]'}`} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className={`list-decimal list-outside pl-4 mb-2 space-y-1.5 text-zinc-800 dark:text-zinc-200 ${isAiScaled ? 'text-[15px]' : 'text-[13px]'}`} {...props} />
          ),
          li: ({ node, children, ...props }) => (
            <li className="leading-relaxed" {...props}>
              {renderSemanticNode(children, searchQuery)}
            </li>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote className="border-l-2 border-[#325FEC] dark:border-[#518FFF] pl-3.5 py-1 my-2 italic text-zinc-700 dark:text-zinc-300 rounded-r text-[0.96em]" {...props}>
              {renderSemanticNode(children, searchQuery)}
            </blockquote>
          ),
          code: ({ node, inline, className: codeClassName, children, ...props }: any) => {
            if (inline) {
              return (
                <code className={`px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-900 dark:text-zinc-100 ${isAiScaled ? 'text-[13px]' : 'text-[11.5px]'}`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3 rounded-xl bg-zinc-900 dark:bg-black text-zinc-100 font-mono text-[12.5px] overflow-x-auto my-2 border border-zinc-800">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <table className={`min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 ${isAiScaled ? 'text-[13.5px]' : 'text-[12px]'}`} {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-zinc-100/80 dark:bg-zinc-900/80 font-semibold text-zinc-900 dark:text-zinc-100" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors" {...props} />
          ),
          th: ({ node, children, ...props }) => (
            <th className="px-3 py-2 text-left font-semibold text-zinc-900 dark:text-zinc-100" {...props}>
              {renderSemanticNode(children, searchQuery)}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200" {...props}>
              {renderSemanticNode(children, searchQuery)}
            </td>
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-zinc-200 dark:border-zinc-800" {...props} />
          ),
          strong: ({ node, children, ...props }) => {
            const rawText = typeof children === 'string' ? children : Array.isArray(children) && typeof children[0] === 'string' ? children[0] : '';
            const trimmed = rawText.trim();

            // Semantic Info Headers (Clean typography, no container box)
            if (/^(key (finding|point|takeaway|insight)|executive summary|summary|overview|source|citation):?/i.test(trimmed)) {
              return (
                <span className="font-bold text-[#325FEC] dark:text-[#518FFF] mr-1">
                  {children}
                </span>
              );
            }

            // Semantic Success Headers (Clean typography, no container box)
            if (/^(metric|result|outcome|validated|impact|success|growth):?/i.test(trimmed)) {
              return (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1">
                  {children}
                </span>
              );
            }

            // Semantic Warning Headers (Clean typography, no container box)
            if (/^(warning|caution|gap|risk|assumption|missing|discrepancy):?/i.test(trimmed)) {
              return (
                <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">
                  {children}
                </span>
              );
            }

            // Semantic Danger Headers (Clean typography, no container box)
            if (/^(danger|error|conflict|contradiction|failure|critical):?/i.test(trimmed)) {
              return (
                <span className="font-bold text-rose-600 dark:text-rose-400 mr-1">
                  {children}
                </span>
              );
            }

            return (
              <strong className="font-semibold text-zinc-950 dark:text-white" {...props}>
                {renderSemanticNode(children, searchQuery)}
              </strong>
            );
          },
          a: ({ node, children, href, ...props }: any) => {
            if (href && href.startsWith('#cite-')) {
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onCitationClick) onCitationClick(href);
                  }}
                  className="text-[#325FEC] dark:text-[#518FFF] hover:underline font-medium inline-flex items-center cursor-pointer bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.2 rounded text-[11px] font-mono mx-0.5"
                  title="View Citation"
                >
                  {renderSemanticNode(children, searchQuery)}
                </button>
              );
            }
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#325FEC] dark:text-[#518FFF] hover:underline font-medium inline-flex items-center gap-0.5" 
                {...props}
              >
                <span>{renderSemanticNode(children, searchQuery)}</span>
                <ArrowSquareOut size={12} className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0" />
              </a>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
