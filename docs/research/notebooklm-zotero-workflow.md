# Bring-your-own extraction: NotebookLM (Gemini Notebook) and Zotero into the paper template

Research date: 2026-10-20. Primary sources where they loaded: official help centres, developer docs, changelogs, Google's terms, and source code on GitHub. Each claim carries the URL it came from. Labels follow `paper-preview.md`:

- **Verified (fetched):** read from the owning page in this session.
- **Verified (snippet):** the owning page would not load or was not opened; the text came from a search result that quotes it. Re-check before relying on it.
- **Third-party:** a vendor or community page that is not the product owner. Treat as a lead, not a fact.
- **UNVERIFIED:** not confirmed from a primary source. The note says where to check.

Fetched pages were summarised by a small model, so quoted wording is as returned. Re-check anything load-bearing before building on it.

Two terms used throughout:

- **Verbatim text:** words copied exactly from the source paper (a highlight in Zotero, a quote a user selects in a PDF). It can be cited as the paper's words, with a page.
- **AI-generated text:** words a model wrote (a NotebookLM answer, a summary, a comparison). It may be accurate, but it is never the paper's words and must never be put in quotation marks or cited as a quote.

The feature in one line: the user does the heavy reading and extraction in a tool that already does it well (Zotero, NotebookLM), brings the result into Researchie with its source attached, and Researchie places it into a section of the template paper next to the user's own writing, re-checking the source itself.

---

## Answer up front

