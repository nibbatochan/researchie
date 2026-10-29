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
- **Limits**: The server uses the service-role key, so the per-user filters in code are the real lock and row-level security is the second. (Two code paths per route existed until Decision 22.)

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

### Decision 22: One Data Layer Behind One Interface; Local Mode Touches Only Local Files
- **Context**: After Decision 19 every data route still had two branches, and the local branch also copied every project, clip and delete into whatever Supabase project `.env.local` named. Here that was the old project, so local use and the browser tests were writing into it, and local reads merged its rows in.
- **Decision**: `src/lib/data/store.ts` defines one `DataStore` interface (projects, clips, documents). `cloud` (Supabase, per user) and `localStore` (the local files) both implement it, and a route calls `store` without knowing which one it got; the choice is made once from `AUTH_REQUIRED`. `localStore` never talks to Supabase, and local image uploads stay inside the clip. The old pgvector search call and the local mirror are gone.
- **Rationale**: One path per route is simpler to read and to test, and sharing (S-54) needs one place to ask "may this user see this project". Keeping the local files means local development and the 97-test suite still run with no database.
- **Limits**: Clips that existed only in the old Supabase project no longer show in the local app (they are untouched there). Local deletes of a missing project still answer "done"; on the accounts deployment they answer 404.

### Decision 23: Sharing Is a Role on the Project, Checked in the Data Layer
- **Context**: Every query filtered by `user_id`, so only the owner could see anything. Sharing (S-54) needed other accounts to read or edit a project without weakening that isolation. The Share button in the app was a mock with made-up people.
- **Decision**: A person has a role on a project: owner (`projects.user_id`), editor or viewer (a row in `project_members`), or none. Membership of a project covers its sub-projects. `cloud.roleOn` is the one question every method asks: reads need any role, writes need editor or owner, deleting the project and changing access need owner. Atoms and documents follow the project, not who created them (`user_id` stays the author). Invitations to an address with no account are stored and become access when that address signs in; no email is sent. The four new tables (`project_members`, `project_invites`, `share_links`, `access_requests`) have row-level security on and no policies, so only the server touches them. The mock Share modal was deleted; locally (one user) there is no Share button.
- **Rationale**: One place to ask "may this person do this" keeps the rules testable with a fake database (`tests/sharing.test.mjs`, 15 cases, including a removed member losing access at once) and keeps S-49's single data layer meaningful. Only a browser session can change sharing, so a leaked extension token cannot widen access.
- **Limits**: Roles are looked up on every call (no cache), which costs a query but means a removal is instant. A sub-project cannot be shared on its own. Links and access requests are the next steps.

### Decision 24: The Security Choices for the Tester Site Are Logged in One Place
- **Context**: The tester deployment (5 to 10 invited people) needed many security choices (sessions, invite code, isolation, secrets, sharing, extension tokens, account deletion, dependencies). They were spread over Decisions 16 and 19 to 23, the changelog and the deployment guide, with no single list of what was accepted and why.
- **Decision**: `docs/SECURITY_DECISIONS.md` is the log. Each entry states the decision, why it was made, what it costs, and where it lives in the code. It also lists the gaps accepted on purpose, what must be done before opening to more people, what the owner must keep doing, and what has not been verified. A new security choice is added there, and a short numbered decision here only when it needs a longer argument.
- **Rationale**: For a small trusted group, the useful question is "what did we decide to tolerate, and when does that stop being true". A single list answers it and is checked against the code.
- **Limits**: It describes the code as of 2026-10-16 and is only as current as the last person who updated it.

### Decision 25: The Platform Is the Writing Step, Not the Search Step
- **Context**: Researchers load papers into NotebookLM or Zotero and extract exact sentences there. NotebookLM does that well; the free Groq limit can not match it.
- **Decision**: Researchie does not search across papers. It takes text the researcher already has and gives it structure, citations and checks (paper outline, drafts, preview). SCOPE `S-128`.
- **Rationale**: Competing with Google on search loses; turning collected evidence into a checked, cited draft is a gap both research notes found empty.
- **Limits**: Depends on researchers bringing text over by paste or file (Decision 26). Full record: `docs/PAPER_WRITING_DECISIONS.md`.

