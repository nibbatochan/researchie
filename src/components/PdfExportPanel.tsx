'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CircleNotch, DownloadSimple, FilePdf, Check, WarningCircle } from '@phosphor-icons/react';
import type { ResearchAtom, ResearchProject } from '@/lib/types/research';
import { buildReportModel } from '@/lib/export/pdf/pdfReport.ts';
import { findUnsupportedCharacters } from '@/lib/export/pdf/glyphs.ts';
import {
  DEFAULT_REPORT_OPTIONS,
  REPORT_STYLE_LABELS,
  type ReportCitationStyle,
  type ReportOptions,
  type ReportSectionKey,
} from '@/lib/export/pdf/types.ts';
import { downloadBlob } from '@/lib/export/download';

interface PdfExportPanelProps {
  project: ResearchProject;
  /** The clips to export: the whole project, or only the selected ones, as chosen in the dialog. */
  atoms: ResearchAtom[];
}

const SECTION_ROWS: ReadonlyArray<{ key: ReportSectionKey; label: string }> = [
  { key: 'syntheses', label: 'Syntheses & notes' },
  { key: 'quotes', label: 'Quotes & key excerpts' },
  { key: 'blocks', label: 'Web blocks & tables' },
  { key: 'images', label: 'Images & OCR text' },
  { key: 'links', label: 'Bookmarks & links' },
];

const STYLES: ReadonlyArray<ReportCitationStyle> = ['line', 'apa', 'ama'];
const STYLE_STORAGE_KEY = 'researchie.citationStyle';

