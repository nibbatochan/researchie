// Browser-only. Reads a PDF File with pdf.js and returns the DOIs found in its
// metadata and first page, plus the PDF's title for checking them.
// Same loading pattern as CustomPDFViewer.tsx.

import { findPdfDois, isUsablePdfTitle, type PdfInfo } from './pdf.ts';

export interface PdfReadResult {
  dois: string[];
  title?: string;
}

export async function readPdfDois(file: File): Promise<PdfReadResult> {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjsLib.getDocument({ data });
  const doc = await task.promise;
  try {
    const { info } = await doc.getMetadata();
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const firstPageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');

    const pdfInfo = (info ?? {}) as PdfInfo;
    // pdf.js names the field "Title" (capital T), as in the PDF info dictionary.
    const rawTitle = pdfInfo.Title ?? pdfInfo.title;
    return {
      dois: findPdfDois(pdfInfo, firstPageText),
      title: typeof rawTitle === 'string' && isUsablePdfTitle(rawTitle) ? rawTitle.trim() : undefined,
    };
  } finally {
    await task.destroy();
  }
}
