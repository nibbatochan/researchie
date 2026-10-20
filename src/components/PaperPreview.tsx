'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { PreviewDoc, PreviewSection, PreviewSegment } from '@/lib/paper/preview';
import { MathSegments } from './MathText';
import { usePrefs } from '@/lib/prefs/prefsContext';
import { buildPrintDocument, PREVIEW_ONLY_NOTE } from '@/lib/paper/printDoc';
import { STATUS_MESSAGE } from '@/lib/paper/draft';
import { IN_TEXT_STYLES, type InTextStyle, type MarkerPart } from '@/lib/citations/inText';

function jumpTo(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('bg-yellow-100');
  window.setTimeout(() => el.classList.remove('bg-yellow-100'), 1500);
}

/** Citations go before the full stop: "...night of sleep (Lee, 2020)." */
function splitEnd(text: string): [string, string] {
  const m = text.match(/^([\s\S]*?)([.!?]+["”')\]]*)\s*$/);
  return m ? [m[1], m[2]] : [text, ''];
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

/** Text with maths and citation markers. An optional marker is placed before the closing full stop. */
function Rich({ segments, marker }: { segments: PreviewSegment[]; marker?: MarkerPart[] }) {
  const withMarker = !!marker && marker.length > 0;
  let body = segments;
  let tail = '';
  if (withMarker) {
    const last = segments[segments.length - 1];
    if (last && last.type === 'text') {
      const [text, end] = splitEnd(last.value);
      body = [...segments.slice(0, -1), { ...last, value: text }];
      tail = end;
    }
  }
  // Runs of text and maths are drawn together; a citation token becomes a clickable marker.
  const out: React.ReactNode[] = [];
  let run: Array<Exclude<PreviewSegment, { type: 'cite' }>> = [];
  const flush = () => {
    if (run.length > 0) out.push(<MathSegments key={`r${out.length}`} segments={run} />);
    run = [];
  };
  body.forEach((seg, i) => {
    if (seg.type === 'cite') { flush(); out.push(<Marker key={`c${i}`} parts={seg.marker} />); }
    else run.push(seg);
  });
  flush();
  return (
    <>
      {out}
      {withMarker && <Marker parts={marker!} />}
      {tail}
    </>
  );
}

function SourceNote({ marker, noSource }: { marker: MarkerPart[]; noSource: boolean }) {
  if (noSource) return <span className="ml-1 rounded bg-red-50 px-1 font-sans text-[10px] font-semibold uppercase text-red-900">No source</span>;
  return marker.length > 0 ? <> Source: <Marker parts={marker} /></> : null;
}

function SectionBody({ section }: { section: PreviewSection }) {
  if (section.isEmpty) {
    return <p className="italic text-slate-400">Nothing here yet.</p>;
  }
  return (
    <>
      {section.point && <p className="mb-2"><Rich segments={section.pointSegments} /></p>}
      {section.parts.map((part) => (
        <div key={part.id} className="mb-2">
          {part.title && <h4 className="mb-1 font-bold italic">{part.title}</h4>}
          {part.blocks.length === 0 && <p className="italic text-slate-400">No clips placed under this part yet.</p>}
          {part.blocks.some((b) => b.kind === 'sentence') ? (
            <p className="mb-1.5 text-left md:text-justify">
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
                    <Rich segments={b.segments} marker={b.marker} />{' '}
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
              return <p key={b.clipId} data-testid="preview-own" className="mb-1.5"><Rich segments={b.segments} /></p>;
            }
            if (b.kind === 'authored') {
              return <p key={`a${part.blocks.indexOf(b)}`} data-testid="preview-authored" className="mb-1.5 text-left md:text-justify"><Rich segments={b.segments} /></p>;
            }
            if (b.kind === 'figure') {
              return (
                <figure key={b.clipId} data-testid="preview-figure" className="my-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.src} alt={b.caption || `Figure ${b.number}`} className="mx-auto max-h-72 max-w-full" />
                  <figcaption className="mt-1 text-left text-[12px]"><strong>Figure {b.number}.</strong> {b.caption}{/[.!?]$/.test(b.caption.trim()) || !b.caption.trim() ? '' : '.'}<SourceNote marker={b.marker} noSource={b.noSource} /></figcaption>
                </figure>
              );
            }
            if (b.kind === 'table') {
              return (
                <div key={b.clipId} data-testid="preview-table" className="my-3">
                  <p className="mb-1 text-[12px]"><strong>Table {b.number}.</strong> {b.caption}{/[.!?]$/.test(b.caption.trim()) || !b.caption.trim() ? '' : '.'}<SourceNote marker={b.marker} noSource={b.noSource} /></p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-y border-black text-[12px]">
                      {b.table.header.length > 0 && (
                        <thead><tr>{b.table.header.map((h, i) => <th key={i} className="border-b border-black px-2 py-1 text-left font-bold">{h}</th>)}</tr></thead>
                      )}
                      <tbody>{b.table.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="px-2 py-0.5 align-top">{cell}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              );
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

const COLUMNS_KEY = 'researchie.previewColumns';
const PRINT_FRAME_ID = 'paper-print-frame';

/** The app's own styles, so the printed article looks as it does on screen. */
function collectHead(): string {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((n) => n.outerHTML).join('\n');
}

/** A published-looking page built from the outline. For understanding the shape of a paper only. */
export function PaperPreview({ doc, style, onStyleChange }: { doc: PreviewDoc; style: InTextStyle; onStyleChange: (s: InTextStyle) => void }) {
  const prefs = usePrefs();
  const articleRef = useRef<HTMLElement>(null);
  const [columns, setColumnsState] = useState<1 | 2>(() => (prefs.get(COLUMNS_KEY) === '2' ? 2 : 1));
  const setColumns = (n: 1 | 2) => {
    setColumnsState(n);
    prefs.set(COLUMNS_KEY, String(n));
  };

  // The hidden print page is kept until the next export or until the preview closes, then removed.
  useEffect(() => () => { document.getElementById(PRINT_FRAME_ID)?.remove(); }, []);

  const exportPdf = () => {
    if (!articleRef.current) return;
    document.getElementById(PRINT_FRAME_ID)?.remove();
    const frame = document.createElement('iframe');
    frame.id = PRINT_FRAME_ID;
    frame.name = PRINT_FRAME_ID;
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    frame.onload = async () => {
      const w = frame.contentWindow;
      if (!w) return;
      try { await w.document.fonts?.ready; } catch { /* print without waiting */ }
      w.focus();
      w.print();
    };
    document.body.appendChild(frame);
    frame.srcdoc = buildPrintDocument({ title: doc.title, articleHtml: articleRef.current.outerHTML, headHtml: collectHead(), columns });
  };

  const hasNotes = doc.hasAiDraft || doc.unsourcedCount > 0;

  return (
    <div data-testid="paper-preview" className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#E5E8EE] dark:bg-[#18181B]">
      <div role="note" data-testid="preview-banner" className="sticky top-0 z-10 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">
        {PREVIEW_ONLY_NOTE}
      </div>

      <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 px-3">
        <div role="group" aria-label="Citation style" className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
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
        <div role="group" aria-label="Columns" className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`preview-columns-${n}`}
              aria-pressed={columns === n}
              onClick={() => setColumns(n)}
              className={`rounded-md px-2.5 py-1 ${columns === n ? 'bg-[#325FEC] text-white' : 'text-slate-600'}`}
            >{n === 1 ? 'One column' : 'Two columns'}</button>
          ))}
        </div>
        <button
          type="button"
          data-testid="export-pdf"
          onClick={exportPdf}
          title="Opens your browser's print window. Choose Save as PDF there. Every page says this is a preview only."
          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:border-[#325FEC]"
        >Download preview as PDF</button>
      </div>

      <article ref={articleRef} className="paper-article mx-auto mb-6 mt-3 w-full max-w-[720px] bg-white px-8 py-10 font-serif text-[13.5px] leading-[1.55] text-[#111] shadow-lg md:px-14" style={{ fontFamily: '"Times New Roman", Times, "STIX Two Text", serif' }}>
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

        <div className={`paper-body ${columns === 2 ? 'paper-two-col' : ''}`} data-testid="paper-body" data-columns={columns}>
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
        </div>

        {hasNotes && (
          <aside data-testid="preview-notes" className="mt-6 rounded border border-slate-300 px-3 py-2 font-sans text-[11px] text-slate-700">
            <p className="mb-1 font-semibold uppercase tracking-wide">Notes for the author, not part of the paper</p>
            {doc.hasAiDraft && (
              <p data-testid="preview-ai-note">Some text in this preview was drafted by AI. Many journals ask authors to say so; check the policy of the journal you submit to.</p>
            )}
            {doc.unsourcedCount > 0 && (
              <p data-testid="preview-unsourced" className="text-red-700">{doc.unsourcedCount} item{doc.unsourcedCount === 1 ? '' : 's'} still without a source. No source, no claim.</p>
            )}
          </aside>
        )}
      </article>
    </div>
  );
}
