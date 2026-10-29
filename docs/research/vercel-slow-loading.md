# Why the Vercel deployment is slow to open projects

## 1) Question

On the Vercel deployment (project `researchie-testers`, `AUTH_REQUIRED=true`), opening a project takes 15 s or more at times. The dashboard shows content late. Load time varies between visits. Opening a second project is slower after the first load. Content sometimes does not load, or takes very long.

Already done, not enough: 2.5 s poll removed, embedding column dropped from clip lists, role and project lookups run in parallel, localStorage project cache, dashboard skeleton.

Scope of this note: research only. No application code was changed. Estimates are marked as estimates. Anything not checkable from a primary source is marked as unverified.

Versions read from `node_modules`: next 15.5.28, @supabase/supabase-js 2.117.2, @supabase/auth-js 2.117.2, @supabase/ssr 0.5.2, @supabase/postgrest-js 2.117.2.

## 2) How a project open flows today

Cold open, owner of the project, cookie session, no localStorage cache hit. "RT" = one network round trip. Serial steps are the ones that wait for the previous step.

Client (browser):

1. `src/app/page.tsx:178` `fetchProjects()` runs on mount: `GET /api/projects`. Runs in parallel with `GET /api/auth/me` from `src/lib/auth/authContext.tsx:92`.
2. `src/app/page.tsx:115-119` sets `activeProjectId` only after the project list arrives. Without the cache hit, this is the first serial gate.
3. `src/app/page.tsx:200-205` the effect calls `fetchAtoms` for that project: `GET /api/atoms?projectId=...` (`page.tsx:150-151`). Serial after step 1.

Server, `GET /api/projects` (`src/app/api/projects/route.ts`):

4. `route.ts:18` `authorize(request)` runs `src/lib/auth/server.ts:50-52`: `createServerSupabaseClient()` then `supabase.auth.getUser()`. That is one HTTP call to the Auth server (`GET {url}/user`, see Source S4). RT: Auth (A).
5. `route.ts:21-27` `sharing.claimInvites(...)` runs before listing and is awaited. `src/lib/data/sharing.ts:253` selects `project_invites` by email. Each unaccepted invite adds more awaited queries (`sharing.ts:257-268`). RT: 1 minimum (DB).
6. `route.ts:28` `store.listProjects` (`src/lib/data/cloud.ts:178-184`):
   - `Promise.all` of `listOwnProjects` (`cloud.ts:155`, `projects` select) and `accessibleRoles` (`cloud.ts:96-98`, `projects` + `project_members` selects). `accessibleRoles` then runs another awaited query for sub-projects when the user is a member (`cloud.ts:105`).
   - Then a `projects` select for shared projects (`cloud.ts:182`) if any exist.
   - RT: 1 parallel round, plus 1 or 2 more serial for shared users. `listOwnProjects` also reads `projects` a second time (`cloud.ts:155` and `cloud.ts:172`) only if the first read is empty (first visit).
7. `route.ts:30-37` `sharing.pendingRequestCounts` runs after the list and is awaited: `sharing.ts:423` (`projects` select) then `sharing.ts:426` (`access_requests` select). RT: 2 serial.

Server, `GET /api/atoms` (`src/app/api/atoms/route.ts:28-40`):

8. `route.ts:29` `authorize` again: another Auth round trip (A).
9. `store.listAtoms` (`cloud.ts:232-239`):
   - `scopeIds` (`cloud.ts:148-152`) calls `projectFamily` (`cloud.ts:119-124`): `Promise.all` of `roleOn` (`cloud.ts:84`, `projects` select) and a sub-project select (`cloud.ts:121`). RT: 1 parallel round. For the owner, `roleOn` returns after one query (`cloud.ts:86`).
   - `readAllRows` (`cloud.ts:27-36`, query at `cloud.ts:235-237`). One page of up to 1000 rows. Pages are sequential. RT: 1 for under 1000 clips, plus one more per extra 1000.