### Decision 26: Build on NotebookLM and Zotero; Never Scrape Them
- **Context**: NotebookLM (now Gemini Notebook) has no free API and its terms name scraping. Zotero's API needs key handling and has limits.
- **Decision**: The researcher brings text by paste (paste box) or by file (RIS or BibTeX import). The extension reads only what the user selects.
- **Rationale**: Works with any tool the researcher already uses and can not be broken by a change in someone else's page.
- **Limits**: Zotero's own API is not connected yet (`S-109` remainder).

### Decision 27: The Preview Says "Preview Only" on Every Screen and Every Printed Page
- **Context**: Owner's rule: the preview must never imply it replaces journal formatting or editing. A downloaded PDF travels without its screen.
- **Decision**: A banner stays on the preview. The print page carries the same sentence as a fixed footer drawn by the page, not by a browser feature.
- **Rationale**: The warning has to be inside the file. Tested by printing a real PDF and reading each page.
- **Limits**: Page numbers need a recent Chrome or Edge; the note does not.

### Decision 28: Every Clip Is a Quote, an AI Summary, or Mine
- **Context**: The biggest integrity risk is an AI paraphrase cited as a paper's own words.
- **Decision**: `metadata.evidenceKind` (no schema change). Only a Quote can be in quotation marks, cited or listed as a reference. Captured clips default to Quote, notes to Mine. The quote check returns no page for a failed match, so a near miss can not become a citation.
- **Rationale**: Every later check reads this one field.
- **Limits**: A clip's kind is the user's word; a wrong tick is not detected.

### Decision 29: Structured Citations in Two Styles, With Our Own Formatters
- **Context**: Both Harvard and numbered were required. The standard engine (citeproc-js) is CPAL-1.0 or AGPL-3.0, which can force publishing a hosted app's source.
- **Decision**: One citation record per clip, rendered as Harvard or numbered from the same data, so a style switch never changes the document. Formatters aligned with the CSL files `harvard-cite-them-right.csl` and `ieee.csl`.
- **Rationale**: Licence safety and no new dependency.
- **Limits**: CSL files were read through a summarising tool; the Cite Them Right book and IEEE guide were not. "Harvard" is a family of about 115 styles.

### Decision 30: The AI Drafts One Section From That Section's Clips; Every Sentence Is Then Checked Without a Model
- **Context**: Free-tier compute and trust. A real call showed a model blending the researcher's own result with a cited paper's.
- **Decision**: One call per section, at most 12 clips and about 6,000 characters. The model names the clips each sentence rests on. Then fixed checks: no source, quote not in the clip, number or equation not in the clips, copied without quotation marks, mixed own and cited, AI-summary only, open placeholder.
- **Rationale**: Cheap, repeatable and visible.
- **Limits**: A passing sentence is sourced, not true; a reworded sentence is not tested for meaning.

### Decision 31: A Section Is Done Only When Its Checklist Passes
- **Decision**: Blocks: flagged sentences, uncited quotes, AI summaries, placeholders, retracted sources, figures with no source. Warns: quote over 50 words, borrowed figures, no caption, unchecked retraction, sentences citing nothing.
- **Rationale**: 50 words is the strictest publisher figure found (NIHR); Cambridge allows under 100, APA block-quotes at 40. Warnings that fire on everything get ignored, so uncertain checks only warn.
- **Limits**: Retraction data: the DOI lookup sets `retracted` only when Crossref lists a notice, so "no result" is not "clean". A stronger check waits for `S-79`.

### Decision 32: The Outline Is Saved in Account Preferences, One Per Person
- **Context**: Owner chose, in chat, account preferences and a separate outline per person on a shared project.
- **Decision**: Stored as one preference per project (`researchie.paperOutline.<project>`), 60 KB cap, visible "Not saved" notice. "Draft again" keeps the previous draft.
- **Rationale**: No migration; a collaborator never changes someone's plan.
- **Limits**: All preferences share a 256 KB limit. Real-time shared editing stays provisional. Not yet tried signed in.

### Decision 33: The Paste Box Makes a Quote Only From a Word-for-Word PDF Match
- **Decision**: Pasted text is matched sentence by sentence against the project's PDFs, with no AI. Exact matches become Quotes with the PDF's own wording, page and citation; near matches get a hint only; sentences under 5 words never match; the rest saves as an AI summary or own text.
- **Rationale**: What NotebookLM's copy button puts on the clipboard is not documented, so the source is re-derived locally.
- **Limits**: A paraphrasing answer will rarely find a quote; scanned PDFs without text are not matched.

