// Finding LaTeX maths inside text, so the preview can draw it as an equation. Pure: no DOM, no KaTeX.
//   $x^2$ or \(x^2\)        inline
//   $$E = mc^2$$ or \[...\] display (on its own line, numbered in the preview)
//   \ce{H2O}                chemistry, written inside $...$ (KaTeX's mhchem add-on)
// A dollar sign that is only a price ("$5 and $10") is left alone: an opening $ must be followed by a
// non-space, a closing $ must follow a non-space and must not be followed by a digit (the Pandoc rule).
// \$ is a literal dollar sign.

export type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'inline'; value: string }
  | { type: 'display'; value: string };

/** Matches, in order: $$...$$, \[...\], \(...\), then $...$ with the price rule. */
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<![\\$])\$(?=\S)((?:\\\$|[^$\n])*?\S)\$(?!\d)/g;

export function splitMath(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    const start = m.index ?? 0;
    const display = m[1] ?? m[2];
    const inline = m[3] ?? m[4];
    const value = (display ?? inline ?? '').trim();
    if (!value) continue;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({ type: display !== undefined ? 'display' : 'inline', value });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return unescapeDollars(out.length ? out : [{ type: 'text', value: text }]);
}

function unescapeDollars(segments: MathSegment[]): MathSegment[] {
  return segments.map((s) => (s.type === 'text' ? { ...s, value: s.value.replace(/\\\$/g, '$') } : s));
}

export function hasMath(text: string): boolean {
  return splitMath(text).some((s) => s.type !== 'text');
}

/** The text without its maths, so checks on numbers and quotations do not read the inside of an equation. */
export function stripMath(text: string): string {
  return splitMath(text)
    .map((s) => (s.type === 'text' ? s.value : ' '))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
