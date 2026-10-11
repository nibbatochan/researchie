import { ResearchDocument } from '../types/research';
import fs from 'fs';
import path from 'path';

export const INITIAL_DOCUMENTS: ResearchDocument[] = [
  {
    id: 'doc-just-enough-research',
    projectId: 'proj-ai-main',
    title: 'Just Enough Research — Erika Hall',
    filename: 'just-enough-research.pdf',
    author: 'Erika Hall',
    publicationDate: '2024 Edition',
    fileSize: '2.6 MB',
    fileUrl: '/fixtures/just-enough-research.pdf',
    totalPages: 163,
    uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    tags: ['research-methods', 'design-strategy', 'user-interviews', 'mental-models'],
    pages: [],
  },
  {
    id: 'doc-rag-arch-2026',
    projectId: 'proj-rag-arch-2026',
    title: 'Adaptive Retrieval-Augmented Generation & Neural Reranking Architecture',
    filename: 'adaptive_rag_neural_reranking_2026.pdf',
    author: 'Applied AI & Vector Systems Laboratory',
    publicationDate: 'September 2026',
    fileSize: '2.8 MB',
    totalPages: 4,
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['rag', 'vector-search', 'cross-encoders', 'hybrid-retrieval'],
    pages: [
      {
        pageNumber: 1,
        title: 'Section 1: Abstract & Dual-Encoder Limitations',
        content: `Abstract:
Standard single-pass Retrieval-Augmented Generation (RAG) architectures exhibit critical failure modes when queries require multi-hop factual aggregation across disparate documents. In this paper, we evaluate adaptive retrieval strategies combining dense HNSW vector index lookups with sparse BM25 token frequencies and cross-encoder neural rerankers.

1. Introduction & Theoretical Motivation:
Dual-encoder models map queries and documents into a shared latent space independently, optimizing for maximum cosine similarity. While computationally efficient, this decoupled projection loses fine-grained lexical signals and exact numerical constraints. We demonstrate that hybrid fusion (RRF) with reciprocal rank weights (k=60) recovers 94.2% of lost keyword precision.

Field Evaluation Pipeline:
We benchmarked 100,000 synthetic multi-turn research queries across a 50M-document corpus. Our findings show that self-reflective query rewriting prior to vector search reduces hallucination rates from 18.4% down to 2.1%.`,
        highlights: [
          {
            id: 'hl-rag-1',
            text: 'Self-reflective query rewriting prior to vector search reduces hallucination rates from 18.4% down to 2.1%.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 2,
        title: 'Section 2: Hierarchical Chunking & Embedding Geometries',
        content: `2. Chunking Granularity vs. Context Window:
Fixed-length sliding windows (e.g. 512 tokens with 50-token overlap) split semantic clauses across boundaries, creating orphan pronouns and truncated sentences. We implement AST-aware hierarchical chunking:
- Parent Chunk: 2,048 tokens preserving broader conceptual narrative.
- Child Chunks: 256 tokens indexing localized factual claims and code blocks.

Table 1: Retrieval Precision & Mean Reciprocal Rank (MRR@10)
-----------------------------------------------------------------------------
Retriever Strategy        MRR@10      Recall@5     Latency (P95)
-----------------------------------------------------------------------------
Dense Cosine Only         0.642       72.8%        14.2 ms
Sparse BM25 Only          0.589       68.1%        6.4 ms
Hybrid RRF (Dense+BM25)   0.814       89.4%        18.6 ms
Hybrid + Cross-Encoder    0.928       96.2%        42.8 ms
-----------------------------------------------------------------------------`,
        highlights: [
          {
            id: 'hl-rag-2',
            text: 'Hybrid + Cross-Encoder achieves 0.928 MRR@10 and 96.2% Recall@5 with 42.8ms P95 latency.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 3,
        title: 'Section 3: Graph RAG & Cognee Knowledge Triplet Extraction',
        content: `3. Graph Integration & Entity Triplet Reranking:
To resolve relational queries across heterogeneous document collections, vector search is augmented with Cognee-derived entity-relation graphs. Nodes represent extracted entities (e.g., Models, Metrics, Datasets) connected via directed semantic edges.

Graph-Vector Hybrid Walk:
1. Seed nodes are identified via dense embedding similarity.
2. 2-hop neighborhood subgraphs are expanded and traversed.
3. Subgraph triplets are linearized and prepended to prompt context.

This relational augmentation improves answer synthesis accuracy by 34.6% on comparative queries involving hardware benchmarks.`,
        highlights: [
          {
            id: 'hl-rag-3',
            text: 'Relational augmentation improves answer synthesis accuracy by 34.6% on comparative queries.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 4,
        title: 'Section 4: Production Deployment & Recommendations',
        content: `4. Architectural Guidelines for Production:
1. Pre-warm vector cache for top-1,000 frequent user query clusters.
2. Standardize on FP8 quantization for cross-encoder rerankers to maintain sub-50ms latency.
3. Implement confidence gating: if top-1 reranker score is below 0.45, trigger web-fallback or ask user for clarification.

Acknowledgments:
Research supported by the Open Vector Retrieval Foundation and benchmark datasets archived in the Researchie Repository.`,
        highlights: [],
      },
    ],
  },
  {
    id: 'doc-ai-inference-economics',
    projectId: 'proj-ai-main',
    title: 'GPU Cluster Architecture and Latency Curves in High-Throughput LLM Serving',
    filename: 'inference_economics_gpu_clusters_2024.pdf',
    author: 'Applied Systems & Inference Architecture Research Group',
    publicationDate: 'April 2024',
    fileSize: '1.8 MB',
    totalPages: 3,
    uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    tags: ['gpu-clusters', 'token-economics', 'vllm', 'h100-margins'],
    pages: [
      {
        pageNumber: 1,
        title: 'Section 1: KV-Cache Bottlenecks & Memory Bandwidth',
        content: `Abstract:
As large language model context windows scale to 128k+ tokens, memory bandwidth during autoregressive decoding dominates cost per million tokens. We profile Tensor Parallel (TP=8) clusters across NVIDIA H100 (SXM5 80GB) and B200 hardware architectures under sustained 500 QPS production traffic.

1. Memory Subsystem & PagedAttention:
The primary bottleneck in token generation is the memory-bound GEMV operation during KV-cache retrieval. In standard 70B parameter models (16-bit precision), each 4,000-token prompt consumes 2.1 GB of KV-cache memory per sequence. PagedAttention eliminates external memory fragmentation, improving effective GPU utilization by 3.8x.`,
        highlights: [
          {
            id: 'hl-ai-1',
            text: 'In standard 70B parameter models (16-bit precision), each 4,000-token prompt consumes 2.1 GB of KV-cache memory per sequence.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 2,
        title: 'Section 2: Cost Modeling & TTFT vs. ITL Trade-offs',
        content: `2. Cost Comparison Matrix (Per 1M Output Tokens):
- H100 SXM5 Cluster: $0.72 per 1M output tokens (Time to First Token: 82ms, Inter-Token Latency: 14.2ms)
- B200 NVLink 5 Cluster: $0.28 per 1M output tokens (Time to First Token: 34ms, Inter-Token Latency: 5.8ms)
- FP8 Quantized Serving: Yields 42% cost reduction with <0.3% degradation in MMLU benchmark accuracy.

Speculative Decoding Gains:
Employing a small draft model (1B parameter) paired with an 8-way verification step achieves 2.4x throughput speedup on chat workloads with minimal speculative rejection overhead.`,
        highlights: [
          {
            id: 'hl-ai-2',
            text: 'B200 NVLink 5 Cluster yields $0.28 per 1M output tokens with 34ms TTFT and 5.8ms ITL.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 3,
        title: 'Section 3: Conclusion & Architectural Recommendations',
        content: `3. Architectural Recommendations:
1. Standardize on FP8/FP4 mixed precision for production routing.
2. Implement cross-datacenter prefill and decode disaggregation to decouple latency-sensitive prefill bursts from continuous token generation.
3. Reserve 25% KV-cache headroom for bursty multi-turn conversation sessions.`,
        highlights: [],
      },
    ],
  },
  {
    id: 'doc-dots-openai-spec',
    projectId: 'proj-always-on-agents-dots',
    title: 'OpenAI Dots: Technical Specification & Cloud Sandbox Architecture',
    filename: 'openai_dots_architecture_spec_2026.pdf',
    author: 'OpenAI Astra Systems Team',
    publicationDate: 'September 2026',
    fileSize: '1.4 MB',
    totalPages: 3,
    uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    tags: ['dots', 'openai', 'gpt-6-astra', 'sandboxed-vm', 'connectors'],
    pages: [
      {
        pageNumber: 1,
        title: 'Section 1: GPT-6 Astra Execution Engine & Sandboxed Cloud VMs',
        content: `Abstract:
Announced at DevDay on September 29, 2026, OpenAI Dots is an always-on personal agent system engineered to pursue daily life objectives autonomously across a 24/7 lifecycle. Dots is driven by GPT-6 Astra, an agentic reasoning model optimized for asynchronous task execution and tool chaining.

1. Cloud Execution Topology:
Unlike client-side browser extensions, each Dots instance executes inside an isolated cloud sandbox running an ephemeral Ubuntu virtual machine with a headless Chromium browser. State persistence is maintained via an encrypted SQLite log that tracks task states, pending callbacks, and credentials. Dots operates continuously without requiring user devices to remain connected or powered on.`,
        highlights: [
          {
            id: 'hl-dots-1',
            text: 'OpenAI Dots is driven by GPT-6 Astra, running inside an isolated cloud sandbox with headless Chromium.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 2,
        title: 'Section 2: Integration Ecosystem & Enterprise Pricing',
        content: `2. Application Connectors & Ecosystem:
At launch, OpenAI Dots features native integrations with over 4,000 web applications and enterprise tools via OAuth 2.1 protocols, including Google Workspace, Slack, Notion, Asana, and GitHub.

Commercial Availability & Tiers:
Dots is bundled into ChatGPT Pro ($200 per month) and ChatGPT Business Premium accounts. Dedicated compute units are provisioned per subscriber to ensure dedicated background capacity without queue contention. Standard free-tier and ChatGPT Plus ($20/month) plans do not include autonomous background execution capabilities.`,
        highlights: [
          {
            id: 'hl-dots-2',
            text: 'Dots is bundled into ChatGPT Pro ($200 per month) and ChatGPT Business Premium accounts.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 3,
        title: 'Section 3: Security Guardrails & Financial Checkpoints',
        content: `3. Autonomous Risk Controls & Human Authorization:
To prevent unauthorized transactions or irreversible real-world harm, Dots enforces strict behavioral guardrails:
- Financial Threshold: Any financial transaction exceeding $50 requires explicit human biometric authorization via mobile push confirmation.
- Destructive Actions: Actions involving database deletions, account closures, or external communications to new contacts pause execution until signed off.
- Kill-Switch Protocols: A unified global halt API allows users to immediately freeze all active sub-agents and terminate VM containers within 400 milliseconds.`,
        highlights: [
          {
            id: 'hl-dots-3',
            text: 'Any financial transaction exceeding $50 requires explicit human biometric authorization.',
            color: '#325FEC',
          },
        ],
      },
    ],
  },
  {
    id: 'doc-multion-vision-whitepaper',
    projectId: 'proj-always-on-agents-dots',
    title: 'MultiOn Autonomous Action Engine & AGI-0 Mobile Benchmarks',
    filename: 'multion_agi0_mobile_action_engine.pdf',
    author: 'Div Garg & MultiOn Research',
    publicationDate: 'August 2026',
    fileSize: '1.1 MB',
    totalPages: 2,
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['multion', 'agi-0', 'computer-use', 'vision-agent', 'benchmarks'],
    pages: [
      {
        pageNumber: 1,
        title: 'Section 1: Vision-First Web Interaction vs. DOM Selectors',
        content: `Abstract:
Traditional browser automation frameworks rely on brittle CSS selectors and DOM xpath trees that fail when websites push A/B layout experiments or obfuscate class names. MultiOn replaces DOM parsing with a vision-first multimodal neural proxy that interprets web pages as visual screenshots, identifying interactive coordinates and form inputs directly in pixel space.

1. Robustness Against Layout Drift:
By treating the web interface as a visual canvas rather than an HTML hierarchy, MultiOn maintains an 89.4% task completion rate across consumer checkout funnels (e.g. dynamic flight seat selection, reservation platforms) where conventional script scrapers degrade below 32%.`,
        highlights: [
          {
            id: 'hl-multion-1',
            text: 'MultiOn maintains an 89.4% task completion rate across consumer checkout funnels using vision-first interaction.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 2,
        title: 'Section 2: AGI-0 Mobile Agent & Repeat Consumer Automation',
        content: `2. AGI-0 Background Mobile Operations:
MultiOn deployed the AGI-0 mobile agent capable of operating directly on iOS and Android environments. Key autonomous consumer workflows include:
- Food Delivery: Periodic repeat grocery and food ordering through DoorDash based on calendar schedules and pantry inventory.
- Dining Reservations: Continuous background monitoring of high-demand OpenTable reservation slots, booking tables the instant availability appears.
- Captcha Resolution: Automated visual solving of modern puzzle Captchas with zero manual intervention.`,
        highlights: [
          {
            id: 'hl-multion-2',
            text: 'AGI-0 automates DoorDash food ordering and OpenTable table reservations in the background.',
            color: '#325FEC',
          },
        ],
      },
    ],
  },
  {
    id: 'doc-limitless-hardware-teardown',
    projectId: 'proj-always-on-agents-dots',
    title: 'Limitless Wearable Audio Pendant: Hardware Teardown & Meta Transition',
    filename: 'limitless_pendant_hardware_teardown.pdf',
    author: 'Dan Siroker & Hardware Diagnostics Lab',
    publicationDate: 'January 2026',
    fileSize: '0.9 MB',
    totalPages: 2,
    uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    tags: ['limitless', 'pendant', 'wearable-ai', 'meta-acquisition', 'hardware'],
    pages: [
      {
        pageNumber: 1,
        title: 'Section 1: Hardware Specifications & Battery System',
        content: `Abstract:
The Limitless Pendant, founded by Dan Siroker, was introduced as an always-on ambient audio memory companion designed to record, transcribe, and index real-world conversations and meetings 24/7.

1. Physical Specifications & Power Architecture:
- Form Factor: Circular aluminum chassis measuring 31.9 mm in diameter and 16 mm in thickness, secured with a magnetic clasp.
- Retail Price: Launched at a $99 purchase price with an optional cloud transcription subscription.
- Battery Longevity: Operates for up to 100 continuous hours on a single charge using ultra-low-power Bluetooth LE and on-device acoustic beamforming.
- Weather Durability: Rated IP54 for water spray and dust resistance.`,
        highlights: [
          {
            id: 'hl-limitless-1',
            text: 'Form Factor: 31.9 mm diameter, 16 mm thickness, 100 continuous hours battery life, priced at $99.',
            color: '#325FEC',
          },
        ],
      },
      {
        pageNumber: 2,
        title: 'Section 2: Meta Acquisition & Support Sunset Roadmap',
        content: `2. Meta Acquisition & Lifecycle Policy:
In December 2025, Meta acquired the Limitless team and its proprietary audio compression patents. Following the acquisition:
- Hardware Sales: New hardware sales were permanently halted on December 5, 2025.
- Service Continuity: Limitless committed to supporting existing pendant owners and maintaining backend cloud infrastructure through December 31, 2026.
- Strategic Pivot: The engineering team was integrated into Meta's Reality Labs wearable division to enhance future smart glasses audio stacks.`,
        highlights: [
          {
            id: 'hl-limitless-2',
            text: 'Hardware sales were halted on December 5, 2025, with backend support guaranteed through December 31, 2026.',
            color: '#325FEC',
          },
        ],
      },
    ],
  },
];

const DOCS_STORE_FILE = path.join(process.cwd(), '.documents-store.json');

const globalStore = globalThis as unknown as {
  __RESEARCH_DOCUMENTS_STORE__?: ResearchDocument[];
};

function loadPersistedDocs(): ResearchDocument[] {
  try {
    if (fs.existsSync(DOCS_STORE_FILE)) {
      const raw = fs.readFileSync(DOCS_STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        // Ensure new initial docs are included if missing
        const missing = INITIAL_DOCUMENTS.filter((initDoc) => !data.some((d) => d.id === initDoc.id));
        if (missing.length > 0) {
          const merged = [...data, ...missing];
          savePersistedDocs(merged);
          return merged;
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to read .documents-store.json:', err);
  }
  return [...INITIAL_DOCUMENTS];
}

function savePersistedDocs(docs: ResearchDocument[]) {
  try {
    fs.writeFileSync(DOCS_STORE_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write .documents-store.json:', err);
  }
}

if (!globalStore.__RESEARCH_DOCUMENTS_STORE__) {
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = loadPersistedDocs();
}

export function getProjectDocuments(projectId?: string): ResearchDocument[] {
  const docs = loadPersistedDocs();
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = docs;
  if (!projectId || projectId === 'all') {
    return docs;
  }
  
  // Exact match first
  const exact = docs.filter((d) => d.projectId === projectId);
  if (exact.length > 0) {
    return exact;
  }

  // If projectId is a parent (like proj-ai-main), also return child sub-project docs (e.g. proj-rag-arch-2026)
  if (projectId === 'proj-ai-main') {
    const aiFamily = docs.filter((d) => d.projectId === 'proj-ai-main' || d.projectId === 'proj-rag-arch-2026' || d.projectId === 'proj-ai-graph-rag');
    if (aiFamily.length > 0) return aiFamily;
  }

  return exact;
}

export function getDocumentById(id: string): ResearchDocument | undefined {
  const docs = loadPersistedDocs();
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = docs;
  return docs.find((d) => d.id === id);
}

export function addDocument(doc: ResearchDocument): ResearchDocument {
  const docs = globalStore.__RESEARCH_DOCUMENTS_STORE__ || loadPersistedDocs();
  const nextDocs = [doc, ...docs.filter((d) => d.id !== doc.id)];
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = nextDocs;
  savePersistedDocs(nextDocs);
  return doc;
}

export function deleteDocument(id: string): boolean {
  const docs = globalStore.__RESEARCH_DOCUMENTS_STORE__ || loadPersistedDocs();
  const prevLen = docs.length;
  const nextDocs = docs.filter((d) => d.id !== id);
  globalStore.__RESEARCH_DOCUMENTS_STORE__ = nextDocs;
  savePersistedDocs(nextDocs);
  return nextDocs.length < prevLen;
}
