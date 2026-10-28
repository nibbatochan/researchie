# Paper Mode as a workspace: templates, fields, citation styles, editor, paste, wizard, file list

Research date: 2026-10-22. This continues `docs/research/paper-preview.md` (2026-10-20). It does not repeat that file. Where a finding there still holds, this file points to it by section.

Source rules and labels (same as `paper-preview.md`):

- **Verified (fetched):** read from the owning page, file or registry in this session.
- **Verified (snippet):** the page would not load; the text came from a search result that quotes it. Re-check before relying on it.
- **Verified (measured):** I downloaded the package and measured it here.
- **UNVERIFIED:** not confirmed from a primary source. The note says where to check.
- **Varies:** differs by journal or field.

Limits of this pass. Several primary sources are paywalled or blocked: the APA, MLA and Chicago manuals themselves, the IEEE Reference Guide, the CONSORT checklist, the Nature and Springer formatting pages (login redirect), and the Google Docs file-list help page. For the citation styles I read the CSL style files, which are the Citation Style Language project's encoding of each manual. They are the owner's machine-readable rules for the CSL project, but they are not the manuals. Page fetches were summarised by a small model, so quoted wording is as returned.

The feature in one line: Paper Mode becomes a place that lists every paper the researcher has made, starts each from a template, lets them write in a page-like editor, drag in their project's clips, images and citations, and shows how the paper will look while they write. It is still a drafting aid. The permanent "Preview only, not journal formatting" rule from `paper-preview.md` section 7 still applies.

---

## What exists today (read from `src/`)

| Area | What the repo has | Where |
|---|---|---|
| Paper model | One `PaperOutline` per project: `templateId` is `'imrad'` or `'review'`, optional `title` and `authors` (one free string), and `sections[]` with `parts[]`, clip ids, a one-line `point`, plain `text` with `[@key]` citation tokens, a `cites` map, `done`, and an AI `draft`. | `src/lib/paper/outline.ts` |
| Storage | One JSON string per project under the preference key `researchie.paperOutline.<projectId>`. Capped at 60 KB per outline, inside a 256 KB cap for the whole settings object. | `src/lib/paper/store.ts` (comments cite `src/app/api/settings/route.ts`) |
| Templates | Two, with 6 sections each. IMRaD: abstract, introduction, methods, results, discussion, conclusion. Review: abstract, introduction, search method, findings, discussion, conclusion. No metadata fields beyond title and authors. | `PAPER_TEMPLATES` in `outline.ts` |
| Editor | `SectionEditor.tsx` edits plain text paragraphs with typed `[@key]` tokens. No rich text, no tables, no figures nodes. Maths goes through `MathText.tsx` and KaTeX. | `src/components/SectionEditor.tsx`, `src/lib/paper/math.ts` |
| Preview | `PaperPreview.tsx` and `preview.ts` render the paper; `printDoc.ts` makes a print document; `PdfExportPanel.tsx` exports. | `src/components/PaperPreview.tsx`, `src/lib/paper/printDoc.ts` |
| Paste | `PastePanel.tsx` and `pasteMatch.ts` take pasted AI text, strip `[1]`-style markers, split sentences and match them to clips. This is a clip-matching tool, not a general rich-text paste handler. | `src/lib/paper/pasteMatch.ts` |
| Citation formatters | `apa.ts`, `ama.ts`, `vancouver.ts`, `harvard.ts`, `ieee.ts`. In-text rendering (`renderCitations`) supports **only `harvard` and `ieee`**. Source types: `journal_article`, `preprint`, `web_page`, `report`, `dataset`, `book_chapter`, `unknown`. Missing fields print as `[incomplete: name]`. | `src/lib/citations/*.ts`, `inText.ts`, `types.ts` |
| Sanitiser | `sanitize-html` (server side) for clipped block HTML: tag and attribute allow-lists, URL scheme checks. No DOMPurify in the repo. | `src/lib/security/sanitizeBlockHtml.ts` |
| Relevant dependencies | Next 15.5.28, React 19.3.1, KaTeX ^0.16.11, `pdfjs-dist` ^6.3.289, `@react-pdf/renderer`, `react-markdown`, `sanitize-html`, `tesseract.js`, `jszip`. No editor library, no drag-and-drop library. | `package.json` |

Two corrections to `paper-preview.md`. Its section 4.4 says there is "no Harvard or IEEE formatter yet". `harvard.ts`, `ieee.ts` and `inText.ts` now exist. And "Chicago 17" is not what the CSL repository carries now (section 3.2 below).

**The structural problem for a workspace.** One outline per project, stored in the account's preferences, cannot hold a list of papers. A workspace needs a `papers` table (or collection) with one row per paper: id, owner, `projectId` (the data source), `templateId`, name, metadata, document JSON, `updatedAt`, `deletedAt`. The 60 KB and 256 KB caps in `store.ts` are far too small for several rich-text papers with embedded figures. This is a design inference from the code comments, not a measured limit on the new design.

---

## Answer up front

1. **Templates.** Ship six entries: Blank plus five. (a) IMRaD research article, (b) Systematic review (PRISMA 2020), (c) Conference paper (IEEE or ACM two-column), (d) Case report (CARE), (e) Short communication. Defer thesis chapter: no common structure exists across universities and I found no primary source (section 1.6). PRISMA 2020 and ICMJE give exact, citable section structures for (a) and (b); ACM documents the required front matter for (c); CARE gives 13 items for (d); journal guides cap short communications at 3,000 to 4,000 words (e).
2. **Fields.** Model a paper as front matter (title, short title, authors with ORCID, affiliation, corresponding flag and CRediT roles; abstract; keywords), body sections, end matter (funding, competing interests, data availability, ethics, acknowledgements, AI disclosure), references, appendices. Only title, authors with affiliations, and abstract are near-universal. The rest varies by journal, so every template must treat them as optional toggles.
3. **Citation styles.** The repo covers 2 of the 7 requested in-text families. Missing: MLA 9, Chicago (author-date and notes), APA and Vancouver in-text, and a `book` source type. **The CSL repository's Chicago styles are the 18th edition, not the 17th** (title lines in the CSL files). The CSL processor `citeproc` is `CPAL-1.0 OR AGPL-1.0`; I measured it at 967 KB raw (191 KB gzipped, not minified). Recommendation: keep hand-written formatters for v1, behind one interface; do not add citeproc until a lawyer clears the licence.
4. **Editor.** Use **TipTap** (ProseMirror) for v1. Core and the extensions we need (drag handle, table, mathematics, file handler, image) are MIT on npm, and `@tiptap/react` 3.32.0 lists React 19 in its peer range. The paid part is **page-based layouts** (Team plan and above) and cloud features such as collaboration, comments and DOCX import/export. For the page look, do not buy Pages: build page sheets with CSS and paginate the read-only preview with paged.js (MIT, 503 KB minified, 97 KB gzipped, measured) only when the user asks.
5. **Paste.** Browsers expose `text/plain`, `text/html` and `image/png` on paste (W3C). ProseMirror gives three hooks (`transformPastedHTML`, `transformPastedText`, `transformPasted`) and builds the result from the schema, so unknown marks are dropped by design. It has no special handling for Word or Google Docs HTML (read from the source). Recommended pipeline in section 5.7: normalise, sanitise with DOMPurify, map to schema, repair PDF text, offer "paste as plain text".
6. **Wizard.** Ask five things: paper name, template, data source (project and sub-projects), citation style, and target venue or word limit (optional). Infer everything else. Authors, ORCID, funding and ethics belong in the editor's front-matter panel, not the wizard (section 6).
7. **File list.** A list view with search, sort by last edited, inline rename, duplicate, trash with restore, and tags instead of folders. Google Docs, Overleaf and Notion all separate "remove" from "permanently delete"; Notion and Zotero keep trash for 30 days. Reuse the app's 8-second undo toast and trash drawer.
8. **Biggest things the owner missed:** export to DOCX/PDF (people submit from Word), a cited-versus-listed reference check, a version history, a place for the template's reporting checklist, and moving the document out of the preference store. See section 8.

---

## 1. Template types to ship first

### 1.1 Conclusion

Ship Blank plus these five. Each is stored as data (a section list, metadata toggles, layout, default citation style, optional checklist), not as code. The shape in `paper-preview.md` section 2.3 still works; add `frontMatter`, `endMatter` and `headerFooter` fields (section 2).

