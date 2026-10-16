# Retraction and Page-Change Mechanics Research

Date: 2026-10-17. Scope: how to tell that a paper was retracted, corrected, flagged or withdrawn, and that a clipped web page changed or vanished. Feeds `docs/PILLAR_A_SOURCE_HEALTH_PLAN.md`. Builds on `docs/CITATION_API_RESEARCH.md` (not repeated here; errors in it are listed in section 10).

Method: primary sources only (data owners' docs, specs, standards PDFs, source code, live API responses fetched 2026-10-17). About 90 requests in total, all with a contact User-Agent or `mailto`. Labels: **Verified (live)** = I called it and read the response. **Verified (doc)** = read on the owner's page or in their file. **UNVERIFIED** = only a secondary source, or not found. No blog or news item is used as evidence for a mechanic.

---

## 1. Plain-language summary

1. No single database knows every retraction. The best single source is the Retraction Watch (RW) database, and you can reach it through two free doors: Crossref and OpenAlex.
2. Crossref tells you about a retraction on the **original paper** in a field called `updated-by`. (The field `update-to` sits on the **notice**, not on the paper. Our older notes mixed these up; the code is right.)
3. Crossref now merges RW data into that field. In a sample of retracted papers, old retractions were almost all there only because of RW. Without the RW merge you would miss most pre-2015 retractions.
4. OpenAlex has a yes/no `is_retracted` flag per work, taken from RW. One cheap call. It is broad, but it also flags the notices themselves, so it needs a type check.
5. PubMed adds its own labels for medical papers: "Retracted Publication", plus links to the retraction, correction and expression-of-concern notices. It does not cover non-biomedical journals.
6. Corrections and concerns are covered less well than retractions, by every source. "Nothing found" must never be shown as "this paper is fine". Say "no problem found in the sources we checked, on this date".
7. Why a retraction happened (fraud, honest error, paper mill) is only in the RW CSV file. No API gives it.
8. For web pages, only a few signals are reliable: the HTTP status, redirects, and whether your quoted text is still on the page. Many journal sites block bots (I got HTTP 403 from NEJM and ScienceDirect), so "could not check" will be common and honest.
9. The Internet Archive "is there a copy" API works and needs no key, but it returns only one snapshot and its richer search was offline during my test.
10. Fetching user-supplied URLs from our server is a real security risk (SSRF). The plan's mitigations are right but need two additions: re-check every redirect hop, and connect to the IP address you validated.

---

## 2. Findings table

| # | Question | Verdict | One-line finding |
| :-- | :-- | :-- | :-- |
| 1a | Crossref `updated-by` on the original paper | **Works** | Live: Lancet 1998 paper lists a correction and a retraction. `update-to` is on the notice. |
| 1b | Crossref update-type vocabulary | **Works** | 12 values in the deposit schema; Crossref gives no definitions (section 3.2). |
| 1c | Crossref carrying Retraction Watch data | **Works** | `source: "retraction-watch"` plus `record-id`. About half of a retraction sample was RW-sourced. |
| 1d | Crossref coverage of retractions | **Partial** | 26 of 28 sampled RW retractions had a retraction update. 2 recent ones did not. |
| 1e | Retraction reason from Crossref | **Doesn't work** | Not in the REST record. Only in the RW CSV (`Reason`). |
| 2a | PubMed publication types | **Works** | D016441 "Retracted Publication" live on all 6 biomedical test papers. |
| 2b | PubMed `CommentsCorrections` links | **Works** | Full RefType list read from the DTD (section 4.2). No `PartialRetraction*` types exist. |
| 2c | PubMed for non-biomedical papers | **Doesn't work** | 2 of 7 recent test DOIs are not in PubMed at all. |
| 3 | OpenAlex `is_retracted` | **Works, with a trap** | RW-based. Flags notices as retracted too. Needs a key now for any real volume. |
| 4a | Retraction Watch CSV (via Crossref GitLab) | **Works** | Updated every working day. 68.6 MB. Licence not stated in the repo (UNVERIFIED). |
| 4b | Europe PMC | **Partial** | Mirrors PubMed publication types and link types. Adds nothing new for retractions. |
| 4c | Semantic Scholar | **Doesn't work** | No retraction field. `isRetracted` is rejected as unsupported. |
| 4d | Publisher notices, DOAJ | **Unverified** | Not tested. Publisher notices arrive through Crossref anyway. |
| 5 | COPE, NISO CREC, ICMJE | **Works** | Categories and display rules read from the primary documents (section 5). |
| 6 | Edge cases | **Partial** | Several verified live; delay figures are bounds, not measurements (section 6). |
| 7 | Zotero | **Works** | Source code read: RW list, DOI and PMID only, retractions only, checked daily. |
| 8a | Page: status, redirect, content match | **Works** | Reliable for static pages. Unreliable for script-rendered, paywalled and bot-blocked pages. |
| 8b | Text fragments as a detector | **Doesn't work** | A browser feature with no result API. Use it for the link only. |
| 8c | Wayback availability API | **Works** | Live. One closest snapshot. CDX was "Temporarily Offline" in my test. |
| 8d | Robots, terms, SSRF | **Works** | Mitigations from OWASP and RFC 9309 (section 8.6). |

---

## 3. Crossref

### 3.1 Which field sits where

Verified (live). Request: `GET https://api.crossref.org/works/10.1016/S0140-6736(97)11096-0?mailto=<contact-email>`

On the **original** paper (Wakefield 1998):

- `updated-by` = two entries.
  - `{"DOI":"10.1016/s0140-6736(04)15715-2","type":"correction","label":"Correction","source":"retraction-watch","updated":{"date-parts":[[2004,3,6]],"date-time":"2004-03-06T00:00:00Z"},"record-id":"17269"}`
  - `{"DOI":"10.1016/s0140-6736(10)60175-4","type":"retraction","label":"Retraction","source":"retraction-watch","updated":{"date-parts":[[2010,2,6]],...},"record-id":"4036"}`
- `update-to` = null. `relation` = `{}`.
- `title` = "RETRACTED: Ileal-lymphoid-nodular hyperplasia..." (the publisher's title prefix, see NISO in section 5).

On the **notice** (`GET /works/10.1016/s0140-6736(10)60175-4`): `update-to` = `[{"DOI":"10.1016/s0140-6736(97)11096-0","type":"retraction","source":"retraction-watch","record-id":"4036",...}]`, `updated-by` absent.

Reverse lookup: `GET /v1/works?filter=updates:10.1016/S0140-6736(97)11096-0&select=DOI,type,update-to` returns the two notices. Verified (live).

The Crossref format reference (https://github.com/CrossRef/rest-api-doc/blob/master/api_format.md, read) documents `update-to` as an array of Update objects (`updated`, `DOI`, `type`, `label`). It does not document `updated-by`; the field is real and live. Response headers on the single-DOI call: `x-rate-limit-limit: 10`, `x-rate-limit-interval: 1s`, `x-concurrency-limit: 3`.

Verdict: **works**. Check `updated-by` on the paper. A work with `update-to` is itself a notice.

### 3.2 Update types vocabulary

Verified (doc). The deposit schema `common5.4.0.xsd` (https://www.crossref.org/schemas/common5.4.0.xsd, `cm_update_type`, lines 596-610) allows exactly 12 values. The Crossmark page (https://www.crossref.org/documentation/crossmark/participating-in-crossmark/) lists the same 12 and defines none of them. It says updates are those "likely to affect the interpretation or crediting of the work", and anything else goes into an "assertion".

Live counts of notices using each type, `GET /v1/works?filter=update-type:{type}&rows=0`, 2026-10-17:

| Type | Notices | Meaning (see note) | Our state |
| :-- | --: | :-- | :-- |
| `retraction` | 76,282 | Publisher or RW says the paper is retracted | retracted |
| `withdrawal` | 3,413 | Publisher withdrew the paper | retracted (withdrawn) |
| `removal` | 704 | Full text removed, metadata kept (NISO definition, section 5.2) | retracted (removed). **Not mapped today.** |
| `partial_retraction` | 2 | Part retracted. COPE deprecated this (section 5.1). | concern |
| `expression_of_concern` | 4,344 | Interim warning from the editor | concern |
| `correction` | 216,167 | Generic correction | corrected |
| `corrigendum` | 8,886 | Author-side correction | corrected |
| `erratum` | 117,844 | Publisher-side correction | corrected |
| `addendum` | 1,750 | Added material | ignore (info) |
| `clarification` | 509 | Clarified wording | ignore (info) |
| `new_version` | 44,910 | A new version exists | ignore, but see retract-and-replace (section 6) |
| `new_edition` | 10,898 | New edition (books) | ignore |
| `reinstatement`, `updated_version`, `updated_edition` | 0 | Not in the schema | not a Crossref value |

Crossref gives no meaning for any of the 12. The "Meaning" column above is my reading of the names, except `removal` (NISO) and the EoC/retraction ideas (COPE). Treat the meanings as **UNVERIFIED**; the type names and counts are verified.

Caution: a notice can carry several types for one paper. Live example `10.33552/ojdoh.2018.01.000503` lists `addendum`, `clarification`, `corrigendum` all pointing at its own DOI. Take the worst type across all entries.

### 3.3 Retraction Watch data in Crossref

Verified (doc), https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/ and the repo README at https://gitlab.com/crossref/retraction-watch-data.

- What: the RW database, acquired by Crossref in September 2023. "Updated every working day by Retraction Watch." The CSV copy is updated once per working day. Live: repo commits "Retraction Watch data for 2026-10-15", `-14`, `-13`, `-12`, `-09` (a gap over the weekend), via `GET https://gitlab.com/api/v4/projects/crossref%2Fretraction-watch-data/repository/commits`.
- How to query:
  - REST: `update-to` on notices and `updated-by` on papers carry `source` of `publisher` or `retraction-watch` and, for RW, a `record-id`. Filter: `https://api.crossref.org/v1/works?filter=update-type:retraction`.
  - File: `https://gitlab.com/crossref/retraction-watch-data/-/raw/main/retraction_watch.csv`. `Content-Length: 68605036` (Live). Newest rows first (Live: first data row is Record ID 73811).
- CSV columns (Verified, doc): Record ID, Title, Subject, Institution, Journal, Publisher, Country, Author, URLS, ArticleType, RetractionDate, RetractionDOI, RetractionPubMedID, OriginalPaperDate, OriginalPaperDOI, OriginalPaperPubMedID, RetractionNature, Reason, Paywalled, Notes.
  - `RetractionNature` is one of Retraction, Correction, Expression of concern, Reinstatement. README: "different to the list of update types in the Crossref schema."
  - `Reason` is a semicolon list from RW's controlled vocabulary (https://retractionwatch.com/retraction-watch-database-user-guide/retraction-watch-database-user-guide-appendix-b-reasons/). Zotero's source embeds the same vocabulary with definitions (`chrome/content/zotero/xpcom/retractions.js` line ~1050 onward).
  - Missing DOI or PMID is blank, "unavailable", "Unavailable" (DOI) or blank/0 (PMID).
- Coverage statement (Verified, doc): retractions are the most comprehensive part. "Some other update types, such as expressions of concern and corrections, are also included in the data, but these are not as comprehensive as retractions." Many entries "have not been reported by our members".
- **Licence: UNVERIFIED.** The repo has no LICENSE file (LICENSE.md and LICENSE both 404; the tree holds only README.md and the CSV). Crossref's pages say the database was "made a public resource" and RW says "completely open and freely available", but neither names a licence. Crossref's REST page says "almost none of the metadata is subject to copyright, and you may use it for any purpose." Ask Crossref (support) for the licence in writing before we redistribute the CSV or build a public mirror. Reading it in-app per user check is the safer use.
- **Coverage vs Crossref `updated-by`** (Verified, live, my sample; not a statistical estimate):
  - Took 28 RW retraction rows (14 from the newest 200, 14 from the oldest tail I fetched with HTTP Range requests) and asked Crossref for each original DOI.
  - 26 of 28 had a `retraction`-type update. Missing: `10.52866/2788-7421.1338` (empty `updated-by`) and `10.1038/s44319-024-00133-6` (only a `withdrawal` entry). So the gap is **one in 28 with no update at all, and one coded as withdrawal rather than retraction**.
  - All 14 old rows (retracted 1991-2015) were covered **only because of RW** (`source: retraction-watch`); the publisher had deposited nothing, or deposited later. All 12 covered recent rows were `source: publisher`.
  - In a page of 500 retraction notices (offset 5000 of `filter=update-type:retraction`): 420 RW-sourced, 323 publisher-sourced (some papers carry both). So the RW merge roughly doubles the retraction signal in the older back catalogue.
- What RW adds beyond Crossref: reasons, the RW record URL, nature "Reinstatement", PMIDs of both paper and notice, and retractions of items whose publisher never deposited anything.
- Rate limits: single-DOI calls 10 per second and 3 concurrent in the polite pool (`mailto` or contact User-Agent). **List/filter calls: `x-rate-limit-limit: 3`, interval 1s, concurrency 3** (Verified live on `filter=update-type:retraction&rows=1`). Our code uses the single-DOI route, so 10/s applies. `sample` cannot be combined with `rows` or `offset` (live error `sample-with-rows-or-offset`).

Verdict: **works**. Best way to get "reason" is the CSV.

### 3.4 Crossref filters that matter

Verified (live): `update-type:`, `has-update:true` (498,281 works), `is-update:true` (479,731), `updates:{doi}`. The Crossref OpenAPI text lists `update-type - significant update type`.

---

## 4. PubMed (NLM)

### 4.1 Publication types

Verified (live). `GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=9500320&retmode=xml&tool=researchie&email=<contact-email>` (the Lancet paper):

- `<PublicationType UI="D016441">Retracted Publication`
- `CommentsCorrections` RefTypes present: `RetractionIn` x2, `ExpressionOfConcernIn` x1, `CommentIn` x26.

The notice, PMID 20137807: `<PublicationType UI="D016440">Retraction Notice` and `RefType="RetractionOf"`.

Note: the UI **D016440 is labelled "Retraction Notice" in the live XML**, not "Retraction of Publication" as our older notes say.

Search filters (Verified, live): `"Retracted Publication"[ptyp]` = 35,155 records; `"Expression of Concern"[ptyp]` = 4,030 records. Compare with 76,282 Crossref retraction notices: PubMed is biomedical only.

### 4.2 `CommentsCorrections` RefTypes

Verified (doc). From the PubMed DTD `https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd` (the 2026 file path returned a 1,560-byte stub). The complete allowed list:

`AssociatedDataset, AssociatedPublication, CommentIn, CommentOn, CorrectedandRepublishedIn, CorrectedandRepublishedFrom, ErratumIn, ErratumFor, ExpressionOfConcernIn, ExpressionOfConcernFor, RepublishedIn, RepublishedFrom, RetractedandRepublishedIn, RetractedandRepublishedFrom, RetractionIn, RetractionOf, UpdateIn, UpdateOf, SummaryForPatientsIn, OriginalReportIn, ReprintIn, ReprintOf, Cites`.

Meanings (NLM element descriptions, archived copy https://wayback.archive-it.org/org-350/20240220194809/https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html; NLM's live page says "no longer maintained"):

| RefType | Sits on | Meaning |
| :-- | :-- | :-- |
| `RetractionIn` | the paper | cites the reference containing a retraction of the article (since 1984) |
| `RetractionOf` | the notice | cites the article being retracted |
| `ExpressionOfConcernIn` / `...For` | paper / notice | expression of concern (since 2017) |
| `ErratumIn` / `ErratumFor` | paper / notice | published erratum (since 1987) |
| `RepublishedIn` / `RepublishedFrom`, `CorrectedandRepublishedIn/From` | final version / original | corrected and republished version |
| `RetractedandRepublishedIn/From` | original / replacement | retract-and-replace (in the DTD; not in the archived element text) |
| `UpdateIn` / `UpdateOf` | paper / update | update to the article (limited use since 2001) |

**There is no `PartialRetractionOf` or `PartialRetractionIn`.** NLM handles a partial retraction with `RetractionOf`/`RetractionIn` and a `Note` (archived NLM text). Live: the Lancet 2004 "interpretation retracted by 10 co-authors" notice (PMID 15016483) appears as `Retraction in`, while Crossref/RW call it `correction`. Same event, two labels.

Today's `status.ts` handles `RetractionIn`, `ExpressionOfConcernIn`, `ErratumIn` and D016441. Missing: `RetractedandRepublishedIn`, `CorrectedandRepublishedIn`, `UpdateIn`.

### 4.3 Speed and limits

- PubMed update speed: **UNVERIFIED** from NLM. I found no NLM page stating a time. Live upper bound: 5 biomedical papers with RW retraction dates in 2026 (one dated 2026-10-01, 16 days earlier) were all already `Retracted Publication` in PubMed. Request: `esearch ... term={doi}[doi]` then `efetch` on the PMID.
- Rate limit (Verified, doc; NCBI blog https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/): no key = 3 requests per second per IP; with `api_key` = 10 per second per key; higher on request to eutilities@ncbi.nlm.nih.gov. Key from NCBI account Settings, "API Key Management". The main usage page https://www.ncbi.nlm.nih.gov/books/NBK25497/ is behind a bot check, so `tool`/`email` registration rules stay UNVERIFIED as before (requests with `tool` and `email` and no registration worked live).
- DOI to PMID: `esearch` with `{doi}[doi]` (Verified, live; returned idlist `["9500320"]`).

Verdict: **works for biomedical papers; does not cover the rest**.

---

## 5. OpenAlex

Verified (doc, https://help.openalex.org/api-entities/works/work-object): `is_retracted` = "True if the work is known to be retracted, per the Retraction Watch database." No other retraction field is documented. `updated_date` is the last change to the work object (includes citation-count changes, so it is not a "retracted on" date).

Live:

- `GET https://api.openalex.org/works/doi:10.1016/S0140-6736(97)11096-0?select=id,doi,is_retracted,updated_date` returns `is_retracted: true`, `updated_date: 2026-10-16T09:59:22`.
- Same flag by PMID: `GET /works/pmid:9500320`. Works for papers without a DOI.
- **Trap:** the retraction notice itself comes back `is_retracted: true` with `type: "retraction"` (`/works/doi:10.1016/S0140-6736(10)60175-4` and `/works/pmid:20137807`). Clipping a notice would show "retracted". Check `type` first.
- `GET /works?filter=is_retracted:true&per_page=1` gives `count: 136898`, larger than Crossref's 76,282 retraction notices. Likely includes notices and non-Crossref DOIs. Cause not verified.
- All 28 sampled RW retractions (both age groups) were `is_retracted: true`. This beat Crossref's 26 of 28.
- Many works share one `updated_date` (2026-10-16T09:59:22.235173), which suggests batch refresh; actual lag is **UNVERIFIED**.
- Corrections and expressions of concern: not represented. Retraction only.
- Free access and limits (Verified, doc; https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication and https://help.openalex.org/access/pricing/): no key = 10 per second, free key = 30 per second, a free key gives "$1 of usage per day", reset at midnight UTC. Data released "under a CC0 public-domain license". **Live notice in responses:** without a key, requests "share one free daily budget ($0.10) with everyone on your network's IP address". A single-work lookup showed `X-RateLimit-Cost-USD: 0`. The docs no longer mention `mailto` or a polite pool; send an `api_key`.

Verdict: **works** as a cheap second opinion for retraction only. Needs a free key in production.

---

## 6. Other feeds, and the best combination

- **Retraction Watch database**: the source behind Crossref's `retraction-watch` entries, OpenAlex `is_retracted` and Zotero. Best single source for retractions. Reasons only here (CSV).
- **Europe PMC** (Verified, live): `GET https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:9500320 AND SRC:MED&format=json&resultType=core` returns `pubTypeList` with "Retracted Publication" and `commentCorrectionList` with "Retraction in" and "Expression of concern in". `PUB_TYPE:"Retracted Publication"` = 35,063 (PubMed: 35,155). It mirrors PubMed. Its use: one call returns the links with citation text. No new signal.
- **Semantic Scholar** (Verified, live): `GET https://api.semanticscholar.org/graph/v1/paper/DOI:10.1016/S0140-6736(97)11096-0?fields=publicationTypes` returned `["JournalArticle","Review"]`, with no retraction marker. `fields=isRetracted` returned `Unrecognized or unsupported fields`. **Doesn't work.**
- **Publisher notices / DOAJ**: not tested. Publisher notices are what Crossref's `source: publisher` entries are. DOAJ is a journal index, not a notice feed (not verified).
- **bioRxiv API** (https://api.biorxiv.org/, read): the page documents no withdrawn field. A live range query (`/details/medrxiv/2020-04-01/2020-04-03/0`) found no withdrawn item. **UNVERIFIED** how an API client sees a withdrawal.

**Best single source:** Retraction Watch (via Crossref `updated-by`, one call per DOI, already in our code).

**Best combination, in order:**

1. Crossref `updated-by` (all types, plus RW reasons and dates via the `record-id` if we hold the CSV). Covers 12 update types and non-biomedical papers.
2. OpenAlex `is_retracted` (catches the rare Crossref gaps; supports PMID-only items).
3. PubMed (`D016441`, `RetractionIn`, `ExpressionOfConcernIn`, `ErratumIn`, republished types) for anything with a PMID. Best source for medical corrections and EoCs.
4. The RW CSV, loaded daily into a table, for reasons and for items missing from the APIs.

---

## 7. Standards and guidance

### 7.1 COPE

Verified (doc, read in a browser): https://publicationethics.org/guidance/guideline/retraction-guidelines (last reviewed 29 August 2025, DOI 10.24318/cope.2019.1.4) and https://publicationethics.org/guidance/guideline/expressions-concern (last reviewed 27 August 2025, DOI 10.24318/mw2J3661). The site returned HTTP 403 to curl and loaded only in a real browser.

- Retraction: for content whose "findings and conclusions cannot be relied upon". Purpose is "not to punish the authors". Notices "should link to the retracted article, clearly identify it with title and authors, and be published promptly and be freely accessible".
- Expression of concern (EoC): for credible concerns that do not meet the retraction bar, or where evidence cannot be had for some time. Can be interim (followed by a correction or retraction) or final. Must have "clear bidirectional links", state reasons, be free to read.
- Partial retraction: deprecated by COPE (stated in NISO RP-45, section 7.6, citing COPE 2019). I did not find it in the 2025 text I could read; the PDF download was not read. **UNVERIFIED** against the 2025 PDF.

### 7.2 NISO RP-45-2024 CREC

Verified (doc): PDF https://groups.niso.org/higherlogic/ws/public/download/30869/NISO_RP-45-2024_CREC.pdf (from https://www.niso.org/publications/rp-45-2024-crec), approved 26 June 2024, published 27 June 2024. It covers how to communicate, not when to retract.

- Categories (section 1.2 and 4): **retraction** (with retraction notice), **expression of concern**, **removal** ("full text of the publication is made unavailable, but the metadata is preserved"; leaves a tombstone page; treated as also retracted).
- Display (section 4.2, minimum): prepend **"RETRACTED:"** to the title, including in downloaded citations; prominently link the notice or EoC; show the DOI; keep it accessible. Also: watermark the PDF, set the status apart visually, show notices in time order (an EoC then a retraction is shown as a timeline).
- Downstream (section 4.3): publishers should push retractions and EoCs to indexers automatically.
- EoC (section 4.4): "less well defined than retractions or corrections"; used as interim or permanent.
- Edge cases (section 7): 7.1 pre-version-of-record notices; 7.6 partial retraction is "deprecated" but still exists in older records; 7.7 retract-and-republish gets a new DOI or a new version, with the republished version "prioritized in discovery"; 7.8 one notice can cover many papers (the title says "RETRACTION OF [n] ARTICLES DUE TO [reason]" above three).
- Crossref mapping (section 5): `event-type` values include `withdrawal` and `expression_of_concern`.

### 7.3 ICMJE

Verified (doc):

- https://www.icmje.org/recommendations/browse/publishing-and-editorial-issues/scientific-misconduct-expressions-of-concern-and-retraction.html: retracted articles "should remain in the public domain" and be "clearly labelled as retracted in all its forms (Abstract, full text, PDF)"; retraction and original are "linked in both directions"; notice heading carries the original title and gives the reason.
- https://www.icmje.org/recommendations/browse/publishing-and-editorial-issues/corrections-and-version-control.html: honest errors need a correction; retraction with republication can fit an honest error; prior versions archived; "The citation should be to the most recent version."
- From the earlier research file: authors must check cited articles are not retracted, except when citing the retraction.

### 7.4 What this means for display

Four user-facing categories exist in the standards: **retraction (incl. removal and withdrawal)**, **expression of concern**, **correction/erratum/corrigendum**, and **retract-and-republish**. Retraction and EoC are "stop and read" states. A correction is "read before you cite". Show the notice link, the notice date and the order of events.

---

## 8. Edge cases

| Case | What happens | Evidence | What to do |
| :-- | :-- | :-- | :-- |
| Retracted, DOI metadata not updated | Crossref may carry nothing, but RW or OpenAlex does | 1 of 28 sampled RW retractions had no Crossref update (`10.52866/2788-7421.1338`); OpenAlex was true for it | Never rely on one source. |
| Publisher title prefix | Publisher deposits `RETRACTED:` in the title | Lancet record title (Live); NISO rule 4.2 | Cheap extra signal. Do not depend on it. |
| Preprint withdrawn | bioRxiv keeps the DOI, adds a "Withdrawn" watermark and a statement on the article page; "papers cannot be removed" (https://www.biorxiv.org/about/FAQ, read) | Live: preprint `10.1101/2020.04.04.025080` has Crossref `updated-by` type `retraction`, `source: retraction-watch`, `record-id 23475`; OpenAlex `is_retracted: true`, `type: preprint` | Works when RW has it. Only 67 posted-content works in all of Crossref have any `updated-by` (live count), so most withdrawals are NOT in Crossref. Treat preprint status as weak. |
| Preprint vs published version | Different DOIs, flagged separately | Reasoned from DOI scheme; not tested for a pair | Check each DOI. If a clip is a preprint, say the published version was not checked (UNVERIFIED how often one is flagged and not the other). |
| Partial retraction | PubMed uses `RetractionIn` + Note; Crossref has `partial_retraction` (2 notices); RW calls it correction | Lancet 2004 (Live) | Show as "concern", copy "part of this paper was retracted or its interpretation withdrawn". |
| Correction vs retract-and-replace | Crossref `new_version`; PubMed `RetractedandRepublishedIn/From` | DTD (Verified, doc); NISO 7.7 | Add a state or note "retracted and replaced. Cite the new version." |
| The clipped item is a notice | Crossref `update-to` present; PubMed `RetractionOf`; OpenAlex `type: retraction` but `is_retracted: true` | Live (section 5) | Detect and show "This is a retraction notice for X" instead of a retracted badge. |
| Paper has no DOI | PMID route: PubMed efetch, OpenAlex `pmid:`, Europe PMC `EXT_ID` | OpenAlex PMID call (Live) | Use PMID. Title search is a guess; do not auto-claim a state from a fuzzy title match. |
| PDF uploaded by user | No identifier unless extracted | Existing code reads DOI from PDF (`src/lib/citations/pdf.ts`) | Check only if a DOI or PMID is found. Otherwise "not checked". |
| Delay: retraction to Crossref | Publisher deposits are mostly same-day | Live: 772 publisher retraction updates with notices created Aug-Sep 2026: median lag 0 days, p75 1 day, but 15% over 30 days (backfills of old notices) | A retraction can lag. Refresh often for new work. |
| Delay: retraction to PubMed | Not stated by NLM | Live: all 5 biomedical test papers retracted up to 16 days earlier were already flagged | UNVERIFIED lag; upper bound 16 days in this sample. |
| Delay: RW to Crossref/OpenAlex | RW updates each working day | RW repo commits (Live); 12 of 14 newest sampled RW rows already in Crossref | Allow a lag of days. |
| Reinstated paper | RW `Reinstatement` exists in the CSV; Crossref has no matching type (0 notices) | Live count, README | A reinstated paper may still show as retracted in APIs. Rare; mention in copy ("check the notice"). |

---

## 9. Reference managers

Zotero (open source; read `https://raw.githubusercontent.com/zotero/zotero/main/chrome/content/zotero/xpcom/retractions.js`, `schema.js`):

- Data source: the Zotero server `GET {api.url}/retractions/list` (conditional with `If-None-Match` and ETag, `304` when unchanged) and `POST .../retractions/search`. The server holds the Retraction Watch data (Zotero blog, https://www.zotero.org/blog/retracted-item-notifications/, read: Retraction Watch "maintains the largest database of retractions"; "about 3/4 of Retraction Watch data" has a DOI or PMID).
- Matching: DOI (`TYPE_DOI 'd'`) and PMID (`'p'`) only. The client sends hashed prefixes, not full identifiers; the server "has no way of knowing whether you have the retracted work in your library" (blog).
- Frequency: `updateFromServer()` runs at startup and on `REPO_UPDATE_PERIODIC`. `REPOSITORY_CHECK_INTERVAL = 86400` seconds, so **daily** (`schema.js` line 39, and the call at line ~1835).
- Scope: retractions only. Staff said so in forum threads (secondary, UNVERIFIED as policy). The code classifies nothing besides retraction flags (`FLAG_NORMAL`, `FLAG_HIDDEN`, `FLAG_NO_CITATION_WARNING`).
- UX: flag in the item list, a banner in the item pane, a warning when citing from the word processor, "hide" and "do not warn when citing" per item.
- EndNote and Mendeley: **UNVERIFIED**. I did not fetch their official documentation in this pass.

What we should copy: daily list, identifier-based match, per-item "I know, stop warning me", and a warning at the point of citing. What we should do better: show corrections and EoCs, and show the reason.

---

## 10. Web page change detection

### 10.1 Signals and their reliability

| Signal | Reliable for | Not reliable for |
| :-- | :-- | :-- |
| HTTP status | 404/410 (RFC 9110, https://www.rfc-editor.org/rfc/rfc9110.html: 404 "does not indicate whether this lack of representation is temporary or permanent"; 410 "likely to be permanent") | Soft-404 pages that return 200 with an error body (Google describes this, https://developers.google.com/search/docs/crawling-indexing/http-network-errors) |
| Redirect (301/308 vs 302) | Moved pages. DOI landing pages always redirect (Live: `https://doi.org/10.1016/S0140-6736(97)11096-0` gives 302 to `linkinghub.elsevier.com`) | Treating any redirect as "moved". A DOI redirect is normal. |
| Text still present (normalised exact, then fuzzy) | Static HTML articles and blog/news pages | Script-rendered pages, A/B variants, cookie walls |
| Content hash of the whole page | Almost nothing (ads, timestamps and nonces change every load) | Everything: never use a full-page hash as "changed" |
| ETag / Last-Modified | Cheap skip of unchanged pages | Servers that omit or fake them (weak validators) |

Blocked pages (Live): `curl -A "ResearchieBot/0.1"` to `https://www.nejm.org/doi/full/10.1056/NEJMoa2034577` gave **403**; `https://www.sciencedirect.com/science/article/pii/S0140673697110960` gave **403**. `https://example.com/does-not-exist-xyz` gave 404. COPE's own site returned 403 to curl. So for the main journal publishers, "unknown (blocked)" will be the typical answer from a server-side check.

### 10.2 Text fragments

Verified (doc), https://wicg.github.io/scroll-to-text-fragment/: syntax `#:~:text=[prefix-,]start[,end][,-suffix]`. Each term must match within a single block element. If nothing matches the browser simply adds no highlight and falls back to the element fragment. Not activated in iframes, on reload or history traversal, or without user activation. It is a **Draft Community Group Report (13 December 2023)**, not a W3C standard. There is no API that reports "found / not found" for a directive, and the fragment is not sent to the server. Use it to build the **link** the student clicks; do **not** use it to detect change. Server-side detection means fetching HTML and searching the text yourself.

### 10.3 Internet Archive Wayback

Verified (live) and (doc, https://archive.org/help/wayback_api.php, "Updated on September, 24, 2013"):

- `GET https://archive.org/wayback/available?url=example.com` returns `{"url":"example.com","archived_snapshots":{"closest":{"status":"200","available":true,"url":"http://web.archive.org/web/20261015212308/https://example.com/","timestamp":"20261015212308"}}}`.
- With `&timestamp=20200101` it returns the capture nearest that date (`20200101231047`).
- Unknown URL or domain: `{"url":"...","archived_snapshots":{}}` (tested on a made-up domain and on `http://www.geocities.com/` for 2009).
- Only one `closest` snapshot. The `status` is the captured page's HTTP status as a string, so a "closest" snapshot can itself be a 404 or a redirect capture (not stated in the doc; the field is there).
- The doc gives no rate limit and says nothing on robots exclusion. **UNVERIFIED.** Send a User-Agent and keep the call count low.
- `https://web.archive.org/cdx/search/cdx?...` returned an HTML "Internet Archive: Temporarily Offline" page during my test. Do not build on CDX for v1.
- A direct link `https://web.archive.org/web/{timestamp}/{original-url}` needs no API call (HEAD returned 302 to a capture). Offer it as a link; fetch the availability API only for "gone" pages.

### 10.4 Robots, terms, ethics

- RFC 9309 (https://www.rfc-editor.org/rfc/rfc9309.html, read): robots.txt rules "are not a form of access authorization". 4xx on robots.txt = no restrictions; 5xx = assume full disallow; cache at most 24 hours; follow at least five redirects; read at least 500 KiB; product token match is case-insensitive.
- Our checker is an automated, repeating fetcher. Treat it as a crawler: send an honest User-Agent with a contact address, read robots.txt, obey it, and slow down per host. This is my recommendation from the RFC, not a legal opinion.
- Publisher terms of use often restrict automated access. I did not read any specific publisher's terms (**UNVERIFIED**). A 403 is the site's answer; do not rotate user agents or proxies to get around it. Offer to check from the student's own browser (the extension) instead.

### 10.5 SSRF

OWASP SSRF Prevention Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html, read):

- Prefer allow-lists; "Deny-lists are bypass-prone".
- Resolve DNS yourself, check every resolved IP against the blocked ranges, then connect only to the validated address (keep the Host header and TLS name). A domain check alone does not stop DNS rebinding.
- Disable automatic redirects so a validated target cannot be swapped.
- Allow http and https only.
- Block `169.254.169.254` and cloud metadata hostnames. IPv6: `::1/128`, `fc00::/7`, `fe80::/10`, `ff00::/8`.
- Network segmentation for outbound traffic.

Our case needs a deny-list (users can clip any site). Add (my recommendations): re-validate every redirect hop manually with a cap of 5; block IPv4-mapped IPv6, `0.0.0.0/8`, `100.64.0.0/10`, `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`; no cookies or auth headers forwarded; limit port to 80 and 443; cap response bytes (for example 2 MB) and time (for example 8 s); never return the fetched body to the client, only the verdict; run the fetch from an egress-restricted worker if hosting allows.

---

## 11. What we got wrong or missed in the current plan

**In `docs/CITATION_API_RESEARCH.md` (wrong, fix):**

1. Section 1.4 says to check `update-to` on a work. That field is on the **notice**. The paper carries `updated-by` (Live). `status.ts` correctly reads `updated-by`; the research file would mislead the next reader.
2. Section 3.5 names RefTypes `RetractionOf` and `PartialRetractionOf` as the link. **`PartialRetractionOf` does not exist** in the PubMed DTD (2025-01-01). `RetractionOf` is on the notice; the paper has `RetractionIn`.
3. D016440 is labelled "Retraction Notice" in live PubMed XML, not "Retraction of Publication".
4. Open question 3 (`is-retraction-of`) is now closed: not a field; use `updated-by`.
5. "Neither source is complete alone" is right, but it names only two sources. The evidence supports three (add OpenAlex).

**In `docs/PILLAR_A_SOURCE_HEALTH_PLAN.md` and the code:**

1. **`removal` is ignored.** 704 Crossref notices. A removed paper has its text taken down; it should be a problem state. `status.ts` has no mapping for it.
2. **PubMed republish types are ignored:** `RetractedandRepublishedIn`, `CorrectedandRepublishedIn`, `UpdateIn`. A retract-and-replace paper shows as plain retracted or clean with no pointer to the replacement.
3. **"clean" is too strong.** 2 of 28 sampled RW retractions had no `retraction` update in Crossref. Crossref returning no `updated-by` is not proof. Rename the state "no issue found" and show which sources were checked and when. `mergeFindings` already lets any problem win; keep that.
4. **OpenAlex is missing.** It caught all 28 where Crossref caught 26, costs one call and is keyed by DOI or PMID. Add it as the second retraction source (with the notice-type trap handled).
5. **Reasons and RW dates.** The plan promises a "plain-language line" but no source for why. Only the RW CSV has `Reason`. Decide: ingest the CSV (68.6 MB, daily; licence to confirm) or ship without reasons.
6. **The clipped item may itself be a notice.** Detect `update-to` and `type: retraction` and say so. Today it would read as "clean".
7. **No identifier, no check.** The plan correctly checks DOI or PMID. State it in the UI: "not checked: no DOI or PMID" for PDFs and web clips.
8. **Preprints.** Withdrawn bioRxiv/medRxiv papers are rarely in Crossref updates (67 posted-content works carry any `updated-by`). Say preprint status is limited.
9. **Page check, "404 or 410 means gone".** 404 does not say permanent (RFC 9110) and soft-404s return 200. Keep `gone` only for 404/410 plus the two-miss rule, and treat a 200 with a very short or error-like body as `unknown`.
10. **Publishers will block us.** NEJM and ScienceDirect returned 403 to a polite bot. The plan says `unknown` is normal; make that the expected case for journal URLs, and prefer the extension for those.
11. **Robots.txt and honest User-Agent are not in the plan.** Add them.
12. **SSRF mitigations incomplete:** add per-hop redirect validation and connecting to the validated IP.
13. **OpenAlex access changed:** the plan assumes free/polite use. It now needs a free key for real volume.
14. **Recheck every 7 days is slow for retractions.** Retraction checks are cheap (Crossref 10 per second). Use 1 day for retraction data, 7 days for page checks.
15. **Wayback:** "verify the Wayback availability API" is now done. It works (section 10.3). Plan can include "view archived copy" as a link for `gone` pages.

**Right and confirmed:** the Crossref type list (all seven problem types exist); PubMed `RetractionIn`, `ExpressionOfConcernIn`, `ErratumIn`, D016441; `unknown` never `clean` on failure; two misses before `changed`; group checks by source; polite `mailto`; block private addresses.

---

## 12. Recommendations

### 12.1 Order of sources for one DOI or PMID

1. Cache hit (fresh)? Return it.
2. Crossref `GET /works/{doi}?mailto=...` read `updated-by` and `update-to` (and the title prefix `RETRACTED:`). 10 per second, concurrency 3.
3. OpenAlex `GET /works/doi:{doi}?select=id,type,is_retracted,updated_date&api_key=...` (or `pmid:`).
4. PubMed: if a PMID is known or found with `esearch {doi}[doi]`, run `efetch` and read publication types and `CommentsCorrections`.
5. (Optional) local RW table for reasons and dates by `record-id` or DOI.
6. Merge: worst state wins; record which sources answered. If none answered, `unknown`.

### 12.2 State mapping

| Evidence | State | Copy |
| :-- | :-- | :-- |
| Crossref `retraction` or `withdrawal`, PubMed D016441 or `RetractionIn`, OpenAlex true and type not retraction | Retracted | "This paper was retracted on {date}. Do not rely on it. Read the notice." |
| Crossref `removal` | Removed | "The publisher removed this paper after retraction." |
| `expression_of_concern`, `partial_retraction`, `ExpressionOfConcernIn` | Concern | "The publisher has raised a concern about this paper. It may still be sound; read the notice." |
| `correction`, `corrigendum`, `erratum`, `ErratumIn` | Corrected | "A correction was published on {date}. Check what changed before you cite it." |
| `RetractedandRepublishedIn`, `CorrectedandRepublishedIn` | Replaced | "This paper was retracted and replaced. Cite the new version." |
| The clip is a notice | Notice | "This is a retraction notice for {title}." |
| Sources answered, nothing found | No issue found | "No retraction or correction found in Crossref, OpenAlex and PubMed on {date}." |
| No identifier, or every lookup failed | Not checked | "Not checked: no DOI or PMID." / "Could not check. Try again later." |

Show the notice link, notice date, and source name in every problem state (NISO 4.2).

### 12.3 Caching and freshness

- Key: lowercase DOI (Crossref returns lowercase; Zotero had a case bug) or PMID.
- Retraction state TTL: 24 hours for open projects (matches Zotero's daily cadence and RW's working-day updates); 7 days for projects not opened. Refresh on demand.
- Page state TTL: 7 days; skip with a conditional request if ETag is available.
- If a RW CSV is ingested, refresh daily (weekdays) and store only the columns we need.
- Never cache `unknown` as a final answer; retry sooner.

### 12.4 What we must NOT claim

- Not "this paper is fine" or "verified". Only "no issue found in X, Y, Z on date".
- Not "not retracted" for papers with no DOI or PMID, or for preprints (coverage is weak).
- Not "retracted for misconduct". A retraction can be honest error. Show the RW reason only if we have it and attribute it to RW.
- Not "page changed" from a single miss, a blocked page or a script-rendered page; not "page deleted" from one 404.
- Not "this correction is minor". Correction types include serious ones: RW coded the Lancet 2004 interpretation retraction as `correction`.
- Not "complete". No database lists every retraction; RW itself says many are unreported by members.
- Not legal or ethical clearance to scrape a site. Obey robots.txt; no bypass.
- Do not redistribute the RW CSV until the licence is confirmed in writing.

### 12.5 Build changes, in order

1. `status.ts`: add `removal`; add the three PubMed republish and update types; add notice detection (`update-to`); rename `clean` to a "no issue found" wording with sources checked.
2. `lookup.ts`: add the OpenAlex call (with `type` check) and keep the `unknown` rule.
3. Fix the three errors in `CITATION_API_RESEARCH.md` (section 11).
4. Page route: robots.txt, honest UA, per-hop redirect validation, IP pinning, size and time caps, `unknown` for 403/429/short bodies.
5. Decide on the RW CSV (reasons) after confirming the licence.
6. Add fixtures for: retracted, corrected, EoC, withdrawal, removal, retract-and-replace, notice, blocked page, soft-404.

---

## 13. Request log (live checks, 2026-10-17)

| Check | Request | Result |
| :-- | :-- | :-- |
| Crossref original paper | `GET https://api.crossref.org/works/10.1016/S0140-6736(97)11096-0?mailto=...` | `updated-by` correction + retraction, both `retraction-watch`; headers 10/1s, 3 concurrent |
| Crossref notice | `GET /works/10.1016/s0140-6736(10)60175-4` | `update-to` retraction; no `updated-by` |
| Crossref reverse | `GET /v1/works?filter=updates:10.1016/S0140-6736(97)11096-0&select=DOI,type,update-to` | 2 notices |
| Crossref type counts | `GET /v1/works?filter=update-type:{type}&rows=0` x 17 | counts in section 3.2 |
| Crossref list rate | `GET /v1/works?filter=update-type:retraction&rows=1` | `x-rate-limit-limit: 3` |
| Crossref source split | `GET /v1/works?filter=update-type:retraction&rows=500&select=DOI,update-to&offset=5000` | 420 RW, 323 publisher |
| Crossref lag | `GET /v1/works?filter=update-type:retraction,from-created-date:2026-08-01,until-created-date:2026-09-30&rows=1000&select=DOI,created,update-to` | 749 notices, 772 publisher updates, median 0 days |
| RW repo | `GET https://gitlab.com/crossref/retraction-watch-data/-/raw/main/retraction_watch.csv` (HEAD, and Range 0-200000 and 68300000-end) | 68,605,036 bytes; newest first |
| RW commits | `GET https://gitlab.com/api/v4/projects/crossref%2Fretraction-watch-data/repository/commits?per_page=5` | daily commits through 2026-10-15 |
| Coverage sample | 28 RW rows x (Crossref `/works/{doi}` + OpenAlex `/works/doi:{doi}?select=is_retracted`) | Crossref 26/28; OpenAlex 28/28 |
| PubMed paper | `efetch.fcgi?db=pubmed&id=9500320&retmode=xml` | D016441; RetractionIn x2; ExpressionOfConcernIn x1 |
| PubMed notice | `efetch ... id=20137807` | D016440 "Retraction Notice"; RetractionOf |
| PubMed counts | `esearch ... term="Retracted Publication"[ptyp]`; `"Expression of Concern"[ptyp]` | 35,155; 4,030 |
| PubMed recency | `esearch {doi}[doi]` + `efetch` x 7 recent DOIs | 5 flagged, 2 not in PubMed |
| OpenAlex | `GET /works/doi:10.1016/S0140-6736(97)11096-0?select=...`; `/works/pmid:9500320`; `/works/pmid:20137807`; `/works?filter=is_retracted:true&per_page=1` | true; true; notice true with type retraction; count 136,898 |
| Europe PMC | `.../rest/search?query=EXT_ID:9500320 AND SRC:MED&format=json&resultType=core`; `PUB_TYPE:"Retracted Publication"` | pubTypeList and commentCorrectionList; 35,063 |
| Semantic Scholar | `GET /graph/v1/paper/DOI:10.1016/S0140-6736(97)11096-0?fields=publicationTypes`; `fields=isRetracted` | no marker; unsupported field |
| Preprint | `GET /works/10.1101/2020.04.04.025080` (Crossref); `/works/doi:...` (OpenAlex) | retraction, RW record 23475; true |
| Wayback | `GET https://archive.org/wayback/available?url=example.com` (+`&timestamp=`, unknown domain, geocities 2009); CDX; `HEAD /web/2020/https://example.com/` | snapshot / empty object; CDX offline; 302 |
| Page behaviour | `curl -A ResearchieBot/0.1` to NEJM, ScienceDirect, `doi.org`, `example.com/does-not-exist-xyz` | 403, 403, 302, 404 |
| NISO, COPE, ICMJE, Zotero | PDF/pages/source read as cited | quotes above |
