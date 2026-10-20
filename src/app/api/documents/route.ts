import { NextResponse } from 'next/server';
import { ResearchDocument } from '@/lib/types/research';
import { isCitationRecord } from '@/lib/citations/metadata.ts';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { store } from '@/lib/data/store';

// Vercel rejects request bodies over 4.5 MB before our code runs; this gives a readable message first.
const MAX_BODY_BYTES = 4_300_000;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const documentId = searchParams.get('id') || undefined;

    if (documentId) {
      const doc = await store.getDocument(auth.user.id, documentId);
      if (!doc) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: doc });
    }
    return NextResponse.json({ success: true, data: await store.listDocuments(auth.user.id, projectId) });
  } catch (error) {
    console.error('Failed to get documents:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  if (AUTH_REQUIRED && Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: 'This file is over 4 MB, which is the most the server accepts. Use a smaller PDF.', code: 'TOO_LARGE' },
      { status: 413 }
    );
  }
  try {
    const body = await request.json();
    const { projectId, title, filename, author, sourceUrl, fileUrl, fileData, content, pages, tags, fileSize, citation } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { success: false, error: 'projectId and title are required' },
        { status: 400 }
      );
    }

    // If raw content string was provided, split into pages
    let docPages = pages;
    if (!docPages || !Array.isArray(docPages) || docPages.length === 0) {
      const rawText = content || 'Uploaded Document Content';
      // Split text roughly every 1500 chars or by double line breaks
      const paragraphs = rawText.split(/\n\n+/);
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

      docPages = chunks.map((chunk, idx) => ({
        pageNumber: idx + 1,
        title: `Page ${idx + 1}`,
        content: chunk,
        highlights: [],
      }));
    }

    // Calculate accurate formatted file size
    let resolvedFileSize = fileSize;
    if (!resolvedFileSize) {
      if (fileData && typeof fileData === 'string') {
        const rawLength = fileData.includes(',') ? fileData.split(',')[1]?.length || fileData.length : fileData.length;
        const bytes = Math.round((rawLength * 3) / 4);
        resolvedFileSize = bytes >= 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(bytes / 1024))} KB`;
      } else if (content) {
        const bytes = Buffer.byteLength(content, 'utf8');
        resolvedFileSize = bytes >= 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(bytes / 1024))} KB`;
      } else {
        resolvedFileSize = '150 KB';
      }
    }

    const newDoc: ResearchDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId,
      title,
      filename: filename || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`,
      author: author || 'Research Contributor',
      sourceUrl: sourceUrl || undefined,
      fileUrl: fileUrl || undefined,
      fileData: fileData || undefined,
      publicationDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      fileSize: resolvedFileSize,
      totalPages: docPages.length,
      pages: docPages,
      uploadedAt: new Date().toISOString(),
      tags: tags || ['uploaded-doc'],
      citation: isCitationRecord(citation) ? citation : undefined,
    };

    const saved = await store.addDocument(auth.user.id, { ...newDoc, projectId: await store.resolveProjectId(auth.user.id, newDoc.projectId) });
    if (!saved) return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
    return NextResponse.json(
      { success: true, data: saved },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload document' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ success: false, error: 'Document id is required' }, { status: 400 });
    }
    if (!isCitationRecord(body.citation)) {
      return NextResponse.json({ success: false, error: 'citation must be a citation record' }, { status: 400 });
    }
    const updated = await store.updateDocumentCitation(auth.user.id, body.id, body.citation);
    if (!updated) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: { id: updated.id, citation: updated.citation } });
  } catch (error) {
    console.error('Failed to update document:', error);
    return NextResponse.json({ success: false, error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document id is required' }, { status: 400 });
    }

    const removed = await store.deleteDocument(auth.user.id, id);
    // Accounts on: a document that is not yours (or gone) is a 404. Local: deleting twice is still "done".
    if (AUTH_REQUIRED) return NextResponse.json({ success: removed, deleted: removed, id }, { status: removed ? 200 : 404 });
    return NextResponse.json({ success: true, deleted: removed, id });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete document' }, { status: 500 });
  }
}
