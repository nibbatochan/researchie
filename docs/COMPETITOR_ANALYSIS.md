# Researchie competitor analysis

Date: 2026-10-16. Competitors: Zotero, Notion, NotebookLM, Obsidian.

Evidence note: the competitor facts below come from web searches run on 2026-10-16. Several sources are blogs or rival vendors, so treat the claims marked "unverified" as leads, not facts. Check each against the vendor's own pages before using it in marketing or in a pitch.

## 1. What each competitor is for

| Tool | Core job | Where it is strong | Where it is weak for a researcher |
| :--- | :--- | :--- | :--- |
| Zotero | Reference manager | Citations, free, huge style library, PDF reader, annotations became searchable items in Zotero 8 | No built-in AI answers over the library (community plugins like ZotSeek add semantic search, but only for papers already in the library). Capture is paper-centric: a web page is a snapshot, not a located passage. No synthesis or thinking space. |
| Notion | Team workspace and database | Easy for non-technical collaborators, databases, sharing | No native PDF annotation. The web clipper gives little control (cannot clip part of a page or pick properties) and needs a connection. Content is held in Notion's format (lock-in risk). Not built for source provenance. |
| NotebookLM | AI answers over uploaded sources | Grounded chat with in-source citations, audio and video overviews, a three-column Sources / Chat / Studio layout | Each notebook is a silo. Free tier caps at 50 sources per notebook. Web import is text-only and skips paywalled pages. Citations point to your upload, not a scholarly citation (no DOI, no BibTeX/RIS). Users do not control retrieval. Reports of "source blindness" and gap-filling after a model change (unverified, secondary source). |
| Obsidian | Local Markdown knowledge base | Ownership, plain files, links and graph, huge plugin ecosystem | Research workflows depend on stitched plugins (Zotero, PDF, clipper) that break between versions. The official clipper lacks multi-colour highlights and comments. No native AI grounded in sources. Setup cost is high. |

## 2. What they all share (table stakes)

Researchie must match these, and mostly does already:

- Save web content and PDFs. (Researchie: text, DOM block, image, link, PDF.)
- Notes and linking.
- Citation export. (Researchie: Vancouver, APA 7, AMA 11, BibTeX, RIS.)
- AI chat over your own material. (Researchie: grounded Document Assistant with page citations.)
- Export to Markdown. (Researchie: Obsidian vault, Notion push, PDF report.)

None of these is a reason to choose Researchie. They are the entry fee.

## 3. The gap nobody fills: provenance and trust

Look at the weak column above. The same hole appears in all four tools:

1. **No tool keeps the exact passage and its live source together.** Zotero saves a page snapshot. Notion saves a bookmark or pasted text. NotebookLM saves extracted text. Obsidian saves Markdown with a URL. Researchie already saves a W3C text-fragment link, a cached snapshot and the surrounding context.
2. **No tool tells you when a source goes bad.** A retracted paper, a changed web page, a dead link: every competitor leaves you to find out alone.
3. **No tool proves an AI claim.** NotebookLM cites a place in your upload. It does not show that the sentence is supported, and it does not give a citation you can paste into a paper.
4. **No tool treats the research question as the unit of work.** All four organise by file, page or notebook. A researcher organises by question.

Researchie already owns pieces of 1 and 3 (text fragments, verified quotes, claim support, verified DOI, retraction check). That is the foundation for a real position instead of a feature list.

## 4. Proposed position

**Researchie is the research workbench where every claim can be traced to its source and the sources are watched for you.**

One sentence for a researcher: "Clip from anywhere, keep the exact passage, and know which of your claims still stand."

This is a position, not a feature. Everything added below must serve it. If a feature does not make a claim more traceable, more trustworthy, or cheaper to verify, it does not go in.

## 5. Differentiators, ranked by fit with the position

Each item says what exists today, what is missing, and a size guess (S/M/L).

### Pillar A: Source health (the clearest gap, no competitor has it)

1. **Retraction and correction watch on saved clips.** Exists: one-time retraction check at citation time. Missing: re-check on a schedule and flag affected clips, notes and synthesis outputs. Size M.
2. **Page-changed detection.** Exists: cached snapshot per clip. Missing: re-fetch, compare the clipped passage, flag "changed", "moved" or "gone", and offer the archived copy. Size M.
3. **Source health dashboard.** One screen per project: sources verified, unverified, changed, retracted, dead. Size S once 1 and 2 exist.

