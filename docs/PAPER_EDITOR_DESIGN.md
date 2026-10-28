# Paper editor design (S-150)

Status: design note, 2026-10-22. Written before any code, per SCOPE.md S-69. Two Sonnet builds follow (C1, C2).
Inputs: `docs/research/paper-mode-workspace.md` sections 2, 4, 5 and 8; SCOPE.md S-147 to S-153; `docs/PAPER_WRITING_DECISIONS.md` D16 and D20 to D23; `docs/DECISIONS.md` decisions 37, 40, 41; the paper code under `src/lib/paper/`, `src/lib/data/papers.ts` and the paper components.

The owner already approved the scope: a Word-style TipTap editor over the template structure, a content sidebar, section add, remove and reorder, a front-matter panel, header and footer zones with tokens, a CSS page sheet, citations as a node that keeps the `[@key]` model, a references page, import of old outlines, a fast open after create, and autosave. Not in v1: DOCX export, collaboration, tracked changes, paged.js, Chicago notes.

## 1. Dependencies

Checked on the npm registry on 2026-10-22 with `npm view <pkg> version license peerDependencies`. Every TipTap package is on 3.32.0, published 2026-10-13. The repo has React 19.3.1, Next 15.5.28 and KaTeX 0.16.11 installed.

| Package | Version | Licence | Peer range that matters | Why |
|---|---|---|---|---|
| `@tiptap/react` | 3.32.0 | MIT | react, react-dom `^17 \|\| ^18 \|\| ^19` | React bindings: `useEditor`, `EditorContent`, `ReactNodeViewRenderer`. |
| `@tiptap/pm` | 3.32.0 | MIT | none | ProseMirror packages, pinned by TipTap (includes `prosemirror-tables`). Peer of every extension. |
| `@tiptap/starter-kit` | 3.32.0 | MIT | pulls `@tiptap/core`, `@tiptap/extensions` | Paragraph, headings, lists, bold, italic, underline, link, undo, drop cursor, gap cursor. Disable `blockquote`, `codeBlock`, `code`, `strike`, `horizontalRule`. |
| `@tiptap/extensions` | 3.32.0 | MIT | `@tiptap/core`, `@tiptap/pm` | Imported directly for `Placeholder` (shows the template hint in an empty section). Already a dependency of starter-kit; list it so the import is explicit. |
| `@tiptap/extension-table` | 3.32.0 | MIT | `@tiptap/core`, `@tiptap/pm` | Tables (`TableKit`, subpath `./kit`). |
| `@tiptap/extension-mathematics` | 3.32.0 | MIT | `katex ^0.16.4 \|\| ^0.17 \|\| ^0.18` | Inline and display maths with the KaTeX we already ship. Keep `katex` on `^0.16`: npm `latest` is 0.19.0, outside this peer range. |
| `@tiptap/extension-subscript` | 3.32.0 | MIT | `@tiptap/core`, `@tiptap/pm` | Subscript; chemistry and statistics need it (research 2.2: "allow sub/superscript"). |
| `@tiptap/extension-superscript` | 3.32.0 | MIT | same | Superscript. |
| `dompurify` | 3.4.17 | MPL-2.0 OR Apache-2.0 (not MIT) | none | **Added by S-151, not by S-150.** Browser-side sanitiser for pasted HTML. Use it under Apache-2.0. Listed here so the owner sees the one non-MIT licence early. |

Left out on purpose:

- `@tiptap/extension-drag-handle(-react)`: its peer list includes `@tiptap/extension-collaboration`, `@tiptap/y-tiptap` and `@tiptap/extension-node-range`. That pulls the collaboration stack for one handle. Section moves go through the outline panel instead (section 5).
- `@tiptap/extension-image`: it stores `src` in the document, which invites base64. Figures are our own node that stores a clip id (section 2.4).
- `@tiptap/extension-character-count`: counts the whole document. The word limit must skip the abstract, references and the Unplaced bin, so a pure `wordCount(doc)` does it.
- `@tiptap/extension-placeholder` as its own package: it is a thin re-export of `@tiptap/extensions`.
- dnd-kit: not needed for v1 (section 5 uses buttons).

