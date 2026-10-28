'use client';

import React from 'react';
import { X, Plus, Trash } from '@phosphor-icons/react';
import { HIDE_LABELS, type PaperMeta, type Author, type Affiliation, type HideKey } from '@/lib/paper/docModel';
import { RUNNING_HEAD_MAX } from '@/lib/paper/headerTokens';

// Everything on the first page and at the end of the paper that is not body text (design note section 2.5):
// printed title, running title, authors with affiliations, abstract, keywords, the end-matter statements, and
// the page setup (size, header and footer with tokens). The text itself is written on the sheet.

interface Props {
  meta: PaperMeta;
  onChange: (next: PaperMeta) => void;
  onClose: () => void;
}

const field = 'mt-1 w-full rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2.5 py-1.5 text-sm text-[#0F172A] dark:text-white';
const label = 'block text-[11px] font-semibold text-slate-600 dark:text-zinc-400';
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const newId = () => Math.random().toString(36).slice(2, 9);

const Group: React.FC<{ title: string; open?: boolean; children: React.ReactNode }> = ({ title, open, children }) => (
  <details open={open} className="group border-b border-[#D2DCEA] dark:border-[#27272A] py-3">
    <summary className="cursor-pointer select-none text-sm font-semibold text-[#0F172A] dark:text-white">{title}</summary>
    <div className="mt-3 space-y-3">{children}</div>
  </details>
);

