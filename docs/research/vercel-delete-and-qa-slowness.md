# Why clip deletes leave the page loading, and why document answers are slow on Vercel

## 1) Question

On the Vercel deployment only:

1. After deleting clips and navigating to another page, the page keeps loading. Sometimes, after a delete, navigating shows "Application error: a client-side exception has occurred while loading".
2. In document mode, an AI answer with page links loads very slowly.

Scope: research only. No source code was changed, nothing was committed or deployed. Line numbers are from the working tree on branch `feat/canvas-pdf-ui-and-citation-core`. Anything not checked against a primary source or run on Vercel is marked as unverified.

## 2) Primary sources read

- Next.js error handling, updated 2026-10-15: https://nextjs.org/docs/app/getting-started/error-handling
  - "Error boundaries don't catch errors inside event handlers. They're designed to catch errors during rendering."
  - "In general, errors in event handlers or async code aren't handled by error boundaries because they run after rendering."
  - Consequence: a rejected promise in `handleDeleteAtom` does not produce the "Application error" screen. That screen needs an error thrown during render (or in a render-phase path) that no boundary catches.
- React `useEffect`: https://react.dev/reference/react/useEffect
  - "After every commit with changed dependencies, React will first run the cleanup function ... and then run your setup function with the new values."
  - The `ignore` flag pattern exists because "network responses may arrive in a different order than you sent them."
- React `createRoot`: https://react.dev/reference/react-dom/client/createRoot
  - `onUncaughtError`: "Callback called when an error is thrown and not caught by an Error Boundary."
- Vercel function limits, last updated 2026-08-24: https://vercel.com/docs/functions/limitations
  - Max duration with Fluid compute: Hobby 300 s default and maximum; Pro 300 s default, 800 s maximum.
  - "The maximum payload size for the request body or the response body of a Vercel Function is **4.5 MB**." Larger returns `413 FUNCTION_PAYLOAD_TOO_LARGE`.
  - "Waiting for I/O (e.g. calling AI models, database queries) does not count towards active CPU time." Billing is by active CPU; duration limits still count wall time.
- Vercel regions, last updated 2026-08-11: https://vercel.com/docs/functions/configuring-functions/region
  - "By default, Vercel Functions execute in Washington, D.C., USA (`iad1`) for all new projects."
  - "If your functions communicate with external services, choosing regions far from those services increases latency."
  - Region is set with `regions` in `vercel.json` or in Settings, Functions, Function Regions.
- Supabase row cap: https://supabase.com/docs/guides/api (read as a search snippet, not as a full page). The default is 1,000 rows per request, changeable in project API settings. The snippet says clients should use `range()` to page. Unverified against the full page text.

## 3) How the two flows run today

### Delete flow

- `src/app/page.tsx:364-378` `handleDeleteAtom`:
  - `:369` removes the clip from `atoms` at once (optimistic).
  - `:370-371` shows the undo toast and pushes the clip to `deletedAtomsHistory`.
  - `:374` `fetch(DELETE /api/atoms?id=...)`, with no `AbortController`, no timeout, and no check of `res.ok`. A 404 or 500 is silently ignored.
- `atomsCache` (`page.tsx:134`) is written at `:157` and read at `:202`. `handleDeleteAtom` never removes the deleted clip from it.
- Server: `src/app/api/atoms/route.ts:283-306`. `:297` calls `store.deleteAtom`. `:298` returns 404 when nothing was removed.
- Store: `src/lib/data/cloud.ts:311-316`. Three awaited hops in series: `atomRow` (`:312`, select), `roleOn` (`:313`, projects and project_members reads), then the delete (`:314`).

### Fetch and polling flow

- `page.tsx:140-174` `fetchAtoms`:
  - `:143-148` only a foreground call (`background=false`) aborts the previous request and sets `loadingAtoms` true.
  - `:154` drops a response whose project is no longer active, or whose sequence number is older than the last applied one.
  - `:172` clears `loadingAtoms` only when `projId === activeProjectRef.current`.
