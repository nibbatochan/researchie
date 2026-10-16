# Scope

Edited by the `/scopetrack` mod. Use `/scopetrack` to see the tree and where you are. Never delete history: finished or dropped items stay in the tree.

Current: {S-41}

Statuses: not started, in progress, blocked, done, dropped.

## Tree

- [in progress] Researchie (core) {S-01}
      | What: A research workbench and Chrome extension: clip text, blocks, images and links from any page into projects, keep each clip's exact source, and ask questions with citations.
  - [done] Citation Engine {S-02}
        | What: Turns a clip into a correct, checked citation.
    - [done] Look up a source by DOI or PubMed ID {S-03}
          | What: Finds a paper's title, authors and journal from Crossref, DataCite or PubMed when a clip has a DOI or PubMed ID.
    - [done] Search for a source by title {S-04}
          | What: When a clip has no DOI, lists matching papers to pick from.
    - [done] Format a citation in Vancouver style {S-05}
    - [done] Cite web pages and type a citation by hand {S-06}
    - [done] Read the DOI from a page the extension clips {S-07}
          | Notes: Checked live on a PLoS ONE article.
    - [done] Cite preprints, datasets and book chapters (APA) {S-08}
    - [done] Format a citation in AMA style {S-09}
    - [done] Add report number, agency and web update date to citations {S-10}
          | Notes: The update-date reader was checked on nasa.gov. The extension itself has not been run in Chrome for it.
  - [done] Document Assistant {S-11}
        | What: Ask questions about an uploaded document and get answers with page numbers and quotes.
    - [done] Answer with page numbers and checked quotes {S-12}
    - [done] Show a clear "busy" message when the AI is rate limited {S-13}
          | What: Instead of a wrong answer, the assistant says the AI service is busy.
          | Notes: Unit-tested only.
    - [done] Check answers on real questions {S-14}
          | What: Ran 18 real questions on Groq; all 18 passed.
    - [done] Fix Document Assistant screen problems {S-15}
          | What: You checked it in the reader on 2026-10-14.
    - [done] Clean up the demo documents {S-16}
          | What: Kept the PLOS ONE paper and "Just Enough Research"; deleted 13 others and removed the 5 demo documents from the starter list so they do not return.
  - [done] Core features {S-17}
        | What: Built earlier and working.
    - [done] Export a project to Obsidian, Notion, Markdown and BibTeX {S-18}
    - [done] Workspaces, PDF reader, OCR and AI synthesis {S-19}
  - [in progress] Housekeeping {S-20}
        | What: Keep the code tidy and the work saved.
    - [done] Delete two unused files {S-21}
          | What: InlineClipInserter.tsx and lib/cn.ts.
    - [done] Switch the PDF reader to the Phosphor icons {S-22}
    - [done] Stop tracking large local data files in git {S-23}
          | What: .documents-store.json and the .cognee-graph files are ignored or untracked.
    - [in progress] Commit the work and push it {S-24}
          | What: Save the work to git, and later push it.
          | Done: Committed and pushed `feat/canvas-pdf-ui-and-citation-core` to origin up to 59a1691 (v1.9.5), after a fresh key scan over the whole range (only fake test strings matched). The site deploys with the Vercel CLI, not from GitHub, so the push does not deploy.
          | Left: Do not push main or cleanup/2026-10-09 without a scrub.
    - [done] Try the extension in your real Chrome {S-25}
          | What: Everything so far was tested in a test browser. Try it by hand in your own Chrome.
          | Done: You tried 1.4.0 and 1.5.0 by hand on the local server: token connect, disconnected send, Set project panel, shared dialogs, side panel connect, Link toast. All worked.
          | Not covered by that check: side panel summary chips, "+ Save to Project", update-date capture, video on live YouTube and Vimeo, and the offline-queue alarm with a real network drop. Open these as new items if you want them checked.
    - [done] Fix an out-of-date test script {S-26}
          | What: scripts/testGroundingBaseline.cjs named a document that was removed (doc-dots-openai-spec).
          | Done: The script checks the document is still there and skips that step, with a message, when it is not. Run: it skips step C and finishes.
    - [done] Look at the new scope panel and say what to adjust {S-57}
      | What: The panel was rebuilt (version 0.4.1) with S-numbers, one-line items, open cards, and add, edit, reorder and done buttons. It was tested with the mod's own tests on the terminal and desktop, but its look in the real app has not been seen yet.
      | Done: Opened /scopetrack and moved on. No changes asked for.
      | Notes: The old version is backed up in C:\Users\suman\.claude\mods\scopetrack-backup-v0.3.0.
  - [done] Chrome extension {S-27}
        | What: Clipping from any page, with project menus and a side panel.
    - [done] Switch project from the text-selection pill {S-28}
          | What: Hover Send to see which project the clip goes to; the three dots open "Set project": a small label, the chosen project highlighted under it, then the project list, with no scrollbar. Picking one shows "Set to <project>".
          | Notes: v1.8.5, reworked in 1.5.0 and checked by hand.
    - [done] Same project menu on block, image and screenshot clips {S-29}
          | What: The confirmation dialog has the same "Set project" button and a tag icon. All three dialogs share one look and stay fully inside the window (1.5.0).
    - [dropped] Ask AI from the three-dot menu {S-30}
          | What: Removed in 1.5.0 by you: it did not work well and the side panel already has Ask AI.
    - [done] Summarize a page in the side panel {S-31}
          | What: Writes a real summary from the page, with chips for Auto, 3 bullets, Detailed and Tables, and a "+ Save to Project" button.
          | Notes: v1.8.4. Live-checked on Groq. The side panel has not been run in real Chrome.
    - [done] Send saved clips automatically when the connection returns {S-32}
          | What: Clips saved while the server is unreachable wait in a queue and are sent without pressing Sync.
          | Done: The background worker sends the queue every minute, at browser start and when the browser goes online. It no longer deletes clips the server refused, queued clips keep their project, and "Saved offline" now tells the truth.
          | Notes: v1.8.8. The alarm timing and a real network drop were not tested.
    - [done] Tester UI round for the extension and token box {S-58}
          | What: Icons-only text pill, no outline on tag boxes, project list drawn like the platform (folder for a project, guide line for a sub-project), one dialog look kept inside the window, Link button confirmation, Researchie toolbar icon, no dot beside "recent push", connect panel in the side panel, line icons in the side panel, and a collapsed Extension token box with Copy token beside it.
          | Notes: Extension 1.5.0, changelog v1.9.3. e2e 15 and 20.
    - [dropped] Floating project-switcher button on every page {S-33}
          | What: Replaced by the in-flow menus (S-28 and S-29).
  - [done] Feed and cards {S-34}
        | What: How clips look and behave in the feed.
    - [done] Pin clips to the top of the feed {S-35}
          | What: A pin icon on each card keeps it at the top, like pinned chats; a pin filter by the type filter shows pinned clips only.
          | Notes: v1.8.5. e2e 14.
    - [done] Play video links on the clip card {S-36}
          | What: YouTube, Vimeo, Dailymotion and Loom links play inline, with a Player / Link toggle, a minimize button and a plain-link fallback. The saved link stays the source.
          | Notes: v1.8.7. Tested with stubbed hosts, not against live providers.
    - [done] Strip scripts from clipped page blocks {S-37}
          | What: Scripts and iframes are removed from a clipped block when it is saved.
          | Notes: v1.8.2.
    - [done] Export a project as a PDF {S-38}
          | Notes: v1.8.0 and v1.8.1.
    - [dropped] Drag to reorder cards in the feed {S-39}
          | What: Dropped by you: the feed is a timeline. Pinning (S-35) replaced it.
  - [in progress] Tester site {S-40}
        | What: Lets 5 to 10 testers sign up and use their own private workspace, AI key and Chrome extension on a live site.
        | Done: Accounts, private data, AI keys, the extension token and settings saved in the account; deployed at https://researchie-testers.vercel.app (v1.9.0, v1.9.1).
        | Left: Live checks (S-41, S-42), then the items below.
    - [in progress] Check sign-up and login by hand on the live site {S-41}
          | What: Make two real accounts on the testers site and run the 33-item checklist in docs/TESTER_CHECKLIST.md. No signed-in step has been tried on the real database yet.
          | Done: Testers Supabase project made; schema and migration run and checked; email confirmation off.
          | Left: Set the Site URL in Supabase, rotate the service key, then run the checklist.
    - [in progress] Check uploads, OCR and PDFs on the live site {S-42}
          | What: The site is live at https://researchie-testers.vercel.app. Some features run on the server and have not been tried there.
          | Done: Deployed with its environment variables. Next.js was upgraded to 15.5.28 because Vercel refused 15.1.4.
          | Left: Try OCR, PDF parsing and the 4 MB upload limit; set SIGNUP_INVITE_CODE and redeploy (S-51); test the tester extension zip.
    - [done] Let a user delete their own account {S-43}
          | What: A Danger zone in Settings that asks for the password, a one-time code and the word DELETE, then deletes the user's data and login on the server.
          | Decided: One-time code comes from an authenticator app (TOTP), set up once in Settings. No mail service needed.
          | Plan: Delete the user's projects (their clips and documents go with them), then the profile (settings, tokens, AI keys cascade), then the login. The projects table only clears the owner on profile delete, so it must be deleted first.
          | Done: Built. Authenticator app set-up in Settings (Account & Security); delete needs password, a current code and DELETE. Migration 002_account_mfa.sql; otpauth package; 5 unit tests.
          | Done too: Migration 002 run on the testers project; deployed to https://researchie-testers.vercel.app on 2026-10-16 (/api/auth/totp answers 401 when signed out, so the route is live).
          | Checked: You set up the authenticator app on the live site and it worked with a real app.
          | Left: Say whether the delete itself went through (password, code, DELETE, then sign-in fails). Set-up works, but copying the key to a phone is too much work: see S-59.
    - [done] Switch between saved accounts from the sidebar {S-44}
          | What: The profile menu lists the other email addresses you signed in with on this browser. Picking one signs you out and opens the sign-in page with that address filled in; you type the password. "Use another account" signs out. A small x forgets an address.
          | Decided: Only addresses are remembered (in this browser), never passwords or sessions. Accounts are not kept signed in side by side.
          | Notes: Tester site only; local mode keeps the single Switch account button. 8 unit tests. Deployed 2026-10-16 and checked by you on the live site.
    - [done] Scan a QR code to set up the authenticator app {S-59}
          | What: Today the set-up shows a key to copy into the phone app by hand. Show a QR code instead, so the app scans it and adds the account in one step.
          | Done: The set-up now draws a QR code in the browser from the otpauth address (qrcode package) and keeps the key as a fallback.
          | Left: Deploy, then scan it with your phone app on the live site. Type-checked only.
    - [in progress] Sign in with Google {S-45}
          | What: "Continue with Google" on the sign-in page, linked to the same account when the email already exists.
          | Done: Built. The button starts on the server (/api/auth/google) and returns to /auth/callback; the session stays an httpOnly cookie. A brand-new Google account must pass the invite code when one is set, so Google is not a way around it. The old callback let a crafted `next` address send people to another site; that is fixed (only addresses on this site). 3 unit tests. The button stays a disabled placeholder until you switch it on.
          | Left: Do the three steps in docs/GOOGLE_SIGNIN_SETUP.md (Google Cloud OAuth client, Supabase Google provider and redirect URL, Vercel NEXT_PUBLIC_GOOGLE_SIGNIN=true plus a redeploy), then try it by hand. Not tried with a real Google account.
    - [in progress] Keep each user's Notion token safely on the server {S-46}
          | What: On the tester site the Notion token was kept in memory only, so users pasted it each visit. It is now stored encrypted (AES-256-GCM, bound to the user), like the AI key.
          | Done: Migration 003_notion_token.sql; route /api/settings/notion-token (save with a check against Notion, replace, remove; the browser only sees the last four characters); the Notion export uses the saved token for a browser session only (an extension token cannot); the Settings Notion box and the Export box show "Saved: ••••1234" with Replace and Remove. Local mode is unchanged. 3 unit tests.
          | Left: Run migration 003 on the testers project, deploy, then save a real token and run an export on the live site.
    - [done] Stop duplicate clips when a reply is lost {S-47}
          | What: If a save reaches the server but the reply is lost, the extension's retry no longer makes a second copy.
          | Done: Each clip gets an id before its first try; the server returns the saved clip for the same id.
          | Notes: v1.9.1. Unit-tested; not run on the live site.
    - [done] Keep clips when deleting a project {S-48}
          | What: Deleting a project with "keep clips" moves its clips and documents to another project first.
          | Done: The server moves them in the same request that deletes. The app picks the parent, another project, or a new "Unfiled clips" project. Sub-projects are deleted on the server too.
          | Notes: v1.9.1. Unit tests and e2e 19. Local mode moves clips but not documents.
    - [done] Use one code path for data {S-49}
          | What: The server picked between the old local file store and Supabase in every route, and the local branch also copied everything into the old Supabase project.
          | Decided: One interface (store.ts) with two plugs, Supabase per user and local files. Local mode now touches only local files and never writes to Supabase (you chose this).
          | Done: Atoms, projects, documents, search, rebuild-context and share all call `store`. Decision 22. The old pgvector search call and the local mirror are removed. 16 clips that lived only in the old Supabase project no longer show locally; they are untouched there.
          | Notes: Browser suite and unit tests re-run against it.
    - [done] Log the security decisions made for the tester site {S-60}
          | What: One document that says what was decided for the 5 to 10 person test, why, what it costs and what was left open on purpose.
          | Done: docs/SECURITY_DECISIONS.md (decisions A1 to G5, accepted gaps, a list for before opening to more people, owner duties, what is not verified) and Decision 24.
          | Notes: Found while writing it, still open: the block-clip iframe sandbox (scripts plus same-origin), the wildcard CORS header, no Content-Security-Policy, and the tester service key not yet rotated (S-41).
    - [done] Review the npm security warnings {S-50}
          | What: npm audit reports 12 findings (down from 13). The rest need major upgrades (Tailwind 3 to 4, Next 15 to 16, mammoth) and sit mostly in build tools.
          | Checked 2026-10-16 (npm audit, 12 findings: 6 moderate, 6 high, 0 critical). None touches what testers send to the site:
          |   - tailwindcss, braces, micromatch, fast-glob, chokidar (6 high/moderate): build-time file matching on our own source. Fixing needs Tailwind 3 to 4.
          |   - next and postcss (2): postcss runs on our own CSS at build time, not on anything a user sends. Fixing needs Next 15 to 16.
          |   - mammoth, argparse, sprintf-js (3): mammoth reads uploaded Word files. The flagged code is argparse's command-line parser, which mammoth's library path does not use; npm's suggested fix is an old version (0.3.29), so it is not a fix.
          | Recommendation: do not upgrade now. Tailwind 4 and Next 16 are large changes for no reduction in what a tester can reach. Re-check when you plan the next framework upgrade, or sooner if npm reports a critical one.
          | Decided 2026-10-16: accepted for now. The non-breaking `npm audit fix` changes nothing (still 12), so only major upgrades would clear them.
          | Notes: Re-check at the next planned framework upgrade, or sooner if npm reports a critical finding.
    - [in progress] Ask for an invite code when someone signs up {S-51}
          | What: Set SIGNUP_INVITE_CODE and the sign-up form asks for it; wrong guesses are limited per address. Without it anyone who finds the address can register.
          | Done: Built and unit-tested; checked on a local server (v1.9.1).
          | Left: Set the variable on Vercel, redeploy, and try a sign-up.
    - [in progress] Use AI model names that exist for each provider {S-52}
          | What: Default models were checked against each provider's list: OpenRouter now uses openrouter/free, Google uses gemini-3.8-flash, and Groq falls back only to listed production models.
          | Left: Try each provider with a real key.
  - [in progress] Product plan {S-53}
        | What: Features not built yet and the plan documents.
    - [in progress] Share a project with other accounts {S-54}
          | What: Figma-style sharing: a link with can view or can edit, invite by email with a role, a member list (owner, editor, viewer), the owner changes or removes access, and Request access with approve or deny, all enforced on the server.
          | Done: Design approved (docs/SHARING_DESIGN.md, Decision 23). Steps 1 and 2 built: migration 004 (four tables), roles checked in the data layer, members and invitations, the real Share dialog (invite by email, roles, remove, leave, cancel), "Shared with me" in the sidebar, controls hidden for viewers, the extension skips read-only projects, and the old mock Share window is deleted. 15 new unit tests (276 total); local mode unchanged and has no Share button.
          | Also built: share links (view for anyone, edit after sign-in; secret shown once; turn off or replace at once) and access requests ("You need access" page, owner approves or denies with a role, count on the Share button). 23 sharing tests, 269 unit tests in all.
          | Left: Run migration 004 on the testers project and deploy; check with two accounts: invite, see the project, edit as editor, blocked as viewer, remove, a view link signed out, an edit link, a request and its approval.
    - [done] Rewrite the PRD to match what was built {S-55}
          | What: docs/RESEARCH_TOOL_PRD.md named tools that are not used (Cloudflare R2, Gemini 1.5, shadcn, a TypeScript extension).
          | Done: Rewritten as version 2.0.0 on 2026-10-16: features marked built or planned, phases with their status, pricing marked undecided, the real stack, and the privacy rules now in force.
    - [dropped] Enforce free-plan limits {S-56}
          | What: Free-tier caps (3 projects, 25 block clips a month) were never enforced. Dropped by you on 2026-10-14.

