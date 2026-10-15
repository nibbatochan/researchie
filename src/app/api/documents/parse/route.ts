import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
// @ts-ignore
import * as pdfParseModule from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';
    let totalPages = 1;
    const pages: Array<{ pageNumber: number; title: string; content: string; highlights: any[] }> = [];

    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (ext === 'pdf') {
      try {
        // 1. Check for class-based PDFParse (e.g. pdf-parse v2+ or custom build)
        const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;
        if (typeof PDFParseClass === 'function') {
          const parser = new PDFParseClass({ data: buffer });
          const textResult = await parser.getText();
          totalPages = textResult.total || textResult.pages?.length || 1;
          extractedText = textResult.text || '';

          if (Array.isArray(textResult.pages) && textResult.pages.length > 0) {
            textResult.pages.forEach((p: any, idx: number) => {
              const pageNum = typeof p.num === 'number' ? p.num : idx + 1;
              const content = typeof p.text === 'string' ? p.text.trim() : '';
              pages.push({
                pageNumber: pageNum,
                title: `Page ${pageNum}`,
                content: content || `[Page ${pageNum} content]`,
                highlights: [],
              });
            });
          }
          try {
            await parser.destroy();
          } catch {}
        } 
        // 2. Fallback to standard functional pdfParse
        else {
          const parseFn = typeof pdfParseModule === 'function' 
            ? pdfParseModule 
            : (pdfParseModule as any).default;

          if (typeof parseFn === 'function') {
            const data = await parseFn(buffer);
            extractedText = data.text || '';
            totalPages = data.numpages || 1;

            if (extractedText.includes('\f')) {
              const rawPages = extractedText.split('\f').filter((p: string) => p.trim().length > 0);
              rawPages.forEach((pText: string, i: number) => {
                pages.push({
                  pageNumber: i + 1,
                  title: `Page ${i + 1}`,
                  content: pText.trim(),
                  highlights: [],
                });
              });
            }
          }
        }
      } catch (err: any) {
        console.error('PDF parsing error on server:', err);
      }
    } else if (ext === 'docx' || ext === 'doc') {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } catch (err: any) {
        console.error('DOCX parsing error:', err);
        extractedText = `[Extracted from ${filename}]\n\nUnable to extract DOCX: ${err.message}`;
      }
    } else {
      // Plain text, Markdown, etc.
      extractedText = buffer.toString('utf-8');
    }

    // If pages weren't populated, create sensible page chunks (~1200 chars per page)
    if (pages.length === 0) {
      const paragraphs = extractedText.split(/\n\n+/);
      const chunks: string[] = [];
      let currentChunk = '';

      for (const p of paragraphs) {
        if ((currentChunk + p).length > 1200 && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = p + '\n\n';
        } else {
          currentChunk += p + '\n\n';
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      if (chunks.length === 0 && extractedText.trim()) {
        chunks.push(extractedText.trim());
      }

      chunks.forEach((chunk, idx) => {
        pages.push({
          pageNumber: idx + 1,
          title: `Page ${idx + 1}`,
          content: chunk,
          highlights: [],
        });
      });
    }

    const fileSizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    let fileType = 'text';
    if (ext === 'pdf') fileType = 'pdf';
    else if (ext === 'docx') fileType = 'docx';
    else if (ext === 'doc') fileType = 'doc';
    else if (ext === 'md' || ext === 'markdown') fileType = 'markdown';

    return NextResponse.json({
      success: true,
      filename,
      fileType,
      fileSize: fileSizeStr,
      totalPages: pages.length || 1,
      extractedText,
      pages,
    });
  } catch (error: any) {
    console.error('Document parsing endpoint error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse document' },
      { status: 500 }
    );
  }
}
