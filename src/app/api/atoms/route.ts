import { NextResponse, after } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { cloud } from '@/lib/data/cloudStore';

// Vercel rejects request bodies over 4.5 MB before our code runs; this gives a readable message first.
const MAX_BODY_BYTES = 4_300_000;
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getLocalProjects, getLocalAtoms, addLocalAtom, updateLocalAtom, deleteLocalAtom } from '@/lib/data/researchStore';
import { generateTextFragment } from '@/lib/utils/textFragments';
import { uploadAsset } from '@/lib/storage/service';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { buildIsolatedBlockDoc, extractPlainTextFromHtml } from '@/lib/utils/htmlBlockNormalizer';
import { isCitationRecord, withCitation } from '@/lib/citations/metadata.ts';
import { sanitizeBlockHtml } from '@/lib/security/sanitizeBlockHtml.ts';
import { withPinned } from '@/lib/atoms/pin.ts';

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

    if (AUTH_REQUIRED) {
      const data = await cloud.listAtoms(auth.user.id, projectId);
      return NextResponse.json({ success: true, source: 'supabase', data });
    }

    // Try Supabase first
    try {
      let query = supabaseAdmin.from('atoms').select('*').order('captured_at', { ascending: false });
      if (projectId && projectId !== 'all') {
        const localProjects = getLocalProjects();
        const childrenIds = localProjects.filter((cp) => cp.parentId === projectId).map((cp) => cp.id);
        const targetProjectIds = [projectId, ...childrenIds];
        query = query.in('project_id', targetProjectIds);
      }
      const { data, error } = await query;
      if (!error && data) {
        const local = getLocalAtoms(projectId);
        const dbAtoms = data.map((a) => ({
          id: a.id,
          projectId: a.project_id,
          userId: a.user_id,
          type: a.type,
          title: a.title,
          content: a.content || {},
          metadata: a.metadata || {},
          tags: a.tags || [],
          userNotes: a.user_notes || '',
          capturedAt: a.captured_at,
        }));

        const missingLocal = local.filter((la) => !dbAtoms.some((da) => da.id === la.id));
        const combined = [...missingLocal, ...dbAtoms];

        return NextResponse.json({
          success: true,
          source: 'supabase_merged',
          data: combined,
        });
      }
    } catch {
      // Fallback
    }

    // Fallback to local store
    const local = getLocalAtoms(projectId);
    return NextResponse.json({
      success: true,
      source: 'local_store',
      data: local,
    });
  } catch (error) {
    const local = getLocalAtoms();
    return NextResponse.json({
      success: true,
      source: 'local_store',
      data: local,
    });
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  if (AUTH_REQUIRED && Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: 'This clip is over 4 MB, which is the most the server accepts. Crop a smaller area or clip less.', code: 'TOO_LARGE' },
      { status: 413 }
    );
  }
  try {
    const body = await request.json();

    if (!body.projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!body.type || !['text', 'link', 'image', 'block', 'quote', 'note'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Valid atom type (text, quote, link, image, block, note) is required' },
        { status: 400 }
      );
    }

    // Normalize quote/text and compute W3C Scroll-to-Text Fragment if needed
    const rawQuoteText = body.content?.rawText || body.content?.text;
    let scrollToText = body.metadata?.scrollToTextFragment || body.metadata?.textFragment;
    if ((body.type === 'text' || body.type === 'quote') && rawQuoteText && !scrollToText) {
      scrollToText = generateTextFragment(
        rawQuoteText,
        body.metadata?.contextPrefix,
        body.metadata?.contextSuffix
      );
    }

    // Handle Asset Upload for Image Atoms
    let finalImageUrl = body.content?.imageUrl;
    if (body.type === 'image' && finalImageUrl && (finalImageUrl.startsWith('data:image/') || finalImageUrl.length > 500)) {
      try {
        const uploadResult = await uploadAsset(finalImageUrl, 'crop.png', 'image/png');
        if (uploadResult && uploadResult.url) {
          finalImageUrl = uploadResult.url;
        }
      } catch (err) {
        console.warn('Asset upload fallback:', err);
      }
    }

    const defaultTitle = 
      body.type === 'quote' || body.type === 'text' 
        ? 'Captured Quote' 
        : body.type === 'image' 
        ? 'Captured Image' 
        : body.type === 'block' 
        ? 'Captured DOM Block' 
        : body.type === 'note' 
        ? 'Research Note' 
        : 'Saved Link';

    // Preserve target project ID exactly as provided
    const targetProjectId = body.projectId;

    // Normalize DOM Block content & synthesize standalone document if needed
    // Captured page HTML is cleaned here, on every save, before it is stored or shown.
    let blockSanitizedHtml = sanitizeBlockHtml(body.content?.sanitizedHtml || '') || undefined;
    let blockStandaloneHtml = sanitizeBlockHtml(body.content?.standaloneHtml || '') || undefined;
    let blockRawText = rawQuoteText;

    if (body.type === 'block') {
      if (!blockStandaloneHtml && blockSanitizedHtml) {
        blockStandaloneHtml = buildIsolatedBlockDoc({
          sanitizedHtml: blockSanitizedHtml,
          sourceUrl: body.metadata?.sourceUrl,
        });
      }
      if (!blockRawText && (blockSanitizedHtml || blockStandaloneHtml)) {
        blockRawText = extractPlainTextFromHtml(blockSanitizedHtml || blockStandaloneHtml || '');
      }
    }

    // Safely extract domain favicon
    let domainFavicon = body.metadata?.domainFavicon;
    if (!domainFavicon && body.metadata?.sourceUrl) {
      try {
        const parsed = new URL(body.metadata.sourceUrl);
        domainFavicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
      } catch {
        domainFavicon = undefined;
      }
    }

    const newAtomPayload = {
      id: body.id || `atom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId: targetProjectId,
      userId: body.userId || 'user-01',
      type: body.type,
      title: body.title?.trim() || defaultTitle,
      content: {
        ...(body.content || {}),
        rawText: blockRawText,
        text: blockRawText,
        markdownContent: body.content?.markdownContent || (rawQuoteText ? `> "${rawQuoteText}"` : undefined),
        targetUrl: body.content?.targetUrl || body.metadata?.sourceUrl,
        description: body.content?.description,
        imageUrl: finalImageUrl,
        sanitizedHtml: blockSanitizedHtml,
        standaloneHtml: blockStandaloneHtml,
        domSelector: body.content?.domSelector || body.metadata?.domCssSelector,
      },
      metadata: {
        ...(body.metadata || {}),
        sourceUrl: body.metadata?.sourceUrl || 'https://example.com',
        pageTitle: body.metadata?.pageTitle || 'Web Source',
        domainFavicon: domainFavicon,
        scrollToTextFragment: scrollToText,
        textFragment: scrollToText,
        domCssSelector: body.metadata?.domCssSelector || body.metadata?.selector,
        authorOrByline: body.metadata?.authorOrByline,
        publishedTime: body.metadata?.publishedTime,
      },
      tags: body.tags || [],
      userNotes: body.userNotes || '',
    };

    const atomId = newAtomPayload.id;

    if (AUTH_REQUIRED) {
      // Tester deployment: the clip belongs to the signed-in user and goes straight to Supabase.
      const saved = await cloud.insertAtom(auth.user.id, {
        ...newAtomPayload,
        userId: auth.user.id,
        projectId: await cloud.resolveProjectId(auth.user.id, newAtomPayload.projectId),
      } as any);
      if (!saved) {
        return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
      }
      if (saved.type === 'image' && finalImageUrl) {
        // after() keeps the function alive for the OCR once the response is sent (a plain background promise is cut off on Vercel).
        after(async () => {
          try {
            const { extractTextFromImage } = await import('@/lib/ocr/ocrService');
            const { text, confidence } = await extractTextFromImage(finalImageUrl);
            if (text) {
              await cloud.updateAtom(auth.user.id, saved.id, { content: { ...saved.content, ocrText: text, ocrConfidence: confidence } });
            }
          } catch (err) {
            console.error('Background OCR failed');
          }
        });
      }
      return NextResponse.json({ success: true, source: 'supabase', data: saved }, { status: 201 });
    }

    // Always keep local store in sync
    const local = addLocalAtom(newAtomPayload);

    // Background OCR for images
    if (newAtomPayload.type === 'image' && finalImageUrl) {
      (async () => {
        try {
          const { extractTextFromImage } = await import('@/lib/ocr/ocrService');
          // If finalImageUrl is a relative URL (e.g. from local storage), we might need an absolute URL
          // But extractTextFromImage handles base64 and absolute URLs. Assuming finalImageUrl is absolute if uploaded,
          // or base64 if not uploaded.
          const { text, confidence } = await extractTextFromImage(finalImageUrl);
          if (text) {
             const updatedContent = { ...newAtomPayload.content, ocrText: text, ocrConfidence: confidence };
             
             // Update local store
             updateLocalAtom(atomId, { content: updatedContent } as any);

             // Update Supabase
             await supabaseAdmin.from('atoms').update({ content: updatedContent }).eq('id', atomId);
          }
        } catch (err) {
          console.error('Background OCR failed:', err);
        }
      })();
    }

    // Try Supabase insert
    try {
      const { data, error } = await supabaseAdmin
        .from('atoms')
        .insert({
          id: atomId,
          project_id: newAtomPayload.projectId,
          type: newAtomPayload.type,
          title: newAtomPayload.title,
          content: newAtomPayload.content,
          metadata: newAtomPayload.metadata,
          tags: newAtomPayload.tags,
          user_notes: newAtomPayload.userNotes,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(
          {
            success: true,
            source: 'supabase',
            data: {
              id: data.id,
              projectId: data.project_id,
              userId: data.user_id,
              type: data.type,
              title: data.title,
              content: data.content,
              metadata: data.metadata,
              tags: data.tags,
              userNotes: data.user_notes,
              capturedAt: data.captured_at,
            },
          },
          { status: 201 }
        );
      }
    } catch (err: any) {
      console.warn('Supabase atom insert exception:', err?.message);
    }

    // Return locally created atom
    return NextResponse.json(
      {
        success: true,
        source: 'local_store',
        data: local,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/atoms error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create atom' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Atom ID is required' },
        { status: 400 }
      );
    }

    if (body.citation !== undefined && !isCitationRecord(body.citation)) {
      return NextResponse.json(
        { success: false, error: 'citation must be a citation record' },
        { status: 400 }
      );
    }

    if (body.pinned !== undefined && typeof body.pinned !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'pinned must be true or false' },
        { status: 400 }
      );
    }

    if (AUTH_REQUIRED) {
      const current = await cloud.getAtom(auth.user.id, body.id);
      if (!current) return NextResponse.json({ success: false, error: 'Atom not found' }, { status: 404 });
      const updateData: Record<string, any> = {};
      if (body.tags !== undefined) updateData.tags = body.tags;
      if (body.userNotes !== undefined) updateData.user_notes = body.userNotes;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.citation !== undefined || body.pinned !== undefined) {
        let metadata: any = current.metadata;
        if (body.citation !== undefined) metadata = withCitation(metadata, body.citation);
        if (body.pinned !== undefined) metadata = withPinned(metadata, body.pinned);
        updateData.metadata = metadata;
      }
      const updated = Object.keys(updateData).length ? await cloud.updateAtom(auth.user.id, body.id, updateData) : current;
      if (!updated) return NextResponse.json({ success: false, error: 'Atom not found' }, { status: 404 });
      return NextResponse.json({ success: true, source: 'supabase', data: updated });
    }

    // Try Supabase update first
    try {
      const updateData: Record<string, any> = {};
      if (body.tags !== undefined) updateData.tags = body.tags;
      if (body.userNotes !== undefined) updateData.user_notes = body.userNotes;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.citation !== undefined || body.pinned !== undefined) {
        // Citation and pin both live in the metadata JSON, so read it once and apply each change to it.
        const { data: current } = await supabaseAdmin.from('atoms').select('metadata').eq('id', body.id).single();
        let metadata = current?.metadata;
        if (body.citation !== undefined) metadata = withCitation(metadata, body.citation);
        if (body.pinned !== undefined) metadata = withPinned(metadata, body.pinned);
        updateData.metadata = metadata;
      }

      const { data, error } = await supabaseAdmin
        .from('atoms')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          source: 'supabase',
          data: {
            id: data.id,
            projectId: data.project_id,
            userId: data.user_id,
            type: data.type,
            title: data.title,
            content: data.content,
            metadata: data.metadata,
            tags: data.tags || [],
            userNotes: data.user_notes || '',
            capturedAt: data.captured_at,
          },
        });
      }
    } catch {
      // Fallback to local store
    }

    const current = getLocalAtoms().find((atom) => atom.id === body.id);
    const updated = updateLocalAtom(body.id, {
      tags: body.tags,
      userNotes: body.userNotes,
      title: body.title,
      ...((body.citation !== undefined || body.pinned !== undefined) && current
        ? {
            metadata: (() => {
              let metadata = current.metadata;
              if (body.citation !== undefined) metadata = withCitation(metadata, body.citation);
              if (body.pinned !== undefined) metadata = withPinned(metadata, body.pinned);
              return metadata;
            })(),
          }
        : {}),
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Atom not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      source: 'local_store',
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update atom' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Atom ID is required' },
        { status: 400 }
      );
    }

    if (AUTH_REQUIRED) {
      const removed = await cloud.deleteAtom(auth.user.id, id);
      if (!removed) return NextResponse.json({ success: false, error: 'Atom not found' }, { status: 404 });
      return NextResponse.json({ success: true, message: 'Atom removed successfully' });
    }

    // Try Supabase delete
    try {
      await supabaseAdmin.from('atoms').delete().eq('id', id);
    } catch {
      // Continue
    }

    deleteLocalAtom(id);

    return NextResponse.json({
      success: true,
      message: 'Atom removed successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete atom' },
      { status: 500 }
    );
  }
}
