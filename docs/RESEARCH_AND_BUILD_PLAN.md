# Research and build plan: from research to a product students want

Date: 2026-10-17. Inputs: `docs/RETRACTION_MECHANICS_RESEARCH.md` (how retraction checks really work), `docs/STUDENT_NEEDS_RESEARCH.md` (what students need), `docs/COMPETITOR_ANALYSIS.md`, `docs/PILLAR_A_SOURCE_HEALTH_PLAN.md` (now partly superseded by this file).

How to use this plan: we do one step at a time. Each step says what it is in plain words, who does it, and how we know it is done. Nothing is committed or pushed until you say so.

## What the research changed

1. **The strongest need is trust in what you write, not source watching alone.** The best evidence (AI invents citations in 18% to 91% of tests; about 1 in 4 medical citations misquotes its source) points to: "every quote and citation in your thesis is checked against its source." Researchie already does most of this.
2. **Zotero already shows retraction flags** (free since 2019, DOI and PMID items only). So retraction alerts help but cannot be the headline. Source health becomes the *proof* that backs the headline.
3. **Retraction checking works, but needs three sources, not two:** Crossref, OpenAlex and PubMed, and the wording must never say "this paper is fine".
4. **Page-change detection is the riskiest part and has the weakest evidence.** Big journal sites (NEJM, ScienceDirect) blocked our test bot, so "could not check" will be the common answer. It moves later.
5. **A new idea with real documents behind it:** universities (UCL, Oxford department, Monash, Open University, DCU) now require a written statement of AI use in the thesis. Nobody gives students a record to build it from. Demand from students is unproven.
6. **The question-first literature matrix has almost no evidence.** It stays a hypothesis until students confirm it.
7. **Nobody studied what students would pay.** Students expect free tools from their university. The business model is an open question.

## Proposed one-line position (to confirm with students)

"Every quote and citation in your thesis, checked against its source, and flagged if the source is later retracted."

If the interviews (step 1) say students do not feel this, we change it before building more.

## Steps

### Step 1. Talk to 5 to 10 students (you; I prepare)

- **Why:** the research found no data on what students feel day to day. Interviews decide the position cheaply before we build.
- **I do:** shorten the interview guide in `docs/STUDENT_NEEDS_RESEARCH.md` section 10 to one page you can print or message, plus a 3-minute survey link text.
- **You do:** find 5 to 10 science or medicine students writing a thesis (classmates, lab, seniors). Run the 30-minute interview. Ask for real recent examples, not opinions. Do not pitch Researchie until the last question.
- **Done when:** you have notes from at least 5 students and we score the two main ideas with the rule in the guide (keep an idea if 4 of 7 describe a real recent incident and a workaround).
- **Runs in parallel with steps 2 to 4.** Step 5 onward waits for this result.

### Step 2. Correct the old notes (me, small) — DONE 2026-10-17

- **Why:** the research found errors in `docs/CITATION_API_RESEARCH.md` that would mislead us later.
- **I do:** fix the four errors listed in `RETRACTION_MECHANICS_RESEARCH.md` section 11 (the `update-to` versus `updated-by` mix-up, the PubMed link name that does not exist, the label of D016440, the closed open question). Add a "superseded" note at the top of the Pillar A plan.
- **Done when:** the three docs agree with each other. No code change.

### Step 3. Make retraction checking correct and honest (me) — DONE 2026-10-17 (see CHANGELOG v1.9.15)

- **Why:** the code from A1 covers the main cases but misses some and says "clean", which overclaims.
- **I do (in `src/lib/citations/status.ts` and `lookup.ts`):**
  1. Add Crossref `removal` (704 notices) as a problem state.
  2. Add the PubMed "retracted and republished" and "corrected and republished" links as a "replaced" state.
  3. Detect when the clipped item is itself a retraction notice.
  4. Rename `clean` to "no issue found" and record which sources answered and the date.
  5. Add OpenAlex as a second retraction source (it caught 28 of 28 sample retractions where Crossref caught 26), checking the item type so notices are not flagged by mistake.
  6. Add saved test records for each case and tests.
- **You do:** create a free OpenAlex key (needed for real volume; keyless use is capped at about $0.10 a day shared per address) and put it in `.env.local` as `OPENALEX_API_KEY`. I will not touch that file.
- **Done when:** unit tests pass, and a live check of the 1998 Lancet paper, a corrected paper and a clean paper gives the right states from all three sources.

### Step 4. Settle two open questions (you decide, I help)

- **Reasons for retraction** ("fraud" or "honest error"): only in the Retraction Watch CSV (68.6 MB, updated daily). Its licence is not stated anywhere we found. Option A: ship without reasons. Option B: email Crossref for the licence in writing, then use it. I recommend A for now.
- **Cost model:** all lookups are free but rate-limited. Fine for testers; we revisit before public launch.

### Step 5. Show it on screen (me; only after step 1 confirms the direction)

- **Why:** a check nobody sees is worth nothing.
- **I do:** a runner that groups clips by source and checks them (retraction daily when a project is open); a small state mark on every clip card; a project "Source health" panel listing problems with the notice link, date and source named; a dashboard banner. Wording follows the table in `RETRACTION_MECHANICS_RESEARCH.md` section 12.2.
- **Done when:** the real 77-clip project shows correct marks, a deliberately retracted test paper shows a red mark, and `npm run verify` passes.

### Step 6. Carry the warning into your writing (me)

- **Why:** this is the part Zotero does not do: a retracted source flagged inside notes, AI answers and the exported report.
- **I do:** a visible note in Q&A answers, the PDF report, and Obsidian/Notion exports when a cited clip has a problem state.
- **Done when:** a retracted source shows a warning in all three places.

### Step 7. Prove "every quote checked" end to end (me; depends on step 1)

- **Why:** this is the likely headline. Today quotes are verified inside the Document Assistant only.
- **I do:** a thesis-level "proof report": every saved quote with its source, whether the exact words were found in the source, whether its citation is verified, and its health state. Open design questions go to you before I build.
- **Done when:** one real project produces a report a supervisor could check.

### Step 8. AI-use record (me; build only if students say they need the declaration)

- **Why:** several universities require it, no tool helps. Student demand is unproven, so this waits on step 1.
- **I do:** log each AI answer (tool, model, date, purpose, passages used, what you verified) and export a text block for the declaration page.

### Step 9. Page-change detection (later)

- **Why later:** weakest evidence, biggest technical risk (blocked sites, script-built pages, security risk of fetching addresses from our server).
- **If we build it:** robots.txt, honest user-agent, check every redirect, connect only to the validated address, treat 403/429/short pages as "could not check", two misses before "changed", and a "view archived copy" link for gone pages. Prefer running the check inside the extension for journal sites.

### Step 10. Make switching safe (later)

- **Why:** students will not move a half-written thesis. Needs Zotero import and a Word export with working references. Decide after step 1 and 7.

## What I will not do without your say

- Commit or push.
- Edit `.env.local` or any secret.
- Add features outside the steps above.

## Risks to keep in view

- A "trust" position can get nods and no payment. We have no price evidence. Ask the pay question in the interviews.
- Retraction data is never complete (Retraction Watch says many cases go unreported). The interface must never say "this paper is fine".
- Student-evidence gaps: no study on retraction-alert demand, willingness to pay, or supervisor tooling. Several percentages in the research file are marked UNVERIFIED because the source would not open.
