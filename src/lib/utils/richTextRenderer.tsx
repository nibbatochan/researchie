import React from 'react';
import { semanticHighlight } from './semanticHighlight';

/**
 * RICH TEXT RENDERER
 * Turns markdown text into clean, Google-style rendered typography:
 * - Converts **bold** into high-contrast bold font weights (no asterisks).
 * - Converts *italic* into italics (no asterisks).
 * - Converts `code` into subtle inline code chips.
 * - Converts [Page X] / [p. X] / [1] into clean grayscale citation pills.
 * - Converts [title](url) into clickable source links.
 * - Preserves line skips and paragraphs.
 * - Cleans up escaped slashes/asterisks.
 */

interface RenderRichTextOptions {
  searchQuery?: string;
  onCitationClick?: (href: string) => void;
}

export function renderRichText(
  text: string | undefined | null,
  optionsOrQuery?: RenderRichTextOptions | string
): React.ReactNode {
  if (!text) return null;

  const options: RenderRichTextOptions =
    typeof optionsOrQuery === 'string'
      ? { searchQuery: optionsOrQuery }
      : optionsOrQuery || {};

  const { searchQuery, onCitationClick } = options;

  // Pattern matching:
  // 1. Bold: **text** or __text__
  // 2. Italic: *text* or _text_
  // 3. Inline code: `code`
  // 4. Links: [text](url)
  // 5. Citations: [Page X] or [p. X] or [1] or [Source: X]
  const TOKEN_REGEX = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[(?:Page|p\.|pp\.)\s*[^\]]+\]|\[Source:\s*[^\]]+\]|\[\d+\]|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;

  const parts = text.split(TOKEN_REGEX);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // 1. Bold (**text** or __text__)
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
          const inner = part.slice(2, -2);
          return (
            <strong
              key={index}
              className="font-bold text-[#0F172A] dark:text-white"
            >
              {renderRichText(inner, { searchQuery, onCitationClick })}
            </strong>
          );
        }

        // 2. Italic (*text* or _text_)
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
          const inner = part.slice(1, -1);
          return (
            <em key={index} className="italic text-slate-700 dark:text-zinc-300">
              {renderRichText(inner, { searchQuery, onCitationClick })}
            </em>
          );
        }

        // 3. Inline code (`code`)
        if (part.startsWith('`') && part.endsWith('`')) {
          const code = part.slice(1, -1);
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[#0F172A] dark:text-[#F8FAFC] font-mono text-[11px] border border-slate-200 dark:border-zinc-700"
            >
              {code}
            </code>
          );
        }

        // 4. Citations ([Page X], [p. X], [1], [Source: X])
        const pageMatch = part.match(/^\[(?:Page|p\.|pp\.)\s*(\d+(?:-\d+)?)\]$/i);
        if (pageMatch) {
          const pageNum = pageMatch[1];
          if (onCitationClick) {
            return (
              <button
                key={index}
                type="button"
                onClick={() => onCitationClick(`#cite-page-${pageNum}`)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded text-[10.5px] font-mono font-medium text-[#325FEC] dark:text-[#518FFF] hover:underline transition-colors cursor-pointer align-baseline"
                title={`Jump to Page ${pageNum}`}
              >
                <span>p. {pageNum}</span>
              </button>
            );
          }
          return <span key={index} className="text-slate-500 dark:text-zinc-400 font-normal"> (p. {pageNum})</span>;
        }

        const refMatch = part.match(/^\[(\d+)\]$/);
        if (refMatch) {
          const refNum = refMatch[1];
          if (onCitationClick) {
            return (
              <button
                key={index}
                type="button"
                onClick={() => onCitationClick(`#cite-ref-${refNum}`)}
                className="inline-flex items-center px-1 py-0.2 mx-0.5 rounded text-[10px] font-mono font-semibold text-[#325FEC] dark:text-[#518FFF] hover:underline cursor-pointer align-baseline"
                title={`Citation [${refNum}]`}
              >
                <span>[{refNum}]</span>
              </button>
            );
          }
          return <span key={index} className="text-slate-400 dark:text-zinc-500 text-[11px] font-mono">[{refNum}]</span>;
        }

        const sourceMatch = part.match(/^\[Source:\s*([^\]]+)\]$/i);
        if (sourceMatch) {
          const sourceTitle = sourceMatch[1];
          return (
            <span
              key={index}
              className="text-slate-500 dark:text-zinc-400 font-mono text-[11px] align-baseline"
            >
              ({sourceTitle})
            </span>
          );
        }

        // 5. Markdown Links ([text](url))
        const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        if (linkMatch) {
          const linkLabel = linkMatch[1];
          const linkUrl = linkMatch[2];
          return (
            <a
              key={index}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#325FEC] dark:text-[#518FFF] hover:underline font-medium inline-flex items-center gap-0.5"
            >
              {linkLabel}
            </a>
          );
        }

        // 6. Clean plain text (clean up stray escaped markdown, strip raw slashes)
        const cleanSegment = part.replace(/\\([*_`#[\]\\])/g, '$1');

        if (searchQuery) {
          return <React.Fragment key={index}>{semanticHighlight(cleanSegment, searchQuery)}</React.Fragment>;
        }

        return <React.Fragment key={index}>{cleanSegment}</React.Fragment>;
      })}
    </>
  );
}