### Decision 34: Reference Import Attaches Citations to PDFs and Clips
- **Context**: Owner chose, in chat: attach each RIS or BibTeX entry to the matching PDF or clip (DOI, then title) and show the rest for picking.
- **Decision**: Files are parsed in the browser. A known retraction is kept when a citation is replaced; imported records are marked "manual". New `PATCH /api/documents` and `updateDocumentCitation` in both stores.
- **Limits**: Title matches need a person to confirm. Zotero's API later.

### Decision 35: Maths With KaTeX; Figures and Tables Keep Only Text and a Source
- **Decision**: KaTeX (MIT, trust off) draws LaTeX typed in the researcher's own text; display equations are numbered; a price like "$5 and $10" is not maths. An image clip is a numbered figure, a clip with an HTML table is a numbered table keeping only its cell text. A figure with no source blocks; a borrowed one warns about permission. A draft may only copy an equation exactly from a clip.
- **Limits**: Equations are not recovered from PDF text; no TikZ or custom packages.

### Decision 36: PDF Export Uses the Browser's Print Window
- **Decision**: A separate white A4 page in a hidden frame, one or two columns; the user chooses Save as PDF.
- **Rationale**: Free, no dependency, and equations and fonts print as shown. A PDF library could not draw KaTeX.
- **Limits**: One extra click; Chromium only was tried.

### Decision 37: The Researcher's Own Text Is a Plain Editor With [@key] Citations
- **Decision**: A text box; citations inserted from a list as readable keys; a legend explains each; the preview draws them in the chosen style. Moving an AI draft into the text ticks "drafted by AI", which adds a preview note.
- **Rationale**: A rich-text editor costs far more than a first version needs, and plain text keeps the document easy to store and check.
- **Limits**: No bold, italic, headings, lists or automatic "see Figure 1".

### Decision 38: A Refused Preferences Save Is Reported, Not Lost
- **Context**: Reading the saver showed that a refused save (a 413 "too large") looked like success.
- **Decision**: The preferences provider exposes `saveError`; the outline view shows it. A server fault or lost sign-in is retried with the next save; a refusal is not.
- **Limits**: Not seen live with an account; no automated test of the provider.

### Decision 39: Commits Contain Only This Feature's Work
- **Decision**: Files shared with other people's unfinished work (`SCOPE.md`, `docs/CHANGELOG.md`, `src/lib/data/cloud.ts`) were staged with only this feature's lines.
- **Rationale**: Nobody's half-finished change is published under this feature's message.

### Decision 40: Paper Mode Is a Workspace of Many Papers
- **Decision**: A `papers` table (migration 006) and a file-explorer home replace one outline per project in the account preferences. A paper is private to its owner, points at its data-source project by id with no foreign key, and is deleted in two steps (trash, then remove).
- **Rationale**: The preferences store is capped at 256 KB for all settings, so several papers cannot live there.
- **Limits**: The editor and the move of old outlines are not built yet. Papers are not shareable.

### Decision 41: The Editor Will Be TipTap (Reverses Part of Decision 37 for the Workspace)
- **Context**: Decision 37 chose a plain text box because a rich-text editor cost too much for a first version. The owner now wants Word-style editing, section reordering, drag and drop and paste from Word.
- **Decision**: TipTap (MIT core). The page look is a CSS page sheet; page-based layout and DOCX export are paid in TipTap and are not used. Planned, not built.
- **Limits**: The `[@key]` citation model carries over as a TipTap node. Sanitising pasted HTML is required.

### Decision 42: The Paper Editor Core (S-154)
- **Decision**: A paper is two JSON values: `doc` (ProseMirror JSON in `{v:1, pm}`) and `meta` (`{v:1, ...}` front matter, page setup, cite map, manual references). The body stores clip ids and citation keys, never clip text or image data. Template headings are locked by a transaction filter that compares the locked sections before and after every change.
- **Rationale**: A filter on the whole document catches every way to remove a heading (typing, backspace, select-all and delete, paste over), where per-key handling would miss cases. Storing keys keeps style switching free.
- **Limits**: Open time measured on the dev server only (about 0.4 s). Clips are not loaded yet, so citations to unknown clips show [?] until C2. TipTap's page layout and Word export are paid and are not used.

