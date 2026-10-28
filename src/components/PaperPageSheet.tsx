'use client';

import React from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { PencilSimple } from '@phosphor-icons/react';
import type { PaperMeta } from '@/lib/paper/docModel';
import type { RenderedReference } from '@/lib/citations/inText';
import { resolveTokens } from '@/lib/paper/headerTokens';
import type { Geometry } from '@/lib/paper/paginate';

// The paper as fixed A4 or Letter pages (micro changes, step 3). Each page is a white box with a grey gap between
// pages; the header and footer are drawn on every page, skipping page 1 when "different first page" is on. The text
// is one column of content above the boxes; the editor's blocks are moved onto the next page by the pagination in
// PaperEditor (paginate.ts). The front matter and the end matter are not split: they sit where they fall. The sheet
// stays white in dark mode on purpose, like paper.

const STATEMENT_LABELS: Array<[keyof PaperMeta['front']['statements'], string]> = [
  ['acknowledgements', 'Acknowledgements'],
  ['funding', 'Funding'],
  ['competingInterests', 'Competing interests'],
  ['dataAvailability', 'Data availability'],
  ['ethics', 'Ethics'],
  ['aiUse', 'Use of AI tools'],
];

interface Props {
  editor: Editor | null;
  meta: PaperMeta;
  references: RenderedReference[];
  /** Number of pages the content takes. */
  pages: number;
  geo: Geometry;
  /** The sheet element, which the editor measures. */
  wrapRef: React.RefObject<HTMLDivElement | null>;
  /** A margin being dragged on the ruler, in px: dashed guide lines show on every page. */
  guide?: number | null;
  onEditFront: () => void;
}

