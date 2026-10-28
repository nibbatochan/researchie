# Paper layout in Word, and how DOCX writes it

Checked 2026-10-28. Goal: make `src/lib/paper/docx.ts` output match the paper editor's edit view.

## How to read the source marks

- **P** = primary page or document, read in full or in the part cited, via fetch.
- **P-sum** = primary URL, but the text I got came from a fetch tool that summarised the page. Re-check the wording before quoting.
- **S** = only a search-result summary or a secondary page. Do not rely on it for a quote.
- **NR** = not reachable or not read. Stated as a gap.

Primary sources reached:

- Microsoft Learn Open XML SDK pages. They reproduce ISO/IEC 29500-1 1st ed. clause text, so the quoted spec text is the standard's text (P).
- APA instructional PDFs on apastyle.apa.org (P). The apastyle.apa.org HTML pages returned an empty body to the fetch tool and to curl (bot wall). Only the PDFs were readable.
- MLA Style Center PDF "Formatting a Research Paper" (P). It is from the MLA Handbook 8th ed. (2020 copyright). 9th ed. differences were not checked.
- IEEE Reference Guide PDF v11.12.2018 on journals.ieeeauthorcenter.ieee.org (P).
- NLM sample references and ICMJE "Preparing for submission" (P-sum).

Not reached:

- The ECMA-376 / ISO page itself was not fetched. All OOXML claims below rest on the Microsoft Learn copy of the ISO text.
- Chicago Manual of Style online (redirects to a login).
- AMA Manual of Style (paywalled).
- Harvard has no governing body (see section 2.7).

---

## 1. Editor view today (what the DOCX should match)

All from `src/app/globals.css` lines 596-641 and `src/lib/paper/paginate.ts`. The CSS comment says the type scale was taken from a PLOS ONE article.

| Item | Editor value |
|---|---|
| Page | A4 = 794 x 1123 px at 96 dpi; Letter 816 x 1056 (`paginate.ts` `pageGeometry`) |
| Margins | top = bottom; narrow 48 px, normal 96 px, wide 120 px, or custom `marginPx`. Left and right use `--pm` (same values) |
| Body font | Arial 10 pt, line-height 1.4. Serif option: Georgia / Times New Roman |
| Body paragraphs | justified, `hyphens: auto`, margin-bottom 6 pt. Optional first-line indent 12 pt. Per-paragraph line spacing 1, 1.15, 1.4, 1.5, 2, 2.5, 3 |
| Title | 16 pt bold, line-height 1.25, centered |
| Authors / affiliations / meta line | 9 pt / 8 pt / 8 pt |
| "Abstract" heading | 14 pt bold |
| Front headings | 11 pt bold |
| Section heading (h1) | 11 pt bold, line-height 1.3, margin 14 pt 0 4 pt |
| h2 | 10 pt bold, margin 10 pt 0 2 pt |
| h3 | 10 pt bold italic, margin 8 pt 0 2 pt |
| Captions, notes, table text, references | 8 pt, line-height 1.3, left aligned |
| Reference entries | hanging indent 1.6 em, margin-bottom 3 pt |
| Quote | a normal paragraph in curly quotes plus marker; no indent, no italics |
| Table | 3-line style: 0.75 pt rule above and below the header row, 0.5 pt rule under each row, 8 pt |
| Columns | optional 2 columns, gap 0.33 in |
| Citations | marker text coloured blue, built by `inText.ts` per style (7 styles) |

## 2. What each style guide says

### 2.1 APA 7 (P: APA Student Paper Setup Guide, last updated 2025-10-08, https://apastyle.apa.org/instructional-aids/student-paper-setup-guide.pdf, p. 1-2, 5-7, 16-17)

