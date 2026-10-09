# Researchie Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Phase 1 MVP of Researchie — connecting a Manifest V3 Chrome Extension (in-situ Shadow DOM highlight pill, W3C text fragment generator, link saver) with a Next.js 15 Web Platform backed by Supabase Cloud (PostgreSQL + RLS + Projects Dashboard + Chronological Research Timeline).

**Architecture:** The Chrome Extension captures text and link clips inside an isolated Shadow DOM container, generates W3C deep-scroll text fragments (`#:~:text=start,end`), and dispatches them via background service worker to the Next.js API. The Next.js API persists the data into Supabase Cloud PostgreSQL, and the frontend renders a reactive chronological project timeline with 1-click quote deep-links.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, `@supabase/supabase-js`, `@supabase/ssr`, Lucide React, Chrome Manifest V3.

**Spec:** [docs/superpowers/specs/2026-09-25-researchie-phase1-design.md](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/docs/superpowers/specs/2026-09-25-researchie-phase1-design.md)

## Global Constraints

- Manifest V3 standard for Chrome Extension; no legacy V2 APIs.
- Floating in-page extension pill MUST use isolated Shadow DOM (`mode: 'open'`) to prevent host-site CSS pollution.
- Provenance links MUST follow the W3C Scroll-to-Text Fragment standard (`#:~:text=start,end`).
- Supabase Cloud Project URL: `https://YOUR-PROJECT-REF.supabase.co`.
- All database tables MUST have Row Level Security (RLS) enabled.
- No third-party heavy dependencies; DRY, type-safe, and self-contained.

---

### Task 1: Environment & Project Scaffolding with Supabase Dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `.env.local`

**Interfaces:**
- Consumes: Supabase Project Credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Produces: Runnable Next.js 15 app environment with Tailwind and Supabase SDKs

- [ ] **Step 1: Write `package.json` with Next.js 15, Tailwind, Lucide, and Supabase packages**

```json
{
  "name": "researchie",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.48.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "15.1.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Write configuration files (`tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`)**
- [ ] **Step 3: Write `.env.local` with verified Supabase credentials**

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

- [ ] **Step 4: Install dependencies using `npm.cmd install`**
- [ ] **Step 5: Verify installation success**

---

### Task 2: Supabase Database Schema & Migration Script

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: Production SQL migration for `profiles`, `projects`, `atoms`, and RLS security policies

- [ ] **Step 1: Write `supabase/schema.sql`**

```sql
-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#3B82F6',
  tags TEXT[] DEFAULT '{}',
  atom_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

-- 3. Atoms Table (Captured Research Clips)
CREATE TABLE IF NOT EXISTS public.atoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'link')),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  user_notes TEXT DEFAULT '',
  captured_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.atoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own atoms" ON public.atoms FOR ALL USING (auth.uid() = user_id);
```

- [ ] **Step 2: Provide instructions for executing in Supabase SQL editor**

---

### Task 3: Shared TypeScript Types & W3C Text Fragment Engine

**Files:**
- Create: `src/lib/types/research.ts`
- Create: `src/lib/utils/textFragments.ts`
- Create: `src/lib/cn.ts`
- Create: `tests/textFragments.test.mjs`

**Interfaces:**
- Produces: `generateTextFragment(text, prefix, suffix): string`, `buildDeepLink(sourceUrl, fragment): string`
- Produces: `ResearchProject`, `ResearchAtom`, `ContentPayload`, `ProvenanceMetadata`

- [ ] **Step 1: Write failing unit test `tests/textFragments.test.mjs`**

```javascript
import assert from 'node:assert';
import { generateTextFragment, buildDeepLink } from '../src/lib/utils/textFragments.js';

// Test 1: Short text
const short = generateTextFragment("Hello world");
assert.strictEqual(short, "#:~:text=Hello%20world");

// Test 2: Long text (takes start and end phrases)
const long = generateTextFragment("Frontier AI models exhibit quadratic memory bandwidth pressure during inference");
assert.ok(long.includes("#:~:text=Frontier%20AI%20models,pressure%20during%20inference"));

// Test 3: Deep link builder
const link = buildDeepLink("https://example.com/article", "#:~:text=Hello%20world");
assert.strictEqual(link, "https://example.com/article#:~:text=Hello%20world");