**Server rendering.** TipTap's Next.js guide (fetched by the research note, section 4.2) says to use `'use client'` and `immediatelyRender: false`. Do both. Also load the editor component with `next/dynamic(() => import('./PaperEditor'), { ssr: false })` so ProseMirror and KaTeX stay out of the first page bundle. Set `shouldRerenderOnTransaction: false` in `useEditor` explicitly (I did not verify the v3 default) and read editor state through `useEditorState` selectors, so typing does not re-render the sidebar.

UNVERIFIED: the exact v3 node names and attributes exported by `@tiptap/extension-mathematics` (I expect `InlineMath` and `BlockMath` with a `latex` attribute; the registry readme was empty). C1 checks the package types before writing the schema.

## 2. The document model

### 2.1 Where things live

| Column | Holds | Why |
|---|---|---|
| `papers.title` | The file name in the workspace | Already exists; the list shows it. |
| `papers.template_id`, `citation_style`, `project_id` | As today | Already exist. |
| `papers.doc` | `{ v: 1, pm: <ProseMirror JSON> }` | The body: sections, text, citations, quotes, figures, tables, maths, the Unplaced bin. |
| `papers.meta` | `{ v: 1, venue, wordLimit, front, page, cites, manualRefs, importedFrom? }` | Everything that is not body text. `venue` and `wordLimit` are already written by the wizard. |

`v` is the schema version in each column. A pure `upgradeDoc(raw)` and `upgradeMeta(raw)` run on load. Version 1 treats a missing `v` as `{}` (a new paper) and builds the doc from the template. Any later schema change adds a step to these functions and never rewrites stored rows in bulk.

### 2.2 Schema

Nodes (names are final; C1 uses them as written):

| Node | Group, content | Attributes | Notes |
|---|---|---|---|
| `doc` | `section+ unplaced?` | none | A paper always has at least one section. |
| `section` | `sectionHeading block*` | `id` (string), `key` (template key or `custom-<id>`), `locked` (bool), `point` (string, not printed), `done` (bool), `aiAssisted` (bool) | One per main heading. Moved as a whole. |
| `sectionHeading` | `text*`, no marks | none | The level-1 heading. When `section.locked` is true, a ProseMirror `filterTransaction` refuses changes inside it; renaming goes through the outline panel (section 5). |
| `paragraph`, `heading` (levels 2 and 3), `bulletList`, `orderedList`, `listItem` | block | StarterKit defaults | Template sub-headings (level 2 in `templates.ts`) become ordinary `heading` level 2 nodes the writer may delete. |
| `quote` | block, `text*` with marks `italic` only | `clipId`, `page` (string or null) | Words copied from a quote clip. The citation marker is drawn after it from the cite map, never typed. |
| `clipNote` | block atom | `clipId` | An AI summary placed in the text. Shown in amber as "rewrite this from the source". Printed as nothing; blocks Mark as done. |
| `citation` | inline atom | `keys` (string[]), `locator` (string or null, for "p. 14") | The `[@a; @b]` token as a node. Multi-key because `authored.ts` already supports groups. |
| `figure` | block atom | `clipId`, `caption`, `alt` | Image from a clip. Numbered in a render pass. |
| `tableFigure` | block, content `table` | `clipId` (or null for a table the writer drew), `caption` | Wraps a TipTap table so it can carry a caption and source. |
| `table`, `tableRow`, `tableHeader`, `tableCell` | from TableKit | defaults | |
| inline and display maths | from the mathematics extension | `latex` | Replaces `$...$` and `$$...$$` in the old plain text. |
| `unplaced` | `block*` | none | The bin. Drawn as a grey drawer after the last section. Not printed, not counted, citations inside it do not reach the references. |

Marks: `bold`, `italic`, `underline`, `subscript`, `superscript`, `link` (http, https and mailto only).

Every custom node has `parseHTML` and `renderHTML` with `data-*` attributes (for example `<span data-cite-keys="Lee2020;Abe2018" data-clip-ids="...">`) so copy and paste inside the editor keeps the nodes. Also see section 8.

### 2.3 Template to first document

A pure function `templateToDoc(template)` in `src/lib/paper/docModel.ts`:

1. For each heading of level 1, make a `section` with `locked: true`, `key` = a slug of the title (for example `methods`), and an empty paragraph.
2. Level-2 headings under it become `heading` level 2 nodes, each followed by an empty paragraph.
3. Skip `Abstract` and `Keywords` (they live in the front matter, 2.5) and `References` (computed, section 3.3).
4. `Blank` gets one section, `locked: false`, `key: custom-<id>`, heading "Introduction".
5. The hints from `templates.ts` are not stored; the Placeholder extension reads them by `key` from the template at render time.

