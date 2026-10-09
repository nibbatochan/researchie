import React from 'react';

// Regex components
const URL_REGEX = /(https?:\/\/[^\s]+)/i;
const PAGE_REF_REGEX = /\b(?:Page|p\.|pp\.)\s*\d+(?:-\d+)?\b/i;
const DATE_REGEX = /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\b(?:19|20)\d{2}\b|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:19|20)\d{2})\b/i;
const METRIC_REGEX = /(?:\+|\-)?(?:\$|€|£|¥)\s*\d+(?:[.,]\d+)*(?:\s*(?:k|M|B|T|million|billion|trillion))?|(?:\+|\-)?\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b|\b\d+(?:\.\d+)?\s*(?:ms|fps|GB|MB|KB|TB)\b|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b/i;

// Combine into one large regex with capture groups to identify the type
const COMBINED_REGEX = new RegExp(
  `(${URL_REGEX.source})|(${PAGE_REF_REGEX.source})|(${DATE_REGEX.source})|(${METRIC_REGEX.source})`,
  'gi'
);

export function semanticHighlightText(text: string | undefined): React.ReactNode {
  return semanticHighlight(text);
}

export function semanticHighlight(text: string | undefined, query?: string): React.ReactNode {
  if (!text) return '';

  // 1. If search query is active, split and prioritize search marks
  if (query && query.trim()) {
    const trimmed = query.trim();
    const rawTerms = trimmed.split(/\s+/).filter((w) => w.length >= 2);
    const terms = [trimmed, ...rawTerms];
    const uniqueTerms = Array.from(new Set(terms)).sort((a, b) => b.length - a.length);
    const escapedTerms = uniqueTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const queryRegex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

    const parts = text.split(queryRegex);
    if (parts.length > 1) {
      return (
        <>
          {parts.map((part, index) =>
            uniqueTerms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
              <mark
                key={index}
                className="bg-[#325FEC]/20 text-[#325FEC] dark:text-[#518FFF] font-semibold px-1 py-0.5 rounded mx-0.5 inline-block"
              >
                {part}
              </mark>
            ) : (
              semanticHighlight(part)
            )
          )}
        </>
      );
    }
  }

  // 2. Parse Key Metrics, Dates, Page Refs, URLs
  const tokenParts = text.split(COMBINED_REGEX);
  if (tokenParts.length <= 1) return text;

  return (
    <>
      {tokenParts.map((segment, idx) => {
        if (!segment) return null;

        if (URL_REGEX.test(segment)) {
          return <span key={idx} className="text-blue-600/70 dark:text-blue-400/70">{segment}</span>;
        }
        if (PAGE_REF_REGEX.test(segment)) {
          return <span key={idx} className="text-amber-600/60 dark:text-amber-400/60">{segment}</span>;
        }
        if (DATE_REGEX.test(segment)) {
          return <span key={idx} className="text-violet-600/70 dark:text-violet-400/60">{segment}</span>;
        }
        if (METRIC_REGEX.test(segment)) {
          return <span key={idx} className="text-emerald-600/70 dark:text-emerald-400/70 font-mono text-[0.95em]">{segment}</span>;
        }

        return <span key={idx}>{segment}</span>;
      })}
    </>
  );
}
