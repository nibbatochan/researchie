# Source health: states, storage and schedule (design note, S-78)

Date: 2026-10-20. Status: design only. Feeds S-79 (scheduled retraction re-check), S-80 (page-changed detection) and S-81 (project dashboard). Author: Opus (designer). Builder: Sonnet, per the S-69 rules in `SCOPE.md`.

Inputs read: `SCOPE.md` (S-69 to S-81), `docs/PILLAR_A_SOURCE_HEALTH_PLAN.md`, `docs/RESEARCH_AND_BUILD_PLAN.md`, `docs/RETRACTION_MECHANICS_RESEARCH.md` (RMR below), `docs/COMPETITOR_ANALYSIS.md`, `docs/DECISIONS.md`, `docs/SECURITY_DECISIONS.md`, `docs/CONTEXT.md`, and the code named in each section.

Where this note and the Pillar A plan differ, this note wins. The one big change: **health is stored in two new tables, not in `metadata.health`** (reasons in section 2).

---

## 1. The states

A clip has two separate checks. Each has its own state. The card shows one badge, picked by the rule at the end of this section.

### 1a. Retraction check (per paper, keyed by DOI or PMID)

These are the states that already exist in `src/lib/health/types.ts` (`RetractionState`) and `src/lib/citations/status.ts`. Keep the names.

| State | What the researcher reads | Rule that sets it |
| :-- | :-- | :-- |
| `retracted` | "This paper was retracted on {date}. Do not rely on it. Read the notice." | Crossref `retraction` or `withdrawal`, PubMed D016441 or `RetractionIn`, or OpenAlex `is_retracted` on a work whose type is not `retraction` (`status.ts`). |
| `removed` | "The publisher removed this paper. Do not cite it." | Crossref `removal` (`status.ts:49`). |
| `concern` | "The publisher has raised a concern about this paper. It may still be sound. Read the notice." | `expression_of_concern`, `partial_retraction`, `ExpressionOfConcernIn`. |
| `corrected` | "A correction was published on {date}. Check what changed before you cite it." | `correction`, `corrigendum`, `erratum`, `ErratumIn`. |
| `notice` | "This clip is a retraction or correction notice for another paper, not the paper itself." | The clipped item is the notice (`classifyCrossrefWork`, `classifyPubmedXml`, `classifyOpenAlex`). |
| `none_found` | "No retraction, correction or concern found in Crossref, OpenAlex and PubMed on {date}. This does not prove the paper is sound." | At least one source answered and none reported a problem (`describeNoIssue`). |
| `unknown` | "Could not check for retraction on {date}. We will try again." | No source answered. Never shown as fine (RMR 12.4). |
| (no row) | "Not checked for retraction: no DOI or PMID." | The clip has no DOI or PMID. |

`replaced: true` adds "A newer version was published. Cite that version." (`status.ts:77`).

### 1b. Page check (per clip, keyed by the clip's `sourceUrl` and its passage)

New names. They replace `PageState` in `src/lib/health/types.ts` (`unchanged` becomes `verified`, `unknown` becomes `could_not_check`).

| State | What the researcher reads | Rule that sets it |
| :-- | :-- | :-- |
| `unchecked` | "Not checked yet." | Row exists, no check has run. |
| `verified` | "Your quote was on the page on {date}." | The passage was found word for word (after normalising) on the live page. |
| `moved` | "The page has a new address. Your quote is still there." | A permanent redirect (301 or 308) to a different address, and the passage was found there. |
| `changed` | "The page no longer has your quote word for word. Here is what it says now. Your saved copy is below." | Two real misses, at least 20 hours apart, where the page loaded and is a real article, and enough of the passage or its surrounding text is still there (section 4b). |
| `gone` | Page missing: "This page no longer exists (checked {date 1} and {date 2}). Your saved copy is below." Quote missing: "The page is still there but your quote is not on it (checked twice). Your saved copy is below." | Two real misses at least 20 hours apart: 404 or 410 or a soft 404 (`reason: page_missing`), or a real article with almost none of the passage (`reason: quote_missing`). |
| `could_not_check` | "We could not check this page on {date}: {reason}." Reasons in section 5. | Blocked, login, paywall, script-built page, timeout, network error, robots.txt, PDF. |
| `not_applicable` | Nothing shown. | Uploaded PDFs, notes, clips with no http(s) source address. |

"Verified" here only means "the quote was on the page on that date". Never use "verified" for the retraction side (RMR 12.4).

### 1c. How the two combine, and which badge wins

