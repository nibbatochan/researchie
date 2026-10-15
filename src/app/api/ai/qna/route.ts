import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { resolveAI, aiErrorResponse } from '@/lib/ai/userAi';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { cloud } from '@/lib/data/cloudStore';
import type { PDFDocumentPage } from '@/lib/ai/pdfRetriever';
import { retrievePassages, locateQuote, CONTEXT_BUDGET_CHARS } from '@/lib/ai/passages';
import { AIServiceBusyError } from '@/lib/ai/types';
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
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const resolved = await resolveAI(auth.user);
  if (resolved.response) return resolved.response;
  const ai = resolved.ai;
  // A saved document is looked up for this user only.
  const lookupDoc = async (id: string) => (AUTH_REQUIRED ? cloud.getDocument(auth.user.id, id) : getDocumentById(id));
  try {
    const body = await request.json();
    const { pageText, context, question, pages, documentId, title, currentPage, selection } = body;
    // The in-page "Ask AI" sends only the text the user selected. It is the whole context, so the answer comes
    // from that text alone, and a long selection is cut rather than refused.
    const selectionMode = selection === true;
    const sourceText = selectionMode && typeof pageText === 'string' ? pageText.slice(0, 8000) : pageText;

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
      const storedDoc = await lookupDoc(documentId);
      if (storedDoc && Array.isArray(storedDoc.pages) && storedDoc.pages.length > 0) {
        resolvedPages = storedDoc.pages;
      }
    }

    // 3. If raw pageText/context provided with [PAGE X] delimiters
    if (resolvedPages.length === 0 && (sourceText || context)) {
      const rawText = String(sourceText || context);
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

    // Passage-level retrieval: the model sees a few thousand characters of the most
    // relevant passages, each labelled with an id it can cite.
    let retrieval = retrievePassages(resolvedPages, question.trim(), { activeCurrentPage: currentPage });
    const docTitle = title || (documentId ? (await lookupDoc(documentId))?.title : undefined) || 'Uploaded Document';
    const retrievedPagesCount = new Set(retrieval.passages.map((p) => p.pageNumber)).size;
    const notFoundAnswer = 'This information is not found in the provided document.';

    // When the document is too large to send whole and no passage matches the
    // question, say so without asking the model.
    if (!retrieval.relevant && !retrieval.wholeDocument) {
      return NextResponse.json(
        {
          success: true,
          data: {
            answer: notFoundAnswer,
            sourcePageNumber: retrieval.bestPageNumber,
            citations: [],
            hasUnsupportedClaims: false,
            retrievedPagesCount,
            totalPagesAnalyzed: resolvedPages.length,
          },
        },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const enhancedQuestion = selectionMode
      ? `Text the user selected on a web page${title ? ` (page title: "${title}")` : ''}
User Question: ${question.trim()}

Answer only from the selected text. If it does not contain the answer, say that it is not found. Do not mention page numbers. Cite the passage id and copy the quote verbatim.`
      : `Document: "${docTitle}"
User Question: ${question.trim()}
${retrieval.targetPage ? `Target Page Indicated by User: Page ${retrieval.targetPage}` : ''}

Answer directly from the passages. Cite passage ids and copy quotes verbatim.`;

    let result;
    try {
      result = await ai.askPageQuestion(retrieval.context, enhancedQuestion);
    } catch (error) {
      if (!(error instanceof AIServiceBusyError && error.tooLarge)) throw error;
      // Too large for the model's limit: ask once more with half as many passages, chosen
      // by relevance again so the page the user asked about stays in.
      retrieval = retrievePassages(resolvedPages, question.trim(), {
        activeCurrentPage: currentPage,
        budget: Math.floor(CONTEXT_BUDGET_CHARS / 2),
      });
      result = await ai.askPageQuestion(retrieval.context, enhancedQuestion);
    }

    const isNotFound = /not found|not mentioned|does not (?:contain|provide|mention)|no information/i.test(result.answer || '');
    // A fallback model (used when the main one is rate limited) must not turn a question the
    // retrieval found relevant passages for into a false "not found". Ask the user to retry.
    if (isNotFound && retrieval.relevant && result.fromFallbackModel) throw new AIServiceBusyError();
    const pageContent = new Map(resolvedPages.map((p) => [p.pageNumber, p.content || '']));
    const passageById = new Map(retrieval.allPassages.map((p) => [p.id, p]));

    // A "not found" answer gets no citations. Every other citation is located in the
    // document: quote -> page + exact [start, end) offsets. A quote that cannot be
    // found in its passage or page is kept but marked unsupported.
    const rawCitations: any[] = !isNotFound && Array.isArray(result.citations) ? result.citations : [];
    const citations = rawCitations.map((c: any) => {
      const quote = typeof c?.quote === 'string' ? c.quote : '';
      const passage = c?.passageId ? passageById.get(String(c.passageId).trim().toLowerCase()) : undefined;
      let found: { pageNumber: number; start: number; end: number } | null = null;
      let passageId = passage?.id;
      if (passage) {
        const inPassage = locateQuote(quote, passage.text);
        if (inPassage) {
          found = { pageNumber: passage.pageNumber, start: passage.start + inPassage.start, end: passage.start + inPassage.end };
        } else {
          const inPage = locateQuote(quote, pageContent.get(passage.pageNumber) || '');
          if (inPage) found = { pageNumber: passage.pageNumber, ...inPage };
        }
      }
      if (!found) {
        // No (valid) passage id: look for the quote on every page.
        for (const page of resolvedPages) {
          const loc = locateQuote(quote, page.content || '');
          if (loc) {
            found = { pageNumber: page.pageNumber, ...loc };
            const inside = retrieval.allPassages.find((p) => p.pageNumber === page.pageNumber && loc.start >= p.start && loc.start < p.end);
            passageId = inside?.id ?? passageId;
            break;
          }
        }
      }
      return {
        passageId,
        pageNumber: found?.pageNumber ?? passage?.pageNumber ?? c?.pageNumber ?? retrieval.bestPageNumber,
        start: found?.start,
        end: found?.end,
        quote,
        supported: found !== null,
        textFragment: quote ? `#:~:text=${encodeURIComponent(quote.slice(0, 32))}` : c?.textFragment,
      };
    });
    // Warn only when a claim cites a passage that does not support it. An answer with no
    // citation at all is not flagged: nothing was claimed to be sourced.
    const hasUnsupportedClaims = !isNotFound && citations.some((c) => !c.supported);

    const firstSupported = citations.find((c) => c.supported);
    const bestPageNum = retrieval.targetPage || firstSupported?.pageNumber || retrieval.bestPageNumber;

    return NextResponse.json(
      {
        success: true,
        data: {
          answer: result.answer,
          sourcePageNumber: bestPageNum,
          citations,
          hasUnsupportedClaims,
          retrievedPagesCount,
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
    const keyResponse = aiErrorResponse(error);
    if (keyResponse) return keyResponse;
    if (error instanceof AIServiceBusyError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
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
