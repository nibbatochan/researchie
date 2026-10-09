# Project Log: Researchie

## Session Record: Phase 1 through Phase 3 Ingestion, AI Assistant & Design Polish

### 1. Architectural Decisions
- **Docked Dynamic Split Layout:** Avoided fixed modal overlays for the AI Assistant. Mounted `ResearchieAISidebar` alongside `ProjectTimeline` in a responsive flex row so the timeline shrinks (`min-w-0 flex-1`) when the assistant opens, allowing researchers to reference quotes while chatting.
- **768-d Deterministic & Vector Semantic Search:** Designed a hybrid vector search pipeline in `/api/atoms/search` combining normalized dense embedding projections with lexical token matching for fast sub-second querying without external rate limits.
- **Multi-Template Grounded Synthesis:** Built an AI pipeline in `/api/ai/synthesize` generating structured PRDs, Comparative Tables, and Executive Memos with verified citation cards and fallback heuristic generation.
- **Restrained Visual Language:** Subdued accent colors to purposeful states (`#325FEC` / `#518FFF`), backed by high-contrast neutral grayscales (`#09090B`, `#121214`, `#18181B`, `#27272A`), `p-6 md:p-7` card padding, and restored `Figtree` font stack.

### 2. State of Key Files
- `src/components/ProjectTimeline.tsx`: Main knowledge stream, search, tag bar, type filters, docked AI sidebar wrapper, multi-card selection.
- `src/components/ResearchieAISidebar.tsx`: Compact ~380px assistant drawer with *Ask AI* (chat + citations) and *Summarize* (PRD, memo, comparison templates + save as note).
- `src/components/ResearchieAIFAB.tsx`: Floating action button with hover menu and official two-path AI logo.
- `src/components/AtomCard.tsx`: Bento and Compact card renderer with tag manager, deep quote links (`#:~:text=`), and selection controls.
- `src/components/ExportProjectModal.tsx`: Export suite for Markdown (`.md`), Citations (`Markdown`, `APA`, `BibTeX`), and Raw JSON.
- `src/app/api/atoms/route.ts`: CRUD for research atoms with Supabase and local cache fallbacks.
- `src/app/api/atoms/search/route.ts`: 768-d semantic search with safe tag/embedding normalization.
- `src/app/api/ai/synthesize/route.ts`: Groq LLM and heuristic synthesis engine.
- `extension/`: Manifest V3 Chrome extension with text selection pill, DOM block inspector (`Alt+B`), screen cropper (`Alt+C`), and popup brief/Q&A.

---

## Session Record: Phase 4 Chrome Side Panel In-Situ Ingestion & AI Interrogation

### 1. Architectural Decisions
- **Persistent Chrome Side Panel (`chrome.sidePanel` API):** Native side panel architecture (`extension/sidepanel.html`, `sidepanel.js`, `sidepanel.css`) staying docked across web browsing sessions.
- **Streamlined 3-Tab Structure:** Pruned tabs to **Capture**, **Feed**, and **Page AI** (Summarize + Q&A only), removing artificial complexity and bloat.
- **Humanized Voice & Copy:** Applied the `humanizer` skill to strip tech jargon, buzzwords, and robotic phrasing into natural, direct English.
- **Design System Alignment:** Unified dark neutral colors (`#09090B`, `#121214`, `#18181B`, `#27272A`), `Figtree` typography, and restrained Royal Blue accents (`#325FEC`).

---

## Session Record: Phase 5 Visual Spatial Canvas & Dynamic Context Re-Builder

### 1. Architectural Decisions
- **Interactive 2D Spatial Canvas (`ResearchCanvas.tsx`):**
  - **Figma-Style Mode Switcher:** Prominent primary switch in the left sidebar (above Chrome Extension) and timeline toolbar allowing users to switch between **Feed Stream** and **Spatial Canvas**.
  - **Compact vs Detailed Mode:** Toggle inside canvas to switch card rendering between minimal horizontal pills and full bento cards, keeping all 4-directional connector ports active.
  - **4-Port Connectors & Link Removal:** Every card, folder, and shape has top/bottom/left/right connector anchor dots. Hovering over a connection line shows a direct `✕` remove button and relationship badge editor (*supports*, *contradicts*, *derives*, *relates*).
  - **DOM Block Visibility:** Fixed HTML block atom rendering with syntax highlighting and formatted structure view.
  - **Canvas Folders & Resizing:** Create named folder containers, drag by header, resize via bottom-right handle, and connect folders to atoms or other folders.
  - **Alt + Scroll Up/Down Zoom:** Explicit `Alt + Wheel` handler for smooth cursor-centered zoom.
  - **Text Notes & Shapes:** Create standalone editable sticky notes and section text banners with color presets and connector ports.
  - **Cluster Synthesis HUD:** Multi-select cards on canvas and launch instant grounded AI synthesis into notes.
- **Dynamic Context Re-Builder (`/api/atoms/rebuild-context` & `AtomCard.tsx`):**
  - For any quote atom, reveals the preceding section heading, preceding context paragraph (`… [prefix]`), centered highlighted excerpt, and following context paragraph (`[suffix] …`).
  - Automated fallback and live enricher updating atom metadata and database records with 1-click execution.
- **Unified Viewport Navigation in `ProjectTimeline.tsx`:**
  - 3-way toggle between **Detailed Bento Cards** (`ListDashes`), **Compact Rows** (`Rows`), and **Spatial Canvas Whiteboard** (`Graph`).

### 2. State of Key Files
- `src/components/ResearchCanvas.tsx`: 2D spatial canvas component with drag-and-drop nodes, connectors, cluster frames, and synthesis HUD.
- `src/components/ProjectTimeline.tsx`: Workspace orchestrator supporting Feed and Canvas modes with docked AI assistant.
- `src/components/AtomCard.tsx`: Enhanced card component with provenance section badges and Context Re-Builder.
- `src/app/api/atoms/rebuild-context/route.ts`: API endpoint for live context enrichment and paragraph reconstruction.
- `src/lib/types/research.ts`: Added `sectionHeading`, `contextRebuiltAt`, and `surroundingContext` to `ProvenanceMetadata`.

### 3. Readiness for Next Phase
- Verified clean build (`npm run build`) with 0 errors across all 13 routes and components.