A clip can be both `changed` and `retracted`. Both are stored and both are listed in the detail panel. The card shows the most serious one, plus "+1" when there is a second problem. Order, most serious first:

1. `retracted`, `removed`
2. `concern`
3. `corrected`
4. `gone`
5. `changed`
6. `moved`
7. `notice`
8. `could_not_check` (page) or `unknown` (retraction)
9. `unchecked`, `none_found`, `verified` (no badge)

Publisher statements rank above our page observations because they are stronger evidence: a publisher says the science is wrong; a page check only says the text moved. Put this order in one pure function, `displayState(retraction, page, ack)`, in `src/lib/health/display.ts`, so the card, dashboard and exports cannot disagree.

**Acknowledged.** When the researcher keeps a flagged clip (section 5), the badge turns muted ("Seen") until the state gets worse than the one they acknowledged (`ack_state`, compared by the order above). This is the existing `acknowledgedState` idea from `types.ts:35`.

---

## 2. Where each state is stored

### Why not `metadata.health`

The Pillar A plan (Data model) put health in `atoms.metadata`. Four problems found in the code:

1. `updateAtom` writes the whole `metadata` object (`src/lib/data/cloud.ts:270-275`). A daily job writing health while the researcher edits a clip would overwrite one or the other.
2. A viewer cannot write to an atom (`canWrite`, `cloud.ts:272`), but a viewer opening a project should still get fresh health.
3. Retraction is a fact about a paper, not a clip. Seventy clips from five papers should cost five checks and one stored answer.
4. The dashboard needs counts without parsing every clip's JSON. PDFs live in a different table (`documents.data.citation`).

Nothing writes `metadata.health` yet (`docs/CHANGELOG.md`, v1.9.15 entry), so dropping it costs nothing. Remove `health?` from `ProvenanceMetadata` (`src/lib/types/research.ts:7`) and keep `SourceHealth` only as the shape the API returns.

### Migration `supabase/migrations/006_source_health.sql` (shape)

```sql
-- One row per paper. Public facts only: no user id, no project id.
CREATE TABLE IF NOT EXISTS public.source_status (
  source_key TEXT PRIMARY KEY,            -- 'doi:' || lower(doi), else 'pmid:' || pmid
  doi TEXT,
  pmid TEXT,
  state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (state IN ('none_found','retracted','removed','concern','corrected','notice','unknown')),
  detail TEXT,
  notice_doi TEXT,
  notice_date DATE,
  sources TEXT[] NOT NULL DEFAULT '{}',   -- which of crossref/openalex/pubmed answered
  replaced BOOLEAN NOT NULL DEFAULT false,
  pending_state TEXT,                     -- a milder state seen once, waiting for a second check (section 4a)
  checked_at TIMESTAMPTZ,                 -- last attempt
  answered_at TIMESTAMPTZ,                -- last attempt where at least one source answered
  state_changed_at TIMESTAMPTZ,
  fail_count INT NOT NULL DEFAULT 0,
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_source_status_due ON public.source_status(next_check_at);

-- One row per clip or per uploaded document.
CREATE TABLE IF NOT EXISTS public.clip_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_id TEXT REFERENCES public.atoms(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
  source_key TEXT,                        -- joins source_status; null when no DOI or PMID
  page_url TEXT,                          -- null when no page check applies
  page_state TEXT NOT NULL DEFAULT 'unchecked'
    CHECK (page_state IN ('unchecked','verified','changed','moved','gone','could_not_check','not_applicable')),
  page_reason TEXT,                       -- page_missing, quote_missing, blocked, login, script, timeout, network, robots, pdf, too_short
  http_status INT,
  final_url TEXT,
  live_excerpt TEXT,                      -- at most 400 characters: what the page says now at the clipped spot
  miss_count INT NOT NULL DEFAULT 0,
  first_miss_at TIMESTAMPTZ,
  etag TEXT,
  last_modified TEXT,
  page_checked_at TIMESTAMPTZ,
  page_next_check_at TIMESTAMPTZ DEFAULT now(),
  ack_state TEXT,
  ack_note TEXT,
  ack_by UUID,
  ack_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (num_nonnulls(atom_id, document_id) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clip_health_atom ON public.clip_health(atom_id) WHERE atom_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_clip_health_doc ON public.clip_health(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clip_health_source ON public.clip_health(source_key);
CREATE INDEX IF NOT EXISTS idx_clip_health_page_due ON public.clip_health(page_next_check_at)
  WHERE page_state <> 'not_applicable';

ALTER TABLE public.source_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_health ENABLE ROW LEVEL SECURITY;
-- No policies: only the server (service role) reads or writes, like 004 and 005.
```

