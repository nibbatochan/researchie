# Turning on "Continue with Google" (S-45)

The code is built. The button stays a disabled "coming soon" placeholder until you do the three steps below, because Google
has to be set up by hand in two dashboards. Use the **testers** Supabase project, not the old one.

## 1. Google Cloud: make an OAuth client

1. Open https://console.cloud.google.com and pick or create a project.
2. APIs & Services, then **OAuth consent screen**. Choose External. App name: Researchie. Add your email as the support
   and developer contact. While you test, leave it in **Testing** and add your testers' Google addresses under Test users.
   (Moving to Production needs Google's review; with 5 to 10 testers, Testing is enough.)
3. APIs & Services, then **Credentials**, then **Create credentials**, then **OAuth client ID**. Type: Web application.
4. **Authorised redirect URIs**: add `https://<your-testers-project-ref>.supabase.co/auth/v1/callback`. You can copy the exact
   address from Supabase in step 2 below.
5. Create it. Keep the **Client ID** and **Client secret** for step 2.

## 2. Supabase: switch Google on

1. Authentication, then **Providers**, then **Google**. Turn it on and paste the Client ID and Client secret. Save.
2. Authentication, then **URL Configuration**:
   - **Site URL**: `https://researchie-testers.vercel.app`
   - **Redirect URLs**: add `https://researchie-testers.vercel.app/auth/callback`
3. A person who signs in with Google using an address that already has an email account is linked to that same account.

## 3. Vercel: show the button

1. Project settings, then Environment Variables: add `NEXT_PUBLIC_GOOGLE_SIGNIN` = `true` (Production).
2. Redeploy (`vercel deploy --prod --yes`). The variable is read when the site is built, so a redeploy is needed.

## How it behaves

- The button starts on the server (`/api/auth/google`), so the login session stays an httpOnly cookie that page scripts cannot read.
- **Invite code.** If `SIGNUP_INVITE_CODE` is set, a brand-new Google account must have typed the code on the sign-in page before
  pressing the button. If not, the new account is removed again and the person is sent back with a message. Existing accounts
  are not affected.
- After Google, the person goes to the page they came from. Only addresses on this site are accepted as "where to go next"
  (this closed an open redirect in the old callback).

## Check by hand

1. Open `/login` in a private window. The button reads **Continue with Google** and is clickable.
2. Choose a Google account you added as a test user. You land in the workspace, signed in.
3. Sign out and use the same Google account again. You are signed in to the same account (no second account).
4. With an invite code set: sign out, use a Google account that is new to the site without typing a code. You should be sent
   back to `/login` with the invite-code message, and no account should be left in Supabase, under Authentication, then Users.
