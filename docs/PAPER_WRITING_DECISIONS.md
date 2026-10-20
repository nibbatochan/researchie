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
