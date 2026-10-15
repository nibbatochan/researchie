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
- **Limits**: A wrong paper that shares the clip's title is still accepted. An automatic PDF DOI whose title differs from the PDF's showed only a note, and there was no "Save anyway" button. **Updated by Decision 15.**

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

### Decision 14: PDF Export Is a Real File Built in the Browser, in Our Design System
- **Context**: The app exported only text formats. A researcher needs a document to hand to a supervisor or attach to a draft, with sources attached.
- **Decision**: `@react-pdf/renderer`, loaded only when the user exports, draws a report from a plain data model (`ReportModel`). The model is built by a pure function (`pdfReport.ts`) and drawn by `ReportDocument.ts`, so each half is tested in Node without a browser. Chosen over "print to PDF" because it gives one click, exact layout, clickable links, bookmarks and page numbers on every browser. Cover is white with a blue rule (prints cheaply). Design-system tokens live in `theme.ts`; each semantic colour has one job, and the three colours below 4.5 contrast on white colour shapes only.
- **Decision**: Text is never dropped silently. The two bundled fonts cover Latin only, so any character outside them is drawn in DejaVu Sans (Greek, math, arrows, sub and superscripts, Latin-extended, Cyrillic), and characters no font has show as a visible mark and are listed in the dialog first. A real export showed the problem: "data‑driven" lost its hyphen and "μm" would have become "m".
- **Limits**: No page numbers on the contents page. The bibliography is numbered for every style (no author-date citations). The mono font's ligature table was emptied because its Latin subset crashed on "//" and "--"; this is noted in `public/fonts/LICENSE.txt`.

### Decision 15: Citation Warnings Grow Carefully: Save Anyway, PDF Mismatch, Amber Retraction
- **Context**: Decision 8 limited warnings to mismatches the user caused. Real use then showed three gaps: a user who knows a mismatched source is right had no way to keep it, a PDF whose DOI pointed to another paper showed nothing, and a retraction was a quiet gray note.
- **Decision**: (1) A mismatch the user entered still stops the save, but the screen now offers **Save anyway**; the citation is then kept with its warning visible. (2) A DOI read from an uploaded PDF that points to a different paper is saved with the warning "This might not be the source. Please verify." and no gate. (3) A retracted paper shows its own amber box ("This paper has been retracted. Do not cite it as valid evidence.") apart from the verify warning, so the two are never confused.
- **Rationale**: A warning still has to mean "there is evidence this is wrong". An automatic DOI that contradicts the file is evidence; a missing field is not. Amber, not red, matches the design system: red is for "could not be checked".
- **Limits**: PDF metadata titles are often tool leftovers ("Microsoft Word - draft.docx", "PII: S0140-...", file names). Comparing one would raise a false warning, so those count as no title (the PDF title field was also never being read: pdf.js names it `Title`). A PDF with no usable metadata title gets no mismatch check.

### Decision 16: Secrets Never Go in Documents, and Every Push Is Scanned
- **Context**: Before the first push to GitHub, a scan found the real Supabase URL, anon key and service-role key written in a planning document, in every commit that held it. The repository had only ever been local.
- **Decision**: Rewrite history before the first push (a tree filter replacing the three values with placeholders), prove that no value from `.env.local` remains in any commit of the pushed branch, push only that branch, then rotate the service key and confirm the old key is refused (HTTP 401). The standing rule: before each push, search every unpushed commit for each value in `.env.local`, listing names only, never values.
- **Rationale**: A key in a pushed commit cannot be taken back, and rotation alone leaves it readable in history. Doing both is cheap before the first push.
- **Limits**: Local branches that were not rewritten (`main`, `cleanup/2026-10-09`) may still hold the old values and must not be pushed as they are. A key pasted into a chat is exposed to that log, so it should be placed in `.env.local` by the owner.

### Decision 17: Browser Tests Choose Their Own Data and Clean Up After Themselves
- **Context**: `e2e/07` and `e2e/08` failed 4 to 11 times out of 14 from run to run. They clicked "Resume Reading" on whichever document the app listed first without choosing a project (documents are shown per project, newest first), and checked for the button without waiting. Several tests also saved a clip on every run: 22 duplicates had piled up.
- **Decision**: One helper (`e2e/helpers/open-reader.ts`) picks the project and the document by name and waits for each step. A second helper (`e2e/helpers/cleanup.ts`) deletes the reader clips a suite saved, never older ones, and `KEEP_TEST_CLIPS=1` switches it off for inspection. Tests that create clips through the API delete them afterwards.
- **Result**: 14 of 14, then 28 of 28 over two repeats (was 9 of 14). A run leaves the project's clip count unchanged (proved with the cleanup switched off: one test adds 2 clips, with it on none).
- **Limits**: `e2e/06` still calls live Groq and asserts the model's exact wording, so it is excluded from routine runs.