1. **Does the workflow exist already?** In parts, not end to end.
   - **Zotero** already does "extract verbatim text with page and citation, then put it in a draft": highlights become annotations; "Add Note from Annotations" or dragging an annotation into a note adds "links back to the PDF page as well as citations" ([Zotero PDF reader docs](https://www.zotero.org/support/pdf_reader), Verified). The note HTML embeds the full reference as CSL-JSON and the page label as a citation locator ([Zotero source, `editorInstance.js`](https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/editorInstance.js), Verified). The word-processor plugins (Word, LibreOffice, Google Docs) insert live citations with page locators. The current version is **Zotero 10.0.6** (7 October 2026); Zotero 10.0 (17 August 2026) added **write support to the local API** ([changelog](https://www.zotero.org/support/changelog), Verified).
   - **NotebookLM was renamed Gemini Notebook on 16 July 2026** ([Google blog](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/), Verified). Its answers cite "direct quotes, text, and images from your sources"; you hover a citation to see the quote and click to jump to it ([chat help](https://support.google.com/gemininotebook/answer/16179559), Verified). "Save to note" keeps "clickable inline citations". Notes and Reports export to Google Docs; Data Tables export to Sheets with "any citations" on the second tab ([create-a-notebook help](https://support.google.com/gemininotebook/answer/16206563), Verified). The help pages never mention page numbers or DOIs. What a plain copy-paste of an answer carries is **not documented**; a third-party extension says the numbers come along but "what they point to does not" (UNVERIFIED first-hand).
   - **No consumer API** for NotebookLM. The Enterprise API (`v1alpha`, Preview) creates, lists, shares and deletes notebooks and adds sources; it has **no method to ask a question or fetch answers** ([Enterprise API docs](https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs/api-notebooks), Verified) and needs paid licences, sold in subscriptions of at least 15 ([licensing docs](https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs/set-up-licensing), Verified snippet). Not usable for a free product.
   - **Other tools** cover slices: EndNote 2025 "Cite from a PDF" inserts a highlighted quote plus citation into Word (paid). Obsidian's Zotero Integration plugin imports annotations through Better BibTeX. Consensus "Copy with citations" copies an AI answer with formatted citations. None takes AI extraction from one tool and verbatim quotes from another, re-checks them against the PDF, and slots them into a structured paper template. That gap is the feature.
2. **Citation fidelity.** Zotero carries everything needed: verbatim text, page label, PDF position, a link to the attachment, and the full reference (CSL-JSON, including DOI when the item has one). NotebookLM carries, at most, a source *title* as the user named it on upload and a supporting passage; no page number, no DOI, no authors as structured data, per everything documented. So for NotebookLM content Researchie must re-derive: (a) which of the user's own PDFs the passage came from, (b) the page, by deterministic matching against pdf.js text (`checkQuoteAgainstPages` in `src/lib/ai/claimSupport.ts` already does this), and (c) the reference, by DOI found in the PDF (`readPdfDois` in `src/lib/citations/pdfReader.ts`) or a Crossref `query.bibliographic` title lookup (already in `src/lib/citations/lookup.ts`).
3. **Combining under a low token budget.** Keep the LLM out of the import path. Zotero is the citation source of truth (import via the Web API, the local API, a Better BibTeX CSL-JSON file, or plain RIS/BibTeX upload). NotebookLM text comes in through a paste box that labels it "AI summary" by default and separates any quoted spans. Quotes are matched to the user's PDFs with string and fuzzy matching, no tokens. The user assigns each block to a template section by drag or a dropdown (no LLM). An optional Groq call to suggest the section costs roughly 400 to 900 tokens per paste, which is about 220 to 500 pastes a day against the 200K tokens-per-day limit shown for `openai/gpt-oss-20b` ([Groq rate limits](https://console.groq.com/docs/rate-limits), Verified; the page says these are Developer-plan base limits, and **free-plan numbers are UNVERIFIED**).
4. **Recommendation, ranked.**
   1. **Zotero import (S to M):** RIS/BibTeX/CSL-JSON file upload first (S), then Zotero Web API with a user API key to pull items, notes and annotations (M). This gives verbatim quotes with pages and real references, with zero LLM cost.
   2. **Paste box with provenance labels and deterministic quote matching (M):** works for NotebookLM, Zotero notes, or anything else. Defaults pasted prose to "AI-generated, not citable as a quote".
   3. **Manual slotting into template sections (S),** optional Groq suggestion later (S).
   4. **NotebookLM Data Table import from a Sheets CSV/XLSX download (S to M):** structured rows plus a citations tab, once the citations tab format is checked by hand.
   5. **Not now:** a Chrome extension that reads NotebookLM's page. Feasible (a third-party extension already does it), but brittle, a terms grey area, and it only gets a source title. Revisit if users ask.
   - **Risks:** AI paraphrase pasted as a quote (biggest); NotebookLM UI changes; privacy of unpublished work; Zotero API keys stored server-side; Google's terms on scraping.

---

## 1. Does this workflow already exist?

### 1.1 Zotero

**Version check.** Zotero 8 was announced 22 January 2026 ([Zotero 8 blog](https://www.zotero.org/blog/zotero-8/), Verified). Zotero 10.0 shipped 17 August 2026; the latest is 10.0.6 on 7 October 2026 ([changelog](https://www.zotero.org/support/changelog), Verified). Zotero 10 adds an advanced search that can return annotations as results, Reading Mode for PDFs, and a citation preview in the citation dialog ([Zotero 10 blog](https://www.zotero.org/blog/zotero-10/), Verified snippet). Plan for Zotero 10, not 7.

| Feature | What it does | What it does not do | Source |
|---|---|---|---|
| **Annotations in the built-in reader** | Highlights, underlines, notes, image (area) annotations on PDFs, EPUBs and snapshots. Stored in the Zotero database, not in the PDF. Zotero 8 shows annotations as rows under their attachment and makes them searchable. | Not visible to other PDF readers unless you export a PDF with embedded annotations. | [PDF reader docs](https://www.zotero.org/support/pdf_reader) (Verified); [Zotero 8 blog](https://www.zotero.org/blog/zotero-8/) (Verified) |
| **Add Note from Annotations** | Reader "+" button, or right-click a parent item. Builds a note from all annotations. "Annotations added to notes will automatically include links back to the PDF page as well as citations." | The docs do not describe a separate annotation export file (Markdown, CSV). | [PDF reader docs](https://www.zotero.org/support/pdf_reader) (Verified) |
| **What a note annotation contains** | Each annotation becomes HTML: a `<span data-annotation="…">` with `attachmentURI`, `annotationKey`, `color`, `pageLabel`, `position`, plus a `<span data-citation="…">` whose citation item has `uris`, `locator: annotation.pageLabel` and `itemData` (the full CSL-JSON reference). The text is the verbatim highlighted text; the user's comment follows. | `itemData` is skipped if the caller asks (`skipEmbeddingItemData`). | [Zotero source `editorInstance.js`, `serializeAnnotations`](https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/editorInstance.js) (Verified) |
| **Drag annotation into a note** | Same result as above (page link and citation). | The docs do not say what a drag into Word, Google Docs or a browser text box carries. Dragging selected text with no annotation makes a quote; the docs do not say whether it carries a citation. | [PDF reader docs](https://www.zotero.org/support/pdf_reader) (Verified) |
| **Word-processor plugins** | Word, LibreOffice and Google Docs. Dynamic citations and bibliography. Page locators: type "p.34" or ":45-48" in the citation dialog. Zotero 8 has a unified citation dialog with "Add Note" alongside "Add/Edit Citation". | Only the plugins' own documents. A web app like Researchie cannot host the plugin. | [Plugin usage](https://www.zotero.org/support/word_processor_plugin_usage) (Verified); [Zotero 8 blog](https://www.zotero.org/blog/zotero-8/) (Verified). The usage page lists five buttons and does not mention "Add Note"; the Zotero 8 blog does. |
| **Quick Copy** | Ctrl/Cmd-Shift-C copies a bibliography, Ctrl/Cmd-Shift-A copies in-text citations, in the style set in Settings → Export. Formats can be a citation style, BibTeX or RIS. Drag items into any text field for a formatted reference. Zotero 8: "Quick Copy can copy annotations to an external text editor." | The output format of copied annotations (does it include page and citation?) is **UNVERIFIED**. Check by copying an annotation into a plain text field. | [Creating bibliographies](https://www.zotero.org/support/creating_bibliographies) (Verified); [Zotero 8 blog](https://www.zotero.org/blog/zotero-8/) (Verified) |
| **"Copy to Clipboard"** | In "Create Bibliography from Item(s)…": copies the bibliography for pasting anywhere. | References only, not quotes. | [Creating bibliographies](https://www.zotero.org/support/creating_bibliographies) (Verified) |
| **Local API** `http://localhost:23119/api/` | Same shape as Web API v3. Enabled in Settings → Advanced ("Allow other applications on this computer to communicate with Zotero"); otherwise 403. Reads need no authentication. **Writes are Zotero 10+ only**, with a user-approved local key. Only the logged-in user's data. Not paginated by default. `/items/<key>/file/view/url` gives the file path. | "Intended for code running on the user's own computer." The docs do not mention CORS, so a web page calling it from the browser is **UNVERIFIED**; Better BibTeX's endpoints on the same port are blocked from browsers (below). A hosted server cannot reach it. "Do not forward the port." | [Local API docs](https://www.zotero.org/support/dev/web_api/v3/local_api) (Verified) |
| **Web API v3** `https://api.zotero.org` | Public libraries need no key; private ones need an API key (header `Zotero-API-Key` or `Authorization: Bearer`). Third-party apps should use OAuth 1.0a ("OAuth 2.0 planned"). `limit` 1 to 100 per request. Formats include `json`, `csljson`, `bibtex`, `biblatex`, `ris`, `bib`; `include=citation,bib` adds formatted output (default style `chicago-note-bibliography`). Rate limiting: obey `Backoff` and `Retry-After` on 429; generally no more than 4 concurrent requests. No fixed number of requests per minute is published. | Annotation retrieval is not described on the basics page. | [Web API basics](https://www.zotero.org/support/dev/web_api/v3/basics) (Verified) |
| **Annotations through the Web API** | Annotations are "accessible to plugins within Zotero and to external tools via the Zotero web API" (official KB). The item model has `annotationType`, `annotationAuthorName`, `annotationText`, `annotationImage`, `annotationComment`, `annotationColor`, `annotationPageLabel`, `annotationSortIndex`, `annotationPosition`, `annotationIsExternal`. | The JSON field names as returned by the API are confirmed only by forum examples. A Zotero staff reply suggests `?itemType=annotation` plus `?since=` for sync, because `/children` fails on attachments (Verified snippet, forum). Image annotations return position only, not the image (forum, snippet). **Check against a real library before building.** | [KB: annotations in database](https://www.zotero.org/support/kb/annotations_in_database) (Verified); [Zotero source `item.js`](https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/data/item.js) (Verified); [forum thread](https://forums.zotero.org/discussion/comment/386881) (snippet) |
| **Better BibTeX (plugin)** | Stable citation keys. **Pull export:** `http://127.0.0.1:23119/better-bibtex/collection?<id>.<format>` with formats `biblatex`, `bibtex`, `csljson`/`json`, `cslyaml`, plus `exportNotes=true`. Right-click a collection → "Download Better BibTeX export…". **CAYW** (cite as you write) `http://127.0.0.1:23119/better-bibtex/cayw` opens Zotero's picker and returns the pick in a format such as `pandoc`, `json`, `formatted-citation`; supports locator, prefix, suffix. | Both endpoints: "as of Zotero 5.0.71, access … will no longer work from the browser for security reasons". `curl` and editors work. So a web app cannot call them directly; the user downloads a file instead. | [BBT pull export](https://retorque.re/zotero-better-bibtex/exporting/pull/) (Verified); [BBT CAYW](https://retorque.re/zotero-better-bibtex/citing/cayw/) (Verified) |
| **Connector / translators** | Saves web pages and papers into Zotero with metadata. Zotero 8: the save popup can add a note. | It does not move content out of Zotero into another app. | [Zotero 8 blog](https://www.zotero.org/blog/zotero-8/) (Verified) |

**Verdict for Zotero:** the "extract verbatim text with source and page" half of the founder's workflow is fully solved in Zotero, and the data comes out in machine-readable form (notes with embedded CSL-JSON, annotation items, CSL-JSON exports). The missing half is "insert into a structured template paper next to my own writing, inside Researchie".

### 1.2 NotebookLM, now Gemini Notebook (findings dated 2026-10-20)

On 16 July 2026 Google renamed NotebookLM to **Gemini Notebook**: "the same standalone product". Notebooks can also be created in the Gemini app. Each notebook gets "a secure cloud computer" that runs code on sources, first for AI Ultra and some Workspace plans, then Pro ([Google blog](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/), Verified). Old links redirect ([Workspace Updates](https://workspaceupdates.googleblog.com/2026/07/notebooklm-now-gemini-notebook.html), Verified snippet). Onboarding copy should say "NotebookLM (now Gemini Notebook)".

| Question | Finding | Source |
|---|---|---|
| What are citations in an answer? | "Uses direct quotes, text, and images from your sources as citations." "To get the full quoted text, hover over any citation." "To navigate directly to the quote and review it in context, select a citation." The help page does not describe them as numbers. | [Use chat](https://support.google.com/gemininotebook/answer/16179559) (Verified) |
| Does copying a response keep citations? | **Not documented.** The chat help page does not cover a copy button. A third-party extension (NotebookLM Citation Mapper, v1.3.0, 14 August 2026, about 1,000 users) says: "Copy the text and those numbers come along, but what they point to does not." So a paste likely has bare markers like `[1]` or `1` with no source. **UNVERIFIED first-hand.** Test: ask a question over two PDFs, use the copy button, paste into a plain text field and into Google Docs, and record exactly what arrives. | [Chrome Web Store listing](https://chromewebstore.google.com/detail/dmphledfnmpnkhmgkkledaoihcmhcjpd) (Third-party, fetched) |
| Save to note | "When you save a response as a note, the original format—including tables and clickable inline citations—gets saved." "Saved response notes are editable once citations are removed." Notes can be converted into sources. | [Use chat](https://support.google.com/gemininotebook/answer/16179559); [Notes](https://support.google.com/gemininotebook/answer/16262519) (both Verified) |
| Export | Notes: More → "Export to Docs". Reports: export to Docs. Data Tables: export to Sheets; "the table goes on the first tab and any citations will populate the second tab". Exports do not sync back; sharing does not carry over. What a citation looks like inside an exported Doc or the Sheets citations tab is **UNVERIFIED**. | [Notes](https://support.google.com/gemininotebook/answer/16262519); [Create a notebook](https://support.google.com/gemininotebook/answer/16206563) (both Verified) |
| Page numbers, DOIs | Not mentioned on any help page read. The citation points to a passage in the uploaded file, not a page number or DOI. Treat as **not provided** until a hands-on test shows otherwise. | Pages above (absence, Verified) |
| Public API | None for consumer accounts found. **NotebookLM Enterprise API** (`v1alpha`, "Preview"): `notebooks.create`, `get`, `listRecentlyViewed` (last 500), `batchDelete`, `share`; `notebooks.sources.batchCreate` to add sources. **No method to query a notebook or fetch cited answers.** Needs a Google Cloud project and licences. | [Enterprise notebooks API](https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs/api-notebooks) (Verified); [sources API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources) (Verified snippet) |
| Enterprise cost | 14-day trial; subscriptions of at least 15 licences, up to 5,000. No official price found. Not a free path. | [Set up licensing](https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs/set-up-licensing) (Verified snippet) |
| Source limits | "Up to 50 sources (for Free users)." "Each source can contain up to 500,000 words or up to 200MB for uploaded files." Web URLs import text only; paywalled pages not supported. Paid-plan source counts are not on this page. | [Add sources](https://support.google.com/gemininotebook/answer/16215270) (Verified) |
| Usage limits by plan | No numbers. "Standard limits" without a plan; AI Plus 2×, AI Pro 4×, AI Ultra "5x or 20x higher than AI Pro". Quota "refreshes every 5 hours until you reach your weekly limit". Third-party guides quote 50 chats/day free and 300 sources on paid plans (UNVERIFIED). | [Usage limits](https://support.google.com/gemininotebook/answer/17670842) (Verified) |
| Privacy | Personal accounts: content "will not be used to directly train our foundational AI models"; feedback (thumbs) is human-reviewed and kept up to 3 years. Workspace accounts: no human review, no training. | [Privacy and terms](https://support.google.com/gemininotebook/answer/17004255) (Verified) |

**Verdict for NotebookLM:** strong at answering across many sources, and its answers are grounded in passages the user can click. But what leaves the app is **AI-generated prose** with, at best, source titles. Nothing documented carries a page, DOI or structured reference out. Researchie has to treat NotebookLM output as a lead to verify, not as a citable quote.

### 1.3 Other tools doing "extract from papers, then paste into a draft with a citation"

"Carries into draft" means: when the extracted content lands in the writing document, does the source, page and DOI come along?

| Tool | What it does here | Source / page / DOI into the draft? | Free tier | Source |
|---|---|---|---|---|
| **Zotero + Obsidian (Zotero Integration plugin)** | "Insert and import citations, bibliographies, notes, and PDF annotations from Zotero into Obsidian." Templates expose `annotatedText`, `comment`, `color`, `page`. | Source yes (citekey via BBT), page yes (`page` variable), DOI if the template includes it. Needs Better BibTeX. 248 open issues; docs "currently incomplete". | Free (open source) | [GitHub](https://github.com/mgmeyers/obsidian-zotero-integration); [templating docs](https://github.com/mgmeyers/obsidian-zotero-integration/blob/main/docs/Templating.md) (both Verified) |
| **Overleaf + Zotero** | Links a Zotero library as a `.bib` file; search references in a project. | References only. No quotes or pages. | **Premium only.** Free users upload a `.bib` by hand. | [Overleaf Zotero docs](https://docs.overleaf.com/integrations-and-add-ons/reference-manager-integrations/zotero) (Verified snippet) |
| **EndNote 2025** | "Cite from a PDF": highlight text, click the quote icon, and the quote plus formatted citation goes into Word. Research Assistant chats with and summarises documents. | Source yes. Page: added by hand in the Suffix field. | Paid | [Cite from a PDF](https://support.clarivate.com/Endnote/s/article/EndNote-2025-Cite-from-a-PDF?language=en_US); [page numbers](https://support.clarivate.com/Endnote/s/article/EndNote-Adding-Page-Numbers-to-Citations?language=en_US) (both Verified snippet) |
| **Mendeley Cite** | Word add-in that inserts references and bibliographies. | References only. Page locators and notes not mentioned. | Not stated on the page | [Mendeley Cite](https://www.mendeley.com/reference-management/mendeley-cite) (Verified) |
| **Paperpile** | Exports a PDF's annotations as text, rich text, JSON, OPML or Markdown; annotations are stored in the PDF. | Export carries the paper; whether each annotation carries its page is **UNVERIFIED**. | Pricing not confirmed (trial) | [Export annotations](https://paperpile.com/h/print-pdfs-export-annotations/) (Verified snippet) |
| **ReadCube Papers** | Exports PDF notes as CSV or TXT; references as `.bib`/`.ris`. SmartCite for Word and Google Docs. | Notes export: page **UNVERIFIED**. | 30-day trial; permanent free tier not confirmed | [Export PDF notes](https://www.readcube.com/en/help-center/how-to-export-pdf-notes/); [SmartCite](https://www.readcube.com/en/smartcite-for-google-docs/) (Verified snippet) |
| **Elicit** | Extraction tables with columns; data-extraction CSV includes "supporting quotes, and reasoning"; tables of sources export as RIS or BIB. | Quotes yes, in a CSV. Page **UNVERIFIED**. | Elicit's pages disagree on whether free users can export; support docs point to Plus and up. Systematic Review tables are Pro and up. | [Export data](https://support.elicit.com/en/articles/1153857); [Systematic reviews](https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit) (Verified snippet) |
| **SciSpace (formerly Typeset)** | Chat with PDF; clicking a citation jumps to the passage. Data Extractor exports CSV, Excel, RIS. AI Writer has a Cite button and Word export. | Source yes; page claimed in marketing ("automatic page citations"), **UNVERIFIED**. | Free plan with limited credits | [Chat PDF](https://scispace.com/chat-pdf); [AI Writer help](https://scispace.com/help/en/articles/10660614-what-is-the-ai-writer-and-how-can-i-use-it-ai-writer-generating-academic-content-with-scispace) (Verified snippet) |
| **Scite** | Assistant answers with citations; Reference Check checks a manuscript's reference list. | References yes. | Reference Check is premium; free accounts lost MCP credits (October 2026). | [Pricing](https://scite.ai/pricing); [Reference Check](https://scite.ai/blog/how-do-i-use-the-scite-reference-check) (Verified snippet) |
| **Consensus** | "Copy with citations" on Pro answers in APA, MLA, Chicago, Harvard, LaTeX or AMA. Results export as RIS or CSV. Library imports RIS and BibTeX. | References yes, attached to AI-written text. No pages. | Free: unlimited searches, 10 Pro messages a month | [Pro messages](https://help.consensus.app/en/articles/10008300-how-to-use-pro-messages); [Plans](https://help.consensus.app/en/articles/10087865-subscription-plans) (Verified snippet) |
| **Paperpal** | Chat PDF with "numbered markers that link back to the exact source text"; Word add-in; citation generator. | Source in chat; carrying it into Word is a copy of a formatted citation. | Free with daily caps (pages disagree) | [Chat PDF](https://paperpal.com/tools/chat-pdf) (Verified snippet) |
| **Jenni AI** | Writing editor; library of uploaded PDFs; marketing says it links AI sentences to "page and paragraph". | Page claim is marketing, **UNVERIFIED**. | Free: 10 PDF uploads (150 pages each), a few chat messages | [Library docs](https://docs.jenni.ai/docs/research/library/) (Verified snippet) |
| **Litmaps, ResearchRabbit** | Discovery (citation maps), not extraction. BibTeX/RIS/CSV export; Zotero import or sync. | References only. | ResearchRabbit keeps a "feature-complete free tier"; Litmaps free account exists, limits not confirmed. | [ResearchRabbit free tier](https://learn.researchrabbit.ai/en/articles/12865509-researchrabbit-free-tier); [Litmaps export](https://docs.litmaps.com/en/articles/9092828-export-articles-from-litmaps) (Verified snippet) |
| **Notion** | Not checked this session. No built-in citation manager known; Zotero-to-Notion bridges are third-party. | **UNVERIFIED** | n/a | Check Notion's help centre |

**Pattern:** reference managers (Zotero, EndNote, Paperpile, ReadCube) carry verbatim text plus source, and sometimes page. AI tools (NotebookLM, Consensus, SciSpace, Elicit) carry AI-written text plus a source link, rarely a page. Nobody joins the two and re-checks the AI text against the PDF the user owns.

---

## 2. Citation fidelity: what comes along when content leaves each tool

| Data | Zotero note built from annotations | Zotero annotation via Web/local API | Zotero Quick Copy of items | Better BibTeX CSL-JSON export | NotebookLM copy-paste of an answer | NotebookLM saved note → Export to Docs | NotebookLM Data Table → Sheets |
|---|---|---|---|---|---|---|---|
| Verbatim source text | Yes (highlight text) | Yes (`annotationText`) | No | No | **No.** Answer prose is AI-generated. Hover quotes are not documented as copyable. | **No** (AI text). Citation targets inside the Doc: UNVERIFIED | Cells are AI-extracted (may be close to verbatim, not guaranteed) |
| Source title | Yes (in `itemData`) | Via parent item | Yes | Yes | At most the name the user gave the upload; likely nothing (third-party claim) | UNVERIFIED | "Citations" tab: content UNVERIFIED |
| Authors (structured) | Yes (CSL-JSON) | Via parent item | Formatted string | Yes | No | No | No |
| Page | Yes (`pageLabel` as `locator`) | Yes (`annotationPageLabel`; `annotationPosition.pageIndex`) | No | No | No (none documented) | No (none documented) | No (none documented) |
| Position on page | Yes (`position`) | Yes (`annotationPosition`) | No | No | No | No | No |
| DOI | If the item has one (CSL-JSON `DOI`) | Via parent item | If the style prints it | Yes, if stored | No | No | No |
| Link back | `attachmentURI` + annotation key (opens the PDF page in Zotero) | Item key | No | Citation key | Only inside NotebookLM | UNVERIFIED | UNVERIFIED |

Sources: Zotero rows from [`editorInstance.js`](https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/editorInstance.js), [`item.js`](https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/data/item.js), [Web API basics](https://www.zotero.org/support/dev/web_api/v3/basics) and [BBT pull export](https://retorque.re/zotero-better-bibtex/exporting/pull/) (all Verified). NotebookLM rows from the help pages in 1.2 (Verified for what is documented; every "No" is absence from the docs, to be confirmed hands-on).

**What Researchie must re-derive:**

| Missing piece | How, without an LLM | Existing code to reuse |
|---|---|---|
| Which paper a NotebookLM passage came from | Match the passage against the text of every PDF in the project. Exact match first, then word overlap. Rank PDFs by best page score. If the paste includes a source title, use it to try that PDF first. | `checkQuoteAgainstPages()` and `normalizeForMatch()` in `src/lib/ai/claimSupport.ts` (exact match, or 80% word overlap on one page, with hyphen and accent handling) |
| Page | The page where the match scored highest. Return "not found" rather than the nearest page when below threshold. | Same function returns `pageNumber`. Note: today it returns the closest page even when `supported` is false; the UI must not show that as a citation. |
| Reference metadata (authors, year, journal, DOI) | DOI from the PDF text or metadata, then Crossref/DataCite/PubMed lookup. If no DOI, Crossref `query.bibliographic` with the title. Show "check this match" for title lookups. | `readPdfDois()` in `src/lib/citations/pdfReader.ts`; resolver and `query.bibliographic` call in `src/lib/citations/lookup.ts`; `manual.ts` for incomplete records |
| Whether text is a quote or a summary | Rule: anything from NotebookLM is "AI summary" unless the matcher finds it verbatim (or near-verbatim above a high threshold) in one of the user's PDFs. Only matched spans may become quotes. | New: a `provenance` field on the inserted block |
| Zotero references already in the library | Match on DOI first, then normalised title + year, to avoid duplicates. | `normalizeDoi()` in `src/lib/citations/identify.ts` |

**Repo status (grep, 2026-10-20):** there is **no BibTeX, RIS, CSL-JSON or Zotero import** in the code. `src/lib/citations/export.ts` writes BibTeX and RIS; `src/components/CitationStyleBar.tsx` labels RIS "For Zotero, Mendeley and EndNote" (export only). `SCOPE.md` lists "[not started] Zotero and Mendeley import {S-109}". `docs/COMPETITOR_ANALYSIS.md` recommends "Integrate (import and export)" with Zotero rather than cloning it. No NotebookLM code exists.

---

## 3. Combining NotebookLM's corpus with Researchie's paper under a low token budget

### 3.1 Options evaluated

| Idea | How it works | Tokens | Reliability | Verdict |
|---|---|---|---|---|
| **A. Zotero as the citation source of truth: file import** | User exports RIS, BibTeX or CSL-JSON (Zotero's own export, or a Better BibTeX download) and uploads it. Parse into `CitationRecord`. CSL-JSON maps almost one-to-one; BibTeX/RIS need a parser. | 0 | High; formats are stable. BBT CSL-JSON includes citation keys. | **Build first (S).** Parser choice: a small in-house RIS/BibTeX parser, or `@citation-js` input plugins (MIT; the core and BibTeX/RIS plugins do not pull in citeproc, unlike `plugin-csl` noted in `paper-preview.md` §4.4; **UNVERIFIED**, check each plugin's dependencies on npm). |
| **B. Zotero Web API import** | User pastes a Zotero API key (read-only, scoped to their library) or uses OAuth 1.0a. Pull top-level items as `format=csljson`, notes as JSON (parse `data-citation` and `data-annotation`), and annotations with `itemType=annotation`. Sync incrementally with `since` and `Last-Modified-Version`. | 0 | High for items and notes. Annotation JSON shape: check against a real library. Respect `Backoff`/`Retry-After`, at most 4 concurrent requests, 100 items per page. | **Build second (M).** Gives verbatim highlights with page labels and real references, no LLM. Store the key encrypted; offer "forget key". |
| **C. Zotero local API from the browser** | Web page calls `localhost:23119/api/`. | 0 | CORS behaviour undocumented; BBT endpoints are blocked from browsers. A hosted server cannot reach the user's machine. | **Not for the web app.** Possible later from the Chrome extension's background worker (extensions can fetch localhost with host permission), **UNVERIFIED**; test with Zotero 10. |
| **D. Paste parser for NotebookLM output** | A paste box reads `text/html` and `text/plain` from the paste event. Detect citation markers (bare numbers, `[n]`, superscripts) and an optional trailing "Sources" list (from the third-party extension or typed by the user). Strip markers from prose; keep them as "unresolved source n". | 0 | Medium. Format is undocumented and can change. The parser must fail soft: if nothing is detected, the whole paste is one AI-summary block. | **Build (M), together with E.** Do not depend on exact markup. |
| **E. Deterministic quote matching against the user's PDFs** | For each sentence or quoted span in the paste, run `checkQuoteAgainstPages` across all project PDFs (pdf.js text per page). Exact match gives "verbatim, p. N"; high overlap gives "near-verbatim, check"; no match gives "AI summary, no quote". | 0 | High for real quotes; it cannot prove a paraphrase is faithful (that needs an entailment check, which is an LLM call). Scanned PDFs need OCR text first (Tesseract is in the repo). | **Build (M).** This is the core of trust. Cost is CPU in the browser: a few PDFs × a few hundred pages is fine; cache page text per PDF. |
| **F. Chrome extension reads the NotebookLM page** | Content script on `notebook.google.com` / `notebooklm.google.com` captures the answer DOM and the hover text of each citation chip, then sends it to the side panel. | 0 | **Brittle:** Google can change class names any time; the product was just renamed and is moving into the Gemini app. Hover quotes may load lazily. A third-party extension already does citation mapping, so it is feasible. | **Defer (M to L, plus upkeep).** Terms: Google's terms forbid "using automated means to access content from any of our services in violation of the machine-readable instructions" and list "scraping content that doesn't belong to you" as a ground for suspension; Google "won't claim ownership" of content you generate ([Google Terms, effective 30 July 2026](https://policies.google.com/terms), Verified). A user-triggered read of their own answer on their screen is arguably not that, but this is **not legal advice and UNVERIFIED**. Chrome Web Store review of such an extension was not checked. |
| **G. NotebookLM Data Table import** | User asks NotebookLM for a Data Table (rows = papers, columns = method, sample, finding), exports to Sheets, downloads CSV/XLSX, uploads to Researchie. Each cell becomes an AI-summary block tied to a paper row; the citations tab (format UNVERIFIED) maps rows to sources. | 0 | Medium. Structured, so better than prose paste. Data Tables first launched for Pro/Ultra ([9to5Google, Dec 2025](https://9to5google.com/2025/12/19/notebooklm-gemini-3-data-tables/), Third-party snippet); current free availability **UNVERIFIED**. | **Build after a hands-on test of the export (S to M).** Fits a "comparison of methods" table in a review paper well. JSZip is already in the repo for XLSX. |
| **H. Slot model, manual** | Each imported block lands in an "Inbox". The user drags it into a template section (Introduction, Methods, Results, Discussion…) or picks one from a dropdown. | 0 | Total; the user decides. | **Build (S).** Default. |
| **I. Slot model, Groq suggests the section** | One short call: section list + first ~300 words of the block, answer with one section key. Show as a suggestion chip; never auto-place. | ~400 to 900 per paste | Good enough for a suggestion; wrong guesses cost one drag. | **Optional (S), off by default.** |
| **J. Enterprise API** | Programmatic notebooks. | n/a | No query endpoint; paid licences. | **Reject.** |

### 3.2 Token cost of the optional Groq call

Estimate per paste (counted as roughly 4 characters per token, an approximation):

| Part | Tokens |
|---|---|
| System prompt with rules and the template's section keys and one-line descriptions | 150 to 250 |
| The pasted block, truncated to ~300 words | 250 to 600 |
| Output (one section key, plus an optional "contains AI summary / looks like verbatim" flag) | 5 to 20 |
| **Total** | **~400 to 900** |

Limits on [console.groq.com/docs/rate-limits](https://console.groq.com/docs/rate-limits) (Verified, fetched 2026-10-20). The page says "the limits shown below are the base limits for the Developer plan" and "Rate limits apply at the organization level". The Free plan tab had no separate numbers in the fetched text, so **free-tier figures are UNVERIFIED**; check the page while signed in.

| Model | RPM | RPD | TPM | TPD | Pastes per minute at ~900 tokens | Pastes per day at ~900 tokens |
|---|---|---|---|---|---|---|
| `openai/gpt-oss-20b` | 30 | 1K | 8K | 200K | ~8 (TPM bound) | ~220 (TPD bound) |
| `openai/gpt-oss-120b` | 30 | 1K | 8K | 200K | ~8 | ~220 |
| `qwen/qwen3.8-27b` | 30 | 1K | 8K | 200K | ~8 | ~220 |

The Llama models previously used were not in the fetched table. Because limits are per organisation, a shared server key would split this budget across all users; the BYO-key setup in `src/lib/ai/providers.ts` avoids that. Compare: one grounded "draft a section" call with 10 clips would be 5K to 10K tokens, one to two orders of magnitude more. Section classification is cheap; drafting is not.

### 3.3 Recommended data model addition

Each block inserted into the paper records where it came from and what kind of text it is:

```ts
type Provenance =
  | { kind: 'verbatim'; clipId: string; page: number; matchedBy: 'zotero-annotation' | 'researchie-clip' | 'pdf-match-exact' }
  | { kind: 'near-verbatim'; clipId: string; page: number; overlap: number }      // shown as "check wording"
  | { kind: 'ai-summary'; tool: 'notebooklm' | 'other'; candidateSources: { clipId: string; page?: number; score: number }[] }
  | { kind: 'user'; };                                                              // the user's own writing

interface ImportedBlock {
  id: string;
  text: string;
  provenance: Provenance;
  sectionKey?: string;        // template slot; undefined = Inbox
  citationIds: string[];      // CitationRecord ids; never for ai-summary without a user-confirmed source
  importedAt: string;
  rawPaste?: string;          // kept so the parser can be re-run if it improves
}
```

Rules: only `verbatim` blocks can be shown in quotation marks with a page. `ai-summary` blocks render with a visible "AI summary from NotebookLM: rewrite in your own words and cite the source" label and cannot be turned into a quote. A citation on an `ai-summary` block points at the source paper the user confirmed, not at the AI text (ICMJE: "Referencing AI-generated material as the primary source is not acceptable", see `paper-preview.md` §3.5).

---

## 4. User flows

### 4.1 (a) Zotero-first user

1. In Zotero, highlight passages in each PDF (colour = role, e.g. yellow = method, green = result; optional).
2. In Researchie, open the paper, then **Import → From Zotero**. Two choices:
   - **Connect with an API key** (recommended): paste a read-only key; pick a collection. Researchie pulls references, notes and annotations.
   - **Upload a file**: Better BibTeX CSL-JSON (references only) or Zotero RIS/BibTeX export.
3. Researchie shows each annotation as a card: verbatim text, "p. 14", the paper, its colour and the user's comment. References land in the project's citation list (deduplicated by DOI).
4. If the PDF is also in Researchie, the card links to that page in the Document Reader; otherwise it links to the DOI.
5. The user drags cards into template sections. Each lands as a quote with a citation node (`locator` = page). Toggling Harvard/IEEE re-renders.
6. Re-import later pulls only changes (`since` version).

### 4.2 (b) NotebookLM-first user

1. Upload the same PDFs to Researchie (needed for verification) and to NotebookLM.
2. In NotebookLM, ask for what you need. Prompt tips we can show (these steer the model; they do not guarantee output):
   - "Quote the exact sentence from the paper that describes the sampling method. Put the quote in quotation marks and name the source file."
   - "Make a data table: one row per source, columns Method, Sample size, Main finding, Limitation."
3. Copy the answer (copy button, or select and Ctrl+C), or export the Data Table to Sheets and download it as CSV.
4. In Researchie, **Paste from NotebookLM** (or **Upload table**). Researchie:
   - labels everything "AI summary" first;
   - splits sentences and quoted spans, and searches the project's PDFs for each;
   - upgrades exact matches to "Verbatim, p. N, [paper]" and near matches to "Check wording, p. N";
   - leaves the rest as "AI summary. Possible source: [paper] p. N (match 62%)" or "No source found".
5. The user confirms or picks the source for each AI-summary block, then drags it into a section. AI-summary blocks keep a label until the user rewrites them in their own words.

### 4.3 (c) Both

1. Zotero holds references and verbatim highlights (flow a). NotebookLM is used for "find me where papers disagree on X" or comparison tables.
2. Import Zotero first, so the project has references and PDFs with DOIs.
3. Paste NotebookLM output. Matching now runs against Zotero annotation text as well as PDF text: when a NotebookLM passage matches an existing Zotero highlight, Researchie links the existing card instead of creating a new one.
4. Result: AI text points the user to the right highlight; the highlight provides the citable words and page.

### 4.4 Onboarding text (draft, plain English)

**How to bring in your Zotero library**

> Researchie can read your Zotero references and highlights, so you don't retype them.
>
> **Quickest (references and highlights):**
> 1. Go to zotero.org → Settings → Security → Applications → *Create new private key*. 
> 2. Tick *Allow library access*. Leave write access off.
> 3. Copy the key and paste it here. You can remove it any time.
>
> **Without a key (references only):** In Zotero, right-click a collection → *Export Collection…* → choose *RIS* or *BibTeX* (or *Better CSL JSON* if you use Better BibTeX) → upload the file here.
>
> Highlights come in with their page number. They count as exact quotes from the paper.

The key-creation menu path is **UNVERIFIED** this session; check it at zotero.org/settings before shipping the text.

**How to copy from NotebookLM (now Gemini Notebook) with sources**

> NotebookLM writes its own summary of your sources. That summary is useful, but it is not the paper's words, so you can't quote it.
>
> 1. Upload the same PDFs here too. Researchie uses them to find where each sentence came from.
> 2. In NotebookLM, ask it to *quote the exact sentence* and *name the file*. Hover a citation to see the passage it used.
> 3. Copy the answer and paste it here. For tables, export the table to Google Sheets, then *File → Download → CSV*, and upload it.
> 4. Researchie marks each part: **Exact quote** (found word for word, with page), **Check wording** (nearly matches), or **AI summary** (not found in your PDFs). Only exact quotes can go in quotation marks. Rewrite AI summaries in your own words and cite the paper.

**Privacy note to show at connect time**

> Your draft stays in Researchie. Importing from Zotero sends nothing to an AI. The optional "suggest a section" button sends the pasted block (not your draft) to the AI provider you chose.

---

## 5. Recommendation

### 5.1 Ranked options

| Rank | Build | Effort | Why | Depends on |
|---|---|---|---|---|
| 1 | **RIS / BibTeX / CSL-JSON import** into `CitationRecord`, with DOI dedupe | S | Unblocks Zotero, Mendeley, EndNote, Paperpile, Consensus, Litmaps, ResearchRabbit users at once (all export one of these). Closes S-109 partly. | Parser choice (licence check) |
| 2 | **Inbox + manual slotting** of blocks into template sections, with the `Provenance` field | S | The insertion step of the founder's workflow, without an LLM. | Paper document model from `paper-preview.md` §8 |
| 3 | **Paste box + deterministic PDF matching** (NotebookLM or any text) | M | Recovers source and page for real quotes; labels the rest as AI summary. Zero tokens. | Per-page PDF text cache; `claimSupport.ts` fix so non-matches return no page |
| 4 | **Zotero Web API import** (items, notes, annotations; incremental) | M | Brings verbatim highlights with page labels, which is exactly what researchers extract. | Encrypted key storage; check the annotation JSON on a real library |
| 5 | **NotebookLM Data Table CSV/XLSX import** | S to M | Structured comparisons for review papers. | Hands-on check of the citations tab |
| 6 | **Optional Groq section suggestion** | S | Saves a drag; ~900 tokens. | BYO key |
| 7 | **Extension reading NotebookLM's page** | M to L + upkeep | Only if users ask and the terms question is settled. | Legal read; selector maintenance |
| 8 | **Zotero local API via the extension** | M | Live, keyless access for desktop users. | Test CORS and extension access on Zotero 10 |

**Build first:** 1 and 2 together (one sprint), then 3. That makes "paste from anywhere, it lands in the right section with a source or a warning" work end to end before any Zotero API or NotebookLM-specific code.

### 5.2 Risks

| Risk | What could go wrong | Mitigation |
|---|---|---|
| **AI paraphrase cited as the paper's words** | User pastes a NotebookLM sentence, puts quotes around it, cites the paper. That misquotes the source; if submitted, it misrepresents the literature. | Default every paste to `ai-summary`. Only matcher-verified spans become `verbatim`. Quotation marks are a render of `verbatim`, not something the user types around AI text. Permanent label on AI blocks until rewritten. Never auto-cite an AI block; the user confirms the source. |
| **NotebookLM changes** | Rename (July 2026), move into the Gemini app, new copy formats. Paste parser and any extension break. | Parser fails soft (whole paste = one AI block). Keep `rawPaste` to re-parse. No extension in v1. |
| **Terms of service** | DOM reading of NotebookLM could be read as scraping. | No extension in v1; user-initiated copy-paste only. Get a legal read before option 7. |
| **Privacy of unpublished work** | Drafts sent to an AI provider; a Zotero key stored on Researchie's server. | Import path uses no AI. The Groq call sends only the pasted block. Store the Zotero key encrypted, read-only, revocable; say so in the UI. Note NotebookLM's own terms: personal-account feedback is human-reviewed ([privacy page](https://support.google.com/gemininotebook/answer/17004255), Verified). |
| **False matches** | A common sentence matches the wrong paper or page. | Short spans (<4 words) need an exact match (already in `claimSupport.ts`). Show the score; require a click to accept "Check wording" matches. |
| **Matcher returns a page for a failed match** | `checkQuoteAgainstPages` returns the closest page even when `supported` is false. | Never show a page unless `supported` is true. |
| **Scanned PDFs** | No text layer; nothing matches. | Run OCR (Tesseract, in repo) before matching, and say "OCR text, check". |
| **Zotero API quirks** | Annotation field names, missing images for area annotations, rate backoff. | Test on a real library; honour `Backoff`; import images later via the local file only. |
| **Copyright** | Long verbatim quotes pasted into the draft. | Same as `paper-preview.md` §7: warn when a paragraph is mostly quoted text. |
| **Licence of parsers** | A BibTeX/RIS library pulls in AGPL/CPAL code (citeproc). | Check the dependency tree of any parser; in-house parser is the fallback. |

---

## Could not verify

- **What NotebookLM's copy button puts on the clipboard** (markers, source titles, HTML structure). Only a third-party extension listing describes it. Verify hands-on: copy an answer citing two PDFs, paste into a plain textarea and inspect `text/html` in a paste event.
- **What a NotebookLM "Export to Docs" note contains** for citations, and the **format of the Sheets citations tab** for Data Tables. Verify hands-on.
- **Whether NotebookLM ever shows page numbers or DOIs** in citations. The help pages read do not mention them.
- **NotebookLM numeric limits by plan** beyond "50 sources (for Free users)" and 500,000 words / 200 MB per source. Usage limits are only given as multiples. Check Settings → Usage in the app.
- **Data Tables availability on the free plan** today. Launched for Pro/Ultra (third-party report, December 2025).
- **Groq free-plan limits.** The fetched table is labelled as Developer-plan base limits. Check console.groq.com/docs/rate-limits signed in, on the Free tab.
- **Zotero annotation JSON field names in API responses** (seen only in forum examples; model fields confirmed in source).
- **Zotero local API from a browser page or an extension** (CORS not documented).
- **Zotero Quick Copy of annotations**: output format and whether it carries page and citation.
- **Zotero "Add Note" button in the word-processor plugin**: mentioned in the Zotero 8 blog, missing from the plugin usage page.
- **Zotero API key creation menu path** used in the onboarding text.
- **Paperpile, ReadCube, Elicit, SciSpace, Jenni**: whether exports carry page numbers, and current free-tier details. Vendor pages disagree; many were snippets.
- **Overleaf, EndNote, Consensus, Scite pages**: read as search snippets, not fetched.
- **Notion**: not researched.
- **Google terms applied to a user-triggered extension reading NotebookLM**: not legal advice; needs a legal read. Chrome Web Store policy not checked.
- **`@citation-js` BibTeX/RIS input plugins' dependency on citeproc**: check npm.

---

## Sources

Zotero
- https://www.zotero.org/blog/zotero-8/
- https://www.zotero.org/blog/zotero-10/
- https://www.zotero.org/support/changelog
- https://www.zotero.org/support/pdf_reader
- https://www.zotero.org/support/creating_bibliographies
- https://www.zotero.org/support/word_processor_integration
- https://www.zotero.org/support/word_processor_plugin_usage
- https://www.zotero.org/support/kb/annotations_in_database
- https://www.zotero.org/support/dev/web_api/v3/basics
- https://www.zotero.org/support/dev/web_api/v3/local_api
- https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/editorInstance.js
- https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/data/item.js
- https://raw.githubusercontent.com/zotero/zotero-schema/master/schema.json
- https://forums.zotero.org/discussion/comment/386881 (forum, snippet)
- https://retorque.re/zotero-better-bibtex/exporting/pull/
- https://retorque.re/zotero-better-bibtex/citing/cayw/

NotebookLM / Gemini Notebook and Google
- https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/
- https://workspaceupdates.googleblog.com/2026/07/notebooklm-now-gemini-notebook.html (snippet)
- https://support.google.com/gemininotebook/answer/16179559
- https://support.google.com/gemininotebook/answer/16262519
- https://support.google.com/gemininotebook/answer/16206563
- https://support.google.com/gemininotebook/answer/16215270
- https://support.google.com/gemininotebook/answer/17670842
- https://support.google.com/gemininotebook/answer/17004255
- https://support.google.com/notebooklm/answer/16269187
- https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs/api-notebooks
- https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources (snippet)
- https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs/set-up-licensing (snippet)
- https://policies.google.com/terms
- https://chromewebstore.google.com/detail/dmphledfnmpnkhmgkkledaoihcmhcjpd (third-party)
- https://9to5google.com/2025/12/19/notebooklm-gemini-3-data-tables/ (third-party, snippet)

Groq
- https://console.groq.com/docs/rate-limits

Other tools
- https://github.com/mgmeyers/obsidian-zotero-integration
- https://github.com/mgmeyers/obsidian-zotero-integration/blob/main/docs/Templating.md
- https://docs.overleaf.com/integrations-and-add-ons/reference-manager-integrations/zotero (snippet)
- https://support.clarivate.com/Endnote/s/article/EndNote-2025-Cite-from-a-PDF?language=en_US (snippet)
- https://support.clarivate.com/Endnote/s/article/EndNote-Adding-Page-Numbers-to-Citations?language=en_US (snippet)
- https://www.mendeley.com/reference-management/mendeley-cite
- https://paperpile.com/h/print-pdfs-export-annotations/ (snippet)
- https://www.readcube.com/en/help-center/how-to-export-pdf-notes/ (snippet)
- https://www.readcube.com/en/smartcite-for-google-docs/ (snippet)
- https://support.elicit.com/en/articles/1153857 (snippet)
- https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit (snippet)
- https://scispace.com/chat-pdf (snippet)
- https://scispace.com/help/en/articles/10660614-what-is-the-ai-writer-and-how-can-i-use-it-ai-writer-generating-academic-content-with-scispace (snippet)
- https://scite.ai/pricing (snippet)
- https://scite.ai/blog/how-do-i-use-the-scite-reference-check (snippet)
- https://help.consensus.app/en/articles/10008300-how-to-use-pro-messages (snippet)
- https://help.consensus.app/en/articles/10087865-subscription-plans (snippet)
- https://paperpal.com/tools/chat-pdf (snippet)
- https://docs.jenni.ai/docs/research/library/ (snippet)
- https://learn.researchrabbit.ai/en/articles/12865509-researchrabbit-free-tier (snippet)
- https://docs.litmaps.com/en/articles/9092828-export-articles-from-litmaps (snippet)

Repo (read 2026-10-20)
- `src/lib/ai/claimSupport.ts`, `src/lib/citations/lookup.ts`, `src/lib/citations/pdfReader.ts`, `src/lib/citations/export.ts`, `src/lib/citations/identify.ts`, `src/components/CitationStyleBar.tsx`, `SCOPE.md` (S-109), `docs/COMPETITOR_ANALYSIS.md`, `docs/research/paper-preview.md`
