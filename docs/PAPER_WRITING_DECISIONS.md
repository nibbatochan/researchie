# Paper writing: every decision, the limits behind it, and what it changed

Started 2026-10-20. This is the case-study record for the "sources to a finished paper section" feature (SCOPE `S-128` to `S-144`).
It is kept up to date as the work goes on. Short numbered entries are also in `docs/DECISIONS.md` (Decisions 25 to 39) and the
security choices are in `docs/SECURITY_DECISIONS.md` (section H). Research behind it: `docs/research/paper-preview.md` and
`docs/research/notebooklm-zotero-workflow.md`. Commit history: `c61d729`, `becb413`, `563649b`, `98651f2` and what follows.

**Who decided.** "Owner" means the person building Researchie answered the question in chat. "Proposed, accepted" means it was
proposed in the session and the owner went ahead with it without changing it. Where the owner said nothing, it is written that way.

---

## 1. The problem, in the owner's words

Researchers store papers and their own notes. They want to write sections, derive methods, compare papers and write their own
paper, citing evidence from what they collected. What they can not see while writing is what the paper will look like once an
editing team formats it (usually paid). The idea: a live paper preview that shows a published-style page while they write, to
help them understand the structure and stay motivated to finish.

## 2. The rules the product must keep (guardrails the owner set)

1. **The preview is for understanding and motivation only.** It is not the final paper and must never imply it replaces journal
   formatting or editing.
2. **Cite only from the user's own collected papers.** Never invent references, authors or evidence. A claim with no source is flagged.
3. **Free or open-source tools only**, or tools with a usable free tier, with their limits stated.
4. **Mark anything uncertain** or that varies by journal or field, and say where to verify it.
5. **Both citation styles** (Harvard author-date and numbered), user-selectable.
6. **Stay practical for one builder with no budget.**

How each rule shows up in the product: see the decisions below, and section 6 for what we could not fully keep.

---

## 3. Decision log

### D1. The platform is the writing step, not the search step
- **Why.** Researchers already load papers into NotebookLM or Zotero and extract exact sentences there. NotebookLM does this well
  and the free Groq limit can not match it. A tool that tries to out-search Google loses; a tool that turns collected evidence
  into a checked, cited draft fills a gap that both research notes found empty.
