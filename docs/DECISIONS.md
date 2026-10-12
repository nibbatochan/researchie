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

### Decision 8: Warnings Only for Mismatches the User Caused; Everything Else Is a Note
- **Context**: A wrong citation causes problems later, but warning on every imperfect record teaches users to ignore warnings. The first version flagged missing fields, preprints, web pages and automatic title differences. Real use showed that was too noisy.
- **Decision**: `assessCitation` in `src/lib/citations/verify.ts` returns `warnings` and `notes`. The warning "This might not be the source. Please verify." appears only when a DOI, PMID or title the user typed or picked points to a different title than the clip. Missing fields, preprints, web pages, unknown source types, retraction notices and automatic title differences are plain gray notes. A web page from a known URL is verified by its address (status `page_tags`, shown as "Web page"). A user-entered mismatch is a failed verify: it is not saved, the card shows the warning screen, and Back returns to the saved citation unchanged. Refresh clears any failed result and reopens the search box. `enteredByUser` is stored on the record so a refresh keeps the same rule. Records saved before the split are read as notes (`readConfidence`), so they never crash the card.
- **Rationale**: A warning has to mean "there is evidence this is wrong". Everything else is information.
- **Limits**: A wrong paper that shares the clip's title is still accepted. An automatic PDF DOI whose title differs from the PDF's shows only a note, by the rule above. There is no "Save anyway" button yet.

### Decision 9: Four Ways to Get a Citation, Without Asking for a DOI
- **Context**: Researchers rarely know a DOI or PMID.
- **Decision**: (1) The extension reads the page's own DOI and PMID from `citation_*` and Dublin Core tags at clip time (`metadata.pageIdentifiers`) and the page facts (`metadata.pageInfo`: title, site, author, date, URL). The extension makes no network calls. (2) Title search uses Crossref bibliographic search and returns up to five candidates, labelled journal article or preprint. The user picks one. (3) A web page without a DOI is cited from its page facts, with no lookup. (4) A PDF with no DOI gets a manual form (title, author, year, type), saved only when the user presses Save citation. For PDFs, every DOI in the metadata and on the first page is looked up (at most three), and the one whose title matches the PDF's title is used. Bibliography tags (`citation_reference`) are never read. Missing fields are shown as "not shown" in the Page · Author · Date line, never guessed.
- **Rationale**: The citation should work with no typing when the page gives enough, and ask for the least when it does not.
- **Open**: Preprint, dataset and book chapter records resolve but have no formatted line yet. APA and AMA rules are unverified (the manuals were not reachable). The extension capture was verified on real pages in the browser pane but not as a live Chrome clip.

### Decision 10: Document Q&A Uses Passages With Offsets; Links Come Only From Verified Citations
- **Context**: The assistant said "not found" for answers that were in the paper, and showed page links that could not be trusted. Causes: PDF extraction failed (Decision 13), the whole paper was sent to the model, and the model's own "[Page N]" text was taken at face value.
- **Decision**: `src/lib/ai/passages.ts` splits each page into passages of about 500 to 900 characters with ids `p{page}-{n}` and start/end offsets into the page text. Retrieval sends about 14,000 characters of the most relevant passages (explicit page, abstract questions, keyword scoring). A small document is sent whole. The model cites passage ids with verbatim quotes. The route locates each quote on its page and returns page, offsets and `supported`. The UI builds link icons only from supported citations, removes the model's own page markers (including full-width forms such as 【Page 1】), and checks the quote again on click. When a large document has nothing relevant, the route answers "not found" itself and does not call the model. A "not found" answer has no citations and no warning. The Q&A warning shows only when a cited quote is not on its page. Saving an answer to the project keeps the clean text, the first verified page, the supporting quote and the PDF's own citation.
- **Rationale**: Every link and every page number the user sees has been checked against the document text.

### Decision 11: Quote Verification Rules
- **Decision**: A quote is supported when it appears on the page after normalising: letters and digits only, case ignored, a word split by a line-break hyphen joined, standalone combining marks ignored. If the whole quote is not found, each sentence of three or more words (split at "...", "…" or sentence ends) must be found word for word and in order, and those sentences must make up at least 80% of the quote's words. A quote with invented text fails. The same rule runs on the server (`passages.ts`) and in the viewer (`src/lib/qa/answerLinks.ts`). The highlight uses the whole quote when it is all on the page, otherwise its first sentence.
- **Rationale**: Live runs flagged correct answers for four reasons: a quote stitched with "...", a quietly skipped sentence, a symbol with a hidden accent ("K̂n"), and a word split across a line break. After the rules above, 12 questions produced 29 citations with none unsupported.

### Decision 12: Say "Busy" Rather Than Answer Wrongly
- **Context**: Groq's free tier allows about 8,000 tokens per minute and 200,000 tokens per day per model. One question costs about 4,000 to 6,000 tokens. Under load the adapter fell through its model list, and a weaker fallback model sometimes answered "not found" for a question the paper answers.
- **Decision**: With a key configured there is no mock fallback. A failure returns HTTP 503 with "The AI service is busy or the request was too large. Try again in a minute." On a size error the route retries once with half the budget, re-selected by relevance so the page the user asked about stays in. A "not found" from a fallback model, when retrieval found relevant passages, is reported as busy. The 7B model `allam-2-7b` is skipped for Q&A. The answer allowance is 1,000 tokens.
- **Rationale**: A false "not found" is worse than "try again".
- **Open**: These last settings were verified by unit tests and the type check, not by a live run, because testing used up the daily allowance. Consider a paid tier.

### Decision 13: PDF Text Extraction Runs Outside the Server Bundle
- **Context**: `/api/documents/parse` crashed on every request with `TypeError: Object.defineProperty called on non-object`, thrown while webpack bundled pdf-parse's own pdf.js. The upload ignored the failed call and saved one placeholder page, "Uploaded Document Content", so documents had no text.
- **Decision**: `serverExternalPackages: ['pdf-parse']` in `next.config.mjs`. A PLoS paper then parsed to 15 real pages with the abstract on page 1.
- **Limits**: Documents uploaded before this change hold placeholder text and must be uploaded again. The parse route still swallows its own errors and falls back to placeholder text; surfacing that error is open work.

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
