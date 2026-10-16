// Retraction and correction status of a published paper. Pure: the caller does the HTTP
// requests (see checkStatus in lookup.ts) and passes the parsed bodies in.
// Evidence: docs/RETRACTION_MECHANICS_RESEARCH.md. Ids and names below were checked live on 2026-10-17.
//
// - Crossref, on the ORIGINAL paper, updated-by: retraction, withdrawal, removal, partial_retraction,
//   expression_of_concern, correction, corrigendum, erratum. A work with update-to pointing at ANOTHER
//   DOI is itself a notice. update-to pointing at its own DOI (type removal) is the removed paper.
// - PubMed efetch XML, on the ORIGINAL paper: CommentsCorrections RefType RetractionIn,
//   ExpressionOfConcernIn, ErratumIn, RetractedandRepublishedIn, CorrectedandRepublishedIn;
//   publication type D016441 "Retracted Publication". On a NOTICE: D016440 "Retraction Notice" or
//   D000075742 "Expression of Concern", RefType RetractionOf / ExpressionOfConcernFor / ErratumFor.
// - OpenAlex: is_retracted. It is also true on retraction notices, so type "retraction" means notice.
// "none_found" never means the paper is fine; no database lists every retraction.

import type { RetractionHealth, RetractionState, StatusSource } from '../health/types.ts';

export interface CrossrefNotice {
  DOI?: string;
  type?: string;
  updated?: { 'date-parts'?: number[][] };
}

export interface CrossrefWorkStatus {
  DOI?: string;
  'updated-by'?: CrossrefNotice[];
  'update-to'?: CrossrefNotice[];
}

export interface OpenAlexWorkStatus {
  type?: string;
  is_retracted?: boolean;
}

export interface StatusFinding {
  state: RetractionState;
  noticeDoi?: string;
  detail?: string;
  source?: StatusSource;
  replaced?: boolean;
}

// Worst first. unknown is not in the list: it only wins when nothing was learned.
const SEVERITY: RetractionState[] = ['retracted', 'removed', 'concern', 'corrected', 'notice', 'none_found'];

const CROSSREF_STATE: Record<string, RetractionState> = {
  retraction: 'retracted',
  withdrawal: 'retracted',
  removal: 'removed',
  partial_retraction: 'concern',
  expression_of_concern: 'concern',
  correction: 'corrected',
  corrigendum: 'corrected',
  erratum: 'corrected',
};

const PUBMED_REF_STATE: Record<string, RetractionState> = {
  RetractionIn: 'retracted',
  RetractedandRepublishedIn: 'retracted',
  ExpressionOfConcernIn: 'concern',
  ErratumIn: 'corrected',
  CorrectedandRepublishedIn: 'corrected',
};

const PUBMED_NOTICE_REFS = ['RetractionOf', 'ExpressionOfConcernFor', 'ErratumFor'];
const PUBMED_NOTICE_TYPES = ['D016440', 'D000075742']; // Retraction Notice, Expression of Concern
const REPLACED = ['RetractedandRepublishedIn', 'CorrectedandRepublishedIn'];
const REPUBLISHED_VERSION = ['RetractedandRepublishedFrom', 'CorrectedandRepublishedFrom'];

type Problem = Exclude<RetractionState, 'none_found' | 'notice' | 'unknown'>;

const DETAIL: Record<Problem, string> = {
  retracted: 'This paper has been retracted. Do not cite it as valid evidence.',
  removed: 'The publisher removed this paper. Do not cite it.',
  concern: 'The publisher has raised an expression of concern about this paper.',
  corrected: 'A correction has been published for this paper. Check what changed before you cite it.',
};
const REPLACED_NOTE = ' A newer version was published; cite that version.';
const VERSION_DETAIL = 'This is the republished version of a paper that was retracted or corrected. Cite this version, not the original.';

export const worst = (a: RetractionState, b: RetractionState): RetractionState => {
  const rank = (s: RetractionState) => (s === 'unknown' ? SEVERITY.length : SEVERITY.indexOf(s));
  return rank(a) <= rank(b) ? a : b;
};

function dateOf(notice: CrossrefNotice): string | undefined {
  const [y, m, d] = notice.updated?.['date-parts']?.[0] ?? [];
  if (!y) return undefined;
  return [y, m, d].filter((p) => p !== undefined).map((p, i) => (i === 0 ? String(p) : String(p).padStart(2, '0'))).join('-');
}

const noIssue = (source: StatusSource): StatusFinding => ({ state: 'none_found', source });

