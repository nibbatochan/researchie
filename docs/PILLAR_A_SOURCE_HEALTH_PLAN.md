# Pillar A: Source health (plan)

Date: 2026-10-16. Status: plan, nothing built. Parent doc: `docs/COMPETITOR_ANALYSIS.md` (section 5, Pillar A; target user: science and medicine thesis students).

## Goal

A student can open a project and see, without asking, which of their sources are still sound: not retracted, not corrected, page still says what was clipped. Each problem names the clips it affects and what to do.

Three parts: retraction and correction watch, page-changed detection, and a source health dashboard.

## What exists today (checked in the code)

- Retraction check runs once at citation time. Crossref reads `update-to` and `updated-by` for `retraction` and `withdrawal` (`src/lib/citations/crossref.ts:88-95`). PubMed reads publication type ids D016441 and D016440 (`src/lib/citations/pubmed.ts:9,65`). Result lands in `CitationRecord.retracted` (`src/lib/citations/types.ts:48`), where `undefined` means "check did not run".
- `isRetracted` and `RETRACTED_MESSAGE` in `src/lib/citations/verify.ts:27-30`. The clip card shows an amber box for a retracted paper.
- Each clip stores `sourceUrl`, `textFragment`, `contextPrefix`, `contextSuffix`, `surroundingParagraphs`, and optional `visualSnapshot.htmlSnapshot` (`src/lib/types/research.ts`). The clip text itself is the thing to look for on the live page.
- `/api/atoms/rebuild-context` already fetches a clip's page (4 second timeout, no address filter; see Risks).
- Atoms keep free-form data in `metadata` (JSONB in Supabase, plain object in the local store), so a new `metadata.health` field needs **no schema migration**.

## Missing

- Re-checking. Nothing runs a check after the first one, so a paper retracted next month stays "clean" in the library.
- States beyond retracted: correction, expression of concern, withdrawal-in-progress.
- Any check that the live page still contains the clipped passage.
- Any view that gathers problems across a project.

## Data model

New optional field on `ProvenanceMetadata`:

```ts
health?: {
  checkedAt: string;                       // last time any check ran for this clip
  retraction?: {
    state: 'clean' | 'retracted' | 'corrected' | 'concern' | 'unknown';
    checkedAt: string;
    noticeDoi?: string;                    // DOI of the notice, when the source gives one
    detail?: string;                       // plain-language line for the UI
  };
  page?: {
    state: 'unchanged' | 'changed' | 'moved' | 'gone' | 'unknown';
    checkedAt: string;
    httpStatus?: number;
    finalUrl?: string;                     // set when 'moved'
    reason?: string;                       // why 'unknown': blocked, login needed, script-rendered
    missCount?: number;                    // consecutive misses; 'changed' needs 2
  };
  acknowledgedAt?: string;                 // the student marked the problem as seen
  acknowledgedState?: string;              // re-open the alert if the state later worsens
};
```

Checks run per **source** (DOI or URL), then write the result to every clip that shares the source. Seventy clips from five papers cost five lookups, not seventy.

## Part 1: Retraction and correction watch

1. **Built (A1, 2026-10-17):** pure classifiers in `src/lib/citations/status.ts` and `resolver.checkStatus({ doi, pmid })` in `lookup.ts` (named `checkStatus`, not `checkSourceStatus`). It takes identifiers, not a record, so it can run on a clip that only has a DOI.
2. **Verified live 2026-10-17:** Crossref update types `retraction`, `withdrawal`, `partial_retraction`, `expression_of_concern`, `correction`, `corrigendum`, `erratum` exist. `addendum` and `clarification` were not checked and are ignored.
3. **Verified live 2026-10-17:** PubMed marks the original paper with `CommentsCorrections` RefType `RetractionIn`, `ExpressionOfConcernIn` and `ErratumIn`. The notice itself has publication type D000075742 (expression of concern); it is not flagged as a problem.
4. If the lookup fails (network, rate limit), the state is `unknown`, never `clean`. This matches the existing rule in `lookup.ts:180`.
5. Unit tests with saved Crossref and PubMed fixtures for each state, using `node --test` like the existing citation tests. Live check against the retracted Lancet 1998 paper (`10.1016/S0140-6736(97)11096-0`), which the project already uses.

## Part 2: Page-changed detection

New route `POST /api/health/page` taking `{ url, passage }`. It fetches the page and decides:

| Result | State |
| :--- | :--- |
| Passage found (whitespace and case normalised, fuzzy match above a set threshold) | `unchanged` |
| Page loads, passage not found, text is long enough to be a real article | `changed` (after two consecutive misses) |
| Redirect to a different address | `moved` (store `finalUrl`; still search the new page) |
| 404 or 410 | `gone` |
| 401, 403, 429, a login or consent wall, a near-empty script-only page, timeout | `unknown` with a `reason` |

Rules that keep it honest:

