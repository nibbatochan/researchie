# Version Changelog

## [v1.7.5] — 2026-10-13 (NLM web page format)
### Added & Enhanced
- **Web pages in Vancouver:** a web page now gets the NLM "part of a Web site" line: `Site [Internet]. Page title; year [cited 2026 Oct 13]. Available from: URL`. The site name is the page's site, or its host name when none is known. The plain fallback line is kept only for unknown source types.
- The rule comes from NLM Citing Medicine, chapter 25 (Web Sites), read from the NCBI Bookshelf. The site's place of publication and the page's update date are not captured, so they are left out. The page author is not listed, because NLM puts an author only in the site element.
- 116 unit tests.

---

## [v1.7.4] — 2026-10-13 (Clearer citation copy controls)
### Fixed & Enhanced
- **Copy controls moved to the status line.** The row of "Copy / APA / BibTeX / RIS" text links sat beside the citation with no sign of which was chosen or what would be copied. Now the style tabs (Vancouver, APA, BibTeX, RIS) and one Copy button sit on the "verified doi" line in the clip citation box and the PDF citation popover.
- **The chosen style is clear:** the selected tab is filled blue and marked `aria-pressed`. The choice is kept in the browser for the next card.
- **The citation box shows what Copy copies:** the text in the chosen style appears in the box (monospace for BibTeX and RIS), with a note that Copy puts exactly this text on the clipboard.
- **Copied is obvious:** the button turns green with a check and says "Copied" for 2.5 seconds, and resets if the style changes. If the browser blocks the clipboard, a hidden-textarea fallback is tried first; if that fails the button turns amber and says "Couldn't copy".
- New shared component `CitationStyleBar.tsx`; `e2e/11` checks the tabs, the preview, the Copied state, the clipboard text and that the style is remembered.

---

## [v1.7.3] — 2026-10-12 (Retraction warning, APA 7)
### Added & Enhanced
- **Retraction is an amber warning.** A retracted paper shows its own amber box, "This paper has been retracted. Do not cite it as valid evidence.", in the clip citation box and the PDF citation popover. It is separate from the "might not be the source" warning, and the old gray note is gone.
- **APA 7** (`apa.ts`): journal articles, edited book chapters, reports, preprints, data sets and web pages. Patterns come from the APA "Common Reference Examples" handout, and the unit tests use its worked examples. A new **APA** button sits beside Copy, BibTeX and RIS.
  - No author: the title moves to the author position. No date: "(n.d.)" plus a "Retrieved ..." date when known.
  - Plain text has no italics, so journal names and book titles are not italicised.
  - Titles are not converted to sentence case; they keep the source's own case.
  - More than 20 authors: first 19, ". . .", last. This rule is from the Publication Manual, not the handout.
- **Tests:** 115 unit tests (new `tests/citations-apa.test.mjs`), `e2e/11` covers copy buttons and the retraction box.

### Known Issues & Open Work
- AMA is still unverified (its manual pages did not load). The NLM web page format is unverified, so web pages keep the plain format in Vancouver.
- The Copy menu has no style picker for the main line yet; "Copy" is Vancouver, "APA" is APA.

---

