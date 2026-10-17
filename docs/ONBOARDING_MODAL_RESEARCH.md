# In-app "About / How it works" modal: structure research

Date: 2026-10-17. Question: what is the best structure for a first-run modal in Researchie for 5 to 10 invited testers, covering what it is, use cases, how to use it, and a setup checklist (Chrome extension and AI key)? It must close, and reopen from a dashboard button.

Labels. **VERIFIED-REPO** = read in this repo today (file named). **VERIFIED-SOURCE** = read on the owner's page today (URL in section 9). **JUDGEMENT** = my call, not from a source. Nothing here was edited in the app; this file is the only thing written.

---

## 1. Recommendation (one paragraph)

Build one dialog with four tabs in this order: **Set up**, **What it is**, **Use cases**, **How to use**. Open it automatically on the first visit to the dashboard, on **Set up** while either required step is missing, and on **What it is** once both are done. Set up is first because nothing in the product works without the extension and the AI key, so a tester who reads only one tab should read that one. Keep each tab to one screen without scrolling on a laptop (60 to 130 words of body copy plus a list). Give the dialog a visible close button, Escape, and a click outside; remember "seen" on the server per account; and reopen it from a "How it works" button next to the existing "Download extension" button on the dashboard. Do not build a step-by-step tour, and do not list planned features. The setup state should also show outside the modal (a small banner on the dashboard until both steps are done), because the modal can be closed and published guidance says help should be easy to dismiss and easy to find again.

Why a modal at all, given that NN/g says to skip onboarding where possible: the audience is invited testers who must do two setup things before the product does anything. NN/g lists "critical missing information" that blocks a user process as a valid modal case. Everything beyond that setup is optional reading, so the dialog must stay short and skippable. (Sources: section 9, NN/g mobile onboarding, NN/g modal dialogs, Apple HIG.)

---

## 2. What the sources say, in one table

| Rule | Owner and page | How it shapes this modal |
| :-- | :-- | :-- |
| Onboarding should be "fast, fun, and optional". | Apple HIG, Onboarding (read from the JSON feed of the page) | Skippable, short, closable at once. |
| "Postpone nonessential setup flows"; give "reasonable default settings". | Apple HIG, Onboarding | Only the two setup steps that truly block work go in the checklist. Model name, Notion token, theme are not in it. |
| "Teach through interactivity"; put instructions "near that area" they refer to. | Apple HIG, Onboarding | Setup rows link to the exact place (extension dialog, Settings, AI Intelligence). No long prose tour. |
| If people skip a tutorial "don't present it again on subsequent launches, but make sure it's easy for people to find." | Apple HIG, Onboarding | Show once per account; reopen button on the dashboard. |
| "Avoid creating app onboarding whenever possible"; avoid "deck-of-cards onboarding"; if used, "a highly visible Skip option." | NN/g, Mobile app onboarding | No card carousel. Tabs the reader can jump between instead of a forced sequence. |
| Tutorials are "pushy, devoid of context", people skip them; prefer help the user pulls. Make help "easy to dismiss and easy to find again later." | NN/g, Onboarding tutorials | Close is always one action. The reopen button is permanent. Setup status also shows on the page. |
| Modals suit critical missing information and short flows; irrelevant modals "are perceived as annoying"; avoid unrelated content. | NN/g, Modal and nonmodal dialogs | Open the modal because setup is missing, not to advertise. No newsletter, survey or feedback ask inside it. |
| Modals are for "short, non-frequent tasks"; keep long content out; body scrolls with fixed header and footer; never scroll horizontally. | Carbon, Modal usage | Fixed header (title, close) and footer; body scrolls only on small screens. |
| Do not open a dialog from a dialog. | Atlassian, Modal dialog usage | Setup rows must not open another modal on top. Link to the page or expand inline. (See mistakes, section 8.) |
| Always include a header close button; Esc, outside click and a footer button also close; focus returns to the opener. | Atlassian, Modal dialog usage | Same four closing paths. |
| Initial focus goes to the first input, or the primary button if there is none; focus is trapped until close. | Carbon, Modal usage | Initial focus rule in section 7. |
| Dialog: Tab and Shift+Tab cycle inside; Escape closes; focus returns to the invoking element; `aria-modal="true"`; `aria-labelledby` points to a visible title; for long or structured content, focus may go to a static title. | WAI-ARIA Authoring Practices, Dialog (Modal) | Exact keyboard and ARIA contract. |
| Tabs: Tab lands on the active tab; Left/Right move between tabs (wrapping); Home/End optional; automatic activation is fine only when panels appear without delay; roles `tablist`, `tab`, `tabpanel`; `aria-selected`, `aria-controls`, `aria-labelledby`. | WAI-ARIA Authoring Practices, Tabs | Four tabs, static content, so use automatic activation. |
| Empty states: short copy, positive wording, no product jargon, a direct link or primary button for the next step, no dead ends; "onboarding flows are optional for users, therefore they need to be used in conjunction with basic empty states." | Carbon, Empty states pattern | Pair the modal with basic empty states (no project yet, no clip yet, no AI key yet) in the real screens. |
| Linear: low-commitment look first (demo or live session), then account, then role-specific reading. | Linear docs, Start guide | Order is "see what it is" cheaply, then setup. Tabs let people choose, so Set up first but not forced. |
| Zotero: the quick start is a feature map (Basics, Organize, Collect, Cite, Collaborate); browser connector gets one link and one sentence in Collect. | Zotero docs, Quick start guide | Confirms the pattern of a short map. Zotero hides connector install on another page; Researchie cannot, since the extension is the product's input. |
| Readwise Reader: the extension does two jobs (save, optionally highlight), is installed from the browser store, with shortcut `alt + R` named at once. | Readwise docs, Saving content (read through a search summary; page itself not opened) | Name the shortcut in the first use of the extension. |

