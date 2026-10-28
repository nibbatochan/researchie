// Text copied from a PDF breaks at the end of every printed line. Left as it is, each line becomes its own paragraph on
// the platform and the clip shows half-empty gaps. A single line break is a wrapped line; a blank line is a paragraph.

/** Joins wrapped lines into paragraphs: single breaks become spaces, a word split by a hyphen at a line end is joined. */
export function unwrapPdfLines(text: string): string {
  const paragraphs = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00AD\u200B]/g, '')
    .split(/\n[ \t]*\n+/);
  return paragraphs
    .map((para) => {
      const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
      let out = '';
      for (const line of lines) {
        if (!out) out = line;
        else if (/[A-Za-z\u00C0-\u024F]-$/.test(out) && /^[a-z\u00E0-\u024F]/.test(line)) out = out.slice(0, -1) + line;
        else out += ' ' + line;
      }
      return out.replace(/[ \t]{2,}/g, ' ');
    })
    .filter(Boolean)
    .join('\n\n');
}
