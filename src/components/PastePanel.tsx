'use client';

import React, { useState } from 'react';
import {
  matchPaste, quoteClips, textClip, PASTE_SOURCES,
  type NewClip, type PasteDoc, type PasteResult, type PasteSource,
} from '@/lib/paper/pasteMatch';

interface Props {
  projectId: string;
  onCreate: (clip: NewClip) => void;
}

async function loadDocs(projectId: string): Promise<PasteDoc[]> {
  const res = await fetch(`/api/documents?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !Array.isArray(json.data)) throw new Error('Could not read the PDFs in this project.');
  return json.data.map((d: any) => ({
    id: d.id,
    title: d.title || d.filename || 'Untitled PDF',
    filename: d.filename,
    totalPages: d.totalPages,
    citation: d.citation,
    pages: Array.isArray(d.pages) ? d.pages.map((p: any) => ({ pageNumber: p.pageNumber, content: String(p.content ?? '') })) : [],
  }));
}

/** Paste text from NotebookLM, Zotero or anywhere. Only words found word for word in a PDF become a Quote. */
export function PastePanel({ projectId, onCreate }: Props) {
  const [source, setSource] = useState<PasteSource>('notebooklm');
  const [text, setText] = useState('');
  const [docs, setDocs] = useState<PasteDoc[] | null>(null);
  const [result, setResult] = useState<PasteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const check = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const list = await loadDocs(projectId);
      setDocs(list);
      setResult(matchPaste(text, list));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check the text.');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const reset = (note: string) => {
    setText('');
    setResult(null);
    setMessage(note);
  };

  const saveQuotes = () => {
    if (!result || !docs) return;
    const clips = quoteClips(result, projectId, docs);
    clips.forEach(onCreate);
    reset(`Saved ${clips.length} ${clips.length === 1 ? 'Quote' : 'Quotes'} with page and citation. They are in "Clips not placed yet".`);
  };

  const saveText = (kind: 'ai-summary' | 'mine') => {
    if (!result) return;
    onCreate(textClip(result.cleaned, kind, source, projectId));
    reset(kind === 'mine' ? 'Saved as your own text.' : 'Saved as an AI summary. It can not be quoted or cited until you find the passage in the paper.');
  };

  const total = result?.sentences.length ?? 0;

  return (
    <div data-testid="paste-panel" className="space-y-2 border-b border-[#D9E1EC] dark:border-[#27272A] p-3">
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-slate-600 dark:text-zinc-400" htmlFor="paste-source">Copied from</label>
        <select
          id="paste-source"
          value={source}
          onChange={(e) => setSource(e.target.value as PasteSource)}
          className="rounded-md border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-2 py-1 text-[11px] text-slate-700 dark:text-zinc-300"
        >
          {PASTE_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setResult(null); setMessage(''); }}
        rows={4}
        placeholder="Paste text here. For a quote with a page, paste the passage from the paper itself (in NotebookLM, click the citation number and copy the passage it shows)."
        aria-label="Pasted text"
        className="w-full resize-y rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-2.5 py-2 text-[12px] leading-snug text-[#0F172A] dark:text-zinc-100 outline-none focus:border-[#325FEC]"
      />
      <button
        type="button"
        data-testid="paste-check"
        disabled={busy || !text.trim()}
        onClick={check}
        className="rounded-lg bg-[#325FEC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A4FCC] disabled:cursor-not-allowed disabled:opacity-50"
      >{busy ? 'Checking…' : 'Check against my PDFs'}</button>

      {error && <p role="alert" className="text-[11px] text-red-700 dark:text-red-400">{error}</p>}
      {message && <p data-testid="paste-message" className="text-[11px] text-emerald-800 dark:text-emerald-300">{message}</p>}

      {result && docs && (
        <div data-testid="paste-result" className="space-y-2">
          {docs.length === 0 && (
            <p className="text-[11px] text-amber-800 dark:text-amber-300">This project has no PDFs. Upload the paper in the Document view, and a pasted passage can become a Quote with its page.</p>
          )}
          <p className="text-[11px] text-slate-600 dark:text-zinc-400">
            {result.wholeBlock ? 'The whole passage is word for word in a PDF.' : `${result.foundCount} of ${total} ${total === 1 ? 'sentence is' : 'sentences are'} word for word in your PDFs.`}
          </p>
          <ul className="space-y-1">
            {result.sentences.map((s, i) => (
              <li key={i} data-testid="paste-sentence" data-found={s.hit ? 'true' : 'false'} className={`rounded border px-2 py-1 text-[11px] leading-snug ${s.hit ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-[#D9E1EC] dark:border-[#27272A]'}`}>
                <span className="block text-[#0F172A] dark:text-zinc-200">{s.text}</span>
                <span className="block text-[10px] text-slate-600 dark:text-zinc-400">
                  {s.hit ? `Found: ${s.hit.docTitle}, p. ${s.hit.pageNumber}` : s.similar ? `Not word for word. May be a paraphrase of ${s.similar.docTitle}, p. ${s.similar.pageNumber}. Open the PDF and copy the exact words.` : 'Not found in your PDFs.'}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {result.foundCount > 0 && (
              <button type="button" data-testid="paste-save-quotes" onClick={saveQuotes} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                Save {result.foundCount} as {result.foundCount === 1 ? 'a Quote' : 'Quotes'}
              </button>
            )}
            {!result.wholeBlock && (
              <>
                <button type="button" data-testid="paste-save-ai" onClick={() => saveText('ai-summary')} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-300">Save all as AI summary</button>
                <button type="button" data-testid="paste-save-mine" onClick={() => saveText('mine')} className="rounded-lg border border-[#D9E1EC] dark:border-[#27272A] px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300">Save as my own text</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