- `page.tsx:200-205`: on project change, a cached project paints at once and refreshes in the background (`background=true`, no abort, no loading flag). An uncached one is a foreground fetch.
- `page.tsx:245-297`: every 15 s, plus on tab focus, a cheap `stamp` request (`:257-258`, handled at `route.ts:47-49`). The full list is fetched only when the count or newest timestamp changed (`:261-263`). Every fourth round also refreshes `/api/projects` (`:265-281`).

### Document answer flow

- `src/components/PDFReaderView.tsx:1078-1088`: each question POSTs `/api/ai/qna` with `pages: activeDocument.pages` (`:1083`), the full text of every page of the document, plus `documentId` and `title`.
- `src/app/api/ai/qna/route.ts`:
  - `:23` `authorize` (one Supabase Auth call, unless the token is cached).
  - `:25` `resolveAI` reads the user's own AI key on every request (`src/lib/ai/userAi.ts:47-50`, `loadUserAI`), which is another database read plus decryption.
  - `:48-51` takes the pages from the body. `lookupDoc` (`:60`, `:106`) is skipped because `pages` and `title` are present.
  - `:105` `retrievePassages` runs over all pages in the request.
  - `:142` one LLM call. On `AIServiceBusyError` with `tooLarge` (`:143-151`), it retries once with half the passage budget, so a second LLM call runs in series.
  - `:154-157`: if the answer says "not found" and a fallback model answered, it throws `AIServiceBusyError` so the user retries.
- `src/lib/ai/passages.ts:22-28` states the budget: about 14,000 characters of passages per question, and the free-tier Groq limit of about 8,000 tokens per minute, which allows "one to two questions a minute". Limits hit this path as 429s, which go to the fallback and retry paths above.
- `passages.ts:136-140` `buildPassages` splits every page in the request. CPU cost is small; the cost is the model call and the retries.

## 4) Root causes (ranked, with confidence)

### Symptom 1: page keeps loading after a delete, sometimes "Application error"

**Cause A (confirmed in code, high confidence): the loading flag can stay on.**

- `fetchAtoms` (`page.tsx:147`) sets `loadingAtoms` true for a foreground load. It clears it only in `finally` when that load's project is still the active one (`:172`).
- Scenario: open uncached project A (foreground, flag on). Before it returns, click project B, which is cached. The effect at `:204` runs B in the background (`background=true`), so nothing aborts A and nothing clears the flag. A's response arrives, is dropped at `:154`, and its `finally` at `:172` sees A is not active. The flag stays true.
- This matches "keeps loading" after navigation. The delete is not required, but the delete flow adds more requests to be in flight when the user navigates.
- Also: no request in this path has a timeout. If the function is slow, the spinner lasts until Vercel's 300 s limit (Hobby and Pro default, from the Vercel limits page).

**Cause B (confirmed in code, high confidence): deleted clips come back.**

- `handleDeleteAtom` (`:364-378`) never updates `atomsCache` (`:134`, `:157`, `:202`). Navigating back to that project paints the deleted clip from the cache at `:202-204`, then the background refresh removes it. A visible flicker, not a crash.
- A poll that started before the delete can finish after it. Its response (`:154-166`) replaces `atoms` with the pre-delete list, so the clip reappears until the next poll (up to 15 s). The stamp count then differs and the list is re-read (`:261-263`). Likely; not reproduced.
- A failed DELETE (`:373-377`, no `res.ok` check) leaves the clip hidden in the UI, though it still exists on the server. Also likely; not reproduced.

**Cause C ("Application error"): not confirmed.**

- Next.js shows the generic client error screen when an error reaches render and no boundary catches it. Errors in async code and event handlers do not reach boundaries (Next.js docs, above). So the rejected `fetch` in `handleDeleteAtom` cannot be the cause.
- Something in the render tree must read a value the delete removed. Candidates to check in code: any component that holds a clip id (selection, citation, trash drawer `deletedAtomsHistory` at `page.tsx:360-371`) and dereferences `atoms.find(...)` without a guard. A grep for `atoms.find(` in `src/components` returned no matches, so the likely reader is elsewhere (for example a sidebar or canvas holding a stale object). Not confirmed without the browser error stack.
- Production builds hide the real message. The stack is only in the browser console on Vercel.

**Smallest fixes**