export const FrontMatterPanel: React.FC<Props> = ({ meta, onChange, onClose }) => {
  const { front, page } = meta;
  const setFront = (patch: Partial<PaperMeta['front']>) => onChange({ ...meta, front: { ...front, ...patch } });
  const setPage = (patch: Partial<PaperMeta['page']>) => onChange({ ...meta, page: { ...page, ...patch } });
  const setAuthor = (id: string, patch: Partial<Author>) => setFront({ authors: front.authors.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const setAff = (id: string, patch: Partial<Affiliation>) => setFront({ affiliations: front.affiliations.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  return (
    <aside className="absolute right-0 top-0 bottom-0 z-30 w-[22rem] max-w-full overflow-y-auto shadow-2xl border-l border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] px-4 pb-6" data-testid="front-matter-panel" aria-label="Front matter">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-[#FAFBFD] dark:bg-[#121214] px-4 py-3 border-b border-[#D2DCEA] dark:border-[#27272A]">
        <h2 className="text-sm font-display font-bold text-[#0F172A] dark:text-white">Front matter</h2>
        <button type="button" onClick={onClose} aria-label="Close front matter" className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><X size={14} /></button>
      </div>

      <Group title="Title" open>
        <label className="block">
          <span className={label}>Printed title</span>
          <textarea value={front.title} onChange={(e) => setFront({ title: e.target.value })} rows={2} data-testid="fm-title" className={field} />
        </label>
        <label className="block">
          <span className={label}>Running title <span className="font-normal">({front.shortTitle.length}/{RUNNING_HEAD_MAX})</span></span>
          <input value={front.shortTitle} onChange={(e) => setFront({ shortTitle: e.target.value })} maxLength={RUNNING_HEAD_MAX} placeholder="Shown in the page header" className={field} />
        </label>
      </Group>

      <Group title="Authors" open>
        {front.authors.map((a, i) => (
          <div key={a.id} className="rounded-lg border border-[#D2DCEA] dark:border-[#27272A] p-2.5 space-y-2" data-testid="fm-author">
            <div className="flex items-center gap-2">
              <input value={a.name} onChange={(e) => setAuthor(a.id, { name: e.target.value })} placeholder={`Author ${i + 1} name`} aria-label="Author name" className={`${field} !mt-0`} />
              <button type="button" onClick={() => setFront({ authors: front.authors.filter((x) => x.id !== a.id) })} aria-label="Remove author" className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"><Trash size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={a.orcid} onChange={(e) => setAuthor(a.id, { orcid: e.target.value })} placeholder="ORCID" aria-label="ORCID" className={`${field} !mt-0`} />
              <input value={a.email} onChange={(e) => setAuthor(a.id, { email: e.target.value })} placeholder="Email" aria-label="Email" className={`${field} !mt-0`} />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
              <input type="checkbox" checked={a.corresponding} onChange={(e) => setAuthor(a.id, { corresponding: e.target.checked })} /> Corresponding author
            </label>
            {front.affiliations.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {front.affiliations.map((af, n) => (
                  <label key={af.id} className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-zinc-400" title={af.name}>
                    <input
                      type="checkbox"
                      checked={a.affiliationIds.includes(af.id)}
                      onChange={(e) => setAuthor(a.id, { affiliationIds: e.target.checked ? [...a.affiliationIds, af.id] : a.affiliationIds.filter((x) => x !== af.id) })}
                    />
                    {n + 1}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFront({ authors: [...front.authors, { id: newId(), name: '', affiliationIds: [], orcid: '', email: '', corresponding: false }] })}
          data-testid="fm-add-author"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#325FEC] dark:text-[#8DB4FF] cursor-pointer"
        >
          <Plus size={12} weight="bold" /> Add author
        </button>
      </Group>

      <Group title="Affiliations">
        {front.affiliations.map((af, i) => (
          <div key={af.id} className="rounded-lg border border-[#D2DCEA] dark:border-[#27272A] p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{i + 1}</span>
              <input value={af.name} onChange={(e) => setAff(af.id, { name: e.target.value })} placeholder="Institution" aria-label="Institution" className={`${field} !mt-0`} />
              <button
                type="button"
                onClick={() => onChange({ ...meta, front: { ...front, affiliations: front.affiliations.filter((x) => x.id !== af.id), authors: front.authors.map((a) => ({ ...a, affiliationIds: a.affiliationIds.filter((x) => x !== af.id) })) } })}
                aria-label="Remove affiliation"
                className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
              ><Trash size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={af.city} onChange={(e) => setAff(af.id, { city: e.target.value })} placeholder="City" aria-label="City" className={`${field} !mt-0`} />
              <input value={af.country} onChange={(e) => setAff(af.id, { country: e.target.value })} placeholder="Country" aria-label="Country" className={`${field} !mt-0`} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setFront({ affiliations: [...front.affiliations, { id: newId(), name: '', city: '', country: '' }] })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#325FEC] dark:text-[#8DB4FF] cursor-pointer">
          <Plus size={12} weight="bold" /> Add affiliation
        </button>
      </Group>

      <Group title="Abstract and keywords" open>
        {'parts' in front.abstract ? (
          front.abstract.parts.map((p, i) => (
            <label key={p.label} className="block">
              <span className={label}>{p.label}</span>
              <textarea
                value={p.text}
                rows={3}
                onChange={(e) => {
                  const parts = (front.abstract as { parts: Array<{ label: string; text: string }> }).parts.map((x, n) => (n === i ? { ...x, text: e.target.value } : x));
                  setFront({ abstract: { parts } });
                }}
                className={field}
              />
            </label>
          ))
        ) : (
          <label className="block">
            <span className={label}>Abstract</span>
            <textarea value={front.abstract.text} rows={6} onChange={(e) => setFront({ abstract: { text: e.target.value } })} data-testid="fm-abstract" className={field} />
          </label>
        )}
        <p className="text-[11px] text-slate-500">{words('parts' in front.abstract ? front.abstract.parts.map((p) => p.text).join(' ') : front.abstract.text)} words. Maths can be typed as $x^2$.</p>
        <label className="block">
          <span className={label}>Keywords, separated by commas</span>
          <input value={front.keywords.join(', ')} onChange={(e) => setFront({ keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })} className={field} />
        </label>
      </Group>

      <Group title="End matter">
        {([
          ['acknowledgements', 'Acknowledgements'],
          ['funding', 'Funding'],
          ['competingInterests', 'Competing interests'],
          ['dataAvailability', 'Data availability'],
          ['ethics', 'Ethics approval and consent'],
          ['aiUse', 'Use of AI tools'],
        ] as const).map(([k, name]) => (
          <label key={k} className="block">
            <span className={label}>{name}</span>
            <textarea value={front.statements[k]} rows={2} onChange={(e) => setFront({ statements: { ...front.statements, [k]: e.target.value } })} className={field} />
          </label>
        ))}
      </Group>

      <Group title="Structure: show or remove">
        <p className="text-[11px] text-slate-500">Untick a block to take it off the page. Its text is kept and comes back when you tick it again.</p>
        {(Object.keys(HIDE_LABELS) as HideKey[]).map((k) => (
          <label key={k} className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={!meta.hide?.[k]}
              data-testid={`fm-show-${k}`}
              onChange={(e) => onChange({ ...meta, hide: { ...(meta.hide ?? {}), [k]: !e.target.checked } })}
            />
            {HIDE_LABELS[k]}
          </label>
        ))}
      </Group>

      <Group title="Layout">
        <label className="block">
          <span className={label}>Typeface</span>
          <select value={page.font} onChange={(e) => setPage({ font: e.target.value as 'sans' | 'serif' })} data-testid="fm-font" className={field}>
            <option value="sans">Sans serif (Arial)</option>
            <option value="serif">Serif (Georgia)</option>
          </select>
        </label>
      </Group>


      <Group title="Submission">
        <label className="block">
          <span className={label}>Journal or conference</span>
          <input value={meta.venue} onChange={(e) => onChange({ ...meta, venue: e.target.value })} className={field} />
        </label>
        <label className="block">
          <span className={label}>Word limit</span>
          <input
            value={meta.wordLimit ?? ''}
            inputMode="numeric"
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9]/g, ''));
              onChange({ ...meta, wordLimit: n > 0 ? n : null });
            }}
            className={field}
          />
        </label>
      </Group>
    </aside>
  );
};
