# Version Changelog

## [v1.6.0] — 2026-09-30 (Direct Notion & Obsidian Sync Engine)
### Added & Enhanced
- **Obsidian Knowledge Graph & Vault Engine (`obsidian.ts` & `ExportProjectModal.tsx`):**
  - **YAML Frontmatter & Metadata:** Full project frontmatter indexing titles, aliases, tags, creation dates, clip counts, and source references.
  - **Obsidian Callout Formatting:** Quotes formatted with `> [!quote]`, syntheses/notes with `> [!note]+`, abstract context with `> [!abstract]`, DOM blocks with `> [!example]`, and images with OCR callouts.
  - **Interactive Wikilinks:** Generates dynamic `[[wikilinks]]` linking quotes, project headers, sources, and categories into a navigable knowledge graph.
  - **Multi-File ZIP Vault Generation (`JSZip`):** 1-click generation and download of complete Obsidian Vault structure (`ProjectName.md` index, `Clips/` atom notes, `Sources/` bibliographies, and `.obsidian/app.json` configuration).
  - **Native Obsidian Deep Link:** 1-click "Open in Obsidian" action leveraging `obsidian://new?vault=...&name=...&content=...`.
- **Direct Notion Sync Engine (`notion.ts`, `/api/export/notion`, & `ExportProjectModal.tsx`):**
  - **Direct API Push Endpoint (`POST /api/export/notion`):** Pushes projects and all associated atoms into a target Notion Page or Database using Notion Integration tokens.
  - **Native Markdown-to-Notion Block & RichText Parser:** Converts raw markdown syntax (`### Headings`, `- Lists`, `**bold**`, `*italic*`, `` `code` ``, `> Quotes`) into real, native Notion blocks and text annotations rather than raw plain text markdown.
  - **Strict URL & Deep Link Sanitizer:** Ensures all citation URLs, bookmarks, and deep links conform strictly to Notion's API URL specifications.
  - **Hierarchical Block Transformer:** Translates research atoms into native Notion API blocks (Heading 1/2/3, Callouts with emojis, Quotes, Code snippets, Bookmarks, and Bulleted lists) with automatic 100-block chunking.
  - **Notion-Optimized Clipboard Exporter:** Instant 1-click formatted copy tailored for native Notion markdown paste.
  - **Persistent Settings:** Secure local caching of Notion integration tokens and parent page targets in `localStorage`.

---

## [v1.5.0] — 2026-09-30 (PDF Reader Engine, Document Vault, Auto-OCR, Precision Selection & Spatial Canvas)
### Added & Enhanced
- **PDF Reader & Knowledge Vault (`PDFReaderView.tsx` & `CustomPDFViewer.tsx`):**
  - **Official PDF.js TextLayer Integration:** Integrated `--scale-factor` and `--total-scale-factor` calculations with strict CSS glyph-metric bounds, eliminating multi-column selection overshoot and bleeding into adjacent sections.
  - **Document Vault & Library Skeleton:** Replaced blank/empty loading transitions with rich shimmer card skeletons for both Library and Reader views when switching sub-projects.
  - **Static & Aligned Highlights:** Completely removed pulsing animations from saved clips; added pixel-aligned border boundaries (`-webkit-box-decoration-break: clone`).
  - **Streamlined Selection Toolbar:** Floating selection pill displays only "Save Clip" with page number badge (`p. X`).
  - **Clean Clipboard Handling:** Sanitized selection text interceptor preventing phantom whitespace or DOM metadata on copy.
- **Automated Tesseract OCR Engine (`ocrService.ts` & `ImageAtomCard.tsx`):**
  - Instant background OCR triggered on any imported image or screen crop with extracted text stored in atom content.
  - OCR text is fully searchable across the platform with keyword match highlighting and detailed mode auto-expansion.
- **Workspace Navigation & State Continuity:**
  - Preserves active workspace mode (Feed / Canvas / Documents) when toggling between projects and sub-projects.
  - Streamlined extension sidepanel and popup with complete shortcut key list (<kbd>Alt+S</kbd>, <kbd>Alt+L</kbd>, <kbd>Alt+I</kbd>, <kbd>Alt+B</kbd>, <kbd>Alt+C</kbd>, <kbd>Alt+P</kbd>).

---

