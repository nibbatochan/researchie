# Version Changelog

## [v1.9.7] — 2026-10-16 (Notion token saved in the account)
### Added
- **Notion token kept on the server** (tester deployment). Settings -> Notion and the Export box now save the token once, encrypted (AES-256-GCM, bound to the user id) in the new `user_notion_tokens` table; they show "Saved: ••••1234" with Replace and Remove. The token is checked with Notion before it is saved (only a clear "rejected" stops the save). The browser never gets it back.
- The Notion export route uses the saved token when none is sent, for a browser session only; an extension token is refused so a leaked token cannot push a project into someone else's Notion.
- Migration `supabase/migrations/003_notion_token.sql`. Run once on the testers project before deploying.
- Local mode is unchanged: the token is still typed and kept in this browser.
- Tests: `tests/notion-token.test.mjs` (3).

## [v1.9.6] — 2026-10-16 (QR code for the authenticator app; PRD rewritten)
### Added
- **QR code** in Settings -> Account & Security when setting up the authenticator app. It is drawn in the browser from the otpauth address (`qrcode` package); the key stays below it for apps that cannot scan.

### Changed
- `docs/RESEARCH_TOOL_PRD.md` rewritten as version 2.0.0 to match what was built: built and planned features, the five phases with their status, pricing marked undecided, the real stack and the privacy rules in force.

## [v1.9.5] — 2026-10-16 (Switch account list)
### Added
- **Switch account** (tester deployment). The profile menu lists the other email addresses used to sign in on this browser. Picking one signs out and opens `/login?email=...` with the address filled in; the password is still typed. "Use another account" just signs out. An x forgets an address. Only the address is kept (localStorage, up to 6); no password, token or session. Local mode is unchanged.
- `src/lib/auth/knownAccounts.ts` and `tests/known-accounts.test.mjs` (8).

## [v1.9.4] — 2026-10-15 (Delete your own account)
### Added
- **Delete account** (tester deployment, Settings -> Account & Security). Needs an authenticator app: set it up once (secret shown, then a code to turn it on), then to delete type your password, a current code and DELETE. Deletes projects (with their clips and documents), then the profile (settings, extension tokens, AI keys, authenticator secret), then the login. Failed steps leave earlier steps done; the message says so.
- Migration `supabase/migrations/002_account_mfa.sql`: the `user_mfa` table. Run once on the testers project.
- Dependency: `otpauth`.

### Tests
- Unit: `tests/totp.test.mjs` (5). Routes are off in local mode (404); the live delete is not tested against Supabase yet.

## [v1.9.3] — 2026-10-15 (Extension 1.5.0: tester UI round, collapsed token box)
Extension 1.5.0. Reload it at `chrome://extensions` after pulling.

### Changed (extension)
- **Ask AI removed** from the text pill, the block dialog and the image and screenshot dialogs (the side panel has it). The in-page asker (`askPopover.js`) is deleted. The `selection` mode of the Q&A route stays, unused by the extension for now.
- **Text pill**: icons only, closer together, no divider lines or anything between them. The tag box no longer has an outline.
- **Set project** is the same everywhere (pill dots, block, image and screenshot dialogs, popup, side panel): a small "Set project" label, the chosen project under it, highlighted. The list has no scrollbar. Projects and sub-projects are drawn as on the platform: blue folder for a project; no icon and a guide line for a sub-project; blue border on the chosen one.
- **One dialog look** for block, image and screenshot (`createDialog` in `projectMenu.js`): same title, size line, Set project button, tag icon, Cancel and Send. The dialog is measured after it is drawn and kept fully inside the window, buttons included, also when the tag field opens or the window is resized. The project list is only as tall as the room on its side.
- **Link button** in the popup now confirms: the popup toast was throwing (it wrote into an element that did not exist), so nothing showed. Fixed, and the same message appears on the page.
- **Toolbar icon**: the pinned icon is the Researchie mark (blue square, white mark) at 16, 32, 48 and 128 px, and `action.default_icon` is set.
- Removed the dot beside "recent push" in the popup.
- Picking a project in the pill's Set project panel now confirms "Set to <project>" (it said "Sending to").
- **Side panel**: has the account connection now (link icon in the header, same token panel as the popup, status reads "Not connected" until a token is stored). Glyph icons (✕ ✦ 📌 ↗ ✓ ↳ 📁) are replaced by the same line icons as the header.

### Changed (platform)
- **Extension token** box is closed by default. Click "Extension token" to open it; "Copy token" sits beside the heading.

### Tests
- E2E `15` rewritten for the new panel and dialogs (10 cases incl. window-edge placement and the Link toast), `20` adds the side panel connect case (4).
## [v1.9.2] — 2026-10-15 (Extension: token-only connect, in-page Ask AI, smaller action panels)
Extension 1.4.0. Reload it at `chrome://extensions` after pulling.

### Changed
- **Connect with the token only.** The token now ends in the server's address (`rst_<secret>.<address>`), so the extension needs no server field. On a local server (no accounts) the web app hands out a keyless pairing token (`rst_local.<address>`). Profile menu in the web app shows the token again with Copy. The popup's main view no longer has a Connect section: a link icon next to the on/off switch opens a panel with one token box, "Connects to <host>", Connect and Disconnect. The token is checked against that server before it is kept. The extension only trusts https addresses, or http on this computer.
- **Not connected means not sent.** Sending a clip, listing projects, Ask AI and summaries with no token show "Not connected" with a Connect button. A clip taken while disconnected is held in the offline queue and sent when you connect. Before, a local server was used without a token.
- **Ask AI works on the page.** It opens a small card next to the selection (or block) with the selected text quoted, one question box and the answer. It answers from the selected text only and says "That isn't in the selected text." when the answer is not there. Q&A route got a `selection` mode for this. It no longer opens the side drawer.
- **Smaller action panels.** The three-dot panel on the text pill has two rows: Ask AI and Project. Project replaces the same box with a back arrow, "Change to" and the project list; sub-projects are lighter, smaller and indented with a connector, main projects bold with a filled folder. The block dialog is one row of icons (project, tag, Ask AI); the tag box appears only when the tag icon is pressed. Image and screenshot dialogs get the project and tag icons only. The panel flips up or to the right when it would run off the page.

### Tests
- E2E `15` rewritten for the new panels (9 cases incl. Ask AI answer and not-in-text, disconnected prompt), `17` connects first and adds a disconnected-hold case, new `20-extension-connect-token` (3). Unit: token origin helpers (`auth-tokens`).

## [v1.9.1] — 2026-10-15 (Tester follow-ups: invite code, model names, retries, keep-clips)
### Added
- **Invite code for sign-up.** Set `SIGNUP_INVITE_CODE` and the sign-up form asks for it; without the right code the server refuses (403) before it talks to Supabase. Eight wrong guesses lock an address out for 10 minutes (per server instance). Unset, sign-up stays open. `/api/auth/me` reports `inviteRequired`. Needs the variable set on Vercel and a redeploy.

