# What a real journal article needs from the editor: a PLOS ONE paper

Studied 2026-10-22 from the owner's sample, `journal.pone.0355849.pdf` (Geng, van Dieën, Bruijn, PLOS One 21(10): e0355849, 15 pages, US Letter 612 x 792 pt, produced in Adobe InDesign). Read with pdf.js: text, size and position of every line. The page images could not be rendered here (no `pdftoppm`), so figures were read from their captions, not seen. Measurements below are in points (pt) taken from the file; "UNVERIFIED" marks anything inferred rather than measured.

The aim was the one the owner gave: find out which tools an editor needs to reproduce this kind of content, so the toolbar has exactly those and no more.

## 1. Page layout

| Pages | Layout (measured) |
|---|---|
| 1 and 2 | Two zones. A narrow **side column** on the left (text starts at x = 36, 8 pt): the Open Access badge, the citation of the article, the academic editor, received, accepted and published dates, the peer-review note, the copyright line, then (page 2) the data availability, funding and competing-interests statements. A **main column** starts at x = 198 (about 380 pt wide): article-type label, title, authors, affiliations, corresponding email, Abstract, then the start of the Introduction. |
| 3 to 13 | One full-width column, text from x = 36 to about 576 (540 pt wide, 0.5 in margins). |
| 14 to 15 | References, full width, 8 pt. |

So: wide narrow-margin pages, a two-zone first page, and one column after that. It is not a two-column journal layout, even though many journals use two columns.

**What the editor does now:** margins (narrow 0.5 in, normal, wide), body columns (one or two), page size. **Not done:** the side column on pages 1 and 2 needs a real page model (S-160).

## 2. Type scale

Font stats (characters by size): 10 pt 37,105; 8 pt 16,262; 11 pt 158; 16 pt 83; 9 pt 41; 14 pt 8; 7 pt 27.

| Element | Size | Notes |
|---|---|---|
| Article-type label ("RESEARCH ARTICLE") | 8 pt | capitals |
| Title | 16 pt | bold, two lines, about 18 pt leading |
| Authors | 9 pt | ORCID marks and a corresponding-author asterisk |
| Affiliations, email | 8 pt | |
| "Abstract" heading | 14 pt | |
| Abstract and body | 10 pt | 14 pt leading (140 percent), justified, hyphenated |
| Section heading ("1. Introduction") | 11 pt | bold, numbered |
| Sub-heading ("2.1 Experimental design...") | 10 pt | bold, numbered |
| Sub-sub-heading ("4.1 ...") | 10 pt | numbered |
| Figure and table captions, table cells, table notes | 8 pt | |
| Side column | 8 pt | |
| Footer | 8 pt | |
| Subscripts and superscripts in equations | 7 pt | |
| Reference list | 8 pt | hanging indent: number at x = 40, continuation at x = 56 |

Paragraphs have no space between them. A new paragraph is marked by a first-line indent of 12 pt (x = 48 against x = 36), and the first paragraph after a heading has none (page 3). All text is a sans-serif; the fonts report only as generic "sans-serif" (the exact face is UNVERIFIED).

## 3. Header and footer

No running header. A footer on every page at the bottom (y = 36), 8 pt: journal name, a bar, the article's DOI, the publication date, and "n / 15" at the right.

## 4. Bibliography

Numbered, in order of first citation. In text: `[1]`, `[1 - 3]`, `[5, 6, 9 - 14]`. In the list: "1. Authors. Title. Journal Abbrev. Year;volume(issue):pages. https://doi.org/... PMID: ...", 8 pt, with a hanging indent. This is the Vancouver/NLM pattern with a DOI and PubMed ID added.

**Conflict with the owner's instruction.** The same message that asked for this study also asked to remove the numbered citation styles (IEEE, Vancouver, AMA) from the editor. They were removed. This sample uses exactly that family, so a paper made to match it would need one numbered style back. Left for the owner to decide.

## 5. Other content the paper contains

- **Figures** (4): a full-width image with a caption below. Caption: "Fig 1. Title. Description." (8 pt), then a line with the figure's DOI (`...pone.0355849.g001`).
- **Tables** (2): caption above ("Table 1. ..."), 8 pt, rules at the top and bottom, a notes paragraph below, then the table's DOI (`...t001`).
- **Equations**: display equations with numbers, fractions, a square root, subscripts and superscripts, Greek letters.
- **Cross-references**: "Fig 1", "Table 1", "Results 4.1" in text.
- **End matter**: Conclusion, Supporting information, Acknowledgments, Author contributions (CRediT roles, "Conceptualization: Name, Name."), References.
- **Structured front statements**: data availability, funding, competing interests, ethics (in Methods).

## 6. What this means for the toolbar

Tools the article needs, and what was built:

| Need | Tool |
|---|---|
| The type scale | A **paragraph style** menu: Body (10 pt), Sub-heading (10 pt bold), Small sub-heading (10 pt bold italic), Caption (8 pt), Note (8 pt), Reference (8 pt, hanging indent), Label (8 pt capitals) |
| Sizes inside a line (title 16, abstract 14, small print 8) | **Font size** menu, 8 to 18 pt |
| Justified body, centred or left captions | **Align** left, centre, right, justify |
| 140 percent leading | **Line spacing** menu |
| Indented new paragraphs | **First-line indent** toggle |
| Emphasis, chemical and statistical notation | Bold, italic, underline, subscript, superscript, clear formatting |
| DOIs and links in captions and references | **Link** |
| Lists | Bulleted and numbered |
| A paper that does not match the template | **Add section**, **Remove heading** (keeps the text), **Remove section** |
| Page layout | Body columns, margins, typeface, and a switch for each front and end block |

Left out on purpose, as asked: insert formula and insert table (they arrive by paste for now).

Not yet possible, and what it would need:

- The side column of pages 1 and 2 (a real page model, S-160).
- Numbered headings ("2.1") that renumber themselves.
- Figure and table numbers with cross-references ("see Fig 2") that follow the order.
- A page footer that shows the article DOI (a `{doi}` token and a field for it).
- Display equations with numbers.
