import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { findPdfDois, isUsablePdfTitle } from '@/lib/citations/pdf.ts';
// @ts-ignore
import * as pdfParseModule from 'pdf-parse';

// Reads a PDF the extension fetched from the browser's own PDF viewer and returns its DOI and title, so text clipped
// there carries the paper's citation. The file is read in memory and not stored.
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'Send the PDF as a "file" field.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'The PDF is over 25 MB.' }, { status: 413 });
  }

  try {
    const PDFParse = (pdfParseModule as any).PDFParse ?? (pdfParseModule as any).default?.PDFParse;
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    try {
      const infoResult = await parser.getInfo();
      const textResult = await parser.getText({ partial: [1] });
      const info = (infoResult?.info ?? {}) as Record<string, unknown>;
      const dois = findPdfDois(info as any, String(textResult?.text ?? ''));
      const rawTitle = info.Title ?? info.title;
      const title = typeof rawTitle === 'string' && isUsablePdfTitle(rawTitle) ? rawTitle.trim() : undefined;
      return NextResponse.json({ success: true, data: { dois, title } });
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Could not read this PDF.' }, { status: 422 });
  }
}
