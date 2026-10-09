import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/service';
import { retrieveRelevantDocumentContext, PDFDocumentPage } from '@/lib/ai/pdfRetriever';
import { getDocumentById } from '@/lib/data/sampleDocuments';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pageText, context, question, pages, documentId, title, currentPage } = body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    let resolvedPages: PDFDocumentPage[] = [];

    // 1. If explicit pages array provided in request payload
    if (Array.isArray(pages) && pages.length > 0) {
      resolvedPages = pages.map((p: any, idx: number) => ({
        pageNumber: typeof p.pageNumber === 'number' ? p.pageNumber : idx + 1,
        title: p.title || `Page ${p.pageNumber || idx + 1}`,
        content: typeof p.content === 'string' ? p.content : JSON.stringify(p),
      }));
    } 
    // 2. If documentId provided, lookup stored document
    else if (documentId) {
      const storedDoc = getDocumentById(documentId);
      if (storedDoc && Array.isArray(storedDoc.pages) && storedDoc.pages.length > 0) {
        resolvedPages = storedDoc.pages;
      }
    }

    // 3. If raw pageText/context provided with [PAGE X] delimiters
    if (resolvedPages.length === 0 && (pageText || context)) {
      const rawText = String(pageText || context);
      if (/---?\s*\[PAGE \d+/i.test(rawText) || /\[PAGE \d+:/i.test(rawText)) {
        const rawBlocks = rawText.split(/(?=---?\s*\[PAGE \d+|\[PAGE \d+:)/i);
        rawBlocks.forEach((block, idx) => {
          const match = block.match(/\[PAGE (\d+)(?::\s*([^\]]*))?\]/i);
          const pageNum = match ? parseInt(match[1], 10) : idx + 1;
          const pageTitle = match?.[2]?.trim() || `Page ${pageNum}`;
          const cleanContent = block.replace(/---?\s*\[PAGE \d+:[^\]]*\]\s*---?/gi, '').trim();
          if (cleanContent) {
            resolvedPages.push({
              pageNumber: pageNum,
              title: pageTitle,
              content: cleanContent,
            });
          }
        });
      } else {
        resolvedPages.push({
          pageNumber: currentPage || 1,
          title: title || 'Document Page',
          content: rawText,
        });
      }
    }

    if (resolvedPages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No document content or pages available to analyze.' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Run Intelligent Multi-Page Document Retrieval
    const retrieval = retrieveRelevantDocumentContext(
      resolvedPages,
      question.trim(),
      currentPage
    );

    const docTitle = title || (documentId ? getDocumentById(documentId)?.title : undefined) || 'Uploaded Document';

    const enhancedQuestion = `Document: "${docTitle}"
User Question: ${question.trim()}
${retrieval.targetPageMentioned ? `Target Page Indicated by User: Page ${retrieval.targetPageMentioned}` : ''}

INSTRUCTIONS:
1. Answer the question thoroughly, accurately, and directly based ONLY on the provided document excerpts.
2. If the user asked about a specific page or table, explain the exact content from that page excerpt.
3. Every factual claim MUST include a page citation in brackets, e.g. [Page X] or [p. X].
4. Quote the exact verbatim phrase or key metrics in your answer.
5. Provide clean structured Markdown with bold key findings (**bold concepts**).`;

    const result = await aiService.askPageQuestion(retrieval.formattedContext, enhancedQuestion);

    // Ensure citations and source page number are populated
    let bestPageNum = retrieval.bestMatchingPageNumber;
    const pageMatch = (result.answer || '').match(/\[(?:Page|p\.?)\s*(\d+)\]/i);
    if (pageMatch && pageMatch[1]) {
      bestPageNum = parseInt(pageMatch[1], 10);
    }

    const isNotFound = /not found|not mentioned|does not (?:contain|provide|mention)|no information/i.test(result.answer || '');

    const citations = Array.isArray(result.citations) && result.citations.length > 0 && !isNotFound
      ? result.citations
      : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          answer: result.answer,
          sourcePageNumber: bestPageNum,
          citations,
          retrievedPagesCount: retrieval.retrievedPages.length,
          totalPagesAnalyzed: resolvedPages.length,
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Failed to process page Q&A:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process page Q&A' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