export const PdfExportPanel: React.FC<PdfExportPanelProps> = ({ project, atoms }) => {
  const [options, setOptions] = useState<Omit<ReportOptions, 'generatedAt'>>(DEFAULT_REPORT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);

  // Start with the citation style the user last chose in the citation box, when the PDF supports it.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STYLE_STORAGE_KEY) as ReportCitationStyle | null;
      if (saved && STYLES.includes(saved)) setOptions((o) => ({ ...o, citationStyle: saved }));
    } catch {}
  }, []);

  const openedAt = useMemo(() => new Date().toISOString(), []);
  const fullOptions: ReportOptions = { ...options, generatedAt: openedAt };

  // Counts per section with everything switched on, so a switched-off section still shows its size.
  const everything = useMemo(
    () =>
      buildReportModel(project, atoms, {
        ...fullOptions,
        sections: { syntheses: true, quotes: true, blocks: true, images: true, links: true, bibliography: true },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, atoms, options.citationStyle, options.includeFlags, options.includeNotes, options.includeImages],
  );
  const model = useMemo(
    () => buildReportModel(project, atoms, fullOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, atoms, options],
  );

  // Characters no PDF font here can draw (for example Chinese). They print as a visible mark, not silently.
  const unsupported = useMemo(() => findUnsupportedCharacters(model), [model]);

  const countFor = (key: ReportSectionKey) => everything.sections.find((s) => s.key === key)?.items.length ?? 0;
  const flaggedClips = model.sections.reduce((n, s) => n + s.items.filter((i) => i.flags.length > 0).length, 0);
  const cited = model.sections.reduce((n, s) => n + s.items.filter((i) => i.citationNumber !== undefined).length, 0);
  const isEmpty = model.cover.clipCount === 0;

  const toggleSection = (key: ReportSectionKey | 'bibliography') =>
    setOptions((o) => ({ ...o, sections: { ...o.sections, [key]: !o.sections[key] } }));
  const toggle = (key: 'includeNotes' | 'includeImages' | 'includeFlags') => setOptions((o) => ({ ...o, [key]: !o[key] }));

  const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    setSavedAs(null);
    try {
      const now = new Date();
      const finalModel = buildReportModel(project, atoms, { ...options, generatedAt: now.toISOString() });
      // The PDF library and fonts load only now, so the rest of the app stays light.
      const { generateReportPdf } = await import('@/lib/export/pdf/generate.ts');
      const blob = await generateReportPdf(finalModel);
      const filename = `${slug}-research-report-${now.toISOString().slice(0, 10)}.pdf`;
      downloadBlob(blob, filename);
      setSavedAs(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The PDF could not be made.');
    } finally {
      setBusy(false);
    }
  };

  const box = (checked: boolean, onChange: () => void, disabled = false) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="rounded border-[#CBD5E1] dark:border-[#3F3F46] text-[#325FEC] focus:ring-[#325FEC]"
    />
  );

  return (
    <div data-testid="pdf-export-panel" className="flex-1 min-h-0 overflow-y-auto bg-[#F8F9FB] dark:bg-[#09090B] p-5 font-sans text-xs text-slate-700 dark:text-zinc-300">
      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-5">
        {/* Options */}
        <div className="space-y-4">
          <div>
            <h4 className="font-display font-bold text-sm text-[#0F172A] dark:text-white mb-1.5">What goes in the report</h4>
            <div className="space-y-1">
              {SECTION_ROWS.map(({ key, label }) => {
                const count = countFor(key);
                return (
                  <label key={key} data-testid={`pdf-section-${key}`} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] ${count === 0 ? 'opacity-50' : 'cursor-pointer'}`}>
                    <span className="flex items-center gap-2">
                      {box(options.sections[key] && count > 0, () => toggleSection(key), count === 0)}
                      <span>{label}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">{count}</span>
                  </label>
                );
              })}
              <label data-testid="pdf-section-bibliography" className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] ${everything.bibliography.length === 0 ? 'opacity-50' : 'cursor-pointer'}`}>
                <span className="flex items-center gap-2">
                  {box(options.sections.bibliography && everything.bibliography.length > 0, () => toggleSection('bibliography'), everything.bibliography.length === 0)}
                  <span>Bibliography</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">{everything.bibliography.length}</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-[#0F172A] dark:text-white mb-1.5">Citation style</h4>
            <div role="group" aria-label="Citation style" className="inline-flex rounded-lg border border-[#E2E5EB] dark:border-[#27272A] overflow-hidden bg-white dark:bg-[#121214]">
              {STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  data-testid={`pdf-style-${style}`}
                  aria-pressed={options.citationStyle === style}
                  onClick={() => setOptions((o) => ({ ...o, citationStyle: style }))}
                  className={`px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    options.citationStyle === style ? 'bg-[#325FEC] text-white' : 'text-slate-600 dark:text-zinc-400 hover:bg-[#E4ECF6] dark:hover:bg-[#222226]'
                  }`}
                >
                  {REPORT_STYLE_LABELS[style]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-[#0F172A] dark:text-white mb-1.5">Extras</h4>
            <div className="space-y-1">
              {(
                [
                  ['includeNotes', 'Include my notes on each clip'],
                  ['includeImages', 'Include images'],
                  ['includeFlags', 'Show verification flags (retracted, verify source)'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} data-testid={`pdf-${key}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] cursor-pointer">
                  {box(options[key], () => toggle(key))}
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Summary and download */}
        <div className="space-y-4">
          <div data-testid="pdf-summary" className="rounded-xl bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] p-4">
            <div className="flex items-center gap-2 mb-2">
              <FilePdf size={20} weight="fill" className="text-[#325FEC] dark:text-[#518FFF]" />
              <span className="font-display font-bold text-sm text-[#0F172A] dark:text-white">Research report (PDF)</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 mb-3 leading-relaxed">
              A cover, contents, your clips as cards with their sources, and a numbered bibliography. Links stay clickable.
            </p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <dt className="text-slate-500 dark:text-zinc-400">Clips</dt>
              <dd data-testid="pdf-summary-clips" className="font-mono text-right">{model.cover.clipCount}</dd>
              <dt className="text-slate-500 dark:text-zinc-400">Sources in the bibliography</dt>
              <dd data-testid="pdf-summary-sources" className="font-mono text-right">{model.cover.sourceCount}</dd>
              <dt className="text-slate-500 dark:text-zinc-400">Clips with a citation</dt>
              <dd className="font-mono text-right">{cited}</dd>
              <dt className="text-slate-500 dark:text-zinc-400">Citation style</dt>
              <dd className="font-mono text-right">{model.cover.styleLabel}</dd>
            </dl>
            {options.includeFlags && flaggedClips > 0 && (
              <p data-testid="pdf-summary-flags" className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300">
                <WarningCircle size={14} weight="fill" className="mt-px flex-shrink-0 text-[#D97706] dark:text-[#FBBF24]" />
                <span>{flaggedClips} {flaggedClips === 1 ? 'clip has' : 'clips have'} a source flag. They are marked in the report.</span>
              </p>
            )}
            {unsupported.length > 0 && (
              <p data-testid="pdf-summary-glyphs" className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300">
                <WarningCircle size={14} weight="fill" className="mt-px flex-shrink-0 text-[#D97706] dark:text-[#FBBF24]" />
                <span>
                  These characters cannot be drawn in the PDF and will show as <span className="font-mono">{'\uFFFD'}</span>:{' '}
                  <span className="font-mono">{unsupported.join(' ')}</span>. The Markdown export keeps them.
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            data-testid="pdf-download-button"
            onClick={handleDownload}
            disabled={busy || isEmpty}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            {busy ? <CircleNotch size={15} className="animate-spin" /> : <DownloadSimple size={15} weight="bold" />}
            <span>{busy ? 'Building your PDF…' : 'Download PDF'}</span>
          </button>
          {isEmpty && <p className="text-[11px] text-slate-500 dark:text-zinc-400">Nothing to export yet: switch a section on or add clips.</p>}

          <div role="status" aria-live="polite">
            {savedAs && (
              <p data-testid="pdf-saved" className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300">
                <Check size={14} weight="bold" className="mt-px flex-shrink-0 text-[#059669] dark:text-[#34D399]" />
                <span>Saved <span className="font-mono">{savedAs}</span> to your downloads.</span>
              </p>
            )}
            {error && (
              <p data-testid="pdf-error" className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300">
                <WarningCircle size={14} weight="fill" className="mt-px flex-shrink-0 text-[#DC2626] dark:text-[#F87171]" />
                <span>Could not make the PDF: {error}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