// updated-by of a Crossref work. No entries, or only harmless types, means none_found.
export function classifyCrossrefNotices(updatedBy: CrossrefNotice[] | undefined): StatusFinding {
  let state: RetractionState = 'none_found';
  let chosen: CrossrefNotice | undefined;
  for (const notice of updatedBy ?? []) {
    const next = CROSSREF_STATE[notice.type ?? ''];
    if (!next) continue; // other update types (new version, addendum) are not a problem
    if (worst(state, next) === next && next !== state) {
      state = next;
      chosen = notice;
    }
  }
  if (state === 'none_found') return noIssue('crossref');
  const finding: StatusFinding = { state, detail: DETAIL[state as Problem], source: 'crossref' };
  if (chosen?.DOI) finding.noticeDoi = chosen.DOI;
  const when = chosen && dateOf(chosen);
  if (when) finding.detail = `${finding.detail} Notice dated ${when}.`;
  return finding;
}

// A whole Crossref work: problems from updated-by first, then "is this item a notice?".
export function classifyCrossrefWork(work: CrossrefWorkStatus): StatusFinding {
  const found = classifyCrossrefNotices(work['updated-by']);
  if (found.state !== 'none_found') return found;
  const own = work.DOI?.toLowerCase();
  const target = (work['update-to'] ?? []).find((u) => u.DOI && u.DOI.toLowerCase() !== own && CROSSREF_STATE[u.type ?? '']);
  if (target) {
    return { state: 'notice', noticeDoi: target.DOI, source: 'crossref', detail: `This is a ${(target.type ?? 'notice').replace(/_/g, ' ')} notice for another paper (${target.DOI}), not the paper itself.` };
  }
  return found;
}

// efetch (retmode=xml) of one PubMed record.
export function classifyPubmedXml(xml: string): StatusFinding {
  const refTypes = [...xml.matchAll(/<CommentsCorrections RefType="([^"]+)"/g)].map((m) => m[1]);
  const types = [...xml.matchAll(/<PublicationType UI="([^"]+)"/g)].map((m) => m[1]);

  let state: RetractionState = 'none_found';
  for (const ref of refTypes) {
    const next = PUBMED_REF_STATE[ref];
    if (next) state = worst(state, next);
  }
  if (types.includes('D016441')) state = 'retracted';
  const replaced = refTypes.some((r) => REPLACED.includes(r));

  if (state !== 'none_found') {
    return { state, detail: DETAIL[state as Problem] + (replaced ? REPLACED_NOTE : ''), source: 'pubmed', ...(replaced ? { replaced } : {}) };
  }
  if (refTypes.some((r) => REPUBLISHED_VERSION.includes(r))) {
    return { state: 'none_found', detail: VERSION_DETAIL, source: 'pubmed' };
  }
  if (types.some((t) => PUBMED_NOTICE_TYPES.includes(t)) || refTypes.some((r) => PUBMED_NOTICE_REFS.includes(r))) {
    return { state: 'notice', detail: 'This is a retraction, correction or concern notice for another paper, not the paper itself.', source: 'pubmed' };
  }
  return noIssue('pubmed');
}

// OpenAlex work with select=type,is_retracted.
export function classifyOpenAlex(work: OpenAlexWorkStatus | null | undefined): StatusFinding | null {
  if (!work || typeof work.is_retracted !== 'boolean') return null;
  if (work.type === 'retraction') {
    return { state: 'notice', detail: 'This is a retraction notice for another paper, not the paper itself.', source: 'openalex' };
  }
  if (work.is_retracted) return { state: 'retracted', detail: DETAIL.retracted, source: 'openalex' };
  return noIssue('openalex');
}

// Key order is the display order.
const SOURCE_NAME: Record<StatusSource, string> = { crossref: 'Crossref', openalex: 'OpenAlex', pubmed: 'PubMed' };

// Plain-language line for the "nothing found" case. Names the sources and the date.
export function describeNoIssue(sources: StatusSource[], checkedAtIso: string): string {
  const names = (Object.keys(SOURCE_NAME) as StatusSource[]).filter((s) => sources.includes(s)).map((s) => SOURCE_NAME[s]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `No retraction, correction or concern found in ${list} on ${checkedAtIso.slice(0, 10)}. This does not prove the paper is sound.`;
}

// Combines what each source said. A problem from any source wins; none_found needs at least one
// source that answered; unknown means nothing answered, never "assume fine".
export function mergeFindings(findings: StatusFinding[]): StatusFinding & { sources: StatusSource[] } {
  const sources = [...new Set(findings.map((f) => f.source).filter((s): s is StatusSource => !!s))];
  if (findings.length === 0) return { state: 'unknown', detail: 'The check could not run. Try again later.', sources };
  let best = findings[0];
  for (const f of findings.slice(1)) {
    if (worst(best.state, f.state) === f.state && f.state !== best.state) best = f;
  }
  const replaced = findings.some((f) => f.replaced);
  return { ...best, ...(replaced ? { replaced } : {}), sources };
}

export type { RetractionHealth };