### Decision 43: The Editor Locks Nothing and Takes Its Type Scale From a Real Paper
- **Decision**: Template sections and headings can be typed over or deleted (a section's heading is optional); a transaction filter no longer protects them. The page type scale, the toolbar's styles and the layout options come from measuring a real PLOS ONE article. Numbered citation styles were removed from the menus; quotes lost their side rule.
- **Rationale**: Owner feedback, 2026-10-22: the editor is freehand, so structure must be removable to match a real paper. This reverses the template-heading lock of Decision 42.
- **Limits**: The sample's side column, numbered headings and figure cross-references are not built. A numbered bibliography may need to come back.

### Decision 44: Pages, Menus, Columns and Five Real Citation Styles in the Paper Editor
- **Decision**: The sheet is real A4 or Letter pages. Each block is measured and moved down (a padding-top decoration) so none crosses a page edge; the same pass covers the front matter, statements and references, keeps a heading with what follows, and splits a paragraph taller than a page line by line with spacer gaps. The toolbar groups tools into menus (alignment, line spacing, lists, more text formats, columns) and two panels (Page settings with a page list, Header & footer). Columns are a block of 2 to 6 columns with resizable widths. A ruler sets the margins. APA 7, Harvard, IEEE, Vancouver and AMA each draw their own in-text marker and reference list; clips of one paper (same DOI, title, year, first author) are listed once.
- **Rationale**: Owner feedback in 2026-10: it should look and behave like Word, without a wide toolbar. Moving blocks with padding leaves the document text untouched, so undo, copy and save are unaffected, and the layout is only a view.
- **Limits**: A columns block, list or table taller than a page cannot be split; it is outlined and noted in the status line. Layout is measured in Chromium only. Pagination re-measures the whole paper on each change (about 120 ms per key at 61 pages in the test browser). MLA and Chicago are not built.

### Decision 45: Print by Copy, Fonts and Highlights as Our Own Marks, Find as a Decoration
- **Decision**: Print / PDF re-lays the pages with no gap, copies the sheet into a print-only container and calls the browser's print; nothing is generated server-side. Typeface and highlight are our own marks with a fixed list of values, so pasted `font-family` and `background-color` are dropped. Find and replace marks matches with a decoration plugin and replaces through ordinary transactions. Markdown export is a pure function over the document.
- **Rationale**: The browser prints exactly what the editor shows, so the PDF cannot drift from the screen. Whitelisted values keep a pasted Word or web page from dragging foreign styling into a journal-looking paper.
- **Limits**: Print layout is verified in Chromium only (page count, size and text of its own PDF output). Tall columns, lists and tables are still not split across pages.

---

### Decision 46: One Export Menu for Word, PDF and Markdown
- **Decision**: The paper editor's Export button opens one menu: Word (.docx), PDF (print), Markdown (.md). It replaces the three separate buttons. The print item keeps its `paper-print` test id and is disabled while printing.
- **Rationale**: Owner request, 2026-10-28: one place to export, three formats.
- **Limits**: PDF is the browser's print dialog (Save as PDF), not a server-side PDF.

### Decision 47: Word Export Written Straight From the Editor Document
- **Decision**: `paperToDocx` walks the editor's ProseMirror JSON and writes WordprocessingML itself. The Markdown route stays only for `markdownToDocx`. Sections carry a `columns` attribute ("1", "2", or unset to follow `meta.page.columns`), and each run of same-column blocks ends in its own section break. Figures are embedded as PNG or JPEG (size read from the file header). Tables become real `w:tbl` with `vMerge` and `gridSpan`, so merged cells keep their columns. Control characters are stripped before writing, because Word refuses a file that contains them. The package has no folder entries.
- **Rationale**: The Markdown middle step lost tables and images and could not express per-section columns. A Word file that opens is the first requirement.
- **Limits**: Equations are written as monospace LaTeX text. Hyphenation, per-paragraph spacing and odd/even headers are not carried over. Checked by XML well-formedness and python-docx only; no copy was opened in Microsoft Word.

### Decision 48: Column Layout Per Section, With a Whole-Paper Reset
- **Decision**: The column count is a section attribute. The Columns panel has "This section: One / Two columns" and "Whole paper: One / Two columns"; choosing a whole-paper value clears every section's override so the paper setting applies again. Figures and tables run across all columns (CSS `column-span: all` in the editor, a section break in Word).
- **Rationale**: Owner request: columns only where needed (for example Methods), never on References or back matter. Before this, the whole-paper setting could not be undone once a section had its own value.
- **Limits**: Editor pagination treats a two-column section as one block (see Decision 49). A section taller than one page is flagged in the status line, not split.

### Decision 49: Two-Column Sections Are One Block to the Page Logic; Long Ones Are Split Into Chunks
- **Decision**: In `paginate()`, a two-column section is measured and padded as a whole, not child by child. The replica builder splits any two-column section above about 520 words of weight into several page-sized sections, each keeping the same column setting.
- **Rationale**: Padding each paragraph inside CSS columns moved text between columns, changed the height, and padded again; the page shook. Measuring the section as one block stopped the loop (0 DOM changes in a 3-second browser check at 1280, 1920 and 1500 px).
- **Limits**: A chunk boundary is a split by weight, not a real page-break position. Workaround for users: keep a two-column section under about one page, or split it with a section break.

### Decision 50: Every Section Ends in Text
- **Decision**: A `TrailingText` plugin appends an empty paragraph to any section whose last block is a formula, figure, table or page break. It runs on every edit and once when the editor opens.
- **Rationale**: Clicking the space below such a block had no text position, so typing did nothing there.
- **Limits**: Each such section gains an empty paragraph, which shows as a blank line in exports.

### Decision 51: Figure Pictures Come From a Shared Map, Not a Closure
- **Decision**: Figure views read their picture from a module-level map `figureSources` (clip id to data URL), filled from the project's clips whenever they change, and repaint on a `paper:clips-changed` event.
- **Rationale**: Figure views created before the clips loaded kept an old reference to the clip list and never showed their pictures. A shared map is read at paint time.
- **Limits**: One editor per page is assumed; a second editor on the same page would share the map.

### Decision 52: Insert Table From a Word-Style Grid; Tables Use Automatic Widths and Grid Lines
- **Decision**: The toolbar's Insert table control opens a 6 × 6 grid picker (hover to size, click to insert, first row as header). In the editor, tables use automatic column widths and a 0.5 pt grid, matching the Word export.
- **Rationale**: Owner request: table tools as in Word, with table content built as real tables inside the paper. Fixed layout gave every column the same width.
- **Limits**: The picker is capped at 6 × 6; larger tables are made by adding rows and columns.

### Decision 53: A Two-Column Section Taller Than a Page Is Shown in One Column in the Editor
- **Decision**: The editor measures a two-column section in one column. If that is taller than a page's text area, the section is not one block: its paragraphs are split across pages like plain text, and the editor shows a note naming the page. The section stays two columns in Word and PDF export.
- **Rationale**: Splitting inside CSS columns needs per-paragraph padding, which moved text between columns and made the page shake (Decision 49). Owner chose this fallback over a warning only and over a per-paragraph split.
- **Limits**: In the editor and in print, a tall two-column section reads as one column. Page-break and column layout can differ from Word for that section. Only sections are handled; a `columns` block (Insert columns) taller than a page is still flagged as before.

---

### Decision 54: Comments Are a Mark on the Text, the Note Lives in Meta
- **Decision**: A comment on selected text is a `comment` mark carrying an id. The note (text and time) lives in the paper's `comments` list in meta, not in the document. The Comments list reads both: the marks give the text and its place, the list gives the note. Deleting a comment removes its mark and its note.
- **Rationale**: Word-style comments on text. Keeping the note out of the document keeps the body text clean for export and lets the list stay in the toolbar.
- **Limits**: Comments are not exported (Word, PDF, Markdown). Print shows the highlight. No replies or resolve. A comment whose text was deleted stays in the list as "Text removed" until deleted.

---

### Decision 55: The Page Citation Travels With Every Send From the Extension
- **Decision**: One shared script (extension/pageCitation.js) reads the page's DOI, PMID and web facts and gives one source line. The line is put first in page text sent to the AI and under the answer; the same fields are saved with image, screenshot, block, link, brief and answer items. Every injection list loads the script first.
- **Rationale**: Owner request: content sent from the extension should keep its citation. Copies of the reader in four files had drifted apart.
- **Limits**: The AI gets the source as text in its input; the server does not parse it into a structured citation. Not run in a real Chrome against a DOI page.

---

### Decision 56: Timeline Answers Carry Page Links for Documents and No Links for Web or Plugin
- **Decision**: A document answer keeps a [Page N] link on each sentence that has a source; the link opens that page in the reader. A web or plugin answer saved to the timeline has its links removed (the words stay) and its source line has no URL; the URL stays in the saved metadata.
- **Rationale**: Owner report: AI answers carried links that did not work in the timeline. Document pages can be reached exactly; web links from an AI answer cannot be checked.
- **Limits**: Only the first page of a document answer is highlighted with its quote. Answers saved before this change keep their links. The extension zip was rebuilt (npm run pack:extension).

---

### Decision 57: Eight Deliverables Become Five; Memo, PRD and Summary Are One Research Brief
- **Decision**: The AI sidebar lists Research Brief (memo, product document or findings summary, chosen by focus), Comparison Matrix (literature review or side-by-side, chosen by focus), Contradictions & Gaps, Video / Podcast Script and Custom Analysis. Key Findings Summary, Executive Memo, PRD and Literature Review Matrix are removed as separate entries.
- **Rationale**: The four written outputs and the two tables differed only in the instruction. One name per group is clearer for a researcher.
- **Limits**: The server's local fallback still has separate branches keyed on the instruction words. The fallback's canned text is not yet removed (see Decision 56 note in the earlier review).

---

### Decision 58: PDF Citations Come From the File; Wrapped PDF Lines Are Joined; Timeline Notes Carry No Links
- **Decision**: A PDF in the browser's own viewer has no page tags, so the extension fetches the file once per address and the platform reads its DOI and title (/api/citations/pdf, in memory, nothing stored). In the reader, the open paper's citation is put in the page as citation_* meta tags, so the plugin finds it like on any article page. Text from a PDF has its single line breaks joined into paragraphs (blank lines stay). Synthesized notes saved to the timeline have their links removed.
- **Rationale**: Owner report: copied PDF text had no citation, every printed line became a paragraph, and timeline notes carried links that did not work.
- **Limits**: The first DOI in the PDF metadata or first page is used; a stray DOI of a cited work is possible (the checks in the reader still run on upload). Not run in real browser PDF viewers.

---

### Decision 59: The Text and the Reference List Have Their Own Citation Choice
- **Decision**: A paper chooses how a citation reads in the text (numbers that point to the list, or author and year) apart from the style of the reference list. Numbers are numbered by first use and each list row carries its number; author and year give an alphabetical list. A paper with no choice keeps its style's own way. A note written in the Researchie AI edit window is the researcher's own text (evidence kind "mine") and carries the clips it cites; placing it in a paper cites all of them with one marker.
- **Rationale**: Owner request: in-text citation and reference citation are different syntax; researchers rewrite AI text in their own words and the result must not read as AI-written.
- **Limits**: New papers still default to the old style (APA); a source with no citation details gets a plain line in the edit window and no marker in the paper.

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

---

### `DECISION` — 2026-10-28 · AI providers · Source: user request

**Decision:** Claude (Anthropic) is offered next to Groq in Settings → AI, with a fixed model list (Haiku 5.5, Sonnet 5.5, Opus 5.5, Fable 5.1). Each Ask AI answer and synthesis shows the model that wrote it ("Answered by …"), taken from the API response, so a fallback model shows as itself.

**Why:** Testers asked to use their own Claude account and choose the model. The model label makes it clear which model produced an answer.

**Structured output:** The Claude adapter forces JSON through a tool call (`tool_choice` on `record_result`), so the reply shape comes from the API. Groq keeps `response_format: json_object`, which does not guarantee a schema.

**Not done:** Perplexity Agent API (not clip-grounded; needs its own web-research feature). "Code mode" (no tool loop in the current pipeline, so nothing to save).

**Reasoning:** Supersedes the 2026-10-18 "only Groq" decision for the provider list. Claude subscriptions (Pro/Max) cannot be used; only an API key works.

### `DECISION` — 2026-10-28 · Web research (Perplexity) · Source: user request

**Decision:** Web search is a separate action in the AI chat (globe button). It calls Perplexity's Agent API (`POST https://api.perplexity.ai/v1/agent`, `web_search` tool, `effort: fast`). Answers are labelled "not from your clips" and list their web sources.

**Why:** Perplexity searches the open web, so its answers cannot be checked against saved clips. Keeping it as its own action stops a web answer passing as a clip-grounded one.

**Key storage:** its own table, `user_web_keys`, so a user can keep Groq or Claude for answers and Perplexity for web search. Run the table block in `supabase/schema.sql` on the tester database before use.

**Cost:** saving a key makes one short search call to check it, which uses a few tokens.

**Reasoning:** supersedes the earlier "Perplexity not done" note in the entry above.

### `DECISION` — 2026-10-28 · Paper abstracts from OpenAlex for answers · Source: user request

**Decision:** `POST /api/papers/ask` searches OpenAlex (`api.openalex.org/works?search=`), keeps up to 5 works with an abstract that are not retracted, and asks the user's AI provider to answer from those abstracts only. The answer is labelled `basis: "abstracts"` and lists each paper with its DOI.

**Why:** Abstracts give the model real research context that the user's clips may not hold. OpenAlex is free and needs no paid access. OpenAlex provides no full text, so answers say they come from abstracts.

**Key:** on the tester deployment each user saves an OpenAlex key in Settings → Paper search (`user_openalex_keys`, AES-256-GCM, checked once, last four shown). Locally the server reads `OPENALEX_API_KEY` from `.env.local`. Without a key, OpenAlex's small shared daily budget applies, and the answer says so.

**Chat:** the side panel has a "Papers" toggle that routes the question to `/api/papers/ask`. **Not done:** a paper picker in the web app chat, and full text. Clip answers still come from `/api/ai/qna`. Groq stays the answer writer.

**Reasoning:** OpenAlex finds and describes papers; it cannot write answers, so the AI provider remains the writer.

### `DECISION` — 2026-10-29 · Research AI notes are named by origin · Source: user request

**Decision:** A note saved from Research AI carries `metadata.origin = 'research-ai'`. The timeline shows "Research AI answer" in place of its web address, the paper labels it "Paraphrased", and its references are kept in `metadata.references`. Template tags (`ai-synthesis`, the template id) are no longer added to saved notes.

**Why:** Saved notes had no web address, so the server stored `https://example.com` and the card showed it. The "Overview" label came from AI text with no heading. Researchers asked for the notes to read as their own work.

**Reasoning:** the origin is a marker on the note, not a new atom type, so existing notes and the paper keep working.

### `DECISION` — 2026-10-29 · Clips with a web address are cited as web pages · Source: user request

**Decision:** A clip without a citation record but with a web address is cited as a `web_page` record built from its title and address (status `incomplete`, no authors). It is numbered in the paper and listed in References. It does not appear on the Citations tab (`webFallback` on the clip info). A placeholder address (`https://example.com`) is never cited.

**Why:** Research AI notes cite the clips they were written from. Those clips rarely have a verified citation, so their notes showed no numbers.

**Reasoning:** the record says what is known and marks the rest "n.d." rather than guessing an author or year.

### `DECISION` — 2026-10-29 · Papers page: recent row, sort, filters, delete all in trash · Source: user request

**Decision:** The newest four papers sit in a Recent row; the rest are under All papers, sortable by last edited, name or newest created, and filterable by template and data source. The Recent row is hidden while a search or filter is on. Trash has Delete all: one confirm, then `purge_trash` removes every trashed paper of the signed-in person.

**Why:** A long paper list was hard to scan. Delete all was requested; removing trashed papers one at a time was too slow for a full trash.

**Limits:** Delete all is permanent and has no undo. It is not covered by e2e, because a test would empty a real trash.

### `DECISION` — 2026-10-29 · Forgot password through a Supabase reset link · Source: user request

**Decision:** "Forgot password?" sends a reset email from `/api/auth/forgot`. The link goes through `/auth/callback` (the existing code exchange) to `/login/reset`, where `/api/auth/password` sets the new password for the signed-in recovery session (8 to 200 characters). The forgot reply is the same for every email.

**Why:** Users were locked out with no way back. The same reply for every email stops the form from revealing which accounts exist.

**Requirement:** in Supabase, **Authentication → URL Configuration**, the Vercel domain must be listed under Redirect URLs (`https://<domain>/**`), or the link is refused.

### `DECISION` — 2026-10-29 · Timeline pages of 25 clips · Source: user request

**Decision:** The timeline shows 25 clips per page with Previous and Next. A new search, filter or project returns to page 1. "Select all" still selects every matching clip, not just the page.

**Why:** Long projects rendered every clip at once.

### `DECISION` — 2026-10-29 · NEXT_PUBLIC_AUTH_REQUIRED is a public, non-secret flag · Source: deploy

**Decision:** `NEXT_PUBLIC_AUTH_REQUIRED=true` is set in Vercel as a Config variable, not a Secret. It is read in browser code (`src/lib/auth/authContext.tsx`), so it must have the `NEXT_PUBLIC_` prefix. Vercel's warning about the prefix is ignored for it.

**Why:** Vercel refuses a `NEXT_PUBLIC_` variable as a Secret. The value is not secret.

**Keep private:** `SUPABASE_SERVICE_ROLE_KEY` and `KEY_ENCRYPTION_SECRET` have no prefix and stay Secret.

### `DECISION` — 2026-10-29 · Security audit fixes: graph route, CORS, SSRF, extension messages · Source: security audit

**Decision:** four fixes. (1) `/api/ai/graph` accepts only `projectId` matching `^[A-Za-z0-9_-]{1,100}$` and starts the Python script with `execFile` and an argument array, not a shell string. (2) CORS for `/api` is decided per request in `src/middleware.ts` (`src/lib/auth/cors.ts`). Without accounts, only this app, loopback pages and `chrome-extension://` origins pass; any other origin gets 403. With accounts, any origin may call, but `Access-Control-Allow-Credentials` is no longer sent. (3) Server-side fetches of user-supplied URLs on the accounts deployment (`rebuild-context`, OCR) go through `fetchPublic` (`src/lib/security/safeFetch.ts`): it checks every redirect hop and the addresses the host resolves to. (4) The extension content script accepts `RESEARCHIE_SET_ACTIVE_PROJECT` only from its own window and from a Researchie origin (loopback or the connected server), and the side-panel drawer accepts messages only from its own iframe.

**Why:** the graph route was unauthenticated shell injection, and the wildcard CORS let any website a developer visited call it (and read or write local clips). The old URL check read text only, so a redirect or a DNS record could reach internal addresses. Any web page could post a message to switch the extension's active project.

**Not done:** DNS rebinding between the lookup and the fetch (needs a pinned-IP agent). The extension's `web_accessible_resources` still list the side panel and popup for all sites. The extension's direct-fetch fallback to `localhost` from a page depends on loopback CORS and is unchanged. Dependency updates (`katex`, `next`, `sanitize-html`) are pending.

### `DECISION` — 2026-10-29 · Security audit fixes, second batch · Source: security audit

**Decision:** (1) Extension: the web-accessible side panel files use `use_dynamic_url`, and `popup.*` is no longer web-accessible. (2) `POST /api/auth/password` needs either the `rs_reset` cookie (set by `/auth/callback` after a reset link, 15 minutes, bound to the user id) or the current password, checked with a separate client; wrong tries are limited to 5 per 15 minutes per user. It also refuses cross-site writes. (3) `POST /api/auth/forgot` is limited to 3 requests per email and 10 per caller per 15 minutes (per server instance), and builds the reset link from `NEXT_PUBLIC_SITE_URL` when it is set. (4) With `AUTH_REQUIRED=true` and no `SUPABASE_SERVICE_ROLE_KEY`, using `supabaseAdmin` throws instead of falling back to the anon key. (5) `sanitize-html` updated (fixes `sanitize-html` and `deepmerge`); `katex` updated within 0.16.

**Why:** a stolen session cookie was enough to change the password; reset emails could be flooded; a forged Host header could steer the reset link; a missing key failed in odd ways.

**Not done:** `next` (and its `postcss`) needs a major upgrade to 16.x; `katex` 0.19 is a major bump for a low advisory. A Google-only account has no password, so it must use the reset link to set one. The rate limits are per server instance, not shared. `use_dynamic_url` is not yet tested in Chrome. Set `NEXT_PUBLIC_SITE_URL` on the deployment.
