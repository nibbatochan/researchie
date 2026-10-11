# Citation API Research

Access date for every source below: 2026-10-12.

Verification labels used in this file:
- **Verified (fetched):** text was read from the owning page in this session.
- **Verified (snippet):** text came from a search-result snippet that cites the owning page, but the page itself did not load. Re-check before relying on it.
- **UNVERIFIED:** could not be confirmed from a primary source. Do not implement against these without checking.

## Summary

- Resolution order for a DOI: Crossref works lookup first. If Crossref returns 404, call the DOI registration agency lookup (`doi.org/doiRA/{doi}`), then DataCite if the RA is DataCite. Use content negotiation (`doi.org/{doi}` with an Accept header) as a fallback when the RA's own API is not implemented.
- Crossref: send `mailto` (query parameter or User-Agent) to reach the polite pool (10 req/s, 3 concurrent). Read `x-rate-limit-limit`, `x-rate-limit-interval`, and `x-concurrency-limit` on each response. Back off on HTTP 429.
- DataCite: `https://api.datacite.org/dois/{doi}`. Fields live under `data.attributes`. Send a User-Agent with a contact address for frequent requests. No published rate limit was found.
- PubMed: E-utilities with `tool` and `email`. Limit is 3 req/s without an API key and 10 req/s with one. Retraction status comes from publication types ("Retracted Publication", "Retraction of Publication") and from Crossref `update-to`. Efetch parameter usage is conflicting across sources and needs checking against NCBI.
- Metadata: Highwire `citation_*` tags are Google Scholar's preferred format. Dublin Core is a last resort per Google. schema.org `ScholarlyArticle` is a subtype of `Article`.
- Style guides: NLM sample references were fetched. APA 7 and AMA 11 primary pages could not be loaded, so their field lists are mostly UNVERIFIED.

---

## 1. Crossref REST API

### 1.1 Works lookup by DOI

