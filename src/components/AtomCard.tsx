'use client';

import React, { useState, useMemo } from 'react';
import { 
  Quotes, 
  LinkSimple, 
  Code, 
  Image as ImageIcon, 
  ArrowSquareOut, 
  Copy, 
  Check, 
  Trash, 
  FileText, 
  Tag,
  BookOpen,
  CaretDown,
  CaretUp,
  ShieldCheck,
  ArrowsClockwise,
  ArrowLeft,
  X
} from '@phosphor-icons/react';
import { ResearchAtom } from '@/lib/types/research';
import { buildDeepLink } from '@/lib/utils/textFragments';
import { BlockAtomCard } from './BlockAtomCard';
import { ImageAtomCard } from './ImageAtomCard';
import { FormattedAIMessage } from './FormattedAIMessage';
import type { CitationRecord } from '@/lib/citations/types.ts';
import { buildWebCitation, refreshWebCitation } from '@/lib/citations/webCitation.ts';
import { assessCitation, readConfidence } from '@/lib/citations/verify.ts';
import { formatCitationFacts } from '@/lib/citations/facts.ts';
import {
  candidateLabel,
  formatCitationLine,
  parseIdentifier,
  reasonMessage,
  resolveCitation,
  saveCitation,
  searchCitations,
} from '@/lib/citations/client.ts';

interface AtomCardProps {
  atom: ResearchAtom;
  viewMode?: 'clean' | 'detailed';
  searchQuery?: string;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onTagClick?: (tag: string) => void;
  onOpenPdfReader?: (docId?: string, pageNumber?: number, text?: string) => void;
}

import { semanticHighlight } from '@/lib/utils/semanticHighlight';
import { renderRichText } from '@/lib/utils/richTextRenderer';