---

## 3. Recommended tabs

Dialog title: **Welcome to Researchie** on first open, **How Researchie works** on reopen. Footer: one button. First open with setup missing: **Start setting up** (switches to the Set up tab if not already on it). Setup done or on reopen: **Close**. Header: title, setup status chip ("0 of 2 done", "2 of 2 done"), close button.

Budget for the whole dialog: about 450 words and 18 list items across all four tabs. Reason: JUDGEMENT, guided by Apple ("if you try to teach too much, people can feel overwhelmed") and Carbon ("keep copy short"). No source gives a number.

### Tab 1: Set up (the job: get the tester to a working product)

Content: about 80 words, 2 checklist rows, 1 test row. Each row is: status icon, one-line title, one sentence, one action, and one line saying what happens if skipped.

Draft copy:

- Heading: **Two things to do first**
- Intro line: "Researchie needs a Chrome extension to clip pages and an AI key to answer questions. Both take about three minutes."
- Row 1: **Install the Chrome extension**
  - "It adds the Save button, the block picker and the side panel to every page you read."
  - Action: **Get the extension** (opens the existing "Researchie for Chrome" dialog; see rule in section 8 about stacking).
  - Second action once installed: **Create token** (profile menu, Extension token), then paste it in the extension (link icon, then Connect).
  - If skipped: "You can still add clips by hand and read PDFs, but nothing arrives from the web."
- Row 2: **Add your AI key**
  - "Q&A and synthesis run on your own account with an AI provider. Groq has a free tier."
  - Action: **Open AI settings** (Settings, then AI Intelligence).
  - If skipped: "Ask AI and Synthesize will say 'Add your AI key in Settings to use this feature.'"
- Footer line of the tab: "Not sure it worked? Clip one sentence from any page, then press Ask AI in your project."
- Status updates live: row turns done when the check passes (section 6).

### Tab 2: What it is (the job: one idea, no marketing)

Content: about 90 words, 4 bullets.

