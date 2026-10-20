# Security decisions for the tester site (5 to 10 people)

Written 2026-10-16. Covers the app from v1.8.2 to v1.9.11 and the live site `https://researchie-testers.vercel.app`.
This is the one place that lists every security choice made for the tester deployment, why it was made, what it costs, and
what was knowingly left open. The longer reasoning for some of them is in `docs/DECISIONS.md` (numbers in brackets).

## Who this is for, and what it protects against

**Audience.** Five to ten testers the owner knows and invites. They are trusted to use the product honestly, but not
trusted with each other's data: a tester must not be able to read, change or delete another tester's work, and must not be
able to reach the owner's keys.

**What we protect**
- Each tester's projects, clips, documents, saved Notion token and AI key from other testers and from a stranger who finds the address.
- The owner's own secrets (Supabase service key, the encryption secret, the invite code) from every tester.
- A tester's account if a laptop is borrowed, a token leaks, or a link is forwarded.

**What we do not protect against.** A determined attacker, a public launch, abuse at scale, or someone who gets into the owner's
Supabase or Vercel account. The site runs on free plans (Vercel Hobby, Supabase free) with no automatic backups. Moving past
10 people, or opening sign-up to the public, means working through "Before opening to more people" at the end.

## The decisions

Each one reads: **Decision**, **Why**, **What we gave up**, **Where**.

### A. Accounts and signing in

**A1. Accounts are a deployment switch, and Supabase is the only store when it is on** (Decision 19; 22).
- Why: testers needed private data on a hosted copy. The app used local files and no route knew who was calling. One switch (`AUTH_REQUIRED=true`) turns on real accounts without touching local development or the 97-test suite.
- Gave up: two ways of running the app to keep correct. Decision 22 reduced this to one data layer with two plugs, so a route has one code path.
- Where: `src/lib/auth/server.ts`, `src/lib/data/store.ts`.

**A2. The login session is an httpOnly cookie that only the server sets** (Decision 20).
- Why: the app shows HTML captured from other sites. A script that got into a page could read any cookie it is allowed to see; it cannot read an httpOnly one. The browser never talks to Supabase Auth directly.
- Gave up: a little more server code; the session cannot be read by the page for display, so `/api/auth/me` is asked instead.
- Where: `src/app/api/auth/*`, `src/lib/supabase/server.ts`. Cookie flags: httpOnly, `sameSite=lax`, `secure` in production.

**A3. A change sent with the session cookie from another website is refused.**
- Why: with `sameSite=lax` plus this check, another site cannot make a signed-in tester's browser create, change or delete anything.
- Where: `isCrossSiteWrite` in `src/lib/auth/tokens.ts`, used by `getRequestUser`.

**A4. Sign-up needs an invite code, and wrong guesses are slowed.**
- Why: without it anyone who finds the address could register and use the owner's database space. The code is set in `SIGNUP_INVITE_CODE`. Eight wrong guesses from one address block that address for 10 minutes.
- Gave up: testers must be given the code. The counter lives in memory on each server instance, so it slows a guesser rather than stopping a determined one; the code should be long and random.
- Where: `src/app/api/auth/signup/route.ts`, `src/lib/auth/rateLimit.ts`.

**A5. Email confirmation is off.**
- Why: Supabase's built-in sender only mails the owner's own team and only 2 messages an hour, so confirmation emails to testers would not arrive. There is no mail provider set up.
- Gave up: a sign-up with someone else's address is not checked. The invite code (A4) is the control that stands in for it. Passwords cannot be reset by email either (there is no password reset): a tester who forgets theirs asks the owner.
- Where: Supabase Authentication settings (not in code).

**A6. A wrong password and an unknown email give the same message.**
- Why: so the form cannot be used to find out which addresses have accounts.
- Where: `src/app/api/auth/login/route.ts`.

**A7. Sign-in fails closed.** If Supabase errors, nobody is signed in (an earlier version let any password through when Supabase failed; fixed in 1.9.0).