### Pillar B: Question-first workspace (changes how it feels, not just what it does)

4. **Research question as a first-class object.** A project holds questions. Each clip is tagged at capture as evidence for, against, or context for a question. Size M.
5. **Evidence matrix per question.** Rows are sources, columns are the claims, cells show supports, contradicts, or silent. Built from tags plus AI suggestions the user confirms. Size L.
6. **Contradiction finder.** Surface two clips that disagree and show both passages side by side with their sources. NotebookLM-style tools blend sources into one smooth answer; this one shows the disagreement. Size M.
7. **Gaps list.** "Questions with no or weak evidence" and "claims supported by one source only". Size S once 4 exists.

### Pillar C: Proof you can carry out (extends what is built)

8. **Claim-level provenance in every output.** Synthesis, memo and PDF report: each sentence links back to clip, page and passage, and the link survives export to Notion and Obsidian. Exists for Q&A; extend to synthesis and exports. Size M.
9. **Source type and strength label.** Peer-reviewed, preprint, dataset, news, blog, forum. Filter synthesis by tier ("answer from peer-reviewed only"). Uses data the citation engine already resolves. Size S.
10. **Audit view for a finished report.** One click lists every claim with its quote, source, verification state and any warning. This is what a reviewer or supervisor wants. Size M.

### Pillar D: Ownership (cheap, answers real complaints)

11. **Local-first and bring-your-own-key option.** Answers Notion lock-in and NotebookLM silos. The Ollama path already exists as a base. Size M.
12. **Open, lossless export** with provenance fields kept (already partly true: `researchie_atom_id` in Obsidian frontmatter). Size S.

## 6. What not to build

- Audio and video overviews, mind maps, flashcards. NotebookLM has them and they do not serve the position.
- A general-purpose notes or database app. Notion and Obsidian own that.
- A full reference-manager clone (group libraries, thousands of styles). Zotero owns that. Integrate (import and export) instead.
- Real-time collaboration, for now. It is already marked provisional. Revisit after Pillars A to C.

## 7. Making it look and feel different

The product should not read as a generic notes app. Concrete direction that fits the position:

- **Show trust visually.** A small verification state on every clip (verified, unverified, changed, retracted). Colour carries meaning, not decoration.
- **The question is the home screen.** Open a project and see questions with evidence counts, not a feed of cards.
- **Keep the dark, restrained look** already in `DESIGN_SYSTEM.md`, and spend the one accent colour on verified or changed states so it stays meaningful.
- **Plain language.** "This page changed since you clipped it" beats "snapshot diff detected".

## 8. Suggested order

1. Source health (items 1 to 3). Smallest gap to a unique claim, builds on the citation engine and snapshots.
2. Question tags at capture (item 4), then gaps (7) and contradictions (6).
3. Provenance in synthesis and exports (items 8, 10).
4. Evidence matrix (item 5) once the tags have real data.
5. Source type labels (9) can slot in at any point.

## 9. First target user: students writing a thesis (decided 2026-10-16)

What a thesis student needs, and how it changes the order above:

- **Literature review matrix.** The evidence matrix (item 5) is the literature review table a thesis needs. Move it up: it is the feature a student would open the product for.
- **Chapters as questions.** A thesis chapter is a research question with evidence. Item 4 maps directly: a project holds chapters, each chapter holds questions, each question holds tagged clips.
- **Supervisor view.** The audit view (item 10) becomes a read-only share link or PDF the supervisor can check. This also covers the "is my citing honest" worry.
- **Citation styles students actually use.** Today: Vancouver, APA 7 (numbered only), AMA 11. Missing and common in theses: APA author-date with an alphabetical list, Harvard, IEEE, MLA, Chicago. Without author-date APA, many humanities and social-science students cannot use the report. Add to the build order.
- **Getting text into the thesis.** Students write in Word or Google Docs, LaTeX, or Overleaf. BibTeX and RIS exist. Missing: a Word-ready export (.docx with references) and a Zotero/Mendeley import so existing libraries are not abandoned.
- **Retraction and link-rot watch** matters more for a thesis than for casual research: a retracted paper cited in a submitted thesis is a serious problem. Pillar A stays first.
- **Price and storage.** Students are cost-sensitive. The free tier must not cap sources the way NotebookLM's 50-source limit does; keep the local-first option.