- Margins: 1 in on all sides (p. 1).
- Font: any legible font. Examples listed: 12 pt Aptos, 11 pt Calibri, 11 pt Arial, 12 pt Times New Roman, 11 pt Georgia. One font throughout; body not bold or italic (p. 1, 7).
- Line spacing: double-space the whole paper, including block quotes and the reference list. No blank lines before or after headings. No extra space before or after paragraphs (p. 1, 6).
- Alignment: left-aligned, ragged right, "Do not use full justification". First line of every paragraph indented 0.5 in (p. 1).
- Page numbers: top right of every page, title page is page 1. No running head for student papers (p. 1).
- Title page (P: https://apastyle.apa.org/instructional-aids/student-title-page-guide.pdf, p. 1):
  - Elements in order: title, authors, affiliation, course, instructor, due date.
  - Placement: upper-middle, 3 or 4 lines below the top.
  - Centered, double-spaced, one element per line. Only the title is bold. One blank double-spaced line between title and authors.
  - Title is in title case.
- Text starts on page 2 and repeats the title at the top, centered and bold. This is a "de facto Level 1 heading" (P: https://apastyle.apa.org/instructional-aids/heading-template-student-paper.pdf, p. 2).
- Headings (setup guide p. 7):
  1. Centered, bold, Title Case.
  2. Flush left, bold, Title Case.
  3. Flush left, bold italic, Title Case.
  4. Indented, bold, Title Case, ends with a period, text runs on the same line.
  5. Indented, bold italic, Title Case, ends with a period, text runs on the same line.
- Reference list (P: https://apastyle.apa.org/instructional-aids/creating-reference-list.pdf, p. 1):
  - Label "References", centered, bold, new page.
  - Alphabetical. Double-spaced within and between entries.
  - Hanging indent: first line flush left, later lines 0.5 in.
  - Names inverted, initials, ampersand before the last author.
  - Journal entry pattern (P: https://apastyle.apa.org/instructional-aids/reference-guide.pdf, 2026): `Author, A. A., & Author, B. B. (Year). Title of the article. *Name of the Periodical, volume*(issue), #-#. https://doi.org/xxxx`. Article title in sentence case, no italics. Periodical and volume italic.
- In-text (P: creating-reference-list.pdf p. 1): parenthetical `(Sanders & Jang, 2020)`, narrative `Sanders and Jang (2020)`. "et al." for three or more authors: S (search summary of apastyle.apa.org), not read on the page.
- Table and figure placement: embed after the call-out. Avoid mid-page placement (setup guide p. 13). Number and title format (bold number, italic title above the table) is in image-only parts of the PDFs: NR. Treat as unverified.
- Professional (journal-submission) title page, running head and abstract layout: pages returned empty. NR.

### 2.2 MLA (P: MLA Style Center, "Formatting a Research Paper", from MLA Handbook 8th ed., https://style.mla.org/app/uploads/sites/3/2020/12/Formatting-a-Research-Paper_v3_-The-MLA-Style-Center.pdf, p. 1-3)

- Margins: 1 in top, bottom and sides (Margins).
- Typeface: readable, example Times New Roman, standard size such as 12 pt. Do not justify the right margin. Turn automatic hyphenation off (Text Formatting).
- Double-space everything, including quotations, notes and the works-cited list. First-line indent 0.5 in. Set-off quotations indented 0.5 in (Text Formatting).
- No title page for a normal paper. First page: starting 1 in from the top, flush left, name, instructor, course number, date on separate double-spaced lines. Then the title centered on its own double-spaced line. Title not italic, underlined, quoted, bold or all caps. No period after the title (Heading and Title).
- Running head: last name + page number, upper right, 0.5 in from the top, flush with the right margin (Running Head).
- Works Cited: new page, title "Works Cited" centered 1 in from top, double-spaced, each entry flush left with later lines indented 0.5 in (hanging indent) (Placement of the List of Works Cited).
- Tables: label "Table" + arabic numeral + title, flush left on separate lines above the table. Notes below. Figures: "Fig. 1." label and caption below the illustration (Tables and Illustrations).
- In-text (P: https://style.mla.org/in-text-citations-overview/): `(Baron 194)`, author and page, no comma in the examples. If the author is named in the sentence, only `(194)`. The page does not state the no-comma rule in words.
- Works-cited entry element order (container model): NR here. The MLA Handbook 9th ed. is the source.

### 2.3 Chicago (author-date)

- In-text and list, from the Turabian 9th author-date quick guide on chicagomanualofstyle.org (P-sum; this is Turabian, Chicago's student manual, not CMOS 18 itself): https://www.chicagomanualofstyle.org/turabian/turabian-author-date-citation-quick-guide.html
  - In-text: `(Kitamura 2017, 25)`. No comma between author and year. Page after a comma. Four or more authors: first author + "et al.".
  - List: alphabetical, `Kitamura, Katie. 2017. *A Separation*. New York: Riverhead Books.`
  - Journal: `LaSalle, Peter. 2017. "Conundrum: A Story about Reading." *New England Review* 38 (1): 95-109.`
- Manuscript layout (font, margins, spacing, hanging indent, caption format): NR. The CMOS online citation guide redirected to a login page. Hanging indent for the list was not found on any page I could read.

### 2.4 IEEE (P: IEEE Reference Guide v11.12.2018, https://journals.ieeeauthorcenter.ieee.org/wp-content/uploads/IEEE-Reference-Guide.pdf, p. 3-4, 12)

- In-text: "on the line, in square brackets, inside the punctuation". Examples: `as shown by Brown [4], [5]; as mentioned earlier [2], [4]-[7], [9]`. Use "et al." when three or more names are given for a reference cited in the text (I.A, p. 3). Locators: `[3, pp. 5-10]`, `[3, Fig. 1]` (I.B).
- Note for `src/lib/citations/inText.ts`: its header comment says IEEE sets no range collapse and the Reference Guide "did not load". The guide does load and it shows ranges (`[4]-[7]`). That comment is stale.
- List: reference numbers "flush left and form a column of their own, hanging out beyond the body of the reference", in square brackets. Given names as initials before the surname. All authors up to six, else first author + "et al." (II, p. 4).
- Journal entry (p. 12): `J. K. Author, "Name of paper," Abbrev. Title of Periodical, vol. x, no. x, pp. xxx-xxx, Abbrev. Month, year.` Example: `W. Rafferty, "Ground antennas in NASA's deep space telecommunications," Proc. IEEE, vol. 82, no. 5, pp. 636-640, May 1994.`
- Page layout (two-column, 10 pt Times, margins): only search hits on ewh.ieee.org template files. NR. Treat as unverified.

### 2.5 Vancouver / NLM (P-sum)

- Entry pattern from NLM "Samples of Formatted References" (https://www.nlm.nih.gov/bsd/uniform_requirements.html): `Halpern SD, Ubel PA, Caplan AL. Solid-organ transplantation in HIV-infected patients. N Engl J Med. 2002 Jul 25;347(4):284-7.` Surname then initials, no periods. Title in sentence case. Journal abbreviation. Based on NISO Z39.29-2005 as adapted by NLM; full rules are in *Citing Medicine*. The fetch summary said more than six authors lists the first six + "et al." and that NLM now lists all authors. Re-check on the page before coding the cut-off.
- Numbering (ICMJE, https://www.icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html): references "numbered consecutively in the order in which they are first mentioned in the text". In text, Arabic numerals in parentheses. References first cited in a table or figure legend are numbered by where that table or figure is first cited.
- Page layout (spacing, margins): the ICMJE page, as summarised, gives none. ICMJE title-page contents: title, authors with degrees, institutions, corresponding author, ORCID, disclaimers, support, word count.

### 2.6 AMA

- Primary (AMA Manual of Style 11th ed., ch. 3 References): NR, paywalled.
- S (search summary of jamanetwork.com JAMA Instructions for Authors, which follows the 11th ed.): numbered in order of first citation, not alphabetised. Superscript Arabic numerals in text, tables and legends. List all authors up to 6; if more than 6, first 3 + "et al.". Journal names abbreviated per the PubMed list. Not read on the page. Treat as unverified.

### 2.7 Harvard

No single authority. `src/lib/citations/harvard.ts` follows Cite Them Right via a CSL file, unchecked against the book. No primary page found or read. Layout rules for "Harvard" papers come from each university.

### 2.8 Honest limit on "layout per style"

APA and MLA require double spacing, left-aligned text and 12 pt (or similar). The editor always renders a journal look (10 pt, 1.4, justified). The citation style menu changes only in-text markers and the reference entries (`inText.ts`). So "match the editor" and "match APA/MLA layout" are different targets. Section 4 below targets the editor. Section 5 lists what a per-style page preset would add.

---

## 3. How a DOCX writes the layout

Spec text below is ISO/IEC 29500-1 1st ed. as reproduced on Microsoft Learn. Unit rule: a twip (twentieth of a point) is 1/20 pt, 1440 per inch.

| Need | Element and attributes | Source |
|---|---|---|
| Page size | `<w:pgSz w:w w:h [w:orient] [w:code]/>`, in twentieths of a point. Spec example for A4: `w:w="11907" w:h="16839"` (11907 = 8.269 in). Word itself writes 11906 x 16838 (computed from 210 x 297 mm; not in the spec page) | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.pagesize (pgSz) |
| Margins | `<w:pgMar w:top w:right w:bottom w:left w:header w:footer w:gutter/>`. Spec example: all sides 1440 = one inch | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.pagemargin (pgMar) |
| Columns | `<w:cols w:num="2" w:space="..."/>`, child of `sectPr`. With `w:equalWidth="0"` use child `<w:col w:w w:space/>`. Spec example uses `w:space="720"` = half an inch | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.columns (cols) |
| Line and paragraph spacing | `<w:spacing w:before w:after w:line w:lineRule/>`. Spec example: `w:line="276" w:lineRule="auto"` = 1.15 x single (276 / 240). So 240 = single, 480 = double, 336 = 1.4. `before`/`after` in twentieths of a point. Between two paragraphs the larger of after and before wins (not the sum). Omitted = inherits through the style hierarchy, and if never set, no spacing | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.spacingbetweenlines (spacing) |
| Indents | `<w:ind w:left w:right w:firstLine w:hanging/>` in twentieths of a point. `hanging` pulls the first line back toward the margin. Spec example `w:left="1440" w:hanging="1080"` | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.indentation (ind) |
| Alignment | `<w:jc w:val="left\|center\|right\|both"/>`. Value list was not printed on the Learn page. `both` = justify is from my knowledge of the schema (unverified here) | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.justification (jc) |
| Font size | `<w:sz w:val>` in half-points. 27 = 13.5 pt. So 10 pt = 20, 16 pt = 32 | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.fontsize (sz) |
| Font face | `<w:rFonts w:ascii w:hAnsi w:cs w:eastAsia/>`. ASCII range uses `ascii` | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.runfonts (rFonts) |
| Document defaults | `<w:docDefaults><w:pPrDefault><w:pPr>...</w:pPr></w:pPrDefault><w:rPrDefault><w:rPr>...</w:rPr></w:rPrDefault></w:docDefaults>` in styles.xml. "Applied first in the style hierarchy." If omitted, defaults are "application-defined by the hosting application" | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.docdefaults (docDefaults) |
| Named styles | `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Heading1Char"/><w:uiPriority w:val="1"/><w:qformat/>...</w:style>` plus formatting (`pPr`, `rPr`) | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.style (style) |
| Outline level | `<w:outlineLvl w:val="0"/>` in `pPr`. Range 0-9; 9 or omitted = no level. It does not change appearance; consumers may use it for TOC and navigation | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.outlinelevel (outlineLvl) |
| Numbered / bulleted lists | `numbering.xml` with `<w:abstractNum w:abstractNumId><w:multiLevelType/><w:lvl w:ilvl><w:start/><w:lvlText w:val="%1."/><w:lvlJc/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`. Content never references `abstractNum` directly; it goes through a `w:num` instance. The paragraph then carries `numPr` (`ilvl`, `numId`; `numPr` itself was not on a page I fetched) | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.abstractnum (abstractNum) |
| Fields (page number, caption number) | `<w:fldSimple w:instr="FILENAME"><w:r><w:t>...</w:t></w:r></w:fldSimple>`. The page confirms the form with `FILENAME`. `PAGE` and `SEQ` as instr values are standard field codes (clause 17.16.5), not shown on the page I read | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.simplefield (fldSimple) |

Not fetched this session, so unverified here: `sectPr` child order (headerReference/footerReference, pgSz, pgMar, cols, titlePg), `w:vertAlign` superscript, `w:autoHyphenation` in settings.xml, `w:drawing` for pictures, `w:tblBorders` per-edge sizes, the package relationships part (`word/_rels/document.xml.rels`) and its content types. Check these in ECMA-376 Part 1 (https://ecma-international.org/publications-and-standards/standards/ecma-376/) before relying on them.

---

## 4. Gaps: current `docx.ts` versus the editor view

Current `docx.ts` facts: direct formatting only. No styles.xml, numbering.xml, header, footer or document.xml.rels. The zip holds `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`. `sectPr` is A4 (11906 x 16838) with 1440 margins and header/footer 708.

Twip arithmetic used: px x 15 = twips at 96 dpi; pt x 20 = twips; pt x 2 = `w:sz`.

| # | Editor view | `docx.ts` now | Fix: element and attribute | Source |
|---|---|---|---|---|
| 1 | Custom margins 48 / 96 / 120 px or `marginPx` (top = bottom, left/right same) | Fixed 1440 on all sides | `pgMar w:top/bottom/left/right = px*15` (48 -> 720, 96 -> 1440, 120 -> 1800). Needs the meta passed in; `markdownToDocx(markdown)` has only the Markdown | pgMar |
| 2 | Letter page option 816 x 1056 | A4 only | `pgSz w:w="12240" w:h="15840"` for Letter (derived: 8.5 x 11 in x 1440; not in a fetched page) | pgSz |
| 3 | Body Arial 10 pt (Georgia/TNR if serif) | No font set; falls to application default | `docDefaults/rPrDefault/rPr`: `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/>`. Needs styles.xml + a `styles` relationship | docDefaults, rFonts, sz |
| 4 | Line height 1.4 | none (single) | `docDefaults/pPrDefault/pPr/spacing w:line="336" w:lineRule="auto"` | spacing |
| 5 | Paragraph gap 6 pt, justified, hyphenated | none, left aligned | `spacing w:after="120"`, `jc w:val="both"`; hyphenation via settings.xml `w:autoHyphenation` (unverified). Per-paragraph `data-align` -> `jc` left/center/right/both; `data-indent="first"` -> `ind w:firstLine="240"`; `data-line` -> `spacing w:line` = value x 240 (1 -> 240, 1.15 -> 276, 1.5 -> 360, 2 -> 480, 2.5 -> 600, 3 -> 720) | spacing, jc, ind |
| 6 | Title 16 pt bold centered, line 1.25 | `#` -> 20 pt bold, left, spacing before 240 | Style `Title`: `sz 32`, `b`, `jc center`, `spacing w:line="300" lineRule="auto"` (1.25 x 240). Emit title paragraph with `pStyle Title`. `markdown.ts` writes only `# title` and a comma line, so the DOCX cannot know it is the title block; better to build the block from `meta.front` | style, sz, jc |
| 7 | Authors 9 pt, affiliations 8 pt (numbered), correspondence line 8 pt | one plain paragraph "A, B" | Styles `Authors` (`sz 18`) and `Affiliation` (`sz 16`); needs `meta.front.authors` affiliations from the model, not the Markdown | style |
| 8 | "Abstract" 14 pt bold; front headings 11 pt bold | `## Abstract` -> 15 pt bold | Style `AbstractHeading`: `sz 28 b`; `FrontHeading`: `sz 22 b` | style |
| 9 | Keywords line (editor meta line 8 pt grey) | `**Keywords:** ...` as bold run in body size | Run `sz 16`, colour `w:color w:val="475569"` (colour element unverified here) | rPr |
| 10 | Section heading h1 11 pt bold, 14 pt before, 4 pt after | 20 pt bold, before 12 pt, after 6 pt | Style `Heading1`: `sz 22`, `b`, `spacing w:before="280" w:after="80" w:line="312"`, `keepNext`, `outlineLvl 0` | style, outlineLvl |
| 11 | h2 10 pt bold, 10 pt before, 2 pt after | 15 pt | `Heading2`: `sz 20 b`, `spacing before=200 after=40`, `outlineLvl 1` | style |
| 12 | h3 10 pt bold italic, 8 pt before, 2 pt after | 13 pt bold | `Heading3`: `sz 20 b i`, `spacing before=160 after=40`, `outlineLvl 2` | style |
| 13 | Headings are real structure (editor outline) | Sized bold runs, not Word headings. Header comment says so ("shortcut") | Use `pStyle w:val="Heading1".."Heading3"` and `outlineLvl` so the Word navigation pane works. Levels 4-6: 10 pt bold, `outlineLvl 3..5` | style, outlineLvl |
| 14 | Captions, notes 8 pt, line 1.3 | figure placeholder `[Figure: caption]` italic 10 pt centered | Style `Caption`: `sz 16`, `spacing w:line="312"`, `jc left`. Real image needs a `w:drawing` (unverified) and a media part | style |
| 15 | Reference entries 8 pt, line 1.3, hanging 1.6 em, 3 pt after | `- [@key]: target` bullet items under `## References` with 15 pt heading | Style `Reference`: `sz 16`, `spacing w:after="60" w:line="312"`, `ind w:left="256" w:hanging="256"` (1.6 em x 8 pt = 12.8 pt = 256 twips). Drop the `[@key]:` prefix; write the formatted entry. Heading style `Heading1` | ind, spacing |
| 16 | Citations shown as the chosen style's marker (APA `(Smith & Lee, 2020)`, IEEE `[1]`, Vancouver `(1)`, AMA superscript, MLA `(Lee 14)`, Chicago `(Lee 2020, 14)`) | Writes `[@key]` | Run `inText.ts` markers and write them as text runs. AMA: either Unicode superscripts (as `inText.ts` already emits) or `rPr/vertAlign w:val="superscript"` (unverified). Reference list order and numbering must come from the same `inText.ts` call | inText.ts |
| 17 | Reference list order per style (alphabetical vs first-citation) | order of `citedKeys` (first citation) always | Alphabetical for APA, Harvard, MLA, Chicago; first-citation numbering for IEEE, Vancouver, AMA, from `inText.ts` | APA p.1 (creating-reference-list), IEEE II, ICMJE |
| 18 | Quote: curly quotes + marker, no indent, no italics | `>` -> `ind w:left="720"` | Remove the indent. Wrap in U+201C/U+201D, put the marker after the closing quote | ind |
| 19 | Lists: round bullets / decimal, 1.5 rem indent | Fake bullets: a "•" text run + `ind left=360+..., hanging=360` | `numbering.xml`: one `abstractNum` with bullet `lvl` and one decimal `lvl` (`lvlText w:val="%1."`), `ind left=720 hanging=360` as in the spec example; paragraphs carry `numPr`. Add `numbering.xml` to content types and rels | abstractNum |
| 20 | Tables: 8 pt, header row 0.75 pt rules above and below, 0.5 pt row rules, no vertical lines | single 0.5 pt grey grid on all edges, body size, fixed `col = 9000/width` | `tblBorders`: `top`/`bottom` `w:sz="6"`, `insideH` `w:sz="4"`, left/right/insideV `w:val="nil"`. Header row bottom border via `tcBorders`. Run `sz 16`. Table width: text width = page width - left - right (9026 on A4 with 1 in margins), not the hard-coded 9000 (border element names unverified here) | tblBorders |
| 21 | Two-column body | single column | `sectPr/cols w:num="2" w:space="475"` (0.33 in x 1440 = 475). Title, authors and abstract in the editor span the page; this needs a continuous section break before the body: a `sectPr` inside the last front-matter paragraph's `pPr`, with `w:type w:val="continuous"` on the next (unverified here) | cols |
| 22 | Header / footer with tokens and page number | none | `headerReference`/`footerReference` in `sectPr`, header1.xml/footer1.xml parts + rels + content-type overrides; page number as `fldSimple w:instr="PAGE"` | fldSimple |
| 23 | Page break block | `<w:br w:type="page"/>` in its own paragraph | OK. Alternative: `pageBreakBefore` in the next paragraph's `pPr` (unverified here) | - |
| 24 | Display maths | LaTeX source as Consolas text | Unchanged unless OMML is wanted (`oMathPara`, listed as a valid paragraph child on the fldSimple page) | fldSimple parents list |
| 25 | Package parts | No `word/_rels/document.xml.rels`, no styles part | Add `styles.xml`, `numbering.xml`, optional header/footer; each needs a relationship from `word/_rels/document.xml.rels` and an `Override` in `[Content_Types].xml`. Relationship type URIs were not fetched; take them from ECMA-376 Part 1 / Part 2 | not fetched |

Suggested build order: 25 and 3-5 (one styles.xml), then 10-13 and 15 (styles), 16-17 (citations), 1-2 and 21 (section), 19-20, 22.

## 5. If a per-style page preset is wanted later (not what the editor does today)

Values are from section 2. Each is a different layout target from the editor view.

| Style | Font | Spacing | Alignment | Indent | Title block | Reference list |
|---|---|---|---|---|---|---|
| APA 7 student | 12 pt TNR / 11 pt Calibri or Arial | `spacing w:line="480" w:before="0" w:after="0"` | `jc left` | `ind w:firstLine="720"` | centered, title bold, 3-4 lines down | "References" centered bold, new page, `ind w:left="720" w:hanging="720"`, double-spaced |
| MLA (8th ed. PDF) | 12 pt TNR | double (480), no justify, no hyphenation | left | `firstLine 720` | name / instructor / course / date flush left, then title centered, plain; running head = last name + page | "Works Cited" centered, hanging `720` |
| Chicago, IEEE, Vancouver, AMA, Harvard | NR (see section 2) | NR | NR | NR | NR | IEEE numbers in a hanging column (guide II) |

## 6. Open items

- Read ECMA-376 Part 1 for the items in the "not fetched" list in section 3.
- Re-open the APA HTML pages in a normal browser to confirm table and figure caption format and the professional title page (the fetch tool got empty bodies).
- Get CMOS 18 (log in) for manuscript layout and the hanging indent; get *Citing Medicine* and the AMA Manual (11th) for author cut-offs.
- Decide the target: editor look only (section 4) or per-style layouts (section 5).
