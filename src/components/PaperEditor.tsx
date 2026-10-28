'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, useEditorState, type Editor } from '@tiptap/react';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft, Stack, X, TextB, TextItalic, TextUnderline, TextSubscript, TextSuperscript, ListBullets, ListNumbers, Table,
  Function as FunctionIcon, ArrowUUpLeft, ArrowUUpRight, TextHTwo, TextHThree, SidebarSimple, CheckCircle, WarningCircle, CircleNotch, Printer, FileText, DownloadSimple, CaretDown,
} from '@phosphor-icons/react';
import type { Paper } from '@/lib/data/papers';
import { getTemplate, type PaperTemplate } from '@/lib/paper/templates';
import { upgradeDoc, upgradeMeta, pruneCiteMap, wordCount, slug, clipToNodes, citationNode, usedClipIds, type PaperMeta, type PmNode } from '@/lib/paper/docModel';
import { insertBlocks, insertInline } from '@/lib/paper/editor/insert';
import { useProjectClips, useProjectList } from '@/lib/paper/useProjectClips';
import { paperExtensions, MARKERS_META, PAGINATION_META, CLIPS_CHANGED, figureSources, type DropPayload } from '@/lib/paper/editor/extensions';
import { pageGeometry, layoutPages, pageCount, pageOf, type Geometry } from '@/lib/paper/paginate';
import { closeHistory } from '@tiptap/pm/history';
import { PageSettingsDialog } from './PageSettingsDialog';
import { FindBar } from './FindBar';
import { PaperRuler } from './PaperRuler';
import { paperToMarkdown } from '@/lib/paper/markdown';
import { paperToDocx } from '@/lib/paper/docx';
import { unitFor } from '@/lib/paper/ruler';
import { HeaderFooterDialog } from './HeaderFooterDialog';
import { TextSelection } from '@tiptap/pm/state';
import { computeMarkers, contentOf, STYLE_NOTE, type Markers } from '@/lib/paper/markers';
import { Popover } from './ToolbarPopover';
import { useAutosave } from '@/lib/paper/useAutosave';
import { usePrefs } from '@/lib/prefs/prefsContext';
import { INFO_PENDING_KEY } from '@/lib/paper/store';
import { PaperPageSheet, type CommentPin } from './PaperPageSheet';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './PaperToolbar';
import { commentRanges, removeCommentMarks } from '@/lib/paper/editor/comments';

/** Least gap in px between two comment notes in the margin. */
const PIN_GAP = 84;
import { FrontMatterPanel } from './FrontMatterPanel';
import { PaperSidebar } from './PaperSidebar';
import { PaperToolbar } from './PaperToolbar';

// The paper editor (S-150, design note docs/PAPER_EDITOR_DESIGN.md): a Word-style page over the template's
// sections, a front-matter panel, autosave, and a sidebar of the data-source project's clips to assemble the
// paper from (drag a row onto the page, or press Insert). Section reorder and import of old outlines come next.

interface Props {
  paperId: string;
  /** The paper as just created or listed with its document, so the editor opens without a round trip. */
  initial?: Paper;
  onClose: () => void;
}

// Author-date (APA, Harvard, Chicago), author-page (MLA) and numbered (IEEE, Vancouver, AMA). Each switch changes the in-text markers.
const STYLES = [
  { id: 'apa', label: 'APA 7' },
  { id: 'harvard', label: 'Harvard' },
  { id: 'mla', label: 'MLA 9' },
  { id: 'chicago', label: 'Chicago' },
  { id: 'ieee', label: 'IEEE' },
  { id: 'vancouver', label: 'Vancouver' },
  { id: 'ama', label: 'AMA' },
];
/** A paper saved with a style this menu does not offer opens in APA; the next save stores it. */
const menuStyle = (style: string) => (STYLES.some((st) => st.id === style) ? style : 'apa');

const slugHint = (template: PaperTemplate) => (key: string) => template.sections.find((s) => s.level === 1 && slug(s.title) === key)?.hint ?? 'Start writing.';

