# Auth and sharing: how Figma, Notion, Google Docs work, and what Supabase supports

Research date: 2026-10-15. First-party pages only. Each claim carries the URL of the page it came from.

## Sources checked

Figma help centre
- https://help.figma.com/hc/en-us/articles/360041064554-Log-in-or-add-accounts
- https://help.figma.com/hc/en-us/articles/360039811114-Create-a-Figma-account
- https://help.figma.com/hc/en-us/articles/360039820114-Manage-email-address-or-password
- https://help.figma.com/hc/en-us/articles/360040047614-Authenticate-with-Google
- https://help.figma.com/hc/en-us/articles/1500007609322-Guide-to-sharing-and-permissions
- https://help.figma.com/hc/en-us/articles/35361119554711-File-and-folder-permissions
- https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes
- https://help.figma.com/hc/en-us/articles/360040530793-Remove-or-adjust-access
- https://help.figma.com/hc/en-us/articles/4408435431319-Request-to-edit-a-file

Notion help
- https://www.notion.com/help/log-in-and-out
- https://www.notion.com/help/account-settings
- https://www.notion.com/help/create-delete-and-switch-workspaces
- https://www.notion.com/help/sharing-and-permissions

Google Docs / Drive / Account help
- https://support.google.com/docs/answer/2494822 (share files)
- https://support.google.com/docs/answer/2494893 (stop, limit, change sharing)
- https://support.google.com/docs/answer/2494892 (transfer ownership)
- https://support.google.com/docs/answer/16722399 (access to Google files, request access)
- https://support.google.com/accounts/answer/27441 (create a Google Account)
- https://support.google.com/accounts/answer/1721977 (switch accounts, sign out)
- https://support.google.com/accounts/answer/3067630 (devices with account access)

Supabase
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-email
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/social-login
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/auth-signout
- https://supabase.com/docs/reference/javascript/auth-signup
- https://supabase.com/docs/reference/javascript/auth-signinwithidtoken
- https://supabase.com/docs/reference/javascript/auth-linkidentity
- https://supabase.com/docs/reference/javascript/initializing

Chrome extension docs
- https://developer.chrome.com/docs/extensions/reference/api/identity
- https://developer.chrome.com/docs/extensions/mv3/tut_oauth
- https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging

### Could not verify

- Figma, Notion, Google: what happens when the same email is used with both Google login and email+password. No first-party page states a merge or link rule for Figma. Figma's sign-up page says nothing about an existing account. Notion says Google login works only if the Notion email matches the Google email (log-in-and-out), which implies same-email match but does not say "merge". Google Accounts are the identity provider itself, so the question does not apply the same way.
- Figma: whether "Log out" ends sessions on other devices, and whether any "log out of all devices" option exists. The log-in-or-add-accounts page is silent.
- Figma: what a requester sees after denial; what a person with no access sees (the file-and-folder page gives no message text; the "Request access" screen is mentioned only in search-result text of the sharing guide, not on a fetched page).
- Google: where the owner approves or denies a request inside the product (buttons/UI). The help page says the owner gets an email; it does not describe the approval screen.
- Supabase: exact return shape of `signUp()` with confirmation on vs off (reference page does not say); whether `signUp` for an already-registered email returns an obfuscated response in every case (page says "may get back an error message that attempts to hide this information").
- Supabase: any first-party page for multi-account (several users in one browser). Not found. See section C.
- Supabase: a code sample for the Next.js OAuth callback route was not on the pages I could read; only the description (read `code`, call `exchangeCodeForSession(code)`) from the Google login page.
- Supabase: `chrome-extension://` or `chromiumapp.org` URLs in the redirect allow list. Not mentioned in redirect-urls docs.
- Fetched pages were summarised by a small model, so the wording in quotes is as returned, not verified against raw HTML. Re-check anything load-bearing before building on it.

---

## D. Standard flows (summary)