The doc is built in the browser when the wizard creates the paper and sent in the POST, so the first GET already has it. A paper whose `doc` is `{}` (made before S-150, or by a failed write) is built the same way on open.

### 2.4 Images, and the 2 MB limit

Image clips keep their picture in `atom.content.imageUrl`. On the accounts site `src/app/api/atoms/route.ts` uploads it to the `research-assets` bucket and stores the public URL; in local mode, or when the upload fails, `uploadAsset` keeps the `data:` URL inside the clip (`src/lib/storage/service.ts`). So:

- A `figure` stores only `clipId`, `caption` and `alt`. The node view looks up the clip's `imageUrl` at render time. The paper never holds base64. A deleted clip shows "This image clip was deleted" and blocks Mark as done.
- Pasted images are S-151's problem. That item must upload them to storage and store an asset id, never a `data:` URL. Flag for S-151: `research-assets` hands out public URLs, so an image in an unpublished paper is readable by anyone who has the link. That is the same as clip images today, but papers are private (D21); S-151 should use a private bucket with signed URLs.

Size budget against `MAX_PAPER_BYTES` (2 MB for doc plus meta, enforced in `validatePatch`): a 10,000-word paper is about 70 KB of text; ProseMirror JSON adds roughly three to five times that for node and mark wrappers (estimate, not measured), so about 350 KB. Front matter and the cite map add a few KB. The editor computes `docBytes` before each save and shows a warning at 1.5 MB. C1 measures a real 10,000-word paper and writes the number into this note.

### 2.5 `meta` shape

```ts
interface PaperMetaV1 {
  v: 1;
  venue: string;                 // from the wizard
  wordLimit: number | null;      // from the wizard; counted by wordCount(doc)
  front: {
    title: string;               // printed title; defaults to papers.title at create
    shortTitle: string;          // running head; template default max 50 characters (APA)
    authors: Array<{ id: string; name: string; affiliationIds: string[]; orcid: string; email: string; corresponding: boolean }>;
    affiliations: Array<{ id: string; name: string; city: string; country: string }>;
    abstract: { text: string } | { parts: Array<{ label: string; text: string }> }; // structured when the template says so
    keywords: string[];
    statements: { funding: string; competingInterests: string; dataAvailability: string; ethics: string; acknowledgements: string; aiUse: string };
  };
  page: {
    size: 'a4' | 'letter';
    header: { left: string; center: string; right: string };
    footer: { left: string; center: string; right: string };
    differentFirstPage: boolean;
  };
  cites: Record<string, string>;   // key -> clip id or "manual:<id>"; see section 3
  manualRefs: Array<{ id: string; record: CitationRecord }>;
  importedFrom?: { projectId: string; at: string };
}
```

The abstract is plain text with `$...$` maths, edited in the front-matter panel with a live word count. It has no citation nodes: ICMJE abstracts rarely cite, and one editor for the body keeps the model simple. An old abstract that holds `[@key]` tokens keeps them as literal text and the panel warns.