- Heading: **A workbench for web research**
- Lead (one sentence): "Clip text, whole page blocks, images and links from any page into a project. Every clip keeps its source and a link back to the passage."
- Bullets:
  - **Clip** with the Chrome extension: a sentence, a table or card, an image, a link.
  - **Keep the source.** A text clip opens the original page scrolled and highlighted to the quote.
  - **Work in three views.** Feed, Canvas (a free-form board), Document (your own PDFs and Word files).
  - **Ask and cite.** Ask AI answers from your clips and points to them. Cite copies a reference in Vancouver, APA or AMA.
- Closing line: "It is in testing. Things will break; tell us what did." (Plain; no hype. Remove if the owner prefers.)

### Tab 3: Use cases (the job: let the reader find themselves)

Content: 5 cards of 2 lines each (about 130 words). Full detail is in section 4; the tab shows only "who" and "what you do". Do not show the steps on the card.

### Tab 4: How to use (the job: the shortest true path)

Content: 6 numbered steps, one line each (about 110 words), then a "Keys" strip of 4 shortcuts. Full detail is in section 5.

Why four tabs and not three or five: the four jobs the brief names map one to one to a tab, and the checklist is separated because it is the only part with state. More than five tabs would break the "one screen" budget. JUDGEMENT.

---

## 4. Use cases (5, each grounded in code or docs)

Each case lists who, steps with real labels, and built features used. "Built" is checked against `docs/CHANGELOG.md` and `docs/RESEARCH_TOOL_PRD.md` section 7.

### UC1. Literature notes for a thesis chapter
- Who: master's or PhD student in science or medicine (target user in `docs/STUDENT_NEEDS_RESEARCH.md`).
- Steps: create a project and a sub-project per chapter (**New Project Folder**, **Sub-Project**) then open it (**Open Folder**); on each paper page select a sentence and press **Send** (or Alt+S); open the project **Feed**; press **Cite** on a card; choose Vancouver, APA or AMA in the citation style bar.
- Uses: text clip with text-fragment link, projects and sub-projects, citation engine (DOI/PMID lookup, formats APA 7, AMA, NLM/Vancouver), retraction warning on the card.
- Evidence: PRD 7 "Citation engine"; `src/components/CitationStyleBar.tsx` (Vancouver, APA, AMA); `src/components/AtomCard.tsx` (Cite button, `retraction-warning`).

### UC2. Ask questions of your own reading
- Who: anyone with a pile of saved clips and a question.
- Steps: open the project; press **Ask AI**; type in "Ask a question about this workspace..."; read the answer and its citation chips; save the answer as a note.
- Uses: AI Q&A over clips with citations, conceptual search, note atoms. Needs the AI key.
- Evidence: `src/components/ResearchieAISidebar.tsx` (Ask AI, placeholder text); PRD 7 "Search and synthesis", "AI".

### UC3. Read a PDF and cite it correctly
- Who: student or analyst working from papers and reports they already have.
- Steps: switch the project to **Document**; upload a PDF or Word file; select text and highlight; ask a question about the document; open a citation to jump to the passage.
- Uses: Document Reader, document Q&A with verified citations, DOI mismatch check on PDFs.
- Evidence: PRD 7 "Document Reader"; `e2e/06-grounding-and-document-ai.spec.ts`, `e2e/12-pdf-doi-mismatch.spec.ts` exist. I did not open the upload dialog text; do not quote its labels in the modal until checked.

### UC4. Competitor teardown with real tables and screenshots
- Who: product or UX designer, market analyst (PRD section 6).
- Steps: press Alt+B on a pricing page, move the mouse over the table (Up arrow selects the parent, Down a child), click, choose the project; press Alt+C to crop a part of the screen (image clips get OCR text); open **Canvas** and group clips on the board; export the board as PNG, JPEG or SVG.
- Uses: block picker (cleaned HTML plus snapshot), image clip with OCR, Spatial Canvas, canvas export.
- Evidence: PRD 7 "Layout block picker"; `docs/CHANGELOG.md` v1.9.16 (canvas export "draws every shape type", PNG/JPEG/SVG).