### Fixed
- **Provider default models.** OpenRouter's default `openai/gpt-oss-120b:free` no longer exists; the default is now `openrouter/free`. Google's `gemini-2.5-flash` is only served to accounts that used it before, so new testers are given `gemini-3.8-flash` (Google's own compatibility example). Groq's fallback list no longer includes the preview-only `qwen/qwen3.8-27b` or the unlisted `allam-2-7b`. Checked against each provider's model list on 2026-10-15; an invalid model still shows as an error, and the Model box lets a user type another.
- **Duplicate clips on retry.** The extension gives each clip an id before its first try; if the server already has that id for the same user it returns the saved clip instead of making a second one.
- **Delete project, keep clips.** The old code fired the moves without waiting and the server ignored them, so the clips were deleted with the project. `DELETE /api/projects?id=X&moveTo=Y` now moves the clips and documents of the project and its sub-projects to Y first, then deletes them; a target that is not yours or is inside the deleted project is refused. The app picks the parent, another top-level project, or a new "Unfiled clips" project. Sub-projects are now deleted on the server too (they were left behind in Supabase). Local mode moves clips but not documents.
- `npm audit fix` (non-breaking only): 13 findings down to 12. The rest need major upgrades (Tailwind 4, Next 16) and are mostly in build tooling; left for later.

### Tests
- Unit: invite code, failure limiter, retry idempotency, keep-clips and family delete in the data layer (232 total). E2E: `19-delete-project-keep-clips` (3), and a gated case in `18-auth-gate` that needs a server started with `SIGNUP_INVITE_CODE`.

### Not done
- None of this has run on the live site yet: set `SIGNUP_INVITE_CODE`, redeploy, and try a tester sign-up. Provider defaults still need a real key per provider.

## [v1.9.0] — 2026-10-15 (Tester deployment: accounts, per-user data, your own AI key)
Everything below is switched on by `AUTH_REQUIRED=true`. With it off the app behaves as in v1.8.8. Setup and checks: `docs/TESTER_DEPLOYMENT.md`, `docs/TESTER_CHECKLIST.md`. Research behind the choices: `docs/research/auth-and-sharing.md`. Decisions 19 to 21.

### Added
- **Real accounts.** Sign-up, login and logout are server routes (`/api/auth/*`) using Supabase Auth, with the session in an httpOnly cookie. Email and password only; Google is a disabled "coming soon" button. No email confirmation needed. The demo user, the fake "local account" fallbacks and the instant-demo shortcut are gone on the tester site.
- **Per-user data.** `src/lib/data/cloud.ts`: projects, clips and documents live in Supabase, every query filtered by the signed-in user. New users get a starter project. All data routes require a signed-in user (`authorize()`); the Python graph route is switched off; `share/[id]` shows a project only to its owner.
- **Migration** `supabase/migrations/001_multi_user.sql` (not run for you): profiles linked to sign-ups, owner columns, `documents`, `user_settings`, `extension_tokens`, `user_ai_keys`, and row-level security on all of them. It also drops the three open "Public ... Access" policies that `schema.sql` created (they let the public anon key read and write every row; an earlier note here wrongly said RLS was missing) and deletes the three seeded demo projects.
- **Your own AI key.** Settings -> AI: choose Groq (recommended), Cerebras, OpenRouter or Google AI Studio, paste a key, Save and connect, Test connection, Remove key. Stored encrypted (AES-256-GCM, bound to the user). Used for Q&A, summaries and synthesis. A missing, rejected or exhausted key gives a message and a link, never a mock answer. Each provider shows its free limits and a data note; Google's free-tier warning is red.
- **Chrome extension connection.** Settings -> Account makes a token (shown once, only its hash stored, up to 5, revocable). The extension popup has a Connect section: server address and token, checked before saving. Requests carry the token as a bearer header (`extension/auth.js`). Extension 1.3.0.
- **Preferences in the account.** Settings, citation style, panel width, canvas layout, video player choice and export names are saved to `user_settings` instead of the browser. The Notion token is kept in memory only. Document caches are not written to the browser on the tester site.
- Tests: `tests/cloud-isolation.test.mjs` (user A cannot read, write or delete user B's data), `auth-tokens`, `ai-keys`, `public-url`; `e2e/18-auth-gate.spec.ts` (signed-out gate, 8 cases, runs when `AUTH_BASE_URL` points at an accounts-required server).

### Fixed
- Sign-in no longer succeeds with any password when Supabase errors; sign-out no longer returns on reload.
- `rebuild-context` no longer invents surrounding text when the page cannot be fetched (tester mode), and it will not fetch localhost or private addresses. OCR accepts only image data or public https images (tester mode).
- Extension toasts said "Sent to <project>" even when the clip was only queued; they now say what happened.
- The old "Groq key" field saved a secret to `localStorage` and was never used; it is removed and any saved value is deleted on load.

### Deployed 2026-10-15
- Live at `https://researchie-testers.vercel.app` (Vercel Hobby, project `researchie-testers`, uploaded with the CLI, not from GitHub). Supabase: a new testers project with `schema.sql` and `001_multi_user.sql` applied and checked (7 tables with RLS on, no open policies; an outsider's insert is refused). Email confirmation off.
- **Next.js 15.1.4 -> 15.5.28, React 19.3.1.** Vercel refused to deploy 15.1.4 as a vulnerable version. Type check, production build, the 74 e2e tests and the 8 signed-out gate tests (also run against the live site) pass.
- `.vercelignore` keeps `.claude`, tests, design assets and build output out of the upload.
- `npm audit` still reports 13 vulnerabilities (6 moderate, 7 high) in other packages; not looked at yet.

### Not done
- Sharing, invites and roles between accounts; delete account; a saved-accounts switcher; Google sign-in; per-user Notion token storage.
- The migration is run on the testers project, but signed-in use has not been checked by hand: sign-up, login, the cloud data routes, the AI key routes and the extension token. Covered so far by unit tests with a fake database and by the signed-out gate test; the signed-in paths are on `docs/TESTER_CHECKLIST.md`.
- Server-side OCR and PDF parsing on Vercel are untested.
- Sign-up is open to anyone who finds the address (SCOPE p27).

## [v1.8.8] — 2026-10-15 (Offline queue sends itself, and stops losing clips)
### Added
- **Automatic flush.** `extension/background.js` now owns the offline queue. It sends waiting clips on a `chrome.alarms` alarm every minute (on only while something retryable waits), at browser start, and on the `online` event. New permission: `alarms`. The side panel also asks for a flush when the page gets its `online` event, and its Sync button uses the same background code, so only one flush runs at a time.
- **Rejected clips are kept.** A 4xx answer (except 408 and 429) marks the clip `rejected` with `lastError`. The alarm skips it. The Sync button retries it.

### Fixed
- **The old flush deleted clips on any HTTP error.** It treated only a thrown `fetch` as failure, so a 400 or 500 response removed the clip from the queue as if it had synced. Now only an ok response counts as synced.
- **Queued clips had no project.** The project was added only on the success path, and the server rejects a clip without one. The project is now stored with the clip when it is taken, so a later project switch cannot misfile it.
- **A clip saved during a flush could be overwritten.** Queue changes now run one at a time and the flush re-reads the queue before writing.
- **Fake "Saved to offline queue" toasts.** The side panel's Save to Project and Page link, and the popup's page link, said they queued but only caught the error. They now save through the background, which queues. The popup and panel also no longer show "saved" for an error response.

### Tests
- `e2e/17-extension-offline-queue.spec.ts`, on the real extension's background worker with the real app: server down then back, 500 and 400 answers, Sync button retry, a clip saved during a flush. 3 of 3 pass.

### Not done
- The alarm firing on its own, a real network drop and the browser `online` event were not tested; the test calls the same flush function the alarm calls. Not run in a normal Chrome profile.
- If a save reaches the server but the reply is lost, the clip is sent twice. There is no duplicate check.
- The panel's queue count includes rejected clips and does not say which are rejected.

## [v1.8.7] — 2026-10-15 (Video embeds on link clips)
### Added
- **Inline video player.** A saved link that points at one video (YouTube, Vimeo, Dailymotion, Loom) shows a player on the clip card, in the feed view and the full view. `src/lib/video/embed.ts` turns watch, share, shorts, live and unlisted-Vimeo URLs into the provider's official embed URL. YouTube uses `youtube-nocookie.com`. Timestamps (`t=1m30s`, `start=`, `#t=`) become the start time. A YouTube playlist link gives a playlist player.
- **Player / Link toggle and Minimize** on the card. The choice is kept per clip in this browser (`localStorage`), so there is no database change.
- **Fallback.** If YouTube reports a private, removed or embed-disabled video, or the player has not loaded after 12 seconds, the card shows "This video can't play here" with an "Open the original" link. An "Open the original" link also sits under every player.
- **Safety and speed.** The iframe is sandboxed (scripts, same-origin, presentation and popups only; no forms, no top navigation) and mounts only when the card is within 200px of the screen.
- The saved URL is never changed. The embed URL is worked out at render time, so citations, exports and the share page still use the original link.
- Tests: `tests/video-embed.test.mjs` (8 unit tests: URL forms, timestamps, playlists, lookalike hosts, injected IDs) and `e2e/16-video-embed.spec.ts` (3 cases with the provider hosts stubbed). All pass.

### Not done
- Not checked against live YouTube or Vimeo, or in the real Chrome extension flow. The e2e uses stubbed hosts.
- Embed-disabled detection for Vimeo and the other providers relies on the 12-second timeout only.
- The Player / Link choice does not follow the user to another browser.
- Twitch, TikTok and X video are not supported.

## [v1.8.6] — 2026-10-15 (Project menu and Ask AI on every capture box)
### Added
- **Destination in the confirmation popups.** The DOM block, image and screenshot dialogs now show "Sends to <project>" above the Send button, with the same three-dot menu as the selection pill. "Change to…" lists every project and sets the active project, so the next send goes there. The row updates at once.
- **Ask AI in the menu.** The three-dot menu on the selection pill and on the three dialogs has an "Ask AI" item. It opens the Q&A drawer and never closes it (`window.__RESEARCHIE_OPEN_DRAWER__` in `qnaDrawer.js`).
- Shared code: `mountDestinationRow`, `installPageStyle` and `openAskAi` in `extension/projectMenu.js`. The dialogs sit in the page, not a shadow root, so the menu styles are added to the page head once.
- Tests: three new cases in `e2e/15-extension-project-menu.spec.ts` (block, image, screenshot) on the real extension. 4 of 4 pass.
### Not done
- Ask AI does not pass the selection or captured block to the drawer yet; it only opens it.
- Not checked in a normal Chrome profile on a real site.

---

## [v1.8.5] — 2026-10-15 (Pin atoms; switch project from the selection pill)
### Added
- **Pin atoms.** Each card has a pin icon in its icon row, next to Cite and Delete. Clicking it moves the card to the top of the feed, like a pinned chat; the newest pin sits first. The pin is stored as `metadata.pinnedAt`, so no database change is needed (`src/lib/atoms/pin.ts`, `PATCH /api/atoms` accepts `pinned`). The card moves at once and goes back if the save fails.
- **Pinned mode.** A pin icon in the feed header, next to the type filter, shows pinned atoms only. Click it again, or use the "pinned only" chip or "Reset all", to turn it off.
- **Switch project without the popup.** On the text selection pill, hovering Send shows a tooltip with the destination ("Send to Project / Sub-project"). A three-dot menu next to "+ Tag" has "Change to…", listing every project with sub-projects indented and the current one ticked. Choosing one sets the same active project the popup sets, so both stay in step. The menu is a shared module (`extension/projectMenu.js`, plus a `LIST_PROJECTS` message in `background.js`) that the block, image and screenshot capture boxes will reuse.
- Tests: `tests/pin.test.mjs` (6), `e2e/14-pin-atoms.spec.ts` (pin, reload, unpin, pinned-only mode), and `e2e/15-extension-project-menu.spec.ts`, which loads the real extension into a throwaway Chromium profile and checks the tooltip, the menu list and the change of project. 192 unit tests pass; tsc clean.
### Not done
- The same menu on the block, image and screenshot capture boxes, with the destination in their confirmation popup (`p2b`), and "Ask AI" in the menu (`p3`).
- Choosing a project in the menu changes the active project for later clips too; it does not send the selection.

---

## [v1.8.4] — 2026-10-15 (Page summaries that are real summaries; document clean-up)
### Fixed
- **"Summarize page" in the side panel never worked.** It called `/api/ai/page-summary`, a route that does not exist, and sent a message `background.js` does not handle, so it always showed "Page contains about N words". It now calls the real `/api/ai/summarize` route through `background.js`, and shows an honest "could not reach the AI service" message if that fails.
### Enhanced
- **The summary is written from the page, with no fixed template.** The old prompt forced four sections (summary, findings, metrics, implications), and the offline fallback made up generic "implications" text. The new prompt (`src/lib/ai/summaryPrompt.ts`) tells the model to use only the page text, add no facts, advice or implications the page does not state, and pick the shape the content calls for.
- **Four shapes, chosen with chips under the Summarize button:** Auto (shape follows the page), 3 bullets, Detailed, Tables (pulls tables and comparisons from the page, or says none were found). Pages longer than 15,000 characters are cut and the summary says so.
- **Offline fallback is honest.** With no model, the summary is the page's own first sentences, labelled as such. Nothing is written that the page does not contain. The popup shows the written summary as is.
- Checked live against Groq on the stored PLOS ONE paper: Auto gave prose, 3 bullets gave exactly 3, Tables gave two real tables (participants, manuscript dates). 9 new tests in `tests/summary-prompt.test.mjs`; 186 unit tests pass; tsc clean.
### Changed
- **Documents:** 13 documents were deleted at the owner's request. Kept: the PLOS ONE paper and "Just Enough Research". The 5 demo documents were also removed from the seed list in `src/lib/data/sampleDocuments.ts`, so they do not return. e2e 06 now asks its document questions of "Just Enough Research" (page 9, the Segway passage) and waits and retries when the free Groq tier answers busy. e2e 12 clicked "Resume Reading" the moment the card appeared, which did nothing once the library had one document; it now waits a moment first. Full e2e run: 62 pass.
### Not done
- The side panel flow (chips, summary, "+ Save to Project") has not been run in real Chrome. `scripts/testGroundingBaseline.cjs` still names the removed `doc-dots-openai-spec` document.

---

## [v1.8.3] — 2026-10-14 (Citations: report number, agency, web update date and place)
### Enhanced
- **Reports.** A Crossref report keeps its report number. Crossref has no report-number field: checked on 100 live report records, the number is in alternative-id (e.g. CMU-CS-03-214), so that is where it is read (DOIs and URLs in that list are ignored). Vancouver adds "Report No.: ..." after the year; APA adds "(Report No. ...)" after the title; BibTeX puts it in the number field. Two real DOIs (10.21236/ada461282, 10.36967/2297289) were run end to end through both styles.
- **Web pages.** The extension now reads the page's last-update date (article:modified_time, og:updated_time, last-modified). Vancouver shows it as "[updated 2025 Feb 9; cited 2026 Oct 14]". A place of publication is shown when the record has one.
- 10 new tests in tests/citations-report-web.test.mjs; 177 unit tests pass; tsc clean.
### Checked against sources
- **Vancouver:** NLM's Internet formats supplement has a technical-report example with the number after the date ("...1997 Sep [...]. Contract No.: ...") and web sites with "[updated ...; cited ...]". The "Report No.:" wording comes from Citing Medicine chapter 4 as summarised by search; the NCBI page sits behind a reCAPTCHA and was not read.
- **APA:** the APA Style site's report page gives "(Report No. NASA/CR-2018-220043)" right after the title, no period before it (search summary; the page would not render).
### Not done
- DataCite report numbers: 25 live DataCite reports (Zenodo) carry only an OAI identifier, no report number, so nothing is read.
- Nothing reads a web site's place of publication from the page, so the place only appears if the record already has one.
- The extension change (update-date capture) has not been run in real Chrome.

---

## [v1.8.2] — 2026-10-14 (Captured page HTML is cleaned on save)
### Security
- **Clipped block HTML is cleaned before it is saved or shown.** A block clip keeps the page’s HTML so it can be shown exactly. Nothing removed script or event handlers on the server, and the app inserts that HTML into the page. Every block is now cleaned on save (`src/lib/security/sanitizeBlockHtml.ts`, wired into `src/app/api/atoms/route.ts`): scripts, frames, forms, objects and every on* handler are removed; javascript:, vbscript: and data: links are removed; style attributes cannot load a URL; links open with noopener. Ordinary layout, tables, lists, classes and text are kept.
- Checked live: a hostile block posted to the running app was stored with every dangerous piece removed and the readable text kept; the test clip was deleted. `tests/sanitize-block.test.mjs` has 8 tests. 167 unit tests in total pass.
- Added dependency: `sanitize-html` (with `@types/sanitize-html`).

---

## [v1.8.1] — 2026-10-14 (PDF export: citations for uploaded files, no "Open exact passage")
### Fixed & Enhanced
- **Uploaded files show the paper's citation, not the file name.** A clip taken from an uploaded PDF used to print the app's own title, for example "journal.pone.0355849 (Page 1)", which means nothing to a reader. Now the report uses the paper's citation: the clip's own, or else the one saved on the document it came from (the Export dialog loads the uploaded documents to find it). The source line reads "Geng et al. (2026), PLoS One - p. 1", links to the paper's DOI, and the paper appears in the bibliography with its DOI. One author reads "Lee (2020)", two "Lee and Park (2020)", three or more "Lee et al. (2020)". With no citation, a real title is kept (without the "(Page N)" suffix); a file-style title becomes "Uploaded PDF" or "Uploaded document".
- **"Open exact passage" removed.** The source name now carries that link: it opens the exact passage when the clip has one, else the page.
- **Links and new tabs.** A PDF file cannot tell the viewer to open a link in a new tab; the viewer decides, and Chrome, Edge and Firefox open it in the same tab on a plain click. The report now says so on the contents page and in the colour key: hold Ctrl (Cmd on a Mac) while clicking a link to open it in a new tab.
- `package.json` version is now 1.8.1, matching this log.
- Tests: 159 unit tests (new builder tests for uploaded-file clips) and `e2e/13` checks all three changes in a real download. Checked on the real "Manual Test Run: 8 Cases" project: no raw file names, no "Open exact passage", the DOI is in the bibliography.

### Known Issues & Open Work
- A clip from an uploaded PDF whose document has no saved citation prints "Uploaded PDF - p. N". Add a citation on the document (Upload PDF, then the citation icon) to get the full source line.
- A clip taken from a deleted document keeps only what it carries itself.

---

## [v1.8.0] — 2026-10-14 (PDF research report export)
### Added & Enhanced
- **PDF export.** A new **PDF** tab in the Export dialog saves a real `.pdf` file of a project: cover, clickable contents, then the clips as cards (syntheses and notes, quotes, web blocks and tables, images with OCR text, links), a numbered bibliography, and a colour key. Every page after the cover has a running header and "Page n of N". Works for the whole project or only the selected clips.
- **Options in the dialog:** which sections to include (with their counts), citation style (Vancouver, APA 7 or AMA 11; starts from the style last chosen in the citation box), your notes, images, and verification flags. A summary shows clips, sources and flagged clips before you download.
- **Each clip card** shows its type tag, title, text, source line (site, page, date), a `[n]` marker linking to the bibliography, tags, your notes, flags (retracted, verify source, could not be checked), and the source name links to the exact passage when the clip has one.
- **Design system.** White page, White 90 cards, White 70 borders; JetBrains Mono for headings, citations, DOIs and dates, Figtree for reading text. Each semantic colour has one job: Royal Blue for section rules, Citation Blue for every link, AI Purple for AI notes, Sky for web blocks, Green for verified, Amber for retracted or verify, Red for could not be checked. Sky, green and amber fail the 4.5 contrast minimum as small text on white (4.1, 3.8, 3.2), so they colour shapes (side bars, dots) and the words beside them stay in ink.
- **Characters are never dropped silently.** Greek letters, math signs, arrows, sub and superscripts, accented letters and Cyrillic draw through a fallback font (DejaVu Sans); special hyphens become plain hyphens. Characters no font here has (for example Chinese) show as a visible mark, and the dialog lists them before you download.
- **Built with:** `@react-pdf/renderer` (loaded only when you export), fonts in `public/fonts` (Figtree and JetBrains Mono, SIL OFL; DejaVu Sans, its own free licence), the report data builder `src/lib/export/pdf/pdfReport.ts`, and the drawing code `ReportDocument.ts`.
- **Tests:** 154 unit tests (new: `pdf-report`, `pdf-render`, `pdf-glyphs`) and `e2e/13-pdf-export.spec.ts`, which downloads a real PDF and reads it back (sections, citations in two styles, flags, notes, symbols, switched-off sections).

### Known Issues & Open Work
- The contents page has clickable links but no page numbers.
- Bibliography entries are numbered in order of first citation for every style. APA normally uses an alphabetical list and author-date citations; that is not done.
- An image from another website is skipped if the browser cannot load it without cross-site permission. Images saved inside Researchie are fine.
- Chinese, Japanese, Korean and other scripts DejaVu lacks print as a replacement mark.
- Large reports with images are big: the 77-clip "Artificial Intelligence & RAG" project makes a 69-page PDF of about 4 MB in about 18 seconds. Turn images off for a smaller file.

---

## [v1.7.10] — 2026-10-13 (Test clean-up and housekeeping)
### Fixed & Enhanced
- **Browser tests clean up their clips.** `e2e/07`, `e2e/08` and `e2e/10` save clips by hand in the "Artificial Intelligence & RAG" project and left a copy behind on every run (22 reader clips had piled up). A new helper, `e2e/helpers/cleanup.ts`, deletes the reader clips saved since each suite started and never touches older ones. Checked: with the cleanup off one test adds 2 clips (22 to 24); with it on, 20 passing tests leave the count unchanged. `KEEP_TEST_CLIPS=1` turns the cleanup off when you want to inspect a run.
- **Stopped tracking the local Cognee graph files** (`.cognee-graph-*.json`), as with the documents store. They stay on disk and are in `.gitignore`.
- **`package.json` version** is now 1.7.9 (it said 1.2.0).
- Already done earlier, no change needed: `InlineClipInserter.tsx` and `lib/cn.ts` were deleted in the 2026-10-09 clean-up, and `lucide-react` was replaced by Phosphor and removed from `package.json`. `SCOPE.md` listed these as open by mistake.
- Deleted the local backup branch `backup/pre-scrub-2026-10-13` (it held the old history with the revoked key).

- **Deleted the 15 older duplicate test clips** (5 each of "Brief books for people who make websites", "Foreword by Jeffrey Zeldman" and "No") from "Artificial Intelligence & RAG", with the owner's yes. The 7 remaining reader clips are the owner's own.

---

## [v1.7.9] — 2026-10-13 (Extension Undo fix)
### Fixed
- **Undo on the clip toast went to the wrong port.** After a clip, the in-page toast offers "Undo (5s)". `content.js`, `blockPicker.js` and `cropper.js` sent the delete to `http://localhost:3000`, but the app runs on 3001, and a web page's CORS rules would also block the call. The toast then vanished and the clip stayed in the timeline. The three scripts now send a `DELETE_ATOM` message to the background script, which already finds the real server address (`getWorkingApiBase`) and is not limited by CORS. If the delete fails, the toast now says "Could not undo. Delete it from the timeline." instead of disappearing.
- Syntax-checked with `node --check`, then **verified live in Chrome on 2026-10-13**: Undo removed the clip. The same live test confirmed the extension captures the page DOI and title from a real PLoS ONE article and the citation resolves to "verified doi" with no typing.

---

## [v1.7.8] — 2026-10-13 (Stable browser tests)
### Fixed
- **`e2e/07` and `e2e/08` no longer flake.** They failed 4 to 11 times out of 14 from run to run. Cause: they never chose a project and clicked "Resume Reading" on whichever document the app listed first (documents are shown per project, newest first), and they checked for the button without waiting for it. So some runs opened a one-page placeholder PDF or no PDF. They now call one shared helper, `e2e/helpers/open-reader.ts`, that picks the project and the document by name and waits for each step (the same steps `e2e/09` and `e2e/10` already used, which never flaked).
- **Result:** 14 of 14 on the first run and 28 of 28 over two repeats (was 9 of 14).
- `e2e/03` "switches to Spatial Canvas mode" failed once in about 13 runs because the canvas took longer than the 5-second default to draw; it now waits up to 20 seconds. Passes 4 of 4 and 12 of 12 over three repeats.
- Not run in this check: `e2e/06`, which calls live Groq and asserts the model's exact wording.

---

## [v1.7.7] — 2026-10-13 (AMA style, PDF mismatch warning)
### Added & Enhanced
- **AMA 11th edition** (`ama.ts`) with an AMA tab beside Vancouver and APA. Verified against the JAMA "Instructions for Authors" reference section (JAMA is AMA's journal): journal article (`Authors. Title. Journal. 2026;335(3):255–266. doi:...`), web page (`Organisation. Title. URL. Accessed January 30, 2012.`), and the author rule (all authors up to 6; if more than 6, the first 3 then "et al"). Preprints, datasets, book chapters and reports have no example on that page, so they return nothing and fall back to the plain line. Plain text, no italics. The online-first "[published online ...]" form is not done.
- **PDF DOI mismatch is now a warning.** When a DOI found in an uploaded PDF points to a different paper than the PDF's own title, the document citation is still saved but shows "This might not be the source. Please verify." (reason: "The DOI found in this PDF points to a different title than the PDF."). A DOI that matches is chosen first and shows no warning. No "Save anyway" step for PDFs.
- **Junk PDF titles are ignored:** metadata titles that are tool leftovers ("Microsoft Word - draft.docx", "untitled", file names, "PII: S0140-...", ids) count as no title, so they cannot cause a false warning (`isUsablePdfTitle`).
- Tests: 123 unit tests (new `tests/citations-ama.test.mjs`), new `e2e/12-pdf-doi-mismatch.spec.ts`, AMA check added to `e2e/11`.

### Fixed
- **PDF title was never read.** The upload read `info.title`, but pdf.js names the field `Title`, so the PDF's title was always empty and no mismatch check (not even a note) ever ran. It now reads `Title`.

### Known Issues & Open Work
- The mismatch check uses the PDF's metadata title only, not the file name. A PDF with no usable metadata title gets no mismatch check.
- AMA has no preprint, dataset, chapter or report form (no primary example found).
- Not tested: an upload with 2 or 3 DOIs where one matches (unchanged code), and the header tooltip in the browser.

---

## [v1.7.6] — 2026-10-13 (Save anyway)
### Added & Enhanced
- **Save anyway on the mismatch screen.** When a DOI, PMID or title the user entered points to a different paper than the clip, the warning screen now has "Save anyway" beside Back. Nothing is saved until the user chooses it. The record is then saved with its warning, so the citation box keeps saying "This might not be the source. Please verify." Back still returns to the saved citation without changing it.
- Decision recorded: the user chose to allow saving a mismatched source on purpose. The decision about showing the warning for an automatic PDF DOI mismatch is still open.
- `e2e/11` covers it (lookup mocked): not saved before the click, saved with the warning after.
- `.gitignore` now lists `.documents-store.json` and `.cognee-graph-*.json`, as CLAUDE.md asks. `.documents-store.json` is already tracked, so Git still shows it as modified until it is removed from the index (`git rm --cached`).

---

## [v1.7.5] — 2026-10-13 (NLM web page format)
### Added & Enhanced
- **Web pages in Vancouver:** a web page now gets the NLM "part of a Web site" line: `Site [Internet]. Page title; year [cited 2026 Oct 13]. Available from: URL`. The site name is the page's site, or its host name when none is known. The plain fallback line is kept only for unknown source types.
- The rule comes from NLM Citing Medicine, chapter 25 (Web Sites), read from the NCBI Bookshelf. The site's place of publication and the page's update date are not captured, so they are left out. The page author is not listed, because NLM puts an author only in the site element.
- 116 unit tests.

---

## [v1.7.4] — 2026-10-13 (Clearer citation copy controls)
### Fixed & Enhanced
- **Copy controls moved to the status line.** The row of "Copy / APA / BibTeX / RIS" text links sat beside the citation with no sign of which was chosen or what would be copied. Now the style tabs (Vancouver, APA, BibTeX, RIS) and one Copy button sit on the "verified doi" line in the clip citation box and the PDF citation popover.
- **The chosen style is clear:** the selected tab is filled blue and marked `aria-pressed`. The choice is kept in the browser for the next card.
- **The citation box shows what Copy copies:** the text in the chosen style appears in the box (monospace for BibTeX and RIS), with a note that Copy puts exactly this text on the clipboard.
- **Copied is obvious:** the button turns green with a check and says "Copied" for 2.5 seconds, and resets if the style changes. If the browser blocks the clipboard, a hidden-textarea fallback is tried first; if that fails the button turns amber and says "Couldn't copy".
- New shared component `CitationStyleBar.tsx`; `e2e/11` checks the tabs, the preview, the Copied state, the clipboard text and that the style is remembered.

---

## [v1.7.3] — 2026-10-12 (Retraction warning, APA 7)
### Added & Enhanced
- **Retraction is an amber warning.** A retracted paper shows its own amber box, "This paper has been retracted. Do not cite it as valid evidence.", in the clip citation box and the PDF citation popover. It is separate from the "might not be the source" warning, and the old gray note is gone.
- **APA 7** (`apa.ts`): journal articles, edited book chapters, reports, preprints, data sets and web pages. Patterns come from the APA "Common Reference Examples" handout, and the unit tests use its worked examples. A new **APA** button sits beside Copy, BibTeX and RIS.
  - No author: the title moves to the author position. No date: "(n.d.)" plus a "Retrieved ..." date when known.
  - Plain text has no italics, so journal names and book titles are not italicised.
  - Titles are not converted to sentence case; they keep the source's own case.
  - More than 20 authors: first 19, ". . .", last. This rule is from the Publication Manual, not the handout.
- **Tests:** 115 unit tests (new `tests/citations-apa.test.mjs`), `e2e/11` covers copy buttons and the retraction box.

### Known Issues & Open Work
- AMA is still unverified (its manual pages did not load). The NLM web page format is unverified, so web pages keep the plain format in Vancouver.
- The Copy menu has no style picker for the main line yet; "Copy" is Vancouver, "APA" is APA.

---

## [v1.7.2] — 2026-10-12 (More citation styles, BibTeX/RIS, exports, retraction fix)
### Added & Enhanced
- **Vancouver for more source types** (`vancouver.ts`), following the NLM Samples of Formatted References:
  - Preprint: `Authors. Title. Server [Preprint]. Year [cited 2026 Oct 12]. Available from: https://doi.org/...`
  - Dataset: `Authors. Title [dataset]. Year [cited ...]. Repository. Available from: ...`
  - Book chapter: `Authors. Title. In: Editors, editors. Book. Place: Publisher; Year. p. pages.` Place and editors are left out when the source gives none.
  - Report: `Authors. Title. Place: Publisher; Year.` (simplified; NLM's agency and report-number elements are not captured yet).
  - Web pages and unknown sources still use the plain format.
  - The Crossref mapper now keeps editors, publisher place and a preprint's server name (`institution`).
- **BibTeX and RIS** (`export.ts`): Copy, BibTeX and RIS buttons in the clip citation box and the PDF citation popover. Special characters are escaped, page ranges use `--`, missing fields are left out.
- **Citations in exports:** Obsidian clip notes get a `doi` frontmatter line and a "Citation" section; Notion blocks and Notion Markdown get a "Citation:" line under quotes and captured blocks.
- **Tests:** 108 unit tests (new `tests/citations-formats.test.mjs`), new `e2e/11-citation-copy.spec.ts`.

### Fixed
- **Retraction missed on the DOI path:** Crossref lists a retraction on the original paper under `updated-by`, but only `update-to` was read, so a retracted paper looked normal. Found by a live check on the retracted 1998 Lancet paper (PMID 9500320); the PMID path already worked. Both now report retracted.

### Known Issues & Open Work
- NLM rules for web pages, the full report form and datasets with versions are not verified. APA and AMA are still unverified (their primary pages did not load).
- A retraction is shown as a gray note ("A retraction notice was found."), not a warning. Whether it should be louder is open.
- The extension capture is not tested as a live Chrome clip. That needs the unpacked extension loaded in Chrome.

---

## [v1.7.1] — 2026-10-12 (Document Assistant UI fixes)
### Fixed & Enhanced
- **Link icons per sentence:** each icon now ends the sentence it supports. Sentences before a cited one stay in its block; sentences with no support have no icon. Page markers and abbreviations ("et al.", "Fig.") never split a sentence (`buildAnswerLinks` returns `segments`).
- **One scroll per click:** the old code scrolled from three places. A citation click now jumps to the page at once and makes a single smooth scroll to the quote. The page observer no longer scrolls back after a scroll it caused, and the quote scroll runs once per quote.
- **Click away clears:** a click anywhere except a citation icon or a saved-clip row clears the highlight.
- **One saved highlight at a time:** only the selected saved clip is drawn on the pages; the sidebar list still shows all. A new clip is selected when saved. The sidebar buttons no longer scroll twice.
- **Resizable assistant panel:** drag the left edge (260 to 720 px). The width is kept in the browser.
- **Optional local model:** `AI_PROVIDER=ollama` (with `OLLAMA_MODEL`, default `qwen2.5:7b`) sends Q&A to a local Ollama server. Off by default.
- **Tests:** 95 unit tests; new `e2e/10-assistant-ui.spec.ts` (6 tests, mocked answers); `e2e/09` still passes 5 of 5.

### Known Issues
- `e2e/07` and `e2e/08` depend on which document was opened last and fail in different numbers from run to run (4 to 11 of 14), also on the previous commit.
- Local models are weaker: `qwen2.5:7b` passed 11 of 18 test questions and `deepseek-r1` 1 of 18. Groq remains the model to use. The final Groq settings still need a live re-run once the daily allowance returns.

---

## [v1.7.0] — 2026-10-12 (Citation Engine, Verified Document Q&A & PDF Extraction Fix)
### Added & Enhanced
- **Citation engine (`src/lib/citations/`):**
  - **Lookups:** DOI goes to Crossref, then the DOI agency (`doi.org/doiRA`), then DataCite. PMID goes to PubMed `esummary`, then `efetch` for a retraction check. One rate limiter per host, two retries with backoff on 429 and 503, and a cap of 10 lookups per request. Routes: `POST /api/citations/resolve` and `POST /api/citations/search`.
  - **Title search:** Crossref bibliographic search returns up to five matches, labelled journal article or preprint. The user picks one.
  - **Formatter:** Vancouver (ICMJE) for journal articles, six authors then "et al.". Web pages and unknown sources get a plain line. Preprints, datasets and book chapters show "style not yet supported".
  - **Records:** status, source type, `warnings`, `notes` and `enteredByUser`, stored as `metadata.citation` on atoms (`PATCH /api/atoms`) and as `citation` on documents (`POST /api/documents`). No schema migration.
  - **Page facts line:** every citation shows `Page · Author · Date`, with "not shown" for anything missing (`facts.ts`).
- **Extension (`extension/content.js`):** text clips and page links store `metadata.pageIdentifiers` (DOI and PMID from `citation_*` and Dublin Core tags, bibliography tags ignored) and `metadata.pageInfo` (title, site, author, date, URL).
- **Clip citation box (`AtomCard.tsx`):**
  - Book icon opens the citation. A refresh and close pill appears in the icon row.
  - One box takes a DOI, a PMID or a paper title. "Cite this web page instead" builds a web citation with no lookup.
  - Back appears only inside sub-views. A DOI, PMID or title the user entered that points to a different title is a failed verify: it is not saved, and the warning screen offers Back to the saved citation. Refresh reopens the search box.
  - Web pages from a known URL show "Web page", never "Incomplete". Older web citations are rebuilt for display.
- **PDF citations (`PDFReaderView.tsx`):** DOIs are read from the PDF metadata and first page and checked against the PDF title. With no DOI, a compact form asks for title, author, year and type, and saves only on "Save citation". A citation icon next to Upload PDF opens a panel with the citation and a Copy button.
- **Document Q&A:**
  - Passage chunking with offsets, relevance retrieval of about 14,000 characters, and an abstract and explicit-page mode (`src/lib/ai/passages.ts`).
  - Quotes are verified against their page and returned with page and offsets. Link icons come only from verified citations. The model's own page markers are removed.
  - Empty state is one sentence. The chat scrolls to each new question and answer.
  - Saving an answer to the project keeps the clean text, the first verified page and quote, and the PDF's citation.
  - The "Jump to Page" button and "Related" chips are gone.
- **Tests:** 92 unit tests across `tests/citations*.test.mjs`, `claim-support`, `passages` and `answer-links`. New Playwright spec `e2e/09-citation-links.spec.ts` (5 tests, mocked answers). `e2e/07` Req 8 and 9 now uses the link icon.
- **Docs:** `docs/CITATION_API_RESEARCH.md` (API and style-guide notes, with live checks) and `docs/manual-test/citation-test-data.md`.

### Fixed
- **PDF extraction:** `/api/documents/parse` crashed on every request, so uploads saved a placeholder page. Fixed with `serverExternalPackages: ['pdf-parse']`.
- **Wrong "not found" answers:** the route attached the best-scoring sentence as a citation, the model received the whole paper, and Groq's per-request limit rejected it before a local engine answered "not found". Now only verified citations are returned, and a failure returns a "busy" message.
- **False "This might not be the source" warnings:** correct answers were flagged for four matching reasons (quote stitched with "...", a quietly skipped sentence, a hidden accent in "K̂n", a word hyphenated across a line break). One rule now covers all four.
- **Retry dropped the page asked about:** the size retry cut the end of the context. It now re-selects half as many of the most relevant passages. A "not found" from a fallback model is reported as busy. The small 7B model is skipped.
- **Library delete:** the confirmation window was drawn only in the reader screen, so the trash button in the library did nothing and the window appeared after opening a document. It is now drawn in both screens.
- **Upload PDF** opens the file picker first. The upload window appears after a file is chosen and no longer shows the previous document's details.
- **Atom card crash** on citations saved before the warnings and notes split.

### Known Issues & Open Work
- Preprint, dataset and book chapter citations have no formatted line. APA and AMA rules are unverified.
- The PubMed retraction check has not been tested on a real retracted paper.
- The extension capture was checked on real pages in the browser pane, not as a live Chrome clip.
- Document Assistant: link icons are not placed per sentence, the PDF can scroll more than once per click, a highlight is not cleared by clicking elsewhere, a saved highlight cannot be selected one at a time, and the panel cannot be resized. Not started.
- Groq's free tier (200,000 tokens per day and about 8,000 per minute per model) was used up by testing, so the latest Q&A settings were checked by unit tests only.
- `e2e/08` has six failures that probably come from the "most recently viewed" document no longer being the 163-page fixture. `e2e/07` Req 6 failed before this work. `e2e/06` test 2A asserts the model's exact wording.
- `.documents-store.json` is a tracked local data store and is modified by test uploads. It is not committed.
- A stale `package.json` version (1.2.0) is not aligned with this log.

---

## [v1.6.0] — 2026-09-30 (Direct Notion & Obsidian Sync Engine)
### Added & Enhanced
- **Obsidian Knowledge Graph & Vault Engine (`obsidian.ts` & `ExportProjectModal.tsx`):**
  - **YAML Frontmatter & Metadata:** Full project frontmatter indexing titles, aliases, tags, creation dates, clip counts, and source references.
  - **Obsidian Callout Formatting:** Quotes formatted with `> [!quote]`, syntheses/notes with `> [!note]+`, abstract context with `> [!abstract]`, DOM blocks with `> [!example]`, and images with OCR callouts.
  - **Interactive Wikilinks:** Generates dynamic `[[wikilinks]]` linking quotes, project headers, sources, and categories into a navigable knowledge graph.
  - **Multi-File ZIP Vault Generation (`JSZip`):** 1-click generation and download of complete Obsidian Vault structure (`ProjectName.md` index, `Clips/` atom notes, `Sources/` bibliographies, and `.obsidian/app.json` configuration).
  - **Native Obsidian Deep Link:** 1-click "Open in Obsidian" action leveraging `obsidian://new?vault=...&name=...&content=...`.
- **Direct Notion Sync Engine (`notion.ts`, `/api/export/notion`, & `ExportProjectModal.tsx`):**
  - **Direct API Push Endpoint (`POST /api/export/notion`):** Pushes projects and all associated atoms into a target Notion Page or Database using Notion Integration tokens.
  - **Native Markdown-to-Notion Block & RichText Parser:** Converts raw markdown syntax (`### Headings`, `- Lists`, `**bold**`, `*italic*`, `` `code` ``, `> Quotes`) into real, native Notion blocks and text annotations rather than raw plain text markdown.
  - **Strict URL & Deep Link Sanitizer:** Ensures all citation URLs, bookmarks, and deep links conform strictly to Notion's API URL specifications.
  - **Hierarchical Block Transformer:** Translates research atoms into native Notion API blocks (Heading 1/2/3, Callouts with emojis, Quotes, Code snippets, Bookmarks, and Bulleted lists) with automatic 100-block chunking.
  - **Notion-Optimized Clipboard Exporter:** Instant 1-click formatted copy tailored for native Notion markdown paste.
  - **Persistent Settings:** Secure local caching of Notion integration tokens and parent page targets in `localStorage`.

---

## [v1.5.0] — 2026-09-30 (PDF Reader Engine, Document Vault, Auto-OCR, Precision Selection & Spatial Canvas)
### Added & Enhanced
- **PDF Reader & Knowledge Vault (`PDFReaderView.tsx` & `CustomPDFViewer.tsx`):**
  - **Official PDF.js TextLayer Integration:** Integrated `--scale-factor` and `--total-scale-factor` calculations with strict CSS glyph-metric bounds, eliminating multi-column selection overshoot and bleeding into adjacent sections.
  - **Document Vault & Library Skeleton:** Replaced blank/empty loading transitions with rich shimmer card skeletons for both Library and Reader views when switching sub-projects.
  - **Static & Aligned Highlights:** Completely removed pulsing animations from saved clips; added pixel-aligned border boundaries (`-webkit-box-decoration-break: clone`).
  - **Streamlined Selection Toolbar:** Floating selection pill displays only "Save Clip" with page number badge (`p. X`).
  - **Clean Clipboard Handling:** Sanitized selection text interceptor preventing phantom whitespace or DOM metadata on copy.
- **Automated Tesseract OCR Engine (`ocrService.ts` & `ImageAtomCard.tsx`):**
  - Instant background OCR triggered on any imported image or screen crop with extracted text stored in atom content.
  - OCR text is fully searchable across the platform with keyword match highlighting and detailed mode auto-expansion.
- **Workspace Navigation & State Continuity:**
  - Preserves active workspace mode (Feed / Canvas / Documents) when toggling between projects and sub-projects.
  - Streamlined extension sidepanel and popup with complete shortcut key list (<kbd>Alt+S</kbd>, <kbd>Alt+L</kbd>, <kbd>Alt+I</kbd>, <kbd>Alt+B</kbd>, <kbd>Alt+C</kbd>, <kbd>Alt+P</kbd>).

---

## [v1.4.0] — 2026-09-27 (Chrome Native Side Panel & Web Context Re-Builder)
### Added & Enhanced
- **Native Chrome Side Panel (`chrome.sidePanel`):**
  - Integrated persistent Chrome Side Panel (launched via `Alt+P` or popup header button) featuring **Live Feed**, **Page AI Interrogation**, **In-Browser Synthesis**, and **Quick Capture Hub**.
  - Enabled active tab text extraction, 1-click quote saving from AI briefs, and real-time synchronization with the local web API.
- **Context Re-Builder in Web Timeline (`AtomCard`):**
  - Built an accordion view for quote cards showing the surrounding preceding and following paragraphs cached from the original source.
  - Added smart context extraction in `extension/content.js` (`contextPrefix`, `contextSuffix`, `surroundingParagraphs`).
- **DOM Block Picker Tree Traversal (`blockPicker.js`):**
  - Enabled `ArrowUp` (select parent container) and `ArrowDown` (select child element) keyboard navigation during DOM element inspection (`Alt+B`).
- **Typography Alignment:**
  - Standardized font across extension UI, content scripts, and side panel to `Figtree` and `-apple-system`.

---

## [v1.3.0] — 2026-09-27 (Phase 3 AI Suite, Docked Split Assistant, Citations & Theme Refinement)
### Added & Enhanced
- **Docked Side-by-Side AI Assistant (`ResearchieAISidebar`):**
  - Designed a collapsible ~380px sidebar that dynamically shifts and shrinks the knowledge timeline to the left so users can view research clips and the assistant simultaneously.
  - **Ask AI:** Grounded conversational Q&A using semantic search, bottom-line key findings, and verbatim citation source links.
  - **Summarize & Synthesize:** Pre-configured synthesis templates (PRD / Spec Draft, Comparative Matrix, Executive Memo, Key Findings) with 1-click timeline card multi-selection.
- **Round Floating Action Button (FAB):**
  - Built a floating round launcher with the official two-path `researchie-ai-logo.svg` icon and a fast-access hover menu for *Ask AI* and *Summarize*.
- **Semantic Vector Search Engine (`/api/atoms/search`):**
  - Implemented 768-dimensional normalized dense vector projections with in-memory cosine similarity and lexical token weighting.
- **Citations & Bibliography Export Suite (`ExportProjectModal`):**
  - Added export formats for **Markdown (`.md`)**, **Citations (Markdown / APA standard / BibTeX `.bib`)**, and **Raw JSON**.
- **Design System & Typography Polish:**
  - Removed `Plus Jakarta Sans` and restored clean `Figtree` and system typography.
  - Subdued brand blue to purposeful accents (`#325FEC` / `#518FFF`), backed by deep neutral blacks (`#09090B`, `#121214`, `#18181B`, `#27272A`, `#FAFAFA`).
  - Scaled atom card padding to `p-6 md:p-7` with refined font hierarchy and neutral tag badges.

---

## [v1.2.4] — 2026-09-26 (Tag Focus Fix, Optional Field Labels & Localhost Recovery)
### Fixed & Improved
- **Text Selection Tag Form Stability:** Resolved selection event collision where clicking `# Tag` or the input collapsed selection and dismissed the pill; added `isTagFormOpen` state guard and container event isolation.
- **Universal "Optional" Placeholders:** Updated all tag input placeholders across text selection, image capture, screenshot cropping, DOM block picking, popup Page Brief, Q&A, and Platform Workbench to explicitly display `(optional)`.
- **Toast Cleanliness:** Removed tag UI from in-situ toasts so tagging happens strictly at the point of clicking.
- **Dev Server Recovery:** Restarted Next.js dev server on port 3000 resolving document cache collision from build process.

---

## [v1.2.3] — 2026-09-26 (Structured Executive Briefs & Universal Clip Tagging)
### Added
- **Universal Clip Tagging System:**
  - **Text Selection:** Added interactive `#` button on floating selection pill to tag quotes before send (`#pricing`, `#latency`), plus inline `+ #tag` badge in the 3-second toast for instant post-send tagging.
  - **Screen Area & Screenshots:** Added tag/title input field in screenshot confirmation dialog (`#pricing-table`, `Hero`).
  - **Web Image Selection:** Added confirmation modal with image preview and tag/name input field before submitting images to project.
  - **DOM Block Selection:** Added confirmation modal with tag info and label/tag input field before saving DOM containers.
  - **Page Brief & Q&A:** Added tag inputs to Page Brief and Q&A popup sections.
  - **Platform Workbench:** Rendered interactive `#tag` pills on all `AtomCard` components with 1-click `+ tag` inline editor and delete support via new `PATCH /api/atoms` endpoint.
- **Deep Executive Page Brief Engine:**
  - Replaced 3-bullet slice with structured multi-section brief containing **Executive Overview**, **Core Findings & Arguments**, **Key Metrics & Evidence**, and **Strategic Implications**.
  - Upgraded both `MockAIAdapter` and `GatewayAIAdapter` to extract grounded data points, percentages, dollar figures, and technical metrics from page text.

---

## [v1.2.2] — 2026-09-26 (Icon Polish, 4 Shortcuts & Selection Reliability)
### Fixed & Improved
- **Text Selection Send Icon:** Fixed coordinate calculations by targeting the last selected line's bounding client rect; attached window capture-phase listener so webpage scripts cannot suppress selection detection.
- **Plugin Icon Overhaul:** Replaced distorted SVG paths with crisp, high-precision vector icons across all 4 modes (Quotes for Text, Code tags for Block, Frame for Image, Crosshair Crop for Shot).
- **Popup Footer Reorganization:** Displayed all 4 mode shortcuts in a compact single line (`Alt+S text • Alt+B block • Alt+I image • Alt+C shot`) and relocated the Workbench link directly below it as a full-width action button.
- **All 4 Shortcuts Verified:** Wired `Alt+S`, `Alt+B`, `Alt+I`, and `Alt+C` across `manifest.json` commands, background worker, and in-page keyboard listeners.

---

## [v1.2.1] — 2026-09-26 (Phase 2 Bugfix & UX Refinement)
### Fixed
- **Duplicate Ingestion Multiplier:** Added strict singleton execution guards (`__RESEARCHIE_CROPPER_INJECTED__`, `__RESEARCHIE_BLOCK_PICKER_INJECTED__`) preventing multiple event listeners from submitting 5x duplicate atoms.
- **Screenshot Mode Hang:** Enhanced canvas teardown and event listener disposal so taking or canceling a screenshot promptly exits the cropper mode.
- **Live Undo Countdown:** Replaced static label with dynamic 1-second interval timer `Undo (3s)` → `Undo (2s)` → `Undo (1s)` across all in-situ toasts.
- **Block Preview Fidelity:** Injected `<base>` tags and resolved absolute stylesheet URLs to ensure captured DOM tables and grids render with identical styles.
- **Anti-AI-Slop Clean Pass:** Eliminated extraneous pulsing dots (`animate-ping`), tightened vertical paddings across Navbar (`h-12`), Sidebar (`w-64`), Timeline toolbar, and Atom Cards.

---

## [v1.2.0] — 2026-09-26 (Phase 2 MVP)
### Added
- **Visual DOM Block Picker** (<kbd>Alt+B</kbd>) with `<kbd>↑</kbd>`/`<kbd>↓</kbd>` keyboard traversal and HTML sanitization.
- **Screen Area Marquee Cropper** (<kbd>Alt+C</kbd>).
- **In-Popup Page Brief** (3-bullet instant summary) with 1-click `+ Send Summary to Platform`.
- **In-Popup Custom Q&A** with grounded answers and 1-click `+ Send Answer to Platform`.
- **Dual-View Block Cards** (`BlockAtomCard.tsx`) with sandboxed preview and formatted HTML tabs.
- **Image Atom Renderer** (`ImageAtomCard.tsx`) with modal zoom.
- **Dedicated Local Test Lab** at `/test-lab` and `test-lab.html`.

---

## [v1.0.0] — 2026-09-25 (Phase 1 MVP)
### Added
- Manifest V3 Chrome Extension core with Shadow DOM floating save pill and <kbd>Alt+S</kbd> hotkey.
- W3C Scroll-to-Text Fragment Engine (`src/lib/utils/textFragments.ts`).
- Next.js 15 Web Platform with Dark Theme (`#13151A`), Electric Lime (`#D2F83C`), and Space Grotesk/Figtree fonts.
- Chronological timeline stream with 3-second auto-sync heartbeat.
- 1-click Markdown citation copier and "Jump to Quote" navigation.

---

## [v0.1.0] — 2026-09-24 (Discovery)
### Added
- Product Requirements Document (`RESEARCH_TOOL_PRD.md`).
- 4 Note Types Specification (Text, Link, Image, DOM Block).
- Supabase PostgreSQL schema with RLS policies (`supabase/schema.sql`).
- Design System tokens and typography pairs (`design.md`).