export function getAtomHighlightText(atom: ResearchAtom): string {
  if (atom.metadata?.citationQuote) return atom.metadata.citationQuote;
  if (atom.metadata?.quote) return atom.metadata.quote;
  if (atom.metadata?.selectedText) return atom.metadata.selectedText;
  if (atom.content?.rawText) return atom.content.rawText;
  if (atom.content?.text) return atom.content.text;
  if (atom.content?.ocrText) return atom.content.ocrText;

  if (atom.type === 'note') {
    const text = atom.content?.markdownContent || atom.content?.description || '';
    const quoteMatch = text.match(/>\s*["“]?([^"\n”]+)["”]?(?:\n|$)/);
    if (quoteMatch && quoteMatch[1]?.trim().length > 3) {
      return quoteMatch[1].trim();
    }
    if (atom.title && atom.title !== 'AI Answer' && atom.title !== 'Untitled Note') {
      return atom.title;
    }
    return text.replace(/[#*`_>]/g, ' ').slice(0, 150).trim();
  }

  if (atom.content?.description) return atom.content.description;
  if (atom.title) return atom.title;

  return '';
}

export const AtomCard: React.FC<AtomCardProps> = ({ 
  atom, 
  viewMode = 'detailed',
  searchQuery = '',
  onDelete,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  onTagClick,
  onOpenPdfReader,
}) => {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [tags, setTags] = useState<string[]>(atom.tags || []);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [citation, setCitation] = useState<CitationRecord | undefined>(() => (atom.metadata?.citation ? refreshWebCitation(atom.metadata.citation) : undefined));
  const [citationInput, setCitationInput] = useState<string | null>(null); // null = input closed
  const [citationBusy, setCitationBusy] = useState(false);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [citationCandidates, setCitationCandidates] = useState<CitationRecord[] | null>(null);
  const [citationOpen, setCitationOpen] = useState(false); // the citation panel stays open until closed
  const [citationCopied, setCitationCopied] = useState(false);
  const [citationMismatch, setCitationMismatch] = useState<CitationRecord | null>(null); // a typed or picked source that does not match the clip

  const handleAddTag = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = newTagInput.trim().replace(/^#+/, '');
    if (!clean) {
      setIsAddingTag(false);
      setNewTagInput('');
      return;
    }
    if (tags.includes(clean)) {
      setIsAddingTag(false);
      setNewTagInput('');
      return;
    }
    const nextTags = [...tags, clean];
    setTags(nextTags);
    setIsAddingTag(false);
    setNewTagInput('');

    try {
      await fetch('/api/atoms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: atom.id, tags: nextTags }),
      });
    } catch {}
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    try {
      await fetch('/api/atoms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: atom.id, tags: nextTags }),
      });
    } catch {}
  };

  const getSourceHostname = (url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const rawQuote = atom.content.rawText || atom.content.text;
  const isQuoteType = atom.type === 'quote' || atom.type === 'text';
  const rawFragment = atom.metadata?.scrollToTextFragment || atom.metadata?.textFragment;
  const createdAtTime = atom.capturedAt || atom.created_at;

  const isDocAtom = Boolean(
    atom.metadata?.documentType === 'pdf' ||
    typeof atom.metadata?.pageNumber === 'number' ||
    atom.metadata?.documentId ||
    atom.metadata?.sourceUrl?.startsWith('/reader') ||
    atom.content?.targetUrl?.startsWith('/reader')
  );

  const highlightText = getAtomHighlightText(atom);

  // Dynamic W3C Scroll-To-Text Fragment Deep Link for Web Atoms, or reader link for Doc Atoms
  const targetLink = useMemo(() => {
    if (isDocAtom) {
      const docId = atom.metadata?.documentId || (atom as any).documentId || '';
      const pageNum = atom.metadata?.pageNumber || 1;
      return `/reader?doc=${encodeURIComponent(docId)}&page=${pageNum}`;
    }

    const source = atom.metadata?.sourceUrl || atom.content?.targetUrl || atom.metadata?.deepLink;
    if (!source) return '';
    if (source.includes('#:~:text=')) return source;
    if (rawFragment) return buildDeepLink(source, rawFragment);
    if (highlightText) return buildDeepLink(source, undefined, highlightText);
    return source;
  }, [atom, isDocAtom, rawFragment, highlightText]);

  const hasTextFragment = targetLink.includes('#:~:text=') || Boolean(rawFragment) || isDocAtom;

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDocAtom && onOpenPdfReader) {
      e.preventDefault();
      const docId = atom.metadata?.documentId || (atom as any).documentId;
      const pageNum = atom.metadata?.pageNumber || 1;
      onOpenPdfReader(docId, pageNum, highlightText);
      return;
    }

    if (targetLink) {
      if (typeof window !== 'undefined') {
        window.open(targetLink, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleCopyCitation = () => {
    let citation = '';
    const title = atom.metadata?.pageTitle || atom.title || 'Research Source';
    const link = targetLink || atom.metadata?.sourceUrl || '';

    if (isQuoteType && rawQuote) {
      citation = `> "${rawQuote}"\n\n— [${title}](${link})`;
    } else {
      citation = `[${title}](${link})\n${atom.content.description || ''}`;
    }

    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // A failed lookup only sets the error: the saved citation is left unchanged.
  const runCitationLookup = async (ids: { doi?: string; pmid?: string }, userEntered = false) => {
    setCitationBusy(true);
    setCitationError(null);
    try {
      const out = await resolveCitation(ids);
      if (!out.record) {
        setCitationError(reasonMessage(out.reason));
        return;
      }
      await saveCitationRecord(out.record, userEntered);
    } catch (err) {
      setCitationError(err instanceof Error ? err.message : 'Citation lookup failed.');
    } finally {
      setCitationBusy(false);
    }
  };

  const closeCitation = () => {
    setCitationOpen(false);
    setCitationInput(null);
    setCitationCandidates(null);
    setCitationError(null);
  };

  // Back returns to the view before: a pick list goes back to the search box, the
  // search box goes back to the saved citation, and a saved citation collapses.
  // Refresh clears any failed result and reopens the search box.
  const refreshCitation = () => {
    setCitationOpen(true);
    setCitationMismatch(null);
    setCitationCandidates(null);
    setCitationError(null);
    setCitationInput('');
  };

  // The saved citation is never changed by Back.
  const goBack = () => {
    if (citationMismatch) {
      setCitationMismatch(null);
      setCitationError(null);
      if (!citation) closeCitation();
      return;
    }
    if (citationCandidates) {
      setCitationCandidates(null);
      setCitationError(null);
      return;
    }
    setCitationInput(null);
    setCitationError(null);
    if (!citation) closeCitation();
  };

  // Order: identifier from an existing citation, then the page's own identifier
  // read at clip time, then ask the user for one. Also the Refresh action.
  const handleGetCitation = () => {
    setCitationOpen(true);
    const page = atom.metadata?.pageIdentifiers;
    if (citation?.doi) return runCitationLookup({ doi: citation.doi }, citation.enteredByUser);
    if (citation?.pmid) return runCitationLookup({ pmid: citation.pmid }, citation.enteredByUser);
    if (page?.doi) return runCitationLookup({ doi: page.doi });
    if (page?.pmid) return runCitationLookup({ pmid: page.pmid });
    setCitationInput('');
  };

  // A DOI or PMID is looked up directly; anything else is searched as a title.
  const handleCitationSubmit = async () => {
    const text = (citationInput ?? '').trim();
    const ids = parseIdentifier(text);
    if (ids) return runCitationLookup(ids, true);
    if (text.length < 5) {
      setCitationError('Enter a DOI, a PMID or a paper title.');
      return;
    }
    setCitationBusy(true);
    setCitationError(null);
    try {
      const out = await searchCitations(text);
      setCitationCandidates(out.candidates);
      if (out.candidates.length === 0) setCitationError(reasonMessage(out.reason));
    } catch (err) {
      setCitationError(err instanceof Error ? err.message : 'Title search failed.');
    } finally {
      setCitationBusy(false);
    }
  };

  // Saves a record from a lookup, a pick, or the page itself. Every record gets the
  // check against the clip's title first. userEntered is true for a DOI, PMID or title the user typed or picked.
  const saveCitationRecord = async (record: CitationRecord, userEntered = false) => {
    try {
      const checked = assessCitation(record, atom.metadata?.pageInfo?.title || atom.title, { userEntered });
      // A mismatch the user caused is a failed verify: keep the saved citation and show the warning.
      if (userEntered && checked.confidence?.warnings.length) {
        setCitationMismatch(checked);
        setCitationInput(null);
        setCitationCandidates(null);
        setCitationError(null);
        return;
      }
      await saveCitation(atom.id, checked);
      setCitation(checked);
      setCitationCandidates(null);
      setCitationInput(null);
    } catch (err) {
      setCitationError(err instanceof Error ? err.message : 'Could not save the citation.');
    }
  };

  const handleCopyFormattedCitation = () => {
    if (!citation) return;
    navigator.clipboard.writeText(formatCitationLine(citation));
    setCitationCopied(true);
    setTimeout(() => setCitationCopied(false), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(atom.id);
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const formatDate = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const isClean = viewMode === 'clean';

  if (isClean) {
    return (
      <div
        id={`atom-${atom.id}`}
        onClick={() => selectable && onToggleSelect?.(atom.id)}
        className={`group relative bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl px-3.5 py-2.5 transition-colors shadow-xs hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] ${
          isSelected ? 'bg-blue-50/80 dark:bg-[#1C1C20] ring-1 ring-[#325FEC]/40 border-[#325FEC]' : ''
        } ${selectable ? 'cursor-pointer' : ''}`}
      >
        {/* Top Header with Meta & Visible Actions (never overlaps content) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {selectable && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect?.(atom.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-3.5 h-3.5 rounded border-[#CBD5E1] dark:border-[#3F3F46] bg-[#FAFBFD] dark:bg-[#09090B] text-[#325FEC] focus:ring-[#325FEC] cursor-pointer mr-0.5"
              />
            )}
            {atom.metadata?.domainFavicon && (
              <img 
                src={atom.metadata.domainFavicon} 
                alt="" 
                className="w-3.5 h-3.5 rounded-xs flex-shrink-0 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}
            <span className="font-mono text-[10.5px] text-slate-400 dark:text-zinc-500 truncate">
              {getSourceHostname(atom.metadata?.sourceUrl)}
            </span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 flex-shrink-0">
              • {formatDate(createdAtTime)}
            </span>
          </div>

          <div 
            className={`${citationOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center gap-1 text-slate-400 dark:text-zinc-500 flex-shrink-0 transition-opacity`}
            onClick={(e) => e.stopPropagation()}
          >
            {(targetLink || isDocAtom) && (
              <button
                type="button"
                onClick={handleOpenLink}
                className="p-1 rounded text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] hover:bg-[#E4ECF6] dark:hover:bg-[#222226] transition-colors cursor-pointer"
                title={isDocAtom ? `Jump to page ${atom.metadata?.pageNumber || 1} in PDF Reader` : (hasTextFragment ? 'Jump directly to highlighted quote on webpage' : 'Open Link')}
              >
                <ArrowSquareOut size={13} className={hasTextFragment ? 'text-[#325FEC] dark:text-[#518FFF]' : ''} />
              </button>
            )}
            {citationOpen ? (
              <div className="flex items-center gap-0.5 rounded-md bg-[#E4ECF6] dark:bg-[#222226] p-0.5">
                <button
                  type="button"
                  onClick={refreshCitation}
                  disabled={citationBusy}
                  className="p-1 rounded text-[#325FEC] dark:text-[#518FFF] hover:bg-white dark:hover:bg-[#18181B] transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh citation"
                >
                  <ArrowsClockwise size={13} />
                </button>
                <button
                  type="button"
                  onClick={closeCitation}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181B] transition-colors cursor-pointer"
                  title="Close citation"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={citation ? () => setCitationOpen(true) : handleGetCitation}
                disabled={citationBusy}
                className="p-1 rounded text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] hover:bg-[#E4ECF6] dark:hover:bg-[#222226] transition-colors cursor-pointer disabled:opacity-50"
                title={citation ? 'Show citation' : 'Get citation'}
              >
                <BookOpen size={13} />
              </button>
            )}
            <button
              onClick={handleCopyCitation}
              className="p-1 rounded text-slate-400 hover:text-[#0F172A] dark:hover:text-zinc-200 hover:bg-[#E4ECF6] dark:hover:bg-[#222226] transition-colors cursor-pointer"
              title="Copy citation"
            >
              {copied ? <Check size={13} className="text-[#325FEC] dark:text-[#518FFF]" /> : <Copy size={13} />}
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(atom.id)}
                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-[#E4ECF6] dark:hover:bg-[#222226] transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash size={13} />
              </button>
            )}
          </div>
        </div>

        {citationOpen && (
          <div
            className="mt-2 mb-1 rounded-md border border-[#E4ECF6] dark:border-[#27272A] p-2.5 text-[12px] text-slate-700 dark:text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 min-h-[18px]">
              {citationBusy ? (
                <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-zinc-500">Finding a source…</span>
              ) : citation && citationInput === null && !citationCandidates ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${readConfidence(citation).warnings.length ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {citation.status === 'page_tags' ? 'Web page' : citation.status.replace(/_/g, ' ')}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  {citationMismatch ? 'Verify source' : citationCandidates ? 'Choose a match' : 'Find a source'}
                </span>
              )}
            </div>

            {citationMismatch && (
              <div className="mt-1.5 rounded-md bg-[#F4F4F5] dark:bg-[#1F1F23] p-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                <p className="font-medium text-amber-700 dark:text-amber-400">This might not be the source. Please verify.</p>
                <p className="mt-0.5">The source found is "{citationMismatch.title ?? 'untitled'}". {citationMismatch.confidence?.warnings.join(' ')}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    <span>{citation ? 'Back to saved citation' : 'Back'}</span>
                  </button>
                </div>
              </div>
            )}

            {citation && citationInput === null && !citationCandidates && !citationMismatch && (
              <div className="mt-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="leading-relaxed break-words">{formatCitationLine(citation)}</p>
                  <button type="button" onClick={handleCopyFormattedCitation} className="shrink-0 text-[11px] text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] cursor-pointer">
                    {citationCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {readConfidence(citation).warnings.length ? (
                  <div className="mt-2 rounded-md bg-[#F4F4F5] dark:bg-[#1F1F23] p-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <p className="font-medium text-amber-700 dark:text-amber-400">This might not be the source. Please verify.</p>
                    <p className="mt-0.5">{readConfidence(citation).warnings.join(' ')}</p>
                  </div>
                ) : null}
                <div className="mt-1.5 rounded-md bg-[#F4F4F5] dark:bg-[#1F1F23] p-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <p>{formatCitationFacts(citation)}</p>
                  {readConfidence(citation).notes.length ? <p className="mt-0.5">{readConfidence(citation).notes.join(' ')}</p> : null}
                </div>
              </div>
            )}

            {citationInput !== null && !citationCandidates && !citationMismatch && (
              <div className="mt-1.5">
                <div className="flex items-center gap-2">
                  <input
                    value={citationInput}
                    onChange={(e) => setCitationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCitationSubmit();
                    }}
                    placeholder="DOI, PMID or paper title"
                    className="flex-1 min-w-0 bg-transparent border-b border-[#E4ECF6] dark:border-[#27272A] text-[12px] focus:outline-none focus:border-[#325FEC] py-0.5"
                  />
                  <button type="button" disabled={citationBusy} onClick={handleCitationSubmit} className="text-[11px] text-[#325FEC] dark:text-[#518FFF] cursor-pointer disabled:opacity-50">
                    {citationBusy ? 'Looking up…' : 'Look up'}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    <span>{citation ? 'Back to saved citation' : 'Back'}</span>
                  </button>
                  {atom.metadata?.pageInfo?.url && (
                  <button
                    type="button"
                    onClick={() => saveCitationRecord(buildWebCitation(atom.metadata.pageInfo!, new Date().toISOString()))}
                    className="mt-2 text-[11px] text-[#325FEC] dark:text-[#518FFF] hover:opacity-80 cursor-pointer"
                  >
                    Cite this web page instead
                  </button>
                )}
                </div>
              </div>
            )}

            {citationCandidates && citationCandidates.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1">
                <p className="text-[11px] text-slate-500">
                  {citationCandidates.length > 1 ? 'Several matches. Pick the one your clip came from.' : 'Pick the match.'}
                </p>
                {citationCandidates.map((candidate) => (
                  <button
                    key={candidate.doi}
                    type="button"
                    onClick={() => saveCitationRecord(candidate, true)}
                    className="text-left text-[12px] leading-snug p-1.5 rounded hover:bg-[#F4F4F5] dark:hover:bg-[#222226] cursor-pointer"
                  >
                    {candidateLabel(candidate)}
                  </button>
                ))}
              </div>
            )}

            {citationCandidates && citationCandidates.length > 0 && (
              <div className="mt-1.5">
                <button
                    type="button"
                    onClick={goBack}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    <span>Back</span>
                  </button>
              </div>
            )}
            {citationBusy && citationInput === null && <p className="mt-1.5 text-[11px] text-slate-400">Looking up…</p>}
            {citationError && <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">{citationError}</p>}
          </div>
        )}

        {/* Compact Content */}
        <div>
          {isQuoteType && rawQuote && (
            <blockquote className="text-[13px] md:text-[13.5px] leading-relaxed text-slate-800 dark:text-zinc-100 border-l-2 border-[#325FEC] dark:border-[#518FFF] pl-3.5 py-0.5 my-0.5 whitespace-pre-line break-words [&_strong]:font-bold [&_strong]:text-[#0F172A] dark:[&_strong]:text-white">
              "{renderRichText(rawQuote, searchQuery)}"
            </blockquote>
          )}

          {atom.type === 'note' && (
            <div className="text-[13px] text-slate-800 dark:text-zinc-200 leading-relaxed font-sans">
              {atom.title && (
                <h4 className="font-semibold text-[#0F172A] dark:text-white mb-1 text-[13px]">
                  {renderRichText(atom.title, searchQuery)}
                </h4>
              )}
              {atom.content.markdownContent ? (
                <FormattedAIMessage content={atom.content.markdownContent} searchQuery={searchQuery} />
              ) : atom.content.description ? (
                <FormattedAIMessage content={atom.content.description} searchQuery={searchQuery} />
              ) : null}
            </div>
          )}

          {atom.type === 'block' && (
            <BlockAtomCard
              sanitizedHtml={atom.content.sanitizedHtml}
              standaloneHtml={(atom.content as any).standaloneHtml}
              rawText={atom.content.rawText}
              imageUrl={atom.content.imageUrl}
              selector={atom.metadata?.domCssSelector}
              sourceUrl={atom.metadata?.sourceUrl}
              searchQuery={searchQuery}
            />
          )}

          {atom.type === 'image' && (
            <ImageAtomCard
              imageUrl={atom.content.imageUrl}
              description={atom.content.description}
              title={atom.title}
              ocrText={atom.content.ocrText}
              ocrConfidence={atom.content.ocrConfidence}
              searchQuery={searchQuery}
              mode="clean"
            />
          )}

          {atom.type === 'link' && (
            <div className="flex items-center gap-2 text-sm">
              <LinkSimple size={15} className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0" />
              <button
                type="button"
                onClick={handleOpenLink}
                className="text-slate-800 dark:text-zinc-200 hover:text-[#325FEC] dark:hover:text-[#518FFF] hover:underline truncate text-sm text-left cursor-pointer"
              >
                {semanticHighlight(atom.title || targetLink, searchQuery)}
              </button>
            </div>
          )}

          {/* Context Tags in Compact View */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-2 pt-1 border-t border-[#D9E1EC]/40 dark:border-[#27272A]/40">
              {tags.map((t) => (
                <span
                  key={t}
                  onClick={(e) => {
                    if (onTagClick) {
                      e.stopPropagation();
                      onTagClick(t);
                    }
                  }}
                  className="text-[10px] font-medium text-slate-600 dark:text-zinc-400 bg-[#EEF3F8] dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] px-1.5 py-0.5 rounded-md cursor-pointer hover:border-slate-400 dark:hover:border-zinc-600"
                >
                  {semanticHighlight(t.replace(/^#+/, ''), searchQuery)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <article
      id={`atom-${atom.id}`}
      onClick={() => selectable && onToggleSelect?.(atom.id)}
      className={`group relative bg-[#FAFBFD] dark:bg-[#121214] border rounded-2xl p-6 md:p-7 transition-all shadow-xs ${
        isSelected
          ? 'border-[#325FEC] dark:border-[#518FFF] ring-2 ring-[#325FEC]/20 dark:ring-[#518FFF]/20 bg-blue-50/20 dark:bg-[#18181B]'
          : 'border-[#D2DCEA] dark:border-[#27272A] hover:border-[#CBD5E1] dark:hover:border-[#3F3F46]'
      } ${selectable ? 'cursor-pointer' : ''}`}
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {selectable && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(atom.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-[#CBD5E1] dark:border-[#3F3F46] bg-[#FAFBFD] dark:bg-[#09090B] text-[#325FEC] focus:ring-[#325FEC] cursor-pointer mr-1"
            />
          )}
          {atom.metadata?.domainFavicon ? (
            <img 
              src={atom.metadata.domainFavicon} 
              alt="" 
              className="w-4 h-4 rounded-sm flex-shrink-0 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}
          <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 truncate font-medium">
            {getSourceHostname(atom.metadata?.sourceUrl)}
          </span>
          <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500 flex-shrink-0">
            • {formatDate(createdAtTime)}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isQuoteType && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
              title="Locally cached and verified. If the live webpage mutates, your quote and surrounding context remain permanently preserved."
            >
              <ShieldCheck size={11} weight="bold" />
              <span>Verified Snapshot</span>
            </span>
          )}
          {typeof atom.similarity === 'number' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#EEF3F8] dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] border border-[#D9E1EC] dark:border-[#27272A]">
              {Math.round(atom.similarity * 100)}% match
            </span>
          )}
          {isDocAtom ? (
            <button
              type="button"
              data-testid="timeline-source-link"
              onClick={handleOpenLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40 shadow-xs transition-colors cursor-pointer"
              title={`Jump to page ${atom.metadata?.pageNumber || 1} in PDF Reader`}
            >
              <FileText size={12} weight="bold" className="text-blue-600 dark:text-blue-400" />
              <span>PDF · p. {atom.metadata?.pageNumber || 1}</span>
            </button>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold border ${
              isQuoteType ? 'bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/40' :
              atom.type === 'block' ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/40' :
              atom.type === 'image' ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40' :
              atom.type === 'link' ? 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-900/40' :
              'bg-purple-50/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-900/40'
            }`}>
              {isQuoteType && <Quotes size={12} className="text-blue-600 dark:text-blue-400" weight="fill" />}
              {atom.type === 'link' && <LinkSimple size={12} className="text-sky-600 dark:text-sky-400" />}
              {atom.type === 'block' && <Code size={12} className="text-emerald-600 dark:text-emerald-400" />}
              {atom.type === 'image' && <ImageIcon size={12} className="text-amber-600 dark:text-amber-400" />}
              {atom.type === 'note' && <FileText size={12} className="text-purple-600 dark:text-purple-400" />}
              <span className="capitalize">{atom.type}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-3">
        {isQuoteType && rawQuote && (
          <div className="space-y-2">
            <blockquote className="text-[13.5px] leading-relaxed text-[#0F172A] dark:text-[#E4E4E7] border-l-2 border-[#325FEC] dark:border-[#518FFF] pl-4 py-0.5 my-1 whitespace-pre-line break-words [&_strong]:font-bold [&_strong]:text-[#0F172A] dark:[&_strong]:text-white">
              "{renderRichText(rawQuote, searchQuery)}"
            </blockquote>

            {/* Context Re-Builder Toggle */}
            <div className="pt-0.5 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsContextExpanded(!isContextExpanded);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium text-slate-600 dark:text-zinc-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] transition-all cursor-pointer select-none"
              >
                <BookOpen size={13} className="text-slate-500 dark:text-zinc-400" />
                <span>{isContextExpanded ? 'Hide Surrounding Context' : 'Expand Surrounding Context'}</span>
                {isContextExpanded ? <CaretUp size={11} /> : <CaretDown size={11} />}
              </button>
            </div>

            {/* Context Re-Builder View */}
            {isContextExpanded && (
              <div 
                className="p-4 rounded-xl bg-[#EEF3F8]/90 dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] text-xs space-y-3 animate-fadeIn font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#D9E1EC] dark:border-[#27272A] text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300">
                    <BookOpen size={13} className="text-slate-500 dark:text-zinc-400" />
                    <span>{atom.metadata?.sectionHeading || 'Source Section'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                    <ShieldCheck size={12} weight="bold" />
                    <span>Permanent Offline Snapshot</span>
                  </span>
                </div>

                {/* Source Drift Protection Notice */}
                <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
                  <ShieldCheck size={14} className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0 mt-0.5" weight="fill" />
                  <p className="leading-relaxed">
                    <strong>Source Drift Protection:</strong> Captured verbatim on {formatDate(createdAtTime)}. If the live webpage mutates, updates copy, or breaks text-fragment highlighting, your evidence and citation remain permanently preserved here.
                  </p>
                </div>

                {/* Preceding Context */}
                {(atom.metadata?.contextPrefix || (atom.metadata?.surroundingParagraphs && atom.metadata.surroundingParagraphs.length > 1 && atom.metadata.surroundingParagraphs[0] !== rawQuote)) && (
                  <p className="text-slate-500 dark:text-zinc-400 italic leading-relaxed text-[12px] pl-3 border-l-2 border-slate-300 dark:border-zinc-700">
                    … {atom.metadata?.contextPrefix || atom.metadata?.surroundingParagraphs?.[0]}
                  </p>
                )}

                {/* Captured Excerpt Focus */}
                <div className="p-3.5 rounded-lg bg-[#FAFBFD] dark:bg-[#18181B] border-l-3 border-[#325FEC] dark:border-[#518FFF] border-t border-r border-b border-[#D9E1EC] dark:border-[#27272A] text-slate-900 dark:text-zinc-100 font-medium leading-relaxed shadow-xs text-[13px] whitespace-pre-line break-words [&_strong]:font-bold [&_strong]:text-[#0F172A] dark:[&_strong]:text-white">
                  <span className="text-[10px] font-mono uppercase text-[#325FEC] dark:text-[#518FFF] block font-bold mb-1">
                    Captured Excerpt
                  </span>
                  "{renderRichText(rawQuote, searchQuery)}"
                </div>

                {/* Following Context */}
                {(atom.metadata?.contextSuffix || (atom.metadata?.surroundingParagraphs && atom.metadata.surroundingParagraphs.length > 2 && atom.metadata.surroundingParagraphs[atom.metadata.surroundingParagraphs.length - 1] !== rawQuote)) && (
                  <p className="text-slate-500 dark:text-zinc-400 italic leading-relaxed text-[12px] pl-3 border-l-2 border-slate-300 dark:border-zinc-700">
                    {atom.metadata?.contextSuffix || atom.metadata?.surroundingParagraphs?.[atom.metadata.surroundingParagraphs.length - 1]} …
                  </p>
                )}

                {(targetLink || isDocAtom) && (
                  <div className="pt-2 flex items-center justify-between border-t border-[#D9E1EC]/60 dark:border-[#27272A] text-[11px]">
                    <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">
                      Source: {getSourceHostname(atom.metadata?.sourceUrl)}
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenLink}
                      className="inline-flex items-center gap-1 text-[#325FEC] dark:text-[#518FFF] hover:underline font-medium cursor-pointer"
                    >
                      <span>{isDocAtom ? 'Jump to exact passage in Reader' : 'Jump to exact paragraph in source'}</span>
                      <ArrowSquareOut size={11} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {atom.type === 'block' && (
          <BlockAtomCard
            sanitizedHtml={atom.content.sanitizedHtml}
            standaloneHtml={(atom.content as any).standaloneHtml}
            rawText={atom.content.rawText}
            imageUrl={atom.content.imageUrl}
            selector={atom.metadata?.domCssSelector}
            sourceUrl={atom.metadata?.sourceUrl}
            searchQuery={searchQuery}
          />
        )}

        {atom.type === 'image' && (
          <ImageAtomCard
            imageUrl={atom.content.imageUrl}
            description={atom.content.description}
            title={atom.title}
            ocrText={atom.content.ocrText}
            ocrConfidence={atom.content.ocrConfidence}
            searchQuery={searchQuery}
            mode="detailed"
          />
        )}

        {atom.type === 'note' && (
          <div className="space-y-2.5 font-sans">
            {atom.title && (
              <h3 className="text-base md:text-lg font-display font-bold text-[#0F172A] dark:text-[#FAFAFA]">
                {renderRichText(atom.title, searchQuery)}
              </h3>
            )}
            {atom.content.markdownContent ? (
              <FormattedAIMessage content={atom.content.markdownContent} searchQuery={searchQuery} />
            ) : atom.content.description ? (
              <FormattedAIMessage content={atom.content.description} searchQuery={searchQuery} />
            ) : null}
          </div>
        )}

        {atom.title && !isQuoteType && atom.type !== 'note' && (
          <h3 className="text-sm md:text-base font-display font-semibold text-[#0F172A] dark:text-[#FAFAFA] line-clamp-2">
            {semanticHighlight(atom.title, searchQuery)}
          </h3>
        )}

        {atom.content.description && atom.type !== 'image' && atom.type !== 'note' && (
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans whitespace-pre-line">
            {semanticHighlight(atom.content.description, searchQuery)}
          </p>
        )}

        {atom.metadata?.domCssSelector && atom.type !== 'block' && (
          <div>
            <span className="inline-block font-mono text-[10px] text-slate-500 dark:text-zinc-400 bg-[#EEF3F8] dark:bg-[#18181B] px-2 py-0.5 rounded border border-[#D9E1EC] dark:border-[#27272A] truncate max-w-full">
              {atom.metadata.domCssSelector}
            </span>
          </div>
        )}

        {/* Tags and Right-Aligned Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-[#D9E1EC]/60 dark:border-[#27272A]">
          {/* Tags on Left */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="group/tag inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans text-slate-700 dark:text-zinc-300 bg-[#EEF3F8] dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] transition-colors hover:border-slate-300 dark:hover:border-zinc-600"
              >
                <span
                  onClick={(e) => {
                    if (onTagClick) {
                      e.stopPropagation();
                      onTagClick(t);
                    }
                  }}
                  className={onTagClick ? 'cursor-pointer hover:text-[#325FEC] dark:hover:text-[#518FFF]' : ''}
                  title={onTagClick ? `Filter by ${t}` : undefined}
                >
                  {semanticHighlight(t.replace(/^#+/, ''), searchQuery)}
                </span>
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="opacity-0 group-hover/tag:opacity-100 text-slate-400 hover:text-red-500 transition-opacity ml-0.5 leading-none"
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <form onSubmit={handleAddTag} className="inline-flex items-center">
                <input
                  type="text"
                  autoFocus
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onBlur={() => handleAddTag()}
                  placeholder="tag..."
                  className="w-24 px-2 py-0.5 rounded text-xs font-sans bg-[#EEF3F8] dark:bg-[#18181B] border border-[#325FEC] text-[#0F172A] dark:text-zinc-100 outline-none"
                />
              </form>
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-zinc-200 border border-dashed border-[#CBD5E1] dark:border-[#3F3F46] hover:border-slate-400 transition-colors"
                title="Add tag"
              >
                <Tag size={11} />
                <span>+ tag</span>
              </button>
            )}
          </div>

          {/* Actions on Right */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
            {isDocAtom && (
              <button
                type="button"
                data-testid="timeline-source-link"
                onClick={handleOpenLink}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-[#325FEC] dark:text-[#518FFF] bg-[#518FFF]/10 hover:bg-[#518FFF]/20 border border-[#518FFF]/30 transition-colors cursor-pointer"
                title={`Open page ${atom.metadata?.pageNumber || 1} in PDF Reader`}
              >
                <BookOpen size={13} weight="bold" />
                <span>Open in Reader</span>
              </button>
            )}

            {(targetLink || isDocAtom) && (
              <button
                type="button"
                onClick={handleOpenLink}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-700 dark:text-zinc-200 bg-[#EEF3F8] dark:bg-[#18181B] hover:bg-[#E4ECF6] dark:hover:bg-[#222226] border border-[#D9E1EC] dark:border-[#27272A] transition-colors cursor-pointer"
                title={isDocAtom ? `Jump to page ${atom.metadata?.pageNumber || 1} in PDF Reader` : (hasTextFragment ? 'Jump directly to highlighted quote on webpage' : 'Open source page')}
              >
                <ArrowSquareOut size={13} className={hasTextFragment ? 'text-[#325FEC] dark:text-[#518FFF]' : 'text-slate-400'} />
                <span>{isDocAtom ? 'Jump to Page' : (hasTextFragment ? 'Jump to Quote' : 'Open Link')}</span>
              </button>
            )}

            <button
              onClick={handleCopyCitation}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-zinc-200 bg-[#EEF3F8] dark:bg-[#18181B] hover:bg-[#E4ECF6] dark:hover:bg-[#222226] border border-[#D9E1EC] dark:border-[#27272A] transition-colors"
              title="Copy citation"
            >
              {copied ? <Check size={13} className="text-[#325FEC] dark:text-[#518FFF]" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Cite'}</span>
            </button>

            {/* Delete button */}
            {onDelete && (
              <div className="relative">
                {showConfirmDelete ? (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-900/50 shadow-xs animate-fadeIn">
                    <span className="text-[10px] text-red-700 dark:text-red-300 font-mono font-medium">Delete?</span>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={deleting}
                      className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      {deleting ? '...' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-1 py-0.5 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white font-mono text-[10px] cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                    title="Delete clip"
                  >
                    <Trash size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