## [v1.4.0] — 2026-09-27 (Chrome Native Side Panel & Web Context Re-Builder)
### Added & Enhanced
- **Native Chrome Side Panel (`chrome.sidePanel`):**
  - Integrated persistent Chrome Side Panel (launched via `Alt+P` or popup header button) featuring **Live Feed**, **Page AI Interrogation**, **In-Browser Synthesis**, and **Quick Capture Hub**.
  - Enabled active tab text extraction, 1-click quote saving from AI briefs, and real-time synchronization with the local web API.
- **Context Re-Builder in Web Timeline (`AtomCard`):**
  - Built an accordion view for quote cards showing the surrounding preceding and following paragraphs cached from the original source.
  - Added smart context extraction in `extension/content.js` (`contextPrefix`, `contextSuffix`, `surroundingParagraphs`).
- **DOM Block Picker Tree Traversal (`blockPicker.js`):**
  - Enabled `ArrowUp` (select parent container) and `ArrowDown` (select child element) keyboard navigation during DOM element inspection (`Alt+B`).
- **Typography Alignment:**
  - Standardized font across extension UI, content scripts, and side panel to `Figtree` and `-apple-system`.

---

## [v1.3.0] — 2026-09-27 (Phase 3 AI Suite, Docked Split Assistant, Citations & Theme Refinement)
### Added & Enhanced
- **Docked Side-by-Side AI Assistant (`ResearchieAISidebar`):**
  - Designed a collapsible ~380px sidebar that dynamically shifts and shrinks the knowledge timeline to the left so users can view research clips and the assistant simultaneously.
  - **Ask AI:** Grounded conversational Q&A using semantic search, bottom-line key findings, and verbatim citation source links.
  - **Summarize & Synthesize:** Pre-configured synthesis templates (PRD / Spec Draft, Comparative Matrix, Executive Memo, Key Findings) with 1-click timeline card multi-selection.
- **Round Floating Action Button (FAB):**
  - Built a floating round launcher with the official two-path `researchie-ai-logo.svg` icon and a fast-access hover menu for *Ask AI* and *Summarize*.
- **Semantic Vector Search Engine (`/api/atoms/search`):**
  - Implemented 768-dimensional normalized dense vector projections with in-memory cosine similarity and lexical token weighting.
- **Citations & Bibliography Export Suite (`ExportProjectModal`):**
  - Added export formats for **Markdown (`.md`)**, **Citations (Markdown / APA standard / BibTeX `.bib`)**, and **Raw JSON**.
- **Design System & Typography Polish:**
  - Removed `Plus Jakarta Sans` and restored clean `Figtree` and system typography.
  - Subdued brand blue to purposeful accents (`#325FEC` / `#518FFF`), backed by deep neutral blacks (`#09090B`, `#121214`, `#18181B`, `#27272A`, `#FAFAFA`).
  - Scaled atom card padding to `p-6 md:p-7` with refined font hierarchy and neutral tag badges.

---

## [v1.2.4] — 2026-09-26 (Tag Focus Fix, Optional Field Labels & Localhost Recovery)
### Fixed & Improved
- **Text Selection Tag Form Stability:** Resolved selection event collision where clicking `# Tag` or the input collapsed selection and dismissed the pill; added `isTagFormOpen` state guard and container event isolation.
- **Universal "Optional" Placeholders:** Updated all tag input placeholders across text selection, image capture, screenshot cropping, DOM block picking, popup Page Brief, Q&A, and Platform Workbench to explicitly display `(optional)`.
- **Toast Cleanliness:** Removed tag UI from in-situ toasts so tagging happens strictly at the point of clicking.
- **Dev Server Recovery:** Restarted Next.js dev server on port 3000 resolving document cache collision from build process.

---

## [v1.2.3] — 2026-09-26 (Structured Executive Briefs & Universal Clip Tagging)
### Added
- **Universal Clip Tagging System:**
  - **Text Selection:** Added interactive `#` button on floating selection pill to tag quotes before send (`#pricing`, `#latency`), plus inline `+ #tag` badge in the 3-second toast for instant post-send tagging.
  - **Screen Area & Screenshots:** Added tag/title input field in screenshot confirmation dialog (`#pricing-table`, `Hero`).
  - **Web Image Selection:** Added confirmation modal with image preview and tag/name input field before submitting images to project.
  - **DOM Block Selection:** Added confirmation modal with tag info and label/tag input field before saving DOM containers.
  - **Page Brief & Q&A:** Added tag inputs to Page Brief and Q&A popup sections.
  - **Platform Workbench:** Rendered interactive `#tag` pills on all `AtomCard` components with 1-click `+ tag` inline editor and delete support via new `PATCH /api/atoms` endpoint.