## Old IDs

Items used to be called c1, p14 and so on. These still work in /scopetrack commands.

- root = S-01
- c1 = S-02
- c2 = S-03
- c3 = S-04
- c4 = S-05
- c5 = S-06
- c6 = S-07
- c7 = S-08
- c8 = S-09
- c9 = S-10
- q1 = S-11
- q2 = S-12
- q3 = S-13
- q4 = S-14
- q5 = S-15
- q6 = S-16
- e1 = S-18
- w1 = S-19
- h1 = S-20
- h2 = S-21
- h3 = S-22
- h4 = S-23
- h5 = S-24
- p24 = S-25
- p25 = S-26
- p58 = S-58
- p59 = S-59
- p2a = S-28
- p2b = S-29
- p3 = S-30
- p4 = S-31
- p5 = S-32
- p2 = S-33
- p12 = S-35
- p13 = S-36
- p10 = S-37
- p7 = S-38
- p6 = S-39
- p14 = S-40
- p16 = S-41
- p17 = S-42
- p15 = S-43
- p18 = S-44
- p19 = S-45
- p20 = S-46
- p21 = S-47
- p22 = S-48
- p23 = S-49
- p26 = S-50
- p27 = S-51
- p28 = S-52
- p1 = S-53
- p8 = S-54
- p11 = S-55
- p9 = S-56

