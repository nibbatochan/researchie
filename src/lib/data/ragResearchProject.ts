import { ResearchProject, ResearchAtom } from '../types/research';

export const RAG_PROJECT: ResearchProject = {
  id: 'proj-rag-production-systems',
  userId: 'user-01',
  title: 'Production RAG Architectures & Retrieval Engineering',
  description: 'Empirical research, vector indexing benchmarks, two-stage reranking, and contextual retrieval for enterprise LLM applications.',
  color: '#325FEC', // Royal Blue accent
  tags: ['rag', 'vector-search', 'reranking', 'embeddings', 'llamaindex', 'evals'],
  atomCount: 28,
  createdAt: '2026-09-27T08:00:00.000Z',
  updatedAt: '2026-09-27T11:00:00.000Z',
};

export const RAG_ATOMS: ResearchAtom[] = [
  // ─── 1. QUOTES (10) ────────────────────────────────────────────────────────
  {
    id: 'rag-atom-001',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Anthropic on Contextual Retrieval Failure Mode',
    content: {
      rawText: 'Traditional RAG strips context when chunking documents: a chunk mentioning "the company revenue grew 3% in Q2" loses the fact that the company is ACME Corp unless context is prepended.',
      text: 'Traditional RAG strips context when chunking documents: a chunk mentioning "the company revenue grew 3% in Q2" loses the fact that the company is ACME Corp unless context is prepended.',
      markdownContent: '> "Traditional RAG strips context when chunking documents: a chunk mentioning \\"the company revenue grew 3% in Q2\\" loses the fact that the company is ACME Corp unless context is prepended."',
      targetUrl: 'https://www.anthropic.com/news/contextual-retrieval#:~:text=Traditional%20RAG%20strips%20context%20when%20chunking%20documents',
    },
    metadata: {
      sourceUrl: 'https://www.anthropic.com/news/contextual-retrieval',
      pageTitle: 'Introducing Contextual Retrieval — Anthropic',
      domainFavicon: 'https://www.anthropic.com/favicon.ico',
      scrollToTextFragment: '#:~:text=Traditional%20RAG%20strips%20context%20when%20chunking%20documents',
      textFragment: '#:~:text=Traditional%20RAG%20strips%20context%20when%20chunking%20documents',
      authorOrByline: 'Anthropic Research',
      sectionHeading: 'The Context Stripping Problem in Standard Chunking',
    },
    tags: ['contextual-retrieval', 'chunking', 'anthropic'],
    userNotes: 'Critical insight: standard naive fixed-size sliding window chunking drops document-level identifiers.',
    capturedAt: '2026-09-27T08:15:00.000Z',
  },
  {
    id: 'rag-atom-002',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Contextual Retrieval + BM25 + Rerank Accuracy Gain',
    content: {
      rawText: 'Combining Contextual Embeddings with Contextual BM25 and a Cohere Reranker reduced top-20 retrieval failure rate by 67% compared to standard embedding-only search.',
      text: 'Combining Contextual Embeddings with Contextual BM25 and a Cohere Reranker reduced top-20 retrieval failure rate by 67% compared to standard embedding-only search.',
      markdownContent: '> "Combining Contextual Embeddings with Contextual BM25 and a Cohere Reranker reduced top-20 retrieval failure rate by 67% compared to standard embedding-only search."',
      targetUrl: 'https://www.anthropic.com/news/contextual-retrieval#:~:text=Combining%20Contextual%20Embeddings%20with%20Contextual%20BM25',
    },
    metadata: {
      sourceUrl: 'https://www.anthropic.com/news/contextual-retrieval',
      pageTitle: 'Contextual Retrieval Benchmark Results — Anthropic',
      domainFavicon: 'https://www.anthropic.com/favicon.ico',
      scrollToTextFragment: '#:~:text=Combining%20Contextual%20Embeddings%20with%20Contextual%20BM25',
      textFragment: '#:~:text=Combining%20Contextual%20Embeddings%20with%20Contextual%20BM25',
      authorOrByline: 'Anthropic Research',
    },
    tags: ['hybrid-search', 'bm25', 'rerank', 'benchmarks'],
    capturedAt: '2026-09-27T08:20:00.000Z',
  },
  {
    id: 'rag-atom-003',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Lewis et al. Original RAG Formulation (NeurIPS 2020)',
    content: {
      rawText: 'We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) -- models which combine pre-trained parametric and non-parametric memory for language generation.',
      text: 'We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) -- models which combine pre-trained parametric and non-parametric memory for language generation.',
      markdownContent: '> "We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) -- models which combine pre-trained parametric and non-parametric memory for language generation."',
      targetUrl: 'https://arxiv.org/abs/2005.11401#:~:text=We%20explore%20a%20general-purpose%20fine-tuning%20recipe',
    },
    metadata: {
      sourceUrl: 'https://arxiv.org/abs/2005.11401',
      pageTitle: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (arXiv:2005.11401)',
      domainFavicon: 'https://arxiv.org/favicon.ico',
      scrollToTextFragment: '#:~:text=We%20explore%20a%20general-purpose%20fine-tuning%20recipe',
      textFragment: '#:~:text=We%20explore%20a%20general-purpose%20fine-tuning%20recipe',
      authorOrByline: 'Patrick Lewis, Ethan Perez, Aleksandara Piktus et al. (Facebook AI / UCL / NYU)',
    },
    tags: ['foundations', 'arxiv', 'parametric-memory'],
    capturedAt: '2026-09-27T08:30:00.000Z',
  },
  {
    id: 'rag-atom-004',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Lost in the Middle: Positional Degradation in Context',
    content: {
      rawText: 'Language model performance degrades significantly when the model is required to access relevant information located in the middle of a long input context. Performance is highest at the extreme beginning or end.',
      text: 'Language model performance degrades significantly when the model is required to access relevant information located in the middle of a long input context. Performance is highest at the extreme beginning or end.',
      markdownContent: '> "Language model performance degrades significantly when the model is required to access relevant information located in the middle of a long input context. Performance is highest at the extreme beginning or end."',
      targetUrl: 'https://arxiv.org/abs/2307.03172#:~:text=Language%20model%20performance%20degrades%20significantly',
    },
    metadata: {
      sourceUrl: 'https://arxiv.org/abs/2307.03172',
      pageTitle: 'Lost in the Middle: How Language Models Use Long Contexts (arXiv:2307.03172)',
      domainFavicon: 'https://arxiv.org/favicon.ico',
      scrollToTextFragment: '#:~:text=Language%20model%20performance%20degrades%20significantly',
      textFragment: '#:~:text=Language%20model%20performance%20degrades%20significantly',
      authorOrByline: 'Nelson F. Liu, Kevin Lin, John Hewitt et al. (Stanford / UC Berkeley)',
    },
    tags: ['lost-in-the-middle', 'context-window', 'reranking'],
    capturedAt: '2026-09-27T08:45:00.000Z',
  },
  {
    id: 'rag-atom-005',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Cohere on Two-Stage Retrieval Architecture',
    content: {
      rawText: 'Stage 1 uses dense vector search to maximize recall from millions of chunks down to 100 candidates in milliseconds. Stage 2 uses cross-encoder deep reranking to reorder candidates with cross-attention precision before passing top-5 into the LLM.',
      text: 'Stage 1 uses dense vector search to maximize recall from millions of chunks down to 100 candidates in milliseconds. Stage 2 uses cross-encoder deep reranking to reorder candidates with cross-attention precision before passing top-5 into the LLM.',
      markdownContent: '> "Stage 1 uses dense vector search to maximize recall from millions of chunks down to 100 candidates in milliseconds. Stage 2 uses cross-encoder deep reranking to reorder candidates with cross-attention precision before passing top-5 into the LLM."',
      targetUrl: 'https://cohere.com/blog/rerank#:~:text=Stage%201%20uses%20dense%20vector%20search',
    },
    metadata: {
      sourceUrl: 'https://cohere.com/blog/rerank',
      pageTitle: 'Boost RAG Performance with Reranking — Cohere Blog',
      domainFavicon: 'https://cohere.com/favicon.ico',
      scrollToTextFragment: '#:~:text=Stage%201%20uses%20dense%20vector%20search',
      textFragment: '#:~:text=Stage%201%20uses%20dense%20vector%20search',
      authorOrByline: 'Cohere AI Platform Team',
    },
    tags: ['two-stage', 'reranking', 'cross-encoder'],
    capturedAt: '2026-09-27T09:00:00.000Z',
  },
  {
    id: 'rag-atom-006',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Self-RAG: Adaptive On-Demand Retrieval via Reflection Tokens',
    content: {
      rawText: 'Self-RAG introduces reflection tokens (Retrieve, IsRel, IsSup, IsUse) allowing the generator to dynamically decide when to retrieve external knowledge rather than blindly querying vector storage on every turn.',
      text: 'Self-RAG introduces reflection tokens (Retrieve, IsRel, IsSup, IsUse) allowing the generator to dynamically decide when to retrieve external knowledge rather than blindly querying vector storage on every turn.',
      markdownContent: '> "Self-RAG introduces reflection tokens (Retrieve, IsRel, IsSup, IsUse) allowing the generator to dynamically decide when to retrieve external knowledge rather than blindly querying vector storage on every turn."',
      targetUrl: 'https://arxiv.org/abs/2310.11511#:~:text=Self-RAG%20introduces%20reflection%20tokens',
    },
    metadata: {
      sourceUrl: 'https://arxiv.org/abs/2310.11511',
      pageTitle: 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection (arXiv:2310.11511)',
      domainFavicon: 'https://arxiv.org/favicon.ico',
      scrollToTextFragment: '#:~:text=Self-RAG%20introduces%20reflection%20tokens',
      textFragment: '#:~:text=Self-RAG%20introduces%20reflection%20tokens',
      authorOrByline: 'Akari Asai, Zeqiu Wu, Yizhong Wang et al. (Univ of Washington / AI2)',
    },
    tags: ['self-rag', 'reflection-tokens', 'adaptive-retrieval'],
    capturedAt: '2026-09-27T09:15:00.000Z',
  },
  {
    id: 'rag-atom-007',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Pinecone on Hybrid Dense-Sparse Vector Search',
    content: {
      rawText: 'Dense embeddings capture semantic intent ("laptop running hot") while sparse BM25/SPLADE embeddings capture exact identifiers ("XPS-9520-OLED"). Convex combination (\alpha \cdot \text{dense} + (1-\alpha) \cdot \text{sparse}) outperforms either alone across every standard QA benchmark.',
      text: 'Dense embeddings capture semantic intent ("laptop running hot") while sparse BM25/SPLADE embeddings capture exact identifiers ("XPS-9520-OLED"). Convex combination (alpha * dense + (1-alpha) * sparse) outperforms either alone across every standard QA benchmark.',
      markdownContent: '> "Dense embeddings capture semantic intent (\\"laptop running hot\\") while sparse BM25/SPLADE embeddings capture exact identifiers (\\"XPS-9520-OLED\\"). Convex combination (\alpha \cdot \text{dense} + (1-\alpha) \cdot \text{sparse}) outperforms either alone across every standard QA benchmark."',
      targetUrl: 'https://www.pinecone.io/learn/hybrid-search-intro/#:~:text=Dense%20embeddings%20capture%20semantic%20intent',
    },
    metadata: {
      sourceUrl: 'https://www.pinecone.io/learn/hybrid-search-intro/',
      pageTitle: 'Hybrid Search: Combining Dense and Sparse Vectors — Pinecone Learn',
      domainFavicon: 'https://www.pinecone.io/favicon.ico',
      scrollToTextFragment: '#:~:text=Dense%20embeddings%20capture%20semantic%20intent',
      textFragment: '#:~:text=Dense%20embeddings%20capture%20semantic%20intent',
      authorOrByline: 'Pinecone Engineering',
    },
    tags: ['hybrid-search', 'splade', 'pinecone'],
    capturedAt: '2026-09-27T09:30:00.000Z',
  },
  {
    id: 'rag-atom-008',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Corrective RAG (CRAG) Fallback Mechanism',
    content: {
      rawText: 'If the retrieval evaluator scores candidate relevance below the confidence threshold, CRAG automatically triggers an external web search query reformulation rather than feeding hallucinatory context into the model.',
      text: 'If the retrieval evaluator scores candidate relevance below the confidence threshold, CRAG automatically triggers an external web search query reformulation rather than feeding hallucinatory context into the model.',
      markdownContent: '> "If the retrieval evaluator scores candidate relevance below the confidence threshold, CRAG automatically triggers an external web search query reformulation rather than feeding hallucinatory context into the model."',
      targetUrl: 'https://arxiv.org/abs/2401.15884#:~:text=If%20the%20retrieval%20evaluator%20scores',
    },
    metadata: {
      sourceUrl: 'https://arxiv.org/abs/2401.15884',
      pageTitle: 'Corrective Retrieval Augmented Generation (arXiv:2401.15884)',
      domainFavicon: 'https://arxiv.org/favicon.ico',
      scrollToTextFragment: '#:~:text=If%20the%20retrieval%20evaluator%20scores',
      textFragment: '#:~:text=If%20the%20retrieval%20evaluator%20scores',
      authorOrByline: 'Shi-Qi Yan, Jia-Chen Gu, Yun Zhu et al.',
    },
    tags: ['crag', 'guardrails', 'hallucination-prevention'],
    capturedAt: '2026-09-27T09:45:00.000Z',
  },
  {
    id: 'rag-atom-009',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'OpenAI on Chunk Size vs RAG Needle Retrieval',
    content: {
      rawText: 'Smaller chunks (256-512 tokens) consistently improve embedding cosine similarity precision for specific fact lookup, whereas larger chunks (1024-2048 tokens) are needed when questions require multi-paragraph synthesis.',
      text: 'Smaller chunks (256-512 tokens) consistently improve embedding cosine similarity precision for specific fact lookup, whereas larger chunks (1024-2048 tokens) are needed when questions require multi-paragraph synthesis.',
      markdownContent: '> "Smaller chunks (256-512 tokens) consistently improve embedding cosine similarity precision for specific fact lookup, whereas larger chunks (1024-2048 tokens) are needed when questions require multi-paragraph synthesis."',
      targetUrl: 'https://platform.openai.com/docs/guides/optimizing-llm-accuracy#:~:text=Smaller%20chunks%20consistently%20improve%20embedding',
    },
    metadata: {
      sourceUrl: 'https://platform.openai.com/docs/guides/optimizing-llm-accuracy',
      pageTitle: 'Optimizing LLM Accuracy & Retrieval Strategies — OpenAI Docs',
      domainFavicon: 'https://openai.com/favicon.ico',
      scrollToTextFragment: '#:~:text=Smaller%20chunks%20consistently%20improve%20embedding',
      textFragment: '#:~:text=Smaller%20chunks%20consistently%20improve%20embedding',
      authorOrByline: 'OpenAI Solutions Engineering',
    },
    tags: ['chunk-size', 'openai', 'embedding-tuning'],
    capturedAt: '2026-09-27T10:00:00.000Z',
  },
  {
    id: 'rag-atom-010',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'quote',
    title: 'Ragas Evaluation Framework on Faithfulness & Recall',
    content: {
      rawText: 'RAG triad evaluation measures three independent axes: Context Relevance (signal-to-noise ratio in retrieved chunks), Groundedness / Faithfulness (verifiability of answer claims against retrieved context), and Answer Relevance (direct answering of user intent).',
      text: 'RAG triad evaluation measures three independent axes: Context Relevance (signal-to-noise ratio in retrieved chunks), Groundedness / Faithfulness (verifiability of answer claims against retrieved context), and Answer Relevance (direct answering of user intent).',
      markdownContent: '> "RAG triad evaluation measures three independent axes: Context Relevance (signal-to-noise ratio in retrieved chunks), Groundedness / Faithfulness (verifiability of answer claims against retrieved context), and Answer Relevance (direct answering of user intent)."',
      targetUrl: 'https://docs.ragas.io/en/stable/concepts/metrics/index.html#:~:text=RAG%20triad%20evaluation%20measures%20three%20independent%20axes',
    },
    metadata: {
      sourceUrl: 'https://docs.ragas.io/en/stable/concepts/metrics/index.html',
      pageTitle: 'Core Metrics & The RAG Triad — Ragas Documentation',
      domainFavicon: 'https://docs.ragas.io/favicon.ico',
      scrollToTextFragment: '#:~:text=RAG%20triad%20evaluation%20measures%20three%20independent%20axes',
      textFragment: '#:~:text=RAG%20triad%20evaluation%20measures%20three%20independent%20axes',
      authorOrByline: 'Exploding Gradients / Ragas Core Team',
    },
    tags: ['ragas', 'evals', 'groundedness', 'metrics'],
    capturedAt: '2026-09-27T10:10:00.000Z',
  },

  // ─── 2. IMAGES (4) ─────────────────────────────────────────────────────────
  {
    id: 'rag-atom-011',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'image',
    title: 'Two-Stage Retrieval Pipeline Architecture Diagram',
    content: {
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
      description: 'System flow showing initial dense vector Annoy/HNSW stage filtering 10,000,000 documents to 100 candidate chunks, followed by cross-attention cross-encoder reranking down to top 5 context windows.',
    },
    metadata: {
      sourceUrl: 'https://cohere.com/blog/rerank',
      pageTitle: 'Two-Stage Retrieval Architecture Flowchart',
      domainFavicon: 'https://cohere.com/favicon.ico',
    },
    tags: ['architecture', 'two-stage', 'system-design'],
    capturedAt: '2026-09-27T09:10:00.000Z',
  },
  {
    id: 'rag-atom-012',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'image',
    title: 'Anthropic Contextual Retrieval Pipeline & Prompt Cache Flow',
    content: {
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      description: 'Document-level context prepending pipeline using Claude Prompt Caching: generating succinct 50-100 token chunk prefixes to preserve enterprise provenance without increasing token billing.',
    },
    metadata: {
      sourceUrl: 'https://www.anthropic.com/news/contextual-retrieval',
      pageTitle: 'Anthropic Contextual Prepending Flow',
      domainFavicon: 'https://www.anthropic.com/favicon.ico',
    },
    tags: ['anthropic', 'prompt-caching', 'contextual-retrieval'],
    capturedAt: '2026-09-27T08:25:00.000Z',
  },
  {
    id: 'rag-atom-013',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'image',
    title: 'HNSW vs IVF-PQ Vector Index Topology Comparison',
    content: {
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
      description: 'Visual graph topology comparing Hierarchical Navigable Small World (HNSW) multi-layer graphs versus Inverted File with Product Quantization (IVF-PQ) clustering for sub-10ms similarity queries.',
    },
    metadata: {
      sourceUrl: 'https://www.pinecone.io/learn/vector-indexes/',
      pageTitle: 'Vector Index Architectures: HNSW vs IVF-PQ — Pinecone',
      domainFavicon: 'https://www.pinecone.io/favicon.ico',
    },
    tags: ['hnsw', 'ivf-pq', 'vector-index', 'performance'],
    capturedAt: '2026-09-27T09:35:00.000Z',
  },
  {
    id: 'rag-atom-014',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'image',
    title: 'Self-RAG Reflection Token State Machine Diagram',
    content: {
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      description: 'Inference state machine transitions for [Retrieve], [IsRel], [IsSup], and [IsUse] tokens governing model branch selection and hallucination filtering.',
    },
    metadata: {
      sourceUrl: 'https://arxiv.org/abs/2310.11511',
      pageTitle: 'Self-RAG Inference Control Flow Diagram',
      domainFavicon: 'https://arxiv.org/favicon.ico',
    },
    tags: ['self-rag', 'state-machine', 'arxiv'],
    capturedAt: '2026-09-27T09:20:00.000Z',
  },

  // ─── 3. BLOCKS (5) ─────────────────────────────────────────────────────────
  {
    id: 'rag-atom-015',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'block',
    title: 'LlamaIndex RouterQueryEngine Implementation',
    content: {
      rawText: `from llama_index.core.query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.core.tools import QueryEngineTool

vector_tool = QueryEngineTool.from_defaults(
    query_engine=vector_query_engine,
    description="Useful for specific fact retrieval and verbatim needle lookup."
)
summary_tool = QueryEngineTool.from_defaults(
    query_engine=summary_query_engine,
    description="Useful for high-level synthesis across entire documents."
)

router = RouterQueryEngine(
    selector=LLMSingleSelector.from_defaults(),
    query_engine_tools=[vector_tool, summary_tool],
    verbose=True
)`,
      sanitizedHtml: `<div class="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto"><pre><code><span class="text-purple-400">from</span> llama_index.core.query_engine <span class="text-purple-400">import</span> RouterQueryEngine
<span class="text-purple-400">from</span> llama_index.core.selectors <span class="text-purple-400">import</span> LLMSingleSelector
<span class="text-purple-400">from</span> llama_index.core.tools <span class="text-purple-400">import</span> QueryEngineTool

vector_tool = QueryEngineTool.from_defaults(
    query_engine=vector_engine,
    description=<span class="text-emerald-300">"Specific fact lookup & needle retrieval"</span>
)
summary_tool = QueryEngineTool.from_defaults(
    query_engine=summary_engine,
    description=<span class="text-emerald-300">"Comprehensive multi-document synthesis"</span>
)

router = RouterQueryEngine(
    selector=LLMSingleSelector.from_defaults(),
    query_engine_tools=[vector_tool, summary_tool]
)</code></pre></div>`,
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      description: 'LlamaIndex dynamic multi-index query routing pattern',
    },
    metadata: {
      sourceUrl: 'https://docs.llamaindex.ai/en/stable/module_guides/querying/router_query_engine/',
      pageTitle: 'Router Query Engine — LlamaIndex Documentation',
      domainFavicon: 'https://docs.llamaindex.ai/favicon.ico',
      domCssSelector: 'div.language-python.highlighter-rouge',
    },
    tags: ['llamaindex', 'python', 'routing', 'code'],
    capturedAt: '2026-09-27T08:50:00.000Z',
  },
  {
    id: 'rag-atom-016',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'block',
    title: 'Reciprocal Rank Fusion (RRF) Formula & Algorithm',
    content: {
      rawText: `def reciprocal_rank_fusion(dense_ranks, sparse_ranks, k=60):
    """
    RRF Score formula: RRF_score(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)}
    k=60 is the empirical constant from Cormack et al. (SIGIR 2009).
    """
    rrf_scores = {}
    for doc_id, rank in dense_ranks.items():
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (k + rank))
    for doc_id, rank in sparse_ranks.items():
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (k + rank))
    return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)`,
      sanitizedHtml: `<div class="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto"><pre><code><span class="text-blue-400">def</span> <span class="text-yellow-300">reciprocal_rank_fusion</span>(dense_ranks, sparse_ranks, k=<span class="text-orange-400">60</span>):
    <span class="text-slate-400"># RRF Score: sum(1 / (k + rank_m(d)))</span>
    rrf_scores = {}
    <span class="text-purple-400">for</span> doc_id, rank <span class="text-purple-400">in</span> dense_ranks.items():
        rrf_scores[doc_id] = rrf_scores.get(doc_id, <span class="text-orange-400">0.0</span>) + (<span class="text-orange-400">1.0</span> / (k + rank))
    <span class="text-purple-400">for</span> doc_id, rank <span class="text-purple-400">in</span> sparse_ranks.items():
        rrf_scores[doc_id] = rrf_scores.get(doc_id, <span class="text-orange-400">0.0</span>) + (<span class="text-orange-400">1.0</span> / (k + rank))
    <span class="text-purple-400">return</span> sorted(rrf_scores.items(), key=<span class="text-blue-400">lambda</span> x: x[<span class="text-orange-400">1</span>], reverse=<span class="text-orange-400">True</span>)</code></pre></div>`,
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      description: 'Standard implementation of Reciprocal Rank Fusion for hybrid retrieval',
    },
    metadata: {
      sourceUrl: 'https://weaviate.io/blog/hybrid-search-fusion',
      pageTitle: 'Hybrid Search and Rank Fusion — Weaviate Blog',
      domainFavicon: 'https://weaviate.io/favicon.ico',
      domCssSelector: 'pre.highlight',
    },
    tags: ['rrf', 'algorithms', 'hybrid-search'],
    capturedAt: '2026-09-27T09:05:00.000Z',
  },
  {
    id: 'rag-atom-017',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'block',
    title: 'Anthropic Contextual Chunk Prompt Specification',
    content: {
      rawText: `<document>
{{WHOLE_DOCUMENT}}
</document>
Here is the chunk we want to situate within the whole document:
<chunk>
{{CHUNK_CONTENT}}
</chunk>
Please give a short, succinct context (1-2 sentences) to situate this chunk within the overall document for the purpose of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`,
      sanitizedHtml: `<div class="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto"><pre><code>&lt;document&gt;
{{WHOLE_DOCUMENT}}
&lt;/document&gt;
Here is the chunk we want to situate within the whole document:
&lt;chunk&gt;
{{CHUNK_CONTENT}}
&lt;/chunk&gt;
Please give a short, succinct context (1-2 sentences) to situate 
this chunk within the overall document for search retrieval. 
Answer only with the succinct context and nothing else.</code></pre></div>`,
      imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      description: 'Prompt template used to generate document-grounded chunk prefixes with Claude 3.5 Haiku',
    },
    metadata: {
      sourceUrl: 'https://www.anthropic.com/news/contextual-retrieval',
      pageTitle: 'Anthropic Contextual Prompt Template',
      domainFavicon: 'https://www.anthropic.com/favicon.ico',
      domCssSelector: 'div.code-block',
    },
    tags: ['prompts', 'anthropic', 'contextual-retrieval'],
    capturedAt: '2026-09-27T08:35:00.000Z',
  },
  {
    id: 'rag-atom-018',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'block',
    title: 'FastAPI Streaming RAG Endpoint with Grounding Citations',
    content: {
      rawText: `@app.post("/v1/rag/chat")
async def rag_stream(req: RAGQueryRequest):
    # 1. Hybrid Retrieval & Rerank
    candidates = vector_db.hybrid_search(req.query, top_k=50)
    top_chunks = reranker.rerank(req.query, candidates, top_n=5)
    
    # 2. Build Context String with explicit [Doc ID, Page] tags
    context_str = "\\n\\n".join([f"[{c.doc_id}, p.{c.page}]: {c.text}" for c in top_chunks])
    
    # 3. Stream LLM completion with citation metadata
    return StreamingResponse(
        stream_llm(req.query, context_str, top_chunks),
        media_type="text/event-stream"
    )`,
      sanitizedHtml: `<div class="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto"><pre><code><span class="text-blue-400">@app.post</span>(<span class="text-emerald-300">"/v1/rag/chat"</span>)
<span class="text-purple-400">async def</span> <span class="text-yellow-300">rag_stream</span>(req: RAGQueryRequest):
    candidates = vector_db.hybrid_search(req.query, top_k=<span class="text-orange-400">50</span>)
    top_chunks = reranker.rerank(req.query, candidates, top_n=<span class="text-orange-400">5</span>)
    
    context_str = <span class="text-emerald-300">"\\n\\n"</span>.join([f<span class="text-emerald-300">"[{c.doc_id}, p.{c.page}]: {c.text}"</span> <span class="text-purple-400">for</span> c <span class="text-purple-400">in</span> top_chunks])
    <span class="text-purple-400">return</span> StreamingResponse(
        stream_llm(req.query, context_str, top_chunks),
        media_type=<span class="text-emerald-300">"text/event-stream"</span>
    )</code></pre></div>`,
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      description: 'Production backend architecture pattern for SSE citation streaming',
    },
    metadata: {
      sourceUrl: 'https://fastapi.tiangolo.com/',
      pageTitle: 'Streaming Responses — FastAPI Documentation',
      domainFavicon: 'https://fastapi.tiangolo.com/img/favicon.png',
    },
    tags: ['fastapi', 'streaming', 'citations', 'backend'],
    capturedAt: '2026-09-27T10:15:00.000Z',
  },
  {
    id: 'rag-atom-019',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'block',
    title: 'HNSW Index Construction Parameters (pgvector / Qdrant)',
    content: {
      rawText: `CREATE INDEX ON document_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (
    m = 16,             -- Max outgoing edges per node (16-64)
    ef_construction = 64 -- Search depth during build (64-200)
);
-- At query time:
SET hnsw.ef_search = 40; -- Tradeoff between latency and recall`,
      sanitizedHtml: `<div class="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto"><pre><code><span class="text-purple-400">CREATE INDEX ON</span> document_embeddings 
<span class="text-purple-400">USING</span> hnsw (embedding vector_cosine_ops)
<span class="text-purple-400">WITH</span> (
    m = <span class="text-orange-400">16</span>,              <span class="text-slate-400">-- max edges per node</span>
    ef_construction = <span class="text-orange-400">64</span> <span class="text-slate-400">-- build search depth</span>
);
<span class="text-purple-400">SET</span> hnsw.ef_search = <span class="text-orange-400">40</span>;   <span class="text-slate-400">-- query time recall tradeoff</span></code></pre></div>`,
      imageUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80',
      description: 'SQL DDL for tuning pgvector HNSW indexing parameters for high-throughput production workloads',
    },
    metadata: {
      sourceUrl: 'https://github.com/pgvector/pgvector',
      pageTitle: 'pgvector HNSW Index Configuration Guide',
      domainFavicon: 'https://github.githubassets.com/favicons/favicon.png',
      domCssSelector: 'div.highlight-source-sql',
    },
    tags: ['pgvector', 'hnsw', 'sql', 'indexing'],
    capturedAt: '2026-09-27T09:40:00.000Z',
  },

  // ─── 4. LINKS (4) ──────────────────────────────────────────────────────────
  {
    id: 'rag-atom-020',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'link',
    title: 'Anthropic Engineering: Contextual Retrieval Guide',
    content: {
      targetUrl: 'https://www.anthropic.com/news/contextual-retrieval',
      description: 'Definitive guide on eliminating context loss in enterprise RAG through contextual embeddings, prompt caching, and BM25 hybrid ranking.',
    },
    metadata: {
      sourceUrl: 'https://www.anthropic.com/news/contextual-retrieval',
      pageTitle: 'Introducing Contextual Retrieval — Anthropic',
      domainFavicon: 'https://www.anthropic.com/favicon.ico',
    },
    tags: ['anthropic', 'guide', 'best-practices'],
    capturedAt: '2026-09-27T08:10:00.000Z',
  },
  {
    id: 'rag-atom-021',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'link',
    title: 'LlamaIndex Production Deployment Documentation',
    content: {
      targetUrl: 'https://docs.llamaindex.ai/en/stable/optimizing/production_rag/',
      description: 'Architectural checklist covering query transformation, sub-question decomposition, auto-merging retrievers, and sentence window chunking.',
    },
    metadata: {
      sourceUrl: 'https://docs.llamaindex.ai/en/stable/optimizing/production_rag/',
      pageTitle: 'Building Production RAG — LlamaIndex',
      domainFavicon: 'https://docs.llamaindex.ai/favicon.ico',
    },
    tags: ['llamaindex', 'production', 'orchestration'],
    capturedAt: '2026-09-27T08:40:00.000Z',
  },
  {
    id: 'rag-atom-022',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'link',
    title: 'Pinecone Vector Database Indexing Whitepaper',
    content: {
      targetUrl: 'https://www.pinecone.io/learn/vector-indexes/',
      description: 'Comprehensive mathematical breakdown of inverted index quantization, random projection, and graph-based indexing algorithms.',
    },
    metadata: {
      sourceUrl: 'https://www.pinecone.io/learn/vector-indexes/',
      pageTitle: 'Vector Indexes: The Complete Guide — Pinecone',
      domainFavicon: 'https://www.pinecone.io/favicon.ico',
    },
    tags: ['pinecone', 'indexing', 'algorithms'],
    capturedAt: '2026-09-27T09:25:00.000Z',
  },
  {
    id: 'rag-atom-023',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'link',
    title: 'Ragas: Automated Evaluation of RAG Pipelines',
    content: {
      targetUrl: 'https://docs.ragas.io/en/stable/',
      description: 'Open-source framework for unit testing LLM applications with LLM-assisted metrics for precision, groundedness, and noise robustness.',
    },
    metadata: {
      sourceUrl: 'https://docs.ragas.io/en/stable/',
      pageTitle: 'Ragas Documentation — Evaluation for RAG',
      domainFavicon: 'https://docs.ragas.io/favicon.ico',
    },
    tags: ['evals', 'ragas', 'continuous-integration'],
    capturedAt: '2026-09-27T10:05:00.000Z',
  },

  // ─── 5. NOTES (3) ──────────────────────────────────────────────────────────
  {
    id: 'rag-atom-024',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'note',
    title: 'Synthesis: The 4 Failure Modes of Naive RAG',
    content: {
      markdownContent: `### Analysis of 4 Systematic Failure Modes in Production RAG

1. **Context Loss During Chunking:** Fixed-token windows (e.g. 512 chars) split paragraphs mid-sentence and sever pronouns from their antecedent nouns. *Fix: Contextual Prepending or Hierarchical / Parent-Child Retrievers.*
2. **The "Lost in the Middle" Effect:** Even 1M-token context LLMs exhibit a U-shaped attention curve where documents situated in the middle context receive ~30% lower recall. *Fix: Re-ranking top candidates to positions 1 and 2.*
3. **Keyword Blindness:** Pure dense vector search fails on alphanumeric identifiers (e.g. error code \`ERR_409_CONFLICT\` or SKU numbers). *Fix: Hybrid Dense + BM25 Sparse Search with RRF.*
4. **Hallucination on Irrelevant Context:** LLMs attempt to answer even when the retrieved context has 0% relevance to the query. *Fix: CRAG evaluator thresholding and prompt-enforced refusal.*`,
    },
    metadata: {
      sourceUrl: 'https://internal-research.local/notes/rag-failure-modes',
      pageTitle: 'Field Synthesis: Production RAG Failure Taxonomy',
      domainFavicon: 'https://www.google.com/s2/favicons?domain=anthropic.com&sz=64',
    },
    tags: ['synthesis', 'failure-modes', 'system-design'],
    userNotes: 'Core theoretical foundation for our architecture decisions.',
    capturedAt: '2026-09-27T10:20:00.000Z',
  },
  {
    id: 'rag-atom-025',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'note',
    title: 'Comparison Matrix: Dense Vector vs Hybrid vs Two-Stage Rerank',
    content: {
      markdownContent: `| Strategy | P95 Latency | MRR@10 | Keyword Precision | Token Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Dense Only (HNSW)** | 12ms | 0.68 | Low | Baseline |
| **Sparse Only (BM25)** | 6ms | 0.54 | High | Baseline |
| **Hybrid (Dense + BM25)** | 18ms | 0.79 | Very High | +5% storage |
| **Hybrid + Cohere Rerank** | 85ms | **0.91** | **Very High** | +$0.001/query |

**Key Takeaway:** Two-stage retrieval adds ~65ms of latency but delivers a +15% improvement in Mean Reciprocal Rank (MRR), making it non-negotiable for customer-facing production systems.`,
    },
    metadata: {
      sourceUrl: 'https://internal-research.local/notes/benchmark-matrix',
      pageTitle: 'Benchmark Matrix — Retrieval Strategies',
      domainFavicon: 'https://www.google.com/s2/favicons?domain=cohere.com&sz=64',
    },
    tags: ['benchmarks', 'mrr', 'latency', 'tradeoffs'],
    capturedAt: '2026-09-27T10:30:00.000Z',
  },
  {
    id: 'rag-atom-026',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'note',
    title: 'Checklist for Production RAG Deployment',
    content: {
      markdownContent: `### Pre-Flight Production Deployment Checklist

- [x] **Chunking:** Chunk size set to 400-600 tokens with 50-token overlap.
- [x] **Metadata Enrichment:** Document title, section header, and updated timestamp embedded in chunk header.
- [x] **Vector Database:** HNSW index configured with \`m=16\`, \`ef_construction=64\`, \`ef_search=40\`.
- [x] **Hybrid Fusion:** RRF constant set to \(k=60\).
- [x] **Reranking:** Cross-encoder reranks top 50 candidates down to top 5.
- [x] **Citation Anchors:** Every retrieved sentence retains source URL and \`#:~:text=\` fragment.
- [x] **Continuous Evaluation:** Ragas CI pipeline checks faithfulness threshold (\(\ge 0.85\)) on PRs.`,
    },
    metadata: {
      sourceUrl: 'https://internal-research.local/notes/rag-checklist',
      pageTitle: 'RAG Production Readiness Checklist',
      domainFavicon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=64',
    },
    tags: ['checklist', 'devops', 'production-readiness'],
    capturedAt: '2026-09-27T10:40:00.000Z',
  },

  // ─── 6. TEXT (2) ───────────────────────────────────────────────────────────
  {
    id: 'rag-atom-027',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'text',
    title: 'The Evolution from RAG 1.0 (Naive) to RAG 3.0 (Agentic)',
    content: {
      text: 'First-generation RAG systems relied on static chunking and single-pass semantic similarity matching. This proved fragile in production environments with complex domain vocabularies. Second-generation Advanced RAG introduced pre-retrieval query rewriting, sentence-window retrieval, and post-retrieval reranking. The current frontier—Modular & Agentic RAG—treats retrieval as a dynamic tool in an iterative reasoning loop, allowing models to query multiple data stores, verify retrieved evidence against internal consistency constraints, and reformulate queries upon detecting insufficient signal.',
      description: 'Historical progression and paradigm shift in knowledge-augmented LLM architectures from 2020 to 2026.',
    },
    metadata: {
      sourceUrl: 'https://arxiv.org/abs/2312.10997',
      pageTitle: 'Retrieval-Augmented Generation for Large Language Models: A Survey (arXiv:2312.10997)',
      domainFavicon: 'https://arxiv.org/favicon.ico',
      authorOrByline: 'Yunfan Gao, Yun Xiong, Xinyu Gao et al.',
    },
    tags: ['agentic-rag', 'survey', 'evolution'],
    capturedAt: '2026-09-27T10:45:00.000Z',
  },
  {
    id: 'rag-atom-028',
    projectId: 'proj-rag-production-systems',
    userId: 'user-01',
    type: 'text',
    title: 'Contextual Vector Embeddings vs Standard BGE/OpenAI Embeddings',
    content: {
      text: 'Standard text embedding models (such as text-embedding-3-large or BAAI/bge-large-en-v1.5) encode only the lexical and semantic content within the immediate chunk boundary. When document titles or parent section contexts are prepended prior to vector calculation (Anthropic Contextual Embedding method), the resulting embedding vector shifts into the conceptual subspace of the entire corpus topic, eliminating false-positive matches across distinct chapters of technical documentation.',
      description: 'Technical explanation of how contextual embedding vectors prevent false positive semantic collisions.',
    },
    metadata: {
      sourceUrl: 'https://huggingface.co/blog/contextual-embeddings',
      pageTitle: 'Understanding Contextual Vector Representations — Hugging Face Blog',
      domainFavicon: 'https://huggingface.co/favicon.ico',
      authorOrByline: 'Hugging Face NLP Research Team',
    },
    tags: ['embeddings', 'huggingface', 'vector-spaces'],
    capturedAt: '2026-09-27T10:50:00.000Z',
  },
];
