# SECOND MIND: Local-First Goal-Directed Knowledge Engine & Deliverable Compiler
**Master Architecture Specification & Project Transition Blueprint**
*Date: October 2026 | Status: Ready for Implementation*

---

## 1. Executive Summary & Core Pivot

### 1.1 The Pivot Rationale
The existing market for AI note-taking and knowledge tools (**Google NotebookLM**, **Obsidian + Copilot**, **mymind**, **Readwise Reader**, **Notion AI**) suffers from a structural breakdown called the **Collector's Fallacy**:
1. Users save dozens of links, articles, and videos into passive bookmark graveyards.
2. The material sits unread because processing it requires significant manual reading and synthesis time.
3. Existing AI solutions only offer passive chat (*"Chat with your PDF"*), requiring the user to know what questions to ask and manually copy-paste insights into an external editor.
4. Existing tools are either cloud-locked (surrendering private thoughts and drafts to third-party model servers) or require dozens of fragile community plugins (e.g., Obsidian).

### 1.2 The New Paradigm: The "Goal Compiler"
**Second Mind** is a 100% local-first, on-device intelligence engine that bridges the gap between **passive consumption** and **active production**.
- Instead of organizing folders and reading every source, the user declares an **Active Goal** (e.g., *"Write a 60-second Instagram Reel debunking AI wearable pins"* or *"Prepare an evidence brief on solid-state battery thermal limits"*).
- The user dumps raw, unread media into the Goal: **YouTube videos**, **Reddit discussion threads**, **Instagram carousels**, and **web articles**.
- The on-device AI—operating with **zero external AI API dependencies**—processes the unread media pool through the lens of the active goal, compiling it directly into **structured, production-ready deliverables** (scripts with timestamped B-roll cues, claim-evidence matrices, or executive research briefs) with verifiable source anchors.

---

## 2. Target Persona: The Creator-Researcher Overlap

Creators and researchers are fundamentally the same archetype operating on different delivery channels:
- **The Creator** is an investigative researcher whose deliverable happens to be a 60s Reel, YouTube video script, X thread, or carousel.
- **The Researcher** is a creator whose deliverable happens to be an executive brief, literature review, or competitive intelligence memo.

Both require:
1. Fast, frictionless intake of diverse media formats (video transcripts, community sentiment, technical specs).
2. Deep cross-synthesis across contradictory sources.
3. Absolute confidence in traceability (knowing the exact timestamp, quote, or comment backing every statement).
4. Uncompromising privacy for confidential client research, exclusive editorial scripts, and pre-release content.

---

## 3. Non-Negotiable System Constraints

| Constraint | Enforcement Rule | Architectural Solution |
| :--- | :--- | :--- |
| **100% Local Inference** | All AI computation (generation, summarization, extraction) runs exclusively on the user's hardware. | Embedded **Ollama** / **llama.cpp** sidecar executing quantized GGUF models (`Qwen 2.5 7B-Instruct` or `Llama 3.2 3B`). |
| **Zero External AI APIs** | No calls to OpenAI, Anthropic, Google, or Groq anywhere in the ingestion or synthesis pipeline. | On-device embedding models (`nomic-embed-text` / `bge-small-en-v1.5`) and local deterministic scrapers. |
| **Local Data Sovereignty** | Raw links, full transcripts, video frames, vector embeddings, and generated artifacts reside on the local filesystem. | Local embedded **SQLite** for relational tables + embedded **LanceDB / sqlite-vec** for vector similarity search. |
| **Live Internet Fetching** | The desktop client may make outbound HTTP requests to fetch public web data, but parsing and analysis stay strictly on-device. | Native scrapers run from the user's residential IP context to bypass cloud scraper blockers. |

---

## 4. Ingestion Architecture: Zero-AI Social & Web Extractors