### UC5. Turn clips into a draft with citations
- Who: analyst or student writing a memo, brief or review.
- Steps: select several cards in the **Feed**; open Ask AI and pick a Synthesize template (Literature Review Matrix, Comparative Analysis, PRD, Executive Brief, Key Takeaways); read the draft; save it as a note; press **Export** and choose PDF, Markdown, Obsidian, Notion or BibTeX.
- Uses: multi-clip synthesis with a citation per clip, incremental Obsidian and Notion export, PDF research report.
- Evidence: `src/components/ResearchieAISidebar.tsx` (template instructions); PRD 7 "Export"; Export button title "Export to PDF, Markdown, citations, or JSON" in `src/components/ProjectTimeline.tsx`.

### UC6. Share a project with a supervisor or teammate
- Who: a student with a supervisor; a small team.
- Steps: press **Share**; invite by email with a role (owner, editor, viewer) or make a link ("anyone can view" or "signed-in people can edit"); the other person sees it under "Shared with me".
- Uses: roles, share links, access requests. **Caveat: built and unit-tested (23 cases) but "not yet tried with two real accounts" per `docs/CHANGELOG.md` v1.9.9 and v1.9.10. `docs/RESEARCH_TOOL_PRD.md` section 7 still lists sharing under "Planned, not built" (stale; the changelog is newer). It only exists on the accounts deployment, and no email is sent.** Recommendation: include it only if the owner confirms a two-account test; otherwise list it as 5 cases and mention sharing under "Testing" with a "being tested" tag.

### Features to keep out of the modal
- Real-time collaboration, offline queue UI, two-way Notion sync: provisional or not built (`CLAUDE.md` Key decisions; PRD "Planned, not built").
- "Source health" as a dashboard or periodic check: not built. `docs/PILLAR_A_SOURCE_HEALTH_PLAN.md` says "plan, nothing built", and the changelog (v1.9.14, v1.9.15) says the runner and screens are parts A3 and A4 with nothing writing results yet. What is built: a retraction warning on a clip's citation card when its record shows a retraction (`AtomCard.tsx`, `RETRACTED_MESSAGE` in `src/lib/citations/verify.ts`). Say "warns on a retracted paper when you cite it", not "watches your sources".
- Google sign-in: built but switched on only when `NEXT_PUBLIC_GOOGLE_SIGNIN=true` (changelog v1.9.11). Not a feature to mention.
- Pricing: undecided (PRD section 10).

---

## 5. How to use: shortest true path from install to first cited answer

All labels below were read in the repo. Where a label is a tooltip, it says so.

