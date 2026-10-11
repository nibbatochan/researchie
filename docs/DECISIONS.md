# Architecture & Technical Decisions Log

### Decision 1: W3C Scroll-to-Text Fragments
- **Context**: Fragile CSS selectors break when host sites update. Static screenshots prevent text search/copying.
- **Decision**: Compute standard W3C text fragment hashes (`#:~:text=start,end`).
- **Rationale**: Works natively across Chromium browsers without requiring extensions on the viewer's device.

### Decision 2: Isolated Shadow DOM for In-Situ UI
- **Context**: Host site styles (`* { margin:0 }`, aggressive CSS resets) collide with extension buttons.
- **Decision**: Render all in-page overlays (pill, block highlighter badge) in `attachShadow({ mode: 'open' })`.
- **Rationale**: 100% style isolation and zero visual bleed from host pages.

### Decision 3: Dual-Layer Persistence (Supabase + Local In-Memory)
- **Context**: Relying strictly on external database setup blocks immediate testing.
- **Decision**: API routes query Supabase first, falling back to an in-memory store with seeded research data.
- **Rationale**: Zero friction out of the box with ready-to-use production SQL schemas (`supabase/schema.sql`).

### Decision 4: Pluggable AI & Storage Adapter Pattern
- **Context**: Avoid proprietary lock-in for AI models and asset storage.
- **Decision**: Interfaces for `AIServiceAdapter` (`Gateway`, `Gemini`, `Mock`) and `StorageService` (`Supabase Bucket`, `DataURL`).
- **Rationale**: Enables seamless offline testing and flexible third-party key onboarding.

### Decision 5: Incremental Export & Collision Prevention Engine
- **Context**: Repeated exports to Notion and Obsidian previously duplicated content or created un-synced forks.
- **Decision**: Notion API verifies existing block fingerprints on destination pages before append, skipping duplicates. Obsidian generates deterministic YAML frontmatter (`researchie_atom_id`) and individual clip file paths.
- **Rationale**: 100% collision-free incremental research sync across repeated clipping sessions.

### Decision 6: Multi-Tier Destructive Deletion Safeguards & Soft-Delete Buffer
- **Context**: Accidental deletion of clips or projects risks irreversible loss of citations and annotations.
- **Decision**: Atoms use optimistic deletion paired with an 8-second animated Undo Toast and a session Trash drawer. Project deletion employs a strict safeguard modal with data retention choices (moving clips to Global stream vs hard purge).
- **Rationale**: Zero unintended research data loss with instant 1-click recovery.

### Decision 7: Citation Resolution on Demand, Cached on the Atom
- **Context**: The Research Clipper plan (Claude Docs, tab d31d0b0b-6195) needs every source resolved to a verified citation record. Lookups hit external APIs with strict rate limits (Crossref polite pool 10 req/s, PubMed 3 req/s without a key). Source pages list their own bibliography in `citation_reference` tags, which are secondary sources.
- **Decision**: Citations are stored on the atom as `metadata.citation`, inside the existing metadata JSON column, so no schema migration is needed. This is not a new atom type. The PATCH route in `src/app/api/atoms/route.ts` validates the record and merges it into metadata. The extension captures page metadata only and makes no network calls. Resolution runs in a server route (`/api/citations/resolve`) when the user asks for a citation, and the result is cached on the atom. Identifier lookup order: Crossref, DOI agency, DataCite, then PubMed for PMIDs. `citation_reference` tags are never read as sources. Default style is Vancouver. Lookups cap at 10 per request. Missing fields are marked `incomplete`, never guessed.
- **Rationale**: Keeps API keys and the Crossref `mailto` on the server, uses one shared rate limiter, avoids repeat lookups, and keeps the clip and its verified record together. Each lookup step is verified in `docs/CITATION_API_RESEARCH.md` before code relies on it.
- **Open**: APA 7 and AMA 11 formatting (not verified against primary sources); retraction check (not yet tested); whether `citation_pmid` and `citation_arxiv_id` exist on the pages we need.

---

## Molecule Build System Log

### `CRITIQUE` — 2026-09-30 · S1 Spec · Source: grill

**Finding:** Export to Notion and Obsidian is a static snapshot with no collision prevention or incremental update model for subsequent research clips.  
**Severity:** major  
**Root layer:** object model  
**Action:** fixed  
**Reasoning:** Implemented incremental sync mode with block fingerprint collision checking in Notion and deterministic `researchie_atom_id` YAML frontmatter in Obsidian.

---

### `CRITIQUE` — 2026-09-30 · S1 Spec · Source: grill

**Finding:** TextFragment links silently break when source web pages update, with no cached fallback snapshot stored.  
**Severity:** major  
**Root layer:** state  
**Action:** fixed  
**Reasoning:** Added verified snapshot caching and surrounding context fallback drawer with source drift protection indicators.

---

### `CRITIQUE` — 2026-09-30 · S1 Spec · Source: grill

**Finding:** Complex layout blocks break visually because raw DOM HTML does not encapsulate computed styles or canvas elements.  
**Severity:** blocker  
**Root layer:** surface  
**Action:** fixed  
**Reasoning:** Captured high-resolution raster image freeze-frame snapshots, defaulting display to Visual Snapshot with 4-way tab inspection (Visual Snapshot, Interactive DOM, Extracted Text, HTML).

---

### `CRITIQUE` — 2026-09-30 · S1 Spec · Source: grill

**Finding:** Timeline search degrades past 50 clips without date-range filtering, tag taxonomy, or semantic retrieval.  
**Severity:** minor  
**Root layer:** flow  
**Action:** fixed  
**Reasoning:** Implemented live multi-filter dropdowns for atom types and date ranges (Today, Past 7 Days, Past 30 Days) with live count badges and active status ribbon.

---

### Standing State & Provisional Decisions

- **Provisional 1:** Real-time multi-player collaboration and concurrent timeline ordering.
- **Provisional 2:** Offline clipping queue and cache resolution mechanics.
- **Provisional 3:** Automated periodic bi-directional webhook sync for Notion.