export const PaperPageSheet: React.FC<Props> = ({ editor, meta, references, pages, geo, wrapRef, guide, onEditFront }) => {
  const { front, page } = meta;
  const hide = meta.hide ?? {};
  const token = (text: string, n: number) => resolveTokens(text, meta, n, pages);
  const zone = (hf: { left: string; center: string; right: string }, n: number) => (
    <div className="grid grid-cols-3 text-[8pt] text-slate-500">
      <span className="text-left truncate">{token(hf.left, n)}</span>
      <span className="text-center truncate">{token(hf.center, n)}</span>
      <span className="text-right truncate">{token(hf.right, n)}</span>
    </div>
  );
  const hasHeaderOn = (index: number) => !hide.header && !(page.differentFirstPage && index === 0);
  const hasFooterOn = (index: number) => !hide.footer && !(page.differentFirstPage && index === 0);
  // Odd and even pages (Word): the displayed number is index + startAt, and an even one takes the even zones.
  const zonesFor = (index: number, part: 'header' | 'footer') => {
    const even = page.oddEven && (index + page.startAt) % 2 === 0;
    return even ? (part === 'header' ? page.headerEven : page.footerEven) : page[part];
  };
  const affIndex = (id: string) => front.affiliations.findIndex((a) => a.id === id) + 1;
  const abstractEmpty = 'parts' in front.abstract ? front.abstract.parts.every((p) => !p.text.trim()) : !front.abstract.text.trim();
  const showAbstract = !hide.abstract && !abstractEmpty;
  const showKeywords = !hide.keywords && front.keywords.length > 0;
  const W = page.size === 'a4' ? 794 : 816;
  const S = geo.S;
  const H = geo.H;
  const inset = Math.round(geo.top * 0.4);

  return (
    <div
      ref={wrapRef}
      data-testid="paper-sheet"
      data-font={page.font}
      data-margin={page.margin}
      data-columns={page.columns}
      className="paper-sheet relative mx-auto w-full"
      style={{ maxWidth: W, minHeight: pages * S - geo.G }}
    >
      {Array.from({ length: pages }, (_, index) => (
        <div
          key={index}
          data-page-box={index + 1}
          aria-hidden
          className="absolute left-0 right-0 bg-white shadow-lg ring-1 ring-[#D2DCEA]"
          style={{ top: index * S, height: H }}
        >
          {guide != null && (
            <>
              <span data-testid="margin-guide" className="absolute inset-y-0 border-l border-dashed border-[#325FEC]" style={{ left: guide }} />
              <span className="absolute inset-y-0 border-l border-dashed border-[#325FEC]" style={{ right: guide }} />
            </>
          )}
          {hasHeaderOn(index) && (
            <div data-testid="paper-header" className="absolute" style={{ top: inset, left: geo.top, right: geo.top }}>
              {zone(zonesFor(index, 'header'), index + 1)}
            </div>
          )}
          {hasFooterOn(index) && (
            <div data-testid="paper-footer" className="absolute" style={{ bottom: inset, left: geo.top, right: geo.top }}>
              {zone(zonesFor(index, 'footer'), index + 1)}
            </div>
          )}
        </div>
      ))}

      <div className="relative z-10" style={{ padding: `${geo.top}px` }}>
        <section className="relative mb-8 text-center" data-testid="paper-front">
          <button
            type="button"
            onClick={onEditFront}
            className="paper-no-print absolute right-0 top-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
          >
            <PencilSimple size={12} /> Edit front matter
          </button>
          {!hide.title && <h1 className="paper-title" data-flow data-testid="paper-printed-title">{front.title || 'Untitled paper'}</h1>}
          {!hide.authors && front.authors.length > 0 && (
            <p className="paper-authors mt-3" data-flow>
              {front.authors.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ', '}
                  {a.name || 'Author'}
                  {a.affiliationIds.length > 0 && <sup>{a.affiliationIds.map(affIndex).filter(Boolean).join(',')}</sup>}
                  {a.corresponding && <sup title="Corresponding author">*</sup>}
                </span>
              ))}
            </p>
          )}
          {!hide.affiliations && front.affiliations.length > 0 && (
            <ol className="paper-affil mt-1 text-slate-600" data-flow>
              {front.affiliations.map((a, i) => (
                <li key={a.id}>
                  <sup>{i + 1}</sup> {[a.name, a.city, a.country].filter(Boolean).join(', ')}
                </li>
              ))}
            </ol>
          )}
          {!hide.authors && front.authors.some((a) => a.corresponding && a.email) && (
            <p className="paper-affil mt-1 text-slate-600" data-flow>* {front.authors.filter((a) => a.corresponding && a.email).map((a) => a.email).join(', ')}</p>
          )}
        </section>

        {(showAbstract || showKeywords) && (
          <section className="mb-6 text-left" data-testid="paper-abstract">
            {showAbstract && (
              <>
                <h2 className="paper-h-abs" data-flow data-keep>Abstract</h2>
                {'parts' in front.abstract ? (
                  front.abstract.parts.filter((p) => p.text.trim()).map((p) => (
                    <p key={p.label} className="mb-1 text-justify" data-flow>
                      <strong>{p.label}. </strong>
                      {p.text}
                    </p>
                  ))
                ) : (
                  <p className="text-justify" data-flow>{front.abstract.text}</p>
                )}
              </>
            )}
            {showKeywords && (
              <p className="mt-2" data-flow>
                <strong>Keywords: </strong>
                {front.keywords.join(', ')}
              </p>
            )}
          </section>
        )}

        <div className="paper-body" data-testid="paper-body">
          <EditorContent editor={editor} />
        </div>

        {!hide.statements && STATEMENT_LABELS.some(([k]) => front.statements[k].trim()) && (
          <section className="mt-8 text-left" data-testid="paper-statements">
            {STATEMENT_LABELS.filter(([k]) => front.statements[k].trim()).map(([k, label]) => (
              <p key={k} className="mb-2" data-flow>
                <strong>{label}. </strong>
                {front.statements[k]}
              </p>
            ))}
          </section>
        )}

        {!hide.references && (
          <section className="mt-8 text-left" data-testid="paper-references">
            <h2 className="paper-h-front" data-flow data-keep>References</h2>
            {references.length === 0 ? (
              <p className="paper-meta-line text-slate-400" data-flow>References appear here as you cite sources.</p>
            ) : (
              <ol className="paper-refs space-y-1">
                {references.map((r) => (
                  <li key={r.sourceId} data-flow className={r.incomplete ? 'text-amber-700' : ''}>
                    {r.label && <span className="mr-1.5 text-slate-500">{r.label}</span>}
                    {r.text}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
        <div data-content-end />
      </div>
    </div>
  );
};