All scrapers run locally on the user's computer via direct protocol fetching or browser extension capture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LOCAL INGESTION SUBSYSTEM                             │
├──────────────────┬──────────────────┬───────────────────┬───────────────────┤
│ YOUTUBE ADAPTER  │  REDDIT ADAPTER  │ INSTAGRAM ADAPTER │    WEB ADAPTER    │
├──────────────────┼──────────────────┼───────────────────┼───────────────────┤
│ • Full subtitles │ • Top comment    │ • Carousel images │ • Clean DOM HTML  │
│   (.vtt / json)  │   threads        │ • Post captions   │   (Readability)   │
│ • Chapter markers│ • Upvote counts  │ • Top comments    │ • TextFragment    │
│ • Video metadata │ • Sentiment tags │ • OCR text via    │   deep links      │
│ • Timestamps     │ • Direct quotes  │   Tesseract.js    │ • Freeze-frame PNG│
└──────────────────┴──────────────────┴───────────────────┴───────────────────┘
```

### 4.1 YouTube Extractor
- Extracts video ID, title, author, duration, chapter markers, and raw timestamped caption tracks without requiring YouTube Data API keys.
- Chunks transcripts with start/end time offsets (`[03:42 - 04:15]`) so the local compiler can cite exact video moments for B-roll or quotes.

### 4.2 Reddit Community Thread Extractor
- Consumes public Reddit URLs via native JSON endpoints (`https://www.reddit.com/r/.../.json`).
- Flattens top comment hierarchies, captures upvote weights, and isolates consensus praise vs. frustration clusters.

### 4.3 Instagram & Social Extractor
- Receives post data from the companion browser extension or direct link.
- Captures post images, captions, and comments. Runs local client-side OCR (via Tesseract.js or on-device vision model) to extract text embedded inside slide graphics.

### 4.4 Clean Web & PDF Extractor
- Carried over from Researchie: Reader-mode HTML extraction, TextFragment URL generation (`#:~:text=`), and visual canvas freeze-frame raster snapshots.

---

## 5. The Goal-Directed Compiler Engine

### 5.1 The Compiler Paradigm
In traditional RAG systems, the user asks: *"What does this article say?"*
In Second Mind, the system asks: *"How does this pool of raw material fulfill the active Goal?"*

```
                 RAW INGESTED POOL (Unread by User)
  [2 YouTube Teardowns] + [3 Reddit Threads] + [1 Spec Sheet]
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    GOAL: "60s Teardown Reel"        GOAL: "Engineering Brief"
               │                               │
               ▼                               ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│ • Hook: Provocative question ││ • Executive Summary          │
│ • Beat 1: Battery bottleneck ││ • Thermal Throttling Curves  │
│ • Beat 2: Reddit user quote  ││ • Reddit Sentiment Breakdown │
│ • B-Roll: Video [03:12]      ││ • Spec Sheet Discrepancies   │
│ • Call to Action (CTA)       ││ • Verifiable Evidence Table  │
└──────────────────────────────┘└──────────────────────────────┘
```

### 5.2 Core Data Schemas

```typescript
// 1. Goal Definition
export interface SecondMindGoal {
  id: string;
  title: string;
  description?: string;
  targetFormat: 
    | 'short_form_script'      // Hook, 3 Beats, B-Roll Cues, CTA
    | 'long_form_outline'      // YouTube 8-12 min script structure
    | 'social_thread'          // X/LinkedIn 5-7 slide carousel
    | 'executive_brief'        // Structured decision-making report
    | 'claim_evidence_matrix'  // Table cross-referencing claims vs proof
    | 'custom_template';
  targetAudience: string;      // e.g., "Tech enthusiasts, skeptical consumers"
  toneConstraint: string;      // e.g., "Sharp, conversational, zero marketing fluff"
  keyHypotheses?: string[];    // Questions the user wants answered
  createdAt: string;
  updatedAt: string;
}

// 2. Ingested Resource Atom
export interface IngestedResource {
  id: string;
  goalId: string;
  sourceType: 'youtube' | 'reddit' | 'instagram' | 'webpage' | 'pdf' | 'note';
  title: string;
  sourceUrl: string;
  authorOrCreator?: string;
  capturedAt: string;
  rawPayload: {
    cleanText: string;
    transcriptChunks?: Array<{
      startSeconds: number;
      endSeconds: number;
      text: string;
    }>;
    redditComments?: Array<{
      author: string;
      body: string;
      upvotes: number;
      isOp: boolean;
    }>;
    snapshotUrl?: string;
  };
  localEmbeddingIds: string[];
}

// 3. Compiled Deliverable Artifact
export interface CompiledDeliverable {
  id: string;
  goalId: string;
  title: string;
  deliverableType: string;
  contentMarkdown: string;
  anchors: Array<{
    claimText: string;
    sourceResourceId: string;
    excerpt: string;
    timestampOffset?: number; // for YouTube
    deepLinkUrl?: string;     // for Web TextFragments
  }>;
  compiledAt: string;
}
```