### 1. Sign up and log in
- All three offer email+password and Google. Figma: https://help.figma.com/hc/en-us/articles/360041064554-Log-in-or-add-accounts. Notion adds email code, Apple, Microsoft, passkey, SAML: https://www.notion.com/help/log-in-and-out. Google Docs uses a Google Account: https://support.google.com/accounts/answer/27441.
- Figma email sign-up: email + password, logged in immediately, verification email follows. https://help.figma.com/hc/en-us/articles/360039811114-Create-a-Figma-account
- Figma Google sign-up: account made from Google name and email; email and password then "managed by Google". Same page, and https://help.figma.com/hc/en-us/articles/360039820114-Manage-email-address-or-password
- Notion: Google/Apple/Microsoft login works only if the Notion email matches the provider email. https://www.notion.com/help/log-in-and-out
- Apple "Hide My Email" makes a separate Notion account that cannot be linked. Same page.
- Google Account: can be created on an existing third-party email, verified with an emailed code. https://support.google.com/accounts/answer/27441
- No page from these three describes an automatic merge of a Google login and an email+password account.
- Pattern: email+password sign-up verifies by emailed link or code.

### 2. Sign out and sessions
- Figma: "Log out" signs out only the selected account; no "log out of all" documented. https://help.figma.com/hc/en-us/articles/360041064554-Log-in-or-add-accounts
- Notion: per-account Log out, plus "Log out all" in the workspace switcher. https://www.notion.com/help/create-delete-and-switch-workspaces
- Notion: Settings, then "Log out of all devices" ends every session except the current one; each device can also be logged out individually. https://www.notion.com/help/log-in-and-out
- Notion login tokens expire after 90 days. https://www.notion.com/help/create-delete-and-switch-workspaces
- Google: Account menu has "Sign out" and "Sign out of all accounts" (browser accounts). https://support.google.com/accounts/answer/1721977
- Google: remote sign-out of one device or session under Security, "Manage all devices". https://support.google.com/accounts/answer/3067630

### 3. Multiple accounts
- Figma: add account from avatar menu, up to 10 at once, no logout needed to switch. https://help.figma.com/hc/en-us/articles/360041064554-Log-in-or-add-accounts
- Notion: "Add another account" in the workspace switcher; no fixed limit, slower at 10+. https://www.notion.com/help/create-delete-and-switch-workspaces
- Google: profile menu lists accounts; "Add account" to add. https://support.google.com/accounts/answer/1721977
- Access errors across accounts: Google tells users to check they are signed in as the account the file was shared with. https://support.google.com/docs/answer/16722399

### 4. Sharing: invite
- Invite by email: choose a role, send. Google: Viewer/Commenter/Editor, optional message, up to 600 addresses. https://support.google.com/docs/answer/2494822
- Figma: email or group, set per-person permission, Send invite; invitee gets email and in-app notice. https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes
- Notion: Share, name/email, level, Invite; non-members become guests who need a Notion account. https://www.notion.com/help/sharing-and-permissions
- Link sharing is a separate setting from invites in all three.

### 5. Roles
- Google: Owner, Editor, Commenter, Viewer. https://support.google.com/docs/answer/2494822
- Notion: Full access, Can edit, Can comment, Can view. https://www.notion.com/help/sharing-and-permissions
- Figma: Owner (file creator), Can edit, Can view (view includes comment). https://help.figma.com/hc/en-us/articles/35361119554711-File-and-folder-permissions
- Only Notion Full access can change others' permissions; Google Editors can by default but the owner can switch that off; Figma: anyone with edit permission can.

### 6. Link access levels
- Google: Restricted / Anyone with the link (plus Public in search). https://support.google.com/docs/answer/2494822
- Notion: Only people invited / Everyone at workspace / Anyone on the web with link; commenting or editing needs a login. https://www.notion.com/help/sharing-and-permissions
- Figma: audience access: Anyone / organization / workspace / Only invited people, with view or edit. https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes
- Admins can disable public links in Figma (same page) and Notion Enterprise (sharing page).

