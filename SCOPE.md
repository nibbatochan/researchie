# Scope

Edited by the `/scopetrack` mod. Use `/scopetrack` to see the tree and where you are. Never delete history: finished or dropped items stay in the tree.

Current: {p16}

Statuses: not started, in progress, blocked, done, dropped.

## Tree

- [in progress] Researchie (core) {root}
  - [in progress] Citation Engine {c1}
    - [done] Crossref, DOI, DataCite, PubMed lookups {c2}
    - [done] Title search pick list {c3}
    - [done] Vancouver formatting {c4}
    - [done] Web-page and manual citations {c5}
    - [done] Verified DOI read from extension capture — checked live on a PLoS ONE article (PROJECT_LOG phase 7) {c6}
    - [done] Preprint, dataset, book chapter lines (APA) {c7}
    - [done] AMA style {c8}
    - [done] Report number, agency, web update date/place — ed0872d, c793301; update-date reader checked on nasa.gov, extension itself not run in Chrome {c9}
  - [in progress] Document Assistant Q&A {q1}
    - [done] Passages, page numbers, verified quotes {q2}
    - [done] Groq rate-limit handling — unit-tested only {q3}
    - [done] Live check: Q 10, 13–16, 18 — Groq 18 of 18 passed (PROJECT_LOG phase 7) {q4}
    - [done] Document Assistant UI fixes — owner checked in the reader 2026-10-14 {q5}
    - [done] Document clean-up: kept the PLOS ONE paper and "Just Enough Research"; deleted the other 13 documents (8 placeholders, 5 demo documents) and removed the 5 demo documents from the seed list so they do not return. e2e 06 now uses Just Enough Research {q6}
  - [done] Exports (Obsidian, Notion, Markdown, BibTeX) {e1}
  - [done] Workspaces, PDF reader, OCR, AI synthesis {w1}
  - [in progress] Housekeeping {h1}
    - [done] Delete InlineClipInserter.tsx and lib/cn.ts {h2}
    - [done] Replace lucide-react with Phosphor in PDFReaderView.tsx {h3}
    - [done] Gitignore .documents-store.json and .cognee-graph-*.json (graph files untracked, uncommitted) {h4}
    - [in progress] Commit work after f0bd60f — e2e edits already committed (f04062e, e296a2b). Everything since v1.8.4 is uncommitted (summaries, pin, project menu, offline queue, video embeds, accounts, AI keys, docs). Owner said commit later. Before any push: fresh key scan, and do not push main or cleanup/2026-10-09 without a scrub {h5}
    - [not started] Real-Chrome checks of work only tested in a headless test Chromium: side panel summary chips, "+ Save to Project", update-date capture, the new dialog menus, the video player on live YouTube and Vimeo, the offline-queue alarm and a real network drop, the extension Connect section {p24}
    - [not started] scripts/testGroundingBaseline.cjs is stale (names the removed doc-dots-openai-spec) {p25}
  - [not started] PRD gaps {p1}
    - [dropped] Floating on-page project switcher button — replaced by in-flow switching, see {p2a}, {p2b} {p2}
    - [done] In-flow project switching for text selection: hovering Send shows a tooltip with the destination project; a three-dot menu next to "Add tag" has "Change to…" listing all directories — v1.8.5, checked with the real extension in a test Chromium (e2e 15) {p2a}
    - [done] Same three-dot menu on DOM block, screenshot, image and section capture; its confirmation popup shows which directory the content goes to {p2b}
    - [done] "Ask AI" lives in the three-dot menu, not as its own pill button (reuses the in-page Q&A drawer) {p3}
    - [done] AI page summary — fixed the wiring (side panel now calls /api/ai/summarize through background.js); summary is written from the page with no fixed template; chips for Auto, 3 bullets, Detailed, Tables; "+ Save to Project" already existed. v1.8.4. Live-checked on Groq; side panel not yet run in real Chrome {p4}
    - [done] Automatic offline queue flush: the background worker now sends the queue on an alarm every minute while clips wait, at browser start, and on the online event; the Sync button uses the same code. Also fixed: the old flush deleted clips the server refused, queued clips had no project, and the side panel and popup said "Saved to offline queue" without queuing. v1.8.8, e2e 17 on the real extension, alarm timing and a real network drop not tested {p5}
    - [dropped] Drag to reorder cards in the timeline — dropped by owner, the feed is a timeline; replaced by {p12} {p6}
    - [done] Pin atoms, like pinned chats in WhatsApp: pin icon in the card's icon row; pinned cards stay at the top of the feed; a pin icon by the type filter shows pinned only — v1.8.5, e2e 14 {p12}
    - [done] PDF export — built in v1.8.0 and v1.8.1 (export modal PDF tab) {p7}
    - [not started] Team sharing between accounts, Figma style: share link with can view / can edit, invite by email with a role, member list (owner, editor, viewer), owner changes or removes access, "Request access" with approve or deny, all enforced on the server. Was blocked on auth; accounts now exist in code (p14) but are not yet checked live, so start after p16. Needs new tables (project_members, project_invites, share_links, access_requests) {p8}
    - [dropped] Plan limits: free tier caps (3 projects, 25 block clips a month) are not enforced; tier is a UI flag — dropped by owner 2026-10-14 {p9}
    - [done] Block HTML sanitization: scripts and iframes stripped on save — v1.8.2, 992b127 {p10}
    - [done] Video embeds: a saved link to a YouTube, Vimeo, Dailymotion or Loom video plays inline on the card, with a Player / Link toggle, minimize, and a plain-link fallback when the video can't be embedded. Original URL stays the source. v1.8.7, unit and e2e tests with stubbed hosts, not checked against live providers {p13}
    - [in progress] Tester deployment for 5 to 10 people: real email/password accounts with an httpOnly cookie, per-user data in Supabase, row-level security, extension connection by pasted token, settings in the account, and a bring-your-own AI key (Groq, Cerebras, OpenRouter, Google AI Studio). v1.9.0. Built and unit-tested; deployed at https://researchie-testers.vercel.app on a live testers Supabase project; the signed-in flows have not been checked by hand yet {p14}
      - [in progress] Live setup and check: testers Supabase project made, schema.sql and 001_multi_user.sql run and checked, email confirmation off (done 2026-10-15). Left: Site URL in Supabase, rotate the service key, then the 33-item manual checklist (docs/TESTER_CHECKLIST.md) with two real accounts. Nothing signed-in has run against the real database yet {p16}
      - [in progress] Vercel: deployed to https://researchie-testers.vercel.app with the six environment variables (2026-10-15; Next.js upgraded to 15.5.28 because Vercel blocked 15.1.4). Left: test server-side OCR, PDF parsing, the 4 MB upload limit and the tester Chrome extension zip on the live site; look at the 13 npm audit findings {p17}
      - [not started] Delete account in a Danger zone: password, one-time code (email or authenticator app), typed DELETE, server-side delete of all the user's data {p15}
      - [not started] Saved-accounts switcher in the sidebar (one httpOnly cookie per account); today "Switch account" signs out {p18}
      - [not started] Google sign-in. Owner sets it up by hand in Supabase; the login button is a disabled placeholder and the wiring point is signInWithOAuth in authContext.tsx {p19}
      - [not started] Notion token per user, stored encrypted like the AI key (today it lives in memory only on the tester site) {p20}
      - [not started] Duplicate clips when a save reaches the server but the reply is lost and the extension retries (no duplicate check) {p21}
      - [not started] Deleting a project with "keep clips" does not move the clips (existing bug, page.tsx handleConfirmDeleteProject; the PATCH ignores projectId) {p22}
      - [not started] Retire the local file store so each route has one code path (today AUTH_REQUIRED picks between two) {p23}
      - [not started] Look at the 13 npm audit findings (6 moderate, 7 high) reported after the Next.js upgrade {p26}
      - [not started] Sign-up is open on a public address: anyone who finds the URL can register and use up the free 500 MB database. Add an invite code or an email allow-list before the link goes beyond the testers {p27}
      - [not started] Default model names for Cerebras, OpenRouter and Google AI Studio were not checked against the providers' live model lists; try each provider with a real key and fix the defaults {p28}
    - [not started] Rewrite the PRD to match the real stack (Cloudflare R2, Gemini 1.5, shadcn, TypeScript extension are not used) and every decision from 2026-10-14: in-flow project switching, Ask AI in the menu, real summaries, pinning, no drag reorder, no plan limits, team sharing blocked on auth {p11}

