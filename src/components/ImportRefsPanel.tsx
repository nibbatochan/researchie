'use client';

import React, { useRef, useState } from 'react';
import type { ResearchAtom } from '@/lib/types/research';
import type { CitationRecord } from '@/lib/citations/types';
import { altTitlesFor, matchEntries, normalizeDoi, parseReferences, type EntryMatch, type ImportedEntry, type MatchTarget } from '@/lib/citations/importRefs';

interface Props {
  projectId: string;
  atoms: ResearchAtom[];
  /** Called with the clips whose citation changed, so the outline shows them at once. */
  onApplied: (changes: Map<string, CitationRecord>) => void;
}

interface DocInfo {
  id: string;
  title: string;
  filename?: string;
  citation?: CitationRecord;
}

const label = (r: CitationRecord) => {
  const who = r.authors[0]?.family ? `${r.authors[0].family}${r.authors.length > 1 ? ' et al.' : ''}` : 'Unknown author';
  return `${who}${r.year ? ` (${r.year})` : ''}: ${r.title ?? 'Untitled'}`;
};

async function loadDocs(projectId: string): Promise<DocInfo[]> {
  const res = await fetch(`/api/documents?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !Array.isArray(json.data)) throw new Error('Could not read the PDFs in this project.');
  return json.data.map((d: any) => ({ id: d.id, title: d.title || d.filename || 'Untitled PDF', filename: d.filename, citation: d.citation }));
}

/** Keeps a known retraction: replacing a citation must never hide that the paper was retracted. */
function withKnownRetraction(next: CitationRecord, existing?: CitationRecord): CitationRecord {
  return existing?.retracted !== undefined ? { ...next, retracted: existing.retracted } : next;
}

/** Import RIS or BibTeX and attach each entry's citation to the PDF or clip it belongs to. */
export function ImportRefsPanel({ projectId, atoms, onApplied }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<ImportedEntry[] | null>(null);
  const [matches, setMatches] = useState<EntryMatch[]>([]);
  const [targets, setTargets] = useState<MatchTarget[]>([]);
  const [choice, setChoice] = useState<Record<number, string>>({}); // entry index -> target id ('' = none)
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
    setEntries(null);
    setMessage('');
  };

  const read = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const parsed = parseReferences(text);
      if (parsed.format === 'unknown' || parsed.entries.length === 0) {
        setEntries(null);
        setError('No references found. Use a RIS or BibTeX file (in Zotero: right-click a collection, Export Collection).');
        return;
      }
      const docs = await loadDocs(projectId);
      const docTargets: MatchTarget[] = docs.map((d) => ({ kind: 'doc', id: d.id, title: d.title, altTitles: altTitlesFor(d.title, d.filename), doi: d.citation?.doi, hasCitation: !!d.citation }));
      // A clip from a PDF takes its citation from the PDF, so only clips from web pages and other sources are targets.
      const clipTargets: MatchTarget[] = atoms
        .filter((a) => !a.metadata?.documentId && a.type !== 'note')
        .map((a) => ({
          kind: 'clip' as const,
          id: a.id,
          title: a.metadata?.pageTitle || a.title || '',
          doi: a.metadata?.citation?.doi ?? a.metadata?.pageIdentifiers?.doi,
          hasCitation: !!a.metadata?.citation,
        }));
      const all = [...docTargets, ...clipTargets];
      const found = matchEntries(parsed.entries, all);
      const initial: Record<number, string> = {};
      for (const m of found) {
        // Matched entries are pre-selected, except when that would replace a citation already there.
        if (m.status === 'matched' && !m.candidates[0].hasCitation) initial[m.index] = m.candidates[0].id;
      }
      setEntries(parsed.entries);
      setTargets(all);
      setMatches(found);
      setChoice(initial);
      const how = parsed.format === 'ris' ? 'RIS' : 'BibTeX';
      setSummary(`Read ${parsed.entries.length} ${parsed.entries.length === 1 ? 'reference' : 'references'} (${how})${parsed.skipped ? `; ${parsed.skipped} could not be read` : ''}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the references.');
    } finally {
      setBusy(false);
    }
  };

  const chosen = Object.entries(choice).filter(([, id]) => id);

  const apply = async () => {
    if (!entries) return;
    setBusy(true);
    setError('');
    const changes = new Map<string, CitationRecord>();
    let docCount = 0;
    let clipCount = 0;
    let failed = 0;
    try {
      const docs = await loadDocs(projectId);
      for (const [indexText, targetId] of chosen) {
        const entry = entries[Number(indexText)];
        const target = targets.find((t) => t.id === targetId);
        if (!entry || !target) continue;
        if (target.kind === 'doc') {
          const doc = docs.find((d) => d.id === target.id);
          const record = withKnownRetraction(entry.record, doc?.citation);
          const res = await fetch('/api/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: target.id, citation: record }) });
          if (!res.ok) { failed++; continue; }
          docCount++;
          // Clips taken from this PDF carry the same citation.
          for (const atom of atoms.filter((a) => a.metadata?.documentId === target.id)) {
            const next = withKnownRetraction(entry.record, atom.metadata?.citation);
            const r = await fetch('/api/atoms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: atom.id, citation: next }) });
            if (r.ok) { changes.set(atom.id, next); clipCount++; } else failed++;
          }
        } else {
          const atom = atoms.find((a) => a.id === target.id);
          const next = withKnownRetraction(entry.record, atom?.metadata?.citation);
          const r = await fetch('/api/atoms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: target.id, citation: next }) });
          if (r.ok) { changes.set(target.id, next); clipCount++; } else failed++;
        }
      }
      onApplied(changes);
      setMessage(`Attached ${chosen.length - failed} ${chosen.length - failed === 1 ? 'citation' : 'citations'}: ${docCount} to PDFs, ${clipCount} to clips.${failed ? ` ${failed} failed; try again.` : ''}`);
      setEntries(null);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach the citations.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="import-panel" className="space-y-2 border-b border-[#D9E1EC] dark:border-[#27272A] p-3">
      <p className="text-[11px] text-slate-600 dark:text-zinc-400">
        Import a RIS or BibTeX file (Zotero, Mendeley, EndNote, Google Scholar). Each reference is attached to the PDF or clip it belongs to, found by DOI first, then by title. Nothing is looked up online.
      </p>
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept=".ris,.bib,.bibtex,.txt,text/plain" aria-label="Reference file" data-testid="import-file" onChange={(e) => readFile(e.target.files?.[0])} className="min-w-0 flex-1 text-[11px] text-slate-600 dark:text-zinc-400" />
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setEntries(null); setMessage(''); }}
        rows={3}
        placeholder="Or paste the contents of the file here"
        aria-label="Pasted references"
        className="w-full resize-y rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-2.5 py-2 text-[11px] leading-snug text-[#0F172A] dark:text-zinc-100 outline-none focus:border-[#325FEC]"
      />
      <button type="button" data-testid="import-read" disabled={busy || !text.trim()} onClick={read} className="rounded-lg bg-[#325FEC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A4FCC] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Working…' : 'Read and match'}</button>

      {error && <p role="alert" className="text-[11px] text-red-700 dark:text-red-400">{error}</p>}
      {message && <p data-testid="import-message" className="text-[11px] text-emerald-800 dark:text-emerald-300">{message}</p>}

      {entries && (
        <div data-testid="import-result" className="space-y-2">
          <p className="text-[11px] text-slate-600 dark:text-zinc-400">{summary} {matches.filter((m) => m.status === 'matched').length} matched, {matches.filter((m) => m.status === 'ambiguous').length} to pick, {matches.filter((m) => m.status === 'unmatched').length} not matched.</p>
          <ul className="space-y-1.5">
            {entries.map((entry, i) => {
              const m = matches[i];
              const options = m.status === 'matched' || m.status === 'ambiguous' ? m.candidates : targets;
              const selectedTarget = targets.find((t) => t.id === choice[i]);
              return (
                <li key={i} data-testid="import-entry" data-status={m.status} className="rounded border border-[#D9E1EC] dark:border-[#27272A] px-2 py-1.5 text-[11px] leading-snug">
                  <span className="block font-medium text-[#0F172A] dark:text-zinc-200">{label(entry.record)}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-zinc-500">{[entry.record.journal ?? entry.record.sourceType.replace('_', ' '), normalizeDoi(entry.record.doi) ? `doi:${normalizeDoi(entry.record.doi)}` : 'no DOI'].join(' · ')}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-600 dark:text-zinc-400">
                    {m.status === 'matched' && `Matched by ${m.how === 'doi' ? 'DOI' : 'title'}${m.how === 'title' ? '. Check it is the same paper.' : '.'}`}
                    {m.status === 'ambiguous' && `Fits ${m.candidates.length} items by ${m.how === 'doi' ? 'DOI' : 'title'}. Pick one.`}
                    {m.status === 'unmatched' && 'Not matched. Pick the PDF or clip it belongs to, or leave it out.'}
                  </span>
                  <select
                    aria-label={`Attach "${entry.record.title ?? 'reference'}" to`}
                    value={choice[i] ?? ''}
                    onChange={(e) => setChoice((c) => ({ ...c, [i]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-1.5 py-1 text-[11px] text-slate-700 dark:text-zinc-300"
                  >
                    <option value="">Do not attach</option>
                    {options.map((t) => <option key={t.id} value={t.id}>{t.kind === 'doc' ? 'PDF' : 'Clip'}: {t.title.slice(0, 70)}{t.hasCitation ? ' (has a citation)' : ''}</option>)}
                  </select>
                  {selectedTarget?.hasCitation && <span className="mt-0.5 block text-[10px] text-amber-800 dark:text-amber-300">This replaces the citation it has now. A known retraction is kept.</span>}
                </li>
              );
            })}
          </ul>
          <button type="button" data-testid="import-apply" disabled={busy || chosen.length === 0} onClick={apply} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
            Attach {chosen.length} {chosen.length === 1 ? 'citation' : 'citations'}
          </button>
        </div>
      )}
    </div>
  );
}