### 7. Member list and removal
- Google: Share dialog lists people; arrow next to name, "Remove access", Save. https://support.google.com/docs/answer/2494893
- Figma: Share modal; dropdown next to name changes role or removes. https://help.figma.com/hc/en-us/articles/360040530793-Remove-or-adjust-access
- Removal does not beat inherited access (folder/team/audience). Figma page above; Google 2494893.
- Google: ownership transfer needs recipient to accept (same-org exempt); owner stays owner until then. https://support.google.com/docs/answer/2494892

### 8. No access and Request access
- Google: "You need access" screen, Request access, optional message, Send request. https://support.google.com/docs/answer/16722399
- Google owner gets an email with name, account email, file link and message; owner chooses whether to notify the requester. Same page.
- Google requester: email on approve (with link) or deny, or no email if owner chose not to notify. Same page.
- Notion: "No access" request goes to creators/editors; they accept or deny; requests land in the owner's Inbox. https://www.notion.com/help/sharing-and-permissions
- Figma: viewers use "Ask to edit"; owners get email and in-app notice; approver sees red badge on Share and approves or denies in the modal. https://help.figma.com/hc/en-us/articles/4408435431319-Request-to-edit-a-file
- Figma approval notifies the requester by email and in-app. Denial notice: not documented.

### 9. Supabase for our stack (short)
- Use `@supabase/ssr`; PKCE is the default flow for it. https://supabase.com/docs/guides/auth/server-side/advanced-guide
- Next.js 15: file is `middleware.ts`, refreshes session with `getClaims()`; `proxy.ts` is for Next 16. https://supabase.com/docs/guides/auth/server-side/nextjs
- Never trust `getSession()` on the server. Same page.
- Same verified email via OAuth is auto-linked to the existing user. https://supabase.com/docs/guides/auth/auth-identity-linking
- `signOut()` default scope is `global`. https://supabase.com/docs/reference/javascript/auth-signout
- Multi-account in one browser: not documented as supported (see C).
- RLS: membership table, `to authenticated`, `(select auth.uid())`, security definer helper to avoid recursion. https://supabase.com/docs/guides/database/postgres/row-level-security
- Extension: docs show `chrome.identity.launchWebAuthFlow` then `signInWithIdToken` for Google. https://supabase.com/docs/guides/auth/social-login/auth-google

---

## Details

## A. Sign up, login, linking, sign out, switching accounts

### Figma
- Log in methods: email+password, Google SSO, SAML SSO (Organization plans only). Add account via file browser avatar; up to 10 accounts at a time; no logout needed to switch. Log out via avatar, "signs out only the currently selected account". The page does not mention sessions on other devices or a "log out of all". Source: https://help.figma.com/hc/en-us/articles/360041064554-Log-in-or-add-accounts
- Email sign-up: Sign up, email + unique password, logged in immediately, verification email. Google sign-up: Continue with Google; account created under Google name and email. The article does not say what happens if the email already has a Figma account. Source: https://help.figma.com/hc/en-us/articles/360039811114-Create-a-Figma-account
- Google accounts: email and password "Managed by Google", cannot be changed in Figma. To switch to email+password: log out, use Reset password, set a new password, then log in with it; the email can be changed afterwards. Source: https://help.figma.com/hc/en-us/articles/360039820114-Manage-email-address-or-password
- Org Google SSO: first login or SCIM provisioning sends a 6-digit PIN by email; email domain must match the managed Google domain. Source: https://help.figma.com/hc/en-us/articles/360040047614-Authenticate-with-Google
- Not documented on pages checked: merge or link of Google login with an existing email+password account; remote sessions.