## Scope changes

- 2026-10-13 — PRD gap check (docs/RESEARCH_TOOL_PRD.md) found items not in the tree; added under {p1}.

## History

- 2026-10-13 — Tree created from docs/CONTEXT.md section 4 and FEATURE_INVENTORY.md.
- 2026-10-13 — Housekeeping: h2, h3 verified already done; h4 finished by untracking .cognee-graph-*.json; c8 (AMA) marked done per git log.
- 2026-10-13 — c7 marked done (apa.ts covers preprint, dataset, chapter, report). h5 narrowed: e2e changes are already committed.
- 2026-10-15 00:58 — started: Citation Engine
- 2026-10-15 — Scope reorganised: every item has an S-number, titles and descriptions were rewritten in plain language, and "PRD gaps" was split into Chrome extension, Feed and cards, Tester site and Product plan. Old ids are listed under Old IDs. p27 and p28 are now "in progress" because each has one step left.

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
- 2026-10-15 — Owner asked to commit and start the required changes. Committed e7bf5c7. Done: p21, p22, p27, p28; p26 partly (13 to 12). Also fixed: local-mode PATCH erased a clip's title and tags when pinning (updateLocalAtom copied undefined fields); e2e 05 made safe against clicking before the page hydrates.
- 2026-10-15 — Limits reviewed with the owner. Added p26 (npm audit), p27 (open sign-up), p28 (unchecked default model names). Corrected an earlier claim: schema.sql had row-level security on but with open "Public ... Access" policies; 001_multi_user.sql now drops them and the three seeded demo projects.
- 2026-10-15 — Owner chose to keep p5 and fix it. p5 done (v1.8.8).
- 2026-10-15 — Scope change: added and finished p13, video embeds (v1.8.7).
- 2026-10-15 — p2b and p3 done (v1.8.6). Block, image and screenshot dialogs show "Sends to <project>" with the three-dot menu (Ask AI, Change to…). The text pill menu also has Ask AI. e2e 15 covers all three dialogs.