1. In `fetchAtoms`, clear `loadingAtoms` whenever the load ends and it was the last foreground load (use the sequence number, not the project id), and abort the in-flight foreground load when a cached project is opened (`page.tsx:143-148`, `:172`, `:200-205`). Keep it to a few lines.
2. In `handleDeleteAtom`, also remove the clip from `atomsCache.current.get(activeProjectId)`, check `res.ok`, and on failure put the clip back and show the error. (`page.tsx:364-378`.)
3. Skip a poll's result when a delete happened after it started: bump `atomsSeq` in `handleDeleteAtom` so older responses are dropped at `:154`.
4. For the "Application error": get the stack from the browser console on Vercel (or Vercel Logs with client error reporting, if enabled). Then fix the read of the removed value at that line.

### Symptom 2: document answer with page links is slow on Vercel

**Cause A (likely, not measured): the model call and its retries.**

- `route.ts:142-151` can make two sequential model calls, and `:154-157` can force a third attempt by the user. Groq free-tier limits (`passages.ts:24-25`) make 429 and fallback paths likely under normal use. Those add seconds to minutes, and they are the same on Vercel and locally.
- Vercel adds no hard timeout that would cause this (Hobby and Pro default 300 s, from the Vercel limits page). So the slowness is latency, not a cut-off.

**Cause B (likely, Vercel-specific, not measured): extra hops per question.**

- Each question does: Auth (`route.ts:23`), user key read and decrypt (`route.ts:25`, `userAi.ts:50`), then the model call. The Vercel function runs in the region in the project settings (default `iad1` per the Vercel region page; this deployment is set to `sin1` per the task). The model provider is not in the repo, so the cross-region hop from `sin1` to the model's region is unverified. The Vercel region page warns that distance to external services adds latency.
- Local dev runs next to the developer, so the same code is faster there. This is consistent with "only on Vercel", but the size of the effect is unknown.

**Cause C (possible, depends on the document): large request body.**

- `PDFReaderView.tsx:1083` sends every page's text on every question. Vercel's request limit is 4.5 MB (Vercel limits page). A long document with large pages could approach it, which would fail with `413`, not slow down. Check the size of `JSON.stringify(activeDocument.pages)` for the document in question.
- Sending the full text on each question also costs serialization and parsing time on both ends. Small, but it adds to every question.

**Smallest fixes**

1. Send `documentId` only, and let the route load the pages from storage (the route already has `lookupDoc`, `route.ts:29`). The client then sends a few bytes instead of the whole document. Cost: one extra database read per question, which the route already does when `pages` is missing. Check the `getDocument` select (`cloud.ts:331-336`, `select('*')`) so it does not pull unneeded columns.
2. Log the timing of each step in `qna/route.ts` (auth, key read, retrieval, each model call, citation location) in the Vercel logs for one question. That tells which of causes A to C dominates before changing the model path.
3. If the model call dominates, avoid the second call on `tooLarge` by trimming passages before the first call (the budget is already in `passages.ts:28`).

## 5) What could not be confirmed without running it on Vercel

1. The exact render error behind "Application error". Needs the browser console stack on the deployed site.
2. Whether the spinner in Cause A of symptom 1 shows in the UI. Check which component reads `loadingAtoms` (not searched in this session).
3. Real duration of `/api/ai/qna` per step, and whether 429s or fallbacks happen in the slow cases. Needs Vercel Logs for a slow question, with the model name and status codes.
4. Size of `activeDocument.pages` for the slow documents.
5. Region of the Supabase project and of the model provider, compared with `sin1`. Supabase: Project Settings, General. Vercel: Settings, Functions, Function Regions.
6. Whether the 1,000-row default in the Supabase API applies to this project (from the search snippet, unverified against the full page).

## 6) Measurements to take on the live site

1. Browser console on the deployed site: reproduce delete, then navigate. Copy the full error stack for "Application error".
2. Network tab, same steps: note whether `/api/atoms` or `DELETE /api/atoms` is still pending, and its status code.
3. Vercel Logs, filter `/api/ai/qna`: duration per request, status codes (429, 402, 401), and the function region.
4. Add timing to the qna route (see fix 2 above), then ask one document question on the live site and read the step durations.
5. `JSON.stringify(activeDocument.pages).length` for the slow document, from the browser console (`activeDocument` is in the PDF reader state).
