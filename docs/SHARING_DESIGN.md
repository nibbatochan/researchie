# Sharing a project with other accounts: design (S-54)

Status: approved 2026-10-16. Steps 1 and 2 are built (data and permissions, the Share dialog); steps 3 (links) and 4 (access requests) are not. Research behind it: `docs/research/auth-and-sharing.md`.

## What the user gets

A project owner can open **Share** on a project and:

1. **Invite people by email** and give each one a role: Editor or Viewer.
2. **Make a link** that lets anyone with it view the project, or view and edit it (off by default).
3. **See who has access** (owner, editors, viewers), change a role or remove a person.
4. **Approve or deny requests** from people who opened the project but had no access.

A person who is invited, or who opens a share link, sees the project under **Shared with me** in the sidebar, next to their own.

## Roles

| Role | Can do |
| :--- | :--- |
| Owner | Everything: rename, delete the project, change sharing, add or remove people. One owner per project; the person who made it. |
| Editor | Add, change and delete clips and documents in the project and its sub-projects. Cannot change sharing or delete the project. |
| Viewer | Read clips and documents. Cannot change anything. |

There is no "Commenter" role: the app has no comments yet. When comments exist, the role is one more row in this table.

Access to a project covers its sub-projects. Sharing a single sub-project on its own is not supported in the first version.

## Rules that must always hold

- Every check happens on the server, in the data layer (`store`). The browser is never trusted to say what role it has.
- A clip belongs to a project, and access follows the project. `user_id` on a clip stays the person who made it.
- A removed person loses access at once. There is no cache to expire.
- Only the owner can delete the project, change sharing or transfer anything. Only a browser session can change sharing: an extension token cannot.
- A share link is a long random secret. Only its hash is stored (like extension tokens). The owner can turn it off at any time, and a turned-off link stops working at once.
- Deleting an account (S-43) deletes that user's own projects, shared or not, and removes their memberships in other people's projects. The delete box will say if any of their projects are shared.
- Local mode (no accounts) has no sharing and hides the Share button.

## Data (migration `004_sharing.sql`)

Four new tables, all with row-level security on and no policies, so only the server can touch them (like `user_ai_keys`).

- `project_members`: `project_id`, `user_id`, `role` (`editor` or `viewer`), `added_by`, `created_at`. The owner stays in `projects.user_id`, not here.
- `project_invites`: `project_id`, `email` (lower-cased), `role`, `invited_by`, `created_at`, `accepted_at`. An invite turns into a member row when that email signs in.
- `share_links`: `project_id`, `token_hash`, `role` (`viewer` or `editor`), `created_by`, `created_at`, `revoked_at`.
- `access_requests`: `project_id`, `user_id`, `message`, `status` (`pending`, `approved`, `denied`), `created_at`, `decided_by`, `decided_at`.

No existing table changes. The current policies on `projects`, `atoms` and `documents` stay owner-only; the browser never reads those tables directly, so they stay a second lock, not the first.

## How the code changes

- `store.ts` gets one new question: **what role does this user have on this project?** (`owner`, `editor`, `viewer`, or none). Every method in `cloud.ts` asks it instead of "does the user own it".
- Reads need any role. Writes need editor or owner. Project delete and sharing changes need owner.
- `listProjects` returns the user's own projects plus the ones shared with them, each marked with the user's role. The extension's project list therefore includes shared projects an editor can clip into; a viewer's projects are left out of it.
- New routes under `/api/projects/[id]/share`: members (list, change role, remove), invites (create, cancel), link (create, turn off), requests (list, approve, deny). Plus `/api/shared` for "Shared with me" and `POST /api/projects/[id]/request-access`.
- `/share/[token]`: a link opens a read-only page for a view link without signing in. An edit link asks the person to sign in, then adds them as an editor.
- The local store answers "owner" for everything, so local mode is unchanged.

## Screens

- **Share dialog** on a project: People (owner, members, pending invites, each with a role menu and Remove), an email box with a role menu and Invite, a Link section (off, view, edit; Copy link), and a Requests badge when someone is waiting.
- **Shared with me** group in the sidebar with a small role label. Viewers see no Add, Edit or Delete controls.
- **"You need access"** page when someone opens a project they cannot see, with a Request access button.
- Pending invites and requests show a count on the Share button.

## What is deliberately left out of the first version

- **Email is not sent.** There is no mail provider. An invite is waiting for that address: when the invited person signs in with that email, the project appears under Shared with me. The owner can also send them the app address themselves. Email sending can be added later with a mail provider and does not change the data model.
- No live updates: changes show after a reload or the next fetch.
- No groups or teams, no transfer of ownership, no sharing a single sub-project.
- No per-clip permissions.

## Build order and checks

1. **Data and permissions**: migration 004, the role question in `store`/`cloud`, members and invites, "Shared with me". Unit tests with a fake database cover every role against every operation, a removed member, and an invite claimed by the right email only. This is the part that must be right.
2. **Share dialog**: members, roles, invites, the sidebar group, hiding controls for viewers.
3. **Links**: create, view, edit, turn off, `/share/[token]`.
4. **Access requests**: request, badge, approve, deny.

Each step is deployed and checked by hand on the live site before the next. Steps 2 to 4 need a second account to check.

## Decisions (answered 2026-10-16)

1. An invite waits until that email signs in; no email is sent in the first version.
2. An edit link needs a sign-in. Anyone who edits must have an account.
3. A viewer can export (PDF, Notion, Markdown), since they can already read everything.
