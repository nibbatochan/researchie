// Source health: what we know about whether a clip's source is still sound.
// Stored on ProvenanceMetadata.health. Plan: docs/RESEARCH_AND_BUILD_PLAN.md.

// none_found is NOT "this paper is fine": it means the sources we asked reported nothing.
// notice: the clipped item is itself a retraction/correction/concern notice.
export type RetractionState = 'none_found' | 'retracted' | 'removed' | 'concern' | 'corrected' | 'notice' | 'unknown';

export type StatusSource = 'crossref' | 'openalex' | 'pubmed';

export interface RetractionHealth {
  state: RetractionState;
  checkedAt: string; // ISO 8601
  noticeDoi?: string; // DOI of the notice, when the source gives one
  detail?: string; // plain-language line for the UI
  sources?: StatusSource[]; // the sources that answered this check
  replaced?: boolean; // retracted or corrected AND republished: a newer version exists
}

export type PageState = 'unchanged' | 'changed' | 'moved' | 'gone' | 'unknown';

export interface PageHealth {
  state: PageState;
  checkedAt: string;
  httpStatus?: number;
  finalUrl?: string; // set when 'moved'
  reason?: string; // why 'unknown': blocked, login needed, script-rendered
  missCount?: number; // consecutive misses; 'changed' needs 2
}

export interface SourceHealth {
  checkedAt: string; // last time any check ran for this clip
  retraction?: RetractionHealth;
  page?: PageHealth;
  acknowledgedAt?: string; // the student marked the problem as seen
  acknowledgedState?: string; // re-open the alert if the state later worsens
}
