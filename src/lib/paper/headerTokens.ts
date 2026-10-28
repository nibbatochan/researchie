// Header and footer text with tokens (design note section 2.5). Pure.
//   {title} {shortTitle} {author} {venue} {page} {pages} {date}
// {shortTitle} falls back to the title cut to 50 characters (the APA running-head limit) when none is set.
// {author} is the first author's family name, with "et al." when there are more.

import type { PaperMeta } from './docModel.ts';

export const RUNNING_HEAD_MAX = 50;

export function runningHead(front: PaperMeta['front']): string {
  const short = front.shortTitle.trim();
  if (short) return short;
  const t = front.title.trim();
  return t.length > RUNNING_HEAD_MAX ? `${t.slice(0, RUNNING_HEAD_MAX - 1).trimEnd()}…` : t;
}

export function authorToken(front: PaperMeta['front']): string {
  const first = front.authors[0]?.name.trim();
  if (!first) return '';
  const family = first.split(/\s+/).pop() ?? first;
  return front.authors.length > 1 ? `${family} et al.` : family;
}

export function resolveTokens(text: string, meta: PaperMeta, page: number, pages: number, today: Date = new Date()): string {
  const values: Record<string, string> = {
    title: meta.front.title.trim(),
    shortTitle: runningHead(meta.front),
    author: authorToken(meta.front),
    venue: meta.venue.trim(),
    page: String(page + (meta.page.startAt ?? 1) - 1), // page is the place in the paper, counted from 1
    pages: String(pages),
    date: today.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
  };
  return text.replace(/\{(title|shortTitle|author|venue|pages|page|date)\}/g, (_, name: string) => values[name] ?? '');
}