1. **Download and load the extension.** Dashboard, top right, **Download extension** button (`DashboardHome.tsx`, aria-label "Download the Chrome extension"). In the dialog press **Download extension (.zip)**, right-click the zip and choose Extract All, keep the folder. In Chrome go to `chrome://extensions`, turn on **Developer mode**, press **Load unpacked**, pick the folder `researchie-extension` (the one containing `manifest.json`), then pin it from the puzzle-piece menu. (`GetExtensionModal.tsx`.) Note: Chrome Web Store install does not exist; this is a manual install and the dialog says "Installed by hand for now."
2. **Make a token.** In the web app open the profile menu, then **Extension token**, then **Create token**, then **Copy token**. On the tester site the token is "Shown once. Copy it now." (`ExtensionConnectionSettings.tsx`; the dialog text says the same.)
3. **Connect.** Click the Researchie icon, click the link icon next to the on/off switch (aria-label "Connect account"), paste in the **Token** box, press **Connect**. Status changes from "Not connected" (`extension/popup.html`).
4. **Add the AI key.** Sidebar bottom, **Settings** (title "Settings (⌘,)"), tab **AI Intelligence**, panel **AI provider and key**: pick a Provider (Groq is marked recommended), press **Get a free key**, paste it in **API key**, press **Save and connect**, then **Test connection**. (`SettingsModal.tsx`, `AiProviderSettings.tsx`.)
5. **Make a project.** Dashboard **New Project Folder**, then **Create Project** (`CreateProjectModal.tsx`). Open it with **Open Folder**.
6. **Clip.** On any web page select a sentence, press **Send** on the small pill or Alt+S. Other keys from the manifest: Alt+B block picker, Alt+C crop, Alt+P opens the assistant. (`extension/manifest.json`; link save is the popup's Link button per the PRD, and I did not find an Alt+L entry in the manifest, so do not print Alt+L or Alt+I as shortcuts until checked.)
7. **Ask.** In the project press **Ask AI**, type in "Ask a question about this workspace...", read the answer with its citation chips. Press **Cite** on a card to copy a reference; the style bar offers Vancouver, APA, AMA.

That is seven actions, five of them setup. In the modal, step 1 to 4 live in the Set up tab and steps 5 to 7 are the How to use tab (six short lines: make a project, clip, open the clip's source link, Ask AI, Cite, Export).

Speed check: the shortest path to a first cited answer is about 7 actions after sign-in. The slowest part is Chrome's developer-mode install; the existing dialog already covers it.

---

## 6. First-run checklist design

### Where each thing is set (VERIFIED-REPO)
- **AI key.** Settings modal, tab "AI Intelligence", component `AiProviderSettings` ("AI provider and key"). Route `PUT/POST/DELETE /api/settings/ai-key`; `GET` returns `{ configured, provider, model, last4, status: 'unchecked' | 'valid' | 'invalid', lastCheckedAt }`. Providers: Groq, Cerebras, OpenRouter, Google AI Studio (PRD 7 "AI"). The key is checked with the provider, encrypted (AES-256-GCM), and the browser sees only the last four characters.
- **Extension connection.** The web app makes a token in the profile menu, **Extension token** (`ExtensionConnectionSettings.tsx`, also under Settings, Account & Security). The extension takes the token only (it ends in the server address, no server field), checks it with the server, and stores it. `GET /api/auth/tokens` lists tokens with `lastUsedAt`; the server writes `last_used_at` each time a token is used (`src/lib/auth/server.ts` line 41).

### What the person sees when each is missing (VERIFIED-REPO)

| Missing | Where | Exact text |
| :-- | :-- | :-- |
| AI key not added | Any AI call, tester site | "Add your AI key in Settings to use this feature." (`src/lib/ai/userAi.ts`, code `NO_KEY`, with a link to get a Groq key) |
| AI key saved but unreadable | Same | "Your saved AI key could not be read. Add it again in Settings." |
| AI key rejected | Same | "Your AI provider rejected your key. Check or replace it in Settings." (code `INVALID_KEY`) |
| AI key, local mode | Settings, AI | "Local mode: AI uses the key set as GROQ_API_KEY in .env.local. On the tester site each person adds their own key here." |
| Extension not connected | Extension popup and side panel | Status "Not connected"; background reply "Not connected. Connect your account to use this." (`extension/background.js`) |
| Extension not connected, clip taken | Extension | Clip is queued; if too large: "Not connected, and this clip is too large to hold. Connect and clip it again." |
| Extension not installed | Web app | Nothing. No screen currently tells a new tester that the extension is missing. This is the gap the modal fills. |
| No AI key, Synthesize | `ResearchieAISidebar.tsx` | Shows the server's `error` string (line 597), so it is the same "Add your AI key" text. I did not trace the Ask AI path end to end. |

Note: with accounts off (local dev) a deterministic fallback runs without a key (PRD 7 "AI"), so on a local build the AI row should read as done or be hidden. The modal needs `authRequired` from `useAuth()` for that, as `AiProviderSettings` does.

### Detecting "done" without guessing
- AI key row is done when `GET /api/settings/ai-key` returns `configured: true` and `status !== 'invalid'`. Show "valid" only after Test connection returns success; `unchecked` should read "Saved, not tested".
- Extension row is done when `GET /api/auth/tokens` returns at least one token with `lastUsedAt` not null. The extension validates the token against the server on Connect (PRD 7.3), which is the first use. A created-but-unused token shows "Token made, not connected yet".
- Neither check can see whether the extension is installed before it has connected; the web page cannot detect an unpacked extension without extra code (Not verified: whether the extension injects a marker the page could read). Use "token used" as the only claim.
- Re-check on dialog open and when the tab regains focus (the tester comes back from Chrome or Settings). JUDGEMENT.

### Row design
Each row: status icon (empty circle, check, warning), title, one sentence, one button, one "if skipped" line. Do not color alone: add an icon and a word ("Done", "Not done", "Key rejected"). Atlassian: "Don't use color alone to show severity." Rows never reorder when done; they stay in place and show Done.

---

## 7. Modal behavior rules

| Topic | Rule | Source |
| :-- | :-- | :-- |
| When it opens | Automatically once per account, on the first visit to the dashboard after sign-in, not before sign-in and not over the sign-in page. Open after the dashboard has rendered. | Apple: onboarding "occurs after launching is complete". NN/g: modals only for relevant, critical missing info. |
| Open on which tab | **Set up** if either required row is not done, else **What it is**. | JUDGEMENT, from NN/g "critical missing information". |
| Re-prompt | Never auto-open again once dismissed, even if setup is still missing. Show the dashboard banner instead ("Finish setup: 1 of 2 done"). | Apple: "don't present it again on subsequent launches, but make sure it's easy for people to find." |
| Closing | Four ways: close button (X) in the header, Escape, click outside, footer button. The close button is mandatory. | Atlassian modal usage; Carbon "x icon, clicking outside, or Esc"; APG "Escape: Closes the dialog". |
| Initial focus | Put focus on the dialog title (a static element with `tabindex="-1"`), because the content is long and structured and has no input. APG allows this for long content. Carbon would pick the primary button when there is no input; both are defensible. If a user returns with setup missing, focus the title too. | APG Dialog (Modal); Carbon modal usage. |
| Focus trap | Tab and Shift+Tab cycle inside the dialog. Background is inert. Focus order: close button, tab list, panel, footer button. | APG; Atlassian ("header close button, main content, secondary button, then primary button"); Carbon. |
| Focus on close | Return focus to the element that opened it. On first auto-open there is no opener: return focus to the page heading (`h1`) or the **How it works** button. | APG: "focus returns to the element that invoked the dialog"; exceptions allowed when the opener is gone. |
| ARIA | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the visible title. Skip `aria-describedby` (content has lists). Use `h1`-level title inside. | APG Dialog (Modal); Atlassian ("Make the header title a level h1 heading"). |
| Tabs keyboard | `role="tablist"`, `tab`, `tabpanel`; `aria-selected`; `aria-controls`; panel `aria-labelledby` the tab. Tab enters the tab list on the active tab; Left/Right move between tabs and wrap; Home/End jump; automatic activation (panels are static). Tab again moves into the panel. | APG Tabs |
| Remember "seen" | Store on the server with the account (a field on the user's settings), not only in `localStorage`. The tester site is per-account and testers use more than one browser. Fall back to `localStorage` only in local mode. Record the version of the copy shown so a later rewrite can be re-offered on purpose. | JUDGEMENT. Repo note: `src/lib/settings/settingsContext.tsx` already persists settings in `localStorage` and keeps some on the server; follow whichever the AI-key and sharing state use for accounts. |
| Reopen | A permanent **How it works** button next to **Download extension** in the dashboard header (`DashboardHome.tsx`, the right-aligned row). Also a "How Researchie works" item in the profile menu. Reopening opens the last tab used (or Set up if incomplete). | Apple: "easy for people to find"; NN/g: "easy to find again later". |
| Length | Whole dialog: about 450 words, 4 tabs, at most 6 list items per tab. Body fits 640 by 480 px without scroll on a laptop. | JUDGEMENT. Carbon: scroll only when needed, move up a size if scrolling gets excessive. |
| Scrolling | Header and footer fixed, body scrolls vertically only. Never scroll horizontally. Fade the end of a scrolling body. | Carbon modal usage. |
| Mobile and narrow screens | Dialog fills the viewport width with a small margin; tabs become a horizontally scrollable tab strip or a segmented control that wraps to two lines; footer button full width. The product's main work needs desktop Chrome, so the Set up tab should say so ("Chrome, Edge or Brave on a computer", as `GetExtensionModal.tsx` already does) and not ask phone users to install anything. | Carbon says sizes are responsive and gives no mobile section; Atlassian likewise. NN/g warns a dismissible desktop prompt must not become a trap on mobile. The mobile layout itself is JUDGEMENT. |
| Reduced motion and scroll lock | Fade at most; respect `prefers-reduced-motion`. Lock page scroll behind the dialog. | JUDGEMENT. No primary source read for this. |
| Layering | No dialog may open another dialog. The Set up row for the extension should expand an inline panel or link to the existing "Researchie for Chrome" content rendered as the tab's own panel. | Atlassian: opening a dialog from a dialog is "inaccessible and confusing". |
| Content | No images required, no video, no marketing words. Icons are decoration (`aria-hidden`). Every step names the exact button label. | Carbon empty states: plain language, no jargon; `CLAUDE.md` copy rule. |

---

## 8. Mistakes to avoid

1. **A forced multi-card tour.** NN/g: "we don't recommend deck-of-cards onboarding"; tutorials are "dramatically overused" and users skip them.
2. **Re-showing it every login.** Apple: do not present a skipped tutorial again.
3. **Teaching the whole product.** Apple: "if you try to teach too much, people can feel overwhelmed."
4. **Listing planned or unverified features.** Real-time collaboration, offline queue UI, two-way Notion sync, a "source health dashboard" and Google sign-in are not live. Sharing is built but never tried with two real accounts (changelog v1.9.9, v1.9.10), while the PRD still says "planned". Check one source against the other before you write the card.
5. **Stacking dialogs.** The Set up row must not open the extension dialog on top of the onboarding dialog. Atlassian calls this "inaccessible and confusing".
6. **Reusing `ExtensionGuideModal.tsx`.** It is stale: it has the developer's hard-coded local path (`d:\product anatomy ...\extension`) and the older "Got it, Let's Research" copy. Use the content of `GetExtensionModal.tsx` (zip download, six steps) instead. Also `ExtensionGuideModal` has no `role="dialog"`, no `aria-modal` and no Escape handler. (VERIFIED-REPO, both files read.)
7. **Mixing up the two setup hand-offs.** The token is shown once on the tester site. If the modal creates it, make sure it is copyable at that moment and say "Shown once". Do not create tokens silently each time the modal opens. (`ExtensionConnectionSettings.tsx`.)
8. **Using color alone for done and not done.** Atlassian: "Don't use color alone to show severity."
9. **Vague buttons.** Carbon says to avoid "Done" or "OK". Use "Start setting up" and "Close", not "Got it".
10. **Putting the wrong setup claim in the UI.** Do not say "Extension installed" unless a token has been used. Say "Token created" or "Connected".
11. **Claiming source checking is a watch.** Only a warning on a retracted paper at citation time is built (see section 4).
12. **Asking for feedback, newsletters or ratings inside it.** NN/g: avoid nonessential content in modals; Apple: let people experience the product before prompting.
13. **Hiding the extension install behind a store link.** There is no store listing; testers install by hand. State "Installed by hand for now" so nobody searches the Chrome Web Store.
14. **Copy that sounds like marketing.** Use "Cite", "Ask AI", "Send", not "supercharge".

---

## 9. Sources (opened today unless noted)

- WAI-ARIA Authoring Practices, Dialog (Modal) Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- WAI-ARIA Authoring Practices, Tabs Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- Apple Human Interface Guidelines, Onboarding (page shell was blank; text read from the page's JSON feed at https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json); public page: https://developer.apple.com/design/human-interface-guidelines/onboarding
- Carbon Design System, Empty states pattern: https://carbondesignsystem.com/patterns/empty-states-pattern/
- Carbon Design System, Modal usage: https://carbondesignsystem.com/components/modal/usage/
- Atlassian Design System, Modal dialog usage: https://atlassian.design/components/modal-dialog/usage
- Nielsen Norman Group, Mobile-app onboarding: https://www.nngroup.com/articles/mobile-app-onboarding/
- Nielsen Norman Group, Onboarding tutorials vs. contextual help: https://www.nngroup.com/articles/onboarding-tutorials/
- Nielsen Norman Group, Modal and nonmodal dialogs: https://www.nngroup.com/articles/modal-nonmodal-dialog/
- Zotero, Quick start guide: https://www.zotero.org/support/quick_start_guide
- Linear docs, Start guide: https://linear.app/docs/start-guide
- Readwise docs, Saving content to Reader: https://docs.readwise.io/reader/docs/saving-content (summary from search results only)
- Notion Help Center: https://www.notion.com/help (search listing only)
- Repo (all read today): `PRODUCT_CONTEXT.md`, `docs/RESEARCH_TOOL_PRD.md`, `docs/CHANGELOG.md` (v1.9.9 to v1.9.16), `docs/PILLAR_A_SOURCE_HEALTH_PLAN.md` (header), `src/components/GetExtensionModal.tsx`, `ExtensionGuideModal.tsx`, `ExtensionConnectionSettings.tsx`, `AiProviderSettings.tsx`, `DashboardHome.tsx`, `SettingsModal.tsx`, `AtomCard.tsx` (retraction lines), `CitationStyleBar.tsx`, `ResearchieAISidebar.tsx`, `ProjectTimeline.tsx`, `src/lib/ai/userAi.ts`, `src/lib/auth/server.ts`, `extension/popup.html`, `extension/sidepanel.html`, `extension/background.js`, `extension/manifest.json`.

## 10. Could not verify

- **Material Design 3 dialogs** (https://m3.material.io/components/dialogs/guidelines): page returned only its title and topic list; no guidance text. Nothing from Material is used above. Same for Material and Google guidance on onboarding.
- **Notion first-party onboarding**: `https://www.notion.com/help/guides/get-started-with-notion` returned 404; only a search listing was read. No Notion claim is used.
- **Obsidian Getting started**: `help.obsidian.md/Getting+started` redirected to a "Not Found" page. No Obsidian claim is used.
- **Readwise Reader getting-started page** returned 404; the "alt + R" and extension facts come from a search-tool summary of the Saving content page, not the page itself. Treat as a lead.
- **GOV.UK** content guidance on modals/onboarding: not searched.
- **Apple HIG** page: the visible page was empty to the fetch tool; the JSON feed carried the text. The quotes come from that feed.
- **Alt+L and Alt+I shortcuts**: the PRD names them; `extension/manifest.json` lists only Alt+S, Alt+B, Alt+C, Alt+P and a "Hover and send page image" command without a key I could see. Do not print those two keys without checking `chrome://extensions/shortcuts`.
- **Whether the web page can detect the extension is installed** before a token is used: no code found that does it.
- **Where the "seen" flag should live** for an account (which table or settings route): not checked; `src/app/api/settings/route.ts` is the likely home.
- **Upload dialog and Document view labels** in `PDFReaderView.tsx`: not read for button text.
- **Ask AI with no key**: the Synthesize path shows the server error; the Ask AI path was not traced.
- **Sharing with two real accounts**: untested per changelog. **Retraction warning**: unit-tested and live-checked per changelog v1.9.15, not seen in the UI by me.
- **Word counts and the 450-word budget**: my judgement. No source gives a number for modal length. NN/g and Carbon say "short" without one.
