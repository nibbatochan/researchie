// The shape of a PDF research report. Two modules share it and nothing else:
//   buildReportModel (pdfReport.ts)  turns a project and its clips into a ReportModel
//   ReportDocument   (ReportDocument.ts) draws a ReportModel as a PDF
// Keep this file free of imports from React or the app so both can load it in Node tests.

/** Citation style used for the bibliography. Same keys as the citation copy tabs. */
export type ReportCitationStyle = 'line' | 'apa' | 'ama';

export const REPORT_STYLE_LABELS: Record<ReportCitationStyle, string> = {
  line: 'Vancouver',
  apa: 'APA 7',
  ama: 'AMA 11',
};

export type ReportSectionKey = 'syntheses' | 'quotes' | 'blocks' | 'images' | 'links';

export interface ReportOptions {
  /** Which sections to include. A section with no clips is left out either way. */
  sections: Record<ReportSectionKey, boolean> & { bibliography: boolean };
  citationStyle: ReportCitationStyle;
  /** The user's own notes on each clip. */
  includeNotes: boolean;
  /** Embed images. When false, an image clip shows its title, OCR text and source only. */
  includeImages: boolean;
  /** Show verification flags: retracted, verify source, could not be checked. */
  includeFlags: boolean;
  /** ISO 8601 time the report was made. Passed in so tests are repeatable. */
  generatedAt: string;
}

export const DEFAULT_REPORT_OPTIONS: Omit<ReportOptions, 'generatedAt'> = {
  sections: { syntheses: true, quotes: true, blocks: true, images: true, links: true, bibliography: true },
  citationStyle: 'line',
  includeNotes: true,
  includeImages: true,
  includeFlags: true,
};

/**
 * A warning about a source. The colour comes from the design system:
 *   retracted, verify  -> Warning amber
 *   unchecked          -> Destructive/Error red (the lookup failed, so nothing is known)
 */
export interface ReportFlag {
  kind: 'retracted' | 'verify' | 'unchecked';
  text: string;
}

/** How trustworthy the source's citation is, for the badge next to a bibliography entry. */
export type SourceStatus = 'verified' | 'web' | 'manual' | 'unchecked';

export interface ReportItem {
  id: string;
  kind: 'note' | 'quote' | 'block' | 'image' | 'link';
  title: string;
  /** Plain text, paragraphs separated by a blank line. Markdown marks are already removed. */
  body: string;
  /** True for AI-generated notes and saved assistant answers (drawn with the AI purple). */
  isAi: boolean;
  /** Where it came from: a site or document name, with an optional page and link. */
  source?: { label: string; url?: string; page?: number };
  /** ISO 8601 time the clip was captured. */
  capturedAt?: string;
  /** 1-based number of this clip's source in the bibliography. */
  citationNumber?: number;
  tags: string[];
  /** The user's own notes, when includeNotes is on. */
  notes?: string;
  flags: ReportFlag[];
  /** Image clips: a data URL or an http(s) URL. Absent when images are off. */
  imageUrl?: string;
  ocrText?: string;
  /** Link back to the exact passage on the page (text fragment), when there is one. */
  deepLink?: string;
}

export interface ReportSection {
  key: ReportSectionKey;
  title: string;
  items: ReportItem[];
}

export interface BibliographyEntry {
  number: number;
  /** The reference in the chosen style, plain text. */
  text: string;
  /** Link for the DOI or URL, used to make the entry clickable. */
  href?: string;
  status: SourceStatus;
  flags: ReportFlag[];
  /** Ids of the clips that cite this source. */
  citedBy: string[];
}

export interface ReportModel {
  cover: {
    title: string;
    description: string;
    generatedAt: string;
    clipCount: number;
    sourceCount: number;
    styleLabel: string;
  };
  sections: ReportSection[];
  /** Empty when the bibliography option is off or no clip has a citation. */
  bibliography: BibliographyEntry[];
  options: ReportOptions;
}
