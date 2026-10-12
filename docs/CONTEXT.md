# Current Project Context

> **Active Version:** `v1.7.0` (Citation Engine, Verified Document Q&A & PDF Extraction Fix, on top of v1.6.0)  
> **Last Synced:** 2026-10-12  
> **Status:** All core modules active. The Citation Engine and Document Assistant Q&A are new and verified except where section 4 says otherwise. Document Assistant UI fixes are open.

---

## 1. Running Services & URLs
- **Web Platform**: [`http://localhost:3001`](http://localhost:3001) (Next.js 15 dev server)
- **Local Test Lab & Gorilla Research Sandbox**: [`http://localhost:3001/sandbox/gorilla-research`](http://localhost:3001/sandbox/gorilla-research) & [`http://localhost:3001/test-lab`](http://localhost:3001/test-lab)
- **Chrome Extension Directory**: `extension/` (Manifest V3 with `sidePanel`, Content Scripts, and popup)

---

## 2. Feature Implementation Status Matrix

| Module | Status | Key Capabilities |
| :--- | :---: | :--- |
| **Citation Engine** | ✅ Active | Crossref, DOI agency, DataCite and PubMed lookups with rate limits; title search with a pick list; Vancouver formatting; web-page and manual citations; verified DOI read from the page (extension) or the PDF. Warnings only for a DOI, PMID or title the user entered that does not match the clip. Stored as `metadata.citation`. Preprint, dataset and book chapter lines, APA and AMA are open. |
| **Document Assistant Q&A** | ✅ Active, rate limited | Passage retrieval with page numbers and offsets, verified quotes, link icons from verified citations only, honest "busy" message when Groq refuses. Depends on Groq's free tier (see section 4). |
| **Notion & Obsidian Sync Engine** | ✅ Active | **Obsidian**: Multi-file ZIP Vault bundle with `[[wikilinks]]`, YAML frontmatter, Obsidian callouts (`[!quote]`, `[!note]`, `[!abstract]`), and direct `obsidian://new` URI launch. **Notion**: Direct 1-Click push to Notion pages/databases via Notion API (`/api/export/notion`), and Notion-optimized Markdown clipboard block copy. |
| **Chrome Extension (MV3)** | ✅ Active | Side Panel (`Alt+P`), Text Capture (`Alt+S`), DOM Block Picker (`Alt+B`), Screen Cropper (`Alt+C`), Image Picker (`Alt+I`), Link Capture (`Alt+L`), In-Browser Tab AI Briefs & Q&A. |
| **PDF Reader & Document Vault** | ✅ Active | Document Library Vault, High-DPI page canvas, PDF.js Official textLayer with `--scale-factor` glyph bounding, multi-column precision selection, static saved highlights, instant citation jumping, sub-project loading skeletons. |
| **OCR & Search Engine** | ✅ Active | Automatic background Tesseract OCR on imported images/clips, fully searchable OCR text across platform, search match highlighting with auto-expand in detailed view. |
| **AI Synthesis Suite** | ✅ Active | Grounded Doc Assistant with page citations, Timeline AI Assistant (~380px sidebar), PRD / Synthesis generator, and Semantic Vector Search (`/api/atoms/search`). |
| **Workspaces & Views** | ✅ Active | 3 core workspace modes: **Stream / Feed**, **Spatial Canvas**, and **Document Reader**. Mode selection is preserved across sub-project switches. |
| **Export Engine** | ✅ Active | Export to Obsidian Vault (.zip / .md), Notion (API Push / .md), Markdown (`.md`), Citations (APA / BibTeX `.bib`), and Raw JSON. |

---

## 3. Key Architecture & File Paths

- **Obsidian & Notion Exporters**: [`src/lib/export/obsidian.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/lib/export/obsidian.ts) & [`src/lib/export/notion.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/lib/export/notion.ts)
- **Notion Push API Endpoint**: [`src/app/api/export/notion/route.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/app/api/export/notion/route.ts)
- **Export Modal UI**: [`src/components/ExportProjectModal.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/ExportProjectModal.tsx)
- **PDF Reader & Viewer**: [`src/components/PDFReaderView.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/PDFReaderView.tsx) & [`src/components/CustomPDFViewer.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/CustomPDFViewer.tsx)
- **OCR Engine**: [`src/lib/ocr/ocrService.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/lib/ocr/ocrService.ts) & [`src/components/ImageAtomCard.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/ImageAtomCard.tsx)
- **Chrome Extension Source**: [`extension/sidepanel.js`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/extension/sidepanel.js), [`extension/content.js`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/extension/content.js), [`extension/manifest.json`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/extension/manifest.json)
- **AI Endpoints**: [`src/app/api/ai/qna/route.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/app/api/ai/qna/route.ts) & [`src/app/api/ai/synthesize/route.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/app/api/ai/synthesize/route.ts)
- **Citation Engine**: [`src/lib/citations/`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/lib/citations) (`lookup.ts`, `verify.ts`, `vancouver.ts`, `webCitation.ts`, `manual.ts`, `pdf.ts`, `pdfReader.ts`, `facts.ts`, `client.ts`, `server.ts`) with routes `src/app/api/citations/resolve/route.ts` and `src/app/api/citations/search/route.ts`. Research notes: `docs/CITATION_API_RESEARCH.md`.
- **Q&A retrieval and verification**: `src/lib/ai/passages.ts` (passages, retrieval, `locateQuote`), `src/lib/ai/claimSupport.ts`, `src/lib/ai/adapters/groq.ts`, `src/lib/qa/answerLinks.ts` (link icons and quote check in the viewer), route `src/app/api/ai/qna/route.ts`.
- **Clip citation box**: `src/components/AtomCard.tsx`. **PDF citation, upload form and assistant**: `src/components/PDFReaderView.tsx`.
- **PDF parse route**: `src/app/api/documents/parse/route.ts` (needs `serverExternalPackages: ['pdf-parse']` in `next.config.mjs`).

---

## 4. Known Limits & Open Work (as of 2026-10-12)

- **Groq free tier:** about 8,000 tokens per minute and 200,000 tokens per day per model. One question costs about 4,000 to 6,000 tokens. When the allowance is used up, the Q&A returns "The AI service is busy or the request was too large. Try again in a minute." That is expected, not a bug. The latest Q&A settings (smaller answer allowance, retry with half the budget, skipping the 7B model) were verified by unit tests only. **Live check on the final settings, 2026-10-13:** 12 of 18 questions ran and all 12 passed with no unsupported citations (questions 1 to 9, 11, 12 and the unanswerable question 17). The other 6 (10, 13, 14, 15, 16, 18) were refused with "tokens per day (TPD): Limit 200000, Used ~198,700" before they ran. Question 10, asked alone earlier in the run, passed. The daily allowance frees up gradually as older usage ages out; those 6 still need a live run.
- **Re-upload old PDFs:** documents uploaded before the extraction fix hold placeholder text and need to be uploaded again.
- **Not built:** AMA forms for preprints, datasets, chapters and reports (journal article and web page are built, v1.7.7); report number and agency elements; the web page update date and place. (The NLM web page line was built in v1.7.5.) APA 7 is built (v1.7.3). A retraction shows as an amber warning (v1.7.3). (Vancouver lines for preprints, datasets, chapters and reports, BibTeX and RIS copy, and citations in Notion and Obsidian exports were built in v1.7.2. Per-sentence icons, one scroll per click, click-away clearing, single saved highlight and the resizable panel were built in v1.7.1.)
- **Not verified:** the extension capture as a live Chrome clip. The retraction check was verified live on 2026-10-12 (PubMed and Crossref paths).
- **Tests:** `node --test --no-warnings tests/citations.test.mjs tests/citations-resolvers.test.mjs tests/citations-verify.test.mjs tests/citations-manual.test.mjs tests/claim-support.test.mjs tests/passages.test.mjs tests/answer-links.test.mjs` (92 tests). Playwright: `BASE_URL=http://localhost:3001 npx playwright test e2e/09-citation-links.spec.ts`. The default Playwright base URL is port 3000 but the dev server runs on 3001, so set `BASE_URL`.
- **Branch:** `feat/canvas-pdf-ui-and-citation-core`. Work after commit `f0bd60f` is not committed. `.documents-store.json` is a tracked local data store and is deliberately left out of commits.