Notes for the builder:

- **No `project_id` column.** The project comes from the atom or document by join, so moving a clip (`deleteProject` with `moveTo`, `cloud.ts:213`) cannot leave a stale value. Reads: list the family's atoms with the existing `readAllRows`, then read `clip_health` with `.in('atom_id', ids)` in chunks of 200.
- **`source_key` comes from one pure function** `sourceKeyOf(atom | document)` in `src/lib/health/keys.ts`: `metadata.citation.doi`, else `metadata.pageIdentifiers.doi`, else the PMIDs in the same order; for documents `data.citation`. DOI lowercased (RMR 12.3). The same file has `pageTargetOf(atom)`: returns `{ url, passage }` or null (rules in 4b).
- **Rows are created by code, not triggers,** so local mode shares the logic: `insertAtom`, `updateAtom` (when `metadata` is in the patch) and `addDocument` upsert the row best-effort (a failure must not fail the save). The daily job also runs a sync step that adds missing rows and fixes stale `source_key` or `page_url`.
- `source_status` holds no user data, so one answer serves every tester who clipped that paper. This is open question 4.
- Access: reading health needs `canRead` on the clip's project. Acknowledging needs `canWrite`, since collaborators see it. Writing check results is done by the server for anyone who can read; it changes no user content.

### Local mode (no accounts, no cron)

One file, `.health-store.json`, with `{ "sources": { [source_key]: SourceStatusRow }, "clips": { [atomOrDocId]: ClipHealthRow } }`, same field names in camelCase. Put it behind a `HealthStore` interface with `cloud` and `local` versions, chosen the way `src/lib/data/store.ts:44` chooses. Add `.health-store.json` to `.gitignore` and `.vercelignore`. Local mode runs checks only on open and on the button.

---

## 3. The check schedule

### What Vercel Hobby allows (checked 2026-10-20)

- Cron jobs: 100 per project, **once per day at most**, and a job set for 01:00 may fire any time from 01:00 to 01:59. A more frequent expression fails the deploy. Source: https://vercel.com/docs/cron-jobs/usage-and-pricing (page dated 2026-07-15).
- Function duration with Fluid compute: 300 seconds default and maximum on Hobby. Source: https://vercel.com/docs/functions/limitations. **Unverified:** that Fluid compute is on for the testers project (Vercel says it is on by default for projects created after 23 April 2025).
- Cron runs only on production deployments, and Vercel sends `Authorization: Bearer $CRON_SECRET` (Vercel docs examples).

### Decisions

| Check | Daily job | On open | Button |
| :-- | :-- | :-- | :-- |
| Retraction | `GET /api/cron/source-health?kind=retraction`, schedule `0 3 * * *`. Every source due (`next_check_at <= now()`), oldest first. | When a project opens, the client calls `POST /api/health/check` for sources in that project not answered in the last 24 hours, at most 25. | "Re-check now" on a clip; "Check all sources" on the dashboard. |
| Page | `GET /api/cron/source-health?kind=page`, schedule `0 4 * * *` (a second daily job, so each gets its own 300 seconds). | Not on open. Page checks are slower and noisier; they wait for the daily job or the button. | Same buttons. |

- **Retraction cadence:** every 24 hours (RMR 11.14 and 12.3: retraction data updates each working day; Zotero checks daily). If the run cannot finish, the rest roll to the next day, oldest first.
- **Page cadence:** every 7 days (RMR 12.3). After a first real miss, the next check is the next daily run (to confirm or clear it). After `could_not_check`, retry next day, up to 3 times, then back to 7 days. After 403, 401 or robots.txt "no", wait 30 days: the site will say no again.
- **Time budget per run:** stop picking new work at 240 seconds and save what is done. Set `export const maxDuration = 300` on the route.
- **On demand:** the route checks at most 25 sources or 10 pages per call and returns what it did; the rest wait for the daily job. It skips anything checked in the last 10 minutes, so repeated clicks cannot hammer anyone (and cannot speed up the two-miss rule, see 4b).
- **No-worker reality:** if the testers' Vercel project is not on Hobby with cron, the on-open and button paths still work. That is the floor.

### Rate limits and politeness

