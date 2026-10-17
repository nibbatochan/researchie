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

## Session Record: Phase 6 Citation Engine, Verified Document Q&A & PDF Extraction Fix

### 1. Architectural Decisions
- **Citations resolve on demand and are cached on the atom (`metadata.citation`):** no schema migration. Lookups run on the server with a shared rate limiter. See `docs/DECISIONS.md`, Decisions 7 to 9.
- **Warnings only for a mismatch the user caused:** everything else is a gray note. A mismatch is a failed verify that is not saved. Decision 8.
- **Four ways to a citation without asking for a DOI:** page tags read by the extension, title search with a pick list, a web citation from page facts, and a manual form for PDFs. Decision 9.
- **Document Q&A answers from passages with offsets, and shows links only for verified citations.** The model's own page text is never trusted. Decisions 10 and 11.
- **"Busy" beats a wrong answer:** no mock fallback with a key, size retry by relevance, weak model skipped. Decision 12.
- **PDF extraction runs outside the server bundle** (`serverExternalPackages: ['pdf-parse']`). Decision 13.
- **How the work was run:** the backend (passage retrieval and Groq limits) and the UI (link icons and the empty state) were each delegated to a separate agent, one at a time because they share files. Each result was re-checked independently (type check, unit tests, live runs) before it was accepted.

### 2. State of Key Files
- `src/lib/citations/*`: lookups, verification, formatting, web, manual and PDF helpers.
- `src/app/api/citations/{resolve,search}/route.ts`: citation endpoints.
- `src/lib/ai/passages.ts`: passages, retrieval and tolerant quote location. `src/lib/ai/claimSupport.ts`: quote check. `src/lib/ai/adapters/groq.ts`: passage-id citations, size and fallback handling.
- `src/lib/qa/answerLinks.ts`: answer paragraphs with link icons, marker cleaning, quote check in the viewer.
- `src/components/AtomCard.tsx`: citation box. `src/components/PDFReaderView.tsx`: upload citation, manual form, assistant, delete window.
- `extension/content.js`: `readPageIdentifiers` and `readPageInfo`.
- `next.config.mjs`: `serverExternalPackages`.
- Tests: `tests/*.test.mjs` (92 unit tests), `e2e/09-citation-links.spec.ts`.

### 3. Readiness for Next Phase
- `npx tsc --noEmit` is clean and 92 unit tests pass. `e2e/09` passes 5 of 5.
- **Live Q&A result before the last tuning:** 18 test questions on a real paper all passed with no warnings, and 12 repeat questions produced 29 citations with none unsupported. After that, testing used up Groq's daily allowance, so the final settings are unverified live.
- **Next:** document assistant UI fixes (per-sentence icons, one scroll per click, outside-click clear, single saved highlight, resizable panel), formatted lines for the remaining source types, APA and AMA, and a live Chrome clip test. Commit the uncommitted work.

## Session Record: Phase 7 Citation Formats, Assistant UI, Security Scrub & PDF Research Report

### 1. Architectural Decisions
- **Citation warnings grow carefully:** Save anyway on a user-entered mismatch, a warning for a PDF whose DOI points to another paper (junk metadata titles ignored), and an amber box for a retraction, kept apart from the verify warning. Decision 15.
- **Secrets are scrubbed and scanned:** real Supabase keys found in a planning doc were removed from every commit before the first push, the key was rotated and the old one refused, and every push is scanned for each `.env.local` value. Decision 16.
- **Browser tests choose their own data:** one helper opens the same project and PDF every time, and tests delete the clips they save. Decision 17.
- **Local models are a test fallback only.** Decision 18.
- **The PDF report is a real file built in the browser, in the design system:** a data builder and a drawing half share one contract and are tested in Node without a browser. Decision 14.
- **How the work was run:** independent pieces went to separate agents running in parallel (AMA style and the PDF mismatch warning; then the report data builder and the report drawing), a follow-up message sent one agent back to fix the dropped symbols, and the six unverified Groq questions went to one agent that sent them 3 minutes apart. Every result was re-checked by the lead (own test runs, reading the code, reading rendered pages) before it was accepted. That caught, for example, a false-warning risk from junk PDF titles and the silent loss of scientific symbols.

