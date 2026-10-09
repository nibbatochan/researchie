# Cleanup Notes & Baseline Metrics

**Branch**: `cleanup/2026-10-09`  
**Date**: 2026-10-09  
**Protocol Reference**: `C:\Users\suman\Downloads\cleanup-prompt (1).md`

---

## 1. Phase 0: Reconnaissance

### Architecture Map
- **Framework**: Next.js 14.2.5 (React 18.3.1, TypeScript 5.5.4, Tailwind CSS 3.4.7)
- **Extension**: Manifest V3 Chrome Extension (`extension/manifest.json`, `extension/background.js`, `extension/content.js`, `extension/sidepanel.js`)
- **Backend / Database**: Supabase (`@supabase/supabase-js` v2.45.0)
- **AI Integrations**: Google Gemini API (`@google/genai` v0.1.1, `@google/generative-ai` v0.16.0)
- **PDF & Canvas**: `pdfjs-dist` (v3.11.174), Lucide React & Phosphor React icons, Framer Motion

### Codebase Size
- **Total Files**: 119 source files (excluding `node_modules`, `.next`, and static test PDFs)
- **Total Lines of Code**: 34,775 LOC

### Top 15 File Hotspots
| File | LOC | Role / Responsibility |
|---|---|---|
| `src/components/PDFReaderView.tsx` | 2,086 | PDF viewer, canvas rendering, text layer selection, search & in-situ highlights |
| `src/components/ResearchCanvas.tsx` | 2,009 | Infinite 2D research canvas, card nodes, connector lines, zoom/pan |
| `extension/sidepanel.css` | 1,503 | Stylesheet for Chrome extension sidepanel |
| `src/components/ResearchieAISidebar.tsx` | 1,322 | Grounded AI research assistant chat sidebar with citations |
| `extension/sidepanel.js` | 1,283 | Extension sidepanel interaction and capture workflow |
| `extension/content.js` | 1,185 | Extension DOM element capture, visual screenshot taker, atom creator |
| `src/components/ProjectTimeline.tsx` | 1,007 | Project feed stream, bento grid layout, search, filter tags, date picker |
| `src/components/DashboardPage.tsx` | 991 | Main application dashboard shell, modal orchestrator, state coordinator |
| `src/components/MarkdownWorkspace.tsx` | 936 | Document editor, live markdown preview, AI summary generation |
| `src/components/ArticleReaderModal.tsx` | 929 | Distraction-free article reader, annotation highlights, source link viewer |
| `src/components/BlockAtomCard.tsx` | 813 | Bento card renderer for HTML/DOM captures, shadow DOM iframe preview |
| `src/components/DocumentAIView.tsx` | 746 | Multi-document AI question-answering with citation page jumps |
| `src/components/CanvasAIAgentModal.tsx` | 704 | Canvas AI assistant modal for layout grouping & clustering |
| `src/components/SettingsModal.tsx` | 651 | User settings, API key manager, local storage toggles, preferences |
| `src/components/HighlightAtomCard.tsx` | 557 | Bento card renderer for quote snippets, color tags, source links |

---

## 2. Phase 1: Baseline Metrics

### TypeScript Compilation (`npx tsc --noEmit`)
- **Status**: Passed (0 errors, clean)

### Production Build (`npm run build`)
- **Status**: Passed (0 errors)
- **Output Routes & Sizes**:
  - `/` : 212 kB (First Load JS: 406 kB)
  - `/_not-found` : 871 B (First Load JS: 88 kB)
  - `/login` : 7.92 kB (First Load JS: 161 kB)
  - `/share/[projectId]` : 6.7 kB (First Load JS: 160 kB)
- **Static Assets**: All bundled without circular dependency warnings.

### Lint Check
- **Status**: ESLint is not currently present in `devDependencies`. Left uninstalled per Hard Rule 5 (no unrequested dependencies).

### Playwright E2E Suite (`npx playwright test`)
- **Execution Target**: `http://localhost:3001`
- **Total Specs**: 6 files
- **Total Test Cases**: 30 tests
- **Result**: 30/30 passed (100% green baseline, execution time: 1.5m).

---

## 3. Phase 5: Final Verification & Results

### Changes Applied in Phase 4
1. **Commit `87724e1`**: `refactor: consolidate icon set to phosphor in PDFReaderView`
   - Replaced `FolderPlus` and `LucideCheck` with `@phosphor-icons/react` icons in `PDFReaderView.tsx`.
   - Removed `lucide-react` from `package.json`.
2. **Commit `26e9039`**: `chore: remove unused InlineClipInserter component`
   - Deleted dead `InlineClipInserter.tsx` (-384 LOC).
3. **Commit `c5c0af6`**: `chore: remove unreferenced cn utility and unused dependencies`
   - Deleted dead `src/lib/cn.ts` (-7 LOC).
   - Removed unused packages `clsx` and `tailwind-merge` from `package.json`.
4. **Commit `718b23c`**: `refactor: deduplicate legacy textFragments script`
   - Deleted legacy duplicate `src/lib/utils/textFragments.mjs` (-39 LOC) and legacy ad-hoc `tests/textFragments.test.mjs` (-21 LOC).

### Final Metrics Comparison
| Metric | Baseline (Phase 1) | Post-Cleanup (Phase 5) | Delta |
|---|---|---|---|
| **Files in `src/`** | 119 files | 117 files | **-2 files** |
| **Dead Files Deleted** | 0 | 4 files (`src/components/InlineClipInserter.tsx`, `src/lib/cn.ts`, `src/lib/utils/textFragments.mjs`, `tests/textFragments.test.mjs`) | **-4 files total** |
| **Net LOC Reduction** | 0 | -451 LOC | **-451 lines** |
| **Unneeded Dependencies** | 3 (`lucide-react`, `clsx`, `tailwind-merge`) | 0 | **-3 dependencies** |
| **Icon Set Uniformity** | Dual (`@phosphor-icons/react` + `lucide-react`) | Single (`@phosphor-icons/react`) | **100% unified** |
| **TypeScript Compilation** | 0 errors | 0 errors | **Clean** |
| **Production Build** | 406 kB First Load JS | 405 kB First Load JS | **-1 kB** |
| **Verification Suite (`npm run verify`)** | 30/30 passed | 30/30 passed (Run 1, Run 2, Run 3 all green) | **3x consecutive clean** |