- **Deep Executive Page Brief Engine:**
  - Replaced 3-bullet slice with structured multi-section brief containing **Executive Overview**, **Core Findings & Arguments**, **Key Metrics & Evidence**, and **Strategic Implications**.
  - Upgraded both `MockAIAdapter` and `GatewayAIAdapter` to extract grounded data points, percentages, dollar figures, and technical metrics from page text.

---

## [v1.2.2] — 2026-09-26 (Icon Polish, 4 Shortcuts & Selection Reliability)
### Fixed & Improved
- **Text Selection Send Icon:** Fixed coordinate calculations by targeting the last selected line's bounding client rect; attached window capture-phase listener so webpage scripts cannot suppress selection detection.
- **Plugin Icon Overhaul:** Replaced distorted SVG paths with crisp, high-precision vector icons across all 4 modes (Quotes for Text, Code tags for Block, Frame for Image, Crosshair Crop for Shot).
- **Popup Footer Reorganization:** Displayed all 4 mode shortcuts in a compact single line (`Alt+S text • Alt+B block • Alt+I image • Alt+C shot`) and relocated the Workbench link directly below it as a full-width action button.
- **All 4 Shortcuts Verified:** Wired `Alt+S`, `Alt+B`, `Alt+I`, and `Alt+C` across `manifest.json` commands, background worker, and in-page keyboard listeners.

---

## [v1.2.1] — 2026-09-26 (Phase 2 Bugfix & UX Refinement)
### Fixed
- **Duplicate Ingestion Multiplier:** Added strict singleton execution guards (`__RESEARCHIE_CROPPER_INJECTED__`, `__RESEARCHIE_BLOCK_PICKER_INJECTED__`) preventing multiple event listeners from submitting 5x duplicate atoms.
- **Screenshot Mode Hang:** Enhanced canvas teardown and event listener disposal so taking or canceling a screenshot promptly exits the cropper mode.
- **Live Undo Countdown:** Replaced static label with dynamic 1-second interval timer `Undo (3s)` → `Undo (2s)` → `Undo (1s)` across all in-situ toasts.
- **Block Preview Fidelity:** Injected `<base>` tags and resolved absolute stylesheet URLs to ensure captured DOM tables and grids render with identical styles.
- **Anti-AI-Slop Clean Pass:** Eliminated extraneous pulsing dots (`animate-ping`), tightened vertical paddings across Navbar (`h-12`), Sidebar (`w-64`), Timeline toolbar, and Atom Cards.

---

## [v1.2.0] — 2026-09-26 (Phase 2 MVP)
### Added
- **Visual DOM Block Picker** (<kbd>Alt+B</kbd>) with `<kbd>↑</kbd>`/`<kbd>↓</kbd>` keyboard traversal and HTML sanitization.
- **Screen Area Marquee Cropper** (<kbd>Alt+C</kbd>).
- **In-Popup Page Brief** (3-bullet instant summary) with 1-click `+ Send Summary to Platform`.
- **In-Popup Custom Q&A** with grounded answers and 1-click `+ Send Answer to Platform`.
- **Dual-View Block Cards** (`BlockAtomCard.tsx`) with sandboxed preview and formatted HTML tabs.
- **Image Atom Renderer** (`ImageAtomCard.tsx`) with modal zoom.
- **Dedicated Local Test Lab** at `/test-lab` and `test-lab.html`.

---

## [v1.0.0] — 2026-09-25 (Phase 1 MVP)
### Added
- Manifest V3 Chrome Extension core with Shadow DOM floating save pill and <kbd>Alt+S</kbd> hotkey.
- W3C Scroll-to-Text Fragment Engine (`src/lib/utils/textFragments.ts`).
- Next.js 15 Web Platform with Dark Theme (`#13151A`), Electric Lime (`#D2F83C`), and Space Grotesk/Figtree fonts.
- Chronological timeline stream with 3-second auto-sync heartbeat.
- 1-click Markdown citation copier and "Jump to Quote" navigation.

---

## [v0.1.0] — 2026-09-24 (Discovery)
### Added
- Product Requirements Document (`RESEARCH_TOOL_PRD.md`).
- 4 Note Types Specification (Text, Link, Image, DOM Block).
- Supabase PostgreSQL schema with RLS policies (`supabase/schema.sql`).
- Design System tokens and typography pairs (`design.md`).
