# Paper preview: structure, templates, AI drafting, citations and rendering

Research date: 2026-10-20. Primary sources only where they loaded: policy pages, official docs, GitHub repositories and licences, npm registry metadata, and the peer-reviewed papers themselves (read through Europe PMC, Crossref or the publisher). Each claim carries the URL it came from. Labels:

- **Verified (fetched):** read from the owning page in this session.
- **Verified (snippet):** the owning page would not load; the text came from a search result that quotes it. Re-check before relying on it.
- **UNVERIFIED:** not confirmed from a primary source. The note says where to check.
- **Varies:** differs by journal or field. Always check the target journal's "guide for authors".

Fetched pages were summarised by a small model, so quoted wording is as returned. Re-check anything load-bearing against the page before building on it.

The feature in one line: while a researcher writes their own paper from their notes and clips, a side pane shows the text laid out like a published article, so they can see the structure and the argument. It is a learning and drafting aid. It is never the submission file and never replaces the journal's own formatting and copy-editing.

---

## Answer up front

1. **Structure.** The founder's order is close but needs three fixes. The front block is called the **title page** or **front matter**, not a "bibliography" (a bibliography is the reference list). Citation counts and other metrics are **not printed in the paper**; they live on the publisher's web page and in databases. The core is **IMRaD** (Introduction, Methods, Results and Discussion), which ICMJE calls "a reflection of the process of scientific discovery". Add keywords, affiliations, corresponding author, funding, conflicts of interest, data availability, author contributions (CRediT), acknowledgements, and appendices or supplementary material. References come near the end, often followed by tables, figures and appendices.
2. **Templates.** Ship two templates first: a **generic IMRaD empirical article** and a **literature or systematic review** (based on PRISMA 2020). Add a **short CS conference paper** (ACM or IEEE style) third. Model each template as data: a section skeleton, abstract type (structured or not), word guidance, column count, and a CSL citation style id. Journals differ in all of these.
3. **AI drafting.** Current LLMs write fluent prose but fabricate and misattribute references at measured rates. In published studies, 18% to 55% of references were fabricated (Walters and Wilder 2023), 28.6% to 91.4% were hallucinated (Chelli et al. 2024), and 50% to 90% of answers were not fully supported by the sources they cited (Wu et al. 2025). Use AI only over the user's own clips, with a mandatory clip ID on every claim, a "no source" flag, and a claim-to-quote check. Never let it invent methods or results.
4. **Citations.** Support both families equally. **Author-date** ("Harvard", APA): (Lee, Patel and Okafor, 2021). **Numbered** (IEEE, Vancouver): [1]. Store each reference once as structured data (CSL-JSON, the Citation Style Language data format) tied to a clip ID. Render it with a CSL processor and a style file, so switching style re-renders the text and the stored document never changes. "Harvard" is a family of 115 CSL styles, not one standard; default to Cite Them Right. Licence warning: the reference CSL processor, citeproc-js, is CPAL-1.0 or AGPL, and citation-js's CSL plugin depends on it.
5. **Rendering.** Use KaTeX (MIT) for LaTeX-syntax maths, with mhchem for chemistry. Output HTML plus MathML; every major browser has supported MathML Core since January 2023 (Chrome 109). Use STIX Two or Noto Sans Math fonts (OFL). Auto-number figures, tables and equations yourself. For the "real page" look, use paged.js (MIT), or native CSS `@page` margin boxes (Chrome 131+). TikZ, custom LaTeX packages and equations pulled out of PDFs will not render reliably.
6. **Tools.** All free or free-tier: Groq, Gemini (free tier trains on your data), OpenRouter `:free` (50 requests/day), Ollama (local); pgvector; GROBID (Apache-2.0) for references; pdf.js; Docling (MIT); Crossref, OpenAlex and Semantic Scholar for metadata; KaTeX or MathJax 4; TipTap or ProseMirror (MIT); paged.js. Avoid for a closed-source web app unless the licence is accepted: Vivliostyle (AGPL-3.0), citeproc-js (CPAL/AGPL), Nougat weights (CC-BY-NC), Marker weights (OpenRAIL-M with a revenue cap).
7. **Risks and MVP.** The biggest risks: users treat the preview as final; AI hallucination; privacy of unpublished work on free LLM tiers; journal AI-disclosure rules; quoting too much copyrighted text. MVP, in order: section editor with an IMRaD template, citation insertion from clips, author-date/numbered toggle, figures and captions, KaTeX, a paged preview with a permanent "Preview only, not journal formatting" banner, and flags on unsourced claims. Add the review template next. Add AI only after the grounding and check pipeline exists.

---

## 1. Paper structure

### 1.1 Correcting the assumed order

| Founder's assumption | Correction | Source |
|---|---|---|
| Front page "bibliography" | Called the **title page** (in a manuscript) or **front matter / article header** (in the published version). A *bibliography* or *reference list* is the list of sources at the end. | ICMJE lists "Title page" as the first manuscript element: https://www.icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html (Verified, fetched) |
| Metrics on the front page | Citation counts, views and Altmetric scores are **not part of the article text**. Publisher web pages and databases (Scopus, Google Scholar, OpenAlex) show them next to the article. The preview should not show invented metrics. | General publishing practice. OpenAlex exposes counts as database fields: https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication |
| Abstract, introduction, methods, tests/results, discussion, conclusion, references | Correct as an outline. The standard name is **IMRaD**. ICMJE: IMRaD "is not an arbitrary publication format but a reflection of the process of scientific discovery". ICMJE's manuscript order is title page, abstract, introduction, methods, results, discussion, references, tables, figures. "Tests" is usually just **Results**. **Conclusion** is optional in many journals and is often the last paragraph of the Discussion. | https://www.icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html (Verified, fetched) |
| References last | References are near the end, but often **not last**. APA 7 order: title page, abstract, text, references, footnotes, tables, figures, appendices. Supplementary material is a separate file. | https://apastyle.apa.org/style-grammar-guidelines/paper-format/order-pages (Verified, fetched) |

### 1.2 Section by section (plain language)

