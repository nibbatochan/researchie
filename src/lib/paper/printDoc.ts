// The page that is printed when the researcher exports the preview to PDF. Pure: strings in, a string out.
// The PDF is the PREVIEW, not a publishable paper, and it must never look like one. So every printed page
// carries the note below, drawn by the page itself (a fixed footer that repeats on each sheet, with room kept
// for it by a table footer), not by anything the browser may or may not support. Page numbers use the CSS
// page margin boxes where the browser has them; the note does not depend on them.

export const PREVIEW_ONLY_NOTE = 'Preview only. Not journal formatting. A journal sets its own layout and its editors format the final paper.';

export interface PrintInput {
  title: string; // the working title: it becomes the file name the browser suggests
  articleHtml: string; // the preview article, as HTML
  headHtml: string; // the app's own style tags and links, so the article looks as it does on screen
  columns: 1 | 2;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PRINT_CSS = `
@page { size: A4; margin: 16mm 16mm 14mm; @bottom-right { content: "Page " counter(page); font: 8pt Georgia, serif; color: #555; } }
html, body { margin: 0; background: #fff !important; color: #111; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
table.print-frame { width: 100%; border-collapse: collapse; }
table.print-frame td { padding: 0; }
.space-bottom { height: 12mm; }
.print-footer { position: fixed; left: 0; right: 0; bottom: 0; height: 9mm; border-top: 0.4pt solid #888; padding-top: 1.5mm;
  font: 700 8pt Georgia, 'Times New Roman', serif; color: #7c2d12; background: #fff; }
article.paper-article { background: #fff !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
.paper-body.paper-two-col { column-count: 2; column-gap: 8mm; }
.paper-body figure, .paper-body [data-testid="preview-table"], .paper-body table { break-inside: avoid; }
.paper-body h2, .paper-body h4 { break-after: avoid; }
button { all: unset; }
[data-testid="preview-cite-link"] { color: inherit; }
`;

export function buildPrintDocument(input: PrintInput): string {
  const title = escapeHtml(input.title.trim() || 'Paper preview');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
${input.headHtml}
<style>${PRINT_CSS}</style>
</head>
<body class="paper-print" data-columns="${input.columns}">
<div class="print-footer" data-testid="print-note">${escapeHtml(PREVIEW_ONLY_NOTE)}</div>
<table class="print-frame"><tbody><tr><td>
${input.articleHtml}
</td></tr></tbody><tfoot><tr><td><div class="space-bottom"></div></td></tr></tfoot></table>
</body>
</html>`;
}
