# Codebase Cleanup Report (Phase 3 Audit)

**Branch**: `cleanup/2026-10-09`  
**Date**: 2026-10-09  
**Protocol Reference**: `cleanup-prompt (1).md` — Phase 3

---

## 1. Summary of Findings

- **Total Source Files**: 119 files (Next.js app & Chrome Extension)
- **Total Lines of Code**: 34,775 LOC
- **Baseline Quality Checks**:
  - TypeScript Compilation: **0 errors** (Clean)
  - Next.js Production Build: **0 errors** (Clean, First Load 406 kB)
  - Playwright E2E Test Suite: **30 / 30 passed** (100% green across 6 suites)
  - Verify Command: Added `"verify": "tsc --noEmit && playwright test"` to `package.json`

### Key Anomalies & Opportunities Found
1. **Dead Code (Unreferenced Files)**:
   - `src/components/InlineClipInserter.tsx` (384 LOC): Exported component never imported or rendered anywhere in the application. Superseded by `src/components/ManualClipModal.tsx`.
   - `src/lib/cn.ts` (7 LOC): Classname utility wrapper importing `clsx` and `tailwind-merge`. Imported by 0 files in the codebase (the app directly uses template strings for Tailwind classes).
2. **Dual Icon Set & Unnecessary Dependency**:
   - The entire app uses `@phosphor-icons/react` across 28 components.
   - Exactly **1 file** (`src/components/PDFReaderView.tsx`) imports 2 icons from `lucide-react` (`FolderPlus` and `Check as LucideCheck`).
   - Phosphor already provides `FolderSimplePlus` and `Check`. Replacing these 2 icons completely eliminates `lucide-react` from the Next.js bundle!
3. **Redundant Code Duplication**:
   - `src/lib/utils/textFragments.mjs` (39 LOC): Legacy un-typed duplicate of the production `src/lib/utils/textFragments.ts` (103 LOC). Only referenced in a standalone script test `tests/textFragments.test.mjs`.
4. **Internal Exports Never Consumed Externally**:
   - Several pure functions inside `src/lib/export/notion.ts` (e.g. `isValidNotionUrl`, `sanitizeNotionLink`, `richText`, etc.) and `src/components/PDFReaderView.tsx` (`formatFileSize`, `normalizeDocFileSize`, `formatDocDate`) are marked with `export` even though they are only used locally within those single files.
5. **Independent Standalone Sub-app**:
   - `brand-ui-showcase/`: A separate Vite-based documentation/demo app with its own `package.json` and `node_modules` (not referenced or bundled by the Next.js app). Safe to preserve as-is.

---

## 2. Ranked Cleanup Opportunities by Impact

### High Impact / Low Risk (Candidate for Phase 4)
1. **Remove Dead Component `src/components/InlineClipInserter.tsx`**
   - **Impact**: Removes 384 lines of unmaintained dead code.
   - **Risk**: Zero (verified zero references across whole repo; `ManualClipModal.tsx` provides the live clip creation UI).
2. **Consolidate Dual Icon Sets (Replace `lucide-react` in `PDFReaderView.tsx` with `@phosphor-icons/react`)**
   - **Impact**: Unifies the entire codebase on `@phosphor-icons/react`. Drops `lucide-react` dependency and shrinks client bundle size.
   - **Risk**: Zero (visual appearance of `FolderSimplePlus` and `Check` matches existing Phosphor iconography).
3. **Remove Dead `src/lib/cn.ts` and Unused Dependencies (`clsx`, `tailwind-merge`)**
   - **Impact**: Removes 7 LOC and 2 unneeded dependencies from `package.json`.
   - **Risk**: Zero (zero source files import `src/lib/cn.ts`).

### Medium Impact / Low Risk (Candidate for Phase 4)
4. **Consolidate Legacy `textFragments.mjs` into `textFragments.ts`**
   - **Impact**: Eliminates duplicated 39 LOC fragment logic.
   - **Risk**: Very low (update `tests/textFragments.test.mjs` to import from `.ts` or remove legacy test script).
5. **Make Internal Exports Module-Private**
   - **Impact**: Clarifies module boundaries in `notion.ts` and `PDFReaderView.tsx`.
   - **Risk**: Zero (functions are already only called internally).

---

## 3. Risk Matrix

| Action | Lines Changed | Behavior Change Risk | Reversibility | Verification Method |
|---|---|---|---|---|
| Delete `InlineClipInserter.tsx` | -384 LOC | **Zero** (Unreferenced) | Easy (Git commit) | `npm run verify` (tsc + 30 e2e tests) |
| Remove `src/lib/cn.ts` | -7 LOC | **Zero** (Unreferenced) | Easy (Git commit) | `npm run verify` (tsc + 30 e2e tests) |
| Replace `lucide-react` in `PDFReaderView.tsx` | -2 LOC, +2 LOC | **Zero** (Phosphor drop-in) | Easy (Git commit) | Visual test + Suite 2 e2e |
| Remove `lucide-react`, `clsx`, `tailwind-merge` from `package.json` | -3 deps | **Zero** (None imported) | Easy (Git commit) | `npm run build` + `npm run verify` |
| Consolidate `textFragments.mjs` | -39 LOC | **Very Low** | Easy (Git commit) | `npm run verify` |

---

## 4. Proposed Phase 4 Execution Plan (Pending User Approval)

Each change will be executed independently in its own separate commit with `npm run verify` run after every single change:

- **Commit 4.1**: `refactor: consolidate icon set to phosphor in PDFReaderView`
  - Replace `FolderPlus` and `LucideCheck` with Phosphor icons in `src/components/PDFReaderView.tsx`.
  - Remove `"lucide-react"` from `package.json`.
  - Run `npm run verify`.
- **Commit 4.2**: `chore: remove unused InlineClipInserter component`
  - Delete `src/components/InlineClipInserter.tsx`.
  - Run `npm run verify`.
- **Commit 4.3**: `chore: remove unreferenced cn utility and unused helper dependencies`
  - Delete `src/lib/cn.ts`.
  - Remove `"clsx"` and `"tailwind-merge"` from `package.json`.
  - Run `npm run verify`.
- **Commit 4.4**: `refactor: deduplicate textFragments legacy script`
  - Update `tests/textFragments.test.mjs` or point to `textFragments.ts`, remove `textFragments.mjs`.
  - Run `npm run verify`.

---

> [!IMPORTANT]
> **HARD STOP GATE (Phase 3 Complete)**  
> No destructive changes, deletions, or Phase 4 edits have been made.
> In accordance with the protocol, execution is now paused awaiting your explicit sign-off on the items above.