Revised order for this user:

1. Pillar A source health (items 1 to 3).
2. Citation styles: APA author-date + alphabetical list, Harvard, IEEE.
3. Chapters and questions with capture-time tags (item 4), then the literature review matrix (item 5).
4. Supervisor view / audit (item 10) and provenance in synthesis (item 8).
5. Word export and Zotero import.
6. Gaps (7) and contradictions (6).

## 10. First field: sciences and medicine (decided 2026-10-16)

Vancouver and AMA 11 already exist, so the citation-style step shrinks. Changes to the order in section 9:

- **Citation styles:** drop APA author-date, Harvard, IEEE from the near-term list. Do the open AMA gaps instead (preprints, datasets, chapters, reports; see `docs/CONTEXT.md` section 4).
- **Evidence level label** (item 9) becomes the medical one: systematic review or meta-analysis, RCT, cohort, case-control, case report, guideline, preprint, other. PubMed publication types give much of this for free through the lookup already built. Filter synthesis and the matrix by level.
- **Question structure:** offer a PICO template (population, intervention, comparison, outcome) when creating a question. The matrix columns follow PICO. Optional, off by default.
- **Retraction and correction watch** (Pillar A) is the strongest pitch here. PubMed and Crossref are already wired for the one-time check.
- **Trial and registry links:** detect a trial registration number (for example ClinicalTrials.gov NCT ids) in a clip and link it. Size S, only after Pillar A.
- **Not yet decided:** whether to support systematic review screening (include/exclude with reasons, PRISMA flow counts). It is a large feature with a dedicated competitor field (Covidence, Rayyan); skip unless students ask.

Revised order for sciences and medicine:

1. Pillar A source health.
2. Chapters and questions with capture-time tags (item 4), with the optional PICO template.
3. Literature review matrix (item 5) with evidence-level columns (item 9).
4. Supervisor view / audit (item 10) and provenance in synthesis (item 8).
5. Remaining AMA forms, Word export, Zotero import.
6. Gaps (7) and contradictions (6).

## 11. Open questions for the owner

- Is local-first a requirement or a nice extra?
- Should the product stay out of systematic-review screening, or is that where the first students will push?
- How much should AI propose automatically (tags, contradictions) versus wait for a click? The position depends on the user trusting what they see, so the default should be "AI proposes, researcher confirms".

## Sources

- [NotebookLM 2026 features overview](https://levelup.gitconnected.com/whats-new-in-notebooklm-2026-a-deep-dive-into-its-latest-features-4c73ac6dee8a)
- [NotebookLM update summary (April 2026 layout)](https://bibigpt.co/en/features/notebooklm-2026-update-explained)
- [NotebookLM for document research: where it works and falls short](https://www.roborhythms.com/notebooklm-for-document-research/)
- [NotebookLM for research workflows (CASRAI)](https://www.casrai.org/guides/notebooklm-for-research-workflows)
- [Source grounding and where NotebookLM falls short](https://peekaboolabs.ai/blog/source-grounding-meaning-explained-how-notebooklm-answers-and-where-it-falls-short-2026-185476)
- [Zotero 8 release notes](https://www.zotero.org/blog/zotero-8/)
- [Zotero 8 overview (heise)](https://heise.de/-11153978)
- [ZotSeek semantic search plugin thread](https://forums.zotero.org/discussion/comment/504744)
- [Zotero alternatives with AI (Paperguide, a rival vendor)](https://paperguide.ai/blog/zotero-alternatives/)
- [Notion Web Clipper alternatives](https://alternativeto.net/software/notion-web-clipper)
- [Notion vs Obsidian for research](https://ponder.ing/blog/notion-vs-obsidian-for-research)
- [Obsidian forum: Notion/Obsidian clipping workflow](https://forum.obsidian.md/t/notion-obsidian-workflow-webclipping-and-note-taking/15067)
- [Obsidian forum: Zotero PDF plugin state](https://forum.obsidian.md/t/pdf-zotero-obsidian-current-state-and-collaboration-for-the-one-plugin/34372)
- [Obsidian forum: feedback on using Obsidian for research](https://forum.obsidian.md/t/feedback-on-using-obsidian-for-research/113855)
