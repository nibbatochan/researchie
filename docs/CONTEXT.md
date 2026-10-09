# Current Project Context

> **Active Version:** `v1.6.0` (Direct Notion & Obsidian Sync Engine, Document Vault, PDF Reader, Auto-OCR & Spatial Canvas)  
> **Last Synced:** 2026-09-30  
> **Status:** All core modules (Extension, Web Workbench, PDF Reader & Vault, Auto-OCR, AI Assistant, Spatial Canvas, Notion & Obsidian Sync Engine) verified and active.

---

## 1. Running Services & URLs
- **Web Platform**: [`http://localhost:3001`](http://localhost:3001) (Next.js 15 dev server)
- **Local Test Lab & Gorilla Research Sandbox**: [`http://localhost:3001/sandbox/gorilla-research`](http://localhost:3001/sandbox/gorilla-research) & [`http://localhost:3001/test-lab`](http://localhost:3001/test-lab)
- **Chrome Extension Directory**: `extension/` (Manifest V3 with `sidePanel`, Content Scripts, and popup)

---

## 2. Feature Implementation Status Matrix

| Module | Status | Key Capabilities |
| :--- | :---: | :--- |
| **Notion & Obsidian Sync Engine** | ✅ Active | **Obsidian**: Multi-file ZIP Vault bundle with `[[wikilinks]]`, YAML frontmatter, Obsidian callouts (`[!quote]`, `[!note]`, `[!abstract]`), and direct `obsidian://new` URI launch. **Notion**: Direct 1-Click push to Notion pages/databases via Notion API (`/api/export/notion`), and Notion-optimized Markdown clipboard block copy. |
| **Chrome Extension (MV3)** | ✅ Active | Side Panel (`Alt+P`), Text Capture (`Alt+S`), DOM Block Picker (`Alt+B`), Screen Cropper (`Alt+C`), Image Picker (`Alt+I`), Link Capture (`Alt+L`), In-Browser Tab AI Briefs & Q&A. |
| **PDF Reader & Document Vault** | ✅ Active | Document Library Vault, High-DPI page canvas, PDF.js Official textLayer with `--scale-factor` glyph bounding, multi-column precision selection, static saved highlights, instant citation jumping, sub-project loading skeletons. |
| **OCR & Search Engine** | ✅ Active | Automatic background Tesseract OCR on imported images/clips, fully searchable OCR text across platform, search match highlighting with auto-expand in detailed view. |
| **AI Synthesis Suite** | ✅ Active | Grounded Doc Assistant with page citations, Timeline AI Assistant (~380px sidebar), PRD / Synthesis generator, and Semantic Vector Search (`/api/atoms/search`). |
| **Workspaces & Views** | ✅ Active | 3 core workspace modes: **Stream / Feed**, **Spatial Canvas**, and **Document Reader**. Mode selection is preserved across sub-project switches. |
| **Export Engine** | ✅ Active | Export to Obsidian Vault (.zip / .md), Notion (API Push / .md), Markdown (`.md`), Citations (APA / BibTeX `.bib`), and Raw JSON. |

---

## 3. Key Architecture & File Paths

- **Obsidian & Notion Exporters**: [`src/lib/export/obsidian.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/lib/export/obsidian.ts) & [`src/lib/export/notion.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/lib/export/notion.ts)
- **Notion Push API Endpoint**: [`src/app/api/export/notion/route.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/app/api/export/notion/route.ts)
- **Export Modal UI**: [`src/components/ExportProjectModal.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/ExportProjectModal.tsx)
- **PDF Reader & Viewer**: [`src/components/PDFReaderView.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/PDFReaderView.tsx) & [`src/components/CustomPDFViewer.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/CustomPDFViewer.tsx)
- **OCR Engine**: [`src/lib/ocr/ocrService.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/lib/ocr/ocrService.ts) & [`src/components/ImageAtomCard.tsx`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/components/ImageAtomCard.tsx)
- **Chrome Extension Source**: [`extension/sidepanel.js`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/extension/sidepanel.js), [`extension/content.js`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/extension/content.js), [`extension/manifest.json`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/extension/manifest.json)
- **AI Endpoints**: [`src/app/api/ai/qna/route.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/app/api/ai/qna/route.ts) & [`src/app/api/ai/synthesize/route.ts`](file:///d:/product%20anatomy%20-%20molecule%20community/projects/research%20tool/src/app/api/ai/synthesize/route.ts)