- Endpoint: `https://api.crossref.org/works/{doi}`. **Verified (snippet)**, from https://crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/ (the access page was fetched; the path form was confirmed in the Crossref REST API docs repo, https://github.com/crossref/rest-api-doc). The `{doi}` value is the DOI string, URL-encoded if needed.
- Response envelope: `status`, `message-type`, `message-version`, `message`. The work record is in `message`. **Verified (snippet)** from https://github.com/CrossRef/rest-api-doc/blob/master/api_format.md (fetched).
- Field names confirmed from the works JSON format reference (https://github.com/CrossRef/rest-api-doc/blob/master/api_format.md, fetched):
  - `title` (array of strings). Also `subtitle`, `short-title`, `original-title`.
  - `author` (array of contributor objects).
  - `container-title` (array of strings).
  - `volume`, `issue`, `page`, `type`, `DOI`, `ISSN` (array), `issn-type` (array of objects with type).
- **Publication date:** there is no field named `published`. The fetched reference names `published-print`, `published-online`, and `issued` (the earliest of the two). Use `issued` for the best single date, falling back to `published-print` then `published-online`. Exact date-parts structure: `{ "date-parts": [[YYYY, MM, DD]] }` is **UNVERIFIED** (not seen in the fetched text).
- Accepting DOI formats, redirect behavior, and error codes beyond 429: **UNVERIFIED**.

### 1.2 Polite pool (mailto)

- Quote from Crossref access page (fetched): "Include your email address in the `mailto` parameter or `agent` header." The same page also says: "Use the `mailto` parameter and specify a `User-Agent` header that identifies you and your script." **Verified (fetched).** Source: https://crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/
- Concrete form: `https://api.crossref.org/works/{doi}?mailto=you@example.com`. **Verified (snippet)**, from the Crossref blog on rate-limit changes.
- Crossref rate-limits by email address, not IP. A shared default address will throttle every user who shares it. **Verified (snippet)**, from https://www-crossref-org.turing.library.northwestern.edu/blog/announcing-changes-to-rest-api-rate-limits (mirror; canonical crossref.org page not loaded). Use a real, per-app contact.

### 1.3 Rate limits and headers

Access page table (fetched), per https://crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/:

| Pool | Requests per interval | Concurrent |
|---|---|---|
| Public | 5 | 1 |
| Polite (mailto) | 10 | 3 |
| Plus (paid) | 150 | no limit |

- Headers: `x-rate-limit-limit` and `x-rate-limit-interval` (rate), `x-concurrency-limit` (concurrency). **Verified (fetched).**
- Exceeding a limit returns HTTP 429. The page recommends waiting, then retrying at a lower rate or with fewer simultaneous requests. **Verified (fetched).**
- Older third-party pages cite a flat 50 req/s. These are outdated per the current tiered table. **Verified (fetched)** that the current table differs.
- Split of single-record vs list limits (single DOI 10/s polite; list queries 3/s polite): **Verified (snippet)** from a Crossref blog snippet and a community forum post. **UNVERIFIED** against the canonical page. Do not hard-code it; read the headers.

### 1.4 Retraction and correction metadata

- Crossref's `update-to` array on a work record. Example from the Crossref blog (fetched, https://www.crossref.org/blog/retraction-watch-retractions-now-in-the-crossref-api/):
  - Each entry has `DOI`, `type` (e.g., `retraction`), `source`, and `label`. Example shows `"source": "publisher"` and `"source": "retraction-watch"` with a `record-id`.
  - `source` values: "`publisher` or `retraction-watch`" (quote from blog, fetched). The blog text also says the field "states where the retraction came from".
- Filter for all retractions: `https://api.crossref.org/v1/works?filter=update-type:retraction` (fetched from the blog).
- Crossmark deposit: the notice's own record carries the link, and Crossref's internal API adds `updated-by` to the original. Source: https://support.crossref.org/hc/en-us/articles/115000501246-Crossmark-registering-updates (snippet, not fetched). **Verified (snippet).**
- `is-retraction-of` as a field name: **UNVERIFIED**. The search did not confirm it. Use `update-to` as the field to check.
- Caveat: the `update-to` / `update-nature` data also includes corrections and expressions of concern, not only retractions. **Verified (snippet)** from https://arxiv.org/pdf/2403.13339. Filter by `type` in the update entry, not just presence.

---

## 2. DataCite REST API

### 2.1 Endpoint and lookup

- Production base: `https://api.datacite.org`. Test base: `https://api.test.datacite.org`. **Verified (fetched)**, https://support.datacite.org/docs/api
- Single DOI: GET `https://api.datacite.org/dois/{id}`, with `{id}` replaced by the DOI. Example in docs: `curl "https://api.datacite.org/dois/10.14454/qdd3-ps68"`. **Verified (fetched)**, https://support.datacite.org/docs/api-get-doi
- Optional query parameters: `?affiliation=true&publisher=true` for affiliation and publisher identifiers; `enriched=true` for the enriched form. **Verified (fetched)**, same page.
- No required request headers are shown on the single-DOI page. **Verified (fetched)**, same page.

### 2.2 Response shape

The fetched example (https://support.datacite.org/docs/api-get-doi) shows these JSON paths. Paths are derived from the example rather than stated explicitly in the text, so treat them as verified-by-example:

| Field | Path | Verified |
|---|---|---|
| Title | `data.attributes.titles[0].title` | by example |
| Creators | `data.attributes.creators` (each has `name`) | by example |
| Publisher | `data.attributes.publisher` | by example |
| Publication year | `data.attributes.publicationYear` | by example |
| Container | `data.attributes.container` | by example (empty in example) |
| Resource type | `data.attributes.types.resourceTypeGeneral` | by example |
| URL | `data.attributes.url` | by example |
| Identifiers | `data.attributes.identifiers` | by example (empty in example) |

- Response is JSON:API style with top-level `data`. **Verified (fetched)**, https://support.datacite.org/docs/api
- Additional fields at the bottom of the single-DOI response: `metadataVersion`, `state`, `citationCount`. **Verified (fetched)**, https://support.datacite.org/docs/how-do-i-query-the-rest-api-and-whats-in-the-response
- `volume` and `issue` paths: **UNVERIFIED**. Not in the fetched example. Check a live response before mapping them.
- `page`/`firstPage`/`lastPage` paths: **UNVERIFIED**.

### 2.3 User-Agent and rate limits

- DataCite asks for a `User-Agent` header with an identification of the script and a contact, for example `MyCustomScript/1.0 (https://mycustomscript.org; mailto:youremail@example.com)`. **Verified (fetched)**, https://support.datacite.org/docs/api
- No numeric rate limit was stated on the fetched page. **Verified (fetched)** that none is listed. Numeric limits: **UNVERIFIED**.
- Public API returns Findable DOIs only, excluding draft and Registered DOIs. **Verified (snippet)** from a DataCite support snippet. Confirm before relying on it for not-yet-findable records.

### 2.4 When to use DataCite

- Use DataCite when the DOI's registration agency is DataCite. Check the RA first (section 2.5).
- Common cases: datasets, software, and other repository outputs. Crossref does not register these.
- Decision rule: if `doi.org/doiRA/{doi}` returns `DataCite` as the RA, query `api.datacite.org`. If it returns `Crossref`, query `api.crossref.org`. The RA-based decision is my inference from the two verified mechanisms; it is not stated in one primary source.

### 2.5 DOI registration agency lookup

- Endpoint: `https://doi.org/doiRA/{doi}` (fetched). Multiple DOIs can be comma-separated in one request. **Verified (fetched)**, https://www.doi.org/factsheets/DOIProxy.html
- Response: JSON array; each entry has keys `DOI` and `RA`. **Verified (fetched)**, same page.
- Error states: "Invalid DOI", "DOI does not exist", "Unknown". **Verified (fetched)**, same page.
- The page's section is titled "Which RA?". The full RA name list is linked from that page. **Verified (fetched)**.

### 2.6 Content negotiation (fallback)

Source: https://citation.doi.org/docs.html (fetched; the older citation.crosscite.org URL redirects here).

- Accept header examples (fetched):
  - `Accept: application/vnd.citationstyles.csl+json;q=1.0` with `application/rdf+xml;q=0.5` as fallback.
  - `Accept: application/vnd.crossref.unixref+xml;q=1, application/rdf+xml;q=0.5`.
  - `Accept: text/x-bibliography; style=apa` for a formatted citation.
- Redirect behavior (fetched): "The DOI resolver at doi.org will normally redirect a user to the resource location of a DOI." "Normal browser requests or explicit requests for text/html redirect to the content's landing page." "Requests for a data type redirect to a registration agency's metadata service."
- "Most DOI registration agencies support content negotiated DOIs via their respective resolvers." (fetched)
- `application/x-bibtex` appears in the supported content types table only. Its exact name in the table: **Verified (fetched)** only as a table entry.
- User-Agent or rate-limit guidance for doi.org content negotiation: **not stated** on the fetched page. **UNVERIFIED** whether doi.org applies its own limits.

---

## 3. PubMed E-utilities (NCBI)

### 3.1 Access and rate limits

- Overview page: https://www.ncbi.nlm.nih.gov/books/NBK25497/ (NCBI Bookshelf). **Could not load directly** (reCAPTCHA interstitial, fetched in this session).
- Rate limit: 3 requests per second without an API key, 10 per second with one. **Verified (snippet)** from search results citing NBK25497 and NBK25500. Re-check on the NCBI page before shipping.
- API key: sent as the `api_key` parameter. Keys come from NCBI account settings. One key per user. **Verified (snippet)**.
- `tool` and `email` parameters: `tool` is a single-word string identifying the software; `email` must be the developer's address, not an end user's. NCBI states that values must be **registered** with NCBI, and that sending them is not sufficient on its own. **Verified (snippet)**. Registration procedure: **UNVERIFIED** (not on any fetched page).

### 3.2 esearch

- Endpoint: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`. **UNVERIFIED** as an exact URL on a fetched page (the host is widely cited; confirm).
- Parameters: `db`, `term`, `retmode`, `retmax`, `usehistory`. Parameter names: **UNVERIFIED** against a fetched page.

### 3.3 efetch (PMID to record)

- Endpoint: `.../efetch.fcgi`, with `db=pubmed` and comma-separated `id` values. **Verified (snippet)**, a secondary wiki snippet.
- **Conflict to resolve:** one snippet gives `rettype=abstract&retmode=xml`; the NLM DataGuide page (https://dataguide.nlm.nih.gov/eutilities/how_eutilities_works.html, fetched) gives `retmode=abstract&rettype=text`. The DataGuide page says it "is not currently being updated" and points to NCBI for current information. **UNVERIFIED** which is current. Pin the working combination against a live request.
- Output: XML or text for PubMed, not JSON. **Verified (snippet)**.

### 3.4 esummary

- Endpoint: `.../esummary.fcgi`. Returns one summary per ID with title, authors, journal, as described in a secondary snippet. Full parameter list and JSON output option: **UNVERIFIED**.

### 3.5 Retraction status in PubMed

- Publication types (MeSH-based, indexed in PubMed):
  - "Retracted Publication" (MeSH D016441). Labels the article that was retracted. **Verified (snippet)** from a library source citing the MeSH record.
  - "Retraction of Publication" (MeSH D016440). Labels the notice that retracts an article. **Verified (snippet)**.
  - Filter syntax: `"Retracted Publication"[PTYP]`. **Verified (snippet)**.
- MEDLINE XML links the two records through `CommentsCorrections` elements with `RefType` values `RetractionOf` or `PartialRetractionOf`. **Verified (snippet)**. A single notice can point to multiple retracted articles.
- PubMed help page for publication types (https://pubmed.ncbi.nlm.nih.gov/help/): fetched, but the relevant section was past the truncation point. Confirms that publication types can come from the publisher or from MEDLINE indexing. **Verified (fetched)**.
- Recommended check: use `update-to` from Crossref and `Retracted Publication` from PubMed together. Neither source is complete alone.

---

## 4. Metadata tags on journal and preprint pages

### 4.1 Google Scholar / Highwire guidance

Source: https://scholar.google.com/intl/en/scholar/inclusion.html (fetched).

- Google Scholar prefers Highwire Press `citation_*` tags. Dublin Core is a last resort because it has no unambiguous fields for journal title, volume, issue, or pages. **Verified (fetched).**
- Tags the page names as examples: `citation_title`, `citation_author`, `citation_pdf_url`, `citation_publication_date`, `citation_journal_title`, `citation_volume`, `citation_issue`, `citation_firstpage`, `citation_lastpage`. **Verified (fetched).**
- `citation_doi`: the fetched text named the tag only in a search summary and did not confirm it on the page. **UNVERIFIED** from Google's page.
- `citation_pmid`, `citation_arxiv_id`: **UNVERIFIED**. Not on the fetched Google page.
- PDF rules (fetched): PDFs must have searchable text. PDFs without linking are treated as if they had no meta tags. Provide meta tags for all versions of the paper. Linking tags named by the page: `citation_pdf_url` or `DC.identifier`.
- The Highwire spec itself (the original tag list): **not fetched**. Treat the Google page as the authority for what Google reads.

### 4.2 Dublin Core

Source: https://www.dublincore.org/specifications/dublin-core/dcmi-terms/ (fetched).

- Namespaces: `http://purl.org/dc/terms/` (`dcterms:`) and `http://purl.org/dc/elements/1.1/` (`dc:`). **Verified (fetched).**
- Definitions (fetched):
  - `title`: "A name given to the resource."
  - `creator`: "An entity responsible for making the resource."
  - `date`: "A point or period of time associated with an event in the lifecycle of the resource."
  - `issued`: "Date of formal issuance of the resource."
  - `identifier`: "An unambiguous reference to the resource within a given context."
  - `source`: "A related resource from which the described resource is derived."
  - `isPartOf`: "A related resource in which the described resource is physically or logically included."
  - `bibliographicCitation`: "A bibliographic reference for the resource."
  - `type`: "The nature or genre of the resource."
  - `format`: "The file format, physical medium, or dimensions of the resource."
- `issued`, `isPartOf`, and `bibliographicCitation` exist only in `dcterms:`, not `dc:`. **Verified (fetched).**
- `DC.` and `dc.` prefixes are how the tags appear in HTML head. Google calls them a last resort (section 4.1).

### 4.3 schema.org

Source: https://schema.org/ScholarlyArticle (fetched).

- Hierarchy: `Thing > CreativeWork > Article > ScholarlyArticle`. Description: "A scholarly article." **Verified (fetched).**
- Properties usable for citations (fetched):
  - `headline` (from Article), `author` (from CreativeWork), `datePublished` (from CreativeWork), `isPartOf` (from CreativeWork), `pagination` (from Article, free text such as "1-6, 9, 55"), `pageStart` and `pageEnd` (defined on ScholarlyArticle), `identifier` and `sameAs` (from Thing), `citation` (from CreativeWork). **Verified (fetched).**
- `isbn`, `issn`, `volumeNumber`, `issueNumber`: not in ScholarlyArticle's property table on the fetched page. They appear in examples on `Periodical`, `PublicationVolume`, and `PublicationIssue`. **UNVERIFIED** as properties usable directly on ScholarlyArticle.

---

## 5. Field requirements by style

### 5.1 NLM / Vancouver (ICMJE)

- ICMJE Recommendations, section on references (fetched, https://www.icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html):
  - Reference style follows the NLM Sample References page. **Verified (fetched).**
  - Numbered consecutively in order of first mention. Identify in text with Arabic numerals in parentheses. **Verified (fetched).**
  - Journal titles abbreviated per MEDLINE style. **Verified (fetched).**
  - Cite published articles rather than abstracts when possible. Mark accepted but unpublished work "in press" or "forthcoming". Mark preprints clearly. **Verified (fetched).**
  - Check that cited articles have not been retracted, except when citing the retraction. **Verified (fetched).**
  - AI-generated material is not acceptable as a primary source. **Verified (fetched).**

- NLM Sample References (fetched, https://www.nlm.nih.gov/bsd/uniform_requirements.html is the ICMJE copy; the Samples page was fetched from a search-linked URL, "Last Reviewed: June 2, 2026"):
  - Based on NISO Z39.29-2005 (R2010), adapted by NLM. **Verified (fetched).**
  - Author lists: "List the first six authors, followed by et al." with the note "NLM now lists all authors." Both quoted from the fetched page. **Verified (fetched).**
  - Continuous pagination: "omit the month and issue number" (optional element). **Verified (fetched).**
  - Preprints: author, title, server name, "[Preprint]", date, "[cited ...]", "Available from:" with URL or DOI. **Verified (fetched).**
  - NLM prefers "Forthcoming" over "In press". **Verified (fetched).**
  - Software: publisher is optional and place of publication is not needed. **Verified (fetched).**
  - PubMed IDs, DOIs, and clinical trial numbers are optional additions. **Verified (fetched).**
  - The page has no formal list of required elements. **Verified (fetched).**

- Field requirements per type (Vancouver):

| Type | Required (per fetched NLM text) | Optional | Notes |
|---|---|---|---|
| Journal article | Authors, title, journal (abbreviated), year, volume, pages | Issue (omit if continuous pagination), DOI, PMID | First 6 authors then et al. (NLM now lists all) |
| Preprint | Authors, title, server, `[Preprint]`, date, `[cited ...]`, Available from | DOI | Mark preprints clearly (ICMJE) |
| Web page | **UNVERIFIED** | | Fetch NLM Samples page section for electronic material |
| Report | **UNVERIFIED** | | |
| Dataset | **UNVERIFIED** | | |
| Book chapter | **UNVERIFIED** | | |

Items marked required in the journal row are my synthesis from the examples. The NLM page does not give a formal required list, so treat them as implementation guesses.

### 5.2 AMA 11th edition

Primary AMA Manual pages (amamanualofstyle.com) were **not loaded**. Findings below are from secondary library guides in search snippets.

- Journal article core elements: authors, article title, journal abbreviation, year, volume and issue, page range. DOI preferred when one exists. **Verified (snippet)**, JCU library guide (https://libguides.jcu.edu.au/ama).
- Authors: last name then initials, no periods. List all if six or fewer; if more than six, list first three then "et al." **Verified (snippet)**, same guide family.
- References numbered in order of first appearance, not alphabetized. **Verified (snippet)**.
- 11th edition no longer recommends publisher location. **Verified (snippet)**.
- Accessed date not needed when a DOI exists. **Verified (snippet)**.
- Preprint, dataset, book chapter, web page, report formats: **UNVERIFIED**. The 11th edition has a References chapter with digital source examples (section 3.12 cited by one guide). Pull the exact patterns from the manual.

### 5.3 APA 7

Primary APA pages (apastyle.apa.org) returned empty content in this session. The findings below are from search snippets and general knowledge, not fetched text.

- Journal article: **Verified (snippet)** that the example is in Publication Manual section 10.1 (https://atlantictu.libguides.com/APA7/referencelist/examples). Element pattern and DOI form (`https://doi.org/`): **UNVERIFIED** on a primary page.
- Book: author(s) with initials, year, italicized title, edition if not first, publisher. **Verified (snippet)** from a library guide.
- E-books without DOI: referenced like print. **Verified (snippet)**.
- Database names: omit, except for limited-circulation databases such as ERIC, Factiva, Cochrane. **Verified (snippet)**.
- Electronic works without DOI or link: referenced like the printed version. **Verified (snippet)**.
- Book chapter, preprint, dataset, web page, report: **UNVERIFIED**. Patterns in general knowledge (not verified) use `In` editors, `[Data set]` brackets for datasets, and `[Preprint]` labels. Do not implement these until checked against the Publication Manual or apastyle.apa.org.

---

## Open questions / unverified

1. **Crossref:** exact date-parts shape (`issued.date-parts`) and whether DOIs need URL encoding in the path. Confirm against a live response.
2. **Crossref:** the split of single-record vs list-query limits (10/s and 3/s in polite pool). Only search snippets support it. Check the canonical rate-limit page.
3. **Crossref:** `is-retraction-of` as a field name. Not confirmed; `update-to` is verified.
4. **DataCite:** numeric rate limits; `volume`, `issue`, and page paths; whether the public API excludes non-Findable DOIs (snippet only).
5. **DataCite and DOI content negotiation:** rate or User-Agent rules on `doi.org` itself.
6. **NCBI:** esearch exact URL and parameter names; efetch `rettype`/`retmode` values (sources conflict); esummary parameters and JSON option; the registration procedure for `tool` and `email`. The overview page NBK25497 could not be loaded directly.
7. **Highwire tags:** `citation_doi`, `citation_pmid`, `citation_arxiv_id` are not confirmed from Google's page. The original Highwire spec was not fetched.
8. **schema.org:** whether `volumeNumber`, `issueNumber`, `isbn`, `issn` are valid direct properties of `ScholarlyArticle`.
9. **NLM:** required-element lists for web page, report, dataset, and book chapter.
10. **APA 7:** all field patterns except the book and e-book notes. Primary pages returned empty.
11. **AMA 11:** preprint, dataset, book chapter, web page, report patterns. Primary manual not loaded.
12. **Crossref `published` naming:** the fetched reference does not contain a field named `published`. Confirm whether any consumer expects it before mapping.

## Live verification (2026-10-12)

Checked by direct requests. Test DOI/PMID: 10.1038/nature12373 / PMID 23903748.

**Confirmed**
- Crossref `GET /works/{doi}` returns 200. Headers: `x-rate-limit-limit: 10`, `x-rate-limit-interval: 1s`, `x-concurrency-limit: 3` (polite pool with `mailto`). Fields used: `type` (journal-article), `volume`, `issue`, `page` ("54-58"), `container-title`, `author[].family/given`, `issued`, `published-print`, `published-online`. Date-parts shape is `{"date-parts": [[2013, 7, 31]]}`. `update-to` is absent for this record, as expected for a non-retracted paper.
- DOI agency `GET https://doi.org/doiRA/{doi}` returns `[{"DOI": ..., "RA": "Crossref"}]`.
- DataCite `GET https://api.datacite.org/dois/{doi}` returns 404 for a made-up Zenodo DOI, so the endpoint answers. A real record was found with `GET /dois?query=...`. Fields are under `data.attributes`: `titles[].title`, `creators[]`, `publicationYear`, `publisher`, `container`, `dates[]`.
- PubMed `esearch` with `term=<doi>[doi]` returns the PMID in `esearchresult.idlist`. The term needs URL encoding in curl (`-g`). PubMed translates the DOI to `[Publisher ID]`, so the match works.
- PubMed `efetch` with `rettype=abstract&retmode=xml` works and returns full XML. `PublicationType` values (for example `D052061`) appear in the default XML. Retraction-type UIDs were not seen on this record, so the check is still needed on a retracted paper.
- PubMed `esummary` with `retmode=json` returns `result.<pmid>` with `pubdate`, `source`, and `authors[].name`.
- Nature article HTML exposes these `citation_*` tags: `citation_title`, `citation_author`, `citation_journal_title`, `citation_journal_abbrev`, `citation_publisher`, `citation_issn`, `citation_volume`, `citation_issue`, `citation_publication_date` (`2013/08`), `citation_online_date`, `citation_firstpage`, `citation_lastpage`, `citation_doi`, `citation_pdf_url`, `citation_fulltext_html_url`, `citation_language`, `citation_article_type`. Also `dc.*` tags and one `application/ld+json` block.

**Trap found**
- Journal pages include `citation_reference` tags with the paper's full bibliography. Those entries are secondary. Never make a clip or citation from them. This matches the plan's guardrail: "Never cite a paper that appears only in a source page's reference list."

**Still unverified**
- `citation_pmid` and `citation_arxiv_id` were not present on this Nature page. Check a PubMed-indexed page and an arXiv page before relying on them.
- APA 7 and AMA 11 field lists: the APA example pages returned about 900 bytes of non-article HTML. Not verified. Needs the Publication Manual or the AMA Manual.
- PubMed retraction check: needs a test on a known retracted PMID before the logic is written.
- Crossref lookup for a retracted paper (`update-to` with `update-type: retraction`): not tested.
- Web page, report, dataset and book chapter formats for all three styles: not verified.
