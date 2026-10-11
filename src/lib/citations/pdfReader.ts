// Browser-only. Reads a PDF File with pdf.js and looks for a DOI in its
// metadata and first page. Same loading pattern as CustomPDFViewer.tsx.

import { findPdfDoi, type PdfDoiResult, type PdfInfo } from './pdf.ts';

export type PdfDoiReadResult = PdfDoiResult & { title?: string };

export async function readPdfDoi(file: File): Promise<PdfDoiReadResult> {
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
    return { ...findPdfDoi(pdfInfo, firstPageText), title: typeof pdfInfo.title === 'string' ? pdfInfo.title : undefined };
  } finally {
    await task.destroy();
  }
}