- **Rejected.** Competing on finding answers across all papers; storing references (Zotero's job).
- **Limit behind it.** Free-tier compute (Groq: about 8K tokens a minute and 200K a day on the plan shown on its page; the free-plan numbers are not confirmed).
- **Who.** Proposed, accepted.
- **Impact.** Every later feature takes text the user already has and adds structure, citations and checks. Nothing asks the AI to search.

### D2. Build on NotebookLM and Zotero; never scrape them
- **Why.** NotebookLM (now Gemini Notebook) has no free API; its terms name scraping and automated access. A browser extension reading its page would break whenever the page changes.
- **Decision.** The user brings text over by paste or file: a paste box and an RIS/BibTeX import. The extension only clips what the user selects.
- **Rejected.** An extension that reads NotebookLM's page; Zotero's own API for now (key handling, rate limits, more to secure).
- **Impact.** Works with whatever tool the researcher already uses and cannot be broken by a change in someone else's page.

### D3. The preview says "preview only" everywhere, including the PDF
- **Decision.** A banner stays at the top of the preview; every printed sheet carries "Preview only. Not journal formatting. A journal sets its own layout and its editors format the final paper." as a fixed footer drawn by the page itself, not by browser features.
- **Why.** Guardrail 1. A downloaded PDF travels without the screen around it, so the warning has to be inside it.
- **Evidence.** A test prints the page to a real PDF and reads its text on every page, in one and two columns.
- **Limit.** Page numbers use CSS page margin boxes (recent Chrome or Edge). The note does not depend on them.

### D4. Every clip is a Quote, an AI summary, or Mine; only a Quote may be quoted or cited
- **Why.** The biggest integrity risk is an AI paraphrase being cited as a paper's own words. The clip must carry what it is.
- **Decision.** `metadata.evidenceKind` (no database change). Captured clips default to Quote, notes to Mine. AI summaries can never be put in quotation marks, cited, or listed as references.
- **Impact.** Every later check (draft, checklist, preview, paste box) reads this one field.

### D5. A failed quote match returns no page
- **Found.** `checkQuoteAgainstPages` returned the closest page even when the quote was not found, which a screen could show as a citation.
- **Decision.** No page on a failed match; a separate `exact` flag says word for word versus loose.
- **Impact.** A near miss can never become a citation.

### D6. The outline: a template, parts inside sections, clips dragged in, no AI
- **Decision.** Two templates (research article; literature review), parts in each section (three methods), clips placed by drag or menu, a "next section" guide. Stored as clip ids only.
- **Why.** The researcher's own example: Methods with three methodologies, in the order the research was done. Structure should come from the person, not a model, and cost nothing to run.
- **Rejected.** Many templates up front (journal formats differ; one generic article and one review cover most first uses).

### D7. Citations are structured data rendered in a chosen style; Harvard and numbered both ship
- **Decision.** Each clip carries one citation record. The preview renders Harvard `(Lee, 2020, p. 2)` or numbered `[1]` from the same data, so switching style never changes the document. Markers jump to the reference list and back.
- **Rejected.** citeproc-js (the standard CSL engine): CPAL-1.0 or AGPL-3.0, which can force publishing the app's source in a hosted app. We extended the repo's own formatters instead.
- **Checked against.** The CSL files `harvard-cite-them-right.csl` and `ieee.csl` (read through a summarising tool, so wording is not exact). Harvard: DOI as "Available at", "first et al." for four or more, years of one author joined. IEEE: abbreviated journal title, no range collapse ([1], [2], [3]) because ieee.csl sets none.
- **Not checked.** The Cite Them Right book (paid) and the IEEE Reference Guide (did not load). The guide may prefer ranges.
- **Note.** "Harvard" is a family of 115 styles in the CSL repository, not one standard; Cite Them Right is the default.

### D8. The AI drafts one section from that section's clips only, and every sentence is then checked without asking a model again
- **Why.** Compute and trust. One call per section, at most 12 clips and about 6,000 characters, fits the free limit. The model must name the clips each sentence rests on.
- **Checks (no second model call).** No source; a quotation not word for word in a quote clip; a number in no cited clip; an equation in no cited clip; 8 or more words copied without quotation marks; a sentence blending the researcher's own finding with a cited source; resting only on an AI summary; an open `[ ? ]` placeholder.
- **Found by testing.** The first real model call mixed the researcher's own pilot result with a cited paper's finding in one sentence, so the citation credited the paper with the pilot result. That produced the "mixed" check and a prompt rule.
- **Honest limit.** A passing sentence is "sourced", not "true". The checks do not test that a rewording keeps the clip's meaning. The researcher reads each sentence against its clip.

### D9. A section can be marked done only when its checklist passes
- **Blocks.** Any flagged draft sentence; an uncited quote clip; an AI summary still to rewrite; an open placeholder; a retracted source; a figure or table with no source; a citation to something that can not be cited.
- **Warns only.** A quote over 50 words; a borrowed figure or table (most publishers want permission, whatever the size); no caption; a cited source with no retraction result on record; sentences in your own text that cite nothing.
- **Why 50 words.** The strictest figure found (NIHR Journals Library); Cambridge's thesis guidance allows under 100 and APA block-quotes at 40. The target journal's rules control. Owner can change it (`LONG_QUOTE_WORDS`).
- **Honest wording on retraction.** The DOI lookup sets `retracted` only when Crossref lists a notice, so "no result" can mean "no notice" or "never checked". The checklist says so rather than claiming a clean bill.

### D10. Where the outline is saved: account preferences, one outline per person
- **Owner chose** (asked in chat): account preferences, and each person keeps their own outline of a shared project.
- **Why.** No database migration, works today. A collaborator never changes someone else's paper plan.
- **Cost.** One 256 KB limit shared by all of a user's preferences, so one outline is capped at 60 KB and shows a red "Not saved" notice past that. Real-time shared editing stays "provisional" as in `docs/DECISIONS.md`.
- **Found by reading.** The preferences saver ignored a refused save (a 413 "too large" looked like success). It now reports the refusal and the outline view shows it. Not yet seen live with an account.
- **Also.** "Draft again" keeps the previous draft (one level); "Restore previous draft" swaps back.

### D11. The paste box turns text into a Quote only when it is word for word in a PDF
- **Decision.** Pasted text has citation markers removed, is matched sentence by sentence against the project's PDFs, and only exact matches become Quotes, carrying the PDF's own wording, its page and the document's citation. A near match gets a hint ("may be a paraphrase of ... p. 4"), never a page that could be cited. Sentences under 5 words never count. The rest saves as an AI summary or the researcher's own text.
- **Why.** NotebookLM's copy button's clipboard contents are not documented; whatever comes, we re-derive the source ourselves, with no AI.
- **Impact.** The one workflow most researchers described (extract elsewhere, paste here) can no longer launder an AI paraphrase into a citation.

### D12. Reference import: RIS and BibTeX files, matched to PDFs and clips by DOI then title
- **Owner chose** (asked in chat): attach each entry's citation to the matching PDF or clip, and show unmatched entries so the owner can pick.
- **Decision.** Files are read in the browser (nothing fetched). Matched entries are pre-selected unless that would replace a citation already there; ambiguous and unmatched entries get a picker. A known retraction is kept when a citation is replaced. Imported records are marked "manual" because nothing was checked online. A new `PATCH /api/documents` sets a PDF's citation.
- **Rejected.** Zotero Web API for now.

### D13. Maths: KaTeX, typed as LaTeX in the researcher's own text
- **Decision.** KaTeX (MIT), with chemistry (mhchem). `$x^2$` inline, `$$...$$` as numbered display equations. A price such as "$5 and $10" is left alone. A formula KaTeX can not read shows as typed, in red.
- **Rejected.** MathJax (heavier); recovering equations from PDF text (unreliable).
- **Applied only to the researcher's own text** (notes, draft sentences, section points), not to quotes, so a dollar amount in a quote is never read as maths.
- **A draft may only copy an equation exactly from a clip**; a made-up one is flagged.

### D14. Figures and tables: only text and captions, numbered, with their source
- **Decision.** An image clip becomes "Figure N."; a clip holding an HTML table becomes "Table N." A table keeps only the text of its cells, never the page's markup. A figure or table with no source blocks Mark as done; a borrowed one warns about permission.
- **Why.** Research found most publishers want permission to reuse a figure or table, whatever its size.

### D15. PDF export uses the browser's print window, not a PDF library
- **Decision.** "Download preview as PDF" builds a separate white A4 page in a hidden frame and opens the print window; the user chooses Save as PDF. One or two columns.
- **Why.** Free, no dependency, and equations, citations and fonts print exactly as shown. A PDF library could not draw KaTeX.
- **Cost.** The user clicks Save as PDF. Not tried in Firefox or Safari.

### D16. The researcher's own text is a plain editor with `[@key]` citations, not a rich-text editor
- **Decision.** A text box; citations inserted from a list of clips that carry a citation, as readable keys like `[@Kim2021]`; a legend explains each key; the preview draws them in the chosen style. Checks: a key must point at a clip that exists and can be cited; quotations must be word for word in the cited clip; copied words need quotation marks; retraction is checked.
- **Why.** A rich-text editor (TipTap or ProseMirror) costs far more time than a first version needs, and plain text keeps the document easy to store and check. The key map means the style switch never changes the text.
- **Cost.** No bold, italic, headings or lists; no "see Figure 1" cross-references yet.
- **Honesty about AI.** "Move the AI draft into my text" ticks "Some of this text was drafted by AI", which adds a note in the preview, because many journals require disclosure. The researcher can untick it.

### D17. Sentences that cite nothing only warn
- **Why.** The platform can not tell a background claim (needs a source) from the researcher's own method or result (needs none). Flagging all of them would teach users to ignore flags.

### D18. How the work was tested
- **Pure libraries** (checks, matching, citations, parsing) have unit tests; screens have Playwright tests; the account store is tested with an in-memory database; the print page is checked by printing a real PDF; one real model call was made to see the real behaviour.
- **Click-through.** The whole flow was walked as a researcher, on desktop and phone width, with screenshots. It found seven problems (see section 5).
- **Not done.** Nothing was tested signed in on the live accounts site.

### D19. Commit hygiene
- **Decision.** Commits contain only this feature's work. Files shared with other people's uncommitted work (`SCOPE.md`, `docs/CHANGELOG.md`, `src/lib/data/cloud.ts`) were staged with only this work's lines, so nobody's unfinished change was published under this feature's message.

---

### D20. Paper Mode becomes a workspace of many papers, not one outline per project
- **Decision.** Paper Mode opens a file-explorer home that lists every paper the person wrote. A paper is its own record with a name, template, citation style, data-source project, and the document. The owner asked for this on 2026-10-22.
- **Why.** The old outline lived in the account preferences, one per project, capped at 60 KB inside a 256 KB settings object for everything. Several full papers do not fit there.
- **Rejected.** Raising the preferences cap (it is shared with every other setting). Keeping one outline per project (a project can feed several papers: a thesis chapter and a journal version).
- **Cost.** A new table (`supabase/migrations/006_papers.sql`, which the owner runs) and a migration of old outlines, not yet built.
- **Evidence.** `docs/research/paper-mode-workspace.md` section 8; `src/lib/paper/store.ts`.

### D21. A paper is private, kept apart from its project, and deleted in two steps
- **Decision.** A paper belongs to one person; every query filters by that person. It points at its data-source project by id only, with no foreign key, and creating or re-pointing a paper checks that the person can read that project. Delete moves it to a trash; removing for good is a second step and only works on a paper already in the trash. A saved paper over 2 MB is refused, never cut.
- **Why.** Deleting or un-sharing a project must never destroy a paper someone spent weeks on. Two-step delete matches the clip trash and the 8-second undo already in the app. Silent truncation would lose text.
- **Rejected.** Sharing papers with collaborators in v1 (no research on the permission model yet); a foreign key with cascade.
- **Limit.** If the person later loses access to the data-source project, the paper stays and shows "A project you no longer see".
- **Security.** Table has row-level security on and no policies, so only the server reads it. See `docs/SECURITY_DECISIONS.md`.
- **Evidence.** `tests/papers.test.mjs` (privacy, trash, purge, size, project check).

### D22. Templates are data, five plus Blank, each tied to a published structure
- **Decision.** Research article (IMRaD, ICMJE), Systematic review (PRISMA 2020), Conference paper (ACM and IEEE), Case report (CARE), Short communication. Thesis chapter is left out. The old "literature review" template stays as a hidden one so old outlines still open.
- **Why.** Each is backed by a primary source in the research note; the thesis has none that applies across universities.
- **Limit.** The conference body headings are convention, not mandated. The picker only lists the items of a guideline; the app never says a paper complies with it.
- **Evidence.** `src/lib/paper/templates.ts`, `tests/paper-templates.test.mjs`, research note section 1.

### D23. The new-paper wizard asks five things; the rest is filled in the editor
- **Decision.** Template, name, data-source project, citation style, and optionally journal and word limit. Blank skips the wizard. Authors, ORCID, funding and ethics go in a front-matter panel next to the text.
- **Why.** The owner was unsure what to ask first. The research (section 6) found that questions with no effect on the first screen are better asked later.
- **Status.** Wizard built; front-matter panel and the editor are not built yet.

### D24. The editor is TipTap, which reverses D16 for the workspace
- **Decision.** The paper is edited in TipTap (ProseMirror). The researcher's own text, citations, quotes, figures, tables and formulas are nodes in one document. D16's plain editor stays only in the old outline view.
- **Why.** The owner asked for Word-style editing, section reordering, drag and drop and paste from Word. D16 was a first-version choice and said so.
- **Kept from D16.** Citations are keys over a cite map, so switching style never changes the text, and the old checks (bad key, deleted clip, AI summary cited, quotation not word for word, copied without quotation marks, retraction) run on the new text through an adapter that writes a section back as `[@key]` text.
- **Cost.** About 400 KB of editor code in its own chunk, loaded when a paper opens (and preloaded when the picker opens).
- **Evidence.** `tests/paper-doc.test.mjs`, `tests/paper-schema.test.mjs`, `e2e/26-paper-editor.spec.ts`.

### D25. Template headings are locked (reversed on 2026-10-22, see D29)
- **Decision.** A template section can not be renamed or removed by typing.
- **Status.** Replaced by D29.

### D26. Saving never overwrites silently
- **Decision.** Autosave sends the `updatedAt` it last saw. A save made after another tab changed the paper is refused (409), and the person chooses: load that version or keep theirs.
- **Why.** The old preferences save was last-write-wins and could lose a whole paper's text.
- **Limit.** Millisecond precision; two saves in the same millisecond would not be told apart. Not tested signed in.

### D27. The editor is built for assembling a paper, not typing one
- **Decision.** Owner feedback, 2026-10-22: users type very little. They add a few lines of their own and bring everything else from clips, or paste it from NotebookLM or Zotero. So the clip sidebar, Insert, drag and drop and paste come before typing tools, and a pasted passage should be offered a match to a clip so it can become a cited quote.
- **Why.** The product's promise is that every passage keeps its source. A paper made mostly of clips keeps it for free; a paper typed from memory does not.
- **Effect on the plan.** S-155 (sidebar) is done; S-151 (paste) is next; Word-like functions (S-159) come after, and are picked with the owner.
- **Source.** The owner's message of 2026-10-22 (cut off at "The paper should look like an actual").

### D28. Hints in empty sections are our own decoration
- **Decision.** The grey "what goes here" hint is a decoration computed from the current document, not TipTap's Placeholder extension.
- **Why.** Placeholder asks our code to look up a position in the editor's previous state while it scans the new document, which crashed ("Position 294 out of range") when a block was inserted. Found by the sidebar browser test.

### D29. Nothing is locked; structure can be removed
- **Decision.** Owner feedback, 2026-10-22: the editor is a freehand tool, and a real paper does not match the template, so every structural element must be removable. Template headings can be edited or deleted, a section's heading is optional, and every block of the first page and the end of the paper can be switched off. Select-all and Delete empties the paper but leaves one empty section.
- **Why.** A lock protects the checklist's section keys; the person asked for freedom instead, and the keys survive for sections that are kept.
- **Cost.** A deleted template section can no longer be checked against its reporting-guideline item. The checks run on what is on the page.
- **Reverses.** D25.

### D30. The type scale comes from a real article; the toolbar from what that article needs
- **Decision.** The owner sent a published PLOS ONE paper. It was measured (sizes, positions, layout, footer, bibliography) and the toolbar and page styles were built from it. Findings are in `docs/research/plos-article-structure.md`.
- **Result.** Body 10 pt justified; section headings 11 pt bold; captions, tables, notes, references and footers 8 pt; title 16 pt; paragraph styles, font size, alignment, spacing, first-line indent, link, add and remove section or heading.
- **Honesty.** The page images could not be rendered; figures were read from captions. The font face is unverified.

### D31. Citation styles shown are author-date only; quotes carry no rule
- **Decision.** IEEE, Vancouver and AMA were removed from the editor's menus and from the new-paper form; templates that defaulted to them now default to APA. A quote is a paragraph in quotation marks followed by its marker.
- **Why.** The owner asked for both. The numbered styles were never formatted separately anyway (they were drawn with the IEEE formatter).
- **Open.** The sample paper has a numbered bibliography. If the owner wants papers like it, one numbered style returns.
- **Reversed, 2026-10-27 (D36).** The owner answered yes to numbered styles while writing, so IEEE and Vancouver came back, and AMA after them.

### D32. The page is measured and padded, never cut
- **Decision.** The sheet is fixed A4 or Letter pages. After each change the editor measures every block and moves any that would cross a page edge down with padding (a view decoration). Front matter, statements and references are moved the same way, a heading stays with the start of what follows, and a paragraph taller than a page is split by line with spacer gaps.
- **Why.** The owner wants it to look like a real paper and to work like Word. The text in the saved document is never changed by layout, so undo and save stay exact.
- **Rejected.** TipTap's paid page layout; splitting the document into one editor per page (breaks selection and undo).
- **Limit.** A columns block, list or table taller than a page cannot be split: it is outlined and the status line says which page. About 120 ms per key at 61 pages (Chromium, dev server).

### D33. One button per job, grouped into menus
- **Decision.** Alignment, line spacing, lists, more text formats and columns are one menu each; Page settings and Header & footer are one button each. Delete page asks which page from a list and can be undone.
- **Why.** The owner found the toolbar too wide and wanted Word's steps. It now fits two rows at 1280 px.
- **Limit.** No space before or after a paragraph. Word was studied from memory, not run side by side.

### D34. Columns are a block, with a ruler for margins
- **Decision.** A Columns block holds 2 to 6 columns the writer fills; dividers resize (drag or arrow keys); a trash icon deletes the set. A ruler above the page sets the margins in eighths of an inch.
- **Why.** The owner asked for columns anywhere in the paper and for ruler guides.
- **Limit.** No nested columns; images are inserted into the column the cursor is in and the set grows with them.

### D35. Clips of one paper are listed once
- **Decision.** Two clips whose DOI, title, year and first author agree are one source: one number, one reference. Sources can be added to References before they are cited ("Add all verified" adds those with a DOI).
- **Why.** The same paper clipped twice listed twice and took two numbers.
- **Limit.** A paper with no title is never merged. Different spellings of a title are merged only if they differ in punctuation and case.

### D36. Five citation styles, each real
- **Decision.** APA 7 (& between two authors, et al. from three, a and b on the year), Harvard, IEEE, Vancouver (numbers in round brackets, ranges collapse) and AMA (superscript numbers) each draw their own marker and list.
- **Why.** Before, three styles were drawn with the nearest of two, and switching looked like nothing happened.
- **Limit.** Checked against the project's own formatters and unit tests, not against each style's printed manual. MLA and Chicago are not built.

### D37. Print by copying the sheet; Markdown from the document
- **Decision.** Print / PDF re-lays the pages touching, copies the sheet into a print-only container and calls the browser's print. Markdown is made from the document with `[@key]` citations and a list of keys.
- **Why.** The owner wanted export; printing what is on screen cannot differ from it. Markdown keeps the citation keys so a reader can map them back to clips.
- **Limit.** DOCX is not built. Print was checked in Chromium (its own PDF: page count, size, text).

### D38. Fonts and highlights are ours, not pasted
- **Decision.** Five typefaces and five highlight colours are stored; a font or background that arrives with pasted text is dropped. Find and replace, space before and after, and odd and even headers were added to match Word.
- **Why.** Pasting from Word or Google Docs should bring the words, not a different typeface per paragraph.
- **Limit.** Pasted text colour is still kept (the Color mark was already in the editor).

### D39. MLA 9 and Chicago author-date
- **Decision.** Both are built (in-text and list); notes-bibliography Chicago is not.
- **Why.** The owner asked for the two styles still missing from the list of seven.
- **Limit.** Written from the style rules as known, not checked against the paid manuals or a CSL file.

### D40. One Export menu: Word, PDF, Markdown
- **Decision.** Export is one menu with Word (.docx), PDF (print) and Markdown (.md).
- **Why.** The owner asked for three export options in one place.
- **Limit.** PDF is the browser's print dialog ("Save as PDF"), so the output depends on the browser.

### D41. Word export written from the editor document
- **Decision.** The Word file is written directly from the editor's document. Figures are embedded as pictures. Tables are real Word tables with merged cells kept. Each section can be one or two columns.
- **Why.** The earlier route through Markdown lost tables and images and could not express columns per section. An export that opens in Word is the first requirement.
- **Limit.** Not opened in Microsoft Word; checked by XML and python-docx only. Equations are monospace LaTeX text.

### D42. Columns per section, not for the whole paper
- **Decision.** Methods, Statistical analysis, Results and Discussion are two columns. Introduction, Limitations, Conclusion, References and Article information are one column. Figures and tables run across the full width. The Columns panel sets each section; the whole-paper choice resets them.
- **Why.** The owner asked for columns only where they fit the paper, not on the back matter.
- **Limit.** The editor's page logic cannot split a two-column section across pages as Word does; long sections are split into page-sized parts in the replica.

### D43. Table test source and what is still unproven
- **Decision.** Table tests use the PubMed Central copy of the same article (PMC13652548), which has real HTML tables. The publisher's page shows its tables as images and is not used.
- **Why.** Pasting a real table is the owner's way to build tables inside the paper.
- **Limit.** Copy-and-paste from a browser was not tested here (the test pane does not pass the clipboard through). Pasting was tested through the same paste path with the same table HTML. Math symbols from the source come in as plain text.

### D44. A tall two-column section is shown in one column in the editor
- **Decision.** A two-column section taller than one page is shown in one column in the editor, so it splits across pages like text. A note says so. Export keeps two columns.
- **Why.** Owner asked for the editor to split long columns like Word. Splitting inside columns made the page shake, so the owner chose this fallback.
- **Limit.** The editor's print and page view show that section in one column; Word may break pages differently.

### D45. Comments on selected text stay out of the exports
- **Decision.** A comment is a highlight on selected text with a note. Notes are kept with the paper but are not written into Word, PDF or Markdown.
- **Why.** The owner asked for Word-style comments for the author's own review of the text.
- **Limit.** A reviewer's comment would not reach a journal or a Word file; export of comments is not built.

## 4. Limits we designed around

| Limit | Where it came from | What we did |
|---|---|---|
| Free Groq budget | Groq's page shows 8K tokens a minute, 200K a day (Developer base limits; free-plan numbers unconfirmed) | One call per section, at most 12 clips and about 6,000 characters; no AI for paste or import |
| Cannot out-compute NotebookLM | Free tier | Do not search; take its output and check it |
| Unpublished work sent to a third party | Groq docs: inference data not retained by default, up to 30 days for reliability and abuse; free tier not stated separately (inferred) | A note beside Draft; the user's own key in account mode |
| Citeproc licence | citeproc-js is CPAL-1.0 or AGPL-3.0 | Own formatters, aligned to the CSL files |
| 256 KB account settings | `src/app/api/settings/route.ts` | 60 KB cap per outline, a visible notice, refusals reported |
| Quoting limits differ | NIHR: permission over 50 words; Cambridge thesis: under 100; APA block quote at 40 | Warn at 50, never block |
| Figure reuse | Most publishers want permission | Warn; no source blocks |
| Retraction data | Crossref's docs and a third-party tool disagree on which field carries the flag | Honest "no result" wording; stronger check waits for `S-79` |

## 5. What testing found (the honest part)

1. **A real model blended the researcher's finding with a cited paper's** in one sentence. Only a real call showed it. Fixed with the "mixed" check and a prompt rule.
2. **Draft and checklist panels repeated on every empty section** and drowned the page. Hidden until a section has content.
3. **The citation sat after the full stop** ("...of sleep. (Lee, 2020)"). Now before it.
4. **Sentence boxes cut off long text.** They grow.
5. **The model repeated the researcher's own point and it was flagged "no source".** Now counted as their own text.
6. **Phone width.** The header stacked into a tall column and the clip list took half the screen. Header wraps, the list starts closed. The project sidebar still fills a phone until collapsed (an existing layout, not changed).
7. **A mistaken diagnosis, corrected.** An early note said an old end-to-end test failed because a button was missing. Wrong: the button exists. The setup looked for cards the dashboard no longer renders, and the Next.js dev badge sat on top of the round button.
8. **A save that could fail silently** (D10).
9. **A false alarm.** One walk-through failed on a development-server cold start (a chunk-load timeout), not on the app.

### D46. Clips with a web address are numbered as web pages
- **Decision.** A clip with no verified citation but a web address is cited as a web page: its title and address are the reference; authors and year are left out and marked "n.d.". It is numbered and listed in References, but not on the Citations tab.
- **Why.** A note written in Researchie AI cites the clips it came from. Those clips are often unverified web clips, so the note showed no numbers at all.
- **Rejected.** Guessing an author or year from the page. Listing every web clip on the Citations tab (it is for verified sources).
- **Impact.** A web clip in a paper is always traceable to its address; the reference says what is known and nothing more.

### D47. A click on a citation number goes to its own reference row; placing a clip says what was added
- **Decision.** A click on a number scrolls to that source's row in References. Placing a clip shows a toast: "Added to references: <name>" for a new source, "Already in references: <name>" for one already listed.
- **Why.** The researcher could not tell which reference a number meant, or whether a drop had added anything.
- **Impact.** A note with several sources shows one number per source in the text; the toast lists each.

### D48. A note from Research AI is labelled Paraphrased and shows its own text
- **Decision.** The paper's clip list shows a note saved from Research AI with the tag "Paraphrased" and its written text (blank-line paragraphs kept), not its title. Its reference list is not part of the text.
- **Why.** The title "Research Brief (own words)" was the only thing shown, so the researcher could not tell what the note said.
- **Impact.** The clip list can be read without opening the note.

## 6. What this changes for a researcher (the impact)

**Before.** Clips sat in a feed. Turning them into a paper happened in another tool, with citations typed by hand, and no view of the finished shape.

**Now, in one place.** Pick a template; import references from Zotero or Mendeley exports; paste what NotebookLM or Zotero found and turn exact passages into Quotes with pages; plan parts and place clips; draft a section or write it; see Harvard or numbered citations switch live; see equations, figures and tables; get told exactly what is unsourced, misquoted, copied, retracted or borrowed; export a PDF that says it is a preview.

**What the platform now prevents.** An invented reference (citations come only from clips); an AI paraphrase presented as a quotation; a quote with a page it does not have; text copied without quotation marks; a retracted paper cited as valid; an unsourced figure; the researcher's own result credited to someone else's paper.

**Size of the work.** Four commits, 56 files, about 7,100 lines added; about 480 unit tests in the repository and 13 end-to-end tests for this feature.

## 7. What is not proven

- **Signed in on the live site.** Saving the outline with an account, per-user preferences and the PDF citation save on the cloud store were checked only in local mode, and the cloud store with an in-memory database. Steps for a real check are in `docs/TESTER_CHECKLIST.md` (paper writing).
- **Wording of the style guides.** Read through a summarising tool, not the books.
- **Real researchers.** Nobody outside the build has used it. The flow is built from interviews and research notes.
- **Longer drafts and bigger projects.** One real model call was made, on two short clips.
- **Other browsers.** PDF page numbers and print layout were tried in Chromium only.
- **Security review.** See `docs/SECURITY_DECISIONS.md` section H for what was and was not covered.

## 8. Next, if the owner wants it

Run the signed-in checklist; get the extension to testers (`S-61`); cross-references by number; rich text; a conference template; Zotero's own API.

## 9. Keeping this file current

When a decision is made, add it here with: what, why, what was rejected, the limit or cost, who decided, and the evidence. Put security
choices in `docs/SECURITY_DECISIONS.md` too, and a one-line entry in `docs/DECISIONS.md`.
