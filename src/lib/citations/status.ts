// Retraction and correction status of a published paper. Pure: the caller does the HTTP
// requests (see checkStatus in lookup.ts) and passes the parsed bodies in.
//
// Notice types below were checked against live records on 2026-10-17:
// - Crossref updated-by on the ORIGINAL paper: retraction, withdrawal, partial_retraction,
//   expression_of_concern, correction, corrigendum, erratum.
// - PubMed efetch XML on the ORIGINAL paper: CommentsCorrections RefType "RetractionIn",
//   "ExpressionOfConcernIn", "ErratumIn"; publication type D016441 "Retracted Publication".
// The notice itself (D000075742 "Expression of Concern", D016440 "Retraction of Publication",
// RefType "...For") is a different record and is not classified as a problem here.

import type { RetractionHealth, RetractionState } from '../health/types.ts';

export interface CrossrefNotice {
  DOI?: string;
  type?: string;
  updated?: { 'date-parts'?: number[][] };
}

// Worst first. unknown is not in the list: it only wins when nothing was learned.
const SEVERITY: RetractionState[] = ['retracted', 'concern', 'corrected', 'clean'];

const CROSSREF_STATE: Record<string, RetractionState> = {
  retraction: 'retracted',
  withdrawal: 'retracted',
  partial_retraction: 'concern',
  expression_of_concern: 'concern',
  correction: 'corrected',
  corrigendum: 'corrected',
  erratum: 'corrected',
};

const PUBMED_REF_STATE: Record<string, RetractionState> = {
  RetractionIn: 'retracted',
  ExpressionOfConcernIn: 'concern',
  ErratumIn: 'corrected',
};

const DETAIL: Record<Exclude<RetractionState, 'unknown'>, string> = {
  retracted: 'This paper has been retracted. Do not cite it as valid evidence.',
  concern: 'The publisher has raised an expression of concern about this paper.',
  corrected: 'A correction has been published for this paper. Check what changed before you cite it.',
  clean: 'No retraction, correction or concern found.',
};

export type StatusFinding = Pick<RetractionHealth, 'state' | 'noticeDoi' | 'detail'>;

export const worst = (a: RetractionState, b: RetractionState): RetractionState => {
  const rank = (s: RetractionState) => (s === 'unknown' ? SEVERITY.length : SEVERITY.indexOf(s));
  return rank(a) <= rank(b) ? a : b;
};

function dateOf(notice: CrossrefNotice): string | undefined {
  const [y, m, d] = notice.updated?.['date-parts']?.[0] ?? [];
  if (!y) return undefined;
  return [y, m, d].filter((p) => p !== undefined).map((p, i) => (i === 0 ? String(p) : String(p).padStart(2, '0'))).join('-');
}

// updated-by of a Crossref work. undefined = the response had no such field to read.
export function classifyCrossrefNotices(updatedBy: CrossrefNotice[] | undefined): StatusFinding {
  let state: RetractionState = 'clean';
  let chosen: CrossrefNotice | undefined;
  for (const notice of updatedBy ?? []) {
    const next = CROSSREF_STATE[notice.type ?? ''];
    if (!next) continue; // other update types (new version, addendum) are not a problem
    if (worst(state, next) === next && next !== state) {
      state = next;
      chosen = notice;
    }
  }
  const finding: StatusFinding = { state, detail: DETAIL[state as Exclude<RetractionState, 'unknown'>] };
  if (chosen?.DOI) finding.noticeDoi = chosen.DOI;
  const when = chosen && dateOf(chosen);
  if (when && state !== 'clean') finding.detail = `${DETAIL[state as Exclude<RetractionState, 'unknown'>]} Notice dated ${when}.`;
  return finding;
}

// efetch (retmode=xml) of one PubMed record.
export function classifyPubmedXml(xml: string): StatusFinding {
  let state: RetractionState = 'clean';
  const refTypes = [...xml.matchAll(/<CommentsCorrections RefType="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refTypes) {
    const next = PUBMED_REF_STATE[ref];
    if (next) state = worst(state, next);
  }
  const types = [...xml.matchAll(/<PublicationType UI="([^"]+)"/g)].map((m) => m[1]);
  if (types.includes('D016441')) state = 'retracted';
  return { state, detail: DETAIL[state as Exclude<RetractionState, 'unknown'>] };
}

// Combines what each source said. A problem from any source wins; clean needs at least one
// source that answered; unknown means nothing answered, never "assume clean".
export function mergeFindings(findings: StatusFinding[]): StatusFinding {
  if (findings.length === 0) return { state: 'unknown', detail: 'The check could not run. Try again later.' };
  let best = findings[0];
  for (const f of findings.slice(1)) {
    if (worst(best.state, f.state) === f.state && f.state !== best.state) best = f;
  }
  return best;
}
