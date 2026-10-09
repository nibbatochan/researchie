# Product Context: Researchie

## 1. Product Overview
Researchie is an in-situ web research workbench and Chrome extension (Manifest V3) designed to eliminate tab clutter, broken copy-pasting, and lost source provenance for researchers, designers, and analysts.

- **Stack:** Next.js 15 (App Router, React 19, Tailwind CSS), Manifest V3 Chrome Extension (Shadow DOM & Native Side Panel), Supabase PostgreSQL (`pgvector`), Groq / Gemini AI APIs with deterministic fallback.
- **Repository Layout:**
  - `extension/`: Chrome Extension source (manifest, native side panel, background worker, content script, popup, cropper, block picker).
  - `src/app/`: Next.js pages, layouts, and API routes (`/api/atoms`, `/api/projects`, `/api/atoms/search`, `/api/atoms/rebuild-context`, `/api/ai/synthesize`, `/api/ai/summarize`).
  - `src/components/`: UI components (`ProjectTimeline`, `ResearchCanvas`, `ResearchieAISidebar`, `ResearchieAIFAB`, `AtomCard`, `BlockAtomCard`, `ImageAtomCard`, `ExportProjectModal`, `ProjectList`).
  - `src/lib/`: Types, storage services, vector embedding algorithms, AI adapters, and formatters.
  - `docs/`: Product PRD, Context, Changelog, and Architecture plans.

---

## 2. Note / Atom Ingestion Types
1. **Quote / Text Atom (`type: 'quote' | 'text'`)**: Captured via floating pill or `Alt + S`. Includes W3C `#:~:text=` text fragment and provenance context paragraphs.
2. **DOM Block Atom (`type: 'block'`)**: Captured via `Alt + B`. Preserves clean HTML table/component structures with interactive preview and raw code views.
3. **Image Atom (`type: 'image'`)**: Captured via `Alt + C` area cropper or web image hover button. Uploads PNG to storage.
4. **Link Atom (`type: 'link'`)**: Captured from right-click context menu or URL bar with metadata preview.
5. **Note Atom (`type: 'note'`)**: Rich markdown syntheses and user notes saved from AI Q&A or synthesis generator.

---

## 3. Core UI & System Features
- **Spatial Canvas Whiteboard:** Interactive 2D infinite workspace (`ResearchCanvas.tsx`) with draggable cards, relation links, visual cluster group frames, and 1-click cluster synthesis.
- **Context Re-Builder:** Dynamic provenance expander on quote cards and canvas nodes displaying surrounding paragraphs, section headings, and source links (`/api/atoms/rebuild-context`).
- **Split-Screen Assistant:** Bottom-right Researchie AI button opens docked ~380px assistant, contracting knowledge stream (`flex-1 min-w-0`).
- **Ask AI & Grounded Q&A:** Answers user queries with direct bottom-line findings, markdown evidence bullets, and citation chips.
- **Summarize & Synthesize:** Generates PRDs, Comparative Matrices, Executive Memos, and Key Takeaways with multi-card selection.
- **Citations & Export:** Exports to Obsidian/Notion Markdown (`.md`), APA academic format, BibTeX (`.bib`), and raw JSON.
- **Chrome Native Side Panel:** Persistent 3-tab side panel (`Capture`, `Feed`, `Page AI`) adhering to the dark grayscale design system and humanized copy.
- **Design Language:** True deep black & zinc neutrals (`#09090B`, `#121214`, `#18181B`, `#27272A`), restrained blue accents (`#325FEC` / `#518FFF`), clean `Figtree` typography.

---

## 4. Completed & Upcoming Phases
- **Phase 1-3:** Ingestion Architecture, 768-d Vector Search, Multi-Template Synthesis, and Bento Cards.
- **Phase 4:** Chrome Native Side Panel (`chrome.sidePanel`), 3-Tab Streamlining, and Humanized UX Copy.
- **Phase 5:** 2D Visual Spatial Canvas Workspace & Dynamic Context Re-Builder.
- **Upcoming Phases:**
  1. PDF & Local Document Reader / Highlighting Ingestion.
  2. Multi-user Workspaces & Supabase Auth Collaboration.
