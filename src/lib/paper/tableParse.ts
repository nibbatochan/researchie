// Reads a table out of a clipped HTML block, as plain cells of text. Pure: no DOM.
// Only the text of each cell is kept. No tag, attribute, link or script from the page is carried into the paper
// preview, so a clipped page can not put markup into it.

export interface ParsedTable {
  caption?: string;
  header: string[]; // the first row when it is made of <th> cells; empty otherwise
  rows: string[][];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', minus: '−', plusmn: '±', times: '×' };

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function textOf(html: string): string {
  return decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** The first table in the HTML, or undefined when there is none or it has no cells. */
export function parseTable(html: string): ParsedTable | undefined {
  const table = html?.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return undefined;
  const caption = table.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i)?.[1];

  const rows: string[][] = [];
  let header: string[] = [];
  for (const row of table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...row.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
    if (cells.length === 0) continue;
    const texts = cells.map((c) => textOf(c[2]));
    if (rows.length === 0 && header.length === 0 && cells.every((c) => c[1].toLowerCase() === 'th')) header = texts;
    else rows.push(texts);
  }
  if (header.length === 0 && rows.length === 0) return undefined;
  const cap = caption ? textOf(caption) : '';
  return { ...(cap ? { caption: cap } : {}), header, rows };
}

export function hasTable(html: string | undefined): boolean {
  return !!html && parseTable(html) !== undefined;
}