**A8. "Continue with Google" cannot be used to skip the invite code, and cannot redirect off the site** (S-45).
- Why: a new account made through Google would otherwise bypass A4. The callback checks the invite code for a brand-new account and removes the account if the code is missing. Separately, the old callback added the `next` address to the site address without a check, so a crafted link could send a person to another site after sign-in; only paths on this site are accepted now.
- Gave up: the person types the invite code on the sign-in page before pressing Google.
- Where: `src/app/api/auth/google/route.ts`, `src/app/auth/callback/route.ts`, `src/lib/auth/redirect.ts`. The button stays off until the owner sets up Google (`docs/GOOGLE_SIGNIN_SETUP.md`).

**A9. "Switch account" remembers email addresses only, never sessions** (S-44).
- Why: keeping several accounts signed in side by side needs one cookie per account, and anyone using a shared computer could open every saved account. Remembering only the address and asking for the password again keeps one live account at a time.
- Gave up: switching is not instant; the password is typed each time.
- Where: `src/lib/auth/knownAccounts.ts`.

### B. Keeping testers' data apart

**B1. Every data call checks what the signed-in person may do in that project** (Decisions 19, 23).
- Why: the server uses Supabase's service-role key, which skips the database's own row rules, so the checks in our code are the real lock. Row-level security is on as a second lock.
- Gave up: one extra lookup per call. The role is looked up every time and never cached, so removing someone takes effect on their next request.
- Where: `src/lib/data/cloud.ts` (`roleOn`). Tested with a fake database that proves one user cannot read, change or delete another's data (`tests/cloud-isolation.test.mjs`, 12 cases; `tests/sharing.test.mjs`, 23 cases, including a deliberate bug that made 3 fail).

**B2. The three open "Public ... Access" policies from the first schema were dropped.**
- Why: they let anyone holding the public anon key read and write every row. Checked on the live project: 7 tables with row-level security on, and an outsider's insert is refused.
- Where: `supabase/migrations/001_multi_user.sql`.

**B3. Sharing is a role on the project (owner, editor, viewer), decided by the owner, enforced on the server** (S-54; Decision 23).
- Why: testers must be able to work together without weakening B1. Only the owner can delete a project or change who has access. A viewer cannot write at all.
- Rules worth remembering: only a browser session can change sharing, so a leaked extension token cannot widen access. A share link is a long random secret; only its hash is stored, it is shown once, and turning it off (or making a new one) stops it at once. An edit link needs a sign-in, so every editor is a known account. The four sharing tables have row-level security on and no policies, so only the server reads them.
- Gave up: invitations send no email (there is no mail provider), so an invitation waits until that address signs in. Links cannot be shown again after they are made.
- Where: `supabase/migrations/004_sharing.sql`, `src/lib/data/sharing.ts`, `src/app/api/projects/[id]/share/route.ts`.

**B4. Local use never touches Supabase** (Decision 22).
- Why: local mode used to copy every clip, project and delete into whatever Supabase project `.env.local` named. Here that was the old project, so local use and the browser tests were writing into it. Now local mode uses only local files.
- Gave up: clips that existed only in the old project stopped showing locally (16 here). They are untouched in Supabase.

**B5. Features that cannot be made safe per user are switched off on the site.** The Python knowledge-graph route is off; the pgvector search call (not scoped to a user) was removed; the old public share page shows a project only to its owner (now: owner, members, or a valid link).

### C. Secrets

**C1. Each tester brings their own AI key, kept encrypted on the server** (Decision 21).
- Why: a shared key would burn the owner's quota and ride on one provider account. The server checks the key with the provider, encrypts it (AES-256-GCM, bound to the user id so a copied row will not open for anyone else) and only ever tells the browser the last four characters. The owner's own `GROQ_API_KEY` is ignored on the tester site, so it stays out of reach.
- Gave up: if `KEY_ENCRYPTION_SECRET` is lost or changed, every saved key becomes unreadable and testers paste theirs again. **The owner must back that secret up.**
- Where: `src/lib/ai/keyVault.ts`, `/api/settings/ai-key`.

**C2. The saved Notion token is kept the same way** (S-46), and an extension token cannot use it.
- Why: so testers paste it once, without leaving it in browser storage. The export route will only use the saved token for a browser session, so a leaked extension token cannot push someone's project into an attacker's Notion.
- Where: `src/lib/notion/storedToken.ts`, `/api/settings/notion-token`, `supabase/migrations/003_notion_token.sql`.

