import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getLocalAtoms } from '@/lib/data/researchStore';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai/embeddings';

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
    const { query, projectId, threshold = 0.1, limit = 20 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query string is required' },
        { status: 400 }
      );
    }

    // 1. Generate 768-d embedding for search query
    const queryVector = await generateEmbedding(query);

    // 2. Try Supabase pgvector RPC
    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('match_atoms', {
        query_embedding: queryVector,
        match_threshold: threshold,
        match_count: limit,
        p_project_id: projectId || null,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return NextResponse.json({
          success: true,
          source: 'supabase_pgvector',
          query,
          results: rpcData.map((a: any) => ({
            id: a.id,
            projectId: a.project_id,
            type: a.type,
            title: a.title,
            content: a.content || {},
            metadata: a.metadata || {},
            tags: a.tags || [],
            userNotes: a.user_notes || '',
            capturedAt: a.captured_at,
            similarity: a.similarity,
          })),
        });
      }
    } catch {
      // Fallback
    }

    // 3. Fallback: Fetch atoms and compute in-memory cosine similarity + lexical matching
    let allAtoms: any[] = [];
    try {
      let q = supabaseAdmin.from('atoms').select('*');
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (!error && data) {
        allAtoms = data.map((a) => {
          let parsedTags: string[] = [];
          if (Array.isArray(a.tags)) {
            parsedTags = a.tags;
          } else if (typeof a.tags === 'string') {
            parsedTags = a.tags.split(/[\s,]+/).filter(Boolean);
          }

          let parsedEmbedding: number[] | null = null;
          if (Array.isArray(a.embedding) && a.embedding.length === 768) {
            parsedEmbedding = a.embedding;
          } else if (typeof a.embedding === 'string') {
            try {
              const parsed = JSON.parse(a.embedding);
              if (Array.isArray(parsed) && parsed.length === 768) {
                parsedEmbedding = parsed;
              }
            } catch {}
          }

          return {
            id: a.id,
            projectId: a.project_id,
            type: a.type,
            title: a.title,
            content: a.content || {},
            metadata: a.metadata || {},
            tags: parsedTags,
            userNotes: a.user_notes || '',
            capturedAt: a.captured_at,
            embedding: parsedEmbedding,
          };
        });
      }
    } catch {
      // local store fallback
    }

    const local = getLocalAtoms(projectId);
    const missingLocal = local.filter((la) => !allAtoms.some((da) => da.id === la.id));
    allAtoms = [...allAtoms, ...missingLocal];

    const STOP_WORDS = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'when', 'at', 'by',
      'for', 'with', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
      'over', 'under', 'again', 'further', 'once', 'here', 'there', 'all', 'any',
      'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
      'just', 'should', 'now', 'what', 'which', 'who', 'whom', 'this', 'that',
      'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would',
      'could', 'how', 'why', 'tell', 'me', 'explain', 'describe', 'summarize',
      'find', 'show', 'give', 'list', 'please', 'details'
    ]);

    const lowerQuery = query.toLowerCase();
    const cleanTokens = lowerQuery
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

    const scored = await Promise.all(
      allAtoms.map(async (atom) => {
        const tagList = Array.isArray(atom.tags) 
          ? atom.tags 
          : typeof atom.tags === 'string' 
          ? [atom.tags] 
          : [];

        const atomText = [
          atom.title,
          atom.content?.rawText || atom.content?.text || '',
          atom.content?.description || '',
          atom.content?.ocrText || '',
          atom.userNotes || '',
          tagList.join(' '),
        ].join(' ');

        // Compute or retrieve vector
        let similarity = 0;
        if (atom.embedding && Array.isArray(atom.embedding) && atom.embedding.length === 768) {
          similarity = cosineSimilarity(queryVector, atom.embedding);
        } else {
          const atomVec = await generateEmbedding(atomText);
          similarity = cosineSimilarity(queryVector, atomVec);
        }

        // Add lexical boost only for non-stopword keyword matches
        let matchedKeywords = 0;
        let titleMatches = 0;
        const lowerAtomText = atomText.toLowerCase();
        const lowerTitle = (atom.title || '').toLowerCase();

        for (const token of cleanTokens) {
          if (lowerTitle.includes(token)) {
            titleMatches++;
          }
          if (lowerAtomText.includes(token)) {
            matchedKeywords++;
          }
        }

        const lexicalScore = cleanTokens.length > 0
          ? (matchedKeywords / cleanTokens.length) * 0.45 + (titleMatches > 0 ? 0.2 : 0)
          : 0;

        const finalScore = cleanTokens.length > 0 && matchedKeywords === 0
          ? similarity * 0.25 // Heavy penalty if none of user's search keywords appear in atom
          : Math.min(1.0, similarity * 0.4 + lexicalScore);

        return {
          ...atom,
          tags: tagList,
          similarity: Number(finalScore.toFixed(4)),
        };
      })
    );

    const sorted = scored
      .filter((a) => a.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      source: 'semantic_fallback',
      query,
      results: sorted,
    });
  } catch (error: any) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Semantic search failed' },
      { status: 500 }
    );
  }
}