- Retraction: reuse `createResolver` in `src/lib/citations/lookup.ts` once per run, so its limiters are shared: Crossref 10 per second with `mailto` (100 ms gap), PubMed 3 per second without a key, OpenAlex 10 per second. Concurrency 3. Each source gets its own `LookupBudget` of 10. Send `OPENALEX_API_KEY`; without it OpenAlex shares a $0.10 daily allowance per IP (RMR 5). **Unverified:** whether the owner has set that key on Vercel.
- Pages: concurrency 3 in total; one request per host every 5 seconds; at most 20 pages per host per run; read `robots.txt` once per host per run and obey it (RMR 10.4, RFC 9309); stop a host for the run on 429 or `Retry-After`. Send `If-None-Match` and `If-Modified-Since` when stored; a 304 keeps the last result.
- User-Agent: `ResearchieLinkCheck/1.0 (+contact: $HEALTH_CHECK_CONTACT)`. Never rotate agents or retry around a 403 (RMR 10.4).

---

## 4. What a check does

### 4a. Retraction check, step by step

1. Take due rows from `source_status` (and create rows for new `source_key`s found by the sync step).
2. Call `resolver.checkStatus({ doi, pmid })` (`lookup.ts:235`). It already merges Crossref, PubMed and OpenAlex, lets the worst state win, and returns `unknown` when nothing answered.
3. Apply these rules to the stored row:
   - **Result `unknown`:** keep the stored state as it is. Add 1 to `fail_count`, set `checked_at`, do not touch `answered_at`. An outage must neither raise nor clear an alarm.
   - **Worse than stored** (by the order in 1c): store it now. One positive from Crossref, PubMed or OpenAlex is strong evidence. Set `state_changed_at` and send notifications (step 4).
   - **Milder than stored** (for example `retracted` then `none_found`): store it in `pending_state` only. Change the state on the second check in a row that says the same, and only if the source that raised the problem answered both times. Reinstatements are rare (RMR 8) and data errors happen in both directions.
   - **Same:** refresh `checked_at`, `answered_at`, `detail`.
4. **Notify.** When a source becomes `retracted`, `removed`, `concern` or `corrected`, write one row per affected person into `notifications` (migration 005): kind `source_health`, title "A source in {project} was retracted", body naming the clip count. Affected people: owner and members of each project holding a clip with that `source_key`. One notification per person per source per state change.
5. Set `next_check_at = now() + 1 day`.

Also fix in S-79: `src/lib/citations/crossref.ts:89-90` sets `CitationRecord.retracted = true` when a work has an `update-to` of type `retraction`. That work is the notice, not the retracted paper (RMR 11, item 1), so a clipped notice shows "retracted" today. Once `source_status` exists, display reads it first and uses `CitationRecord.retracted` only as a fallback for clips not yet checked.

### 4b. Page check, step by step

**Which clips.** `pageTargetOf(atom)` returns a target only when `metadata.sourceUrl` is http or https, the clip is not a PDF or note (`documentType` is `web` or missing; type is `text`, `quote`, `block`, `link` or `image`), and the URL is not this app's own address. The passage is `content.rawText` (or `content.text`) for text, quote and block clips. Link and image clips get a page-alive check only: they can be `verified`, `moved`, `gone` or `could_not_check`, never `changed`.

**The fetch** (new `src/lib/security/safeFetch.ts`; `isPublicHttpUrl` in `src/lib/security/publicUrl.ts` checks text only and says so in its own comment):

1. Check the URL with `isPublicHttpUrl`. Ports 80 and 443 only.
2. Resolve DNS yourself. Refuse if any address is private, loopback, link-local, CGNAT, multicast, `0.0.0.0/8`, IPv4-mapped IPv6, `fc00::/7`, `fe80::/10`, `ff00::/8` (RMR 10.5).
3. Connect only to the address you checked (pin it through an undici `Agent` `connect.lookup`; keep the Host header and TLS name). **Unverified:** the exact undici option on Vercel's Node version; prove it with a unit test that a second DNS answer is ignored.
4. `redirect: 'manual'`. Follow at most 5 hops, repeating steps 1 to 3 for each.
5. GET, no cookies, no auth headers, 8 second timeout, read at most 2 MB, then stop.
6. Return a verdict to callers, never the body.

Also switch `src/app/api/atoms/rebuild-context/route.ts` and `src/app/api/ocr/route.ts` to `safeFetch`. Today rebuild-context checks only the first URL and then lets `fetch` follow redirects (`route.ts:32-36`), so a public page that redirects to a private address gets through.

**The decision table** (first match wins):