10. The response includes every clip column in `ATOM_COLUMNS` (`cloud.ts:60`): `content` and `metadata` JSON. Block clips store `sanitizedHtml` and `standaloneHtml` in `content` (`src/app/api/atoms/route.ts:118-125`, `160-161`). The whole project's clips come back in one response.

Totals for one cold open (estimate of the critical path, not measured):

- Client: 2 serial API calls (projects, then atoms).
- Auth: 2 Auth-server calls (one per API route), each serial inside its own request.
- Database: about 4 to 5 serial hops in `/api/projects` (invites, list round, shared, pending x2) and 2 to 3 in `/api/atoms` (roleOn/children round, atoms page, extra pages).
- Each DB hop goes Vercel function region to Supabase region. The region of each side is not in the repo (see section 6).

Background traffic in the same tab (`src/app/page.tsx:245-284`): every 15 s, `fetchAtoms(activeProjectId, true)` re-reads the whole project's clips (the background path does not abort old requests, `page.tsx:143-148`). Every fourth round also calls `GET /api/projects`. Each round repeats the Auth call and the DB hops above. Visibility changes trigger an extra refresh (`page.tsx:278-279`).

## 3) Ranked causes (most likely first)

### 3.1 Function region and database region are not known to be close

- Evidence: no `vercel.json` in the repo root (file listing). `.vercel/project.json` holds only project and org ids, no region. `next.config.mjs` has no region setting. Every DB hop in section 2 is a cross-network call from the function to Supabase.
- Primary source: "By default, Vercel Functions execute in Washington, D.C., USA (`iad1`) for all new projects" (https://vercel.com/docs/functions/configuring-functions/region, "Setting your default region"). Region can be set in `vercel.json` `regions` (same page, "Project configuration"), or in the dashboard, Settings, Functions, Function Regions (same page, "Dashboard"). "If your functions communicate with external services, choosing regions far from those services increases latency" (same page, note).
- Supabase region: not in the repo, and not derivable from the project URL. Do not guess. Read it in the Supabase dashboard (see section 6).
- Cost estimate: about 9 to 12 serial round trips per open (2 Auth, 4 to 5 projects, 2 to 3 atoms, plus client). At 150 ms per hop (estimate, cross-continent), about 1.5 s. At 300 ms per hop (estimate), about 3 s. This is the largest fixed cost that does not depend on data size. It does not by itself explain 15 s, so it compounds with 3.2 and 3.3.

### 3.2 Every clip list returns the full clip bodies, including block HTML

- Evidence: `cloud.ts:60` `ATOM_COLUMNS` still includes `content` and `metadata`. `route.ts:118-125` and `160-161` store `sanitizedHtml` and `standaloneHtml` inside `content` for block clips. `cloud.ts:235-237` has no limit or column trim for the list. The client reads the full list on open and every 15 s (`page.tsx:150-166`).
- Primary source: PostgREST returns every selected column of each row (https://docs.postgrest.org/en/stable/references/api/tables_views.html, "GET"). Vercel: maximum response body is 4.5 MB, larger is refused with `FUNCTION_PAYLOAD_TOO_LARGE` (https://vercel.com/docs/functions/limitations, "Request body size"). Note: that limit is on the body; a project with many block clips could approach it, which is unverified.
- Cost estimate: unknown until measured. A project with many block clips (each with full HTML) can be many MB per open, and that transfer plus JSON parse is paid on every open and every poll. This is the best explanation for "varies a lot by project and by visit".
- Previous fix relation: removing `embedding` (done) cut the vector bytes only. Block HTML is still in the list.

### 3.3 Auth server round trip on every API request, and token refresh

- Evidence: `src/lib/auth/server.ts:50-52` calls `supabase.auth.getUser()` on each cookie-authenticated request. `authorize` (`server.ts:65`) runs on `GET /api/projects` and `GET /api/atoms`, and on every poll. Middleware (`src/middleware.ts:11-30`) does not call Auth; `decideCors` (`src/lib/auth/cors.ts:28-34`) is pure.
- Primary source: getUser "performs a network request to the Supabase Auth server" (https://supabase.com/docs/reference/javascript/auth-getuser). In the library, `GoTrueClient.getUser` does `_request(... 'GET', `${this.url}/user` ...)` (`node_modules/@supabase/auth-js/src/GoTrueClient.ts:3257-3262`). If the access token is near expiry, `__loadSession` refreshes it first, which is another network call (`GoTrueClient.ts:3065-3081`). `getClaims()` is the local-verification alternative (`GoTrueClient.ts:6690`, and the security note at `GoTrueClient.ts:2808`).
- Cost estimate: 1 Auth round trip per API call, roughly the Supabase region RTT plus Auth work, so 100 to 300 ms each (estimate). Two per open, two per poll.

### 3.4 Sequential side work on the dashboard request

- Evidence: `route.ts:21-27` runs `claimInvites` before the list, awaited, on every cookie-authenticated load. `route.ts:30-37` runs `pendingRequestCounts` after the list, awaited. `sharing.ts:250-268` runs several awaited writes when an invite is found. `cloud.ts:96` and `cloud.ts:155` both read `projects` for the same user in the same request.
- Primary source: the Supabase JS client sends each call as its own HTTP request to PostgREST (https://supabase.com/docs/reference/javascript/introduction; not fetched in this session, so treat the per-call request as unverified from this source; the code path is visible in `node_modules/@supabase/postgrest-js`). Vercel bills and times the whole invocation, including awaited waits (https://vercel.com/docs/fluid-compute, "Pricing and usage").
- Cost estimate: 3 to 4 extra serial hops on dashboard loads, about 0.5 to 1.2 s at 150 to 300 ms per hop (estimate). Most of it is invisible to the user until the dashboard shows content.

### 3.5 Missing composite indexes for the actual query shape

- Evidence: `supabase/schema.sql:54-55` has single-column indexes on `atoms(project_id)` and `atoms(captured_at DESC)`. The query filters `project_id IN (...)` and orders by `captured_at DESC, id DESC` (`cloud.ts:236`). No composite index on `atoms(project_id, captured_at DESC, id DESC)` exists in `schema.sql` or the seven migrations (grep of `supabase/migrations/*.sql`). For projects, `schema.sql:37` has `updated_at DESC` alone, and `001_multi_user.sql:41` has `user_id` alone. The query at `cloud.ts:155` filters `user_id` and orders by `updated_at DESC` (`cloud.ts:155`), so the planner has to sort. `project_members` is indexed on `user_id` and `project_id` separately (`004_sharing.sql:20-21`), which is fine for these lookups.
- Primary source: index use and sort cost are a PostgreSQL planner decision; the Supabase performance guide and the PostgreSQL manual on multicolumn indexes should be checked with `EXPLAIN (ANALYZE, BUFFERS)`. Not fetched in this session (unverified from primary source here).
- Cost estimate: small at current row counts (a few thousand clips), grows with clip count. Probably not the 15 s cause alone. Measure first.

### 3.6 PostgREST 1000-row page cap and sequential paging

- Evidence: `cloud.ts:18-20` `PAGE_SIZE = 1000`. `cloud.ts:27-36` `readAllRows` loops with `.range()` one page at a time. Pages are sequential, so a project with N clips costs ceil(N / 1000) serial hops for atoms, and the same for documents (`cloud.ts:298-300`).
- Primary source: PostgREST `db-max-rows` default is "∞" in PostgREST itself and "a hard limit to the number of rows PostgREST will fetch" (https://docs.postgrest.org/en/stable/references/configuration.html, `db-max-rows`). The 1000-row default is a Supabase project setting, not checked from a fetched Supabase page in this session (unverified). The code comment at `cloud.ts:18-19` states the 1000 cap.
- Cost estimate: 0 extra hops below 1000 clips. Above that, +1 serial hop (estimate 150 to 300 ms) per 1000 clips, and the whole list is still sent every time.

### 3.7 First-visit path inside the list read

- Evidence: `cloud.ts:155-173` reads projects, and if empty upserts a starter project and reads again. `cloud.ts:179` runs `listOwnProjects` in parallel with `accessibleRoles`. The empty-result branch also runs for any user who has no projects (for example after deleting all of them), so it repeats on every visit for those users.
- Primary source: none needed beyond the code; the upsert uses `onConflict: 'id', ignoreDuplicates: true` (`cloud.ts:170`), the PostgREST upsert form (https://docs.postgrest.org/en/stable/references/api/tables_views.html, "Upsert", unverified in this session).
- Cost estimate: 2 extra serial hops (estimate 0.3 to 0.6 s) on first visit only, and every visit for a user with zero projects.

### 3.8 Client refetch pattern makes the second project slower

- Evidence: `page.tsx:140-174` sets an `AbortController` only for foreground fetches (`page.tsx:143-146`). Background fetches (from the 15 s poll at `page.tsx:254` and the visibility refresh) have no signal, so an in-flight background request for project A is not cancelled when the user opens project B. Each background round also reads the whole project (3.2). `page.tsx:245-284` restarts the effect when `activeProjectId` changes, so the old interval's in-flight call keeps running.
- Primary source: browser fetch and AbortController behaviour (https://developer.mozilla.org/en-US/docs/Web/API/AbortController; not fetched in this session, unverified here). HTTP/1.1 per-host connection limits are browser behaviour, not checked from a fetched source.
- Cost estimate: adds one or two in-flight requests per open after the first load. Probably the reason "after the first load, opening another project is even slower" when the poll is running at the same time.

### 3.9 Cold starts and the Fluid compute setting

- Evidence: no `maxDuration` or `fluid` setting in the repo. `src/app/api/atoms/route.ts:190-191` already uses `after()` for OCR because "a plain background promise is cut off on Vercel", so the team has seen this before.
- Primary source: Fluid compute is enabled by default for new projects since 23 April 2025 (https://vercel.com/docs/fluid-compute, "Enabling fluid compute"). Fluid "reduces the effects of cold starts through automatic bytecode optimization, and function pre-warming on production deployments" (same page). Cold starts still happen on the first request of an instance: "the first request isn't cached yet" (same page, "Bytecode caching"). Default duration is 300 s and maximum 800 s on Pro (https://vercel.com/docs/functions/limitations, "Max duration").
- Cost estimate: unknown. Could be 0.5 to 2 s for a cold instance with Node and the Supabase clients loaded (estimate, not measured). Cold starts explain variation between visits, not a steady 15 s.

### 3.10 Fire-and-forget write on the extension token path

- Evidence: `src/lib/auth/server.ts:41` `void supabaseAdmin.from('extension_tokens').update({ last_used_at ... }).then(() => {})`. The code comment says "Not awaited: a slow write must not slow the request." This affects only requests with a bearer token (the extension), not the browser dashboard.
- Primary source: "Promises passed to `waitUntil()` will have the same timeout as the function itself" (https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package, `waitUntil`). With Next.js 15.1 or later, the docs recommend `after()` instead (same page, "Usage with Next.js"). A bare un-awaited promise is not guaranteed to finish after the response is sent. The repo's own note at `src/app/api/atoms/route.ts:190` says the same.
- Cost estimate: no latency cost to the browser dashboard. A correctness and reliability risk (updates may be lost), and one write per extension request.

### 3.11 Supabase free-tier pause and connection use

- Evidence: not visible in the repo. The plan and pause status are in the Supabase dashboard.
- Primary source: "Free Plan projects are paused for low activity over a 7-day period" and must be resumed from the dashboard (https://supabase.com/docs/guides/platform/paused-projects). PostgREST uses Postgres connections from its pool, and pool size depends on compute size (https://supabase.com/docs/guides/database/connection-management). Heavy PostgREST use is advised to keep the pool below 40% of max connections (same page). The polling in 3.8 and the parallel `Promise.all` calls in `cloud.ts` open more concurrent requests, so a small compute can queue them.
- Cost estimate: a paused project means the first request after a pause fails or takes a long time (matches "content sometimes does not load"). Connection queueing is an estimate, not measured.

### 3.12 Next.js caching (checked, not a cause)

- Evidence: `/api/projects` and `/api/atoms` read cookies and the request URL, so they are dynamic. No `revalidate`, `dynamic` or `fetchCache` exports exist in `src/app` (grep of `src/app` returned none in this session).
- Primary source: "By default, fetch requests are not cached" in the previous model (https://nextjs.org/docs/app/guides/caching-without-cache-components, "Caching fetch requests"). GET Route Handlers under the previous model are not cached by default; with `cacheComponents` (not enabled here, `next.config.mjs`) the docs describe a different model (https://nextjs.org/docs/app/getting-started/caching).
- Conclusion: no stale-cache or static-caching cause found. Not the source of the slowness, and not a cause of "content not loading" either. The stale-data risk is in the client race handling (3.8), not in the server cache.

## 4) What the previous fixes did and did not address

| Done | Effect on the cause list | Gap |
|---|---|---|
| Removed 2.5 s poll (`page.tsx:245-284`, 15 s now) | Less load per minute, fewer queued requests (3.8, 3.11) | Still re-reads the full project every 15 s (3.2) |
| Dropped `embedding` from clip lists (`cloud.ts:58-60`) | Smaller rows | `content` with block HTML still sent (3.2) |
| Parallel `roleOn`, `projectFamily`, `accessibleRoles` (`cloud.ts:96`, `121`, `179`) | Saves 1 serial hop per call | Still 4 to 5 hops on the dashboard; `claimInvites` and `pendingRequestCounts` still serial (3.4) |
| localStorage project cache (`page.tsx:184-197`) | Dashboard paints at once; `activeProjectId` set earlier so atoms fetch starts earlier | Server time unchanged; cache is absent on a new browser or private window |
| Dashboard skeleton | Hides wait time | No server change |

Not addressed by any of the above: region (3.1), Auth call per request (3.3), sequential side work (3.4), indexes (3.5), paging (3.6), payload size (3.2), cold starts (3.9), free-tier pause (3.11).

## 5) Options to fix (ordered by expected impact)

1. Put functions and database in the same region. Read the Supabase region first. Then set the function region in `vercel.json` (`"regions": ["<same region>"]`) or in Settings, Functions, Function Regions (https://vercel.com/docs/functions/configuring-functions/region). Trade-off: users far from that region see more latency to the app itself; Hobby is limited to one region, Pro up to 5 (same page, "Limits"). Expected: removes most of 3.1, about 1 to 2 s per open (estimate).
2. Stop sending block HTML in the clip list. Return a list without `content` for block and image clips, and fetch the body when a clip is opened. Or add a limit and a `captured_at` cursor for the 15 s poll (only changed rows). Trade-off: client change and an extra request on clip open; the poll needs a "changed since" key. Expected: removes the largest variable transfer (3.2), size unknown until measured.
3. Stop running Auth on every API call. Use `supabase.auth.getClaims()` for the user id in `getRequestUser` (`src/lib/auth/server.ts:50-52`), which verifies the JWT locally (`GoTrueClient.ts:6690`). Keep `getUser()` for sensitive actions if wanted. Trade-off: a revoked session is accepted until the JWT expires, and the check needs the signing keys set up in Supabase. Expected: 2 Auth round trips removed per open, 100 to 300 ms each (estimate). Verify the exact JWKS setup against the Supabase Auth signing-keys docs before using it.
4. Move `claimInvites` and `pendingRequestCounts` off the dashboard request. Run them in `after()` (Next.js), or call them from a separate endpoint the client requests after the list is shown, or combine the three project reads into one SQL function. Trade-off: the invite claim moves to the next load or a separate call; the SQL function must keep the same access checks. Expected: 3 to 4 serial hops removed from `/api/projects` (estimate 0.5 to 1.2 s).
5. Add indexes, after checking with `EXPLAIN (ANALYZE, BUFFERS)`: `atoms(project_id, captured_at DESC, id DESC)` and `projects(user_id, updated_at DESC)`. Trade-off: small extra write cost and disk. Expected: small now, grows with clip count.
6. Replace offset paging in `readAllRows` with keyset paging (`captured_at, id` cursor), or lift the list limit once the payload is trimmed (option 2). Trade-off: more code; keyset needs the same unique ordering the comment at `cloud.ts:18-19` already asks for. Expected: removes sequential pages above 1000 clips.
7. Client: abort background fetches when the active project changes (use an AbortController per project in `fetchAtoms`, `page.tsx:140-174`), and stop the poll while a foreground load runs. Trade-off: slightly more code in the effect. Expected: removes queued stale requests after the first load (3.8).
8. Replace the fire-and-forget `last_used_at` update with `after()` (`src/lib/auth/server.ts:41`), as `route.ts:190` already does. Trade-off: none material. Expected: reliability, no latency change.
9. Check the Supabase plan and pause status. If free tier, upgrade to avoid 7-day pauses (https://supabase.com/docs/guides/platform/paused-projects). Trade-off: cost. Expected: removes pause-related failures.
10. Cold starts: keep Fluid compute on (default for new projects). Do not add warm-up pings as a first step. Trade-off of pings: cost and no guarantee. Expected: variable, unknown.

## 6) Unknowns that need a measurement on the live site

1. Region of each side. Vercel: Project Settings, Functions, Function Regions, and the region shown on each function invocation in Logs. Supabase: Project Settings, General, Region. Record both. Compare with option 1.
2. Per-invocation function duration. Vercel dashboard, Logs (or Observability), filter `/api/projects` and `/api/atoms`, read the duration column for a cold open and a warm open. Note whether the request was a cold start (the logs show it for Fluid).
3. Per-hop timing. Add timing around `authorize`, `listProjects`, `pendingRequestCounts` and `readAllRows` in the route handlers (the POST path already has `authMs` at `route.ts:43-45` as a pattern). Read the values in Vercel Logs for one open.
4. Supabase query timing. In the Supabase SQL editor run `EXPLAIN (ANALYZE, BUFFERS)` on the atoms query for the owner's largest project, and the projects list query for the owner. Check the Query Performance report in the dashboard.
5. Payload size. Run in the SQL editor: `select project_id, count(*), sum(pg_column_size(content) + pg_column_size(metadata)) as bytes from atoms group by project_id order by bytes desc;`. Compare with the `Content-Length` of `GET /api/atoms` in the browser's Network tab for the same project.
6. Clip and project counts per owner. From the same SQL editor: count of atoms per project and count of projects per user. Shows whether any project is over 1000 clips.
7. Browser waterfall. In Chrome DevTools, Network tab, record one open of a project with a cold reload and one with the project already open. Note which request starts after which and its Waiting (TTFB) time. Confirms the serial order in section 2, and whether a poll request overlaps the open.
8. Supabase plan and pause state. Dashboard, Project Settings, Billing. Check for pauses in the last 7 days.
9. Auth latency. Compare `GET /api/auth/me` duration (it has one Auth call) with the `GET /api/projects` duration. The difference is the cost of the extra work in 3.4.
10. Whether Fluid compute is on for this project. Vercel dashboard, Settings, Functions, Fluid Compute. Also check for `maxDuration` overrides in the dashboard, since the repo sets none.