**C3. Secrets never go in documents, and every push is scanned** (Decision 16).
- Why: a key in a pushed commit cannot be taken back, and rotating it alone leaves it readable in history. Before the first push, real keys found in a planning doc were removed from every commit, rotated, and the old one confirmed refused. Before each push every unpushed commit is searched for each value in `.env.local` and for common key shapes. `.env*` and the local data stores are not tracked.
- Gave up: a few minutes per push.

### D. The Chrome extension

**D1. It connects with a token only, and the token carries the server address.**
- Why: no server field to mistype, and the address is shown before anything is sent. The token is shown once in the web app, only its SHA-256 hash is stored, a person can hold at most 5, and any can be revoked.
- Where: `src/lib/auth/tokens.ts`, `extension/connect.js`.

**D2. The extension trusts only https addresses (or http on this computer).** Why: so a token cannot be sent to a plain-http site by mistake.

**D3. Nothing is sent without a token.** Why: the old behaviour sent to whatever server was set. Now a clip taken while disconnected is held in the extension and sent after connecting, with a clear "Not connected" prompt. Gave up: the extension no longer works against a local server with no token.

**D4. An extension token can do less than a browser session.** It cannot create tokens, change settings, change sharing, use the saved Notion token, set up the authenticator, or delete the account. Why: a token sits in extension storage until revoked, so it is the likelier thing to leak.

**D5. The extension only looks at a page when the person clicks a tool, selects text or opens the side panel,** and its buttons live in Shadow DOM so a page's own code and styles cannot reach them. It cannot clip into a project shared read-only.

**D6. Each clip carries an id from its first try,** so a retry after a lost reply does not save a second copy. Why: lost replies are common on poor connections and double saves are confusing; it also gives the server a way to tell a retry from a clash with someone else's clip.

### E. Dangerous actions

**E1. Deleting your own account needs three things: the password, a current code from an authenticator app, and the word DELETE** (S-43).
- Why: it is irreversible and removes the person's data. An open browser session alone must not be enough, so a borrowed laptop cannot delete an account. An authenticator app was chosen over an emailed code because there is no mail provider. Five wrong codes lock deletion for 10 minutes.
- Gave up: the tester must set the app up first; if a step fails halfway, earlier steps stay deleted and the message says so.
- Where: `src/app/api/auth/account/route.ts`, `/api/auth/totp`.

**E2. Deleting a project asks whether to keep its clips, and deletes by the owner only.** Clips other people added to it go with it unless kept.

**E3. Deletes in the feed are undoable for 8 seconds** and go through a trash drawer (Decision 6).

### F. Content that comes from the web

**F1. Captured page HTML is cleaned on every save.** Why: the app shows the page's HTML so a clip looks as it did, and nothing used to remove script or event handlers. Scripts, frames, forms, objects, every `on…` handler and `javascript:` addresses are removed and the readable text kept. Checked live with a hostile block (v1.8.2; `tests/sanitize-block.test.mjs`).

**F2. The server will not fetch addresses on this computer or a private network** when it rebuilds a clip's context or reads an image for OCR on the tester site, and OCR accepts only image data or public https images. Why: otherwise a tester could make the server fetch internal addresses on their behalf.

**F3. Request bodies over about 4.3 MB are refused with a readable message.** Why: Vercel rejects anything over 4.5 MB before our code runs, with an unhelpful error.

### G. Hosting and dependencies

**G1. The tester site is a separate Supabase project and a separate Vercel project from the owner's other work.** Why: the free plan has no backups, and testers' data and keys must be easy to remove or rotate without touching anything else.

**G2. Server secrets are server-only.** The service-role key and encryption secret are set without the `NEXT_PUBLIC_` prefix, so they are never sent to the browser.

**G3. Next.js was upgraded from 15.1.4 to 15.5.28** because Vercel refused to deploy 15.1.4 as a vulnerable version.

**G4. The 12 remaining `npm audit` findings are accepted for now** (S-50, 2026-10-16). Why: none is reachable from what a tester sends. Eight are build tools reading our own files (Tailwind and its helpers), two are PostCSS running on our own CSS (via Next), and the three Word-reader ones are in a command-line parser the library path does not use. The non-breaking `npm audit fix` changes nothing; clearing them needs Tailwind 4 and Next 16. Re-check at the next planned framework upgrade or when npm reports a critical finding.