| What happened | Result |
| :-- | :-- |
| DNS failure, connection error, timeout, TLS error | `could_not_check` (`network` or `timeout`). Never a miss. |
| robots.txt disallows the path | `could_not_check` (`robots`) |
| 401, 403, 407, 429, 451, any 5xx | `could_not_check` (`blocked` for 401/403/407/451, `timeout` for 429/5xx) |
| Content type is PDF or not HTML or plain text | `could_not_check` (`pdf` or `blocked`), wait 30 days |
| 404 or 410 | a real miss, `page_missing` |
| 200, but redirected to the site's home page, or the title or main text reads like "page not found" | a real miss, `page_missing` (soft 404, RMR 10.1) |
| 200 with a login, paywall, consent or bot wall ("sign in", "subscribe to", "access through your institution", "verify you are human", "just a moment") | `could_not_check` (`login`) |
| 200 with less than 500 characters of visible text, or an empty app shell (`<noscript>` asking for JavaScript, empty root element) | `could_not_check` (`script`) |
| Passage found (exact match after normalising) | `verified`; or `moved` if a 301 or 308 led to a different address (section below) |
| Passage not found, page is a real article | a real miss: `changed` or `quote_missing` by the match score |

**Normalising and matching.** Use `normalizeForMatch` from `src/lib/ai/claimSupport.ts:22` after two extra steps: `text.normalize('NFKC')` (ligatures) and remove soft hyphens (`­`) before anything else. Strip `<script>`, `<style>`, `<noscript>`, `<nav>`, `<footer>` before taking text. Then:

1. **Exact:** the normalised passage is inside the normalised page text. Found.
2. **Anchors:** take the last 8 words of `metadata.contextPrefix` and the first 8 words of `metadata.contextSuffix` (from the extension, `extension/content.js:601-602`). If both are on the page in order, less than 3 times the passage length apart, the spot still exists and the words between them changed: `changed`, and save those words (up to 400 characters) as `live_excerpt`.
3. **Overlap:** split the passage into 5-word runs. If 50% or more are on the page: `changed` (edited, still there). Below 50%: `quote_missing`.
4. Do not use `checkQuoteAgainstPages` as is: its 80% bag-of-words rule would call a sentence that lost the word "not" unchanged.
5. Passages under 6 words: exact match only; a miss is `changed`, never `quote_missing`.

**The two-miss rule.** A real miss adds 1 to `miss_count` and sets `first_miss_at` if empty. The state changes to `changed` or `gone` only when `miss_count >= 2` and `now - first_miss_at >= 20 hours`. A found result sets `miss_count` to 0. `could_not_check` neither adds to nor resets the count. Until the second miss the clip keeps its previous state.

**Moved.** Only when the chain has a 301 or 308 and the final address differs after ignoring http/https, `www.`, a trailing slash, the fragment and `utm_*` parameters. 302 and 307 are normal (a DOI link always redirects with 302, RMR 10.1) and never count. If the page's `<link rel="canonical">` equals the stored address, it is not moved. Store `final_url`.

**Guards against false alarms** (the app must never say a source is gone because the network was down):

1. **Canary first.** Before page checks, fetch one stable address (`https://example.com/`). If it fails, end the run and write nothing.
2. **Circuit breaker.** If more than half of the fetches so far in a run ended in network errors, stop the run and throw away its misses.
3. Network errors are never misses (table above).
4. Two misses on two different days (rule above).
5. Blocked, login, script and short pages are `could_not_check`, never `changed`.
6. A retraction `unknown` never overwrites a known state (4a).
7. Logs hold counts and status codes only. No URLs, passages or user ids in Vercel logs (tester privacy, `docs/SECURITY_DECISIONS.md` B).

### 4c. What "the cached snapshot" really is

Checked in the code: a text or quote clip keeps `content.rawText`, `content.surroundingParagraphs`, `metadata.contextPrefix` and `metadata.contextSuffix` (`extension/content.js:586-606`). A block clip keeps `content.sanitizedHtml` and `content.standaloneHtml` (`extension/blockPicker.js:344-352`). `visualSnapshot.htmlSnapshot` exists in the type (`research.ts:77`) but nothing in `src/` or `extension/` writes it. So "open the saved copy" shows the saved quote with its surrounding paragraphs, or the saved block, not a full page. `docs/COMPETITOR_ANALYSIS.md` line 32 says "a cached snapshot": true for blocks, only partly true for text.

---

## 5. What the researcher sees and can do

### Badge wording (one short label, the full sentence from section 1 in the detail panel)

| State | Card badge | Look |
| :-- | :-- | :-- |
| `retracted` / `removed` | "Retracted" / "Removed" | amber, filled |
| `concern` | "Concern" | amber outline |
| `corrected` | "Corrected" | amber outline |
| `gone` | "Page gone" or "Quote gone" | amber outline |
| `changed` | "Quote changed" | amber outline |
| `moved` | "Moved" | gray |
| `notice` | "Notice" | gray |
| `could_not_check`, `unknown` | none on the card; gray line in the detail panel | gray |
| `verified`, `none_found`, `unchecked` | none | none |
| acknowledged | "Seen" | muted gray |