## [v1.7.2] — 2026-10-12 (More citation styles, BibTeX/RIS, exports, retraction fix)
### Added & Enhanced
- **Vancouver for more source types** (`vancouver.ts`), following the NLM Samples of Formatted References:
  - Preprint: `Authors. Title. Server [Preprint]. Year [cited 2026 Oct 12]. Available from: https://doi.org/...`
  - Dataset: `Authors. Title [dataset]. Year [cited ...]. Repository. Available from: ...`
  - Book chapter: `Authors. Title. In: Editors, editors. Book. Place: Publisher; Year. p. pages.` Place and editors are left out when the source gives none.
  - Report: `Authors. Title. Place: Publisher; Year.` (simplified; NLM's agency and report-number elements are not captured yet).
  - Web pages and unknown sources still use the plain format.
  - The Crossref mapper now keeps editors, publisher place and a preprint's server name (`institution`).
- **BibTeX and RIS** (`export.ts`): Copy, BibTeX and RIS buttons in the clip citation box and the PDF citation popover. Special characters are escaped, page ranges use `--`, missing fields are left out.
- **Citations in exports:** Obsidian clip notes get a `doi` frontmatter line and a "Citation" section; Notion blocks and Notion Markdown get a "Citation:" line under quotes and captured blocks.
- **Tests:** 108 unit tests (new `tests/citations-formats.test.mjs`), new `e2e/11-citation-copy.spec.ts`.

### Fixed
- **Retraction missed on the DOI path:** Crossref lists a retraction on the original paper under `updated-by`, but only `update-to` was read, so a retracted paper looked normal. Found by a live check on the retracted 1998 Lancet paper (PMID 9500320); the PMID path already worked. Both now report retracted.

### Known Issues & Open Work
- NLM rules for web pages, the full report form and datasets with versions are not verified. APA and AMA are still unverified (their primary pages did not load).
- A retraction is shown as a gray note ("A retraction notice was found."), not a warning. Whether it should be louder is open.
- The extension capture is not tested as a live Chrome clip. That needs the unpacked extension loaded in Chrome.

---

## [v1.7.1] — 2026-10-12 (Document Assistant UI fixes)
### Fixed & Enhanced
- **Link icons per sentence:** each icon now ends the sentence it supports. Sentences before a cited one stay in its block; sentences with no support have no icon. Page markers and abbreviations ("et al.", "Fig.") never split a sentence (`buildAnswerLinks` returns `segments`).
- **One scroll per click:** the old code scrolled from three places. A citation click now jumps to the page at once and makes a single smooth scroll to the quote. The page observer no longer scrolls back after a scroll it caused, and the quote scroll runs once per quote.
- **Click away clears:** a click anywhere except a citation icon or a saved-clip row clears the highlight.
- **One saved highlight at a time:** only the selected saved clip is drawn on the pages; the sidebar list still shows all. A new clip is selected when saved. The sidebar buttons no longer scroll twice.
- **Resizable assistant panel:** drag the left edge (260 to 720 px). The width is kept in the browser.
- **Optional local model:** `AI_PROVIDER=ollama` (with `OLLAMA_MODEL`, default `qwen2.5:7b`) sends Q&A to a local Ollama server. Off by default.
- **Tests:** 95 unit tests; new `e2e/10-assistant-ui.spec.ts` (6 tests, mocked answers); `e2e/09` still passes 5 of 5.

### Known Issues
- `e2e/07` and `e2e/08` depend on which document was opened last and fail in different numbers from run to run (4 to 11 of 14), also on the previous commit.
- Local models are weaker: `qwen2.5:7b` passed 11 of 18 test questions and `deepseek-r1` 1 of 18. Groq remains the model to use. The final Groq settings still need a live re-run once the daily allowance returns.

---

## [v1.7.0] — 2026-10-12 (Citation Engine, Verified Document Q&A & PDF Extraction Fix)
### Added & Enhanced
- **Citation engine (`src/lib/citations/`):**
  - **Lookups:** DOI goes to Crossref, then the DOI agency (`doi.org/doiRA`), then DataCite. PMID goes to PubMed `esummary`, then `efetch` for a retraction check. One rate limiter per host, two retries with backoff on 429 and 503, and a cap of 10 lookups per request. Routes: `POST /api/citations/resolve` and `POST /api/citations/search`.
  - **Title search:** Crossref bibliographic search returns up to five matches, labelled journal article or preprint. The user picks one.
  - **Formatter:** Vancouver (ICMJE) for journal articles, six authors then "et al.". Web pages and unknown sources get a plain line. Preprints, datasets and book chapters show "style not yet supported".
  - **Records:** status, source type, `warnings`, `notes` and `enteredByUser`, stored as `metadata.citation` on atoms (`PATCH /api/atoms`) and as `citation` on documents (`POST /api/documents`). No schema migration.
  - **Page facts line:** every citation shows `Page · Author · Date`, with "not shown" for anything missing (`facts.ts`).
- **Extension (`extension/content.js`):** text clips and page links store `metadata.pageIdentifiers` (DOI and PMID from `citation_*` and Dublin Core tags, bibliography tags ignored) and `metadata.pageInfo` (title, site, author, date, URL).
- **Clip citation box (`AtomCard.tsx`):**
  - Book icon opens the citation. A refresh and close pill appears in the icon row.
  - One box takes a DOI, a PMID or a paper title. "Cite this web page instead" builds a web citation with no lookup.
  - Back appears only inside sub-views. A DOI, PMID or title the user entered that points to a different title is a failed verify: it is not saved, and the warning screen offers Back to the saved citation. Refresh reopens the search box.
  - Web pages from a known URL show "Web page", never "Incomplete". Older web citations are rebuilt for display.
- **PDF citations (`PDFReaderView.tsx`):** DOIs are read from the PDF metadata and first page and checked against the PDF title. With no DOI, a compact form asks for title, author, year and type, and saves only on "Save citation". A citation icon next to Upload PDF opens a panel with the citation and a Copy button.
- **Document Q&A:**
  - Passage chunking with offsets, relevance retrieval of about 14,000 characters, and an abstract and explicit-page mode (`src/lib/ai/passages.ts`).
  - Quotes are verified against their page and returned with page and offsets. Link icons come only from verified citations. The model's own page markers are removed.
  - Empty state is one sentence. The chat scrolls to each new question and answer.
  - Saving an answer to the project keeps the clean text, the first verified page and quote, and the PDF's citation.
  - The "Jump to Page" button and "Related" chips are gone.
- **Tests:** 92 unit tests across `tests/citations*.test.mjs`, `claim-support`, `passages` and `answer-links`. New Playwright spec `e2e/09-citation-links.spec.ts` (5 tests, mocked answers). `e2e/07` Req 8 and 9 now uses the link icon.
- **Docs:** `docs/CITATION_API_RESEARCH.md` (API and style-guide notes, with live checks) and `docs/manual-test/citation-test-data.md`.

### Fixed
- **PDF extraction:** `/api/documents/parse` crashed on every request, so uploads saved a placeholder page. Fixed with `serverExternalPackages: ['pdf-parse']`.
- **Wrong "not found" answers:** the route attached the best-scoring sentence as a citation, the model received the whole paper, and Groq's per-request limit rejected it before a local engine answered "not found". Now only verified citations are returned, and a failure returns a "busy" message.
- **False "This might not be the source" warnings:** correct answers were flagged for four matching reasons (quote stitched with "...", a quietly skipped sentence, a hidden accent in "K̂n", a word hyphenated across a line break). One rule now covers all four.
- **Retry dropped the page asked about:** the size retry cut the end of the context. It now re-selects half as many of the most relevant passages. A "not found" from a fallback model is reported as busy. The small 7B model is skipped.
- **Library delete:** the confirmation window was drawn only in the reader screen, so the trash button in the library did nothing and the window appeared after opening a document. It is now drawn in both screens.
- **Upload PDF** opens the file picker first. The upload window appears after a file is chosen and no longer shows the previous document's details.
- **Atom card crash** on citations saved before the warnings and notes split.

### Known Issues & Open Work
- Preprint, dataset and book chapter citations have no formatted line. APA and AMA rules are unverified.
- The PubMed retraction check has not been tested on a real retracted paper.
- The extension capture was checked on real pages in the browser pane, not as a live Chrome clip.
- Document Assistant: link icons are not placed per sentence, the PDF can scroll more than once per click, a highlight is not cleared by clicking elsewhere, a saved highlight cannot be selected one at a time, and the panel cannot be resized. Not started.
- Groq's free tier (200,000 tokens per day and about 8,000 per minute per model) was used up by testing, so the latest Q&A settings were checked by unit tests only.
- `e2e/08` has six failures that probably come from the "most recently viewed" document no longer being the 163-page fixture. `e2e/07` Req 6 failed before this work. `e2e/06` test 2A asserts the model's exact wording.
- `.documents-store.json` is a tracked local data store and is modified by test uploads. It is not committed.
- A stale `package.json` version (1.2.0) is not aligned with this log.

---

## [v1.6.0] — 2026-09-30 (Direct Notion & Obsidian Sync Engine)
### Added & Enhanced
- **Obsidian Knowledge Graph & Vault Engine (`obsidian.ts` & `ExportProjectModal.tsx`):**
  - **YAML Frontmatter & Metadata:** Full project frontmatter indexing titles, aliases, tags, creation dates, clip counts, and source references.
  - **Obsidian Callout Formatting:** Quotes formatted with `> [!quote]`, syntheses/notes with `> [!note]+`, abstract context with `> [!abstract]`, DOM blocks with `> [!example]`, and images with OCR callouts.
  - **Interactive Wikilinks:** Generates dynamic `[[wikilinks]]` linking quotes, project headers, sources, and categories into a navigable knowledge graph.
  - **Multi-File ZIP Vault Generation (`JSZip`):** 1-click generation and download of complete Obsidian Vault structure (`ProjectName.md` index, `Clips/` atom notes, `Sources/` bibliographies, and `.obsidian/app.json` configuration).
  - **Native Obsidian Deep Link:** 1-click "Open in Obsidian" action leveraging `obsidian://new?vault=...&name=...&content=...`.
- **Direct Notion Sync Engine (`notion.ts`, `/api/export/notion`, & `ExportProjectModal.tsx`):**
  - **Direct API Push Endpoint (`POST /api/export/notion`):** Pushes projects and all associated atoms into a target Notion Page or Database using Notion Integration tokens.
  - **Native Markdown-to-Notion Block & RichText Parser:** Converts raw markdown syntax (`### Headings`, `- Lists`, `**bold**`, `*italic*`, `` `code` ``, `> Quotes`) into real, native Notion blocks and text annotations rather than raw plain text markdown.
  - **Strict URL & Deep Link Sanitizer:** Ensures all citation URLs, bookmarks, and deep links conform strictly to Notion's API URL specifications.
  - **Hierarchical Block Transformer:** Translates research atoms into native Notion API blocks (Heading 1/2/3, Callouts with emojis, Quotes, Code snippets, Bookmarks, and Bulleted lists) with automatic 100-block chunking.
  - **Notion-Optimized Clipboard Exporter:** Instant 1-click formatted copy tailored for native Notion markdown paste.
  - **Persistent Settings:** Secure local caching of Notion integration tokens and parent page targets in `localStorage`.

---

## [v1.5.0] — 2026-09-30 (PDF Reader Engine, Document Vault, Auto-OCR, Precision Selection & Spatial Canvas)
### Added & Enhanced
- **PDF Reader & Knowledge Vault (`PDFReaderView.tsx` & `CustomPDFViewer.tsx`):**
  - **Official PDF.js TextLayer Integration:** Integrated `--scale-factor` and `--total-scale-factor` calculations with strict CSS glyph-metric bounds, eliminating multi-column selection overshoot and bleeding into adjacent sections.
  - **Document Vault & Library Skeleton:** Replaced blank/empty loading transitions with rich shimmer card skeletons for both Library and Reader views when switching sub-projects.
  - **Static & Aligned Highlights:** Completely removed pulsing animations from saved clips; added pixel-aligned border boundaries (`-webkit-box-decoration-break: clone`).
  - **Streamlined Selection Toolbar:** Floating selection pill displays only "Save Clip" with page number badge (`p. X`).
  - **Clean Clipboard Handling:** Sanitized selection text interceptor preventing phantom whitespace or DOM metadata on copy.
- **Automated Tesseract OCR Engine (`ocrService.ts` & `ImageAtomCard.tsx`):**
  - Instant background OCR triggered on any imported image or screen crop with extracted text stored in atom content.
  - OCR text is fully searchable across the platform with keyword match highlighting and detailed mode auto-expansion.
- **Workspace Navigation & State Continuity:**
  - Preserves active workspace mode (Feed / Canvas / Documents) when toggling between projects and sub-projects.
  - Streamlined extension sidepanel and popup with complete shortcut key list (<kbd>Alt+S</kbd>, <kbd>Alt+L</kbd>, <kbd>Alt+I</kbd>, <kbd>Alt+B</kbd>, <kbd>Alt+C</kbd>, <kbd>Alt+P</kbd>).

---

## [v1.4.0] — 2026-09-27 (Chrome Native Side Panel & Web Context Re-Builder)
### Added & Enhanced
- **Native Chrome Side Panel (`chrome.sidePanel`):**
  - Integrated persistent Chrome Side Panel (launched via `Alt+P` or popup header button) featuring **Live Feed**, **Page AI Interrogation**, **In-Browser Synthesis**, and **Quick Capture Hub**.
  - Enabled active tab text extraction, 1-click quote saving from AI briefs, and real-time synchronization with the local web API.
- **Context Re-Builder in Web Timeline (`AtomCard`):**
  - Built an accordion view for quote cards showing the surrounding preceding and following paragraphs cached from the original source.
  - Added smart context extraction in `extension/content.js` (`contextPrefix`, `contextSuffix`, `surroundingParagraphs`).
- **DOM Block Picker Tree Traversal (`blockPicker.js`):**
  - Enabled `ArrowUp` (select parent container) and `ArrowDown` (select child element) keyboard navigation during DOM element inspection (`Alt+B`).
- **Typography Alignment:**
  - Standardized font across extension UI, content scripts, and side panel to `Figtree` and `-apple-system`.

---

## [v1.3.0] — 2026-09-27 (Phase 3 AI Suite, Docked Split Assistant, Citations & Theme Refinement)
### Added & Enhanced
- **Docked Side-by-Side AI Assistant (`ResearchieAISidebar`):**
  - Designed a collapsible ~380px sidebar that dynamically shifts and shrinks the knowledge timeline to the left so users can view research clips and the assistant simultaneously.
  - **Ask AI:** Grounded conversational Q&A using semantic search, bottom-line key findings, and verbatim citation source links.
  - **Summarize & Synthesize:** Pre-configured synthesis templates (PRD / Spec Draft, Comparative Matrix, Executive Memo, Key Findings) with 1-click timeline card multi-selection.
- **Round Floating Action Button (FAB):**
  - Built a floating round launcher with the official two-path `researchie-ai-logo.svg` icon and a fast-access hover menu for *Ask AI* and *Summarize*.
- **Semantic Vector Search Engine (`/api/atoms/search`):**
  - Implemented 768-dimensional normalized dense vector projections with in-memory cosine similarity and lexical token weighting.
- **Citations & Bibliography Export Suite (`ExportProjectModal`):**
  - Added export formats for **Markdown (`.md`)**, **Citations (Markdown / APA standard / BibTeX `.bib`)**, and **Raw JSON**.
- **Design System & Typography Polish:**
  - Removed `Plus Jakarta Sans` and restored clean `Figtree` and system typography.
  - Subdued brand blue to purposeful accents (`#325FEC` / `#518FFF`), backed by deep neutral blacks (`#09090B`, `#121214`, `#18181B`, `#27272A`, `#FAFAFA`).
  - Scaled atom card padding to `p-6 md:p-7` with refined font hierarchy and neutral tag badges.

---

## [v1.2.4] — 2026-09-26 (Tag Focus Fix, Optional Field Labels & Localhost Recovery)
### Fixed & Improved
- **Text Selection Tag Form Stability:** Resolved selection event collision where clicking `# Tag` or the input collapsed selection and dismissed the pill; added `isTagFormOpen` state guard and container event isolation.
- **Universal "Optional" Placeholders:** Updated all tag input placeholders across text selection, image capture, screenshot cropping, DOM block picking, popup Page Brief, Q&A, and Platform Workbench to explicitly display `(optional)`.
- **Toast Cleanliness:** Removed tag UI from in-situ toasts so tagging happens strictly at the point of clicking.
- **Dev Server Recovery:** Restarted Next.js dev server on port 3000 resolving document cache collision from build process.

---

## [v1.2.3] — 2026-09-26 (Structured Executive Briefs & Universal Clip Tagging)
### Added
- **Universal Clip Tagging System:**
  - **Text Selection:** Added interactive `#` button on floating selection pill to tag quotes before send (`#pricing`, `#latency`), plus inline `+ #tag` badge in the 3-second toast for instant post-send tagging.
  - **Screen Area & Screenshots:** Added tag/title input field in screenshot confirmation dialog (`#pricing-table`, `Hero`).
  - **Web Image Selection:** Added confirmation modal with image preview and tag/name input field before submitting images to project.
  - **DOM Block Selection:** Added confirmation modal with tag info and label/tag input field before saving DOM containers.
  - **Page Brief & Q&A:** Added tag inputs to Page Brief and Q&A popup sections.
  - **Platform Workbench:** Rendered interactive `#tag` pills on all `AtomCard` components with 1-click `+ tag` inline editor and delete support via new `PATCH /api/atoms` endpoint.
- **Deep Executive Page Brief Engine:**
  - Replaced 3-bullet slice with structured multi-section brief containing **Executive Overview**, **Core Findings & Arguments**, **Key Metrics & Evidence**, and **Strategic Implications**.
  - Upgraded both `MockAIAdapter` and `GatewayAIAdapter` to extract grounded data points, percentages, dollar figures, and technical metrics from page text.

---

## [v1.2.2] — 2026-09-26 (Icon Polish, 4 Shortcuts & Selection Reliability)
### Fixed & Improved
- **Text Selection Send Icon:** Fixed coordinate calculations by targeting the last selected line's bounding client rect; attached window capture-phase listener so webpage scripts cannot suppress selection detection.
- **Plugin Icon Overhaul:** Replaced distorted SVG paths with crisp, high-precision vector icons across all 4 modes (Quotes for Text, Code tags for Block, Frame for Image, Crosshair Crop for Shot).
- **Popup Footer Reorganization:** Displayed all 4 mode shortcuts in a compact single line (`Alt+S text • Alt+B block • Alt+I image • Alt+C shot`) and relocated the Workbench link directly below it as a full-width action button.
- **All 4 Shortcuts Verified:** Wired `Alt+S`, `Alt+B`, `Alt+I`, and `Alt+C` across `manifest.json` commands, background worker, and in-page keyboard listeners.

---

## [v1.2.1] — 2026-09-26 (Phase 2 Bugfix & UX Refinement)
### Fixed
- **Duplicate Ingestion Multiplier:** Added strict singleton execution guards (`__RESEARCHIE_CROPPER_INJECTED__`, `__RESEARCHIE_BLOCK_PICKER_INJECTED__`) preventing multiple event listeners from submitting 5x duplicate atoms.
- **Screenshot Mode Hang:** Enhanced canvas teardown and event listener disposal so taking or canceling a screenshot promptly exits the cropper mode.
- **Live Undo Countdown:** Replaced static label with dynamic 1-second interval timer `Undo (3s)` → `Undo (2s)` → `Undo (1s)` across all in-situ toasts.
- **Block Preview Fidelity:** Injected `<base>` tags and resolved absolute stylesheet URLs to ensure captured DOM tables and grids render with identical styles.
- **Anti-AI-Slop Clean Pass:** Eliminated extraneous pulsing dots (`animate-ping`), tightened vertical paddings across Navbar (`h-12`), Sidebar (`w-64`), Timeline toolbar, and Atom Cards.

---

## [v1.2.0] — 2026-09-26 (Phase 2 MVP)
### Added
- **Visual DOM Block Picker** (<kbd>Alt+B</kbd>) with `<kbd>↑</kbd>`/`<kbd>↓</kbd>` keyboard traversal and HTML sanitization.
- **Screen Area Marquee Cropper** (<kbd>Alt+C</kbd>).
- **In-Popup Page Brief** (3-bullet instant summary) with 1-click `+ Send Summary to Platform`.
- **In-Popup Custom Q&A** with grounded answers and 1-click `+ Send Answer to Platform`.
- **Dual-View Block Cards** (`BlockAtomCard.tsx`) with sandboxed preview and formatted HTML tabs.
- **Image Atom Renderer** (`ImageAtomCard.tsx`) with modal zoom.
- **Dedicated Local Test Lab** at `/test-lab` and `test-lab.html`.

---

## [v1.0.0] — 2026-09-25 (Phase 1 MVP)
### Added
- Manifest V3 Chrome Extension core with Shadow DOM floating save pill and <kbd>Alt+S</kbd> hotkey.
- W3C Scroll-to-Text Fragment Engine (`src/lib/utils/textFragments.ts`).
- Next.js 15 Web Platform with Dark Theme (`#13151A`), Electric Lime (`#D2F83C`), and Space Grotesk/Figtree fonts.
- Chronological timeline stream with 3-second auto-sync heartbeat.
- 1-click Markdown citation copier and "Jump to Quote" navigation.

---

## [v0.1.0] — 2026-09-24 (Discovery)
### Added
- Product Requirements Document (`RESEARCH_TOOL_PRD.md`).
- 4 Note Types Specification (Text, Link, Image, DOM Block).
- Supabase PostgreSQL schema with RLS policies (`supabase/schema.sql`).
- Design System tokens and typography pairs (`design.md`).
