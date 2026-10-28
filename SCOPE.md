# Scope

Edited by the `/scopetrack` mod. Use `/scopetrack` to see the tree and where you are. Never delete history: finished or dropped items stay in the tree.

Current: {S-61}

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
  - [done] Spatial canvas {S-66}
        | What: The whiteboard where clips, notes, shapes and sections are laid out and connected.
    - [done] Audit every canvas tool and fix what was broken {S-67}
          | What: Hover buttons removed, rotation for everything except sections, sections as outlines only, typed text kept, every element scalable, and a full pass over every tool.
          | Done: See v1.9.16 in docs/CHANGELOG.md: 9 unit tests for the geometry, 10 for the export drawing, 40 end-to-end tests on a real mouse and keyboard.
          | Left: Group scaling and rotation, copy and paste, touch screens. Not tried on the live site.
  - [done] How it works guide with first-run setup {S-68}
        | What: A dialog that explains what the product is, use cases and how to use it, and asks new users to install the extension and add an AI key first.
        | Done: See v1.9.17 in docs/CHANGELOG.md.
        | Left: Finish-setup banner, phone width, real tester feedback.
  - [in progress] Tester site {S-40}
        | What: Lets 5 to 10 testers sign up and use their own private workspace, AI key and Chrome extension on a live site.
        | Done: Accounts, private data, AI keys, the extension token and settings saved in the account; deployed at https://researchie-testers.vercel.app (v1.9.0, v1.9.1).
        | Left: Get the extension to testers (S-61, top priority), live checks (S-41, S-42), then the items below.
    - [in progress] PRIORITY: Get the Chrome extension to the testers {S-61}
          | What: Testers can use the site but have no way to get the extension. It is only a folder on your computer. Decide how they install it, make it easy, and write the steps.
          | Why it matters: Clipping is the main thing Researchie does. Without the extension a tester can only use the website.
          | Options to choose from: (a) a zip + "Load unpacked" in Developer mode: free, works today, but testers must do it by hand and Chrome shows a "disable developer mode extensions" nag on restart; (b) publish to the Chrome Web Store as Unlisted: one link installs it, auto-updates, needs a one-time $5 developer fee and a review (days), and a privacy policy page; (c) a private Web Store listing limited to the testers' Google accounts (Trusted Testers): same review, no public page.
          | Recommendation: do (a) now so testers can start this week; start (b) in parallel for the longer run.
      - [in progress] Build a tester zip and the install steps {S-62}
            | What: A zip of the extension plus plain install steps, reached from a "Download extension" button at the top right of the dashboard (decided by you 2026-10-16).
            | Done: Built. `npm run pack:extension` writes public/researchie-extension.zip; the dashboard button opens a dialog with the download (version and size) and six steps. A unit test fails if the zip is stale; an e2e test opens the dialog and fetches the zip.
            | Left: Run `npm run pack:extension` before each deploy, deploy, then on the live site download the zip, load it in Chrome and connect it with a token. Not tried yet in a clean Chrome profile.
      - [done] Decide the delivery route {S-63}
            | What: Pick zip only, Web Store unlisted, or both.
            | Decided 2026-10-16: zip download from the dashboard for now. Web Store (S-64) stays open for later.
      - [not started] Prepare the Chrome Web Store listing {S-64}
            | What: Name, description, screenshots, icons, a short privacy policy (what is sent, where it is stored), and a permission reason for <all_urls> (reviewers question it). Narrowing host access first may speed up review.
            | Left: Only if S-63 picks the Web Store.
      - [not started] Let testers get updates {S-65}
            | What: How a tester gets a new version: with the zip they must replace the folder and reload; with the Web Store it is automatic. Add a version number check the extension shows when it is out of date.
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
    - [dropped] Sign in with Google {S-45}
          | What: "Continue with Google" on the sign-in page, linked to the same account when the email already exists.
          | Dropped 2026-10-18: not needed until you say so. The code is built and stays switched off. Nothing to do.
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
          | Tester note 2026-10-18: Cerebras asked for card details at sign-up, which testers will not accept. Decided 2026-10-18: Groq is the only provider offered for now. The Provider list shows Groq alone (the dropdown is hidden), the onboarding AI step explains how to get a Groq key, and Settings uses the same form. The other adapters stay in the code and an old saved key for one still works.
    - [in progress] Extension feels slow: 2 to 3 seconds before a clip shows up {S-119}
          | What: Reported by a tester on 2026-10-18. Find where the time goes (the extension's save call, the server, Supabase, the side panel refresh) before changing anything.
          | Done: Measuring first. A save makes about four database calls in a row (token check, project lookup twice, insert), so a distance between the Vercel region and the Supabase region adds up fast. POST /api/atoms now returns a Server-Timing header (auth, save, total) and logs it.
          | Left: Read those numbers on the live site, and compare the Vercel function region with the Supabase region. Then fix the biggest part.
          | Model: Sonnet · M · medium · about 100k tokens
    - [in progress] Sign-out must stop the extension token from working {S-120}
          | What: Reported 2026-10-18. Signing out of the website does not revoke the extension tokens (src/app/api/auth/logout/route.ts only ends the browser session), so the extension keeps saving clips into a signed-out account. Revoke that account's extension tokens on sign-out, and have the extension show "reconnect" instead of failing quietly.
          | Done: Signing out now revokes all of that account's extension tokens (src/lib/auth/revoke.ts, called from the logout route). The extension's next save gets 401 and asks to connect again. 3 tests.
          | Left: Check on the live site (see the test list).
          | Model: Sonnet · S · low · about 40k tokens
    - [in progress] OCR does not work on the Vercel site {S-121}
          | What: Reported 2026-10-18. OCR works locally (tesseract.js). Likely causes: the worker or language data cannot be loaded in the hosted build, or the request exceeds the function time or size limit. Find the cause from the Vercel logs, then fix.
          | Done: A best-guess fix for the hosted build: tesseract.js and sharp are kept as real packages, the worker files are copied into the /api/ocr function (139 files in the build trace), language data is cached in the temp folder, the time limit is 50 seconds because a cold start also downloads the language data, and a failure now comes back as an error message instead of silent empty text. OCR still works locally.
          | Left: Test on the live site. If it still fails, send the Vercel log line for /api/ocr.
          | Model: Sonnet · M · medium · about 100k tokens
    - [in progress] Upload progress bar does not match the real upload {S-122}
          | What: Reported 2026-10-18. The progress indicator on PDF and document upload (src/components/PDFReaderView.tsx, uploadProgress) is not tied to bytes sent. Tie it to the real upload, or show a plain "Uploading" state if the browser cannot report it.
          | Done: The bar follows the bytes actually sent (XMLHttpRequest progress), then the server reading, then the citation lookup; the save step reaches 100% only when the server says yes, and a failed save now says so instead of showing "opened successfully".
          | Left: Check on the live site with a slow connection.
          | Model: Sonnet · S · low · about 40k tokens
    - [not started] Settle the invite-code and Google sign-in reports {S-123}
          | What: Reported 2026-10-18: invite codes "not working". The invite code (S-51) is a code you set on Vercel and give to testers by hand; nothing emails it, so "no email set up" is expected, but "not working" needs the exact message the tester saw. (Google sign-in was dropped, see S-45.)
          | Model: You · then Sonnet if there is a bug
    - [dropped] Learn what the Chrome Web Store needs, then decide {S-124}
          | What: Reported 2026-10-18: not yet listed in the Chrome Web Store, and you want to learn how. Covered by S-63 and S-64 (zip chosen for now). Needs a one-time developer account fee, a privacy policy page and a review of a few days.
          | Dropped 2026-10-18: not needed until you say so (the zip stays). S-63 and S-64 stay parked.
          | Model: You, with Sonnet to prepare the listing
  - [in progress] Product plan {S-53}
        | What: Features not built yet and the plan documents.
    - [in progress] Notification box, better share messages, leave a shared project, faster Share dialog {S-125}
          | What: Reported 2026-10-18 while testing sharing. (1) The "Added. The project is under Shared with me for them." line was too generic. (2) The other person had no way to see that something was shared with them or that they were asked for access. (3) A person could not take a project shared with them off their own list. (4) The Share dialog was slow to open.
          | Done: (1) Messages now name the person, the role and the project, and say when no email is sent. (2) A bell next to Settings, with a count, a list that keeps each notification until the person removes it (X on each, Clear all), and a small card that pops up when a new one arrives while the app is open. It covers: shared with you, role changed, removed, someone left, an access request, approved, declined, and someone joined through your edit link. Needs migration 005_notifications.sql. (3) A "Remove from my list" button on hover for projects shared with you; the owner is told. (4) The Share dialog now asks the database for everything at once instead of about nine calls in a row. 9 new tests, and 3 browser tests for the bell.
          | Left: Run migration 005, deploy, and check with two accounts (see the test list).
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
  - [not started] Roadmap 2026-10 {S-69}
        | What: Agreed 2026-10-18 from the gap report and docs/COMPETITOR_ANALYSIS.md. Two branches: NECESSARY (a thesis student in sciences or medicine can capture, trust, cite and export, and nobody sees another tester's data) and EXTRA.
        | Rules: Opus 5.5 designs only (short design note, then hands to Sonnet). Sonnet writes all code, tests and fixes. Haiku does subagents and simple tasks (doc sync, changelog, grep sweeps). Sizes: S about 30k tokens at low or medium effort, M about 150k at medium effort, L is split before it starts. AI features propose and the researcher confirms.
    - [not started] NECESSARY {S-70}
          | What: Position: clip from anywhere, keep the exact passage, and know which of your claims still stand. Existing tester items stay where they are: S-61 to S-65 (extension to testers), S-41, S-42, S-45, S-46, S-51 (live checks), S-54 (sharing).
      - [in progress] Phase 1: Safe to hand out {S-71}
        - [done] Fix schema.sql so a fresh setup is not open {S-72}
              | What: supabase/schema.sql still creates the three open "Public ... Access" policies; migration 001 drops them but a fresh setup from schema.sql alone is open to anyone with the anon key.
              | Model: Sonnet · S · low · about 20k tokens
              | Done: 2026-10-18. schema.sql now enables row-level security and creates no policies, so the anon key can read and write nothing until migration 001 adds the per-user ones (the server uses the service-role key). Running schema.sql then 001 gives the same result as before.
        - [in progress] Run migration 004 and test sharing with two accounts {S-73}
              | What: The S-54 "Left" step: run migration 004 on the testers project, deploy, then check invite, editor, viewer, remove, view link, edit link, request and approval.
              | Model: Sonnet · S · low · about 30k tokens
              | Done: Migration 004 run on the testers project and the build deployed (you, 2026-10-18). 23 sharing unit tests pass.
              | Left: The two-account check on the live site (invite, editor, viewer, remove, view link signed out, edit link, request and approval). Yours: it needs two real accounts.
        - [done] Paginate clips and documents {S-74}
              | What: listAtoms and listDocuments (src/lib/data/cloud.ts) read every row; Supabase caps a query at 1000 rows, so a big project truncates silently. Only one 77-clip project has been tried.
              | Model: Sonnet · M · medium · about 100k tokens
              | Done: 2026-10-18. `readAllRows` in src/lib/data/cloud.ts reads 1,000 rows at a time, ordered by time then id so equal timestamps do not repeat or skip, and throws if a page fails instead of returning a partial list. Used by listAtoms, listDocuments and the share-link read. 4 new tests against a fake database that caps queries at 1,000 rows (326 unit tests in all).
              | Left: /api/atoms/search still loads every clip (S-84).
        - [done] Re-sync docs/CONTEXT.md to v1.9.18 {S-75}
              | What: CONTEXT.md says v1.8.1, last synced 2026-10-14; the changelog is at v1.9.18.
              | Model: Haiku · S · low · about 15k tokens
              | Done: 2026-10-18. docs/CONTEXT.md is at v1.9.18 with rows for accounts, sharing, source health and onboarding, and a refreshed limits section.
        - [not started] Check the untested extension paths by hand {S-76}
              | What: Yours to do in real Chrome: side panel summary chips, + Save to Project, update-date capture, video on live YouTube and Vimeo, offline-queue alarm with a real network drop (the list left open under S-25).
              | Model: You · no tokens
      - [not started] Phase 2: Source health (the unique claim) {S-77}
            | What: Pillar A of the competitor analysis. No rival tells you when a source goes bad.
        - [done] Design note: source health states and schedule {S-78}
              | What: States verified, changed, moved, gone, retracted; how often to re-check; where each state is stored; wording in plain language.
              | Model: Opus · M · high · about 60k tokens
              | Done: 2026-10-18. docs/SOURCE_HEALTH_DESIGN.md (written by an Opus agent). Health moves out of metadata.health into two new tables (source_status per DOI or PMID, clip_health per clip or PDF, migration 006); retraction states stay, page states are unchecked, verified, moved, changed, gone, could_not_check, not_applicable; one badge by severity; two daily Vercel crons (03:00 retraction, 04:00 pages) plus on-open and a Re-check now button; "changed" or "gone" needs two misses 20 hours apart, and a network failure only ever means "could not check".
              | Left: Your answers to the five open questions in section 7 of the note.
        - [not started] Fix the server fetch that follows redirects into private addresses {S-126}
              | What: Found by the design note. src/app/api/atoms/rebuild-context/route.ts checks only the first URL and then lets fetch follow redirects, so a public page that redirects to a private address gets through. Build a safeFetch (check every redirect, pin the address) and use it here and in the OCR route.
              | Model: Sonnet · S · medium · about 50k tokens
        - [not started] Stop a retraction notice from showing as a retracted paper {S-127}
              | What: Found by the design note. src/lib/citations/crossref.ts lines 89 to 90 mark a notice record itself as retracted.
              | Model: Sonnet · S · low · about 20k tokens
        - [not started] Scheduled retraction re-check {S-79}
              | What: Today the retraction check runs once, at citation time, and no source lists every retraction. Re-check on a schedule and flag affected clips, notes and synthesis outputs.
              | Model: Sonnet · M · medium · about 150k tokens
        - [not started] Page-changed detection {S-80}
              | What: Re-fetch the page, compare the clipped passage, flag changed, moved or gone, and offer the cached snapshot (the snapshot already exists).
              | Model: Sonnet · M · medium · about 150k tokens
        - [not started] Source health dashboard per project {S-81}
              | What: One screen: verified, unverified, changed, retracted, dead.
              | Model: Sonnet · S · medium · about 50k tokens
      - [in progress] Paper Mode workspace {S-147}
            | What: Paper Mode becomes a file-explorer home for every paper (template picker, wizard, a Word-style editor with a content sidebar, drag and drop, robust paste, citations page). Plan: C:\Users\suman\.claude\plans\eager-cooking-shore.md. Research: docs/research/paper-mode-workspace.md.
        - [done] Papers table, API and workspace home {S-148}
              | What: supabase/migrations/006_papers.sql, src/lib/data/papers.ts (and a local file store), /api/papers, the Paper mode button on the dashboard, a list or grid with search, rename, copy, delete with undo, and a trash.
              | Model: Sonnet · M · medium · about 150k tokens
              | Done: 2026-10-22. 7 unit tests, 2 e2e tests (e2e/25-paper-workspace.spec.ts). Left: you run migration 006; not tried signed in.
        - [done] Template picker and new-paper wizard {S-149}
              | What: Blank plus five templates as data (src/lib/paper/templates.ts), a quick structure preview, a five-question wizard.
              | Model: Sonnet · S · medium · about 50k tokens
              | Done: 2026-10-22. 6 unit tests. Opening a created paper only shows a note until S-150. Feedback round the same day: the preview is now page wireframes (12 unit tests in tests/paper-wireframe.test.mjs and tests/paper-templates.test.mjs), the window is large and constant, papers open in grid view with a first-page thumbnail, and the trash's way back has no trash icon.
        - [in progress] Word-style editor with sidebar, drag and drop and front matter {S-150}
              | What: TipTap editor over the template (sections, quote, citation, figure, table nodes), reorder sections, a content sidebar of the project's clips, images and citations, front-matter panel, header and footer zones, CSS page sheet. Design note: docs/PAPER_EDITOR_DESIGN.md (Opus, 2026-10-22). Built in two parts. Owner asked that a created paper loads the editor and transitions in about 2 seconds; measured at about 0.4 s on the dev server.
        - [done] Editor core (C1) {S-154}
              | What: papers.doc and papers.meta models (src/lib/paper/docModel.ts), the TipTap schema with locked template headings, the page sheet, front-matter panel, header and footer tokens, citations as nodes with markers drawn from a cite map, a computed reference list, autosave with a conflict check (409), open from the workspace with ?paper=<id>.
              | Model: Sonnet · L · high
              | Done: 2026-10-22. 34 new unit tests (paper-doc, paper-schema, papers), 4 e2e tests (e2e/26-paper-editor.spec.ts). Left: you try it; not tried signed in; clips are not loaded in the editor yet, so a citation to an unknown clip shows [?] (that arrives with C2).
        - [done] Clip sidebar, drag and drop, Insert, citations from a cite map (C2a) {S-155}
              | What: a left sidebar with Text, Images and Citations tabs over the data-source project's clips (and its sub-projects), search, change of data source, "In the text" marks; Insert and native drag place a quote, an AI-summary note, the researcher's own paragraphs, a figure or an editable table; a Citations row places an in-text marker that follows the chosen style; the reference list is built from what is cited.
              | Model: Sonnet · M · high
              | Done: 2026-10-22. 8 unit tests (tests/paper-insert.test.mjs), 3 e2e tests (e2e/27-paper-sidebar.spec.ts). Found and fixed a crash: the Placeholder extension read a stale document position; replaced by our own hints. Left: the drag is tested with synthetic events only; try a real drag in Chrome; sub-project clips not checked by hand.
        - [done] Editor toolbar revamp from a real journal article {S-161}
              | What: studied the owner's PLOS ONE sample (docs/research/plos-article-structure.md). New toolbar: paragraph styles carrying the article's type scale, font size, alignment, line spacing, first-line indent, link, clear formatting, and Add section, Remove heading, Remove section. Nothing is locked any more. Page layout: body columns, margins, typeface, and a switch for every front and end block. Quotes are plain paragraphs in quotation marks (no side rule). Numbered citation styles (IEEE, Vancouver, AMA) removed from the menus. Insert table and insert formula taken off the toolbar (paste for now).
              | Model: Sonnet · L · high
              | Done: 2026-10-22. 19 new unit tests (tests/paper-format.test.mjs and others), 4 e2e tests (e2e/28-paper-toolbar.spec.ts). Left: side column of pages 1 and 2, self-numbering headings, figure and table cross-references, a DOI footer token. The sample uses a numbered bibliography, which conflicts with removing the numbered styles; the owner decides.
        - [not started] Section outline panel: rename, reorder, add, remove, Not in the paper bin (C2b) {S-156}
              | What: design note section 5. Up and down buttons, Rename for template sections, add a custom section, remove with content moved to the bin.
              | Model: Sonnet · M · high · about 100k tokens
        - [not started] Import old outlines as papers (C2c) {S-157}
              | What: design note section 7. One click per old outline; never deletes the old data.
              | Model: Sonnet · M · medium · about 80k tokens
        - [done] Comments on selected text {S-167}
              | What: select text, press Comment, write a note. The text is highlighted; Comments lists every note; clicking one selects its text; Delete removes the note and the highlight. Word-style, for the author's own notes.
              | Done: 2026-10-28. Comment mark and comments list in meta (src/lib/paper/editor/comments.ts, docModel.ts), toolbar Comment and Comments buttons. 3 unit tests (tests/paper-comments.test.mjs), 2 e2e tests (e2e/54-paper-comments.spec.ts). Left: comments are not in Word, PDF or Markdown export; print shows the highlight; no replies or resolve.
        - [done] Extension sends the page citation with every AI request and save {S-168}
              | What: the page's DOI or PMID (or web facts when it has neither) travels with the AI brief, the AI question, the saved brief and answer, the saved image, screenshot, block and link. The AI text starts with a Source line, and an answer shows its Source line.
              | Done: 2026-10-28. extension/pageCitation.js (shared reader), content.js, cropper.js, blockPicker.js, popup.js, sidepanel.js, manifest.json. Checked by syntax and a stub-page run of the reader. Left: not run in a real Chrome with a DOI page; the server is unchanged, so the citation reaches the AI as text, not as a structured field.
        - [done] AI answer links: none in web and plugin timeline text; document links open the page {S-169}
              | What: web and plugin answers saved to the timeline have no links (link text kept, URLs dropped; the source line has no URL). Document Assistant answers keep a [Page N] link on each sentence; clicking it opens that page of the document in the reader, with the saved quote highlighted on its page.
              | Done: 2026-10-28. extension/answerText.js (plainAnswer), sidepanel.js and popup.js saves, pageCitation.js source line, PDFReaderView.tsx save, AtomCard.tsx page links. Unit tests and extension zip test pass; e2e 07 and 09 pass (07 failed once in a suite run, passes alone). Left: the links are not checked by hand in Chrome; answers saved before this change keep their old links.
        - [done] Comment notes in the right margin {S-170}
              | What: each comment shows as a note beside its text in the right margin; clicking the note selects the text. Notes are not printed.
              | Done: 2026-10-28. PaperEditor.tsx computes the pins in the pagination pass; PaperPageSheet.tsx draws them; globals.css hides them in print. e2e/56-comment-pins.spec.ts passes. Left: the margin is off-screen on narrow windows (about 1280 px wide the note is cut at the window edge); the abstract and other front matter are not in the editor, so they cannot be commented (move them into the editor: new item).
        - [not started] Front matter (abstract, title, keywords) inside the editor so it can be commented {S-171}
              | What: the abstract is drawn from the front-matter form, not the editor. Comments and selection there do nothing today.
        - [done] Timeline links, PDF citations and PDF line breaks {S-172}
              | What: synthesized content saved to the timeline has no links (Document Assistant keeps its page links). Text copied from the reader through the plugin carries the paper's citation (the reader sets citation meta tags). Text clipped from a PDF in the browser's own viewer gets the PDF's DOI and title (the extension fetches the file; the platform reads it at /api/citations/pdf). Wrapped PDF lines are joined, so a clip has no half-empty gaps.
              | Done: 2026-10-28. src/lib/utils/pdfText.ts, plainText.ts, 5 unit tests (tests/text-clean.test.mjs); the new route was tried on a test PDF with a DOI. Left: not tried in real Chrome, Edge or Firefox PDF viewers; the reader meta tags are not checked in a browser; a PDF with no DOI in its metadata or first page gets no citation; Firefox's viewer is reached only through the right-click menu.
        - [done] Researchie AI panel: width, delete, edit window, content and reference citations {S-173}
              | What: the panel widens by dragging its left edge; a chat turn (question or deliverable) can be deleted; deliverable wording is neutral; a deliverable has Copy, Save to Project and Edit (no download, no tag chips or stars). Edit opens a window of about 70% of the screen: the AI text on the left, an empty page for your own words on the right, references in a chosen style at the bottom (sources used, plus any you add). Saving puts the rewritten text with its references on the timeline as your own note, with the cited clips (sourceAtomIds). Placing that note in a paper inserts the text with one marker that cites all its sources; a clip already in the paper keeps its number, a new one is added to the references. The paper header Citations is a dropdown: Content citation (numbers or author and year) and Reference citation (APA, Harvard, MLA, Chicago, IEEE, Vancouver, AMA).
              | Done: 2026-10-29. DeliverableEditModal.tsx, ResearchieAISidebar.tsx (Haiku agent), inText.ts renderCitationsSplit, docModel.ts clipToNodes, PaperEditor.tsx header. 4 unit tests (tests/citation-split.test.mjs), e2e/59-ai-sidebar-edit.spec.ts; e2e 26, 27, 29, 30 updated for the dropdown. Left: new papers still open in the old default (APA, author and year); you asked for numbered as the default and that changes many existing tests, so it is your call. Not tried with a real AI key. Notes written in the edit window cite only clips that have citation details.
        - [not started] Word export layout and formatting fixes {S-163}
              | What: owner: the .docx opens and looks almost like the platform paper, but has layout and formatting issues. The owner has not listed them yet: collect them from a Word open and fix them one by one.
              | Notes: Needs the owner's list of issues from Word.
        - [not started] Word export: equations as real Word maths {S-164}
              | What: equations are written as monospace LaTeX text. Write them as Office Math (OMML) so Word shows them as equations.
        - [not started] Paste maths from PMC without losing symbols {S-165}
              | What: math symbols from a PubMed Central page paste as plain text. Keep them as maths (LaTeX) or as proper characters.
        - [not started] Print copy page count matches the screen {S-166}
              | What: e2e/46 print: the screen shows 3 pages, the print copy shows 2. Same on the baseline code, so not from the one-column change. Find why the print layout counts pages differently.
        - [not started] Fix stale paper e2e tests and the Insert columns overflow {S-162}
              | What: e2e/25 outline PDF "one column" fails on the baseline too (still open). e2e/28 and e2e/47 are fixed (2026-10-28). e2e/46 now fails on the print page count (S-166). Also: an Insert columns block taller than a page is still flagged, not split.
              | Notes: Parked by the owner 2026-10-28 to do later.
        - [done] Two-column editing and layout variants {S-158}
              | What: owner asked for two-column variants. Today two columns appear only in the picker preview; the editing sheet is one column. Add a layout choice per paper (one column, two columns, abstract spanning both) shown while editing and in print.
              | Model: Sonnet · M · medium · about 120k tokens
        - [done] Word-like editor functions {S-159}
              | What: owner asked for the usual functions of a text editor: font family and size, text colour and highlight, alignment, line spacing, indent, find and replace, word count of a selection, footnotes, page break, spell check on, clear formatting. Pick the set with the owner first; paste and clip assembly come before long-form typing tools.
              | Model: Sonnet · L, split in two · medium
        - [done] A real page-by-page view {S-160}
              | What: long-term goal from the owner: the paper looks like an actual paper (separate pages, not one long sheet). TipTap's page layout is a paid add-on; paged.js is the free route (see the research note section 4.6).
              | Model: Opus design note, then Sonnet · L
        - [not started] Robust paste, first in line {S-151}
              | What: Sanitise and clean pasted Word, Google Docs, web and PDF text; fixture corpus. The owner says users type very little and mostly paste from NotebookLM or Zotero, so this is the next build. It should also offer to match pasted text to the project's clips (src/lib/paper/pasteMatch.ts) so a paste can become a cited quote.
              | Model: Sonnet · M · medium · about 150k tokens
        - [done] Citations page: APA, MLA 9, Chicago in text, book and conference types {S-152}
              | What: In-text and reference list for more styles, cited-versus-listed check, retraction flags.
              | Model: Sonnet · M · medium · about 150k tokens
        - [done] Export a paper to PDF and Markdown {S-153}
              | What: Reuse the print window and add Markdown with [@key] citations. DOCX is later.
              | Model: Sonnet · S · medium · about 50k tokens
      - [not started] Phase 3: Search at scale {S-82}
        - [not started] Design note: pgvector search {S-83}
              | What: Index type, embedding backfill for old clips, query shape. The embedding vector(768) column exists; nothing queries it.
              | Model: Opus · M · high · about 50k tokens
        - [not started] Build pgvector search {S-84}
              | What: /api/atoms/search loads every clip and scores in memory (route.ts lines 34 to 36); replace it with a database query.
              | Model: Sonnet · M · medium · about 120k tokens
      - [not started] Phase 4: Question-first workspace and the literature matrix {S-85}
            | What: Pillar B. The matrix is the literature review table a thesis needs.
        - [not started] Design note: chapters, questions and capture-time tags {S-86}
              | What: A project holds chapters, a chapter holds questions, each clip is tagged for, against or context. Optional PICO template, off by default. AI proposes, the researcher confirms.
              | Model: Opus · M · high · about 70k tokens
        - [not started] Build questions and tags in the web app {S-87}
              | Model: Sonnet · M · medium · about 150k tokens
        - [not started] Capture-time tags in the extension {S-88}
              | Model: Sonnet · M · medium · about 120k tokens
        - [not started] Evidence level label {S-89}
              | What: Systematic review, RCT, cohort, case-control, case report, guideline, preprint, other. PubMed publication types give most of it from the lookup already built.
              | Model: Sonnet · S · medium · about 40k tokens
        - [not started] Design note: the matrix {S-90}
              | What: Rows are sources, columns are claims or PICO parts, cells show supports, contradicts or silent.
              | Model: Opus · S · high · about 40k tokens
        - [not started] Build the matrix table {S-91}
              | Model: Sonnet · M · medium · about 150k tokens
        - [not started] AI-suggested matrix cells {S-92}
              | What: The AI proposes a cell; the researcher confirms with a click.
              | Model: Sonnet · M · medium · about 150k tokens
        - [not started] Remaining AMA forms {S-93}
              | What: Preprints, datasets, book chapters and reports (open gap in CONTEXT.md section 4).
              | Model: Sonnet · S · medium · about 50k tokens
      - [not started] Phase 5: Proof you can carry out {S-94}
            | What: Pillar C. Today claim-level provenance exists only in Document Assistant Q&A.
        - [not started] Design note: provenance that survives export {S-95}
              | What: Each sentence links to clip, page and passage, and the link survives export to Notion and Obsidian.
              | Model: Opus · S · high · about 40k tokens
        - [not started] Provenance in synthesis, PDF report, Notion and Obsidian {S-96}
              | Model: Sonnet · M · medium · about 150k tokens
        - [not started] Audit view and read-only supervisor link {S-97}
              | What: One click lists every claim with its quote, source, verification state and warnings.
              | Model: Sonnet · M · medium · about 150k tokens
    - [not started] EXTRA {S-98}
          | What: Not needed for the testers or for the source-health verdict. Start only after NECESSARY phases 1 to 3.
      - [not started] Common users: before public launch {S-99}
            | What: Testers do not need these; a public launch does.
        - [not started] Password reset by email {S-100}
              | What: No reset exists; a tester who forgets a password asks you. Needs a mail provider first (Supabase's built-in sender is limited).
              | Model: Sonnet · M · medium
        - [not started] Delete-account flow {S-101}
              | What: Not built.
              | Model: Sonnet · S · medium
        - [not started] Backup plan {S-102}
              | What: Vercel Hobby and Supabase free have no automatic backups; Supabase free also pauses an idle project.
              | Model: Haiku writes the steps, you act · S · low
        - [not started] Shared rate limiter {S-103}
              | What: The sign-in limiter lives in memory per Vercel instance and resets on cold start.
              | Model: Sonnet · S · medium
        - [not started] Firefox and Edge extension {S-104}
              | What: Chrome only today.
              | Model: Sonnet · M · medium
        - [not started] Mobile capture {S-105}
              | Model: Sonnet · M · medium
      - [not started] Power users {S-106}
        - [not started] APA author-date with an alphabetical list {S-107}
              | What: Every style is numbered today.
              | Model: Sonnet · M · medium
        - [not started] Harvard, IEEE, MLA, Chicago {S-108}
              | Model: Sonnet · M · medium
        - [not started] Zotero and Mendeley import {S-109}
              | What: No import exists; BibTeX and RIS export only.
              | Model: Sonnet · M · medium
        - [done] Word (.docx) export {S-110}
              | What: Only PDF, Markdown, Notion and Obsidian exist.
              | Done: 2026-10-28. Written straight from the editor document: real tables with merged cells, embedded images, per-section columns. 15 unit tests (tests/paper-docx.test.mjs). Checked: XML well-formed, python-docx opens it, owner opened it in Word: "kind of working"; layout and formatting issues open as S-163.
              | Model: Sonnet · M · medium
        - [not started] Contradiction finder {S-111}
              | What: Show two clips that disagree, side by side with sources. Needs S-86 to S-92.
              | Model: Sonnet · M · medium
        - [not started] Gaps list {S-112}
              | What: Questions with no or weak evidence; claims with one source. Needs S-86.
              | Model: Sonnet · S · medium
        - [not started] Trial registry links {S-113}
              | What: Detect an NCT id in a clip and link it. After Phase 2.
              | Model: Sonnet · S · medium
        - [not started] Local-first and bring-your-own-key hardening {S-114}
              | What: Ollama path exists but is weak (qwen2.5:7b passed 11 of 18, deepseek-r1 1 of 18). Decided extra on 2026-10-18.
              | Model: Opus designs, Sonnet builds · M
        - [not started] Two-way Notion sync {S-115}
              | What: Provisional. Notion export is a one-way push.
              | Model: Opus designs, Sonnet builds · L, split first
        - [not started] Public API {S-116}
              | What: Not built.
              | Model: Opus designs, Sonnet builds · L, split first
        - [not started] Real-time collaboration {S-117}
              | What: Provisional. Sharing is roles only, no presence or comments.
              | Model: Opus designs, Sonnet builds · L, split first
        - [not started] Systematic-review screening {S-118}
              | What: Include or exclude with reasons and PRISMA counts. Stay out unless testers ask.
              | Model: Opus designs, Sonnet builds · L, split first

  - [in progress] Paper writing {S-128}
        | What: Turn clips into a structured, cited paper section by section, with a preview of how it will look. The preview is for understanding and motivation only. It is not journal formatting and must never say it replaces a journal editor. Research: docs/research/paper-preview.md and docs/research/notebooklm-zotero-workflow.md.
    - [done] Clip evidence kinds {S-129}
          | What: Every clip is Quote, AI summary or Mine. Only a Quote can be put in quotation marks or cited. Quote check returns no page for a failed match.
          | Done: 2026-10-20. src/lib/atoms/evidence.ts, claimSupport.ts.
    - [done] Paper outline {S-130}
          | What: Research article and literature review templates, parts inside each section, drag to reorder, drag clips onto parts, "next section" guide.
          | Done: 2026-10-20. src/lib/paper/outline.ts, PaperOutlineView.tsx. Saved in the browser only (see S-138).
    - [done] Harvard and numbered (IEEE) in-text citations {S-131}
          | What: Markers jump to the reference list and back; style switch re-renders from the same data. Covers part of S-107 and S-108.
          | Done: 2026-10-20. harvard.ts, ieee.ts, inText.ts.
          | Left: Layouts are not yet checked against the style guides (S-140).
    - [done] Paper preview {S-132}
          | What: Published-looking page built from the outline with a permanent "Preview only, not journal formatting" banner. Single column.
          | Done: 2026-10-20. PaperPreview.tsx, src/lib/paper/preview.ts.
    - [done] AI draft of a section with sentence checks {S-133}
          | What: One model call per section from that section's clips only. Each sentence is checked: no source, fake quote, invented number, text copied without quotation marks, AI-summary only.
          | Done: 2026-10-20. src/lib/paper/draft.ts, /api/ai/draft.
          | Left: Checks do not test that a rewording keeps the clip's meaning. The researcher reads each sentence against its clip.
    - [done] Section checklist and "Mark as done" {S-134}
          | What: A section can be marked done only when: every sentence has a source, no fake quote or invented number, every [ ? ] placeholder is filled, no retracted source. Then the guide moves to the next section. Retraction flag depends on S-127 being fixed so a notice is not shown as a retracted paper.
          | Model: Sonnet · S · medium
          | Done: 2026-10-20. src/lib/paper/checklist.ts, PaperOutlineView.tsx. A done section loses its Done mark if a later change makes a check fail.
          | Left: The DOI lookup sets the retracted flag only when Crossref lists notices, so many sources have no result; the checklist warns about those. A real check needs the source-health work (S-78 design, S-79) and S-127.
    - [done] Long-quote warning (over 50 words) {S-135}
          | What: Warn on a quote over about 50 words: shorten, paraphrase, or check the journal's rules. Not blocking. 50 is the strictest figure found (NIHR Journals Library); Cambridge thesis guidance allows under 100, APA block-quotes at 40. Figures and tables need permission whatever their length.
          | Model: Sonnet · S · low
          | Done: 2026-10-20. LONG_QUOTE_WORDS in checklist.ts; warns, does not block.
    - [done] Privacy line next to the Draft button {S-136}
          | What: Say that the clip text goes to Groq and that unpublished work should be checked against Groq's terms. Groq docs say no retention of inference data by default, with up to 30 days for reliability and abuse checks; free tier is not stated separately (inferred).
          | Model: Sonnet · S · low
          | Done: 2026-10-20. Shown in each section's Draft panel.
    - [done] Paste box for NotebookLM answers {S-137}
          | What: Match pasted text word for word against the user's PDFs. Found text becomes a Quote with a page; the rest stays an AI summary. No AI call.
          | Model: Sonnet · M · medium
          | Done: 2026-10-20. src/lib/paper/pasteMatch.ts, PastePanel.tsx. Paste text, citation markers removed, matched sentence by sentence against the project's PDFs. Only word-for-word text becomes a Quote, with the PDF's own wording, page and the document's citation. Near matches get a hint only. The rest saves as an AI summary or as own text.
          | Left: Saved clips land in "Clips not placed yet"; the user drags them to a part. Matching is exact only, so a copied NotebookLM answer that paraphrases will rarely find a quote. Not tried on scanned PDFs without text.
    - [done] Save outline and drafts to the account {S-138}
          | What: Today they live in the browser only. Keep the previous draft when "Draft again" is used.
          | Model: Sonnet · M · medium
          | Done: 2026-10-20. Saved as account preferences (src/lib/paper/store.ts, usePrefs): follows the account on the tester site, stays in the browser in local mode. Each person has their own outline of a project. 60 KB cap per outline, shown as a "Not saved" banner. Draft again keeps the old draft; Restore previous draft swaps back.
          | Left: Not tested with a real signed-in account (local mode only). The 256 KB limit on all settings is shared across projects.
    - [done] Equations, figures and tables in the preview {S-139}
          | What: KaTeX for equations, captions and numbering for figures and tables. See section 5 of docs/research/paper-preview.md.
          | Model: Sonnet · M · medium
          | Done: 2026-10-21. LaTeX maths in your own text ($x^2$, $$...$$, \ce{H2O}) is drawn with KaTeX (MIT; mhchem for chemistry) in notes, draft sentences and section points; display equations are numbered (1), (2). Image clips become numbered figures and clips holding an HTML table become numbered tables, with captions and the source in text and in the reference list. A table keeps only the text of its cells. Checklist: a figure or table with no source blocks; borrowed ones warn about permission; no caption warns. A draft may only copy equations from a clip.
          | Left: Maths must be typed by the user as LaTeX; equations in a PDF's text are not recovered. No TikZ or custom LaTeX packages. No cross-references by number inside the text yet ("see Figure 1" is typed by hand). Single column, no page breaks.
    - [done] Check Harvard and IEEE layouts against the style guides {S-140}
          | What: Layouts were written from the pattern as known. Verify against Cite Them Right (or the CSL style harvard-cite-them-right) and the IEEE Reference Guide.
          | Model: Sonnet · S · medium
          | Done: 2026-10-20. Compared with harvard-cite-them-right.csl and ieee.csl (read through a summarising tool). Changed: Harvard DOI now "Available at: https://doi.org/..."; four or more authors become "first et al." in the list; years of one author join in the text. IEEE: journal abbreviation used; no range collapse ([1], [2], [3]) because ieee.csl sets none; preprints and datasets take the general layout.
          | Left: Not checked against the Cite Them Right book or the IEEE Reference Guide themselves. The Guide may prefer ranges like [1]–[3].
    - [done] Import references from RIS, BibTeX and Zotero {S-141}
          | What: Same job as S-109. Match duplicates by DOI. Zotero Web API later.
          | Model: Sonnet · M · medium
          | Done: 2026-10-21. RIS and BibTeX files (or pasted text) are read in src/lib/citations/importRefs.ts, matched to the project's PDFs and non-PDF clips by DOI, then title, and attached from the outline's side list (ImportRefsPanel.tsx). Unmatched or ambiguous entries get a picker. A citation that would be replaced is shown, and a known retraction is kept. New PATCH /api/documents sets a PDF's citation. Covers the file part of S-109.
          | Left: Zotero's own API (S-109 remainder). Imported records are marked "manual" because nothing is checked online. Title matches need a person to confirm they are the same paper.
    - [done] Write your own section text {S-142}
          | What: An editor for typing a section yourself, with citations inserted from clips. Today own words only enter as notes.
          | Model: Sonnet · L · medium
          | Done: Full editor, 2026-10-21. "Write my own text" in every section: plain paragraphs, LaTeX maths, and citations inserted from a list of clips that carry a citation as [@Kim2021] tokens (src/lib/paper/authored.ts, SectionEditor.tsx). Each key is explained under the text. The preview draws the tokens as Harvard or numbered markers, with a page only after a direct quotation. Checks: a key must point at a clip that exists and can be cited (not an AI summary, not a clip without reference details); a quotation must be word for word in the cited clip; words copied from a cited clip need quotation marks; retraction is checked on cited clips; sentences with no citation only warn. "Move the AI draft into my text" turns a draft into editable text and records that AI helped, shown in the preview notes (can be unticked). When a section has its own text, it replaces the draft and loose clips in the preview.
          | Left: No bold, italic, headings or lists inside the text. No "see Figure 1" cross-references by number. Keys stay readable but the citation is chosen from a list, not typed freehand. Figures and tables still come from clips placed in the section's parts and follow the text.
          | Done: Small version, 2026-10-20: "Save as my own text" in the paste box makes a Mine note. Full editor not built.
    - [done] Export the preview to PDF {S-143}
          | What: Pages, two columns, running headers (paged.js is MIT).
          | Model: Sonnet · M · medium
          | Done: 2026-10-21. "Download preview as PDF" in the preview opens the browser's print window (choose Save as PDF) on a separate white A4 page built from the preview (src/lib/paper/printDoc.ts, PaperPreview.tsx). Every printed sheet carries "Preview only. Not journal formatting..." as a fixed footer that does not depend on browser support; page numbers use CSS page margin boxes where the browser has them. One or two columns (saved choice); figures, tables and equations keep together. Checked by printing the page to a real PDF in the test and reading its text on every page.
          | Left: Two columns are a layout choice only; real journal templates differ. No running header, no line numbers, no cover page. Page numbers need a recent Chrome or Edge. Not tried in Firefox or Safari.
    - [done] Fix e2e 04 setup {S-144}
          | What: e2e/04-ai-assistant-and-synthesis.spec.ts failed. Earlier note said the button was missing; that was wrong. The button exists. Two real causes: the setup looked for project cards that the dashboard no longer renders, and the Next.js dev badge sits on top of the round AI button so a mouse click never reached it.
          | Model: Haiku · S · low
          | Done: 2026-10-20. Setup now opens the seeded project by name; the button is clicked without a mouse. 5 of 5 pass.
    - [in progress] Check the paper features signed in on the accounts site {S-145}
          | What: Everything so far ran in local mode. Proved without a live account: the PDF citation rules on the accounts store (owner, editor, viewer, outsider) with a fake database, and a refused preferences save is now reported. Not tried live: outline following the account, per-person outlines on a shared project, preferences, PDF citation save, viewer limits, the red "Not saved" notice. Steps: docs/TESTER_CHECKLIST.md rows 34 to 42.
          | Model: Owner runs the steps (needs two test accounts) · S
          | Left: Needs the owner's accounts site and two test accounts; Claude does not sign in or use real credentials.
    - [done] Keep a decision record for the paper work {S-146}
          | What: docs/PAPER_WRITING_DECISIONS.md (what, why, rejected, limits, who decided, evidence, impact, what is not proven), Decisions 25 to 39 in docs/DECISIONS.md, section H in docs/SECURITY_DECISIONS.md, a session record in PROJECT_LOG.md, a case-study section in docs/CASE_STUDY.md, and rows 34 to 42 in docs/TESTER_CHECKLIST.md.
          | Done: 2026-10-21. Kept up to date as work goes on.

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

- 2026-10-29 — S-152, S-153 and S-159 done: MLA 9 and Chicago; Print / PDF and Markdown download; find and replace, font family, highlight, space before and after, odd and even headers. Still open: split tall columns, lists and tables across pages; DOCX; Firefox and Safari checks. Decision 45, D37 to D39.
- 2026-10-28 — S-158 and S-160 done (columns block with resizable widths; A4 pages, flowing front matter and references, line-split long paragraphs, ruler). S-159 in progress (menus, line spacing, colour, page and header panels done; find and replace, highlight and font family not built). S-152 in progress: APA 7, Vancouver and AMA in-text and lists are real; MLA 9 and Chicago are not. Open: split tall columns, lists and tables across pages. Decision 44, D32 to D36.
- 2026-10-22 — S-161 done (toolbar revamp from the PLOS ONE sample). Tools needed to match that paper are in docs/research/plos-article-structure.md; the ones not yet possible are listed there.
- 2026-10-22 — Owner feedback on the editor: design for assembling (paste, clip, copy from NotebookLM or Zotero), not for long typing. S-155 (sidebar) done; S-151 (paste) moved first; added S-156 to S-160 (outline panel, import, two-column editing, Word-like functions, real pages). The feedback message was cut off after "The paper should look like an actual"; read as a printed paper, to confirm.
- 2026-10-22 — S-150 split into S-154 (editor core, done) and S-155 (sidebar, drag and drop, reorder, import). Design note done (docs/PAPER_EDITOR_DESIGN.md).
- 2026-10-22 — Added S-147 to S-153 (Paper Mode workspace). S-148 and S-149 done. The papers table takes migration 006, so the source-health tables (S-79) now take 007.
- 2026-10-21 — Added S-145 (check the paper features signed in; needs the owner) and S-146 (decision record, done). Account saves that are refused are now reported.
- 2026-10-21 — S-142 full editor done. Open in the paper group: nothing planned; next ideas are cross-references by number, a rich-text editor, and journal templates.
- 2026-10-21 — S-143 done (PDF export of the preview).
- 2026-10-21 — S-139 done (equations, figures, tables in the preview). Added KaTeX as a dependency.
- 2026-10-21 — S-137, S-138, S-140, S-141 and S-144 done; S-142 small version done (paste box "Save as my own text"). Left in the paper group: S-139 (equations, figures, tables), S-142 full editor, S-143 (PDF export). Not tried with a signed-in account.
- 2026-10-20 — Added S-128 (Paper writing) with S-129 to S-144. S-129 to S-133 done; S-134 to S-136 done (checklist, long-quote warning, privacy line); S-137 to S-144 not started. From the paper-preview research and the gap check (retracted sources, quote length, privacy, draft history, equations).
- 2026-10-18 — S-78 done (docs/SOURCE_HEALTH_DESIGN.md). Added S-126 and S-127, two defects it found.
- 2026-10-18 — Dropped S-45 (Google sign-in) and S-124 (Web Store) until you say so. Added S-125 (notification box, share messages, leave, faster Share dialog).
- 2026-10-18 — Tester round: added S-119 to S-124 (slow extension, token on sign-out, OCR on Vercel, upload progress, invite and Google reports, Web Store). Cerebras removed from the recommended AI providers.
- 2026-10-18 — S-72, S-74 and S-75 done; S-73 in progress (migration run, live two-account check left); S-76 is yours.
- 2026-10-18 — Added S-69 (Roadmap 2026-10) with S-70 to S-118: NECESSARY (phases 1 to 5) and EXTRA, each item tagged with Opus, Sonnet or Haiku and a size. Cross-references S-41 to S-65 without copying them.
- 2026-10-17 — Added S-68 (How it works guide), done.
- 2026-10-17 — Added S-66 (spatial canvas) and S-67 (canvas audit), done.
- 2026-10-16 — Added S-61 (get the extension to testers, top priority) with S-62 to S-65. Found while checking the tester flow: testers had no way to install the extension.
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