| # | Template | Best for | Abstract | Columns | Default citation style | Reporting checklist to link |
|---|---|---|---|---|---|---|
| 1 | IMRaD research article | Studies with the researcher's own data | Structured, toggle to unstructured | 1 (submission look) | Vancouver (numbered) or APA (author-date), user picks | CONSORT 2025 (trials), STROBE (observational) |
| 2 | Systematic review (PRISMA 2020) | Syntheses of collected papers; the best fit for Researchie's clip model | Structured, PRISMA-for-abstracts | 1 | Vancouver or APA | PRISMA 2020 |
| 3 | Conference paper | Computing and engineering | Unstructured, one paragraph | 2 | IEEE (numbered) | ACM acmart `sigconf` or IEEEtran |
| 4 | Case report (CARE) | Clinical case reports | Structured in three parts | 1 | Vancouver | CARE, 13 items |
| 5 | Short communication | Brief, focused results | Unstructured or short structured | 1 | Journal-defined | None fixed |

### 1.2 IMRaD research article

- **Source (Verified, fetched):** ICMJE, https://www.icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html. It lists the title page, structured abstract (required for original research, systematic reviews and meta-analyses), introduction, methods (with an ethics-approval statement), results, discussion (with limitations), references, tables, figures. Tables and figures are numbered by first citation. References are numbered consecutively by order of first mention. Trial registration numbers go at the end of the abstract. Funding is listed separately after the abstract. Data set identifiers are cited where datasets were used.
- **Structure to ship:** Title page block, Abstract (Background, Methods, Results, Conclusions), Keywords, Introduction, Methods (with Participants or Materials, Procedure, Ethics, Statistical analysis), Results, Discussion (with Limitations), Conclusion (optional), end matter, References, Tables, Figures, Appendices.
- **Variants (Varies):** "Materials and Methods", merged "Results and Discussion", no separate Conclusion. ICMJE's own list has no separate Conclusion. Let the user rename, toggle or merge sections in the editor.

### 1.3 Systematic review (PRISMA 2020)

- **Source (Verified, fetched):** Page MJ et al., *BMJ* 2021;372:n71, via Europe PMC full text (PMC8008539), https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8008539/fullTextXML. Table 1 is a **27-item checklist** (42 lines counting sub-items such as 10a, 13a to 13f, 16a to 16b, 20a to 20d, 23a to 23d, 24a to 24c). The PRISMA site points to the same checklist and a flow-diagram template: https://www.prisma-statement.org/prisma-2020 (Verified, fetched; the checklist items were not on this page).
- **Item groups, from Table 1:**

| PRISMA section | Items (number: topic) |
|---|---|
| Title | 1 Title (identify as a systematic review) |
| Abstract | 2 Abstract (own 12-item abstract checklist: Title, Objectives, Eligibility, Information sources, Risk of bias, Synthesis methods, Included studies, Synthesis results, Limitations, Interpretation, Funding, Registration) |
| Introduction | 3 Rationale, 4 Objectives |
| Methods | 5 Eligibility criteria, 6 Information sources, 7 Search strategy, 8 Selection process, 9 Data collection process, 10 Data items, 11 Risk of bias assessment, 12 Effect measures, 13 Synthesis methods, 14 Reporting bias assessment, 15 Certainty assessment |
| Results | 16 Study selection (flow diagram), 17 Study characteristics, 18 Risk of bias in studies, 19 Results of individual studies, 20 Results of syntheses, 21 Reporting biases, 22 Certainty of evidence |
| Discussion | 23 Discussion (interpretation, limitations of evidence, limitations of process, implications) |
| Other information | 24 Registration and protocol, 25 Support, 26 Competing interests, 27 Availability of data, code and other materials |

- **Structure to ship:** the groups above as headings, with Methods as sub-headings 5 to 15 and Results as sub-headings 16 to 22. Add a "PRISMA flow diagram" figure placeholder. Show the 27 items as a to-do sidebar (the app does not claim compliance).
- **Narrative review option:** the existing `review` template (themes, no PRISMA) stays as a toggle named "Narrative review". I found no primary source that fixes narrative-review structure. UNVERIFIED; treat the section list as convention.

### 1.4 Conference paper

- **ACM (Verified, fetched):** acmart documentation, https://raw.githubusercontent.com/borisveytsman/acmart/master/acmart.dtx. `sigconf` is the "Proceedings format for most ACM conferences (with the exception of SIGPLAN)". Required: `\title`; one `\author` per author; `\affiliation` with institution, city and country (a missing country is an error); `abstract` before `\maketitle`; "CCS Concepts and user-defined keywords are required for all articles"; `\keywords` comma-separated. `\settopmatter` controls CCS printing, ACM reference format, page numbers (`printfolios`) and authors per row. Figures and tables can span both columns (`figure*`, `table*`). Options `anonymous` (obscures author information, and the acknowledgements must be omitted) and `review` (line numbers) exist. An optional short title is used for running heads.
- **IEEE (Verified, snippet):** IEEE offers Word (US letter and A4) and LaTeX conference templates, and says papers that keep the template's guide text may not be published: https://www.ieee.org/conferences/publishing/templates.html (page not fetchable; text from search results of IEEE and conference-hosted pages). Column width is about 88 mm (3.45 in) and US letter margins are top 0.75 in, bottom 1 in, sides 0.625 in in one IEEE-hosted guide. Other guides give different A4 margins, so margins are conference-specific. Use the `IEEEtran_HOWTO.pdf` listed at https://nssmic.ieee.org/2019/wp-content/uploads/sites/2/2019/09/IEEEtran_HOWTO.pdf for details (not read).
- **Structure to ship:** Title, Authors (name, institution, city, country, email), Abstract, CCS concepts and Keywords (ACM) or Index Terms (IEEE; term name UNVERIFIED this session), Introduction, Related Work, Method or System, Evaluation, Discussion and Limitations, Conclusion, Acknowledgements, References. The body section names are field convention: UNVERIFIED against a primary source (neither template mandates them).
- **Page limit:** conference-specific. The wizard asks for it as a number (section 6).

### 1.5 Case report and short communication