console.log("All text fragment unit tests passed!");
```

- [ ] **Step 2: Run test to verify it fails before implementation**
- [ ] **Step 3: Implement `src/lib/types/research.ts` and `src/lib/utils/textFragments.ts`**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 4: Supabase Client & Server SDK Helpers

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

**Interfaces:**
- Produces: Browser Supabase client `createClient()` and server-side Supabase client for API routes

- [ ] **Step 1: Implement `src/lib/supabase/client.ts` using `@supabase/ssr`**
- [ ] **Step 2: Implement `src/lib/supabase/server.ts` with cookie-based session management**
- [ ] **Step 3: Verify Supabase client connects to project URL `https://YOUR-PROJECT-REF.supabase.co`**

---

### Task 5: Backend API Routes for Projects & Atoms

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/atoms/route.ts`

**Interfaces:**
- `GET /api/projects`: Returns list of user projects
- `POST /api/projects`: Creates a new project
- `GET /api/atoms?projectId=xxx`: Returns atoms for a project
- `POST /api/atoms`: Ingests an atom from extension/web, auto-generates text fragment, increments project `atom_count`
- `DELETE /api/atoms?id=xxx`: Deletes an atom and decrements project `atom_count`

- [ ] **Step 1: Write `src/app/api/projects/route.ts` (GET, POST)**
- [ ] **Step 2: Write `src/app/api/atoms/route.ts` (GET, POST, DELETE)**
- [ ] **Step 3: Test API routes using Node fetch script**

---

### Task 6: Manifest V3 Chrome Extension (Shadow DOM & In-Situ Pill)

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/content.js`
- Create: `extension/icons/icon16.png`, `icon48.png`, `icon128.png`

**Interfaces:**
- Produces: Manifest V3 content script attaching isolated `#researchie-host` Shadow DOM floating pill on selection $\ge 3$ characters, keyboard shortcut <kbd>Alt+S</kbd>, and animated confirmation toast.

- [ ] **Step 1: Write `extension/manifest.json` with permissions (`activeTab`, `storage`, `contextMenus`)**
- [ ] **Step 2: Implement `extension/content.js` with isolated Shadow DOM pill and W3C text fragment generator**
- [ ] **Step 3: Generate extension icons**

---

### Task 7: Manifest V3 Background Service Worker & Popup

**Files:**
- Create: `extension/background.js`
- Create: `extension/popup.html`
- Create: `extension/popup.css`
- Create: `extension/popup.js`

**Interfaces:**
- Produces: Context menu listeners (*"Save selection to Researchie"*, *"Save page link to Researchie"*), offline sync queue in `chrome.storage.local`, active project dropdown selector, and "Save Current Page" action.

- [ ] **Step 1: Write `extension/background.js`**
- [ ] **Step 2: Write `extension/popup.html` and `extension/popup.css`**
- [ ] **Step 3: Write `extension/popup.js` to sync active project and trigger clips**

---

### Task 8: Web Platform Frontend (Dashboard & Chronological Timeline)

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/components/Navbar.tsx`
- Create: `src/components/ProjectList.tsx`
- Create: `src/components/ProjectTimeline.tsx`
- Create: `src/components/AtomCard.tsx`
- Create: `src/components/CreateProjectModal.tsx`
- Create: `src/components/ExtensionGuideModal.tsx`

**Interfaces:**
- Produces: Complete research workbench with active project switcher, reverse-chronological card stream, "Jump to Quote" deep-link button, Markdown citation copier, search filter, and manual clip addition drawer.

- [ ] **Step 1: Implement `src/app/globals.css` and `src/app/layout.tsx`**
- [ ] **Step 2: Implement `AtomCard.tsx` and `ProjectTimeline.tsx`**
- [ ] **Step 3: Implement `Navbar.tsx`, `ProjectList.tsx`, and `CreateProjectModal.tsx`**
- [ ] **Step 4: Implement main dashboard `src/app/page.tsx` with 3-second auto-sync polling**

---

### Task 9: End-to-End Build & Live Verification

- [ ] **Step 1: Run `npm.cmd run build` to verify TypeScript and Next.js compilation**
- [ ] **Step 2: Start Next.js dev server on `http://localhost:3000`**
- [ ] **Step 3: Load unpacked extension in Chrome and verify text capture on an external webpage**
- [ ] **Step 4: Confirm clip appears on the web timeline and "Jump to Quote" navigates directly to highlighted sentence**