Header and footer tokens: `{title}`, `{shortTitle}`, `{author}` (first author's family name, plus "et al." when there are more), `{page}`, `{pages}`, `{date}`. A pure `resolveTokens(text, meta, page, pages)` fills them. Template defaults: APA-like templates put `{shortTitle}` left and `{page}` right; the conference template leaves the first page bare and puts `{page}` in the footer centre.

### 2.6 The page sheet

One scrolling white sheet at A4 or Letter width with the template's margins, Figtree replaced by a serif body font inside the sheet only, the header and footer drawn at the top and bottom of the sheet, and a dashed line with "Page n" every page height (computed from `scrollHeight`, so it is approximate). The sheet is one column while editing even for the two-column conference template; two columns appear in print and PDF (S-153). True pagination (paged.js) is out of scope.

## 3. Citations

### 3.1 Node and cite map

The `citation` node stores keys, not clip ids. The paper keeps one cite map in `meta.cites`, for the whole paper rather than one per section (the old outline kept one per section). Reuse from `src/lib/paper/authored.ts` without changes:

- `keyFor` and `addCite`: make "Lee2020", then "Lee2020b", against the paper-wide map.
- `CITE_RE`, `splitCites`, `keysOf`: used by the migration and by the adapter in 3.4.
- `checkAuthored`: the checks, fed by the adapter in 3.4.

Replace `pruneCites(text, cites)` with `pruneCiteMap(doc, cites)` in the new `docModel.ts`: drop map entries no citation node uses. Run it on save, not on every keystroke, so undo can bring a citation back with its key.

### 3.2 Rendering and style switching

A pure `collectCitations(doc, cites, clips)` walks the body (sections only, not the bin) in document order and returns one `CitedSource[]` group per citation node, plus one group per `quote`, `figure` and `tableFigure` that has a source. That is the same grouping `buildPreview` uses. `renderCitations(style, groups)` from `src/lib/citations/inText.ts` returns markers and the reference list. A ProseMirror plugin holds the markers by node position, and the citation node view shows its marker. Switching style re-runs the render; the document is untouched, which is what D16 promised.

`inText.ts` renders five styles (`apa`, `harvard`, `ieee`, `vancouver`, `ama`), each with its own marker and reference list. Earlier this note mapped APA to Harvard and Vancouver and AMA to IEEE; that stopped on 2026-10-28.

### 3.3 References page

Computed, never stored. The references are `renderCitations(...).references` (cited clips and cited manual entries) followed by manual entries that nothing cites, under "Listed but not cited", which is drawn in grey on screen and not printed. It renders after the last section on the sheet as a read-only block. The `incomplete` flag from `inText.ts` shows as "[incomplete]" with the missing fields. The cited-versus-listed check and retraction flags in the list are S-152.

Manual entries are made in the sidebar's References tab (a form over `CitationRecord`, or the existing DOI lookup `resolveCitation` in `src/lib/citations/client.ts`). Their key in `meta.cites` points to `manual:<id>`.

### 3.4 Quotes, evidence kinds and the checklist

Evidence kinds from `src/lib/atoms/evidence.ts` decide what a clip becomes when placed (section 4.4): a Quote clip becomes a `quote` node, an AI summary becomes a `clipNote`, and a Mine clip becomes plain paragraphs with no citation.

An adapter `sectionToAuthored(sectionNode, cites)` turns a section into the old shape: paragraphs separated by a blank line, each citation node written back as `[@a; @b]`, each `quote` node written as `"words" [@key]`. Then `checkAuthored` and the retraction and figure parts of `checkSection` run unchanged on it.

| Check (id in `authored.ts` or `checklist.ts`) | In the editor |
|---|---|
| `authored-bad-key`, `authored-missing-clip`, `authored-ai-summary`, `authored-no-record` | Apply. |
| `authored-bad-quote` (quotation not word for word) | Apply. A `quote` node's text is compared with its clip, so an edited quote is caught. |
| `authored-copied` (copied words without quotation marks) | Apply. |
| `authored-uncited` (warn) | Apply. |
| `long-quote` (warn, over 50 words) | Apply to `quote` nodes and quoted spans. |
| `retracted-*`, `retraction-concern`, `retraction-unchecked` | Apply to every cited clip. |
| `figure-source`, `figure-caption`, `figure-permission` | Apply to `figure` and `tableFigure` nodes. |
| `placeholders` (`[ ? ]` left in) | Apply to free text too (new: `hasPlaceholder` from `draft.ts` on each paragraph). |
| `clipNote` present | New block: "An AI summary is still in the text. Rewrite it from the source." |
| `status-bad-number`, `status-bad-math`, `status-mixed`, `empty-draft` | Defer. They grade AI draft sentences; the editor has no Draft button in v1. |
| `empty` (nothing in the section) | Replace with "This section has no text yet." |

## 4. The content sidebar

### 4.1 Data source

The paper's `projectId`. The editor fetches `/api/atoms?projectId=<id>` once on open (the dashboard's own atom list belongs to the active project, which may differ) and builds the `ClipInfo` map the same way `PaperOutlineView` does today. Move `mediaOf` and the `clipInfos` builder into `src/lib/paper/clipInfo.ts` so both views share them. No project, or a project the person no longer sees, shows "A project you no longer see" (D21) and an empty sidebar; the paper still opens.

### 4.2 What it lists

Four tabs, one search box across them:

