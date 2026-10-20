'use client';

import React from 'react';
import katex from 'katex';
import 'katex/contrib/mhchem'; // chemistry: \ce{H2O}
import 'katex/dist/katex.min.css';
import type { PreviewSegment } from '@/lib/paper/preview';

/**
 * KaTeX output for one piece of LaTeX. trust is off, so a link, image or script inside the LaTeX is not
 * carried into the page. A formula KaTeX can not read is shown as the typed LaTeX in red, never dropped.
 */
export function renderMath(latex: string, display: boolean): string {
  return katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    errorColor: '#b91c1c',
    output: 'htmlAndMathml', // MathML for screen readers, HTML for looks
    strict: 'ignore',
    trust: false,
  });
}

/** Text with LaTeX maths drawn as equations. A display equation sits on its own line with its number. */
export function MathSegments({ segments }: { segments: Array<Exclude<PreviewSegment, { type: 'cite' }>> }) {
  return (
    <>
      {segments.map((s, i) => {
        if (s.type === 'text') return <React.Fragment key={i}>{s.value}</React.Fragment>;
        if (s.type === 'inline') {
          return <span key={i} data-testid="math-inline" dangerouslySetInnerHTML={{ __html: renderMath(s.value, false) }} />;
        }
        return (
          <span key={i} data-testid="math-display" className="my-2 flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: renderMath(s.value, true) }} />
            <span data-testid="equation-number" className="shrink-0">({s.number})</span>
          </span>
        );
      })}
    </>
  );
}
