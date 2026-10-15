import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { store } from '@/lib/data/store';
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
  const auth = await authorize(request);
  if (auth.response) return auth.response;
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

    // 2. Fetch the user's clips and score them in memory: cosine similarity plus a lexical boost. (An earlier
    // version asked Supabase's pgvector for matches first; that was not scoped to a user and is gone.)
    const allAtoms: any[] = (await store.listAtoms(auth.user.id, projectId || undefined)).map((a) => ({ ...a, embedding: null }));

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
