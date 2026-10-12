// The saved citation of a clip as a plain line, for exports. Returns null when the clip has none.

import type { ResearchAtom } from '../types/research';
import { isCitationRecord } from '../citations/metadata.ts';
import { formatCitationLine } from '../citations/client.ts';

export function atomCitation(atom: ResearchAtom): { line: string; doi?: string } | null {
  const citation = atom.metadata?.citation;
  if (!isCitationRecord(citation)) return null;
  return { line: formatCitationLine(citation), doi: citation.doi };
}
