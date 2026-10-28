// The in-text markers and the reference list for a paper's body, from its cite map and the style it chose.
// Pure. Each of the five styles draws its own in-text marker and reference list (inText.ts).
import { renderCitations, renderCitationsSplit, markerText, isNumberedStyle, type CitedSource, type ContentCitation, type InTextStyle, type RenderedReference } from '../citations/inText.ts';
import { citableNodes, collectCitations, type CiteSources, type PmNode } from './docModel.ts';

export const STYLE_FAMILY: Record<string, InTextStyle> = { apa: 'apa', harvard: 'harvard', mla: 'mla', chicago: 'chicago', ieee: 'ieee', vancouver: 'vancouver', ama: 'ama' };

/** What the style menu tells the person about how a style looks in the text. Switching never changes what they wrote. */
export const STYLE_NOTE: Record<string, string> = {
  apa: 'APA 7 shows (Lee & Patel, 2020) in the text. Change the style any time; your text stays the same.',
  harvard: 'Harvard shows (Lee and Patel, 2020) in the text. Change the style any time; your text stays the same.',
  mla: 'MLA 9 shows (Lee and Patel 14) in the text, with a page number, and no year. Change the style any time; your text stays the same.',
  chicago: 'Chicago shows (Lee and Patel 2020, 14) in the text. Change the style any time; your text stays the same.',
  ieee: 'IEEE shows [1] in the text, numbered by first use. Change the style any time; your text stays the same.',
  vancouver: 'Vancouver shows (1) in the text, numbered by first use. Change the style any time; your text stays the same.',
  ama: 'AMA shows a raised number in the text, numbered by first use. Change the style any time; your text stays the same.',
};

export const familyOf = (style: string): InTextStyle => STYLE_FAMILY[style] ?? 'harvard';

export interface Markers {
  /** One per citable node in document order (the same order as the editor's decorations). '' draws nothing. */
  markers: string[];
  references: RenderedReference[];
}

/** What the text shows when the paper has not chosen: the style's own way (numbers for IEEE, Vancouver, AMA; author-date for the rest). */
export const contentOf = (style: string, chosen?: ContentCitation): ContentCitation => chosen ?? (isNumberedStyle(familyOf(style)) ? 'numbered' : 'author-date');

export function computeMarkers(pm: PmNode, cites: Record<string, string>, sources: CiteSources, style: string, listed: string[] = [], content?: ContentCitation): Markers {
  const nodes = citableNodes(pm);
  const groups = collectCitations(pm, cites, sources);
  // Listed-but-not-cited sources ride after the text's own groups, so they take the last numbers and the last rows.
  const extra: CitedSource[][] = [];
  for (const id of listed) {
    const clip = sources.clips.get(id);
    if (clip?.record) extra.push([{ sourceId: clip.id, record: clip.record }]);
  }
  // no choice for the text: the style draws its own markers; a choice splits the in-text marker from the reference style
  const rendered = content ? renderCitationsSplit(content, familyOf(style), [...groups, ...extra]) : renderCitations(familyOf(style), [...groups, ...extra]);
  const markers = rendered.markers.slice(0, nodes.length).map((parts, i) => {
    if (groups[i].length === 0) return nodes[i].type === 'citation' ? '[?]' : ''; // a quote with no source draws nothing; a citation with none is flagged
    return markerText(parts);
  });
  return { markers, references: rendered.references };
}