- **Case report (CARE).** A search result for the CARE statement lists 13 items: title, key words, abstract, introduction, patient information, clinical findings, timeline, diagnostic assessment, therapeutic interventions, follow-up and outcomes, discussion, patient perspective, informed consent (Verified, snippet; summarised from CARE checklist PDFs such as https://hrbopenresearch-files.f1000.com/resources/CARE_checklist.pdf; the official source is https://care-statement.org and Riley et al., *J Clin Epidemiol* 2017). Key-word counts differ between checklist versions (two to five in one, four to seven in another), so do not hard-code a number. A timeline is a table or figure. **Consent is a required element**, which makes this template the one that needs a "patient identifiers removed" reminder.
- **Business or social-science "case study":** no primary source found. UNVERIFIED. Offer it later as Blank plus a section list (Background, Case description, Analysis, Lessons) only if users ask.
- **Short communication (Verified, snippet):** Elsevier journal guides give different limits: Advances in Water Resources 4,000 words plus a summary statement of fit, LWT 3,000 words with "the formal organisation of a full paper", Solid State Communications six printed pages (https://elsevier.com/journals/advances-in-water-resources/0309-1708/guide-for-authors, https://elsevier.com/journals/lwt/00236438/guide-for-authors, https://www.elsevier.com/journals/solid-state-communications/00381098/guide-for-authors; located by search, not fetched). The lesson: the limit is per journal. Structure to ship: Title, Abstract (short), Keywords, Introduction, Methods, Results and Discussion (merged), Conclusion, end matter, References.

### 1.6 Thesis chapter: defer

I found no cross-university primary source. Each university publishes its own thesis manual (page margins, chapter headings, front matter such as dedication and list of tables). UNVERIFIED as a single structure. A thesis chapter is also long, which stresses the editor (section 4). Treat it as a post-v1 template, or as Blank with the user's own headings.

### 1.7 Reporting guidelines to link (do not claim compliance)

| Study type | Guideline | Source |
|---|---|---|
| Systematic review | PRISMA 2020, 27 items | Europe PMC fullTextXML above (Verified, fetched) |
| Randomised trial | CONSORT 2025 | https://www.equator-network.org/reporting-guidelines/consort/ (Verified, fetched; item count not on the page, UNVERIFIED) |
| Observational | STROBE | von Elm et al., *Lancet* 2007, per `paper-preview.md` section 2.1 |
| Case report | CARE | care-statement.org (Verified, snippet) |
| Psychology (any method) | APA JARS | https://apastyle.apa.org/jars (page returned no text this session; UNVERIFIED) |
| Qualitative | COREQ (32 items), SRQR | `paper-preview.md` section 1.4 |

---

## 2. Elements and metadata fields a template needs

### 2.1 Conclusion

Group the fields in four blocks: **front matter** (title, short title, authors, abstract, keywords, article type), **end matter** (declarations), **page furniture** (running head, page numbers, footers), **back matter** (references, appendices). Make the model match JATS, the NISO standard that publishers use, so a later export to a journal is mechanical. The JATS tag library confirms `<article-meta>` exists (Verified, fetched: https://jats.nlm.nih.gov/publishing/tag-library/1.3/element/article-meta.html), but the fetch did not return its child list, so the JATS element names in the table below (`title-group`, `contrib-group`, `aff`, `kwd-group`, `funding-group`) are from my knowledge of JATS: UNVERIFIED this session; check that page.

### 2.2 Field table

"Req." means required by the cited source for that venue, not universal.

| Field | Req.? | Rule and source | Notes for the model |
|---|---|---|---|
| Article type | Optional (journal assigns) | Journals have named types (research article, short communication, case report). Elsevier short-communication limits above. | Store as `templateId` plus free label. |
| Title | **Required**, universal | ICMJE: the title should describe the study design where relevant (Verified, fetched). | Plain string; allow sub/superscript and maths. |
| Short / running title | Optional, Varies | ICMJE: "Some journals require a short title of about 40 characters." APA professional running head: all-capital abbreviated title, **50 characters or fewer** (APA Style title page and page header pages, Verified, snippet via search: https://apastyle.apa.org/style-grammar-guidelines/paper-format/title-page). ACM: optional short title for running heads (acmart.dtx). | Default: first 40 characters of title, editable. Store a per-template limit. |
| Authors: name | **Required** | All sources. | Structured: family, given, suffix. Keep a display order. |
| Authors: affiliation | **Required** for journals; ACM requires institution, city and country | ICMJE: department and institution. acmart.dtx: `institution`, `city`, `country` mandatory. | Reusable affiliation list; many-to-many with authors. |
| Authors: ORCID | Optional, encouraged | ICMJE: "encourages ORCID iDs". APA author note lists ORCID iDs. | Validate format and checksum. UNVERIFIED: the ORCID display-guideline page returned 404; check https://info.orcid.org for the iD URL form. |
| Corresponding author | **Required** (one) | ICMJE: the corresponding author's phone number and email on the title page. | Boolean on one author plus email. |
| CRediT roles | Optional, Varies (many publishers ask) | 14 roles; ANSI/NISO Z39.104-2022; CC-BY 4.0: https://credit.niso.org/ (Verified, fetched). | Multi-select per author; render as "A.L.: Conceptualization, Writing – original draft". |
| Abstract | **Required**, near-universal | ICMJE: structured for original research, systematic reviews and meta-analyses. Content: background, purpose, basic procedures, main findings with effect sizes, principal conclusions. PRISMA: own 12-item abstract checklist. Word limits Varies. Nature Portfolio: roughly 150 to 200 words in one journal's guidance, up to 250 with subsections in another (Verified, snippet: https://www.nature.com/documents/commsj-med-style-formatting-checklist-article.pdf). | Template sets `structured` and labels; limit is a user-set number with a live counter. Abstract must match the text (ICMJE). |
| Keywords | Optional, Varies | ICMJE page: not addressed. CARE: 2 to 5 or 4 to 7 depending on version. ACM: CCS concepts and keywords **required** (acmart.dtx). | Free list plus optional CCS block for the conference template. |
| Trial registration number | Required for trials | ICMJE: publish "at the end of the abstract". | Conditional field, shown when the wizard says "randomised trial". |
| Word count | Optional | ICMJE: on the title page, excluding abstract, acknowledgments, tables, legends, references. | Compute, never type. |
| Running head and page numbers | Varies | APA professional: running head left, page number right, on every page including the title page; no "Running head:" label; student papers: page number only (APA pages above, Verified, snippet). ACM: `printfolios` controls page numbers. | Header/footer settings in section 2.4. |
| Funding | Varies; required by most journals as a statement | ICMJE: separate statement after the abstract, direct support only. Springer Nature: statements go in a "Declarations" section before the references, with sample "No funding was received" wording (Verified, snippet: https://www.springernature.com/gp/policies/editorial-policies, https://link.springer.com/brands/springer/journal-policies). PRISMA item 25: sources and funder role. | Free text plus "no funding" checkbox. |
| Competing interests | **Required**, wording Varies | ICMJE: disclosure "needs to be part of the manuscript"; each journal sets format. Springer Nature: report interests within three years of beginning the work, older ones if they could be perceived as influencing it (snippet, same pages). PRISMA item 26. | Free text plus "none declared" checkbox. |
| Data availability | Required for most primary research | Nature Portfolio: original research must include a data availability statement; Nature Communications wants Data and Code availability in separate sections (snippet: https://www.nature.com/nature-portfolio/editorial-policies/reporting-standards). ICMJE: cite persistent identifiers. PRISMA item 27. | Free text plus repository and identifier fields. |
| Ethics / consent | Required for human or animal research | ICMJE: Methods state that an independent review body approved it. Springer Nature: name the committee and confirm Declaration of Helsinki adherence; separate "Consent to participate" and "Consent to publish" headings (snippet). CARE: informed consent is an item. | Fields: committee name, approval number, consent yes/no. Shown only if the wizard says human subjects. |
| Author contributions | Optional, Varies | Springer Nature encourages a statement per author (snippet). CRediT is the structured way. | Generate text from CRediT roles. |
| Acknowledgements | Optional | ICMJE: outside the word count. In anonymous ACM review it must be omitted (acmart.dtx). | Hide automatically in "anonymous" mode. |
| AI-use disclosure | Required by many publishers | See `paper-preview.md` section 3.5 (ICMJE, Nature, Elsevier). | Generate from the AI log. |
| References | **Required** | ICMJE: numbered by first mention, MEDLINE journal abbreviations, no retracted articles unless noting the retraction, AI-generated material not a primary source. | Section 3 and 4. |
| Tables and figures | Optional | ICMJE: numbered by first citation, legends not on the images, permission for previously published figures. APA allows tables and figures in the text or at the end (`paper-preview.md` section 1.1). | Auto-number; caption and source clip required. |
| Appendices / supplementary | Optional | `paper-preview.md` section 1.2 row 20. | Section group after references. |

### 2.3 What the author-note and declarations pattern means for the model

APA's professional author note has four suggested paragraphs: ORCID iDs, changes of affiliation, study details (registration, data sharing, conflicts, funding) and the corresponding author's contact (Verified, snippet via search, https://apastyle.apa.org/style-grammar-guidelines/paper-format/title-page and https://apastyle.apa.org/blog/author-note). Springer Nature puts similar statements under "Declarations". The same facts appear in different places under different names. So store each fact **once** as a field, and let the template decide where and under which heading it prints.

### 2.4 Header and footer model

Store header and footer as three zones each (left, centre, right) holding text with tokens: `{page}`, `{pages}`, `{shortTitle}`, `{authors}`, `{date}`, `{section}`. Defaults per template: APA professional = left `{shortTitle}` in capitals, right `{page}`; IEEE and ACM = no running head on the first page, page numbers per conference. A "different first page" flag is common in word processors; I have no primary source for it here (UNVERIFIED), but the APA rule above (running head also on page 1) shows the setting is per style.

For printing, Chrome 131 and later supports CSS margin boxes (`@top-center`, `@bottom-right` and the other 14) with `counter(page)` and `counter(pages)`. Running elements are not supported (https://developer.chrome.com/blog/print-margins, Verified, fetched). Use margin boxes for the print and PDF path, and draw the header and footer yourself on the on-screen page sheets.

---

## 3. Citation styles: exact rules, worked examples, tooling

### 3.1 Conclusion

All formatting rules below come from the CSL style files in the CSL repository (https://github.com/citation-style-language/styles), which encode each manual. They are CC BY-SA 3.0 and need an attribution line. The manuals themselves (APA, MLA, Chicago) are paywalled and unread: **every rule here is Verified (CSL file) but UNVERIFIED against the manual**. Examples use an invented source.

### 3.2 Edition check

| Style | CSL file title | Notes |
|---|---|---|
| APA | "APA Style 7th edition", updated 2026-02-07 | Verified, fetched (`apa.csl`) |
| MLA | "MLA Handbook 9th edition (in-text citations)", updated 2026-02-03 | Verified, fetched (`modern-language-association.csl`) |
| Chicago author-date | "Chicago Manual of Style **18th** edition (author-date)" | Verified, fetched (`chicago-author-date.csl`) |
| Chicago notes-bibliography | "Chicago Manual of Style **18th** edition (notes and bibliography)" | Verified, fetched (`chicago-notes-bibliography.csl`) |
| Vancouver / NLM | "Citing Medicine 2nd edition (citation-sequence)", cites ICMJE | Verified, fetched (`nlm-citation-sequence.csl`) |
| IEEE | `ieee.csl`, "IEEE Reference Guide version 11.29.2023" (from `inText.ts` comment and `paper-preview.md`) | Verified, fetched |
| Harvard | A family of 115 CSL styles; Cite Them Right is the repo's choice | `paper-preview.md` section 4.1 |

The owner asked for Chicago 17. The CSL master file carries 18. Whether the 17th differs in ways that matter to a researcher is UNVERIFIED; I could not read either manual. Offer "Chicago (current)" and note the edition on the style card.

### 3.3 Rules per style (from the CSL files)

| Style | In-text | Et al. in text | Et al. in list | List order |
|---|---|---|---|---|
| APA 7 | (Smith & Jones, 2020, p. 5); `&` between two authors; multiple sources joined with `;` | 3 or more authors: first author plus "et al." | More than 20 authors: first 19, ellipsis, last author | Alphabetical by author, then date; hanging indent; double spaced |
| MLA 9 | (Smith and Jones 14); author and locator, no year | 3 or more authors: first plus "et al." | 3 or more: first author plus "et al." | Works Cited, alphabetical, ends each entry with a period |
| Chicago author-date | (Smith and Jones 2020, 14): author, year, then page | UNVERIFIED (not visible in the truncated CSL read) | UNVERIFIED | Alphabetical |
| Chicago notes-bibliography | Superscript note number; full note first time, shortened note later; bibliography entry differs from a note only in punctuation, capitalisation and name order | UNVERIFIED | UNVERIFIED | Notes in order; bibliography alphabetical |
| IEEE | `[1]`, `[1, p. 5]`, `[1], [2], [3]` (no range collapse in the CSL file) | n/a | 7 or more authors: first author plus italic "et al." | Order of first citation |
| Vancouver (NLM CSL) | `(1)` or `(1,3)`; the CSL sets `collapse` so consecutive numbers become ranges | n/a | 7 or more authors: first 6 plus "et al."; names as `Smith AB` (no periods) | Order of first citation |
| Harvard (Cite Them Right) | (Smith and Jones, 2020, p. 14) | 4 or more authors (`paper-preview.md` 4.3) | See `paper-preview.md` | Alphabetical |

Note the Vancouver in-text difference. ICMJE says "Arabic numerals in parentheses" (Verified, fetched, ICMJE page), which matches the NLM CSL. Many journals use square brackets or superscripts. The shipped option should let the user pick bracket, parenthesis or superscript for numeric styles. That choice is journal-specific (Varies).

### 3.4 Worked examples

The invented source: article by Anna Lee, Raj Patel and Chidi Okafor, 2021, "Short sleep in shift nurses", *Example Journal of Nursing* 12(3), pages 10 to 20, DOI `10.0000/example`. Book: Carla Moreno, 2020, *Night Work and Health*, Example Press, City. Web page: Sleep Foundation Example, 4 March 2023, "Shift work and sleep", site *Example Health Portal*. Report: Example Institute, 2022, "Nurse fatigue survey", Report no. 14.

Entries follow the field order the CSL files return (Verified, fetched); punctuation and italics are my reading of that order and are UNVERIFIED against the manuals. Italics are shown with asterisks.

**Journal article**

| Style | In-text | Reference |
|---|---|---|
| APA 7 | (Lee et al., 2021, p. 14) | Lee, A., Patel, R., & Okafor, C. (2021). Short sleep in shift nurses. *Example Journal of Nursing, 12*(3), 10–20. https://doi.org/10.0000/example |
| MLA 9 | (Lee et al. 14) | Lee, Anna, et al. "Short Sleep in Shift Nurses." *Example Journal of Nursing*, vol. 12, no. 3, 2021, pp. 10–20. |
| Chicago A-D | (Lee, Patel, and Okafor 2021, 14) | Lee, Anna, Raj Patel, and Chidi Okafor. 2021. "Short Sleep in Shift Nurses." *Example Journal of Nursing* 12 (3): 10–20. |
| Chicago NB note | 1. Anna Lee, Raj Patel, and Chidi Okafor, "Short Sleep in Shift Nurses," *Example Journal of Nursing* 12, no. 3 (2021): 14. | Bibliography: Lee, Anna, Raj Patel, and Chidi Okafor. "Short Sleep in Shift Nurses." *Example Journal of Nursing* 12, no. 3 (2021): 10–20. Short note later: Lee, Patel, and Okafor, "Short Sleep," 15. |
| IEEE | [1, p. 14] | [1] A. Lee, R. Patel, and C. Okafor, "Short sleep in shift nurses," *Example J. Nurs.*, vol. 12, no. 3, pp. 10–20, 2021, doi: 10.0000/example. |
| Vancouver | (1) | 1. Lee A, Patel R, Okafor C. Short sleep in shift nurses. Example J Nurs. 2021;12(3):10-20. doi:10.0000/example |
| Harvard | (Lee, Patel and Okafor, 2021, p. 14) | Lee, A., Patel, R. and Okafor, C. (2021) 'Short sleep in shift nurses', *Example Journal of Nursing*, 12(3), pp. 10–20. |

**Book**

| Style | Reference |
|---|---|
| APA 7 | Moreno, C. (2020). *Night work and health*. Example Press. |
| MLA 9 | Moreno, Carla. *Night Work and Health*. Example Press, 2020. |
| Chicago A-D | Moreno, Carla. 2020. *Night Work and Health*. City: Example Press. |
| IEEE | [2] C. Moreno, *Night Work and Health*. City, Country: Example Press, 2020. |
| Vancouver | 2. Moreno C. Night work and health. City: Example Press; 2020. |
| Harvard | Moreno, C. (2020) *Night work and health*. City: Example Press. |

**Web page**

| Style | Reference |
|---|---|
| APA 7 | Sleep Foundation Example. (2023, March 4). *Shift work and sleep*. Example Health Portal. https://example.org/shift-work |
| MLA 9 | "Shift Work and Sleep." *Example Health Portal*, Sleep Foundation Example, 4 Mar. 2023, example.org/shift-work. Accessed 1 Oct. 2026. |
| IEEE | [3] Sleep Foundation Example, "Shift work and sleep," Example Health Portal. Accessed: Oct. 1, 2026. [Online]. Available: https://example.org/shift-work |
| Vancouver | 3. Sleep Foundation Example. Example Health Portal [Internet]. 2023 Mar 4 [cited 2026 Oct 1]. Shift work and sleep. Available from: https://example.org/shift-work |
| Harvard | Sleep Foundation Example (2023) *Shift work and sleep*. Available at: https://example.org/shift-work (Accessed: 1 October 2026). |

(Chicago web-page entries omitted: the CSL read was truncated before the publication details macro.)

**Report**

| Style | Reference |
|---|---|
| APA 7 | Example Institute. (2022). *Nurse fatigue survey* (Report No. 14). Example Institute. |
| MLA 9 | Example Institute. *Nurse Fatigue Survey*. Report no. 14, Example Institute, 2022. |
| IEEE | [4] Example Institute, "Nurse fatigue survey," Example Institute, City, Rep. 14, 2022. |
| Vancouver | 4. Example Institute. Nurse fatigue survey. City: Example Institute; 2022 Mar. Report No.: 14. |
| Harvard | Example Institute (2022) *Nurse fatigue survey*. Report 14. City: Example Institute. |

A real implementation must test each pattern against output from a CSL processor, because the table above is a reading, not a conformance run.

### 3.5 What the repo covers and what is missing

| Need | Today | Gap |
|---|---|---|
| Reference-list formatters | APA, AMA, Vancouver, Harvard, IEEE (`apa.ts`, `ama.ts`, `vancouver.ts`, `harvard.ts`, `ieee.ts`) | MLA 9; Chicago author-date; Chicago notes-bibliography |
| In-text rendering (`inText.ts`) | Harvard and IEEE only | APA in-text, Vancouver in-text, MLA, Chicago; footnote output for Chicago notes |
| Source types | `journal_article`, `preprint`, `web_page`, `report`, `dataset`, `book_chapter`, `unknown` | A plain **`book`** type (a whole book is common); `conference_paper`, `thesis`. Without them the user can not cite their own textbook or a proceedings paper in the conference template. |
| Missing data | `[incomplete: name]` markers; never guessed | Keep. Surface the markers in the citations page as "needs attention". |
| Disambiguation | a/b year suffixes (`paper-preview.md` 4.3) | Check for APA and Chicago; MLA uses short titles instead (MLA CSL) |
| Locators | `page` only | `chapter`, `section`, `figure`, `paragraph` (IEEE and MLA CSL files show labelled locators) |

### 3.6 CSL, citeproc-js and citation-js

- **CSL** is an XML language for citation styles. The CSL site lists over 8,500 styles under CC BY-SA, and names citeproc-js as the popular processor (Verified, fetched: https://citationstyles.org/authors/). The repo count of independent styles was 2,863 on 2026-10-20 (`paper-preview.md`).
- **citeproc-js** (npm `citeproc` 2.4.63): licence `CPAL-1.0 OR AGPL-1.0` per the npm registry (Verified, fetched: https://registry.npmjs.org/citeproc/latest). The LICENSE file says "either the Common Public Attribution License (version 1 or later) or the GNU Affero General Public License (version 3 or later)" (Verified, fetched: https://raw.githubusercontent.com/Juris-M/citeproc-js/master/LICENSE). Size: the published package ships one file, `citeproc_commonjs.js`, **967,493 bytes raw and 191,276 bytes gzipped, not minified** (Verified, measured from `npm pack citeproc@2.4.63`). A minified figure is not available from a primary source: the Bundlephobia page returned no number (UNVERIFIED). It also needs style and locale XML files at run time.
- **citation-js** (`@citation-js/core` 0.9.0, `@citation-js/plugin-csl` 0.9.0): MIT, but `@citation-js/plugin-csl` depends on `citeproc` (Verified, fetched: npm registry). `@citation-js/core` itself is 160 KB unpacked. The licence of the CSL path is therefore still CPAL or AGPL.
- **citeproc-rs** (Rust, WASM shell): the repository is marked archived by the owner on 2026-08-13 and says it is a work in progress where "not all of the tests pass" (Verified, fetched: https://github.com/zotero/citeproc-rs). Do not build on it.
- **Recommendation.** For v1, keep hand-written formatters (they already cover five styles) and add MLA and Chicago behind the existing `renderCitations(style, groups)` interface. Add a CSL-JSON converter so a processor can be swapped in later. Decide on citeproc-js only after a licence review (the obligations are not verified here; this is not legal advice). The cost of staying hand-written is that "pick any of 8,500 styles" is not available. State that limit in the style picker.

---

## 4. Editor patterns

### 4.1 Conclusion

Use **TipTap**. It gives ProseMirror's schema-driven document, React bindings that list React 19, and MIT packages for the pieces we need. Lexical is the closest alternative but has less out-of-the-box for tables and drag handles in this comparison. Slate is the weakest fit on maintenance signals I could verify. Raw ProseMirror is the fallback if TipTap's licence or price model changes.

### 4.2 Comparison

| | TipTap | Lexical | Slate | ProseMirror direct |
|---|---|---|---|---|
| Version, licence (npm registry, Verified, fetched) | `@tiptap/core` 3.32.0, MIT | `lexical` 0.52.0, MIT | `slate` 0.146.0, MIT | `prosemirror-view` 1.42.7, MIT |
| React peer range | `@tiptap/react` 3.32.0: `^17 \|\| ^18 \|\| ^19` | `@lexical/react` 0.52.0: `>=18.x` | `slate-react` 0.147.3: `>=18.2.0` | none (framework-free) |
| Next 15 note | Official Next.js guide: use `'use client'` and `immediatelyRender: false` to avoid server rendering and hydration mismatches (Verified, fetched: https://tiptap.dev/docs/editor/getting-started/install/nextjs.md). The guide names no React version. | Not checked. UNVERIFIED | Not checked. UNVERIFIED | Not checked. |
| Maturity signals | Pre-built extensions; v3 line | Version 0.x. The README lists tables, lists, code blocks, images, custom nodes, JSON/Markdown/HTML import and export, Yjs collaboration and React bindings, and does not state a 1.0 status (Verified, fetched: README). | Version 0.x; the README fetch returned 404, so no status statement (UNVERIFIED) | Stable. The GitHub mirrors are archived; source moved to https://code.haverbeke.berlin/prosemirror/ (`paper-preview.md` 4.4, Verified there) |
| Custom block node | `Node.create` with `group`, `content`, `atom`, `draggable`, `parseHTML`, `renderHTML` (Verified, fetched: https://tiptap.dev/docs/editor/core-concepts/schema). React node views exist; page did not cover `ReactNodeViewRenderer` (UNVERIFIED here). | `DecoratorNode` (per `paper-preview.md`) | Custom element renderers | Node views: "miniature UI components for individual nodes" (Verified, fetched: https://prosemirror.net/docs/guide/) |
| Tables | `@tiptap/extension-table` 3.32.0, MIT (registry) | Built in per README | Plugin work | `prosemirror-tables`, a dependency of `@tiptap/pm` (registry) |
| Equations | `@tiptap/extension-mathematics` 3.32.0, MIT, uses KaTeX (registry; tiptap docs say "It uses KaTeX to render math formulas written in LaTeX") | Custom node | Custom | Custom node |
| Drag handle for reordering | `@tiptap/extension-drag-handle` 3.32.0, MIT (registry), plus `-react` 3.32.0 | Custom | Custom | Custom |
| File drop and paste | `@tiptap/extension-file-handler` 3.32.0, MIT: `onDrop` and `onPaste` callbacks, no upload (Verified, fetched) | `DROP_COMMAND` etc. (page did not list them; UNVERIFIED) | Custom | `handleDrop`, `handlePaste` |

### 4.3 What TipTap charges for

The TipTap pricing page says: "The Tiptap Editor is open source (MIT) and free." Only "platform features and cloud documents are priced" (Verified, fetched: https://tiptap.dev/pricing). On that page: real-time collaboration, comments, in-line AI, and DOCX/Markdown import and PDF/DOCX/ODT/EPUB export are listed in every plan; **page-based layouts are Team and above**; tracked changes is a custom-priced add-on. The registry shows MIT for every extension I need (table 4.2). The pricing page does not say which individual open-source extensions are free, so the registry licence field is the better evidence. The extension overview and individual extension pages did not state licence or price. Re-check before depending on any other extension.

**Consequence.** Page-like layout (TipTap Pages) and DOCX export are the paid items that match the owner's requests. Both can be built without TipTap Cloud, at the cost of our own work (sections 4.6 and 8).

### 4.4 Drag and drop of outside items into the document

There are two separate jobs.

1. **Dragging a clip, image or citation from the sidebar into the editor.** This is an HTML5 drag from a normal DOM element to the editor. The WHATWG rules (Verified, fetched: https://html.spec.whatwg.org/multipage/dnd.html): data is added with `dataTransfer.setData` only during `dragstart`; during `dragover` the data is "protected" (types readable, data not); a drop is allowed only if `dragover` is cancelled with `preventDefault()`; data is readable again during `drop`. So the sidebar item sets a custom MIME type such as `application/x-researchie-clip` with the clip id, and the editor's drop handler reads the id on `drop`.
2. **Handling that drop inside the editor.** ProseMirror's `handleDrop(view, event, slice, moved)` is called on drop; `moved` is true when content is being moved from the current selection (Verified, fetched: https://prosemirror.net/docs/ref/). `EditorView.dragging` is non-null only while editor content is dragged. In `handleDrop`, check `event.dataTransfer.types` for our MIME type, find the drop position with `view.posAtCoords({left, top})`, insert a node (quote block, citation, figure) and return `true`.

**dnd-kit versus native HTML5 drag.** dnd-kit offers sortable lists with mouse, touch and keyboard sensors, and says it is built for accessibility (Verified, fetched: https://dndkit.com/). It publishes `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0 and a newer `@dnd-kit/react` 0.5.1, all MIT (registry, Verified). The dnd-kit home page did not say it supports dragging into a ProseMirror document; dnd-kit works with its own drop zones, not with ProseMirror's coordinates. Recommended split: **dnd-kit for the content sidebar and the section outline** (keyboard-accessible reordering of lists we own), **native HTML5 drag plus `handleDrop` for dropping into the document**. Do not wire dnd-kit droppables to individual paragraphs: ProseMirror positions are not DOM nodes. That second point is my design judgement, not a measured result.

A keyboard path matters: every drop target should also be reachable by an "Insert at cursor" button on each sidebar item.

### 4.5 Section and node reordering

- Make each section a schema node: `section` with `content: 'heading block*'`, attributes `{ key, locked, required }`. A section the template requires can be moved but not deleted.
- Use `@tiptap/extension-drag-handle` (MIT) for block-level moves. Its docs say it "allows you to easily handle dragging nodes around in the editor" and expose `onElementDragStart` and `onElementDragEnd` (Verified, fetched). Custom nodes are not draggable unless `draggable: true` (Verified, fetched, TipTap schema page).
- Also provide an outline panel (sidebar list of sections with up and down buttons, plus dnd-kit sortable). Moving a section there moves the matching node by `tr.delete` and `tr.insert`. This gives accessible reordering and a Word-style navigation pane.
- Changing the template must not delete text: move sections the new template lacks into an "Unplaced" bin (`paper-preview.md` 2.3).

### 4.6 The page-like preview and headers/footers

| Approach | Licence / cost | Use |
|---|---|---|
| **CSS page sheet** (a centred white sheet at page width with margins, a dashed line at each page height) | none | Live "how it will look" while writing. Cheap, not true pagination. |
| **paged.js** | MIT; `pagedjs` 0.4.3 npm; `dist/paged.min.js` **502,617 bytes, 96,661 gzipped** (Verified, measured) | True page breaks, margin boxes and page counters on a read-only copy. Repaginating the whole paper per keystroke is heavy (`paper-preview.md` 5.3), so run on demand or debounced. |
| **Native `@page` margin boxes** | Browser, Chrome 131+ | Print and PDF path. Running elements not supported (https://developer.chrome.com/blog/print-margins, Verified, fetched). |
| **TipTap Pages** | Paid (Team plan and above, pricing page) | Skip for v1. |
| `@react-pdf/renderer` (already installed) | MIT | Existing PDF export path; no CSS paged media (`paper-preview.md` 5.3). |

The pagedjs documentation page returned 404, so I could not verify its current feature list or maintenance state from the owner. `paper-preview.md` 5.3 already records "maintenance pace UNVERIFIED".

**Recommended split:** edit in a single scrolling sheet that looks like a page (fonts, margins, column count and header/footer drawn from the template). A "Show as pages" button runs paged.js on a clone. Print and PDF use `@page` margin boxes.

### 4.7 Tables and equations

Tables: `@tiptap/extension-table` on `prosemirror-tables`. Equations: `@tiptap/extension-mathematics` with KaTeX 0.16 (already in the repo). Number figures, tables and equations in a render pass, not as typed text (`paper-preview.md` 5.2). The existing `tableParse.ts` can feed pasted tab-separated text into table nodes.

### 4.8 Maintenance status

| Library | Evidence | Verdict |
|---|---|---|
| TipTap | Registry shows 3.32.0, every extension on the same version | Active; commercial owner |
| ProseMirror | Version 1.42.7; repository moved (source: `paper-preview.md`) | Stable, maintained by one author; watch the move |
| Lexical | 0.52.0; README copyright 2026 Meta | Active; still 0.x |
| Slate | 0.146.0 and `slate-react` 0.147.3 | Active on npm; README unreadable, status UNVERIFIED |

I did not read commit histories or issue trackers. "Active" here means "recent registry versions", nothing more.

---

## 5. Paste handling

### 5.1 Conclusion

Run every paste through one pipeline: pick the best clipboard format, normalise vendor markup, sanitise, map to the schema, repair PDF text. Keep the original in the undo history and always offer "paste as plain text". Do not rely on one library to understand Word.

### 5.2 What the browser gives you

- W3C Clipboard API (Verified, fetched: https://www.w3.org/TR/clipboard-apis/): paste events must expose `text/plain`, `text/html` and `image/png` when a native equivalent exists on the clipboard. `text/uri-list`, `image/svg+xml` and `"web "`-prefixed custom formats are optional ("MAY"). `image/png` must not be sanitised. Other types, including `text/html`, "may" be sanitised by the browser. `read()` accepts an `unsanitized` option for `text/html` only, and the user agent may refuse it.
- **`text/rtf` is not in the mandatory list.** The spec read lists no RTF type. Do not plan around it. (I read the first 100,000 of 172,861 characters; the unread rest could mention other types. UNVERIFIED for the tail.)
- `clipboardData` is a `DataTransfer`, read with `getData(format)` (MDN, Verified, fetched: https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData). `clipboardData.files` holds pasted image files. MDN's page did not cover `types` or `files`; the API shape is from the `DataTransfer` spec (WHATWG DnD page above lists both `types` and `files`).
- Which formats a given app puts on the clipboard is not in the W3C spec. It is each app's choice.

### 5.3 What Word, Google Docs and PDF viewers put in `text/html`

| Source | What I could verify | Status |
|---|---|---|
| Windows clipboard HTML in general | Microsoft documents "HTML Format" (CF_HTML): a header with byte offsets `StartFragment` and `EndFragment`, with the fragment wrapped in `<!--StartFragment-->` and `<!--EndFragment-->` comments (Verified, snippet: https://learn.microsoft.com/windows/win32/dataxchg/html-clipboard-format). A third-party library notes that Teams and Edge point the offsets inside the comments, so the spec wording is ambiguous. | Verified (snippet) |
| MS Word | Class `MsoNormal`, `mso-*` CSS properties and conditional comments (`<!--[if gte mso 9]>`) are real Word HTML patterns, but I found **no Microsoft specification** for them. Search results were email-developer guides, a validator site and a forum post. | **UNVERIFIED** against Microsoft. Treat as observed behaviour; collect real samples. |
| Google Docs | The `docs-internal-guid-*` wrapper `<b>` element and `<span style="font-weight:700">` bold are observed behaviour; no primary source found. | **UNVERIFIED** |
| PDF viewers | Usually only `text/plain`. Whether any viewer also sets `text/html` is not documented anywhere I found. | **UNVERIFIED** |
| ProseMirror | Its paste code has **no special handling** for `docs-internal-guid`, `mso` markup or `StartFragment` comments (Verified, fetched source: https://raw.githubusercontent.com/ProseMirror/prosemirror-view/master/src/clipboard.ts). It strips only leading `<meta>` tags. | Verified |

Practical consequence: build a test corpus. Copy a heading, a list, a table, a footnote and an image from Word, Google Docs, Chrome, Firefox, a PDF viewer and Notion, and save each `text/html` and `text/plain` as fixtures. Write the cleaner against those fixtures.

### 5.4 ProseMirror and TipTap paste hooks

From the ProseMirror reference (Verified, fetched: https://prosemirror.net/docs/ref/) and the `clipboard.ts` source:

| Hook | Input | Use |
|---|---|---|
| `transformPastedHTML(html, view)` | HTML string, before parsing | Strip Word and Docs wrappers, sanitise |
| `transformPastedText(text, plain, view)` | Plain text | PDF text repair |
| `clipboardParser` | A `DOMParser` | Custom schema parse rules for pasted HTML |
| `clipboardTextParser(text, $context, plain, view)` | Text to a `Slice` | Custom plain-text handling (default: split on newlines, one `<p>` per line) |
| `transformPasted(slice, view, plain)` | Parsed slice | Final repair; also runs for drag and drop |
| `handlePaste(view, event, slice)` | Raw event | Take over completely (images, clip matching); return `true` |

The default flow (source): use plain text if the caller asked for it, the cursor is in a code block, or no HTML exists; otherwise `transformPastedHTML`, then parse with the schema. For HTML that did not come from ProseMirror, `normalizeSiblings` places top-level siblings in a compatible ancestor. The schema-driven parse is the key safety property: ProseMirror's guide says the document "only contains elements you explicitly allow" (Verified, fetched). Anything the schema has no rule for is dropped or reduced to text.

TipTap wraps these: paste rules run on pasted text and a TipTap extension can add ProseMirror plugins with `handlePaste`. I did not fetch the TipTap paste-rule docs (UNVERIFIED for exact API).

### 5.5 Sanitising

- **DOMPurify** 3.4.17, licence `(MPL-2.0 OR Apache-2.0)` (Verified, fetched: npm registry). Described by the maintainers as "a DOM-only, super-fast, uber-tolerant XSS sanitizer for HTML, MathML and SVG". Options relevant here (README, Verified, fetched: https://raw.githubusercontent.com/cure53/DOMPurify/main/README.md): `ALLOWED_TAGS`, `ALLOWED_ATTR`, `FORBID_TAGS`, `USE_PROFILES: { html: true }` (drops SVG and MathML; do not combine with `ALLOWED_TAGS`), `KEEP_CONTENT` (default true), `SANITIZE_NAMED_PROPS`, `RETURN_DOM_FRAGMENT`, and hooks. README warning: sanitising and then modifying the output, or passing it to a library that changes the markup, can undo the sanitisation. So sanitise last, right before the schema parse.
- The repo already uses `sanitize-html` 2.18 (MIT) on the server for clipped blocks (`src/lib/security/sanitizeBlockHtml.ts`). For paste, which runs in the browser, DOMPurify is the better fit. Server-side, keep `sanitize-html` for anything saved as HTML.
- **Proposed allow-list for pasted text:** `p, br, h1–h6, strong, b, em, i, u, sub, sup, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, a, img, figure, figcaption, code, pre`. Allowed attributes: `href` (http, https, mailto only), `src`, `alt`, `colspan`, `rowspan`. **No `style`, no `class`, no `id`.** Formatting that matters (bold, italic, super/subscript) is recovered from style attributes in the normalise step before sanitising.

### 5.6 Pasted images

- A paste can contain an `image/png` file in `clipboardData.files`. W3C: `image/png` is mandatory on paste and is not sanitised.
- HTML pasted from other apps may contain `<img src="data:...">`, `blob:` or `file:` URLs, or remote URLs. I have no primary source for which app does which: UNVERIFIED. Handle all of them.
- Do not keep base64 in the document JSON. Convert to a `Blob`, upload to the app's storage, store the file id and an `alt` text. The 256 KB settings cap and the 60 KB outline cap in `store.ts` show why inline images would break storage.
- `@tiptap/extension-file-handler` (MIT) gives `onPaste` and `onDrop` for files and leaves upload to us (Verified, fetched).
- Require alt text before export; ICMJE requires permission for previously published figures (Verified, fetched), so ask for source and licence.

### 5.7 Text pasted from PDFs

Standard problems and fixes. I found no standards body that documents them, so this is practitioner knowledge, UNVERIFIED as a primary rule. The Unicode fact is verified.

| Problem | Fix |
|---|---|
| Hard line break at every visual line | Join lines inside a paragraph: replace a single newline between two lines with a space; keep blank lines as paragraph breaks. Keep newlines before list markers, numbered headings and lines that end in `.` followed by a capital after a short line. |
| Hyphenation at line end (`inter-` newline `national`) | Join when a lowercase letter follows a hyphen at line end: `/(\p{L})-\n(\p{Ll})/gu` to `$1$2`. Keep the hyphen when the next word starts with a capital or a digit, or when the compound is genuinely hyphenated (can not be told from text alone; offer an undo). |
| Soft hyphen U+00AD | Delete it. |
| Ligatures (ﬁ, ﬂ, ﬃ) | NFKC maps them to their letters: "The 'fi' ligature changes into its components 'f' and 'i'" in NFKC and NFKD, and U+FB03 decomposes in NFKC (Verified, fetched: https://www.unicode.org/reports/tr15/). **Do not apply NFKC to the whole text:** it also changes `²`, `½`, `™` and similar. Replace only the ligature code points U+FB00 to U+FB06 (the range is my knowledge; the Unicode page above verifies only the fi and ffi examples). |
| Two-column text interleaved | Cannot be repaired from plain text. Warn when the average line length is under about 40 characters and offer the PDF reader's "copy as clip" instead. |
| Reference markers `[12]`, superscript digits | The repo's `cleanPaste` in `pasteMatch.ts` already removes `[n]`, `[n, m]`, `[n-m]` and superscript digits. Apply it only on request: in a general paste it would also delete real bracketed numbers. |
| Headers, footers, page numbers repeated mid-text | Detect lines that repeat across pasted pages and offer to remove. UNVERIFIED approach. |
| Equations as garbled glyphs | Not repairable (`paper-preview.md` 5.4). Show a note and offer image paste. |

### 5.8 Recommended pipeline

1. **Choose the format** in `handlePaste`: files present → image path (5.6). Else `text/html` present and not "paste as plain text" → HTML path. Else `text/plain` → text path.
2. **HTML path:** (a) cut to the content between `<!--StartFragment-->` and `<!--EndFragment-->` if present; (b) drop `<head>`, `<style>`, `<meta>`, `<xml>`, `<o:p>` and conditional comments; (c) unwrap the Google Docs wrapper `<b id="docs-internal-guid-…">` (UNVERIFIED pattern, test with fixtures); (d) turn `font-weight:700|bold`, `font-style:italic`, `text-decoration:underline`, `vertical-align:super|sub` on spans into `<strong>`, `<em>`, `<u>`, `<sup>`, `<sub>`; (e) turn Word list paragraphs (`mso-list` styles, UNVERIFIED) into `<ul>`/`<ol>`; (f) **DOMPurify** with the allow-list in 5.5; (g) let the schema parse; (h) `transformPasted`: cap heading levels to the template's levels, drop empty paragraphs, collapse repeated spaces.
3. **Text path:** `transformPastedText` with the PDF repairs in 5.7, then paragraphs.
4. **Provenance.** If the pasted text matches a project clip (reuse `matchPaste` in `pasteMatch.ts`), offer "Cite this clip" and mark the span as a quotation. The existing long-quote warning applies.
5. **Feedback.** After any paste that changed content, show a small bar: "Formatting cleaned. Undo, or paste as plain text." Keep undo as one step.
6. **Tests.** Fixture-driven: each fixture file from 5.3 and its expected document JSON.

---

## 6. Initial wizard: ask versus infer

### 6.1 Conclusion

Keep the wizard to **one screen of five required choices**, with an "Advanced" fold for the rest. Everything else is editable later in a front-matter panel, because most of it (authors, funding, ethics) is not known at the start. The user wants a short wizard; the evidence supports short because most fields vary by journal.

### 6.2 Table

| Question | Ask? | Default / inference | Evidence |
|---|---|---|---|
| Paper name (working title) | **Required** | Template name plus date if blank | ICMJE: title required. A file-list entry needs a name. |
| Template | Already chosen in the picker | n/a | Section 1 |
| Data source: project, and which sub-projects | **Required** for non-blank | Last opened project; include sub-projects by default (CLAUDE.md: selection persists across sub-projects) | Owner request |
| Citation style | **Required**, one dropdown | Template default (IEEE for conference, Vancouver for case report and IMRaD medicine, APA otherwise); user can change any time | Styles differ by venue (section 3) |
| Target venue or journal, and word limit | Optional | None; free text for venue, number for limit | Limits vary per journal (Elsevier short-communication examples); no reliable journal database was verified |
| Paper type details that switch sections on | Optional (show only if relevant) | See below | |
| Language | Optional, fold | Browser language | Affects spell check, quotation marks, locale terms in CSL ("and" versus "&", dates). CSL has locale files (Verified, fetched: citationstyles.org). |
| Page size and columns | Inferred from template; fold to override | US letter for IEEE conference, A4 otherwise (IEEE says letter unless the conference says A4; Verified, snippet) | Section 1.4 |
| Authors and affiliations | **Not in wizard** | Prefill the account owner as first author | The author list changes during writing; ORCID and CRediT are per-author data |
| ORCID, funding, competing interests | **Not in wizard** | Empty | Front-matter panel |
| Ethics / IRB, consent | One yes/no: "Does this involve people or animals?" | If yes, add the ethics and consent fields to Methods and end matter | ICMJE ethics statement; Springer consent headings (snippet) |
| Reporting guideline | One dropdown, only for IMRaD and review | Review → PRISMA 2020; trial → CONSORT; observational → STROBE; qualitative → COREQ/SRQR | EQUATOR index (`paper-preview.md` 2.1) |
| Structured abstract? | Inferred | Template default; toggle in the editor | ICMJE requires structured for original research and reviews |
| Figure and table numbering style | Inferred | "Figure 1", "Table 1" in order of appearance; fold has "Fig. 1" and roman numerals for IEEE-style | ICMJE: numbered by first citation; IEEE and APA conventions are UNVERIFIED here |
| Review type (PRISMA, narrative) | Ask only in the review template | Systematic (PRISMA) | Section 1.3 |
| Preregistration or trial registration number | Optional, appears if "trial" chosen | Empty | ICMJE: at end of abstract |
| Blind review (anonymous) | Fold: "Hide author names for review" | Off | acmart `anonymous` option (Verified, fetched) |
| Line numbers for reviewers | Fold | Off | acmart `review` option (Verified, fetched) |
| AI help allowed in this paper | Optional | Off | `paper-preview.md` 3.5 |

### 6.3 Things the wizard should not do

- Do not ask for journal choice from a list unless the list is real. I verified no journal database, and journal rules change.
- Do not ask for authors, funding or ORCID up front. A paper with a half-filled author box is a blocker to starting.
- Do not require the data source to have clips. A project with no clips is allowed; show an empty sidebar with "Add clips".

---

## 7. File-explorer home patterns

### 7.1 Conclusion

Use a **list view by default**, with a grid of cards as a toggle, a single search box, sort by "last edited", inline rename, duplicate, and trash with restore. Organise with **tags and the project grouping the data already has**, not nested folders. This matches how the first-party docs describe Overleaf and Notion, and avoids the two-place filing problem Zotero solves with multi-collection membership.

### 7.2 Evidence by product

| Product | What the first-party docs say | Source |
|---|---|---|
| **Google Docs** | Rename happens inside the open file by clicking the title. "Make a copy" is in the File menu inside the file. "Remove" is on the home screen's More menu and moves the file to the Drive trash; for a shared file you own, removal affects all collaborators, so transfer ownership first. Grid versus list and sorting: **not found** in the pages I reached. | https://support.google.com/docs/answer/49114, https://support.google.com/docs/answer/6023494 (Verified, snippet via search; the answer/49008 page I fetched had no file-management text) |
| **Overleaf** | Projects have separate **Archive** and **Trash**. Archived projects are kept but hidden and are not queued for deletion. Trash is the step before permanent deletion; deletion by an owner is permanent with "no undo". Restore is in both folders. A non-owner who trashes a shared project gets a Leave action instead of Delete. Tags are personal: collaborators do not see them, deleting a tag does not delete projects, and clicking a tag shows its projects. The dashboard supports search, filter by All / Your / Shared with you / Archived / Trashed, filter by tag, copy project and a template gallery. | https://docs.overleaf.com/managing-projects-and-files/archiving-deleting-and-leaving-projects, https://docs.overleaf.com/managing-projects-and-files/organizing-projects-with-tags/adding-tags-to-your-projects, https://docs.overleaf.com/on-premises/user-and-project-management/roles-and-permissions (Verified, snippet via search; the dashboard help page returned 404) |
| **Notion** | Database views are table, list, board, calendar, gallery, plus chart; each view can filter, sort and group. Gallery shows items as cards. In the sidebar, the ••• menu has Delete, Duplicate, Copy link, Rename and Move to. Deleted pages go to Trash, stay 30 days by default, cannot be edited until restored, and can be restored or permanently deleted. | https://www.notion.com/help/intro-to-databases (Verified, fetched); https://www.notion.com/help/duplicate-delete-and-restore-content (Verified, snippet via search) |
| **Zotero** | Collections are hierarchical, with subcollections. An item can be in several collections without duplicating ("Adding an item to multiple collections does not duplicate the item"). "My Library" shows everything. "Unfiled Items" lists items in no collection. Saved searches act as smart collections. Deleted items go to Trash for 30 days by default. Tags are portable across libraries; collection placement is not. | https://www.zotero.org/support/collections_and_tags (Verified, fetched) |

Zotero's word-processor page confirms that its plugins create a dynamic bibliography that updates when a new citation is inserted (Verified, fetched: https://www.zotero.org/support/word_processor_integration). Its page did not describe citation fields or a document-level style setting; the idea that the style is a setting of the document, not of each citation, is therefore from my knowledge of Zotero: UNVERIFIED here. Researchie already follows it (`citationStyleId` on the paper).

### 7.3 Recommended design

- **Home:** "Your papers" list. Columns: name, template, data-source project, status (draft, in review, done, from the existing `done` flags), word count, last edited. Sort by last edited (default). Search by name and by text in the paper. A "Create new paper" button at the top and a ghost row at the end of the list.
- **Recent:** the sort order already gives it; no second section until the list is long.
- **Grid toggle:** cards show a tiny page thumbnail (first page of the preview), a template badge and the project name. Notion's gallery view is the model.
- **Row actions (••• menu):** Rename (inline), Duplicate ("Copy of …", copies document and settings, not edit history), Move to project, Tags, Export, Delete.
- **Delete:** reuse the app's existing pattern from CLAUDE.md: optimistic delete, 8-second undo toast, trash drawer. Trash holds items for 30 days (Notion and Zotero default; Overleaf has no timed purge in the pages I saw). Permanent delete needs a confirm.
- **Grouping:** the data-source project is already a natural folder. Show "Group by project" as an option rather than building a folder tree. Tags give cross-project grouping, as in Overleaf.
- **Duplicate matters for templates:** "Start a new paper from this one" is how researchers make a second version for another journal.

---

## 8. Things the owner missed, and recommended scope

### 8.1 Things the owner missed

- **A paper needs its own storage, not a preference key.** `store.ts` caps one outline at 60 KB inside a 256 KB account settings object. Several rich-text papers with figures will not fit. Evidence: `src/lib/paper/store.ts` and its cited route comment.
- **Export to Word and PDF is a must, not a nice-to-have.** Journals and supervisors want DOCX or PDF. TipTap's DOCX export is a paid cloud feature (pricing page, 4.3). Plan an own export: the repo has JSZip and `@react-pdf/renderer`; a DOCX writer is not in the repo (check for a library and its licence before choosing; none verified here).
- **A cited-versus-listed check.** Flag references in the list that are never cited, and citations with no list entry, plus `[incomplete: …]` markers. ICMJE: check that none cite retracted articles (Verified, fetched); the repo already has retraction checks (`status.ts`).
- **A reporting-checklist panel.** PRISMA has 27 numbered items to track (Verified, fetched), and CARE has 13 (snippet). A sidebar to-do per template is cheap and is the most useful "structure" teaching feature.
- **Chicago is now 18th edition in CSL.** The owner asked for 17 (3.2).
- **No `book` or `conference_paper` source type.** Needed for MLA, Chicago and the conference template (3.5).
- **Journal limits are per journal.** Elsevier short-communication caps differ by journal (3,000 words, 4,000 words, six pages). Ask for the limit as a number; do not ship a journal database.
- **Anonymous review.** ACM's `anonymous` option hides authors and requires omitting acknowledgements (Verified, fetched). Conferences need it; a flag handles it.
- **Image permissions.** ICMJE: permission to reproduce previously published figures (Verified, fetched). Store source, licence and permission note on every image.
- **Alt text and accessibility.** Required alt text on figures; the preview is a view of the editor content (`paper-preview.md` section 7).
- **Autosave, version history and conflict handling.** Not researched here. Real-time collaboration is explicitly provisional in CLAUDE.md. Autosave and a simple "restore previous version" are still expected of a workspace; no source consulted, UNVERIFIED as a requirement.
- **Template changes after creation.** Keep the "Unplaced" bin rule (4.5); versions of a template should be stored with the paper.
- **Copyright and similarity.** Pasted long quotes get flagged; `paper-preview.md` section 7 covers it. Mark pasted text as quote.
- **Security of pasted HTML.** Paste is an input channel for script and tracking markup. DOMPurify plus a strict allow-list is the control (5.5).

### 8.2 Recommended scope for v1

- Papers table, `papers` API, and the file list with create, rename, duplicate, delete with undo and trash (section 7).
- Template picker modal with Blank plus the five templates as data, each with a small structure preview (section 1).
- Five-question wizard (section 6).
- TipTap editor with schema nodes `section`, `quote`, `citation`, `figure`, `table`; headings locked by the template; section reorder by drag handle and outline panel (4.5).
- Content sidebar: project text clips, images and citations, with native-drag into the document and an "Insert" button (4.4).
- Paste pipeline with DOMPurify, Word and Docs cleanup, PDF text repair, paste-as-plain-text (5.8).
- Citation styles: keep five formatters; add MLA 9 and Chicago author-date; add the `book` source type; automatic references page from cited clips plus manual entry (3.5).
- Front-matter panel: title, short title, authors with affiliation, ORCID and corresponding flag; abstract; keywords; end-matter statements (section 2).
- Header and footer zones with tokens; CSS page sheet preview; print via `@page` margin boxes (2.4, 4.6).
- Export: PDF (existing path) and Markdown with `[@id]` citations (`paper-preview.md` section 8).

### 8.3 Recommended later

- Chicago notes-bibliography with footnote nodes (needs a footnote node and note numbering).
- paged.js "Show as pages" view (4.6).
- DOCX export (own build; section 8.1).
- A CSL processor once the citeproc licence is cleared (3.6).
- Thesis chapter template and a case-study variant (1.5, 1.6).
- Reference import from PDF with GROBID (`paper-preview.md` section 6).
- AI drafting over the grounded pipeline (`paper-preview.md` section 3.3).
- Real-time collaboration and tracked changes (paid add-ons in TipTap; provisional in CLAUDE.md).
- Version history UI.

---

## Could not verify (summary)

- APA, MLA and Chicago manuals themselves (paywalled); all style rules are from CSL files. Chicago et al. thresholds were beyond the part of the CSL file the fetch returned.
- Whether Chicago 17 and 18 differ in ways that matter.
- IEEE Reference Guide and IEEEtran HOWTO text; IEEE index-term naming.
- Nature and Springer formatting pages (login redirect); only search-result snippets were used.
- JATS `article-meta` child element list (the fetch returned only the element heading).
- Microsoft specification for Word's `MsoNormal`, `mso-*` and conditional comments; any Google Docs clipboard documentation; whether PDF viewers set `text/html`.
- ORCID display guidelines (404). APA JARS page (empty). Google Docs grid versus list help, Overleaf dashboard page (404).
- Bundle size of minified `citeproc` (Bundlephobia gave no number); I measured the unminified file only.
- pagedjs.org documentation (404) and paged.js maintenance pace.
- TipTap paste rules API, `ReactNodeViewRenderer` documentation, and Lexical and Slate paste and drop APIs.
- Any DOCX writer library choice and licence.