### Notion
- Login methods: email code, email+password, Google, Apple, Microsoft, passkey, SAML SSO (Business/Enterprise). Provider logins work only if the Notion account email matches the provider email. Apple "Hide My Email" creates a separate account that cannot be linked. Source: https://www.notion.com/help/log-in-and-out
- Password is optional: Settings, your name, "Set a password" (8+ chars, 4 unique; 8 to 14 chars need a letter and a number). Source: https://www.notion.com/help/account-settings
- Sign-out: per device in settings table ("Log out" next to a device), or "Log out of all devices" which keeps the current session. "This was not me" in a new-login alert logs out that device and sends the user to reset the password or enable MFA. Source: https://www.notion.com/help/log-in-and-out
- Multiple accounts: "Add another account" in the workspace switcher; ••• then Log out for one account; "Log out all" for everything; tokens expire after 90 days and the account must be re-added; no limit, slower at 10+. Source: https://www.notion.com/help/create-delete-and-switch-workspaces
- Not documented: a merge. Only the email-match rule above.

### Google Docs / Google Account
- Docs sign-in is the Google Account. Create account page: can use an existing non-Gmail email, verified by emailed code. Source: https://support.google.com/accounts/answer/27441
- Switch: profile image, pick account, or Add account. Sign out: "Sign out" or "Sign out of all accounts" (browser sign-ins). Remove an account from the chooser: myaccount.google.com, "Remove an account", repeated per browser. Source: https://support.google.com/accounts/answer/1721977
- Devices: Security, "Your devices", Manage all devices; select device or session, Sign out. Multiple sessions can share one device name; sign out of all with that name. Source: https://support.google.com/accounts/answer/3067630

## B. Sharing

### Figma
- Permission levels: file, folder, team (Org/Enterprise). Roles: Can view, Can edit; owner is the creator. Source: https://help.figma.com/hc/en-us/articles/1500007609322-Guide-to-sharing-and-permissions and https://help.figma.com/hc/en-us/articles/35361119554711-File-and-folder-permissions
- Can view on a file: view and comment, copy and export unless restricted. Folder: Can edit can create files and folders. Source: file-and-folder-permissions page.
- Invite by email: invitation email and in-app notification; recipient accepts to gain access; edit access invitee must accept. Source: https://help.figma.com/hc/en-us/articles/1500007609322-Guide-to-sharing-and-permissions and https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes
- Link audience options: Anyone, organization, workspace (Enterprise), Only invited people; set per file; then pick view or edit. Admins can turn off Anyone. Source: https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes
- Starter team Drafts caveat: files shared with Anyone are view-only for link holders (from search summary of Figma help, not a fetched page; treat as unverified).
- Member list: no separate member screen for files; people are listed in the Share modal. Dropdown next to a name changes role or removes. Anyone with can edit may change permissions. Removing only removes the explicit role; inherited access can remain. Source: https://help.figma.com/hc/en-us/articles/360040530793-Remove-or-adjust-access
- Admins on paid plans can change permissions even without edit access. Source: Guide to sharing and permissions.
- Request: viewers click "Ask to edit"; owner gets email and in-app notification; badge on Share; owner or can-edit people approve or deny in the Share modal; requester notified by email and in-app on approval and can edit right away. Seat requests are approved by admins only. Source: https://help.figma.com/hc/en-us/articles/4408435431319-Request-to-edit-a-file
- Not documented: request message text, pending state for requester, denial notice, exact no-access screen.

### Notion
- Levels: Full access (edit and share), Can edit (not share), Can comment, Can view. Database-only: Can edit content, Can create (Business/Enterprise). Source: https://www.notion.com/help/sharing-and-permissions
- Invite: Share, name or email, level, Invite. Outside the workspace becomes a guest needing a Notion account; limits by guest settings and allowed domains. Same page.
- General access: Only people invited; Everyone at workspace (optionally hidden from search); Anyone on the web with link (view without account; comment or edit needs login; optional expiry; Enterprise owners can disable). Same page.
- Who changes permissions: only Full access. Subpages inherit. Notion applies the broadest access a person has. Same page.
- Request: choose "No access" on a page you cannot open to send a request to creators or editors who accept or deny. With view or comment access: Share, dropdown, "Request edit access"; creator accepts or ignores. Requests appear in the owner's Inbox. Same page.
- Not documented on that page: message to owner, what the requester sees after.