- **`unknown` is a normal answer.** Many journal and news pages block bots or need a login. Saying "could not check" is correct; saying "changed" on a blocked page destroys trust in the whole feature.
- **Two misses before `changed`.** One miss can be a temporary error or an A/B variant.
- Block calls to private and local addresses (see Risks).
- Per-domain delay and a concurrency cap of 3 so a 70-clip project does not hammer one site.
- Only web clips are checked. PDFs the student uploaded have no live page.
- The clip text is the reference. Do not store a second copy of the page.

Unit tests for the matcher with fixture pages: unchanged, edited sentence, removed sentence, login wall, empty shell. Live check against a stable page and a deliberately changed one.

## Part 3: When checks run

No background worker exists today (Next.js dev server, local store). Start without one:

- **On demand:** a "Check sources" button on the project.
- **On open:** when a project opens and the last check is older than 7 days, run a quiet batch in the background and update badges as results arrive. Retraction checks first (cheap), page checks after.
- **Later, not now:** a scheduled job (for example a hosted cron) once Supabase hosting is the default. Mark as future.

A small client-side runner (`src/lib/health/runner.ts`) groups clips by source, calls the two checks, and writes results through the existing atom update path.

## Part 4: Dashboard and badges

- **Clip badge** on `AtomCard`, `BlockAtomCard`, `ImageAtomCard` and the PDF reader's citation: one small state (OK, changed, moved, gone, retracted, corrected, concern, unchecked). Colour carries meaning; OK stays quiet.
- **Project health panel**: counts at the top (checked, needs attention, could not check), then a list of problems grouped by source. Each row shows the source, what changed, which clips use it, and actions: open source, copy from the cached context, mark as seen.
- **Dashboard banner**: "2 sources need attention" on the project card, so a student sees it before opening the project.
- Copy follows the humanizer rules in `CLAUDE.md`: "This paper was retracted on 12 March" and "This page no longer contains your quote", not "retraction status: positive".

## Part 5: Carry the warning into outputs

A retracted or corrected source must not slip into finished work:

- Q&A and synthesis answers add a visible note when a cited clip has a `retracted` or `corrected` state (hook into `src/lib/ai/claimSupport.ts` and the answer link code in `src/lib/qa/answerLinks.ts`).
- The PDF research report marks affected bibliography entries and clip cards (`src/lib/export/pdf/pdfReport.ts`, `ReportDocument.ts`).
- Obsidian and Notion exports write the state into frontmatter or a callout so it survives export.

## Build order

| Step | Content | Size |
| :--- | :--- | :---: |
| A1 | Health data type, `checkStatus`, new Crossref/PubMed states, unit tests. **Done 2026-10-17** | S |
| A2 | `/api/health/page` with address filter, matcher, unit tests | M |
| A3 | Runner (group by source, throttle, persist) and on-open trigger | M |
| A4 | Badges and project health panel and dashboard banner | M |
| A5 | Warnings in Q&A, synthesis, PDF and exports | M |
| A6 | Playwright spec `e2e/14`, live checks, `docs/CHANGELOG.md`, `PROJECT_LOG.md`, `docs/DECISIONS.md` entry | S |

Ship A1 to A4 first. They give the visible product. A5 follows because it is what protects a thesis.

## Risks and decisions

1. **Server-side fetch of user-supplied URLs is an SSRF risk.** The existing `rebuild-context` route has a timeout but no address filter (`src/app/api/atoms/rebuild-context/route.ts:35-36`). The new route must reject loopback, link-local, private ranges and non-http(s) schemes, resolve DNS before connecting, and cap response size. Fix the old route with the same helper.
2. **False "changed" results** from script-rendered pages, paywalls and cookie walls. Mitigated by `unknown`, the two-miss rule and a minimum text length. Measure the false-change rate on 30 real clipped pages before turning the badge on by default.
3. **Pages behind a login** cannot be checked from the server. Option for later: run the check from the extension in the student's own browser, which has their session. Not in this plan.
4. **API etiquette.** Crossref asks for a contact address in the request (polite pool) and PubMed limits requests per second without an API key. Throttle and send the contact address.
5. **Archived copies.** A "view archived copy" action using the Internet Archive would help for `gone` pages. Verify the Wayback availability API behaviour before promising it; leave out of the first cut.

## Decisions needed from the owner

1. Is "on demand plus on open" enough for the first release, or is a scheduled job required (it needs hosting that runs when the app is closed)?
2. Should page checks default to on, or off until the false-change rate is measured?
3. Is a "view archived copy" action wanted in the first cut?

## Definition of done

- Unit tests pass for all new states and the matcher; `npm run verify` is green.
- Live: the retracted Lancet paper shows `retracted`; a page edited on purpose shows `changed` after two checks; a login-walled page shows `unknown`, not `changed`.
- A 77-clip project (the real one used for the PDF export) checks in under one minute without hitting a rate limit.
- The warning appears in a Q&A answer, the PDF report and an Obsidian export for a retracted source.