### 2. State of Key Files
- `src/lib/citations/`: `apa.ts`, `ama.ts`, `export.ts` (BibTeX, RIS), `vancouver.ts` now covers journal article, preprint, dataset, chapter, report and web page; `verify.ts` has `isRetracted`; `pdf.ts` has `isUsablePdfTitle`; the Crossref mapper reads retractions from `updated-by`.
- `src/components/CitationStyleBar.tsx`: style tabs, live preview and Copy on the "verified" line of the clip citation box and the PDF citation popover.
- `src/lib/export/pdf/`, `src/components/PdfExportPanel.tsx`, `public/fonts/`: the PDF report (Decision 14).
- `src/lib/qa/answerLinks.ts` and the PDF reader: link icon per sentence, one scroll per click, click-away clearing, single saved highlight, resizable assistant panel.
- `extension/background.js`, `content.js`, `blockPicker.js`, `cropper.js`: Undo on the clip toast now deletes through the background script (it had used a hard-coded wrong port).
- `e2e/helpers/`, `e2e/07` to `e2e/13`; `tests/` now has 159 unit tests.

### 3. Readiness for Next Phase
- **Verified live:** Groq 18 of 18; the Chrome extension capture and Undo; the retraction check; a PDF export of the real 77-clip project; the production build.
- **Open:** AMA forms for four more source types and APA author-date citations; page numbers on the PDF contents page; the eight old PDF entries to delete or re-upload (owner); the PDF export commits to push after a key scan; the unrewritten local branches must not be pushed.
- **Candidates for the next phase (from the PRD):** shared projects for teams, an offline clip queue, two-way Notion sync. Shared projects need a design conversation first.

## Session Record: Tester Site Security Log (2026-10-16)

### 1. Architectural Decisions
- **One place for the security choices of the 5 to 10 person tester site:** `docs/SECURITY_DECISIONS.md` lists each decision (accounts and sessions, invite code, isolation, sharing, secrets, the extension, account deletion, web content, hosting and dependencies) with why, what it costs and where it lives, plus the gaps accepted on purpose. Decision 24.
- **Built in the same stretch of work:** one data layer with local mode kept off Supabase (Decision 22), sharing with roles, links and requests (Decision 23), delete own account with an authenticator app, a remembered-addresses switch-account list, a saved Notion token, QR code set-up, Google sign-in (off until set up) and a fix for an open redirect in the sign-in callback.

### 2. State of Key Files
- `docs/SECURITY_DECISIONS.md`, `docs/SHARING_DESIGN.md`, `docs/GOOGLE_SIGNIN_SETUP.md`, `docs/TESTER_DEPLOYMENT.md` (brought up to date).
- `src/lib/data/` (`store.ts`, `cloud.ts`, `localStore.ts`, `roles.ts`, `sharing.ts`), `supabase/migrations/002` to `004`.

### 3. Readiness for Next Phase
- **Not yet tried on the live site:** sharing, delete account end to end, the saved Notion token, QR set-up, Google sign-in. Migrations 003 and 004 still have to be run on the testers project, then a deploy.
- **Open security items:** the block-clip iframe sandbox, the wildcard CORS header, no Content-Security-Policy, rotating the tester service key (S-41), and trying the isolation rules with two real accounts.

## Session Record: Canvas Audit (2026-10-17)

### 1. Architectural Decisions
- **Selection handles, rotate handle and connection ports are one layer above all items**, drawn from item boxes (`getItemBox`), not inside each item. An item's own stacking context made them unreachable when a card sat above it.
- **A box is its unrotated corner plus a rotation about its centre** (`src/lib/canvas/geometry.ts`). Resizing keeps the opposite side fixed on the canvas, also when turned. This is pure code with unit tests.
- **Text saves as it is typed**, with one undo step when the edit ends; nothing depends on the text box losing focus.
- **Export draws one SVG** (`src/lib/canvas/exportSvg.ts`); PNG and JPEG are that SVG drawn to pixels. The dialog lives in the canvas, which holds the data.
- **Sections are an outline**, with their grab areas (edges, name) in a layer above the items.

### 2. State of Key Files
- `src/components/ResearchCanvas.tsx`, `src/components/CanvasExportModal.tsx`, `src/lib/canvas/`, `src/lib/types/canvas.ts` (rotation, fontSize), `src/components/ProjectTimeline.tsx` (opens the export through a signal).
- `e2e/22-canvas-tools.spec.ts`, `tests/canvas-geometry.test.mjs`, `tests/canvas-export.test.mjs`.

### 3. Readiness for Next Phase
- **Not built:** scaling or rotating several selected items together (they can be moved, deleted and layered together); copy, paste and duplicate; the minimap does not navigate.
- **Not checked:** touch screens and phone width; a canvas with hundreds of items (every item re-renders while one is dragged).