**G5. What goes to Vercel is limited** by `.vercelignore` (tests, notes, scripts, SQL, the extension, design files and build output stay out; the local data stores are never uploaded). Each line is anchored to the project root: an earlier unanchored `supabase` entry also dropped `src/lib/supabase` and broke a build, which is why the leading slash matters.

### H. Paper writing (added 2026-10-21)

**H1. The AI sees one section's clips and nothing else, inside hard limits.** `/api/ai/draft` checks who is calling, uses the caller's own AI key on the tester site (no fake answer), checks the shape of what it is sent, cuts each clip at 5,000 characters, refuses more than 12 clips, and refuses an empty section. Why: less data leaves, and the free limit holds. Gave up: long sections need splitting. Where: `src/app/api/ai/draft/route.ts`, `src/lib/paper/draft.ts`.

**H2. The model's output is never trusted.** A clip id it makes up is dropped; every sentence is checked afterwards (no source, a quotation or number or equation not in the clips, copied text, mixing own and cited, AI-summary only); the model never writes a reference, because citations come only from clip records. Why: the owner's rule, never invent references. Gave up: a rewording that changes meaning is not caught. Where: `parseDraftResponse`, `classifySentence`.

**H3. Drafting says plainly that clip text goes to Groq.** Groq's documentation says inference data is not retained by default, with up to 30 days for reliability and abuse checks; the free tier is not stated separately (inferred). Why: researchers hold unpublished work. Where: the note beside Draft.

**H4. LaTeX is drawn with KaTeX trust off.** A link, image or script inside a formula is not carried into the page; a formula that fails is shown as typed. The only raw HTML set from text is KaTeX's own output. Why: pasted or imported text can hold anything. Where: `src/components/MathText.tsx`.

**H5. A clipped table keeps only the text of its cells, and a figure is only an image.** No markup from the page reaches the preview. Why: block clips come from the web (F1). Where: `src/lib/paper/tableParse.ts`.

**H6. The PDF export prints the preview's own markup in a hidden frame.** The title is escaped, nothing from outside the article is added, the frame is removed on the next export or when the preview closes. The page carries the "preview only" note without relying on browser features. Where: `src/lib/paper/printDoc.ts`.

**H7. Imported reference files are untrusted text.** They are read in the browser, nothing is fetched or run, and every record is marked "manual" because it was not verified. `PATCH /api/documents` needs a signed-in person with edit rights, checks the citation's shape, and returns only the id and the citation. Tested with an owner, an editor, a viewer and an outsider on the accounts store. Where: `src/lib/citations/importRefs.ts`, `src/app/api/documents/route.ts`, `tests/cloud-document-citation.test.mjs`.

**H8. Replacing a citation never hides a known retraction.** Why: an import must not make a retracted paper look clean. Where: `ImportRefsPanel.tsx`.

**H9. The outline lives in account preferences.** Names are validated, values are text, the whole set is capped at 256 KB, one outline at 60 KB, and a refused save is now shown instead of lost. No token or key goes into an outline. Where: `src/lib/paper/store.ts`, `src/lib/prefs/prefsContext.tsx`.

**H10. Third-party pages are not scraped.** NotebookLM's terms name scraping and automated access. Why: legal exposure and a brittle tool. Gave up: no automatic capture from NotebookLM.

**H11. One dependency was added: `katex` (MIT).** Why: equations. Where: `package.json`.

**H12. Tests leave no data behind** and the one real model call used dummy text.

## Known gaps and accepted risks

These are open on purpose, with the reason they are tolerable for 5 to 10 trusted testers.

