// The page-by-page wireframe of a template, for the picker's preview and the paper thumbnails. Pure data: which
// blocks sit on which page. Page 1 is the title block, authors, abstract and keywords; then the body pages named in
// PAGE_PLAN; the last page is the reference list. It is a plan of the shape, not journal formatting.
import { getTemplate, type PaperTemplate } from './templates.ts';

export type WireBlock =
  | { kind: 'title' }
  | { kind: 'abstract'; structured: boolean }
  | { kind: 'keywords' }
  | { kind: 'section'; title: string; subs: string[] }
  | { kind: 'refs' }
  | { kind: 'blank' };

export interface WirePage {
  /** Short caption under the page, for example "Page 2: Introduction". */
  caption: string;
  columns: 1 | 2;
  blocks: WireBlock[];
}

/** The main sections on each body page, after page 1 and before the references. */
export const PAGE_PLAN: Record<string, string[][]> = {
  imrad: [['Introduction'], ['Methods'], ['Results'], ['Discussion', 'Conclusion']],
  'systematic-review': [['Introduction'], ['Methods'], ['Results'], ['Discussion', 'Registration and protocol', 'Support, competing interests, availability of data']],
  conference: [['Introduction', 'Related work'], ['Method'], ['Evaluation'], ['Discussion and limitations', 'Conclusion', 'Acknowledgements']],
  'case-report': [['Introduction', 'Patient information'], ['Clinical findings', 'Timeline', 'Diagnostic assessment'], ['Therapeutic interventions', 'Follow-up and outcomes', 'Discussion'], ['Patient perspective', 'Informed consent']],
  'short-communication': [['Introduction', 'Methods'], ['Results and discussion', 'Conclusion']],
  review: [['Introduction'], ['Themes'], ['Discussion', 'Conclusion']],
};

/** Sections that journals usually print in two columns even when the paper is one column elsewhere. */
const TWO_COLUMN_SECTIONS: Record<string, string[]> = {
  imrad: ['Results', 'Discussion'],
  'systematic-review': ['Results', 'Discussion'],
  'short-communication': ['Results and discussion'],
};

const FRONT = new Set(['Abstract', 'Keywords']);
const LAST = 'References';

export function buildWireframe(t: PaperTemplate): WirePage[] {
  if (t.sections.length === 0) {
    return [{ caption: 'Page 1: your own headings', columns: 1, blocks: [{ kind: 'title' }, { kind: 'blank' }] }];
  }
  const subsOf = (title: string): string[] => {
    const i = t.sections.findIndex((s) => s.level === 1 && s.title === title);
    const out: string[] = [];
    for (let j = i + 1; i >= 0 && j < t.sections.length && t.sections[j].level === 2; j++) out.push(t.sections[j].title);
    return out;
  };
  const has = (title: string) => t.sections.some((s) => s.level === 1 && s.title === title);

  const front: WireBlock[] = [{ kind: 'title' }];
  if (has('Abstract')) front.push({ kind: 'abstract', structured: t.abstract === 'structured' });
  if (has('Keywords')) front.push({ kind: 'keywords' });

  const pages: WirePage[] = [{ caption: 'Page 1: title, authors, abstract', columns: 1, blocks: front }];
  (PAGE_PLAN[t.id] ?? []).forEach((titles, i) => {
    const names = titles.filter((n) => has(n));
    if (names.length === 0) return;
    pages.push({
      caption: `Page ${i + 2}: ${names.join(', ')}`,
      columns: t.columns === 2 || names.some((n) => (TWO_COLUMN_SECTIONS[t.id] ?? []).includes(n)) ? 2 : 1,
      blocks: names.map((title) => ({ kind: 'section' as const, title, subs: subsOf(title) })),
    });
  });
  if (has(LAST)) pages.push({ caption: `Page ${pages.length + 1}: references`, columns: t.columns, blocks: [{ kind: 'refs' }] });
  return pages;
}

/** Main sections of a template that no page shows. Empty when the plan covers the template (tested). */
export function unplacedSections(t: PaperTemplate): string[] {
  const shown = new Set<string>([...FRONT, LAST, ...(PAGE_PLAN[t.id] ?? []).flat()]);
  return t.sections.filter((s) => s.level === 1 && !shown.has(s.title)).map((s) => s.title);
}

export const wireframeFor = (templateId: string): WirePage[] => {
  const t = getTemplate(templateId);
  return t ? buildWireframe(t) : [];
};
