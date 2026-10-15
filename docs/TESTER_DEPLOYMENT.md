# Tester deployment (5 to 10 people)

How to put Researchie online for testers, with their own accounts, their own data, and their own AI key.
Written 2026-10-15. Limits quoted here were read from Vercel's and Supabase's docs on that date; they change.

## What testers get
- Sign up with email and password. Google sign-in is a disabled "coming soon" button.
- Their own projects, clips and documents. Nobody else can see them.
- Their own AI key in Settings -> AI (Groq, Cerebras, OpenRouter or Google AI Studio). The site owner's key is never used.
- A token (Settings -> Account) that connects the Chrome extension to their account.

Not in this version: sharing and invites between accounts, switching between several saved accounts (use sign out), delete account, the knowledge graph (it runs Python, which Vercel cannot), Google sign-in.

## 1. Supabase (a new, separate project)
Use a new free project for testers, not your personal one. The free plan allows two active projects across your account.

1. supabase.com -> New project. Pick the region closest to your testers. Save the database password somewhere safe.
2. Authentication -> Providers -> Email: on. **Turn "Confirm email" off** (testers sign in straight away; the built-in email sender only mails your own team, 2 messages an hour).
3. Authentication -> URL Configuration: set **Site URL** to the Vercel address from step 2 (add it after you have it).
4. SQL Editor: run `supabase/schema.sql` once, then `supabase/migrations/001_multi_user.sql`. The migration is safe to run twice; a second run of `schema.sql` stops with an "already member of publication" error on its last line, which is harmless. The migration removes the open policies and the seeded demo projects that `schema.sql` creates.
5. Project Settings -> API: copy the URL, the `anon` key and the `service_role` key.

The free plan has **no automatic backups** and pauses a project after **1 week without activity**. Open the dashboard the day before any demo.

## 2. Vercel
1. Install the Vercel CLI (`npm i -g vercel`) and run `vercel` in the project folder, or import the repository in the dashboard.
2. Set these environment variables (Project -> Settings -> Environment Variables), for Production:

| Name | Value |
|---|---|
| `AUTH_REQUIRED` | `true` |
| `NEXT_PUBLIC_AUTH_REQUIRED` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase. Server only. Never prefix it `NEXT_PUBLIC_`. |
| `KEY_ENCRYPTION_SECRET` | 32 or more random characters. Make one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. **Back it up**: if it is lost or changed, every saved AI key becomes unreadable and users must paste theirs again. |

   **Recommended:** also set `SIGNUP_INVITE_CODE` to a long random string (for example `node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"`). Sign-up then asks for it, so only people you give the code to can make an account; 8 wrong guesses lock an address out for 10 minutes. Leave it unset and anyone who finds the address can register and use up the free database. Changing it needs a redeploy and does not affect accounts that already exist.

   Do **not** set `GROQ_API_KEY`: in this mode it is ignored, and leaving it out keeps your own key out of reach.
3. Deploy. Put the address in Supabase's Site URL (step 1.3).
4. Hobby plan notes: functions may run up to 300 s; request and response bodies are capped at **4.5 MB**; usage allowances are shared by all your Hobby projects; the plan is for personal, non-commercial use.

## 3. The Chrome extension for testers
1. Zip the `extension/` folder (or use `release/researchie-extension-*.zip` if you made one).
2. Each tester: unzip, open `chrome://extensions`, turn on Developer mode, **Load unpacked**, choose the folder.
3. In the web app: Settings -> Account -> **Create token**, copy it (shown once).
4. In the extension popup: **Connect account**, paste the site address and the token, press Connect. It checks them before saving.
5. Until it is connected, clips are held in the extension and the toast says "Not connected".

## 4. Each tester needs their own AI account
Settings -> AI -> pick a provider -> **Get a free key** -> paste -> Save and connect -> Test connection.
Provider limits belong to the provider account, not to the key, so testers should not share one account. Free tiers are small (OpenRouter free models: 50 requests a day; Cerebras free: 5 requests a minute). Tell testers not to put patient or other identifiable medical data through any free tier.

## What changed on the server (for whoever maintains it)
- `AUTH_REQUIRED=true` turns on accounts. Unset (local development, the e2e suite) the app works as before with the local file store and one demo user.
- All data routes call `authorize()` ([src/lib/auth/server.ts](../src/lib/auth/server.ts)); data comes from [src/lib/data/cloud.ts](../src/lib/data/cloud.ts), every query filtered by the signed-in user. Row-level security in the migration is a second lock.
- The login session is an httpOnly cookie set only by `/api/auth/*`. The browser client never talks to Supabase Auth.
- Extension tokens: only a SHA-256 hash is stored. AI keys: AES-256-GCM, bound to the user id.

## Known limits
- Screenshots are stored inside clip data, so 500 MB of database fills faster than text. Watch Supabase -> Database -> Usage.
- A save that reaches the server but loses its reply is sent twice when the extension retries.
- PDFs and screenshots over about 4 MB are refused with a message.
- Server-side OCR and PDF parsing were not tested on Vercel. Test them after the first deploy.
- The `rebuild-context` route now refuses to invent surrounding text when it cannot fetch the source page (in local mode it still does).