| # | Section | What it is, in plain words | Usual place | Notes |
|---|---|---|---|---|
| 1 | **Title** | One line saying what was studied and, often, the main finding or design. | Page 1 | Some journals cap its length (Varies). |
| 2 | **Authors and affiliations** | Who did the work, and which university or organisation each belongs to (the *affiliation*). | Page 1 | |
| 3 | **Corresponding author** | The one author who handles questions about the paper. ICMJE says the title page should list this person's phone and email. | Page 1, often a footnote | ICMJE page above (Verified) |
| 4 | **Dates and identifiers** | *Received / accepted / published* dates; the **DOI** (Digital Object Identifier, a permanent link such as `https://doi.org/10.xxxx/...`); journal name, volume, issue, pages or article number; licence (for example CC BY). | Page 1 header or footer | The journal adds these at publication. In a preview, show them as placeholders. |
| 5 | **Abstract** | A 150 to 300 word summary of the whole paper. *Structured* abstracts use labelled parts (Background, Methods, Results, Conclusions). *Unstructured* abstracts are one paragraph. ICMJE: "Original research, systematic reviews, and meta-analyses require structured abstracts." | Page 1 | Varies. Fetched source: ICMJE page above. The word range is typical, not a rule. |
| 6 | **Keywords** | 3 to 8 terms for indexing. | Under the abstract | Varies. ACM papers also use "CCS concepts" (ACM's subject classification). |
| 7 | **Introduction** | Why the problem matters, what is already known, the gap, and the aim or hypothesis. ICMJE: give context, state the purpose, cite only directly relevant work, and "do not include data or conclusions from the work being reported". | Starts on page 1 or 2 | ICMJE page above (Verified) |
| 8 | **Methods** (or Materials and Methods) | Exactly what was done, in enough detail for someone else to repeat it. ICMJE: include only what was known when the protocol was written; "all information obtained during the study belongs in the Results section". It also asks for the ethics approval statement and, if AI was used in the study, the tool, version and prompts. | Middle | ICMJE page above (Verified) |
| 9 | **Results** | What was found: numbers, tables, figures, with no interpretation. | Middle | Some fields merge it with Discussion ("Results and Discussion"). |
| 10 | **Discussion** | What the results mean, how they compare with earlier work, the limitations ("State the limitations of your study", ICMJE), and implications. It should not repeat the data. | Late | ICMJE page above (Verified) |
| 11 | **Conclusion** | A short take-home paragraph. | End of text | Optional, or folded into the Discussion, in many journals (Varies). |
| 12 | **Acknowledgements** | Thanks to people who helped but are not authors. | After the text | ICMJE does not fix its position; it is outside the word count (ICMJE page above). |
| 13 | **Funding** | Who paid for the work. ICMJE: list sources of support on the title page and a separate funding statement after the abstract, direct support only. | Title page and/or end | Varies by journal. ICMJE page above (Verified). |
| 14 | **Conflicts of interest / competing interests** | Money or relationships that could look like bias. ICMJE: "Disclosure information for each author needs to be part of the manuscript"; each journal sets the format. | End matter or title page | Varies |
| 15 | **Data availability** | Where the data and code can be found. ICMJE asks articles to cite persistent identifiers for data sets used. | End matter | ICMJE page above (Verified) |
| 16 | **Author contributions (CRediT)** | Who did what, using the 14 roles of the Contributor Role Taxonomy (Conceptualization, Data curation, Formal analysis, Funding acquisition, Investigation, Methodology, Project administration, Resources, Software, Supervision, Validation, Visualization, Writing – original draft, Writing – review & editing). It is an ANSI/NISO standard (Z39.104-2022). | End matter | https://credit.niso.org/ (Verified, fetched) |
| 17 | **AI-use declaration** | A statement of which AI tools were used and how. Elsevier places it "immediately before the references". | End matter or Methods | Varies. See section 3.5. |
| 18 | **References** | The full list of every source cited in the text. | End | Format depends on citation style (section 4). |
| 19 | **Tables, figures** | Either in the text near their first mention, or at the end of the manuscript. APA allows both. | In text or end | https://apastyle.apa.org/style-grammar-guidelines/paper-format/order-pages (Verified) |
| 20 | **Appendices / supplementary material** | Extra detail that would interrupt the main text: full questionnaires, extra tables, code. Appendices are printed; supplementary files are usually separate downloads. | After references, or separate file | Varies |

### 1.3 What goes on the first page and on the last pages

**First page (published look):** journal name and logo, volume and issue, DOI, title, authors and affiliations, corresponding-author footnote, received/accepted dates, licence line, abstract, keywords. In two-column layouts, the start of the Introduction often begins below the abstract.

**Last pages:** end of Discussion or Conclusion, then the end matter (acknowledgements, funding, competing interests, data availability, author contributions, AI declaration), then references, then appendices. The order of the end-matter statements varies by journal.

Example first page outline for the preview pane (illustrative only; all names are made up):

```
┌───────────────────────────────────────────────────────────────┐
│ PREVIEW ONLY — not journal formatting. Not for submission.    │  ← permanent banner
├───────────────────────────────────────────────────────────────┤
│ [Journal name placeholder]   Vol. –, No. –   DOI: (assigned   │
│                                              at publication)  │
│                                                               │
│  Short sleep and working memory in shift nurses:              │
│  a cross-sectional study                                      │  ← Title
│                                                               │
│  A. Lee¹*, R. Patel², C. Okafor¹                               │  ← Authors
│  ¹ Example University, Dept. of Nursing  ² Example Hospital    │  ← Affiliations
│  * Corresponding author: a.lee@example.org                    │
│  Received: —   Accepted: —   Published: —                     │
├───────────────────────────────────────────────────────────────┤
│ ABSTRACT                                                      │
│ Background: …  Methods: …  Results: …  Conclusions: …         │  ← structured
│ Keywords: sleep; working memory; shift work                   │
├──────────────────────────────┬────────────────────────────────┤
│ 1. Introduction              │ … continues in column 2        │  ← two-column body
│ Shift work disrupts sleep    │                                │
│ (Moreno et al., 2023). …     │                                │
└──────────────────────────────┴────────────────────────────────┘
                              1                                    ← page number
```

### 1.4 Field variation (Varies)

- **Humanities** (history, philosophy, literature): usually no IMRaD. The paper is an argument with descriptive headings, long quotations and footnotes. Chicago notes-bibliography or MLA style is common. A "Methods" heading would look wrong here.
- **CS conference papers:** Introduction, Related Work, approach or system, Evaluation, Discussion or Limitations, Conclusion. Hard page limits. Two-column ACM `sigconf` or IEEE format. ACM's acmart class documents `sigconf` as the "Proceedings format for most ACM conferences (with the exception of SIGPLAN)", and also offers single-column formats such as `acmsmall`: https://raw.githubusercontent.com/borisveytsman/acmart/master/acmart.dtx (Verified, fetched source docs). IEEE's class is IEEEtran (LPPL 1.3): https://ctan.org/pkg/ieeetran (Verified). That IEEE conference papers are two-column is **UNVERIFIED** here; the CTAN page did not say. Check the IEEEtran HOWTO.
- **Reviews:** a narrative review is organised by theme. A **systematic review** follows PRISMA 2020: a title, abstract, introduction, methods (search, selection, risk of bias, synthesis), results with a flow diagram, discussion and "other information". PRISMA 2020 is Page MJ et al., BMJ 2021, doi:10.1136/bmj.n71 (Europe PMC record, PMID 33782057, Verified). The PRISMA site provides a checklist, a separate abstract checklist and flow-diagram templates: https://www.prisma-statement.org/prisma-2020 (Verified). The item count (27) is **UNVERIFIED** this session; check the checklist PDF on that site.
- **Qualitative studies:** IMRaD-like, but Methods covers researcher position (reflexivity), sampling and coding, and Results are themes with participant quotes. Reporting guides: COREQ, "a 32-item checklist for interviews and focus groups" (Tong, Sainsbury and Craig, Int J Qual Health Care 2007, doi:10.1093/intqhc/mzm042), and SRQR (O'Brien et al., Acad Med 2014, doi:10.1097/acm.0000000000000388). Both are Europe PMC records (Verified).
- **Merged Results and Discussion:** common in chemistry, physics and some engineering journals (Varies).
- **Conclusion:** optional or merged in many medical journals; ICMJE's list does not include a separate Conclusion section (ICMJE page above).
- **Case reports, protocols, meta-analyses:** ICMJE notes that "other formats, such as those for meta-analyses or case reports, may differ" (ICMJE page above).

---

## 2. Templates

### 2.1 Recommended starter templates

| Template | For | Skeleton | Abstract | Default citation style | Reporting guideline to link |
|---|---|---|---|---|---|
| **A. Empirical article (IMRaD)** | Most lab, clinical, social-science and survey studies | Title page, Abstract, Keywords, Introduction, Methods, Results, Discussion, (Conclusion), end matter, References, Appendices | Structured (toggle to unstructured) | Author-date: Cite Them Right Harvard. Numbered: Vancouver (NLM) | CONSORT 2025 for randomised trials (Hopewell et al., BMJ 2025, doi:10.1136/bmj-2024-081123, Verified via Europe PMC); STROBE for observational studies (von Elm et al., Lancet 2007, doi:10.1016/s0140-6736(07)61602-x, Verified via Europe PMC) |
| **B. Literature / systematic review** | Researchers whose "own paper" is a synthesis of collected papers, which fits Researchie's clip model best | Title, Abstract, Introduction (rationale, objectives), Methods (eligibility, sources, search, selection, data items, risk of bias, synthesis), Results (selection flow, study characteristics, synthesis), Discussion, Other information (registration, funding, competing interests), References | Structured (PRISMA abstract checklist) | Same toggle as A | PRISMA 2020: https://www.prisma-statement.org/prisma-2020 |
| **C. Short CS conference paper** (third) | Computing and HCI users | Title, Abstract, CCS concepts and Keywords, Introduction, Related Work, Method/System, Evaluation, Discussion and Limitations, Conclusion, References | Unstructured, one paragraph | IEEE (numbered) or ACM | ACM acmart `sigconf` / IEEEtran (links in 1.4) |

A fourth, humanities essay (argument with free headings, footnote citations, Chicago notes) is worth it only if users ask for it. It needs footnote rendering, which the others do not.

The EQUATOR Network indexes reporting guidelines by study type (randomised trials, observational studies, systematic reviews, qualitative research, diagnostic studies and others): https://www.equator-network.org/reporting-guidelines/ (Verified, fetched; the page was too long to read in full). A template can link the matching checklist and show its items as a sidebar to-do list. That helps users understand structure without the app claiming compliance.

### 2.2 How formats differ across journals and fields (all Varies)

| Dimension | Range seen | Source / note |
|---|---|---|
| Citation style | Author-date (APA, Harvard variants, Chicago author-date) vs numbered (Vancouver/NLM, IEEE, AMA, Nature). The CSL repository has 2,863 independent styles. | Count from the GitHub tree of https://github.com/citation-style-language/styles (Verified, fetched 2026-10-20) |
| Abstract | Structured vs unstructured; word caps | ICMJE requires structured abstracts for original research and reviews but says formats vary by journal (ICMJE page above) |
| Word / page limits | Journals set their own; conference papers have hard page caps | Check the target journal's guide for authors |
| Layout | Single-column manuscript for submission vs two-column published look | acmart offers both single- and two-column formats (acmart.dtx above) |
| Section names | "Methods" vs "Materials and Methods" vs "Experimental"; "Results and Discussion" merged; "Related Work" in CS | Field practice |
| Required statements | Funding, competing interests, data availability, CRediT, AI declaration, ethics approval, trial registration | ICMJE asks for the trial registration number at the end of the abstract (ICMJE page above) |

### 2.3 How a template can adapt

Store a template as configuration, not as code:

```ts
interface PaperTemplate {
  id: 'imrad' | 'review-prisma' | 'cs-conference';
  sections: { key: string; heading: string; optional?: boolean; guidance: string; wordHint?: [number, number] }[];
  abstract: { structured: boolean; labels?: string[]; wordHint?: number };
  endMatter: ('acknowledgements' | 'funding' | 'competingInterests' | 'dataAvailability' | 'credit' | 'aiDeclaration')[];
  layout: { columns: 1 | 2; pageSize: 'A4' | 'letter' };
  citationStyleId: string;       // a CSL style id, e.g. 'harvard-cite-them-right', 'ieee', 'nlm-citation-sequence'
  checklistUrl?: string;         // EQUATOR guideline, shown as help only
}
```

The document stores section content keyed by `section.key`. Changing template or style re-maps headings and re-renders citations; the user's text is untouched. A section the new template lacks goes into an "Unplaced" bin rather than being dropped.

---

## 3. AI generation: how reliable it is

### 3.1 What the published evidence says

| Failure mode | Evidence | Source |
|---|---|---|
| **Fabricated references** (look real, do not exist) | "55% of the GPT-3.5 citations but just 18% of the GPT-4 citations are fabricated." | Walters WH, Wilder EI. *Sci Rep* 2023;13:14045. doi:10.1038/s41598-023-41032-5 (Europe PMC record, Verified) |
| Fabricated and wrong details | 115 references in ChatGPT medical papers: 47% fabricated, 46% real but inaccurate, 7% correct. | Bhattacharyya M et al. *Cureus* 2023;15:e39238. doi:10.7759/cureus.39238 (Europe PMC, Verified) |
| Hallucinated references for systematic reviews | Hallucination rate: GPT-3.5 39.6%, GPT-4 28.6%, Bard 91.4%. Precision: 9.4%, 13.4%, 0%. | Chelli M et al. *J Med Internet Res* 2024;26:e53164. doi:10.2196/53164 (Europe PMC, Verified) |
| **Real citation that does not support the claim** | "Between 50% and 90% of LLM responses are not fully supported" by their cited sources. Even GPT-4o with web search left about 30% of statements unsupported. | Wu K et al. *Nat Commun* 2025;16:3615. doi:10.1038/s41467-025-58551-6 (Europe PMC, Verified) |
| Retrieval (RAG) reduces but does not remove hallucination | Commercial legal research tools built on retrieval "each hallucinate between 17% and 33% of the time." | Magesh V et al. arXiv:2405.20362 (Verified, fetched); published *J Empir Leg Stud* 2025;22:216-242, doi:10.1111/jels.12413 (Crossref, Verified) |
| **Lost in the middle** (long inputs) | Models do best when the relevant text is at the start or end of the input, and worse when it is in the middle. | Liu NF et al. *TACL* 2024;12:157-173. doi:10.1162/tacl_a_00638 (https://aclanthology.org/2024.tacl-1.9/, Verified) |
| **Homogenised voice** | Writing with InstructGPT made essays by different people more similar and less diverse; GPT-3 (not feedback-tuned) did not. | Padmakumar V, He H. ICLR 2024. arXiv:2309.05196 (Verified, snippet; one experiment with 2023 models) |
| Misattribution (right claim, wrong paper) | Covered by the "inaccurate" and "not supported" results above. | Bhattacharyya 2023; Wu 2025 |
| Overclaiming (stronger language than the source) | No primary study found this session that measures it on its own. | UNVERIFIED as a measured rate. Wu 2025 "not fully supported" partly covers it. |
| **Methods that were never done** | Follows from the above: the model writes what a methods section usually says, not what this user did. Elsevier lists "fabricating or altering data or references" as prohibited AI use. | https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals (Verified) |
| **PDF extraction errors** (tables, equations) | pdf.js returns positioned glyphs, not table structure or LaTeX. Parsers that rebuild structure (GROBID, Docling, Marker, Nougat) are model-based and make errors. GROBID reports reference extraction at about 0.87 to 0.90 F1 (a combined accuracy score from 0 to 1). | https://grobid.readthedocs.io/en/latest/Introduction/ (Verified) |

### 3.2 Verdict

| Task | Verdict | Why |
|---|---|---|
| Suggest a section skeleton for a study type | **Reliable** | Low risk; fixed templates do it with no AI at all. |
| Rewrite the user's own sentences for clarity, grammar, tone | **Reliable, with review** | Elsevier allows language improvement and Nature treats polishing as low risk; both still expect human review (section 3.5). Homogenisation risk. |
| Summarise one clipped paper the user has | **Needs review** | Grounded in one source, but extraction errors and misattribution occur. |
| Compare several clipped papers (matrix of aim, method, sample, finding) | **Needs review** | Useful; each cell must link to a clip, and the "lost in the middle" effect argues for one paper per call, then merge. |
| Draft Introduction or Discussion prose from the user's clips | **Needs review** | Only with per-sentence clip IDs and the check pass (3.4). Wu 2025 shows citing a source does not mean the source supports the sentence. |
| Insert citations from the user's library | **Reliable if deterministic** | Pick from stored CSL-JSON by clip ID. Never let the model write a reference string. |
| Generate references from model memory | **Don't do** | 18% to 91% fabricated or hallucinated in the studies above. |
| Write Methods or Results the user has not described | **Don't do** | Invents work never done. That is research misconduct if submitted. |
| Derive "the methodology" from other papers and present it as the user's | **Don't do** | Same reason. Offering methods *used in clipped papers*, labelled as theirs, is fine. |
| Read numbers out of PDF tables or equations into the user's Results | **Don't do automatically** | Extraction errors. Show the source page image next to any extracted value. |

### 3.3 Recommended pattern: grounded drafting (RAG with clip IDs)

RAG (retrieval-augmented generation) means: find the relevant clips first, then give only those to the model.

1. **Retrieve** from the current project only, by embedding search over clips. Note: `src/lib/ai/embeddings.ts` today makes a deterministic hash vector, not a semantic embedding, so retrieval quality will be limited until a real embedding model is plugged in (see section 6).
2. **Prompt** with each clip as `[[clip:<id>]] <exact text>`. Rules: every factual sentence must end with one or more `[[clip:<id>]]` markers; a sentence with no supporting clip must be marked `[[nosource]]`; never output a reference list.
3. **Parse** the markers into the editor's citation nodes (section 4). Unknown IDs count as `nosource`.
4. **Flag**: every `nosource` sentence and every sentence whose check fails gets an amber underline: "No clip supports this sentence."

### 3.4 Verification pass (claim-to-quote check)

- **Step 1, exact quote check.** Reuse `src/lib/ai/claimSupport.ts`. It already checks whether a quote appears word for word, or with at least 80% word overlap, on one page of the cited source. It needs no network.
- **Step 2, entailment check.** For each sentence and cited clip pair, ask a second model call: "Does this passage support this sentence? Answer supported / partial / not supported, and quote the span." *Entailment* means the passage logically backs the sentence. Store the quoted span; show it on hover.
- **Step 3, show, don't hide.** Never auto-delete. Show the status chip next to the citation. The user decides.
- The judge model can also be wrong. Treat "supported" as "likely supported", not proof. This is the reason for step 1 and for showing the quote.

### 3.5 Journal AI-use policies

| Body | Authorship | Disclosure | Source |
|---|---|---|---|
| ICMJE | Chatbots "should not be listed as authors" | State AI use at submission, in the cover letter and the relevant manuscript section. AI used to *do* the study goes in Methods with tool, version and prompts. "Referencing AI-generated material as the primary source is not acceptable." | https://www.icmje.org/recommendations/browse/artificial-intelligence/ai-use-by-authors.html and the preparing-for-submission page (both Verified) |
| COPE | AI tools cannot be authors; they cannot take responsibility or manage conflicts or copyright | Disclose tool and use in Materials and Methods or a similar section | https://publicationethics.org/guidance/cope-position/authorship-and-ai-tools (Verified, snippet; the page returned 403) |
| Nature Portfolio | Giving authorship or accountability to AI is "Not permitted" | Polishing language is low risk; "extensive copy editing or writing support" needs oversight and disclosure; photorealistic AI images not permitted. The page did not say where in the paper to disclose. | https://www.nature.com/nature-portfolio/editorial-policies/ai (Verified, fetched) |
| Elsevier | AI cannot be an author or be cited as one | A declaration placed "immediately before the references"; none needed for spelling and grammar checks; no AI for primary research images or graphical abstracts; verify references because AI can fabricate them | https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals (Verified) |
| Science journals | The 2023 editorial "ChatGPT is fun, but not an author" (Thorp, *Science* 379:313, doi:10.1126/science.adg7879, Crossref Verified) barred AI authorship. A 2026 editorial "Resisting AI slop" (*Science* 391:5, doi:10.1126/science.aee8267, Crossref Verified) exists. | Current disclosure wording is **UNVERIFIED**: https://www.science.org/content/page/science-journals-editorial-policies returned 403. | |

**Product consequence:** keep an AI-use log per paper (which sections, which tool, when). Offer a one-click draft of the AI declaration from it, and tell the user to check the target journal's wording.

---

## 4. In-text citations: author-date ("Harvard") vs numbered (IEEE / Vancouver)

### 4.1 The two families in plain words

- **Author-date** (Harvard, APA, Chicago author-date): the text shows the author's surname and year, for example (Lee, 2021). The reference list is **alphabetical** by surname. Readers see *who* and *when* without turning the page. Common in social sciences, business, humanities and some sciences.
- **Numbered** (IEEE, Vancouver/NLM): the text shows a number, for example [1] or a superscript ¹. The reference list is in **order of first citation**. ICMJE: references "numbered consecutively in order of first mention" (ICMJE page above, Verified). Short and tidy. Common in medicine, engineering and computing.

"Harvard" is **not one standard**. The CSL repository has **115 styles with "harvard" in the file name** (GitHub tree, Verified 2026-10-20), each a university's or publisher's variant. Pick one named variant and say which: the `harvard-cite-them-right` CSL style follows "Cite Them Right 12th edition (author-date/Harvard)" (style file title, Verified, fetched). Cite Them Right is Bloomsbury's referencing guide: https://www.citethemrightonline.com/ (Verified).

### 4.2 The same sentence in both styles (made-up sources)

| | Author-date (Cite Them Right Harvard) | Numbered (IEEE) |
|---|---|---|
| One source | Night shifts shorten sleep (Lee, Patel and Okafor, 2021). | Night shifts shorten sleep [1]. |
| Author as subject | Lee, Patel and Okafor (2021) found that… | Lee *et al.* [1] found that… |
| Two sources | …shorten sleep (Lee, Patel and Okafor, 2021; Moreno *et al.*, 2023). | …shorten sleep [1], [2]. |
| Direct quote with page | "…sleep debt accumulates across rotations" (Lee, Patel and Okafor, 2021, p. 14). | "…sleep debt accumulates across rotations" [1, p. 14]. |
| Same author, same year | (Moreno, 2020a; Moreno, 2020b) | Each is just a different number: [3], [4]. |
| Three consecutive sources | (Lee, Patel and Okafor, 2021; Moreno, 2020a; Moreno *et al.*, 2023) | [1]–[3] |

Reference list entries for the first source:

- Harvard (Cite Them Right pattern): Lee, A., Patel, R. and Okafor, C. (2021) 'Short sleep in shift nurses', *Example Journal of Nursing*, 12(3), pp. 10–20. Available at: https://doi.org/10.0000/example.
- IEEE: [1] A. Lee, R. Patel, and C. Okafor, "Short sleep in shift nurses," *Example J. Nurs.*, vol. 12, no. 3, pp. 10–20, 2021, doi: 10.0000/example.

All names, titles and DOIs above are invented for illustration.

### 4.3 Edge cases and where the rule comes from

| Rule | Author-date | Numbered | Source |
|---|---|---|---|
| When to use *et al.* in the text | APA 7: three or more authors. Cite Them Right CSL: four or more (`et-al-min="4"`). | IEEE text uses the number, so this rarely matters. | APA: https://apastyle.apa.org/style-grammar-guidelines/citations/basic-principles/author-date (Verified). CTR: `harvard-cite-them-right.csl` (Verified). The Cite Them Right book itself is **UNVERIFIED**. |
| *et al.* in the reference list | APA CSL lists up to 19 names, then ellipsis and the last name (`et-al-min="21" et-al-use-first="19" et-al-use-last="true"`). | NLM: first six authors then "et al." when there are more than six (the page also notes NLM now lists all authors). IEEE CSL: `et-al-min="7" et-al-use-first="1"`. | https://www.nlm.nih.gov/bsd/uniform_requirements.html (Verified); `apa.csl`, `ieee.csl` (Verified). The IEEE Reference Guide itself would not load: **UNVERIFIED** against the guide. |
| Same author, same year | Add a, b: 2020a, 2020b (APA). | Not needed. | https://apastyle.apa.org/style-grammar-guidelines/citations/basic-principles/same-author-same-date (Verified) |
| Several works in one bracket | APA: alphabetical, separated by semicolons. | Each number; a run becomes a range. | Same APA page. Numeric `nlm-citation-sequence.csl` uses `collapse="citation-number"`, so 1, 2, 3 becomes 1–3. The IEEE CSL prints `[1], [2], [3]` with no range collapsing. The IEEE guide's `[1]–[3]` form is **UNVERIFIED** this session. |
| Page numbers | Needed for direct quotes (APA). | `[1, p. 14]` form. | APA author-date page (Verified). The IEEE form is **UNVERIFIED** against the guide. |
| Numbering order | Not applicable | Order of first mention; a reused source keeps its first number. | ICMJE page (Verified) |

### 4.4 Implementation approach

**Data model.** The repo already has a structured reference: `CitationRecord` in `src/lib/citations/types.ts` (authors as family/given, title, journal, year, volume, issue, pages, DOI, PMID, status, retraction). It also has hand-written formatters (`apa.ts`, `ama.ts`, `vancouver.ts`), BibTeX/RIS export (`export.ts`), a style picker (`src/components/CitationStyleBar.tsx`: Vancouver, APA, AMA, BibTeX, RIS) and retraction checks (`status.ts`). There is **no Harvard or IEEE formatter yet, and no CSL processor**.

1. Add `toCslJson(record: CitationRecord, clipId: string)`. CSL-JSON is the data format CSL processors read (schema repo, MIT: https://github.com/citation-style-language/schema). Set `id` to the clip ID or a stable reference ID, so a citation in the text always points at a clip.
2. In the paper document, store a citation as a node `{ type: 'citation', items: [{ id, locator?: '14', label?: 'page', prefix?, suffix?, suppressAuthor? }] }`. Store **no rendered text** in the document.
3. **Render** on display: walk the document in order, pass citation clusters to the processor with the chosen style, get back the in-text strings and the bibliography. Numbered styles depend on order, so re-render the whole document whenever citations move. That is cheap for one paper.
4. **Links.** Each in-text marker is `<a href="#ref-<id>">`; each reference entry has `id="ref-<id>"` and a back-link list ("cited in §2, §4") to each marker anchor. Pandoc's `link-citations` option does the same, and it applies only to author-date and numerical styles: https://pandoc.org/MANUAL.html (Verified).
5. **Style switch** changes only `citationStyleId` and re-renders.

**Processor choice and licences:**

| Option | Licence | Fit |
|---|---|---|
| **citeproc-js** (the reference CSL processor, used by Zotero) | "EITHER" CPAL-1.0 "OR" AGPL-3.0 (LICENSE file, https://github.com/Juris-M/citeproc-js, Verified). npm `citeproc` 2.4.63 declares `CPAL-1.0 OR AGPL-1.0` (npm registry, Verified). | Runs every CSL style correctly. For a closed-source hosted app, AGPL's network clause would require publishing source, and CPAL has attribution terms. Get a licence read before shipping. **The obligations themselves are not verified here; this is not legal advice.** |
| **citation-js** (`@citation-js/core`, `@citation-js/plugin-csl` 0.9.0) | MIT (npm, Verified) | Friendly API, parses BibTeX/RIS/DOI. **But `@citation-js/plugin-csl` depends on `citeproc`** (npm dependency list, Verified), so the citeproc-js licence comes with it. |
| **Extend the in-house formatters** | Own code | Add `harvard.ts` (Cite Them Right) and `ieee.ts` beside `apa.ts` and `vancouver.ts`, using the CSL files as the written spec. Handles the four styles needed for the MVP, with tests, and no licence question. Does not scale to thousands of styles. |
| **hayagriva** (Typst's bibliography engine, Rust) | Apache-2.0 (GitHub API, Verified) | Reads CSL styles. No official JS/WASM build found this session (**UNVERIFIED**). |

**CSL style files** are CC BY-SA 3.0. Software using them "must include a clear mention of the CSL project and a link to https://citationstyles.org/" (styles README, Verified). Put this in the About page and the style picker.

**Recommendation for the MVP:** extend the in-house formatters behind a CSL-JSON-shaped interface (`renderCitations(doc, styleId)`). Decide on citeproc-js once its licence is cleared, and swap it in behind the same interface.

**Editor options:**

| Option | Licence | Citation support |
|---|---|---|
| **TipTap** (on ProseMirror) | `@tiptap/core` 3.32.0 MIT (npm, Verified) | Custom inline atom node `citation` with attrs `{items}`, rendered by a React node view. TipTap also has `@tiptap/extension-mathematics`, which uses KaTeX (https://tiptap.dev/docs/editor/extensions/nodes/mathematics, Verified). Whether that extension is free or paid is **UNVERIFIED**. |
| **ProseMirror** directly | MIT (GitHub API, Verified). The GitHub mirrors are archived; the source "has moved to https://code.haverbeke.berlin/prosemirror/" (prosemirror-model README, Verified). | Same node approach, more boilerplate. |
| **Lexical** (Meta) | MIT, 0.52.0 (npm, Verified) | Custom `DecoratorNode`. Still pre-1.0. |
| **Markdown with Pandoc syntax** | n/a | `[@doe99; @smith2000]`, `[see @doe99, pp. 33-35]`, `[-@smith04]` to suppress the author, and `@smith04 says` for author in the text (https://pandoc.org/MANUAL.html, Verified). Fits the existing `react-markdown` + `remark-gfm` stack and `MarkdownWorkspace`. Plain text survives copy and paste. Users must type keys. |

Suggestion: use TipTap for the writing surface, with the citation node inserted from a clip picker (no typing keys). Export to Markdown with Pandoc `[@id]` syntax, so users can take the draft to Pandoc or LaTeX later.

---

## 5. Rendering: equations, symbols, figures, the page look

### 5.1 Equations

| | KaTeX | MathJax |
|---|---|---|
| Licence | MIT (GitHub API; npm `katex` 0.19.0, Verified) | Apache-2.0 (GitHub `mathjax/MathJax-src`; npm `mathjax` 4.1.3, Verified) |
| Input | LaTeX subset | LaTeX, MathML, AsciiMath |
| Output | `htmlAndMathml` (default), `html` or `mathml`. The default gives "HTML for visual rendering" plus MathML for accessibility: https://katex.org/docs/options (Verified) | CHTML or SVG. v4 adds font choice, line breaking for inline and display maths, and built-in speech and an expression explorer for screen readers: https://docs.mathjax.org/en/latest/ (Verified) |
| Chemistry | mhchem `\ce{}` as a separate script: "This extension isn't part of core KaTeX": https://github.com/KaTeX/KaTeX/tree/main/contrib/mhchem (Verified) | mhchem extension (listed in docs nav, Verified as a topic only) |
| Numbering | `\tag` on rows of `align`, `gather` and similar; starred forms are unnumbered: https://katex.org/docs/supported (Verified). `\label`, `\ref` and `\eqref` were not listed (**UNVERIFIED**), so number equations in the app, not in LaTeX. | Has its own equation numbering (not checked this session) |
| Macros | `\newcommand`, `\def` and a `macros` option, up to 9 arguments (supported page, Verified) | Yes |
| Safety | `trust: false` by default blocks commands such as `\includegraphics` (options page, Verified) | n/a |
| Pick | **Default.** Fast, synchronous, works well in a live preview. | Use if users need line-broken long equations or richer accessibility. |

**MathML Core in browsers.** Chrome 109 shipped MathML Core on by default (Igalia, the implementer: https://igalia.com/2023/01/10/Igalia-Brings-MathML-Back-to-Chromium.html, Verified snippet). MDN marks MathML Baseline, "available across browsers since January 2023": https://developer.mozilla.org/en-US/docs/Web/MathML (Verified). So KaTeX's MathML output is readable by browsers and assistive tools without a polyfill. Visual rendering still comes from KaTeX's HTML.

**Sub/superscripts and Greek outside maths:** HTML `<sub>`/`<sup>` and Unicode (α, β, μ, ±, ≤, °, ×). Typed as `H<sub>2</sub>O` or entered via a symbol palette. Chemistry inline in prose: `\ce{H2SO4}` via mhchem.

**Fonts with good maths and symbol coverage:**
- STIX Two: OFL-1.1, "OpenType Unicode fonts for Scientific, Technical, and Mathematical texts" (https://github.com/stipub/stixfonts, Verified).
- Noto Sans Math: OFL-1.1 (https://github.com/notofonts/math, Verified).
- Latin Modern (the LaTeX look): GUST Font License. **UNVERIFIED** this session; check https://www.gust.org.pl/projects/e-foundry/latin-modern.
- The repo already ships `dejavu-fonts-ttf` (devDependency), which has wide Unicode coverage.
- Use STIX Two Text for body text in the preview, which matches many journals' serif look, and KaTeX's own fonts for maths.

### 5.2 Figures, tables and cross-references

- Figures and tables are document nodes with `{ id, kind: 'figure'|'table', caption, sourceClipId?, image? }`. Number them in a render pass, in order of appearance: "Figure 1", "Table 2". Cross-references are nodes `{ type: 'xref', target: id }`, rendered as "Figure 3" and linked. Never type numbers by hand.
- Images from clipped PDFs: pdf.js (Apache-2.0, `pdfjs-dist` 6.x, already in the repo) renders a page region to canvas, and the existing cropper produces PNGs. Keep `sourceClipId` and the page number, so the caption can carry "Reproduced from [ref], p. N" and the user sees the permission question (section 7).
- Tables: an editable table node. A table pulled out of a PDF must show the source page image beside it for checking.

### 5.3 The "real page" look

| Option | Licence | Trade-off |
|---|---|---|
| **paged.js** | MIT (GitHub and npm 0.4.3, Verified) | Polyfills W3C CSS Paged Media and Generated Content in the browser: `@page`, margin boxes for running headers and page numbers, page breaks (https://github.com/pagedjs/pagedjs, Verified). Best fit for an HTML preview. Re-paginating a whole paper on every keystroke is heavy, so debounce it or paginate on demand. Maintenance pace is **UNVERIFIED**; the repo shows 201 open issues. |
| **Native CSS `@page` + margin boxes** | Browser | "From Chrome 131 you can use CSS to add content to the margins of pages when they are printed" (https://developer.chrome.com/blog/print-margins, Verified). Good for print-to-PDF; it does not paginate on screen. |
| **Vivliostyle** | **AGPL-3.0** (`@vivliostyle/core` 2.45.2 on npm; vivliostyle.js and vivliostyle-cli on GitHub, Verified) | Strong CSS typesetting. AGPL is risky for a closed-source hosted app. |
| **Typst** via **typst.ts** (WASM) | Typst Apache-2.0; typst.ts Apache-2.0 (Verified) | Real typesetting engine in the browser; renders to SVG or canvas (https://github.com/Myriad-Dreamin/typst.ts, Verified). Maths uses **Typst syntax, not LaTeX** (same page), so you would need to convert from LaTeX. The default bundle fetches fonts from GitHub. A second rendering path to maintain. |
| **Pandoc** | GPL-2.0 (GitHub API, Verified) | Converts Markdown with `[@cite]` to DOCX, LaTeX, PDF or JATS, with `--citeproc` and `--csl` (https://pandoc.org/MANUAL.html, Verified). Run it server-side or in CI as an **export** step, not for the live preview. Running an unmodified GPL program as a separate process on a server is generally not treated as distribution, but **this is not legal advice and is UNVERIFIED**. Shipping it inside a desktop or extension build would be. |
| `@react-pdf/renderer` | Already in `package.json` | Builds PDFs from React components. No CSS paged media, no KaTeX. Not a fit for the preview. |

Recommended: HTML preview with Tailwind-free print CSS (two columns via CSS `columns: 2`), paged.js for page boxes on demand ("Show as pages" toggle), browser print-to-PDF for a local copy watermarked "Preview".

### 5.4 What will not render well

- **TikZ, PGFPlots, custom LaTeX packages and class files**: KaTeX and MathJax render maths only, not LaTeX documents or drawings. Ask for an image instead.
- **User macros**: supported only if defined in the app's macro table.
- **Equations extracted from PDFs**: pdf.js gives glyphs and positions, not LaTeX. Rebuilding LaTeX needs an OCR model (Nougat, Marker, Docling), which makes mistakes. Tesseract (already in the repo) is a text OCR engine and is not designed for maths layout. That is my assessment, not a measured result.
- **Exact journal typography**: fonts, spacing and hyphenation will differ from the journal's own production. That is one more reason for the permanent banner.
- **Very long tables and wide figures** across two columns: needs a "span both columns" option. paged.js handling of floats is limited (**UNVERIFIED** in detail).

---

## 6. Tooling shortlist (free, open source or free tier)

Free-tier limits change often. Check the linked page before relying on any number.

| Area | Tool | Why | Limits / licence | Verify at |
|---|---|---|---|---|
| LLM | **Groq** (already a BYOK provider in `src/lib/ai/providers.ts`) | Very fast hosted open models | Limits are per organisation. Example base limits: `openai/gpt-oss-120b` 30 RPM, 1K RPD, 8K TPM, 200K TPD. The fetched table did not show Llama models and did not separate Free from Developer tiers. "By default, Groq does not retain customer data for inference requests"; abuse logs are kept up to 30 days. Training on inputs is **not stated** (UNVERIFIED). | https://console.groq.com/docs/rate-limits, https://console.groq.com/docs/your-data |
| LLM | **Gemini API free tier** (`google` BYOK) | Long context, good quality | Free-tier numbers are not on the docs page; it points to AI Studio. Limits are per project and reset at midnight Pacific. **Unpaid tier: Google uses submitted content to improve products, human reviewers may read it, and the terms say "Do not submit sensitive, confidential, or personal information to the Unpaid Services."** In the EEA, Switzerland and the UK, only Paid Services may be used when making API clients available to users. | https://ai.google.dev/gemini-api/docs/rate-limits, https://ai.google.dev/gemini-api/terms |
| LLM | **OpenRouter `:free` models** (BYOK) | Many open models behind one key | 20 requests/min; 50/day, or 1,000/day after buying at least 10 credits. Each provider's data terms apply per model. | https://openrouter.ai/docs/api-reference/limits |
| LLM | **Ollama** (local; already referenced with `qwen2.5:7b`) | Unpublished text never leaves the machine | MIT (GitHub API). Quality is limited by the user's hardware. Library includes Llama 3.1/3.2, Qwen 2.5/3, Gemma 3, Mistral. | https://ollama.com/library |
| Embeddings | **pgvector** (`vector(768)` in `supabase/schema.sql`) + a real embedding model | Semantic retrieval for RAG | pgvector licence shows NOASSERTION on GitHub (PostgreSQL-style licence; check the repo LICENSE). Local options in Ollama: `nomic-embed-text`, `bge-m3`, `mxbai-embed-large`. Today `embeddings.ts` is a hash, not semantic. Match the model's dimensions to the column. | https://github.com/pgvector/pgvector, https://ollama.com/library |
| PDF structure / references | **GROBID** | Header, references (with DOI/PMID), citation contexts, sections, figures, with PDF coordinates | Apache-2.0. Java + Docker. Reference extraction about 0.87 to 0.90 F1. Needs 2 to 4 GB RAM. Not deployable on a serverless free tier; run it locally or on a small VM. | https://grobid.readthedocs.io/en/latest/Introduction/, https://github.com/grobidOrg/grobid |
| PDF text | **pdf.js** (in repo) | Text layer and page images in the browser | Apache-2.0. No table or equation structure. | https://github.com/mozilla/pdf.js |
| PDF to Markdown / equations | **Docling** | Tables, formulas, reading order, local execution | Code MIT; model licences per package. Formula output format not stated (UNVERIFIED as LaTeX). | https://github.com/docling-project/docling |
| | **Marker** | PDF to Markdown with equations | Code Apache-2.0; **weights OpenRAIL-M, free for research, personal use and startups under $5M funding/revenue** | https://github.com/datalab-to/marker |
| | **Nougat** | Academic PDF to LaTeX-flavoured Markdown | Code MIT; **weights CC-BY-NC** (non-commercial). Last push Feb 2025. | https://github.com/facebookresearch/nougat |
| Metadata | **Crossref** (already used in `src/lib/citations/crossref.ts`) | DOI metadata, retraction notices | Public 5 / polite 10 / Plus 150 requests per interval (interval given in `x-rate-limit-interval`); concurrency 1 / 3 / none. | https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/ |
| | **OpenAlex** (`classifyOpenAlex` in `status.ts`) | Works, authors, citation counts | Free key gives 10× the keyless daily budget ($1/day of credits); 10 rps without a key, 30 with one; semantic search 1 rps. | https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication |
| | **Semantic Scholar API** | Papers, citations, abstracts | Keyless: a shared 1000 rps across all unauthenticated users, throttled under load; with a key, 1 rps to start. Data licence: see the API licence page (not read). | https://www.semanticscholar.org/product/api |
| Citation formatting | **CSL styles** | 2,863 independent styles | CC BY-SA 3.0 + attribution to citationstyles.org | https://github.com/citation-style-language/styles |
| | **citeproc-js** / **citation-js** | CSL processing | CPAL-1.0 or AGPL-3.0 / MIT wrapper that depends on citeproc | section 4.4 |
| Editor | **TipTap** / **ProseMirror** / **Lexical** | Rich text with custom citation, figure and math nodes | All MIT | section 4.4 |
| Maths | **KaTeX** / **MathJax** | Equations | MIT / Apache-2.0 | section 5.1 |
| Pages | **paged.js** / Vivliostyle | Paged preview | MIT / **AGPL-3.0** | section 5.3 |
| Typesetting | **Typst** + typst.ts | Alternative engine | Apache-2.0 | section 5.3 |
| Conversion | **Pandoc** | Export to DOCX, LaTeX, JATS | GPL-2.0; run server-side or in CI | section 5.3 |

---

## 7. Limitations and risks

| Risk | What could go wrong | Mitigation |
|---|---|---|
| **Over-trust of the preview** | The user submits the preview PDF or thinks it meets journal rules. | Permanent, non-dismissable banner "Preview only — not journal formatting. Check your journal's author guidelines." Diagonal "PREVIEW" watermark on print. Never use real journal names or logos in the header; use "[Journal name]". No "Submit" wording anywhere. |
| **Hallucination and misattribution** | Fabricated references, real references that do not support the claim (section 3.1). | No model-written references. Clip-ID grounding, `nosource` flags, quote and entailment check. Show the supporting quote on hover. |
| **Journal AI policies** | Undisclosed AI use can be treated as misconduct. ICMJE says non-disclosure may need corrective action and in some cases may be misconduct (paraphrased from the fetched summary). | AI-use log per paper and a draft declaration (section 3.5). |
| **Similarity / plagiarism checks** | Long verbatim clips pasted into prose get flagged by journal similarity checks. Crossref Similarity Check, powered by Turnitin's iThenticate, compares manuscripts with published and web content: https://www.crossref.org/services/similarity-check/ (Verified). Whether it detects AI writing is **UNVERIFIED**. | Mark quoted text visually; warn when a paragraph is mostly clip text; encourage paraphrase plus citation. |
| **Copyright of quotes and figures** | Quoting too much, or reproducing figures from papers. UK law allows quotation subject to "fair dealing", "sufficient acknowledgement" and extent "no more than required" (CDPA 1988 s30(1ZA): https://www.legislation.gov.uk/ukpga/1988/48/section/30, Verified). US fair use weighs four factors: purpose, nature, amount, market effect (https://www.copyright.gov/fair-use/, Verified). Reusing a figure in a publication usually needs permission or an open licence. | Keep the source on every quote and figure; caption "Reproduced from…"; flag figures from non-open-licence sources. Not legal advice. |
| **Privacy of unpublished research** | Draft text and data sent to free LLM tiers. Gemini's unpaid tier uses content to improve products and allows human review (terms above). | Default AI off. Show a per-provider data note at the point of use. Offer Ollama (local) as the private option. Do not send drafts to free Gemini by default; show the notice when a user picks it. |
| **Papers without metadata** | Offline PDFs, scans or grey literature with no DOI. | Existing manual citation flow (`manual.ts`), with `missingFields` shown as "incomplete" and never guessed (Decision 7 in `types.ts`). GROBID header extraction as a helper, marked "check". |
| **PDF extraction errors** | Wrong numbers in tables, broken equations, merged columns. | Always show the page image next to extracted content; never auto-insert extracted numbers into Results. |
| **Field variation** | One template looks wrong for humanities or CS. | Templates as config (2.3); say which field each template suits. |
| **Rate limits** | Free tiers run out mid-draft (OpenRouter 50/day). | Queue and cache; per-section calls; graceful "AI unavailable, keep writing" state. |
| **Retracted sources** | Citing a withdrawn paper. | Existing `status.ts` retraction check. Show the amber notice on the citation in the preview too. |
| **Accessibility** | Maths and paged layout unreadable to screen readers. | KaTeX `htmlAndMathml` output; real headings (`h1` to `h3`); alt text required on figures; the preview is a view of the editor content, so the editor itself stays the accessible surface. |

---

## 8. Recommended MVP and build order (solo builder, zero budget)

Principle: the preview is a **view of structured content**. Build the structure and citations first; AI comes last and only on top of the grounding pipeline.

1. **Paper document model and template config.** `Paper { templateId, citationStyleId, sections{key: TipTap JSON}, figures, endMatter, aiLog }` stored per project. Ship template A (IMRaD) as config. Done when: a paper saves, loads and lists its sections.
2. **Section editor.** TipTap with headings fixed by the template, per-section guidance text (from section 1.2) and word-count hints. Done when: the user writes in each section and sees "Methods: 0 / ~800 words".
3. **Citation insertion from clips.** A clip picker inserts a `citation` node holding the clip ID, page locator (from the clip's PDF page or text fragment) and prefix or suffix. Add `toCslJson()` from `CitationRecord`. Clips without metadata show "incomplete" (reuse the existing flow). Done when: every citation in the document resolves to a clip.
4. **Citation rendering with a style toggle.** Add in-house `harvard.ts` (Cite Them Right) and `ieee.ts` beside the existing `apa.ts` and `vancouver.ts`. Add one `renderCitations(doc, styleId)` that numbers by first appearance for numeric styles and adds a/b suffixes for author-date styles. Build the linked reference list with back-links. Add the CSL attribution line. Done when: toggling Harvard ⇄ IEEE ⇄ Vancouver re-renders with no change to the stored document, with unit tests for the edge cases in 4.3.
5. **Preview pane.** A right-hand pane rendering the paper as an article: title-page block (section 1.3), abstract, two-column body, end matter, references. Permanent "Preview only — not journal formatting" banner. Done when: the preview updates within about 300 ms of typing (debounced).
6. **Figures and tables with captions and auto-numbering**, plus cross-reference nodes. Figures can come from image clips or PDF crops, with source captions.
7. **KaTeX** inline and display maths (with mhchem), STIX Two fonts, equation numbering done by the app.
8. **Unsourced-claim flags (no AI).** Simple heuristics to start: sentences in Introduction or Discussion containing numbers or words like "studies show" with no citation node get an amber underline. Reuse `claimSupport.ts` to check quoted text against the cited clip.
9. **Template B (review, PRISMA-based)**, with the PRISMA checklist as a sidebar to-do list and a placeholder flow-diagram figure.
10. **"Show as pages"** with paged.js (page numbers, running header with short title), and print-to-PDF watermarked "PREVIEW".
11. **Export**: Markdown with Pandoc `[@id]` citations plus a CSL-JSON file. A server-side Pandoc DOCX export later, after the licence check.
12. **AI, behind grounding** (only after 1 to 8 exist): plug in a real embedding model; "Draft from my clips" per section with clip-ID markers, `nosource` flags, the entailment check pass, the AI-use log and the declaration draft. Default off; local Ollama offered as the private option; data notice per provider.

Later: template C (CS conference); citeproc-js for the full style list once the licence is cleared; GROBID-assisted reference import from PDFs.

---

## Could not verify (summary)

- Science journals' current AI policy wording: policy page returned 403.
- COPE position text: page returned 403; content from a search snippet.
- Nature: where in the manuscript to disclose LLM use (the policy page did not say).
- IEEE Reference Guide details: in-text range form `[1]–[3]`, page form `[1, p. 14]`, and the et al. threshold. The guide redirects to a Google Doc that did not load. Only `ieee.csl` was checked.
- Cite Them Right *book* rules: the et al. threshold of 4 comes from the CSL implementation only.
- PRISMA 2020 checklist item count (27).
- IEEE conference two-column default (the CTAN page did not say).
- KaTeX support for `\label`, `\ref`, `\eqref`.
- TipTap Mathematics extension licence (free or paid).
- Groq: free-plan limits for Llama models, and whether inputs are used for training.
- Gemini free-tier numeric limits (only shown in AI Studio).
- Docling formula output format (LaTeX or not).
- Whether iThenticate / Similarity Check detects AI-written text.
- Latin Modern font licence (GUST Font License).
- hayagriva JS/WASM availability.
- paged.js maintenance pace and float handling.
- Licence obligations of CPAL-1.0 / AGPL for citeproc-js in a hosted app, and of running GPL Pandoc server-side. Get a licence review; this file is not legal advice.
- A measured rate for "overclaiming" by LLMs, as distinct from unsupported claims.

---

## Sources

Policy and guidelines
- ICMJE, Preparing a manuscript for submission: https://www.icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html
- ICMJE, AI use by authors: https://www.icmje.org/recommendations/browse/artificial-intelligence/ai-use-by-authors.html
- COPE, Authorship and AI tools (snippet only): https://publicationethics.org/guidance/cope-position/authorship-and-ai-tools
- Nature Portfolio, AI editorial policy: https://www.nature.com/nature-portfolio/editorial-policies/ai
- Elsevier, Generative AI policies for journals: https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals
- Thorp HH. ChatGPT is fun, but not an author. *Science* 2023;379:313. doi:10.1126/science.adg7879
- Thorp HH. Resisting AI slop. *Science* 2026;391:5. doi:10.1126/science.aee8267
- APA, Order of pages: https://apastyle.apa.org/style-grammar-guidelines/paper-format/order-pages
- APA, Author–date citation system: https://apastyle.apa.org/style-grammar-guidelines/citations/basic-principles/author-date
- APA, Same author same date: https://apastyle.apa.org/style-grammar-guidelines/citations/basic-principles/same-author-same-date
- NLM, Samples of formatted references: https://www.nlm.nih.gov/bsd/uniform_requirements.html
- CRediT (NISO Z39.104-2022): https://credit.niso.org/
- EQUATOR Network reporting guidelines: https://www.equator-network.org/reporting-guidelines/
- PRISMA 2020: https://www.prisma-statement.org/prisma-2020 ; Page MJ et al. *BMJ* 2021;372:n71. doi:10.1136/bmj.n71
- Hopewell S et al. CONSORT 2025 statement. *BMJ* 2025. doi:10.1136/bmj-2024-081123
- von Elm E et al. STROBE statement. *Lancet* 2007. doi:10.1016/s0140-6736(07)61602-x
- Tong A, Sainsbury P, Craig J. COREQ. *Int J Qual Health Care* 2007. doi:10.1093/intqhc/mzm042
- O'Brien BC et al. SRQR. *Acad Med* 2014. doi:10.1097/acm.0000000000000388
- acmart (CTAN): https://ctan.org/pkg/acmart ; source docs: https://raw.githubusercontent.com/borisveytsman/acmart/master/acmart.dtx
- IEEEtran (CTAN): https://ctan.org/pkg/ieeetran
- Cite Them Right: https://www.citethemrightonline.com/
- UK CDPA 1988 s30: https://www.legislation.gov.uk/ukpga/1988/48/section/30
- US Copyright Office, Fair use: https://www.copyright.gov/fair-use/
- Crossref Similarity Check: https://www.crossref.org/services/similarity-check/

Studies on LLM reliability
- Walters WH, Wilder EI. Fabrication and errors in the bibliographic citations generated by ChatGPT. *Sci Rep* 2023;13:14045. doi:10.1038/s41598-023-41032-5
- Bhattacharyya M et al. High rates of fabricated and inaccurate references in ChatGPT-generated medical content. *Cureus* 2023;15:e39238. doi:10.7759/cureus.39238
- Chelli M et al. Hallucination rates and reference accuracy of ChatGPT and Bard for systematic reviews. *J Med Internet Res* 2024;26:e53164. doi:10.2196/53164
- Wu K et al. An automated framework for assessing how well LLMs cite relevant medical references. *Nat Commun* 2025;16:3615. doi:10.1038/s41467-025-58551-6
- Magesh V et al. Hallucination-free? Assessing the reliability of leading AI legal research tools. *J Empir Leg Stud* 2025;22:216-242. doi:10.1111/jels.12413 ; arXiv:2405.20362
- Liu NF et al. Lost in the middle. *TACL* 2024;12:157-173. doi:10.1162/tacl_a_00638
- Padmakumar V, He H. Does writing with language models reduce content diversity? ICLR 2024. arXiv:2309.05196

Citation tooling
- CSL styles and licensing: https://github.com/citation-style-language/styles
- CSL schema: https://github.com/citation-style-language/schema
- citeproc-js licence: https://github.com/Juris-M/citeproc-js
- citation-js: https://github.com/citation-js/citation-js
- hayagriva: https://github.com/typst/hayagriva
- Pandoc manual: https://pandoc.org/MANUAL.html ; licence: https://github.com/jgm/pandoc

Rendering
- KaTeX supported functions: https://katex.org/docs/supported ; options: https://katex.org/docs/options ; mhchem: https://github.com/KaTeX/KaTeX/tree/main/contrib/mhchem
- MathJax docs: https://docs.mathjax.org/en/latest/ ; source: https://github.com/mathjax/MathJax-src
- MDN MathML: https://developer.mozilla.org/en-US/docs/Web/MathML
- Igalia, MathML in Chromium 109: https://igalia.com/2023/01/10/Igalia-Brings-MathML-Back-to-Chromium.html
- Chrome print margin boxes: https://developer.chrome.com/blog/print-margins
- paged.js: https://github.com/pagedjs/pagedjs
- Vivliostyle: https://github.com/vivliostyle/vivliostyle.js
- typst.ts: https://github.com/Myriad-Dreamin/typst.ts ; Typst: https://github.com/typst/typst
- STIX Two: https://github.com/stipub/stixfonts ; Noto Sans Math: https://github.com/notofonts/math
- TipTap Mathematics: https://tiptap.dev/docs/editor/extensions/nodes/mathematics
- ProseMirror model (moved): https://github.com/ProseMirror/prosemirror-model
- Lexical: https://github.com/facebook/lexical

AI, PDF and metadata services
- Groq rate limits: https://console.groq.com/docs/rate-limits ; data: https://console.groq.com/docs/your-data
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits ; terms: https://ai.google.dev/gemini-api/terms
- OpenRouter limits: https://openrouter.ai/docs/api-reference/limits
- Ollama library: https://ollama.com/library ; https://github.com/ollama/ollama
- pgvector: https://github.com/pgvector/pgvector
- GROBID: https://grobid.readthedocs.io/en/latest/Introduction/ ; https://github.com/grobidOrg/grobid
- pdf.js: https://github.com/mozilla/pdf.js
- Docling: https://github.com/docling-project/docling
- Marker: https://github.com/datalab-to/marker
- Nougat: https://github.com/facebookresearch/nougat
- Crossref access: https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/
- OpenAlex limits: https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication
- Semantic Scholar API: https://www.semanticscholar.org/product/api

Licence and version facts for npm packages (katex, mathjax, pagedjs, @tiptap/core, prosemirror-view, lexical, @vivliostyle/core, @myriaddreamin/typst.ts, pdfjs-dist, citeproc, @citation-js/core, @citation-js/plugin-csl) were read from https://registry.npmjs.org on 2026-10-20. GitHub licence IDs were read from https://api.github.com/repos/{owner}/{repo} on the same date.