Amber for problems follows Decision 15 (`docs/DECISIONS.md`). The PDF theme uses red for "could not be checked" (`src/lib/export/pdf/theme.ts:23`); in the app, "could not check" stays gray so it never reads as an alarm.

Reason lines for `could_not_check`: blocked "the site blocks automatic checks"; login "the page needs a login or subscription"; script "the page is built by scripts we cannot read"; timeout "the site did not answer in time"; network "we could not reach the site"; robots "the site asks robots not to read this page"; pdf "this address is a PDF"; and for retraction `unknown` "the paper databases did not answer".

### Where it shows

- **Clip card** (`AtomCard`, `BlockAtomCard`, `ImageAtomCard`): the badge next to the existing citation dot (`AtomCard.tsx:506`); the detail inside the citation panel, replacing the single `RETRACTED_MESSAGE` box (`AtomCard.tsx:547-551`).
- **PDF reader citation** (`PDFReaderView.tsx:1510` and `1654-1662`): the same component, reading the document's `clip_health` row.
- **Synthesis and Q&A answers:** a warning line under the answer (section 6).
- **Project dashboard (S-81):** counts at the top, then problems grouped by source.
- **Project card in the dashboard list:** "2 sources need attention" when the count is above 0.
- **Notification bell:** retraction-side changes found by the daily job (4a, step 4).

### Dashboard buckets (S-81 names mapped to states)

| Bucket | States |
| :-- | :-- |
| Retracted | `retracted`, `removed` |
| Needs a look | `concern`, `corrected`, `changed`, `moved` |
| Dead | `gone` |
| Unverified | `could_not_check`, `unknown`, `unchecked`, and "no DOI or PMID" |
| No problem found | page `verified` and retraction `none_found` or not applicable |

A clip counts once, in the bucket of its display state (1c). The heading says "No problem found", not "Verified" (RMR 12.4).

### Actions

- **Re-check now** (clip) and **Check all sources** (dashboard). Disabled for 10 minutes after a check, with "Checked just now".
- **Open saved copy:** the stored quote with its surrounding paragraphs, or the stored block (4c).
- **Open the notice:** link to `https://doi.org/{notice_doi}` with source name and date (NISO RP-45 4.2, RMR 7.2).
- **Open an archived copy** (gone or changed): a plain link `https://web.archive.org/web/{capture date as YYYYMMDD}/{url}`, no API call (RMR 10.3). Label: "Try the Internet Archive copy". It may not exist; the label says "try".
- **Use the new address** (moved): asks first, then writes `metadata.sourceUrl` to `final_url` and keeps the old one in `metadata.previousSourceUrls`. Never automatic.
- **Keep this clip** with an optional note ("I am citing it to discuss the retraction"). Stores `ack_state`, `ack_note`, `ack_by`, `ack_at`. Editors and owners only. Reopens if the state gets worse.

The app suggests; the researcher decides. Nothing is deleted, hidden or rewritten by a check.

---

## 6. How a flag flows into notes, answers and exports

Rule: **warnings are computed when shown, from the current health of the cited clips, never frozen at save time.** A paper retracted after a synthesis was saved must show its warning on that old synthesis.

- **Synthesis:** `/api/ai/synthesize` already returns `citationsUsed[].atomId` (`src/app/api/ai/synthesize/route.ts:80-81`). Under the answer, list each cited clip with a problem: "Source warning: [3] was retracted on {date}. Read the notice." The prompt also marks such clips "(RETRACTED)" so the model does not present them as sound, but the deterministic line is the guarantee. **Unverified:** whether a saved synthesis keeps `citationsUsed`; the builder checks this first and stores it if not.
- **Document Q&A:** the document's own row (`document_id`) gives one line above the answer if the PDF's paper is flagged.
- **Notes:** a note that links clips shows the same warning line for each linked clip with a problem.
- **PDF report:** extend `kind` in `src/lib/export/pdf/types.ts:45` with `removed`, `concern`, `corrected`, `changed`, `gone`. Retracted entries get "RETRACTED:" before the title in the bibliography (NISO RP-45 4.2, RMR 7.2). Kept clips print the student's note: "Kept on purpose: {note}".
- **Obsidian:** add `researchie_health: retracted` and `researchie_health_checked: 2026-10-20` to the clip's frontmatter (`src/lib/export/obsidian.ts:248` writes it today) and a `> [!warning]` callout with the sentence.
- **Notion:** a callout block with the sentence before the clip. The fingerprint skip (Decision 5) must include the health state, so a new retraction re-exports that block.
- Acknowledging never removes the mark from exports. It only adds the note.

