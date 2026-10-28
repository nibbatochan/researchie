# Free research-paper APIs for Researchie

Access date for every source below: 2026-10-28.

Verification labels:
- **Fetched:** text read from the owning page in this session.
- **Snippet:** text from a search-result summary that cites the owning page. The page itself did not load. Re-check before relying on it.
- **Unreachable:** the host did not resolve from the research sandbox. Nothing on it is verified.

## Question

Can Researchie pull data from many research articles through a free API, to give better AI answers with citations?

## Short answer

Yes. Three candidates. OpenAlex is the best fit and is already partly wired into the app. Semantic Scholar is useful for abstracts and citation links, but its license limits how the data can be used. SciSpace has an API, but it is credit-based and its free tier is small. None of them gives full text for most papers. For full text, a separate open-access source is needed (Europe PMC, CORE, or Unpaywall). Those were not researched here.

## Options

### 1. OpenAlex (recommended)

- **Free use:** "OpenAlex data is free, and so is casual use of the API." Basic queries work with no key. **Fetched** from the OpenAlex help page, which now lives at `help.openalex.org` (the old `docs.openalex.org` URL redirects there).
- **Keys:** free. Sign up on the site and copy the key. **Fetched.**
- **Limits:**
  - No key: 10 requests/second. Daily budget about $0.10.
  - Free key: 30 requests/second. Daily budget $1. Usage beyond the budget is billed.
  - Semantic search: 1 request/second.
  - A 429 for per-second limits costs nothing. Retry with backoff.
  - **Fetched.**
- **Cost per call:** list and filter calls about $0.10 per 1,000. Single-record lookups are much cheaper. The response `meta` reports the cost of each call. **Snippet** only (from a search summary of the OpenAlex docs, not the fetched page). Re-check on the live page before budgeting.
- **Data:** papers with title, authors, year, venue, DOI, citation counts, referenced works, and `is_retracted`. Abstracts come as an inverted index that must be rebuilt into text.
- **Licensing for abstracts and full text:** not stated on the page read. **Unverified.** Check before any redistribution.
- **Already in the repo:** `src/lib/citations/lookup.ts`, `src/lib/citations/status.ts`, and a `OPENALEX_API_KEY` note in `docs/RESEARCH_AND_BUILD_PLAN.md`.

### 2. Semantic Scholar API

- **Key:** requested through a form on the product page. Emailed on approval. **Fetched.**
- **Key cost:** the page does not say whether it is free. **Unverified.** Earlier research notes said free, but no primary page confirmed it.
- **Limits:** without a key, "1000 requests per second shared among all unauthenticated users." With a key, the introductory limit is 1 request/second on all endpoints. The page gives no higher figure. Third-party sources cite other numbers. Treat all of them as unreliable until measured. **Fetched** for the official wording.
- **Data:** abstracts, TLDR, citation and reference graph. The strongest data for citation chains.
- **License (the constraint):** **Fetched** from the Semantic Scholar API license page:
  - Use is "solely in operation with compatible third-party platforms and software."
  - Redistribution is prohibited: no "repackage, sell, rent, lease, lend, distribute, or sublicense the API."
  - Keys may not be shared outside the licensee's organisation.
  - Attribution is required: "Semantic Scholar" on the website or in published materials.
  - Commercial use and caching are not addressed. AI2 may end access "any time for any reason."
  - Scientific publications that use the API must cite the Semantic Scholar Open Data Platform.
- **Implication:** using it as a source inside an AI answer is probably fine with attribution. Storing or re-serving its data in bulk, or building a product on it commercially, needs a legal read first.

### 3. SciSpace API

- **Existence:** yes. Docs at `docs.api.scispace.com`. The docs host did not resolve from the research sandbox. **Unreachable.** Everything below is **Snippet** only, from search results citing the official docs.
- **Access:** by application through an "Apply for API Access" form. Keys issued after approval. Free during public beta. **Snippet.**
- **Free tier:** Developer plan, 500 credits a month, 60 requests/minute. **Snippet.**
- **Cost per operation:** standard search 5 credits, high_quality 15, deep_review 60. Chat message 2 credits at standard depth. **Snippet.**
- **Credits:** 500 credits is about 100 standard searches a month. Top-ups $10 per 1,000 credits. Paid tiers: Scale $99/month, Enterprise custom. **Snippet.**
- **Shape:** search is an asynchronous POST to `https://api.scispace.com/v1/searches`, then polled. **Snippet.**
- **Caveat:** no source confirms that free access continues after the beta. **Unverified.**
- **Overlap:** SciSpace already does Q&A over papers. Using it inside Researchie could duplicate the app's own AI Q&A, and it adds a per-query cost.

## Gaps

- **Full text.** None of the three gives full text reliably. The next step is to check Europe PMC (open-access full text for biomedical work), CORE, and Unpaywall. Not researched here.
- **Retraction checks.** The existing three-source check (Crossref, OpenAlex, PubMed) is unchanged by this research. See `docs/CITATION_API_RESEARCH.md`.

## Recommendation

1. Use **OpenAlex** as the main discovery source. Create a free key, set `OPENALEX_API_KEY`, and cap calls per request.
2. Add **Semantic Scholar** only for abstracts and citation links, after reading its license against the intended use. Attribute it in the UI.
3. Skip **SciSpace** for now. Its free tier is too small for a per-question answer loop, and its answers overlap with the app's own. Revisit if the beta terms are confirmed.
4. Next research pass: open-access full text (Europe PMC, CORE, Unpaywall) and the OpenAlex licensing terms for abstracts.

## Sources

- OpenAlex rate limits and authentication: https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication (redirected from https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication). **Fetched.**
- Semantic Scholar API product page: https://www.semanticscholar.org/product/api . **Fetched.**
- Semantic Scholar API license: https://semanticscholar.org/product/api/license . **Fetched.**
- SciSpace API docs: https://docs.api.scispace.com/ . **Unreachable.** Snippet from search only.
- SciSpace pricing and credits: https://docs.api.scispace.com/platform/pricing-and-credits.md . **Unreachable.** Snippet from search only.