| Tab | Lists | Default action |
|---|---|---|
| Text | Text, quote and block clips that are not tables, with the kind badge (`EVIDENCE_LABEL`) | Insert as quote (Quote clip), as a note (AI summary) or as text (Mine) |
| Images | Image clips and table clips, with thumbnail or first row | Insert as figure or table |
| Citations | One row per distinct source among clips that carry `metadata.citation` (grouped by DOI, else by title and year; the first clip found is the one cited) | Insert a citation node only |
| References | Manual entries plus a form to add one | Insert a citation node |

A row already used in the body shows "In the text". A project with more than 200 matches shows the first 200 and asks the person to search.

### 4.3 Drag and Insert

- Move `CLIP_MIME = 'application/x-researchie-clip'` from `PaperOutlineView.tsx` into `src/lib/paper/dnd.ts` and import it in both places. Add `CITE_MIME = 'application/x-researchie-cite'` for Citations and References rows (the payload is a clip id or `manual:<id>`).
- `dragstart` sets the custom type and also `text/plain` (the clip text), because Firefox needs some data to start a drag. Our handler runs first and returns true, so the plain text is never inserted.
- A small TipTap extension adds a ProseMirror plugin with `props.handleDrop(view, event, slice, moved)`: return false unless `event.dataTransfer.types` has one of our types; read the id; get `view.posAtCoords({ left: event.clientX, top: event.clientY })`; snap the position to the nearest valid place (a heading position moves to just after the heading; a drop inside the bin is allowed); build nodes with `clipToNodes` (4.4); dispatch one transaction; call `onCite` so the cite map in meta gains any new key; return true. The drop cursor from StarterKit shows where it lands.
- Every row has an Insert button. It inserts at the cursor with `editor.chain().focus().insertContentAt(...)`; with no cursor in the body, it appends to the end of the last section the person touched. This is the keyboard path (research 4.4).

### 4.4 `clipToNodes(clip, cites)` (pure, in `docModel.ts`)

| Clip | Nodes | Cite map |
|---|---|---|
| Quote with a citation record | `quote { clipId, page }` with the clip text | `addCite` |
| Quote without a record | `quote` as above, flagged "no source" by the checks | none |
| AI summary | `clipNote { clipId }` | none |
| Mine | one `paragraph` per paragraph of its text | none |
| Image (`mediaOf` gives `image`) | `figure { clipId, caption, alt: caption }` | `addCite` when it has a record |
| Table (`parseTable` gives a table) | `tableFigure { clipId, caption }` holding a TipTap table built from `ParsedTable.header` and `rows`; an editable copy | `addCite` when it has a record |
| Citations or References row | `citation { keys: [key] }` | `addCite`, or the manual key |

## 5. Sections: reorder, add, remove