### Google Docs
- Roles: Viewer, Commenter, Editor, Owner. Editors can share and change permissions by default but not change the owner. Source: https://support.google.com/docs/answer/2494822
- General access: Restricted; Anyone with the link; Public (findable in Search). Link sharers show as owner; anonymous viewers show as "anonymous animals". Same page.
- Invite: Share, email, role, optional message, Send. Up to 600 individual addresses per file. Work/school accounts can set an expiry. Same page.
- Owner can untick "Editors can change permissions and share". Source: https://support.google.com/docs/answer/2494893
- Remove: Share, arrow by name, Remove access, Save. Folder-inherited access is removed or changed on the whole folder. Restricted overrides folder inheritance. Removing access does not undo copies. Source: https://support.google.com/docs/answer/2494893
- Transfer ownership: recipient must be someone already shared with; must accept unless same organization. Source: https://support.google.com/docs/answer/2494892
- No access: "You need access" screen. Request access, optional reason, Send request. Owner email: name, account email, file link and name, message; owner may choose to notify. Requester gets approve or deny email only if the owner notifies; otherwise reopen the file. Check you use the right account. Source: https://support.google.com/docs/answer/16722399
- A dot beside Share indicates a pending share request. Source: https://support.google.com/docs/answer/2494822

## C. Supabase specifics

### Email/password and confirmation
- Email+password is on by default. Email verification is on by default for hosted projects, off for self-hosted and local. Source: https://supabase.com/docs/guides/auth/passwords
- Implicit flow (default for plain JS client): site receives the access token after confirmation. PKCE flow (server-side apps): the email template sends a token hash to `/auth/confirm`, which calls `verifyOtp` and redirects on failure. You must build `/auth/confirm` yourself. Sources: passwords page and https://supabase.com/docs/guides/auth/auth-email-passwordless
- Confirmation redirect (`emailRedirectTo` / redirect URL) must be on the Redirect URLs list; if omitted the Site URL is used. Source: passwords page.
- Default email service is limited to 2 emails per hour; use custom SMTP for production. Source: passwords page.
- Existing user sign-up: reference warns of an error message that "attempts to hide this information". Source: https://supabase.com/docs/reference/javascript/auth-signup. Identity-linking page: signing up by email with an address already registered through OAuth gets an obfuscated response and no verification email. Source: https://supabase.com/docs/guides/auth/auth-identity-linking
- Password reset: `resetPasswordForEmail()` does not reveal whether an account exists; change page calls `updateUser({ password })`. Source: passwords page.
- Not stated in the pages read: exact `signUp()` return with confirmation on/off.

### Google OAuth (PKCE) and callback
- Setup: Google Cloud Web client ID; add Supabase callback URL (`https://<ref>.supabase.co/auth/v1/callback`, or `http://127.0.0.1:54321/auth/v1/callback` locally) to Authorized redirect URIs; put client ID and secret in Supabase. Scopes `openid`, `userinfo.email`, `userinfo.profile`. Source: https://supabase.com/docs/guides/auth/social-login/auth-google
- In browser, `signInWithOAuth({ provider: 'google' })` uses the implicit flow by default. For PKCE/server-side pass `redirectTo` pointing to your callback route and add it to the allow list. Same page.
- Server side: return the URL from `signInWithOAuth` as a redirect using an `@supabase/ssr` server client and send its cookies, since the PKCE code verifier is stored in a cookie. Same page.
- Callback route: read the `code` query param, call `exchangeCodeForSession(code)` to store the session in cookies, redirect to `next` (default `/`) or an error page. Same page.
- After sign-in, redirect to a page that does not use Next.js prefetch; prefetch can run before cookies are stored. Source: https://supabase.com/docs/guides/auth/server-side/advanced-guide
- `@supabase/ssr` uses PKCE by default; cookies are not HttpOnly because the browser needs the refresh token; `SameSite=Lax` is a good default; auth responses need `Cache-Control: private, no-store` (`@supabase/ssr` 0.10.0 passes cache headers to `setAll`). Same page.
- Redirect allow list wildcards: `*` (no separators), `**`, `?`. Exact paths recommended for production. Source: https://supabase.com/docs/guides/auth/redirect-urls

