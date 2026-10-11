# Researchie

Research workbench + Chrome extension. Clip text, DOM blocks, images, links from any page into projects, each clip keeping its exact source. AI Q&A and synthesis run over the clips with citations. Built earlier with Antigravity; this file carries over its context.

## Stack
- Next.js 15.1 (App Router), React 19, TypeScript, Tailwind 3. Dev server on port 3001.
- `extension/`: Manifest V3 Chrome extension (side panel, content script, background worker, popup, block picker, cropper). Plain JS, no build step.
- Supabase (Postgres + pgvector, schema in `supabase/schema.sql`). API routes fall back to an in-memory seeded store when Supabase is not configured.
- AI via pluggable adapters (Gateway, Gemini, Mock) with Groq for synthesis and a deterministic fallback. Cognee graph scripts exist in `scripts/` (`cognee_graph_builder.py`).
- PDF.js (`pdfjs-dist`), Tesseract.js OCR, JSZip, react-markdown.

## Commands
- `npm install`, then `npm run dev -- -p 3001`
- `npm run build`, `npm run lint`
- `npm run verify` = `tsc --noEmit && playwright test` (specs in `e2e/01-…08-*.spec.ts`)
- Extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`
- Older ad-hoc tests: `node tests/testEndToEndSidepanel.mjs` and the other `tests/*.mjs`

## Layout
- `src/app/`: pages (`login`, `signup`, `gallery`, `share`, `sandbox`, `test-lab`) and `api/` routes (`atoms`, `atoms/search`, `atoms/rebuild-context`, `ai/synthesize`, `ai/qna`, `ai/summarize`, `export/notion`).
- `src/components/`: `ProjectTimeline`, `ResearchCanvas`, `ResearchieAISidebar`, `AtomCard`/`BlockAtomCard`/`ImageAtomCard`, `PDFReaderView`, `CustomPDFViewer`, `ExportProjectModal`, `DashboardPage`, `MarkdownWorkspace`.
- `src/lib/`: `adapters`, `ai`, `auth`, `data`, `design`, `export` (obsidian, notion), `ocr`, `settings`, `storage`, `supabase`, `types`, `utils`.
- `brand-ui-kit/`, `brand-ui-showcase/`: design assets. `scripts/`: audit and seed helpers.

## Where the context lives (read these first)
- `PRODUCT_CONTEXT.md`: product overview, atom types, core features.
- `PROJECT_LOG.md`: phase-by-phase session log (phases 1 to 5) with architecture decisions.
- `docs/CONTEXT.md`: current status matrix (last synced 2026-09-30, v1.6.0).
- `docs/DECISIONS.md`: numbered architecture decisions plus the Molecule critique log and provisional items.
- `docs/CHANGELOG.md`: v1.0.0 to v1.6.0.
- `docs/RESEARCH_TOOL_PRD.md`, `SECOND_MIND_PRODUCT_BLUEPRINT.md`: product direction.
- `docs/superpowers/{specs,plans}/`: phase 1 and 2 design specs and plans.
- `DESIGN_SYSTEM.md`, `design.md`: visual language.
- `CLEANUP_NOTES.md`, `CLEANUP_REPORT.md`, `FEATURE_INVENTORY.md`: cleanup pass of 2026-10-09 (done on branch `cleanup/2026-10-09`; the repo is now on `main`). Its notes list older framework versions; `package.json` is the source of truth.

## Key decisions
- Clip text links use W3C text fragments (`#:~:text=`); a cached snapshot and surrounding context back them up when the page changes.
- Extension UI renders in Shadow DOM so host-page CSS cannot leak in.
- Exports are incremental: Notion skips blocks it already has (fingerprints), Obsidian uses `researchie_atom_id` in frontmatter.
- Deletes are optimistic with an 8-second undo toast and a trash drawer; project delete asks whether to keep clips.
- Three workspace modes: Feed, Spatial Canvas, Document Reader. Selection persists across sub-projects.
- Provisional, not built: real-time collaboration, offline clip queue, periodic two-way Notion sync.

## Design
Dark neutrals `#09090B` / `#121214` / `#18181B` / `#27272A`, royal blue accent `#325FEC` (`#518FFF`), Figtree font, restrained accents. Copy uses plain, direct English (the humanizer pass). See `DESIGN_SYSTEM.md`.

## Conventions
- Update `docs/CHANGELOG.md` and `PROJECT_LOG.md` when a phase of work lands; add architecture choices to `docs/DECISIONS.md`.
- Never commit `.env.local` or local data stores. `.gitignore` covers `.env*` and `.research-store.json` but not `.documents-store.json` (about 10 MB) or `.cognee-graph-*.json`; add them.
- Keep `npm run verify` green before calling work done.