---

## 7. Build order and sizes

S-79 first (it is cheap, reliable and protects a thesis), then S-81 on retraction data alone, then S-80. Each task below fits one Sonnet session; run `npm run verify` and the unit tests after each.

### S-79 Scheduled retraction re-check (M, about 150k)

1. **Storage (S).** Migration 006 (section 2). Update `src/lib/health/types.ts` (new page names, drop `metadata.health`). `keys.ts` with `sourceKeyOf` and `pageTargetOf`. `HealthStore` with cloud and local versions, tested against the fake database in `tests/helpers/fakeDb.mjs`. `.gitignore` and `.vercelignore` entries.
2. **Runner (S).** `src/lib/health/retractionRunner.ts`: due list, `checkStatus`, the four rules in 4a, notifications, deadline. Clock and resolver injected (same pattern as `lookup.ts`).
3. **Routes (S).** `GET /api/cron/source-health` (Bearer `CRON_SECRET`, `maxDuration = 300`, sync step then the runner); `POST /api/health/check` (`{ projectId }` or `{ atomId }`, `canRead`, caps, 10-minute skip); `GET /api/health?projectId=` (merged per-clip view); `POST /api/health/ack` (`canWrite`). `vercel.json` with the two crons.
4. **Display (S).** `displayState` in `display.ts`; badge and detail on the three cards and the PDF reader; on-open call; fix `crossref.ts:89-90`.
5. **Outputs (S).** Section 6 for synthesis, Q&A, PDF, Obsidian, Notion.
6. **Docs (Haiku, S).** `docs/CHANGELOG.md`, `PROJECT_LOG.md`, a `docs/DECISIONS.md` entry ("Source health lives in its own tables"), a new F-item in `docs/SECURITY_DECISIONS.md` for the cron route and global cache, `docs/CONTEXT.md` row.

### S-81 Source health dashboard (S, about 50k)

1. `summarizeProjectHealth(rows)` pure function with the bucket table; `GET /api/health/summary?projectId=`.
2. Panel (counts, then problems grouped by source with affected clips and actions), the project-card banner, and a feed filter by bucket. Works with retraction data only; page buckets show "Not checked yet" until S-80 lands.

### S-80 Page-changed detection (M, about 150k)

1. **`safeFetch` (S).** Section 4b fetch rules, robots.txt reader, tests with an injected resolver and fetcher. Move rebuild-context and OCR onto it.
2. **Matcher (S).** `src/lib/health/pageMatch.ts`: text extraction, wall and shell detection, exact, anchors, overlap. Pure; fixture pages in `tests/fixtures/pages/`.
3. **Runner (S).** `pageRunner.ts`: due list, canary, circuit breaker, per-host gap, conditional requests, two-miss rule, back-off.
4. **Display (S).** Page badges and reasons, saved copy view, archive link, use-new-address, re-check.
5. **Measure (owner plus Sonnet, S).** Run on 30 real clipped pages twice, a day apart, with no edits. Count false `changed` or `gone`. Gate for open question 1.

### Open questions for the owner

1. **Page checks on by default for testers?** Recommend: off (a project setting, "Check web pages for changes"), until the 30-page run shows at most 1 false alarm. Retraction checks on for everyone.
2. **Bell notifications for retractions found overnight?** Recommend: yes, bell only. There is no mail provider (`docs/SECURITY_DECISIONS.md`, gaps table).
3. **May "Keep this clip" hide the warning in exports?** Recommend: no. Exports always mark it and print the student's note. Citing a retraction to discuss it is allowed (RMR 7.3), and the note shows that.
4. **One shared retraction cache for all testers?** Recommend: yes. `source_status` holds only DOI, PMID and public notices, no user or project id, and is readable only by the server.
5. **Check blocked journal pages from the extension later?** Recommend: later, as an EXTRA item. Most journal sites block a server (NEJM and ScienceDirect returned 403, RMR 10.1), so expect many "could not check" rows for DOI papers until then. Their retraction check still works.

Already open elsewhere and not repeated: Retraction Watch reasons (RESEARCH_AND_BUILD_PLAN Step 4, recommended "ship without").

---

## 8. Test plan

Unit tests (`node --test`, injected fetcher, resolver, DNS and clock; no live network):