### Next.js 15 with `@supabase/ssr`
- Server client takes `cookies.getAll/setAll`; make a new server client per request; browser client is a singleton. Default cookie name `sb-<project_ref>-auth-token`. Source: https://supabase.com/docs/guides/auth/server-side/nextjs
- Next.js 15 and earlier: the file is `middleware.ts` (function `middleware`); `proxy.ts` is not called before v16, so sessions would not refresh. Same page.
- Use `getClaims()` to protect pages and data; `getSession()` is not revalidated and must not be trusted on the server. Refreshing in two places can reuse a refresh token and revoke the session. Same page.
- Verification: `getClaims()` or JWKS at `/auth/v1/.well-known/jwks.json`. Source: https://supabase.com/docs/guides/auth/jwts

### Identity linking
- Automatic: a new OAuth sign-in with the same email as an existing user is linked to that user. Depends on unique emails. Linking to an unverified email is considered unsafe (pre-account takeover), so when an identity can be linked, other unconfirmed identities are removed. SAML SSO users are excluded. Source: https://supabase.com/docs/guides/auth/auth-identity-linking
- Manual (beta): signed-in user calls `linkIdentity({ provider })`; must be enabled in Auth config (`GOTRUE_SECURITY_MANUAL_LINKING_ENABLED` when self-hosting). `unlinkIdentity` needs at least two identities. Same page; reference https://supabase.com/docs/reference/javascript/auth-linkidentity.
- Add password to an OAuth-only account: `updateUser({ password })`. Same page.

### signOut scopes
- `global` (default): all sessions on all devices. `local`: current session only (recommended for most apps; clears storage and fires `SIGNED_OUT`). `others`: all sessions except current; no `SIGNED_OUT` event. Source: https://supabase.com/docs/reference/javascript/auth-signout
- Access tokens stay valid until expiry after sign-out; "no way to revoke a user's access token jwt until it expires". Same page. Also `advanced-guide` notes global default.
- Sign-out deletes the sessions from `auth.sessions`; sessions end on password change, inactivity timeout, max lifetime, or sign-in elsewhere when "Single session per user" is on (Pro). Source: https://supabase.com/docs/guides/auth/sessions

### Multi-session and multi-account
- Native: a user can have unlimited concurrent sessions across devices by default. Source: https://supabase.com/docs/guides/auth/sessions
- Several different users signed in at once in one browser (a Figma/Notion-style switcher): NOT documented. The sessions page covers multiple sessions of one user only, and I found no first-party page for it. The reference `initializing` page and the SSR guides do not mention `storageKey` for this purpose. Treat as unsupported/unspecified; any design would be our own (for example separate storage keys or cookie names per account) and must be tested.
- The client accepts a custom `storage` option (React Native examples). Source: https://supabase.com/docs/reference/javascript/initializing