An outline panel lists the sections in order, with up and down buttons, Rename (custom sections, and template sections under the rule in question 1), Remove, and "Add section below". Buttons cost far less than drag in a list and are keyboard-accessible by default; drag in the outline can come later with dnd-kit if people ask. Pure functions in `src/lib/paper/sections.ts` work on the JSON and return a new doc; the editor applies them as one transaction (`tr.replaceWith` over the doc's content), so one undo reverts a move.

Rules:

- Template sections (`locked: true`) can move, but cannot be removed.
- Removing a custom section that has content moves its content (heading turned into a level-2 heading) into the Unplaced bin, after a confirm. An empty one is removed outright.
- The bin is created when it first gets content and removed when it is emptied. It is never printed or counted, and its citations do not reach the references.
- Changing the template later (not in the S-150 UI, but the rule is fixed now): sections the new template has keep their content; sections it lacks go to the bin; empty ones are dropped. Nothing is deleted.
- Clicking a section in the outline scrolls the sheet to it.

## 6. Autosave

- Debounce 1.5 seconds after the last change, with a maximum wait of 10 seconds while typing goes on. Save on `visibilitychange` to hidden as well.
- `PATCH /api/papers/:id` with `{ doc, meta, baseUpdatedAt }`, plus `title` only when it changed. `baseUpdatedAt` is the `updatedAt` from the last successful load or save.
- Conflict policy: one owner, so last write wins, but only by choice. `papers.update` gains an optional `baseUpdatedAt`; when it is given, the update adds `.eq('updated_at', baseUpdatedAt)`. No row updated while the paper still exists means a new result code `CONFLICT` (HTTP 409). The editor then stops saving and shows: "This paper was changed in another tab or window. Load that version, or keep yours (saves over it)." Keep yours re-sends without `baseUpdatedAt`. The local file store (`papersLocal.ts`) does the same.
- Status line in the editor toolbar: "Saved", "Saving…", or "Not saved: <reason>", following the `saveError` pattern in `src/lib/prefs/prefsContext.tsx` (Decision 38): a refusal (400, 413) is shown and not retried until the document changes; a network error or 5xx retries after 2, 5 and 15 seconds; a lost sign-in (401) says so.
- Size: the editor checks `docBytes(doc, meta)` before sending. Over the limit, it shows the server's own wording ("This paper is 2.3 MB, over the 2 MB that can be saved. Remove large pasted images and try again.") and does not send.
- Leaving the page with unsaved changes: a `beforeunload` prompt. Do not rely on `fetch(..., { keepalive: true })`; keepalive bodies are limited to 64 KB, which a paper passes quickly.

## 7. Importing old outlines

Source: the preference key `researchie.paperOutline.<projectId>` (`outlineKey` in `src/lib/paper/store.ts`), read with `readOutline`, type `PaperOutline` in `outline.ts`. There is at most one per project and person.

**Where.** On the workspace home, once `prefs.ready` is true, `PaperWorkspace` checks each project in its `projects` list for an outline key with no marker key `researchie.paperOutlineImported.<projectId>`. If any are found, a strip above the list says "You have N outlines from the old paper view. Open them as papers." with one button per outline. Nothing is imported without a click.

**Idempotent and non-destructive.** The import creates a paper with `meta.importedFrom = { projectId, at }`, then sets the marker pref to the new paper id. The old outline pref is never removed or changed. If the marker exists, the strip does not offer that outline again. If the paper the marker points to was purged, the strip offers the import again.

**Mapping**, as a pure `outlineToPaper(outline, clips, template)` in `src/lib/paper/migrateOutline.ts`:

| Old field | New place |
|---|---|
| `templateId` `imrad` / `review` | `templateId` `imrad` / `review` (the hidden one kept for this, D22) |
| `title` | `meta.front.title` and `papers.title` (else "<project name> paper") |
| `authors` (one string) | `meta.front.authors`, one entry per comma-separated name, `name` only |
| Section `abstract`: `text` | `meta.front.abstract.text` (literal `[@key]` tokens kept as text, with a warning) |
| Other section: `key`, `title` | `section { key, locked: true }` with that heading. The old sections are used, not the new template's, so nothing is added or lost. |
| `point` | `section.point` (shown under the heading, not printed) |
| `text` with `[@key]` and `cites` | `paragraphsOf(text)`, each paragraph split by `splitCites` into text and `citation` nodes, and `$...$`, `$$...$$` into maths nodes (`splitMath`). The section's keys merge into `meta.cites`; a key that already points at another clip is renamed with `keyFor` and the nodes are rewritten. |
| `aiAssisted`, `done` | Same attributes. `done` is cleared on first open if the checklist now fails. |
| `draft`, when there is no `text` | `draftToText` (existing, in `authored.ts`) gives text and cites, mapped as above, with `aiAssisted: true`, the same as the old "Move the AI draft into my text". |
| `draft`, when there is `text` | Into the bin under a level-2 heading "Earlier AI draft: <section title>". |
| `parts` with no `text` and no `draft` | A level-2 heading per part, then `clipToNodes` for each clip id, so the paper reads as the old preview did. |
| `parts` when the section has `text` or `draft` | Image and table clips go into the section after the text (as the old preview drew them). Other clips go into the bin under "Clips from <part title>". |

**Lost:** `draft.previous` (the one-step draft history), per-sentence draft statuses (the checks re-run on the text), section hints (now read from the template), part grouping when a section had its own text (kept as headings in the bin), the global Harvard/IEEE preference `researchie.inTextStyle` (the paper's `citationStyle` is set from the template default instead). Clip ids that no longer exist are dropped, as `pruneMissingClips` does today.

## 8. Paste hook points for S-151

C1 must leave these open and not configure them:

- A `pasteExtension` slot: the editor's extension list takes an optional extension built by S-151 that adds a ProseMirror plugin with `transformPastedHTML`, `transformPastedText`, `transformPasted` and `handlePaste`. S-150 adds none of them, so ProseMirror's schema-driven parse is the only filter and anything without a rule (scripts, styles) is dropped.
- Keep `editorProps.handleDrop` limited to our MIME types and return false otherwise, so S-151 can handle dropped files.
- `parseHTML` rules on every custom node, so a later `clipboardParser` can map pasted `data-*` attributes. A citation pasted from another paper carries `data-clip-ids`; S-151's `transformPasted` re-registers those keys in this paper's cite map.
- One `matchPaste` hook: the provenance step ("this text matches a clip, cite it?") will reuse `src/lib/paper/pasteMatch.ts`; nothing to build now.

## 9. Task split

Both builds run `npm run verify` green and update `docs/CHANGELOG.md`, `PROJECT_LOG.md`, and SCOPE.md S-150.

### C1: editor core

| | |
|---|---|
| Size | L, about 200k tokens, Sonnet, high effort |
| New files | `src/lib/paper/docModel.ts` (types, `templateToDoc`, `upgradeDoc`, `upgradeMeta`, `docBytes`, `wordCount`, `collectCitations`, `pruneCiteMap`, `sectionToAuthored`), `src/lib/paper/headerTokens.ts` (`resolveTokens`), `src/lib/paper/editor/extensions.ts` (schema nodes and the locked-heading filter), `src/components/PaperEditor.tsx` (shell: toolbar, sheet, status line), `src/components/PaperPageSheet.tsx`, `src/components/FrontMatterPanel.tsx`, `src/components/editor/CitationView.tsx`, `FigureView.tsx`, `src/lib/paper/useAutosave.ts` |
| Edited files | `package.json` (deps in section 1), `src/lib/data/papers.ts` (`baseUpdatedAt`, `CONFLICT`), `src/lib/data/papersLocal.ts`, `src/app/api/papers/[id]/route.ts` (409), `src/components/PaperWorkspace.tsx` (open the editor, prefetch it), `src/components/NewPaperFlow.tsx` or the `create` call (send `templateToDoc` in the POST), `src/app/page.tsx` (`?paper=<id>` in the URL so refresh reopens it) |
| Unit tests | `tests/paper-doc.test.mjs`: every template gives the expected sections and skips Abstract, Keywords, References; Blank gives one custom section; `upgradeDoc({})`; `wordCount` skips bin, abstract, references; `docBytes`. `tests/paper-cites.test.mjs`: group order, the same doc under both styles, manual entries, `pruneCiteMap`, `sectionToAuthored` round trip through `checkAuthored`. `tests/paper-tokens.test.mjs`. `tests/papers.test.mjs`: conflict with a stale `baseUpdatedAt`, success with the current one, success without one. |
| Playwright | `e2e/26-paper-editor.spec.ts`: create from the wizard and see the sheet with the template headings; type, wait for "Saved", reload, text is still there; a locked heading refuses typing; front-matter title shows on the sheet; a `{page}` header token renders; the open time is logged. |
| Open transition | Start `import('./PaperEditor')` when the wizard opens, so the chunk is loaded before Create. On Create, show the sheet skeleton with the title at once and fade the editor in (150 ms) when it mounts. Measure with `performance.mark` from the Create click to the editor's `onCreate`; the spec logs it, and asserts under 2,000 ms only when `PW_PERF=1` against `next start`, because the dev server compiles on first load. |
| Risks | Hydration errors if `immediatelyRender` is missed; KaTeX and ProseMirror chunk size pushing the open past 2 seconds; the locked-heading filter missing a case (select-all and delete, paste over, join backward from the next section); the mathematics node names differing from my guess; autosave sending during an IME composition; the JSON size estimate being wrong. |

### C2: sidebar, drag and drop, reorder, migration

| | |
|---|---|
| Size | M to L, about 170k tokens, Sonnet, high effort |
| New files | `src/lib/paper/clipInfo.ts` (moved `mediaOf`, `clipText`, ClipInfo builder), `src/lib/paper/dnd.ts`, `src/lib/paper/sections.ts`, `src/lib/paper/migrateOutline.ts`, `src/lib/paper/editor/clipDrop.ts` (the `handleDrop` plugin), `src/components/PaperSidebar.tsx`, `src/components/PaperOutlinePanel.tsx`, `src/components/ImportOutlinesStrip.tsx` |
| Edited files | `src/components/PaperOutlineView.tsx` (import `CLIP_MIME` and `clipInfo.ts`; no behaviour change), `src/components/PaperEditor.tsx`, `src/components/PaperWorkspace.tsx` (import strip), `src/lib/paper/docModel.ts` (`clipToNodes`) |
| Unit tests | `tests/paper-drop.test.mjs`: `clipToNodes` for each row of 4.4, including a quote with no record and a deleted clip. `tests/paper-sections.test.mjs`: move up and down at the ends, add, remove empty, remove with content into the bin, locked section refuses removal, bin removed when empty, template change sends missing sections to the bin. `tests/paper-migrate.test.mjs`: a fixture outline with text, cites, a draft, parts and maths maps as in section 7; key collision across sections is renamed; running it twice gives the same doc; the input object is unchanged. |
| Playwright | `e2e/27-paper-sidebar.spec.ts`: Insert on a Citations row puts a marker in the text and a reference on the sheet; switching style changes the marker and not the text; a drop via `page.evaluate` that dispatches `dragstart`, `dragover` and `drop` with a shared `DataTransfer` inserts a quote; up and down reorder the sheet; a seeded old outline shows the import strip, imports once, and the strip is gone after reload. |
| Risks | `posAtCoords` returning a position inside an atom node or a table; Firefox drag differences; ProseMirror handling the drop itself if our plugin is ordered after the default; projects with thousands of clips making the sidebar slow; reading prefs before `prefs.ready`; cite-key collisions during migration; Playwright not being able to fake a real OS drag (the synthetic event path is tested, the real one only by hand). |

### By hand (both builds)

Typing feel and undo across citation nodes; Windows IME input; copy and paste a paragraph with a citation inside the same paper; drag from the sidebar in Chrome, Edge and Firefox; a 10,000-word paper (save time, size, scrolling); phone width (the sidebar becomes a drawer); dark mode (the sheet stays white, the chrome follows the theme); signed in on the accounts site (S-145 pattern); opening a paper whose project the person lost access to; the open time on a production build.

## 10. Open questions for the owner

1. **Can template headings be renamed?** Journals say "Materials and methods" where the template says "Methods". Recommendation: yes, through Rename in the outline panel only; the key stays, so checks and the wireframe still know the section. Typing in the heading itself stays blocked, and the section still cannot be removed.
2. **What happens to the old paper view in a project?** Recommendation: keep it working, add a line "Paper Mode has moved: open this outline as a paper", and remove the old view once S-153 (export) lands.
3. **AI Draft in the editor?** It is not in the approved S-150 scope. Recommendation: leave it out of S-150 and add it as its own item after S-151; imported drafts become text marked "drafted by AI".
4. **APA, Vancouver and AMA before S-152.** Recommendation: render them with the Harvard and IEEE formatters and say so in the style menu, rather than hiding those styles.
5. **Paper name and printed title.** Recommendation: two fields. The printed title starts as the name and then each is edited on its own, so a long title does not clutter the workspace list.

## Verified while building C1 (2026-10-22)

- The mathematics extension's nodes are `inlineMath` and `blockMath`, each with a `latex` attribute (read from the installed package). Clicks are handled through `inlineOptions.onClick` and `blockOptions.onClick`.
- The schema in `src/lib/paper/editor/extensions.ts` accepts a document built from every template (`tests/paper-schema.test.mjs`).
- `StarterKit` needs `trailingNode: false`, or it adds a paragraph after the Unplaced bin and breaks the schema.
- The Placeholder extension needs `includeChildren: true`, because the paragraphs are inside a section node.
- Open time (create click to editor ready) was 0.4 to 0.5 seconds on the dev server. Not measured on a production build.
- The headings of a template are locked by comparing locked sections before and after each transaction; select-all and Delete leaves the template sections in place (`e2e/26-paper-editor.spec.ts`).

## What I could not verify

- The v3 mathematics node names and attributes, and the v3 default of `shouldRerenderOnTransaction`.
- The JSON size per word (estimated, not measured).
- That TipTap's drop cursor and our `handleDrop` order work together as described; C2 confirms with a test.
- Whether `/api/atoms?projectId=` returns a project's sub-project clips; C2 checks before the sidebar relies on it.