| Gap | Why it is tolerable now | What would fix it |
| :--- | :--- | :--- |
| No email verification, and no password reset | Invite code gates sign-up; the owner can reset a password in Supabase | A mail provider (for example Resend), then confirmation and reset email |
| Invite and delete-code counters live in memory per server instance | They slow a guesser; the code is long | A shared store (a Supabase table or Upstash) |
| No rate limit on the data and AI routes | Testers are known; AI calls use each tester's own key | A limiter per user and per address |
| `/api/*` answers with `Access-Control-Allow-Origin: *` and `Allow-Credentials: true` | Browsers refuse credentialed requests to a wildcard origin, cookie writes from another site are refused by A3, and the extension uses a bearer token | Name the allowed origins, or drop the header for cookie routes |
| No Content-Security-Policy or other security headers | Block HTML is cleaned on save (F1) and the session cookie is httpOnly | A CSP and the standard headers in `next.config.mjs` |
| Block clips are shown in an iframe with `allow-scripts allow-same-origin` (`BlockAtomCard.tsx`) | Scripts are removed on save, and the session cookie cannot be read by script. Clips saved before v1.8.2 may not have been cleaned (not checked whether they are cleaned when shown). | Drop one of the two sandbox flags (the page needs same-origin to measure the frame, so it needs a different way to size it), and re-clean old clips |
| Service key of the tester project not yet rotated (S-41) | It has only been on the owner's machine and Vercel | Rotate it in Supabase and update the Vercel variable |
| Free plans: no automatic backups, 1 week of inactivity pauses the project, 500 MB database | Testers can lose data; clips are not the only copy | A paid plan or a scheduled export |
| Invitations and access requests send no email | The owner tells people; they appear on next sign-in | A mail provider |
| A viewer can export (PDF, Notion, Markdown) | They can already read everything (decided with the owner) | Block export for viewers if that changes |
| Extension permission `<all_urls>` | The extension must work on any page the tester reads | Cannot be narrowed without breaking clipping |
| No app-level rate limit on `/api/ai/draft` | Calls use the tester's own key, so the provider's free limit is the cap | The shared limiter in `S-103` |
| The paper text is large and is scanned by patterns on every redraw | One outline is capped at 60 KB when saved; not tested with hostile input | Fuzz the maths and citation patterns; cap the text in the editor |
| The print frame is built from the preview's markup and shares the app's origin | Its content comes from escaped text and KaTeX output; not reviewed by anyone else | A review of the export path; a Content-Security-Policy |
| "Drafted by AI" disclosure relies on a tick the researcher can remove | It prompts honesty, it is not a lock | Keep the flag when text came from a draft and ask before removing it |
| The paper features were checked only in local mode and on an in-memory copy of the accounts store | See "Not verified" | The signed-in checklist in `docs/TESTER_CHECKLIST.md` |

## Before opening to more people

1. Set up a mail provider, then turn on email confirmation and password reset.
2. Add a shared rate limiter, with per-user limits on AI and data routes.
3. Add a Content-Security-Policy, narrow the CORS header, and change the block iframe sandbox.
4. Rotate every key on the testers project and back up `KEY_ENCRYPTION_SECRET`.
5. Move from free plans to ones with backups.
6. Re-run `npm audit` and decide on the Tailwind 4 and Next 16 upgrades.
7. Have someone other than the author try to read another account's data, with two real accounts, on the live site. The isolation and sharing rules are proved with a fake database and have not yet been tried with two real accounts.

## What the owner must keep doing

- Keep `SIGNUP_INVITE_CODE` private and hand it out one person at a time. Change it if it leaks (existing accounts are not affected).
- Back up `KEY_ENCRYPTION_SECRET` somewhere outside Vercel. Without it every saved AI key and Notion token is lost.
- Run the key scan before each push (C3), and never paste a real key into a chat.
- Open the Supabase dashboard the day before any demo (a free project pauses after a week without activity).
- Revoke a tester's extension tokens, or remove them from a project, when they stop testing.

## Not verified

Everything above is read from the code and the changelog, and the isolation and sharing rules are proved only with a fake
database. Not yet tried on the live site with two real accounts: sharing (invite, link, request), switching accounts after
the latest deploy, delete account end to end, the saved Notion token, and Google sign-in. See the checklists in `SCOPE.md`.

**Paper writing (2026-10-21).** Not tried on the live site with an account: saving the outline and drafts, the preferences refusal notice, importing references onto a PDF, and a viewer being unable to attach. The accounts store rules for the PDF citation (owner, editor, viewer, outsider) are proved with a fake database. The wording of the Harvard and IEEE styles was read through a summarising tool, not from the books. No outside security review of the print frame or the maths and table handling.