### Decision 18: A Local Model Is a Test Fallback, Not a Replacement
- **Context**: Groq's free daily allowance ran out during testing, so `AI_PROVIDER=ollama` was added to send Q&A to a local Ollama server.
- **Decision**: Keep it as an opt-in switch, off by default. Measured on the same 18 questions: `qwen2.5:7b` 11 of 18 (correct on easy facts, but raw JSON on one question, passage markers in the text, a wrong answer to an unanswerable one, three wrong citations that the verifier caught); `deepseek-r1` 1 of 18 (its thinking output breaks the JSON the app expects). Groq stays the model for real answers.
- **Rationale**: The verifier meant a weak model never showed a wrong link as verified, but an answer the user cannot trust is still a failure.
- **Limits**: Groq needs questions one at a time, a few minutes apart, on the free tier.

### Decision 19: Accounts Are a Deployment Switch, and Supabase Is the Only Store When It Is On
- **Context**: Five to ten testers needed their own accounts and data on a hosted copy. The app kept its real data in two local JSON files (`.research-store.json`, `.documents-store.json`) merged with an optional Supabase mirror, no route knew who was calling, and Vercel does not keep files between requests.
- **Decision**: `AUTH_REQUIRED=true` turns on accounts. Every data route calls `authorize()`, reads and writes go through `src/lib/data/cloud.ts` (Supabase only, every query filtered by the signed-in user), and the file stores and the Python graph route are bypassed. With the switch off, nothing changes: one demo user, the file store, the existing e2e suite.
- **Rationale**: One switch keeps local development and the 70-test suite untouched while the hosted copy gets real isolation. The data layer takes its database client as a parameter, so the isolation rules are unit-tested with a fake (`tests/cloud-isolation.test.mjs`).
- **Limits**: The server uses the service-role key, so the per-user filters in code are the real lock and row-level security is the second. Two code paths exist per route until the file store is retired.

### Decision 20: The Login Session Is an httpOnly Cookie Set Only by the Server
- **Context**: `@supabase/ssr`'s browser client keeps the session in cookies that page scripts can read, and this app renders HTML captured from other sites.
- **Decision**: Sign-up, login and logout are server routes (`/api/auth/*`) that set the cookie with `httpOnly`, `sameSite=lax`, `secure` in production. The browser asks `/api/auth/me` who is signed in and never touches Supabase Auth. Cookie-authenticated writes from another origin are refused. The Chrome extension uses a token made in the web app (only its SHA-256 hash is stored), sent as a bearer header, kept in `chrome.storage.local`.
- **Rationale**: A script injected into a page cannot read an httpOnly cookie. A pasted token avoids relying on the browser sharing cookies with an extension, which was not verified.
- **Limits**: The token sits in extension storage until revoked. Google sign-in is a disabled placeholder. Switching accounts means signing out; a saved-accounts list would need one httpOnly cookie per account and was not built.

### Decision 21: Each User Brings Their Own AI Key, Encrypted on the Server
- **Context**: A shared key would burn the owner's quota, and provider limits apply per provider account.
- **Decision**: Settings -> AI lets a user pick Groq, Cerebras, OpenRouter or Google AI Studio and paste a key. The server checks it with the provider, encrypts it (AES-256-GCM, bound to the user id) and stores it; the browser only sees the last four characters. Every AI route builds its client from the signed-in user's key, and a missing, rejected or exhausted key returns a message instead of a mock answer. The server's own `GROQ_API_KEY` is ignored on the tester deployment.
- **Rationale**: All four providers speak the same chat format, so one adapter serves them. The provider notes on free tiers were checked against each provider's own pages; where "does not train on your data" could not be confirmed (Groq, Cerebras), the note says so. Google's free tier does use content to improve its products, and the UI warns.
- **Limits**: If `KEY_ENCRYPTION_SECRET` changes, saved keys cannot be read and users paste them again. Model names are editable text because provider model names change.

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