## Scope changes

- 2026-10-13 — PRD gap check (docs/RESEARCH_TOOL_PRD.md) found items not in the tree; added under {p1}.

## History

- 2026-10-13 — Tree created from docs/CONTEXT.md section 4 and FEATURE_INVENTORY.md.
- 2026-10-13 — Housekeeping: h2, h3 verified already done; h4 finished by untracking .cognee-graph-*.json; c8 (AMA) marked done per git log.
- 2026-10-13 — c7 marked done (apa.ts covers preprint, dataset, chapter, report). h5 narrowed: e2e changes are already committed.
- 2026-10-15 00:58 — started: Citation Engine

## History
- 2026-10-13 22:36 — dropped: Citation Engine > Verified DOI read from extension capture
- 2026-10-14 — PRD gap check against code: p7 and p10 already built, marked done. p9 dropped by owner. p4 and p5 reworded to say what already exists. p2, p3, p6, p8, p11 confirmed real gaps.
- 2026-10-14 — Owner decisions: p2 replaced by p2a and p2b (in-flow switching); p3 moved into the three-dot menu; p4 must give a real, non-template summary; p6 dropped and replaced by p12 (pin atoms); p8 blocked on auth; q6 changed to a document clean-up; p11 widened to cover all of this.
- 2026-10-15 — p12 and p2a done (v1.8.5). The three-dot menu is a shared module for p2b and p3.
- 2026-10-15 — q5 done (owner checked). q6 done (13 documents deleted). p4 done in code, needs a real-Chrome check of the side panel.
- 2026-10-14 — c6 reinstated as done (live PLoS ONE capture verified the DOI). c9 done. q4 done (Groq 18 of 18); kept in the tree as done, not deleted, per the history rule.
- 2026-10-15 — Scope change: added p14 (tester deployment) and p15 (delete account, not built). Owner needs 5 to 10 testers within a week. p8 stays blocked: accounts now exist, sharing between them is not built.
- 2026-10-15 — p16 and p17 started: Supabase testers project set up and checked, app deployed to Vercel. Next.js 15.1.4 to 15.5.28.
- 2026-10-15 — Unfinished work listed: p16 and p17 (live setup, Vercel) under p14; p8 sharing moved from blocked to not started; p15, p18 to p23 added under p14; p24 (real-Chrome checks) and p25 (stale script) added under h1; h5 reworded.
- 2026-10-15 — Limits reviewed with the owner. Added p26 (npm audit), p27 (open sign-up), p28 (unchecked default model names). Corrected an earlier claim: schema.sql had row-level security on but with open "Public ... Access" policies; 001_multi_user.sql now drops them and the three seeded demo projects.
- 2026-10-15 — Owner chose to keep p5 and fix it. p5 done (v1.8.8).
- 2026-10-15 — Scope change: added and finished p13, video embeds (v1.8.7).
- 2026-10-15 — p2b and p3 done (v1.8.6). Block, image and screenshot dialogs show "Sends to <project>" with the three-dot menu (Ask AI, Change to…). The text pill menu also has Ask AI. e2e 15 covers all three dialogs.