**Retraction**
- Each state from the existing fixtures (`src/lib/citations/fixtures/status-*`) lands in `source_status` with the right detail.
- All sources fail: stored `retracted` stays `retracted`; stored `none_found` stays `none_found`; `fail_count` goes up; `answered_at` does not move. **(false alarm and false clear)**
- `none_found` then `retracted`: changes at once, one notification per affected person, none for people outside the project.
- `retracted` then one `none_found`: unchanged, `pending_state` set; second `none_found` from the same source: changes.
- Crossref answers, PubMed times out: Crossref's answer is used; no change caused by the missing one.
- A clipped notice shows `notice`, not `retracted` (OpenAlex type trap, `crossref.ts` fix).
- No DOI or PMID: no `source_status` row; card says "no DOI or PMID".
- Seventy clips sharing five DOIs make five checks.
- Deadline reached: the run stops, saves done rows, leaves the rest due.
- Cron route without the right Bearer token: 401, no work.
- Viewer can call check and read; viewer cannot acknowledge; outsider gets nothing (extend `tests/cloud-isolation.test.mjs`).

**Page fetch and safety**
- Private, loopback, link-local, metadata, IPv4-mapped IPv6 and integer-host addresses refused; a public name that resolves to `10.0.0.5` refused; a public page that redirects to `http://169.254.169.254/` refused at the hop; 6 redirects refused; port 8080 refused; a 5 MB body cut at 2 MB.
- rebuild-context with a redirect to a private address now refuses (regression for the hole in 4b).

**Page decisions** (fixture pages)
- Unchanged article: `verified`.
- Same text with curly quotes, non-breaking spaces, a ligature and a soft hyphen: `verified`. **(false alarm)**
- One word edited: miss 1 keeps the old state; miss 2 the next day gives `changed` with `live_excerpt`.
- "not" removed from the sentence: `changed` (the bag-of-words rule would have missed it).
- Sentence deleted, rest of page there: `quote_missing` after two misses.
- 404 twice on two days: `gone`; 404 once then 200 with the quote: `verified`, `miss_count` back to 0.
- Two misses 1 hour apart (button clicked twice): still one miss. **(false alarm)**
- Network error, DNS failure, timeout: `could_not_check`, `miss_count` unchanged. **(false alarm)**
- Canary fails: run ends, nothing written. **(false alarm)**
- Half the fetches fail with network errors: misses from that run discarded. **(false alarm)**
- 403 (NEJM-style), 429 with `Retry-After`, 503: `could_not_check`, no miss; 403 waits 30 days. **(false alarm)**
- Login wall, cookie wall, Cloudflare "Just a moment", empty React shell, page under 500 characters: `could_not_check`. **(false alarm)**
- Soft 404 (200 with "Page not found") and redirect to the home page: misses with `page_missing`.
- `doi.org` 302 to the publisher: not `moved`. 301 to a new path with the quote: `moved`. 301 from http to https only: not `moved`. Canonical equals stored URL: not `moved`.
- `robots.txt` disallows: `could_not_check` (`robots`), no page request sent.
- 304 on a conditional request: previous result kept.
- PDF content type: `could_not_check` (`pdf`).
- Image and link clips never become `changed`; uploaded PDFs and notes are `not_applicable`.

**Display and outputs**
- `displayState` order: retracted plus changed shows "Retracted +1"; acknowledged `changed` that becomes `gone` reopens; acknowledged `retracted` still marked in the PDF, Obsidian and Notion exports with the note.
- A synthesis saved before a retraction shows the warning after it.
- Dashboard: each clip counted once; counts match the bucket table.

Browser test (Playwright, new `e2e/25-source-health.spec.ts`, local mode with an injected fake checker): a retracted clip shows the badge and the notice link; the dashboard counts; "Keep this clip" with a note shows "Seen"; "Open saved copy" shows the stored text.

Live checks (owner, after deploy): the retracted Lancet 1998 paper (`10.1016/S0140-6736(97)11096-0`) shows Retracted after the first daily run; a page edited on purpose shows "Quote changed" after two daily runs; a NEJM page shows "could not check", not changed; the 77-clip project finishes within one run.

---

## What I could not check

- Whether Fluid compute, `CRON_SECRET` and `OPENALEX_API_KEY` are set on the testers' Vercel project.
- The exact undici option for pinning the connection address on Vercel's Node version.
- Whether saved syntheses keep `citationsUsed` (section 6).
- Whether a daily server query keeps the free Supabase project from pausing after a week idle (`docs/SECURITY_DECISIONS.md`, gaps table). It may, as a side effect; do not rely on it.
- Real false-alarm rate of the page check. Task S-80.5 measures it.