---

## 6. Concrete Competitive Moat

| Dimension | NotebookLM (Google) | mymind (van Schneider) | Obsidian (+ Plugins) | **Second Mind** |
| :--- | :--- | :--- | :--- | :--- |
| **Inference Location** | 100% Cloud (Google servers) | Cloud servers | Depends on plugin (often OpenAI API) | **100% Local (On-Device GPU/CPU)** |
| **Privacy Guarantee** | Files analyzed on Google Cloud | Private cloud database | Files local, AI queries leave device | **Zero Data Egress**; absolute sovereignty |
| **Social Ingestion** | Weak (No raw Reddit/IG parsers) | Visual bookmarks only | Manual clippers / complex setups | **Native YouTube/Reddit/IG extractors** |
| **Core Workflow** | "Ask questions about files" | "Aesthetic visual memory" | "Manual note linking" | **"Goal-Directed Deliverable Compiler"** |
| **Output Deliverable** | Generic summary / podcast | Saved visual card | Manual user-written note | **Ready-to-record scripts & briefs** |
| **Cost / Subscriptions**| Free (data subsidized) | $12/month subscription | Free (Core) + AI API token costs | **Zero API bills; perpetual local utility** |

---

## 7. Codebase Elements to Carry Over into the New Project

From the current **Researchie** codebase, retain and migrate:
1. **The Extension Capture Architecture**:
   - `public/extension/content.js`, `background.js`: TextFragment deep linking (`#:~:text=`) and DOM clipping mechanics.
2. **Visual Snapshot Engine**:
   - HTML-to-canvas freeze-frame capture logic and full-resolution snapshot modals.
3. **Impeccable Scandinavian/Nordic Design System**:
   - Design tokens: 1px structural borders (`#D2DCEA` / `#27272A`), high-density typography, monospaced metadata badges, zero visual clutter.
   - Component primitives: `Modal`, `Toast`, `Badge`, `Sidebar` navigation, and responsive layouts.
4. **Data Persistence Patterns**:
   - Local JSON storage and backup export utilities.

---

## 8. Technical Stack for the New Windows Desktop Build

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WINDOWS STANDALONE DESKTOP STACK                         │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ Desktop Shell           │ Tauri v2 (Rust + native Windows WebView2)         │
│                         │ • ~15 MB executable size                          │
│                         │ • Native Windows hotkeys (Win+Shift+S)            │
│                         │ • Low RAM consumption (<60MB vs 500MB Electron)   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Frontend Framework      │ Next.js / React (Static Export: `output: export`) │
│ Styling & Icons         │ Tailwind CSS + Phosphor Icons                     │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Local Database          │ Embedded SQLite (`better-sqlite3` or Rust engine) │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Local Vector Search     │ Embedded LanceDB or sqlite-vec                    │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Local Inference Runner  │ Ollama or llama.cpp sidecar (localhost:11434)     │
│ Default LLM Models      │ Qwen 2.5 7B-Instruct / Llama 3.2 3B-Instruct      │
│ Default Embedding Model │ nomic-embed-text-v1.5 (274 MB, CPU/GPU fast)      │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Local Scrapers          │ Direct local HTTP parsers for Reddit JSON &       │
│                         │ YouTube transcript endpoints                      │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 9. Next Chat Kickoff Instructions

When initiating the new conversation for this project:
1. Provide this document (`SECOND_MIND_PRODUCT_BLUEPRINT.md`) as the primary context.
2. The initial development phase should focus on:
   - **Phase 1**: Establishing the local project workspace and data models (`Goal`, `IngestedResource`, `Deliverable`).
   - **Phase 2**: Implementing the zero-AI **YouTube Transcript** and **Reddit Thread** local ingestion adapters.
   - **Phase 3**: Connecting the **Goal-Directed Synthesis Pipeline** to local Ollama (`localhost:11434`) to compile multi-source raw dumps into video scripts and research briefs.
   - **Phase 4**: Building the split-screen **Deliverable Canvas** with interactive source traceability anchors.