function EditorBody({ paper, onClose, onReload }: { paper: Paper; onClose: () => void; onReload: () => void }) {
  const template = useMemo(() => getTemplate(paper.templateId) ?? (getTemplate('blank') as PaperTemplate), [paper.templateId]);
  const initialDoc = useRef(upgradeDoc(paper.doc, template)).current;
  const [meta, setMeta] = useState<PaperMeta>(() => upgradeMeta(paper.meta, template, paper.title));
  const [name, setName] = useState(paper.title);
  const [style, setStyle] = useState(() => menuStyle(paper.citationStyle));
  const [panel, setPanel] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const prefs = usePrefs();
  const [infoOpen, setInfoOpen] = useState(() => prefs.get(INFO_PENDING_KEY) === '1');
  const closeInfo = () => {
    setInfoOpen(false);
    prefs.remove(INFO_PENDING_KEY);
  };
  const [projectId, setProjectId] = useState<string | null>(paper.projectId);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const [words, setWords] = useState(0);
  const [marks, setMarks] = useState<Markers>({ markers: [], references: [] });
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const metaRef = useRef(meta);
  const nameRef = useRef(name);
  const projectRef = useRef(projectId);
  const styleRef = useRef(menuStyle(paper.citationStyle));
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const projects = useProjectList();
  const clips = useProjectClips(projectId);
  const infosRef = useRef(clips.infos);
  infosRef.current = clips.infos;

  const autosave = useAutosave({ paperId: paper.id, initialUpdatedAt: paper.updatedAt, isComposing: () => Boolean(editorRef.current?.view.composing) });

  const { schedule } = autosave;

  /** Saves the whole current paper (text, front matter, name, style). Called by every change, never on mount. */
  const commit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const pm = editor.getJSON() as PmNode;
    const m = metaRef.current;
    schedule({
      doc: { v: 1, pm },
      meta: { ...m, cites: pruneCiteMap(pm, m.cites) },
      title: nameRef.current.trim() || 'Untitled paper',
      citationStyle: styleRef.current,
      projectId: projectRef.current,
    });
  }, [schedule]);

  /** The link on a note: select the commented text and make it breathe, so it is easy to find. */
  const pickComment = (id: string, from: number, to: number) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
    const marks = Array.from(ed.view.dom.querySelectorAll<HTMLElement>('[data-comment="' + id + '"]'));
    marks.forEach((el) => el.classList.add('paper-comment-breathe'));
    setTimeout(() => marks.forEach((el) => el.classList.remove('paper-comment-breathe')), 2700);
  };
  /** Removes a comment: its highlight in the text and its note. */
  const deleteComment = (id: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.view.dispatch(removeCommentMarks(ed.state.tr, id));
    changeMeta({ ...metaRef.current, comments: metaRef.current.comments.filter((c) => c.id !== id) });
  };
  const changeMeta = (next: PaperMeta) => {
    metaRef.current = next;
    setMeta(next);
    commit();
  };
  const changeName = (next: string) => {
    nameRef.current = next;
    setName(next);
    commit();
  };
  const changeStyle = (next: string) => {
    styleRef.current = next;
    setStyle(next);
    commit();
  };

  /** Puts a clip, or a citation to its source, in the paper at `pos` (the cursor when there is none). */
  const place = useCallback(
    (clipId: string, mode: 'clip' | 'cite', pos?: number | null) => {
      const editor = editorRef.current;
      const clip = infosRef.current.get(clipId);
      if (!editor || !clip) return;
      const at = pos ?? editor.state.selection.to;
      const m = metaRef.current;
      const sources = (clip.sourceIds ?? []).flatMap((id) => { const info = infosRef.current.get(id); return info ? [info] : []; });
      const placed = mode === 'cite' ? citationNode(clip, m.cites) : clipToNodes(clip, m.cites, sources);
      const tr = 'node' in placed ? insertInline(editor.state, at, placed.node) : insertBlocks(editor.state, at, placed.nodes);
      const before = usedClipIds(editor.getJSON() as PmNode, m.cites);
      if (placed.cites !== m.cites) {
        metaRef.current = { ...m, cites: placed.cites }; // before the dispatch, so the save that follows has the key
        setMeta(metaRef.current);
      }
      editor.view.dispatch(tr);
      editor.view.focus();
      // say which sources joined the References list, and which were already there
      const after = usedClipIds(editor.getJSON() as PmNode, placed.cites);
      const cited = [clip, ...sources].filter((info) => info.record).map((info) => info.id);
      const nameOf = (id: string) => { const info = infosRef.current.get(id); return info?.record?.title || info?.text.slice(0, 60) || 'Source'; };
      const messages = [
        ...cited.filter((id) => after.has(id) && !before.has(id)).map((id) => `Added to references: ${nameOf(id)}`),
        ...cited.filter((id) => before.has(id)).map((id) => `Already in references: ${nameOf(id)}`),
      ];
      if (messages.length) showToast(messages.join(' · '));
    },
    [showToast]
  );
  /** Puts sources on the References list without citing them in the text. */
  const addToReferences = (ids: string[]) => {
    const m = metaRef.current;
    const next = ids.filter((id) => !m.listed.includes(id));
    if (next.length) changeMeta({ ...m, listed: [...m.listed, ...next] });
  };
  const placeRef = useRef(place);
  placeRef.current = place;
  const onDropClip = useCallback((d: DropPayload) => placeRef.current(d.id, d.kind, d.pos), []);

  const changeProject = (next: string | null) => {
    projectRef.current = next;
    setProjectId(next);
    commit();
  };

  const mathClick = useCallback((latex: string, pos: number, display: boolean) => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = window.prompt('Change the formula (LaTeX). Leave it empty to remove it.', latex);
    if (next === null) return;
    const chain = editor.chain().focus().setNodeSelection(pos);
    if (!next.trim()) chain.deleteSelection().run();
    else if (display) chain.updateBlockMath({ latex: next.trim() }).run();
    else chain.updateInlineMath({ latex: next.trim() }).run();
  }, []);

  // Pages. Blocks are measured after each change and moved onto the next page where they would cross a margin
  // (paginate.ts). The measured positions are kept so Delete page and Go to page can use them.
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const layoutRef = useRef<Array<{ pos: number; size: number; y: number }>>([]);
  const [pages, setPages] = useState(1);
  const [pageNow, setPageNow] = useState(1);
  const [tallPage, setTallPage] = useState<number | null>(null);
  const [oneColPage, setOneColPage] = useState<number | null>(null);
  const [pins, setPins] = useState<CommentPin[]>([]);
  const [commentsShown, setCommentsShown] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [guide, setGuide] = useState<number | null>(null);
  const [ruler, setRulerOn] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem('researchie.paperRuler') === 'off') setRulerOn(false);
    } catch {
      /* the ruler stays on */
    }
  }, []);
  const setRuler = (on: boolean) => {
    setRulerOn(on);
    try {
      localStorage.setItem('researchie.paperRuler', on ? 'on' : 'off');
    } catch {
      /* not remembered */
    }
  };
  const [hfOpen, setHfOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  const [find, setFind] = useState<{ query: string; n: number } | null>(null);
  /** Opens the find bar, starting with the selected text when there is some (a new `n` makes it take focus again). */
  const openFind = () => {
    const e = editorRef.current;
    const { from, to } = e?.state.selection ?? { from: 0, to: 0 };
    const picked = e && to > from && to - from < 80 ? e.state.doc.textBetween(from, to, ' ') : '';
    setFind((f) => ({ query: picked || f?.query || '', n: (f?.n ?? 0) + 1 }));
  };
  const [exportOpen, setExportOpen] = useState(false);
  const [printing, setPrinting] = useState(false); // while printing the pages touch, with no grey gap between them
  // the zoom the layout works in: the sheet is drawn at `zoom`, so measurements are in zoomed px; 1 while printing
  const effZoomRef = useRef(1);
  effZoomRef.current = printing ? 1 : zoom;
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const geoOf = (m: PaperMeta): Geometry => pageGeometry(m.page.size, m.page.margin, m.page.marginPx, printing ? 0 : 24);
  const scaleGeo = (base: Geometry, z: number): Geometry => ({ H: base.H * z, G: base.G * z, S: base.S * z, top: base.top * z, bottom: base.bottom * z });

  type Flow = { pos?: number; size?: number; el?: HTMLElement; dom?: HTMLElement; top: number; height: number; pad: number; breakBefore: boolean; keepWithNext: boolean; lines?: TextLine[]; extras?: number };
  const tallKey = useRef('');
  const paginate = () => {
    const editor = editorRef.current;
    const wrap = wrapRef.current;
    if (!editor || !wrap) return;
    const t0 = performance.now();
    const z = effZoomRef.current;
    const g = scaleGeo(geoOf(metaRef.current), z);
    const wrapTop = wrap.getBoundingClientRect().top;
    // Everything that takes room on the page, top to bottom: the front matter, the editor's blocks, the statements and
    // the references. Each piece is measured and moved the same way, so none of them runs across a page edge.
    const items: Flow[] = [];
    const oneColSections: number[] = []; // two-column sections taller than a page: shown in one column, split like text
    let afterBreak = false;
    for (const el of Array.from(wrap.querySelectorAll<HTMLElement>('[data-flow], [data-testid="paper-body"]'))) {
      if (el.hasAttribute('data-flow')) {
        const r = el.getBoundingClientRect();
        items.push({ el, top: r.top - wrapTop, height: r.height, pad: (parseFloat(el.style.paddingTop) || 0) * z, breakBefore: false, keepWithNext: el.hasAttribute('data-keep') });
        continue;
      }
      editor.state.doc.forEach((section, sPos) => {
        // A two-column section is one block to the page logic. Padding its paragraphs one by one moves text between the
        // columns, which changes their height, which moves the padding again: the page shakes. Only the section is moved.
        const twoCol = section.attrs.columns === '2' || (section.attrs.columns !== '1' && metaRef.current.page.columns === 2);
        const sectionDom = twoCol ? (editor.view.nodeDOM(sPos) as HTMLElement | null) : null;
        let oneCol = false;
        if (sectionDom) {
          // measured in one column: if that is taller than a page, the section is split like plain text
          sectionDom.classList.add('paper-one-column');
          oneCol = sectionDom.getBoundingClientRect().height - ((parseFloat(sectionDom.style.paddingTop) || 0) * z) > g.H - g.top - g.bottom;
          if (oneCol) oneColSections.push(sPos);
          else sectionDom.classList.remove('paper-one-column');
        }
        if (sectionDom && !oneCol) {
          const r = sectionDom.getBoundingClientRect();
          items.push({ pos: sPos, size: section.nodeSize, dom: sectionDom, top: r.top - wrapTop, height: r.height, pad: (parseFloat(sectionDom.style.paddingTop) || 0) * z, breakBefore: afterBreak, keepWithNext: false });
          afterBreak = false;
          return;
        }
        section.forEach((child, off) => {
          const pos = sPos + 1 + off;
          const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
          if (dom) {
            const r = dom.getBoundingClientRect();
            const name = child.type.name;
            const pad = (parseFloat(dom.style.paddingTop) || 0) * z;
            const item: Flow = { pos, size: child.nodeSize, dom, top: r.top - wrapTop, height: r.height, pad, breakBefore: afterBreak, keepWithNext: name === 'sectionHeading' || name === 'heading' };
            if (name === 'paragraph' || name === 'quote' || name === 'heading' || name === 'sectionHeading') {
              const gaps = Array.from(dom.querySelectorAll<HTMLElement>('.paper-split'));
              const extras = gaps.reduce((n, el) => n + el.getBoundingClientRect().height, 0);
              if (r.height - pad - extras > g.H - g.top - g.bottom) {
                item.extras = extras;
                item.lines = textLines(dom, r.top + pad, gaps, z); // only for a block taller than a page's text area
              }
            }
            items.push(item);
          }
          afterBreak = child.type.name === 'pageBreak';
        });
      });
    }
    const { pads, tops, tall, splits } = layoutPages(items, g);
    items.forEach((it, i) => {
      if (it.el && Math.abs(pads[i] - it.pad) > 0.5) it.el.style.paddingTop = pads[i] > 0.5 ? `${pads[i] / z}px` : '';
    });
    const inDoc = items.map((it, i) => ({ it, i })).filter(({ it }) => it.pos !== undefined);
    // gaps inside long paragraphs: the document position of each line that starts a page
    const gapsAt = (it: Flow, i: number) =>
      splits[i].map((sp) => {
        const line = it.lines![sp.line];
        return { at: editor.view.posAtDOM(line.node, lineStartOffset(line)), height: sp.height / z };
      });
    const gapList = new Map<number, Array<{ at: number; height: number }>>();
    inDoc.forEach(({ it, i }) => { if (splits[i].length) gapList.set(i, gapsAt(it, i)); });
    const key = inDoc.map(({ it, i }) => `${it.pos}:${tall[i] ? 1 : 0}:${(gapList.get(i) ?? []).map((x) => `${x.at}/${Math.round(x.height)}`).join('+')}`).join(',') + `|${oneColSections.join(',')}`;
    if (inDoc.some(({ it, i }) => Math.abs(pads[i] - it.pad) > 0.5) || key !== tallKey.current) {
      tallKey.current = key;
      const entries = inDoc.map(({ it, i }) => ({ pos: it.pos!, pad: pads[i] / z, tall: tall[i], splits: gapList.get(i) }));
      editor.view.dispatch(editor.state.tr.setMeta(PAGINATION_META, [...entries, ...oneColSections.map((pos) => ({ pos, pad: 0, oneColumn: true }))]).setMeta('addToHistory', false)); // a layout move is not an edit to undo
    }
    layoutRef.current = inDoc.map(({ it, i }) => ({ pos: it.pos!, size: it.size!, y: tops[i] }));
    const firstTall = items.findIndex((_, i) => tall[i]);
    setTallPage(firstTall < 0 ? null : pageOf(tops[firstTall], g) + 1);
    const firstOneCol = oneColSections[0];
    setOneColPage(firstOneCol === undefined ? null : pageOf((editor.view.nodeDOM(firstOneCol) as HTMLElement).getBoundingClientRect().top - wrapTop, g) + 1);
    // comment notes beside their text: at the line the comment starts on, pushed down so the notes do not overlap
    const raw = commentRanges(editor.state.doc).flatMap((r) => {
      const note = metaRef.current.comments.find((c) => c.id === r.id);
      if (!note) return [];
      return [{ id: r.id, y: editor.view.coordsAtPos(r.from).top - wrapTop, from: r.from, to: r.to, quote: r.quote, text: note.text }];
    }).sort((a, b) => a.y - b.y);
    let lastTop = -Infinity;
    setPins(raw.map((p) => { const top = Math.max(p.y, lastTop + PIN_GAP * z); lastTop = top; return { id: p.id, anchor: p.y / z, top: top / z, from: p.from, to: p.to, text: p.text }; }));
    const end = wrap.querySelector('[data-content-end]') as HTMLElement | null;
    const bottom = end ? end.getBoundingClientRect().top - wrapTop : wrap.scrollHeight;
    const count = pageCount(bottom, g);
    setPages((v) => (v === count ? v : count));
    rootRef.current?.setAttribute('data-paginate-ms', String(Math.round(performance.now() - t0))); // for tests and a look in the inspector
  };
  const schedulePaginate = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      paginate();
    });
  };
  const pageAtCursor = (e: Editor): number => {
    const from = e.state.selection.from;
    let best: { y: number } | null = null;
    for (const it of layoutRef.current) if (it.pos <= from) best = it;
    return best ? pageOf(best.y, geoOf(metaRef.current)) + 1 : 1;
  };

  const editor = useEditor({
    extensions: useMemo(
      () => paperExtensions({ hintFor: slugHint(template), onMathClick: mathClick, onDropClip, imageFor: (id) => figureSources.get(id) ?? null }),
      [template, mathClick, onDropClip]
    ),
    content: initialDoc.pm,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: 'paper-prose', 'aria-label': 'Paper text', spellcheck: 'true' } },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
      const t0 = (window as unknown as { __paperOpenStart?: number }).__paperOpenStart;
      if (t0) rootRef.current?.setAttribute('data-open-ms', String(Math.round(performance.now() - t0)));
      setTick((n) => n + 1);
      schedulePaginate();
    },
    onUpdate: ({ editor: e, transaction }) => {
      editorRef.current = e;
      schedulePaginate();
      if (transaction.getMeta(PAGINATION_META)) return; // a layout move is not an edit: nothing to save
      commit();
      if (tickTimer.current) clearTimeout(tickTimer.current);
      tickTimer.current = setTimeout(() => setTick((n) => n + 1), 300);
    },
    onSelectionUpdate: ({ editor: e }) => setPageNow(pageAtCursor(e)),
  });
  editorRef.current = editor;

  // Markers, references and the word count follow the text, the cite map and the style.
  useEffect(() => {
    if (!editor) return;
    const pm = editor.getJSON() as PmNode;
    const result = computeMarkers(pm, meta.cites, { clips: clips.infos, manual: meta.manualRefs }, style, meta.listed, meta.contentCitation);
    setMarks(result);
    setUsed(usedClipIds(pm, meta.cites));
    setWords(wordCount(pm));
    editor.view.dispatch(editor.state.tr.setMeta(MARKERS_META, result.markers));
  }, [editor, tick, meta.cites, meta.manualRefs, meta.listed, meta.contentCitation, style, clips.infos]);

  useEffect(() => () => { if (tickTimer.current) clearTimeout(tickTimer.current); }, []);

  // Figure pictures are read from the clips after the first paint, so each figure view redraws when the clips arrive.
  // `tick` changes when the editor is created, so figure views made after the clips loaded still get redrawn.
  useEffect(() => {
    figureSources.clear();
    for (const [id, info] of clips.infos) if (info.media?.kind === 'image') figureSources.set(id, info.media.src);
    window.dispatchEvent(new Event(CLIPS_CHANGED));
  }, [clips.infos, tick]);

  // Re-measure when the page size or margins change, and when the sheet's width changes (the window or the sidebar).
  useEffect(() => {
    schedulePaginate();
  }, [meta.page.size, meta.page.margin, meta.page.marginPx, printing, zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  // Alt + mouse wheel zooms the sheet. A native listener, so the page does not scroll while zooming.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      if (!ev.altKey) return;
      ev.preventDefault();
      const next = Math.round((zoomRef.current + (ev.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)) * 100) / 100;
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  // a new or removed comment changes the notes beside the text
  useEffect(() => {
    schedulePaginate();
  }, [meta.comments]); // eslint-disable-line react-hooks/exhaustive-deps
  // the front matter and the reference list change the page too, and they are not part of the editor's document
  useEffect(() => {
    schedulePaginate();
  }, [meta.front, meta.hide, marks.references]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => schedulePaginate());
    ro.observe(el);
    el.addEventListener('load', schedulePaginate, true); // a picture that finishes loading changes its block's height
    return () => {
      ro.disconnect();
      el.removeEventListener('load', schedulePaginate, true);
    };
  }, []); // the sheet element is always mounted

  // Page tools. Add page inserts a page break and an empty paragraph after the cursor's block; Delete page removes the
  // blocks on the page the person picked in Page settings (it asks first; Ctrl+Z undoes it); Go to page scrolls the page box into view.
  const addPage = () => {
    const e = editorRef.current;
    if (!e) return;
    const $from = e.state.doc.resolve(e.state.selection.from);
    if ($from.depth < 2) return;
    const at = $from.after(2);
    const tr = e.state.tr.insert(at, [e.schema.nodes.pageBreak.create(), e.schema.nodes.paragraph.create()]);
    tr.setSelection(TextSelection.create(tr.doc, at + 2));
    e.view.dispatch(tr.scrollIntoView());
    e.view.focus();
  };
  const deletePage = (n: number) => {
    const e = editorRef.current;
    if (!e) return;
    paginate();
    const g = scaleGeo(geoOf(metaRef.current), effZoomRef.current);
    const on = layoutRef.current.filter((it) => pageOf(it.y, g) + 1 === n);
    if (on.length === 0) return;
    if (!window.confirm(`Delete everything on page ${n}? You can undo it with Ctrl+Z.`)) return;
    e.view.dispatch(closeHistory(e.state.tr)); // ends the typing's undo step first, so the delete is a step of its own
    const tr = e.state.tr;
    for (const it of [...on].reverse()) tr.delete(it.pos, it.pos + it.size);
    e.view.dispatch(closeHistory(tr)); // its own undo step, even right after typing
    e.view.focus();
  };
  const goToPage = (n: number) => {
    document.querySelector(`[data-page-box="${n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Print or save as PDF. The pages are laid out again with no gap between them, a copy of the sheet is put in a
   * print-only container (the rest of the app is hidden by the print style in globals.css), and the browser's print
   * dialog opens. Everything is put back when the dialog closes.
   */
  const print = async () => {
    const sheet = wrapRef.current;
    if (!sheet || printing) return;
    setPrinting(true);
    await new Promise((r) => setTimeout(r, 900)); // the pages settle with the new gap
    const { size } = metaRef.current.page;
    const root = document.createElement('div');
    root.id = 'paper-print-root';
    root.style.width = `${size === 'a4' ? 794 : 816}px`;
    root.appendChild(sheet.cloneNode(true));
    const pageRule = document.createElement('style');
    pageRule.textContent = `@page { size: ${size === 'a4' ? '794px 1123px' : '816px 1056px'}; margin: 0; }`;
    document.body.append(root, pageRule);
    const done = () => {
      window.removeEventListener('afterprint', done);
      root.remove();
      pageRule.remove();
      setPrinting(false);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  /** Downloads the paper as a Markdown file: headings, text, tables and [@key] citations, with the key list at the end. */
  const downloadMarkdown = () => {
    const e = editorRef.current;
    if (!e) return;
    const text = paperToMarkdown(e.getJSON() as PmNode, metaRef.current);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(nameRef.current || 'paper').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'paper'}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /** Downloads the paper as a Word file: the page layout, the in-text markers and the reference list as the editor shows them. */
  const downloadDocx = async () => {
    const e = editorRef.current;
    if (!e) return;
    const pm = e.getJSON() as PmNode;
    const m = metaRef.current;
    const rendered = computeMarkers(pm, m.cites, { clips: infosRef.current, manual: m.manualRefs }, styleRef.current, m.listed, m.contentCitation);
    const images = Object.fromEntries([...infosRef.current].flatMap(([id, info]) => (info.media?.kind === 'image' ? [[id, info.media.src] as const] : [])));
    const bytes = await paperToDocx(pm, m, rendered, images);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(nameRef.current || 'paper').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'paper'}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const leave = async () => {
    await autosave.flush();
    if (autosave.state.kind === 'error' && !window.confirm('This paper has changes that are not saved yet. Leave anyway?')) return;
    onClose();
  };

  const status = autosave.state;
  const overLimit = meta.wordLimit !== null && words > meta.wordLimit;

  return (
    <div
      ref={rootRef}
      className="flex-1 min-w-0 flex flex-col bg-[#E8EDF6] dark:bg-[#0B0B0D] animate-clipIn"
      data-testid="paper-editor"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'f') {
          e.preventDefault(); // the page's own find bar would miss the text that is split over pages
          openFind();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214]">
        <button type="button" onClick={() => void leave()} data-testid="paper-back" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <ArrowLeft size={14} /> Papers
        </button>
        <input
          value={name}
          onChange={(e) => changeName(e.target.value)}
          maxLength={200}
          aria-label="Paper name"
          data-testid="paper-name"
          className="min-w-[10rem] flex-1 max-w-md rounded-lg border border-transparent hover:border-[#D2DCEA] focus:border-[#325FEC] dark:hover:border-[#27272A] bg-transparent px-2 py-1 text-sm font-semibold text-[#0F172A] dark:text-white outline-none"
        />
        <span data-testid="save-status" role="status" className={`ml-auto inline-flex items-center gap-1.5 text-xs ${status.kind === 'error' || status.kind === 'conflict' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-zinc-400'}`}>
          {status.kind === 'saving' && <><CircleNotch size={13} className="animate-spin" /> Saving…</>}
          {status.kind === 'dirty' && <>Unsaved changes</>}
          {status.kind === 'saved' && <><CheckCircle size={13} weight="bold" className="text-emerald-600" /> Saved</>}
          {(status.kind === 'error' || status.kind === 'conflict') && <><WarningCircle size={13} weight="bold" /> {status.kind === 'error' ? status.message : 'Not saved'}</>}
        </span>
        <div className="relative" data-testid="paper-export-menu">
          <button type="button" onClick={() => setExportOpen((v) => !v)} aria-haspopup="menu" aria-expanded={exportOpen} data-testid="paper-export" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <DownloadSimple size={14} /> Export
          </button>
          {exportOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-1 flex w-40 flex-col rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-1 shadow-lg">
              {([
                ['Word (.docx)', 'paper-docx', () => void downloadDocx()],
                ['PDF (print)', 'paper-print', () => void print()],
                ['Markdown (.md)', 'paper-markdown', downloadMarkdown],
              ] as const).map(([label, testid, action]) => (
                <button key={testid} type="button" role="menuitem" data-testid={testid} disabled={testid === 'paper-print' && printing} onClick={() => { setExportOpen(false); action(); }} className="rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Popover testId="paper-citations-menu" width="w-72" trigger={({ open, toggle }) => (
          <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" data-testid="paper-citations-button" title={STYLE_NOTE[style] || undefined} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            Citations <span className="font-normal">{STYLES.find((s) => s.id === style)?.label}</span> <CaretDown size={10} />
          </button>
        )}>
          {(close) => (
            <div className="flex flex-col gap-3 p-3 text-xs text-slate-600 dark:text-zinc-300">
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Content citation <span className="font-normal text-slate-400">(in the text)</span></span>
                <select value={contentOf(style, meta.contentCitation)} onChange={(e) => { changeMeta({ ...metaRef.current, contentCitation: e.target.value as 'numbered' | 'author-date' }); close(); }} data-testid="paper-content-citation" className="rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-1.5 py-1 text-xs text-[#0F172A] dark:text-white">
                  <option value="numbered">Numbers, like [1], that point to the list</option>
                  <option value="author-date">Author and year, like (Lee, 2020)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Reference citation <span className="font-normal text-slate-400">(the list at the end)</span></span>
                <select value={style} onChange={(e) => { changeStyle(e.target.value); close(); }} data-testid="paper-style" className="rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-1.5 py-1 text-xs text-[#0F172A] dark:text-white">
                  {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            </div>
          )}
        </Popover>
        <button
          type="button"
          onClick={() => setPanel((v) => !v)}
          aria-pressed={panel}
          data-testid="front-matter-toggle"
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${panel ? 'bg-[#325FEC]/15 text-[#325FEC] dark:text-[#8DB4FF]' : 'text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'}`}
        >
          <SidebarSimple size={14} /> Bibliography
        </button>
      </div>

      {infoOpen && STYLE_NOTE[style] && (
        <div className="flex items-center gap-3 px-4 py-1 bg-[#FAFBFD] dark:bg-[#121214] border-b border-[#D2DCEA] dark:border-[#27272A]" data-testid="info-bar">
          <p className="flex-1 text-[11px] text-slate-500 dark:text-zinc-500">{STYLE_NOTE[style]}</p>
          <button type="button" onClick={closeInfo} aria-label="Close note" data-testid="info-close" className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><X size={12} /></button>
        </div>
      )}

      {status.kind === 'conflict' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-b border-amber-300">
          <span>This paper was changed in another tab or window. Load that version, or keep yours (it saves over the other one).</span>
          <button type="button" onClick={onReload} data-testid="conflict-load" className="rounded-md border border-amber-400 px-2 py-1 font-semibold cursor-pointer">Load that version</button>
          <button type="button" onClick={autosave.keepMine} data-testid="conflict-keep" className="rounded-md bg-amber-600 px-2 py-1 font-semibold text-white cursor-pointer">Keep mine</button>
        </div>
      )}

      <PaperToolbar
        editor={editor}
        meta={meta}
        onMeta={changeMeta}
        onPageSettings={() => setPageOpen(true)}
        onHeaderFooter={() => setHfOpen(true)}
        onFind={openFind}
        commentsShown={commentsShown}
        onToggleComments={() => setCommentsShown((v) => !v)}
        zoom={zoom}
        onZoom={(z) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100)))}
      />
      {find && editor && <FindBar key={find.n} editor={editor} initialQuery={find.query} onClose={() => setFind(null)} />}
      {toast && (
        <div role="status" data-testid="paper-toast" className="pointer-events-none fixed bottom-6 left-1/2 z-[80] max-w-[90vw] -translate-x-1/2 rounded-lg bg-[#0F172A] px-3.5 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* A click on a citation number jumps to the References list at the end of the paper */}
      <div
        className="relative flex-1 min-h-0 flex"
        onClick={(e) => {
          const cite = (e.target as HTMLElement).closest<HTMLElement>('[data-marker]');
          if (!cite) return;
          // the number goes to its own row in References; without one, to the References list
          const clipId = metaRef.current.cites[(cite.getAttribute('data-cite-keys') ?? '').split(';')[0]];
          const row = clipId ? document.getElementById(`paper-ref-${clipId}`) : null;
          (row ?? document.querySelector('[data-testid="paper-references"]'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      >
        {sidebar ? (
          <PaperSidebar
            atoms={clips.atoms}
            infos={clips.infos}
            used={used}
            listed={meta.listed}
            onList={addToReferences}
            projects={projects}
            projectId={projectId}
            loading={clips.loading}
            error={clips.error}
            onProjectChange={changeProject}
            onInsert={(id, mode) => place(id, mode)}
            onClose={() => setSidebar(false)}
          />
        ) : (
          <button type="button" onClick={() => setSidebar(true)} aria-label="Show clips" data-testid="sidebar-open" className="flex-shrink-0 w-8 border-r border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] flex items-start justify-center pt-3 text-slate-500 hover:text-[#325FEC] cursor-pointer">
            <Stack size={16} />
          </button>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
        {ruler && (
          <div className="px-4 pt-2 pb-1 overflow-y-hidden [scrollbar-gutter:stable] bg-[#E8EDF6] dark:bg-[#0B0B0D]">
            <PaperRuler width={meta.page.size === 'a4' ? 794 : 816} margin={geoOf(meta).top} unit={unitFor(meta.page.size)} onGuide={setGuide} onMargin={(px) => changeMeta({ ...meta, page: { ...meta.page, marginPx: px } })} />
          </div>
        )}
        <main className={`flex-1 min-w-0 overflow-y-auto px-4 py-6 [scrollbar-gutter:stable]${commentsShown && pins.length > 0 ? ' pr-60' : ''}`}>
          {!editor && (
            <div className="mx-auto w-full max-w-[794px] bg-white shadow-lg ring-1 ring-[#D2DCEA] px-16 py-14" aria-busy="true" data-testid="paper-skeleton">
              <h1 className="paper-title text-center">{meta.front.title || name}</h1>
              <div className="mt-8 space-y-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-2 rounded-full bg-[#E8EDF6]" style={{ width: `${i % 3 === 2 ? 60 : 100}%` }} />)}</div>
            </div>
          )}
          <PaperPageSheet editor={editor} meta={meta} references={marks.references} pages={pages} geo={geoOf(meta)} wrapRef={wrapRef} guide={guide} onEditFront={() => setPanel(true)} pins={commentsShown ? pins : []} commentsShown={commentsShown} zoom={zoom} onPickPin={pickComment} onDeletePin={deleteComment} />
        </main>
        </div>
        {panel && <FrontMatterPanel meta={meta} onChange={changeMeta} onClose={() => setPanel(false)} />}
        {pageOpen && <PageSettingsDialog meta={meta} onChange={changeMeta} pages={pages} current={pageNow} onAddPage={() => { addPage(); setPageOpen(false); }} onGoTo={(n) => { goToPage(n); setPageOpen(false); }} onDelete={(n) => { setPageOpen(false); deletePage(n); }} ruler={ruler} onRuler={setRuler} onClose={() => setPageOpen(false)} />}
        {hfOpen && <HeaderFooterDialog meta={meta} onChange={changeMeta} onClose={() => setHfOpen(false)} />}
      </div>
      <div className="flex items-center justify-end gap-3 px-4 py-1 border-t border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214]">
        {oneColPage !== null && (
          <span data-testid="one-column-note" role="status" className="mr-auto text-xs text-slate-500 dark:text-zinc-400">
            The two-column section on page {oneColPage} is taller than a page, so it is shown in one column here. Word export keeps two columns.
          </span>
        )}
        {tallPage !== null && (
          <span data-testid="tall-block-note" role="status" className="mr-auto text-xs text-amber-700 dark:text-amber-400">
            A block on page {tallPage} is taller than a page and runs past its edge. Split it into smaller parts.
          </span>
        )}
        <span data-testid="word-count" className={`text-xs ${overLimit ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-zinc-400'}`}>
          {words.toLocaleString()} {words === 1 ? 'word' : 'words'}{meta.wordLimit ? ` of ${meta.wordLimit.toLocaleString()}` : ''}
        </span>
      </div>
    </div>
  );
}

/** A line of a text block: top and bottom in px from the top of its text with any split gaps taken out, and where it is. */
interface TextLine {
  top: number;
  bottom: number;
  clientTop: number;
  clientBottom: number;
  /** Where the line starts: the text node, and the box of the line's first piece in that node's list of boxes. */
  node: Text;
  piece: number;
}

/** The lines of a paragraph, from the boxes of its text. Line boxes are as tall as the paragraph's line height. */
function textLines(block: HTMLElement, contentTop: number, gaps: HTMLElement[], z: number): TextLine[] {
  const lh = (parseFloat(getComputedStyle(block).lineHeight) || 0) * z;
  const range = document.createRange();
  const lines: Array<TextLine & { left: number }> = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    range.selectNodeContents(n);
    Array.from(range.getClientRects()).forEach((r, piece) => {
      if (r.width <= 0 || r.height <= 0) return;
      const mid = (r.top + r.bottom) / 2;
      const same = lines.find((l) => Math.abs(mid - (l.clientTop + l.clientBottom) / 2) < 4);
      if (same) {
        if (r.left < same.left) {
          same.left = r.left;
          same.node = n;
          same.piece = piece;
        }
        return;
      }
      const h = Math.max(lh, r.height);
      lines.push({ top: 0, bottom: 0, left: r.left, clientTop: mid - h / 2, clientBottom: mid + h / 2, node: n, piece });
    });
  }
  lines.sort((a, b) => a.clientTop - b.clientTop);
  const gapBoxes = gaps.map((g) => g.getBoundingClientRect());
  for (const l of lines) {
    const above = gapBoxes.filter((g) => g.bottom <= l.clientTop + 1).reduce((n, g) => n + g.height, 0);
    l.top = l.clientTop - contentTop - above;
    l.bottom = l.clientBottom - contentTop - above;
  }
  return lines;
}

/** The offset in a line's text node where the line starts, found by halving (text flows down the page, so it is monotonic). */
function lineStartOffset(line: TextLine): number {
  const range = document.createRange();
  range.selectNodeContents(line.node);
  const piece = Array.from(range.getClientRects())[line.piece];
  if (!piece || line.piece === 0) return 0;
  const target = (piece.top + piece.bottom) / 2 - 2;
  let lo = 0;
  let hi = line.node.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    range.setStart(line.node, mid);
    range.setEnd(line.node, Math.min(line.node.length, mid + 1));
    const r = range.getClientRects()[0];
    const centre = r ? (r.top + r.bottom) / 2 : null;
    if (centre === null || centre < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function PaperEditor({ paperId, initial, onClose }: Props) {
  const [paper, setPaper] = useState<Paper | null>(initial ?? null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`/api/papers/${paperId}`, { credentials: 'same-origin', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data) {
        setPaper(json.data);
        setVersion((v) => v + 1);
      } else setError(json.error || 'This paper could not be opened.');
    } catch {
      setError('This paper could not be opened. Check your connection and try again.');
    }
  }, [paperId]);

  useEffect(() => {
    if (!paper) void load();
  }, [paper, load]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-slate-600 dark:text-zinc-400" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onClose} className="rounded-lg border border-[#D2DCEA] dark:border-[#27272A] px-3 py-1.5 text-xs font-semibold cursor-pointer">Back to papers</button>
      </div>
    );
  }
  if (!paper) return <div className="flex-1 flex items-center justify-center text-xs text-slate-500" aria-busy="true">Opening paper…</div>;
  return <EditorBody key={`${paper.id}-${version}`} paper={paper} onClose={onClose} onReload={() => setPaper(null)} />;
}

export default PaperEditor;
