# Scope

Edited by the `/scopetrack` mod. Use `/scopetrack` to see the tree and where you are. Never delete history: finished or dropped items stay in the tree.

Current: {c9}

Statuses: not started, in progress, blocked, done, dropped.

## Tree

- [in progress] Researchie (core) {root}
  - [in progress] Citation Engine {c1}
    - [done] Crossref, DOI, DataCite, PubMed lookups {c2}
    - [done] Title search pick list {c3}
    - [done] Vancouver formatting {c4}
    - [done] Web-page and manual citations {c5}
    - [dropped] Verified DOI read from extension capture — needs live Chrome check {c6}
    - [done] Preprint, dataset, book chapter lines (APA) {c7}
    - [done] AMA style {c8}
    - [not started] Report number, agency, web update date/place {c9}
  - [in progress] Document Assistant Q&A {q1}
    - [done] Passages, page numbers, verified quotes {q2}
    - [done] Groq rate-limit handling — unit-tested only {q3}
    - [blocked] Live check: Q 10, 13–16, 18 — Groq daily quota {q4}
    - [in progress] Document Assistant UI fixes {q5}
    - [not started] Re-upload PDFs with placeholder text — your action {q6}
  - [done] Exports (Obsidian, Notion, Markdown, BibTeX) {e1}
  - [done] Workspaces, PDF reader, OCR, AI synthesis {w1}
  - [in progress] Housekeeping {h1}
    - [done] Delete InlineClipInserter.tsx and lib/cn.ts {h2}
    - [done] Replace lucide-react with Phosphor in PDFReaderView.tsx {h3}
    - [done] Gitignore .documents-store.json and .cognee-graph-*.json (graph files untracked, uncommitted) {h4}
    - [in progress] Commit work after f0bd60f — e2e edits already committed (f04062e, e296a2b); left: staged cognee untracking + SCOPE.md {h5}
  - [not started] PRD gaps {p1}
    - [not started] Floating on-page project switcher button (PRD 7, extension 4); switcher exists only in popup {p2}
    - [not started] Selection pill with "Ask AI" button (pill has save and tag only) {p3}
    - [not started] AI page summary: 3-bullet and detailed breakdown modes, table extractor, one-click save {p4}
    - [not started] Automatic offline queue flush when connection returns (queue and manual retry exist) {p5}
    - [not started] Drag to reorder cards in the timeline (canvas has drag, feed does not) {p6}
    - [not started] PDF export (export modal has Markdown, Obsidian, Notion, JSON, citations only) {p7}
    - [not started] Team sharing: shared workspaces, invites, admin (only a public share link exists) {p8}
    - [not started] Plan limits: free tier caps (3 projects, 25 block clips a month) are not enforced; tier is a UI flag {p9}
    - [not started] Block HTML sanitization audit: strip scripts and iframes on save (PRD 12) {p10}
    - [not started] PRD says Cloudflare R2, Gemini 1.5 and shadcn; code uses Supabase, Groq and Gemini adapters, no shadcn. Update the PRD {p11}

## Scope changes

- 2026-10-13 — PRD gap check (docs/RESEARCH_TOOL_PRD.md) found items not in the tree; added under {p1}.

## History

- 2026-10-13 — Tree created from docs/CONTEXT.md section 4 and FEATURE_INVENTORY.md.
- 2026-10-13 — Housekeeping: h2, h3 verified already done; h4 finished by untracking .cognee-graph-*.json; c8 (AMA) marked done per git log.
- 2026-10-13 — c7 marked done (apa.ts covers preprint, dataset, chapter, report). h5 narrowed: e2e changes are already committed.

## History
- 2026-10-13 22:36 — dropped: Citation Engine > Verified DOI read from extension capture
