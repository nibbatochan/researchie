// The short source line shown next to the time on a clip or note. It names where the item came from, not the raw
// address: an AI answer is named by its engine, a document by its file name, and a web clip by its site.
//   Researchie AI  - written by Researchie AI (Research AI notes, and paraphrased answers)
//   Plugin answer  - an answer made in the Chrome extension (Page AI, Executive Brief, Q&A)
//   Docs / <name>  - text from an uploaded document
//   <site>         - text captured from a web page
// Tags are never used as a source.

interface HasSource {
  type?: string;
  title?: string;
  tags?: string[];
  metadata?: {
    origin?: string;
    evidenceKind?: string;
    sourceUrl?: string;
    pageTitle?: string;
    documentType?: string;
    documentName?: string;
    documentId?: string;
    pdfDocId?: string;
    docId?: string;
  } | null;
}

const PLUGIN_TAGS = ['page-ai', 'ai-page-insight', 'qna'];
const PLUGIN_TITLE = /^(Page AI:|Executive Brief:)/;

export function sourceLabel(atom: HasSource): string {
  const m = atom.metadata ?? {};
  if (m.origin === 'research-ai' || m.evidenceKind === 'ai-summary') return 'Researchie AI';
  if (m.origin === 'plugin' || (atom.tags ?? []).some((t) => PLUGIN_TAGS.includes(t)) || PLUGIN_TITLE.test(atom.title ?? '')) {
    return 'Plugin answer';
  }
  const docName = m.documentName || (m.documentType === 'pdf' || m.documentId || m.pdfDocId || m.docId ? m.pageTitle : undefined);
  if (m.documentType === 'pdf' || m.documentId || m.pdfDocId || m.docId || m.sourceUrl?.startsWith('/reader')) {
    return `Docs / ${docName || 'Document'}`;
  }
  if (m.sourceUrl) {
    try {
      return new URL(m.sourceUrl).hostname;
    } catch {
      return '';
    }
  }
  return atom.type === 'note' ? 'Your note' : '';
}
