// Pure helpers that decide which font draws each character in the PDF.
// No React here, so node:test can load it. The primary fonts (Figtree, JetBrains Mono) ship as Latin
// subsets; anything they lack is drawn with DejaVu Sans, and anything DejaVu lacks becomes U+FFFD
// (a visible replacement mark) instead of silently disappearing.

import type { ReportModel } from './types.ts';
import { DEJAVU_COVERAGE, FIGTREE_COVERAGE, MONO_COVERAGE } from './coverage.ts';

export type PrimaryFont = 'figtree' | 'mono';
export interface Run {
  text: string;
  fallback: boolean;
}

const REPLACEMENT = '�';

/** Dashes and spaces the fonts cannot draw become plain ones; invisible format characters are removed. */
export function normalizeForPdf(text: string): string {
  return text
    .replace(/[‐‑‒⁃]/g, '-')
    .replace(/[­​-‍⁠﻿]/g, '')
    .replace(/[    ]/g, ' ');
}

type Ranges = ReadonlyArray<readonly [number, number]>;

function inRanges(ranges: Ranges, cp: number): boolean {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, b] = ranges[mid];
    if (cp < a) hi = mid - 1;
    else if (cp > b) lo = mid + 1;
    else return true;
  }
  return false;
}

function isCombining(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  );
}

/** Line breaks and tabs are layout, not glyphs: they stay with whichever run they sit in. */
function isLayout(cp: number): boolean {
  return cp === 0x0a || cp === 0x0d || cp === 0x09;
}

function primaryRanges(primary: PrimaryFont): Ranges {
  return primary === 'mono' ? MONO_COVERAGE : FIGTREE_COVERAGE;
}

/** Splits text into runs by which font draws them. A base letter and its combining marks never separate. */
export function splitRuns(text: string, primary: PrimaryFont): Run[] {
  const ranges = primaryRanges(primary);
  const runs: Run[] = [];
  const push = (t: string, fallback: boolean) => {
    const last = runs[runs.length - 1];
    if (last && last.fallback === fallback) last.text += t;
    else runs.push({ text: t, fallback });
  };

  const cps = Array.from(text);
  let i = 0;
  while (i < cps.length) {
    const cluster = [cps[i]];
    i++;
    while (i < cps.length && isCombining(cps[i].codePointAt(0)!)) {
      cluster.push(cps[i]);
      i++;
    }
    const codes = cluster.map((c) => c.codePointAt(0)!);
    if (codes.every((c) => isLayout(c) || inRanges(ranges, c))) push(cluster.join(''), false);
    else if (codes.every((c) => isLayout(c) || inRanges(DEJAVU_COVERAGE, c))) push(cluster.join(''), true);
    else push(REPLACEMENT, true);
  }
  return runs;
}

function collectStrings(model: ReportModel): string[] {
  const out: string[] = [model.cover.title, model.cover.description, model.cover.styleLabel];
  for (const s of model.sections) {
    out.push(s.title);
    for (const it of s.items) {
      out.push(it.title, it.body);
      if (it.notes) out.push(it.notes);
      if (it.ocrText) out.push(it.ocrText);
      if (it.source) out.push(it.source.label);
      out.push(...it.tags);
      for (const f of it.flags) out.push(f.text);
    }
  }
  for (const b of model.bibliography) {
    out.push(b.text);
    for (const f of b.flags) out.push(f.text);
  }
  return out.filter((s): s is string => typeof s === 'string');
}

/** Characters in the report that no embedded font can draw (they print as U+FFFD). Sorted, at most 12. */
export function findUnsupportedCharacters(model: ReportModel): string[] {
  const seen = new Set<string>();
  for (const raw of collectStrings(model)) {
    for (const ch of normalizeForPdf(raw)) {
      const cp = ch.codePointAt(0)!;
      if (isLayout(cp)) continue;
      if (inRanges(FIGTREE_COVERAGE, cp) || inRanges(MONO_COVERAGE, cp) || inRanges(DEJAVU_COVERAGE, cp)) continue;
      seen.add(ch);
    }
  }
  return [...seen].sort().slice(0, 12);
}
