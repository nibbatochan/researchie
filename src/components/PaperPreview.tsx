'use client';

import React from 'react';
import type { PreviewDoc, PreviewSection } from '@/lib/paper/preview';
import { STATUS_MESSAGE } from '@/lib/paper/draft';
import { IN_TEXT_STYLES, type InTextStyle, type MarkerPart } from '@/lib/citations/inText';

function jumpTo(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('bg-yellow-100');
  window.setTimeout(() => el.classList.remove('bg-yellow-100'), 1500);
}

function Marker({ parts }: { parts: MarkerPart[] }) {
  return (
    <span className="whitespace-nowrap">
      {' '}
      {parts.map((m, i) =>
        m.sourceId ? (
          <button key={i} type="button" data-testid="preview-cite-link" onClick={() => jumpTo(`pv-ref-${m.sourceId}`)} className="text-[#1a4fb8] hover:underline">{m.text}</button>
        ) : (
          <span key={i}>{m.text}</span>
        ),
      )}
    </span>
  );
}

function SectionBody({ section }: { section: PreviewSection }) {
  if (section.isEmpty) {
    return <p className="italic text-slate-400">Nothing here yet.</p>;
  }
  return (
    <>
      {section.point && <p className="mb-2">{section.point}</p>}
      {section.parts.map((part) => (
        <div key={part.id} className="mb-2">
          {part.title && <h4 className="mb-1 font-bold italic">{part.title}</h4>}
          {part.blocks.length === 0 && <p className="italic text-slate-400">No clips placed under this part yet.</p>}
          {part.blocks.some((b) => b.kind === 'sentence') ? (
            <p className="mb-1.5 text-justify">
              {part.blocks.map((b, i) => {
                if (b.kind !== 'sentence') return null;
                const flagged = b.status !== 'sourced' && b.status !== 'own';
                return (
                  <span
                    key={i}
                    data-testid="preview-sentence"
                    data-status={b.status}
                    title={flagged ? STATUS_MESSAGE[b.status] : undefined}
                    className={flagged ? 'rounded bg-red-50 px-0.5 text-red-900' : b.placeholder ? 'rounded bg-amber-50 px-0.5' : undefined}
                  >
                    {b.text}<Marker parts={b.marker} />{' '}
                  </span>
                );
              })}
            </p>
          ) : null}
          {part.blocks.map((b) => {
            if (b.kind === 'sentence') return null;
            if (b.kind === 'quote') {
              return <p key={b.clipId} data-testid="preview-quote" className="mb-1.5">&ldquo;{b.text}&rdquo;<Marker parts={b.marker} /></p>;
            }
            if (b.kind === 'own') {
              return <p key={b.clipId} data-testid="preview-own" className="mb-1.5">{b.text}</p>;
            }
            if (b.kind === 'ai') {
              return (
                <p key={b.clipId} data-testid="preview-ai" className="mb-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-amber-900">
                  <span className="mr-1 font-sans text-[10px] font-semibold uppercase">AI summary, rewrite and cite the paper</span>{b.text}
                </p>
              );
            }
            return (
              <p key={b.clipId} data-testid="preview-uncited" className="mb-1.5 rounded bg-red-50 px-1.5 py-0.5 text-red-900">
                <span className="mr-1 font-sans text-[10px] font-semibold uppercase">No source</span>&ldquo;{b.text}&rdquo;
              </p>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** A published-looking page built from the outline. For understanding the shape of a paper only. */
export function PaperPreview({ doc, style, onStyleChange }: { doc: PreviewDoc; style: InTextStyle; onStyleChange: (s: InTextStyle) => void }) {
  return (
    <div data-testid="paper-preview" className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#E5E8EE] dark:bg-[#18181B]">
      <div role="note" data-testid="preview-banner" className="sticky top-0 z-10 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">
        Preview only. Not journal formatting. A journal sets its own layout and its editors format the final paper.
      </div>

      <div role="group" aria-label="Citation style" className="mx-auto mt-4 flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
        {IN_TEXT_STYLES.map((st) => (
          <button
            key={st.id}
            type="button"
            data-testid={`preview-style-${st.id}`}
            aria-pressed={style === st.id}
            title={st.hint}
            onClick={() => onStyleChange(st.id)}
            className={`rounded-md px-2.5 py-1 ${style === st.id ? 'bg-[#325FEC] text-white' : 'text-slate-600'}`}
          >{st.label}</button>
        ))}
      </div>

      <article className="mx-auto mb-6 mt-3 w-full max-w-[720px] bg-white px-8 py-10 font-serif text-[13.5px] leading-[1.55] text-[#111] shadow-lg md:px-14" style={{ fontFamily: '"Times New Roman", Times, "STIX Two Text", serif' }}>
        <header className="mb-6 text-center">
          <h1 data-testid="preview-title" className={`text-2xl font-bold leading-tight ${doc.title ? '' : 'text-slate-400'}`}>{doc.title || 'Untitled paper'}</h1>
          <p className={`mt-2 text-sm ${doc.authors ? '' : 'text-slate-400'}`}>{doc.authors || 'Author names'}</p>
          <p className="mt-1 text-xs text-slate-500">Affiliation · email · DOI and dates are added by the journal</p>
        </header>

        {doc.abstract && (
          <section data-testid="preview-abstract" className="mb-6 border-y border-slate-300 py-3">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide">Abstract</h2>
            {doc.abstract.isEmpty ? <p className="italic text-slate-400">Write this last.</p> : <SectionBody section={doc.abstract} />}
          </section>
        )}

        {doc.sections.map((section, i) => (
          <section key={section.id} data-testid="preview-section" className="mb-5">
            <h2 className="mb-1.5 text-base font-bold">{i + 1}. {section.title}</h2>
            <SectionBody section={section} />
          </section>
        ))}

        <section data-testid="preview-references" className="mt-8 border-t border-slate-300 pt-3">
          <h2 className="mb-2 text-base font-bold">References</h2>
          {doc.references.length === 0 ? (
            <p className="italic text-slate-400">Sources you cite will be listed here.</p>
          ) : (
            <ol className="space-y-1.5 text-[12.5px]">
              {doc.references.map((r) => (
                <li key={r.sourceId} id={`pv-ref-${r.sourceId}`} data-testid="preview-reference" className="flex gap-2 transition-colors">
                  {r.label && <span className="shrink-0">{r.label}</span>}
                  <span className="min-w-0 flex-1 break-words">{r.text}{r.incomplete && <span className="ml-1 font-sans text-[10px] text-amber-700">(incomplete)</span>}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </article>

      {doc.hasAiDraft && (
        <p data-testid="preview-ai-note" className="mx-auto mb-3 max-w-[720px] px-4 text-center text-xs text-slate-600">
          Some text in this preview was drafted by AI. Many journals ask authors to say so; check the policy of the journal you submit to.
        </p>
      )}

      {doc.unsourcedCount > 0 && (
        <p data-testid="preview-unsourced" className="mx-auto mb-6 max-w-[720px] px-4 text-center text-xs text-red-700">
          {doc.unsourcedCount} item{doc.unsourcedCount === 1 ? '' : 's'} still without a source. No source, no claim.
        </p>
      )}
    </div>
  );
}