### Row Level Security for per-project membership roles
- Policies act as an added `WHERE`; name roles with `to authenticated`; `auth.uid()` is `null` when unauthenticated, so check non-null explicitly. Separate policies per operation (`using` for select/update/delete, `with check` for insert, both for update). Source: https://supabase.com/docs/guides/database/postgres/row-level-security
- Performance: wrap `auth.uid()` as `(select auth.uid())`; index columns used in policies (a composite `(team_id, user_id)` index does not index `user_id`). Same page.
- Membership: read from a membership table or from JWT claims. Claims go stale until the token refreshes (removed member keeps access until refresh). Policies on two tables that query each other cause recursion error `42P17`; break it with a security definer function that returns the caller's allowed ids. Same page.
- Security definer functions: set `search_path = ''`, schema-qualify names, keep out of exposed schemas, restrict execute. Same page.
- `raw_app_meta_data` is server-only (fit for authorization); `raw_user_meta_data` is user-editable (never base access on it). Same page.
- Policies do not remove existing grants; enable RLS, revoke default grants from `anon`/`authenticated`, grant back only what is needed; test with pgTAP. Same page.
- The page gives a pattern, not a ready-made "owner/editor/commenter/viewer" schema. A role column on a `project_members` table checked by a security definer function is our own composition from these rules.

### MV3 extension authentication against the same backend
- Chrome: `chrome.identity.launchWebAuthFlow` opens a web view for a non-Google IdP flow; redirect URL from `getRedirectURL()` has the form `https://<app-id>.chromiumapp.org/*`; result is the final redirect URL, which the app must parse; needs `identity` permission. `getAuthToken` is the Google-account path and uses the manifest `oauth2` block. Do not start an interactive flow on first launch without context. Source: https://developer.chrome.com/docs/extensions/reference/api/identity
- Chrome's OAuth tutorial shows only `getAuthToken` with a Chrome Extension OAuth client ID and a pinned extension ID via manifest `key`. Source: https://developer.chrome.com/docs/extensions/mv3/tut_oauth
- Supabase's own Google doc describes the extension path: create a Chrome Extension OAuth client ID using the extension Item ID, register it in the Google provider settings, add `identity` permission and `oauth2` block (scopes `openid`, `email`, `profile`), run `launchWebAuthFlow`, extract `id_token` from the redirect URL and call `supabase.auth.signInWithIdToken()`. Source: https://supabase.com/docs/guides/auth/social-login/auth-google
- `signInWithIdToken` reference lists only `google` in its example and is thin on nonce; nonce details come from the Google login page (hash sent to Google, raw value to Supabase, recommended). Sources: https://supabase.com/docs/reference/javascript/auth-signinwithidtoken and the Google page.
- Redirect allow list: `chrome-extension://` is not mentioned in Supabase's redirect docs. Custom schemes appear only for mobile deep links. Source: https://supabase.com/docs/guides/auth/redirect-urls
- Cross-origin calls from the service worker need `host_permissions`; content scripts' requests count as cross-origin and act for the page, so route authenticated calls through the service worker and send small inputs (IDs), not arbitrary URLs. Source: https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- Token handoff from the web app: `externally_connectable` lets listed web pages call `runtime.sendMessage` with the extension ID; the extension receives it via `runtime.onMessageExternal` and should check `sender.url`. Messages go page to extension only. Source: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- Reusing the web session: browser clients keep sessions in local storage; SSR clients use cookies (not HttpOnly). Neither page says an extension can share them automatically. Whether the extension can read the web app's cookies depends on extension `cookies` permission and `host_permissions`; this was not researched in a first-party Supabase page and is unverified here.
- Docs do not state a single recommended approach for extensions beyond the Google `launchWebAuthFlow` + `signInWithIdToken` path. Email+password users in the extension, and non-Google OAuth, are not covered by a first-party page I found.

### Where docs say "not supported" or are silent
- Refresh-token reuse outside the tolerance window kills the whole session (sessions page); two refresh points risk sign-out (nextjs page).
- `proxy.ts` is not called on Next.js 15 and earlier (nextjs page).
- PKCE cannot be used with autoconfirm enabled (signUp reference).
- SAML SSO users are excluded from automatic and manual linking (identity-linking page).
- Manual linking is beta and off by default (identity-linking page).
- Access token revocation before expiry: not possible (signOut reference).
- Multi-account in one browser: not documented.
- Extension redirect URLs in allow list: not documented.
