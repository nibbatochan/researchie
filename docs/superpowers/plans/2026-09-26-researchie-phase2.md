# Researchie — Phase 2 Implementation Plan

> **Objective:** Build Phase 2 features (In-Situ DOM Block Picker, Marquee Area Cropper, Pluggable AI Summarization/Q&A, Pluggable Storage Layer, and Web Platform Rich Renderers) following the Superpowers test-driven, modular pattern.

---

## Proposed Changes

### Layer 1: Pluggable AI & Storage Infrastructure (Backend & Shared)
1. `src/lib/ai/types.ts`: Type contracts for AI summaries, page Q&A, and citation extractions.
2. `src/lib/ai/service.ts`: Pluggable AI dispatcher selecting Gateway / Gemini / OpenAI / Mock adapter.
3. `src/lib/ai/adapters/gateway.ts`: Vercel AI Gateway adapter.
4. `src/lib/ai/adapters/gemini.ts`: Google Gemini 1.5 Flash adapter.
5. `src/lib/ai/adapters/mock.ts`: Fast deterministic fallback adapter.
6. `src/lib/storage/service.ts`: Storage provider (Supabase Storage bucket `research-assets` + local base64 fallback).
7. `src/app/api/ai/summarize/route.ts`: API endpoint for page summarization.
8. `src/app/api/ai/qna/route.ts`: API endpoint for grounded in-situ Q&A with citation extraction.

### Layer 2: In-Situ Chrome Extension Tools
1. `extension/blockPicker.js`: Interactive DOM element highlighter, `<kbd>↑</kbd>`/`<kbd>↓</kbd>` keyboard navigation, and HTML sanitizer.
2. `extension/cropper.js`: Canvas marquee area screen cropper.
3. `extension/qnaDrawer.js`: In-situ Shadow DOM slide-out Q&A drawer with instant chat, 3-bullet summary, and 1-click project ingestion.
4. `extension/content.js`: Updated to orchestrate text, block, image, and Q&A modes.
5. `extension/popup.js`: Wire up mode buttons to activate Block and Image tools.

### Layer 3: Web Platform Rich Card Components
1. `src/components/BlockAtomCard.tsx`: Interactive sandboxed preview + raw sanitized HTML code viewer.
2. `src/components/ImageAtomCard.tsx`: Image preview with zoom modal and source backlink.
3. `src/components/AtomCard.tsx`: Route atom rendering to dedicated subcomponents based on type.

---

## Verification Plan

1. **Unit Tests**:
   - `tests/htmlSanitizer.test.mjs`: Test script tag stripping and style preservation.
   - `tests/aiService.test.mjs`: Verify AI summary and Q&A response formats with citation chunks.
2. **Next.js Production Build**:
   - `npm.cmd run build` to ensure 0 TypeScript / lint errors.
3. **Live End-to-End Verification**:
   - Test DOM block capture on a live complex webpage (e.g. GitHub table / Stripe pricing).
   - Test AI summarization and Q&A on a live article.
