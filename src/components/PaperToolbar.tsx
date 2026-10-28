'use client';

import React, { useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  ArrowUUpLeft, ArrowUUpRight, TextB, TextItalic, TextUnderline, TextSubscript, TextSuperscript, TextAlignLeft, TextAlignCenter,
  TextAlignRight, TextAlignJustify, TextIndent, ListBullets, ListNumbers, Table as TableIcon, Link as LinkIcon, LinkBreak, Eraser, Minus, Article, Columns as ColumnsIcon, ArrowsVertical, CaretDown, Highlighter, MagnifyingGlass, File as FileIcon,
} from '@phosphor-icons/react';
import { FONT_FAMILIES, FONT_SIZES, HIGHLIGHTS } from '@/lib/paper/editor/extensions';
import { STYLE_LABELS, LINE_SPACINGS, DEFAULT_LINE, DEFAULT_SPACE, SPACE_ADDED, applyStyle, setBlockAttrs, styleOf, blockStateAt, type StyleId, type Alignment } from '@/lib/paper/editor/format';
import { deleteSectionHeading, hasHeading } from '@/lib/paper/editor/structure';
import type { Transaction } from '@tiptap/pm/state';
import { COLUMN_COUNTS, applyWidths, columnsAt, insertColumns, removeColumns, setSectionColumns, sectionColumnsAt, type ColumnPreset } from '@/lib/paper/editor/columns';
import type { PaperMeta } from '@/lib/paper/docModel';
import { Popover, MenuItem } from './ToolbarPopover';

// The editor's toolbar. Rethought from a real journal article (a PLOS ONE paper): a paragraph style menu that
// carries the article's type scale, font size, the inline marks, alignment, line spacing and first-line indent, lists,
// links, and the tools that take the structure apart (add a section, remove a heading, remove a section).
// Insert formula and insert table are left out on purpose: those arrive by paste for now.

const select = 'h-8 rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-1.5 text-xs text-[#0F172A] dark:text-white';

/** Word-style picker: hover a cell to choose the size, click to insert a table with a header row. */
const TableGrid: React.FC<{ onPick: (rows: number, cols: number) => void }> = ({ onPick }) => {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div data-testid="tb-table-grid" className="p-2">
      <div className="grid grid-cols-6 gap-0.5" onMouseLeave={() => setHover({ r: 0, c: 0 })}>
        {Array.from({ length: 36 }, (_, i) => {
          const r = Math.floor(i / 6) + 1;
          const c = (i % 6) + 1;
          const on = r <= hover.r && c <= hover.c;
          return (
            <button key={i} type="button" data-testid={`tb-table-${r}x${c}`} aria-label={`Table ${r} by ${c}`} onMouseEnter={() => setHover({ r, c })} onClick={() => onPick(r, c)} className={`h-4 w-4 rounded-sm border cursor-pointer ${on ? 'border-[#325FEC] bg-[#325FEC]' : 'border-slate-300 dark:border-zinc-600'}`} />
          );
        })}
      </div>
      <div className="mt-1.5 text-center text-[11px] text-slate-500 dark:text-zinc-400">{hover.r ? `${hover.r} × ${hover.c} table` : 'Insert table'}</div>
    </div>
  );
};

const Tool: React.FC<{ label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; testId?: string }> = ({ label, active, disabled, onClick, children, testId }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    data-testid={testId}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()} // keep the cursor in the text
    onClick={onClick}
    className={`inline-flex items-center gap-0.5 p-1.5 rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-default ${active ? 'bg-[#325FEC]/15 text-[#325FEC] dark:text-[#8DB4FF]' : 'text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'}`}
  >
    {children}
  </button>
);

const Sep = () => <span className="mx-1 h-5 w-px bg-[#D2DCEA] dark:bg-[#27272A]" aria-hidden />;

const Word: React.FC<{ label: string; title: string; disabled?: boolean; danger?: boolean; onClick: () => void; testId?: string; children: React.ReactNode }> = ({ label, title, disabled, danger, onClick, testId, children }) => (
  <button
    type="button"
    title={title}
    aria-label={label}
    data-testid={testId}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-30 disabled:cursor-default ${danger ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10' : 'text-slate-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'}`}
  >
    {children}
  </button>
);

// Colours a writer uses most, then a full picker and a hex box (Word-style).
const SWATCHES = ['#0F172A', '#475569', '#325FEC', '#DC2626', '#16A34A', '#EA580C', '#7C3AED', '#DB2777'];
const HEX = /^#?([0-9a-fA-F]{6})$/;

function ColorTool({ editor, current }: { editor: Editor; current: string }) {
  const [hex, setHex] = useState(current || '#0F172A');
  const [bad, setBad] = useState(false);
  const apply = (color: string, close: () => void) => {
    editor.chain().focus().setColor(color).run();
    setHex(color);
    close();
  };
  return (
    <Popover
      testId="tb-color-panel"
      width="w-60"
      trigger={({ toggle }) => (
        <Tool label="Text colour" onClick={toggle} testId="tb-color">
          <span className="flex flex-col items-center leading-none">
            <span className="text-[13px] font-bold">A</span>
            <span className="mt-0.5 h-[3px] w-4 rounded-sm" style={{ background: current || '#0F172A' }} />
          </span>
        </Tool>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          <div className="grid grid-cols-4 gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => apply(c, close)} className="h-7 w-full rounded-md border border-black/10 cursor-pointer" style={{ background: c }} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="color" aria-label="Colour picker" value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#0F172A'} onChange={(e) => apply(e.target.value, close)} className="h-8 w-10 cursor-pointer rounded border border-[#D2DCEA] bg-white p-0.5" />
            <input
              aria-label="Hex colour"
              data-testid="tb-hex"
              value={hex}
              onChange={(e) => {
                setHex(e.target.value);
                setBad(false);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const m = HEX.exec(hex.trim());
                if (m) apply(`#${m[1].toLowerCase()}`, close);
                else setBad(true);
              }}
              placeholder="#RRGGBB"
              maxLength={7}
              className={`w-full rounded-md border bg-white dark:bg-[#18181B] px-2 py-1 font-mono text-xs text-[#0F172A] dark:text-white ${bad ? 'border-red-500' : 'border-[#D2DCEA] dark:border-[#27272A]'}`}
            />
          </div>
          {bad && <p className="mt-1 text-[11px] text-red-600">Use six digits, for example #325FEC.</p>}
          <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); close(); }} className="mt-3 w-full rounded-md px-2 py-1 text-xs text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            Automatic (black)
          </button>
        </div>
      )}
    </Popover>
  );
}

export interface PaperToolbarProps {
  editor: Editor | null;
  meta: PaperMeta;
  onMeta: (next: PaperMeta) => void;
  onPageSettings: () => void;
  onHeaderFooter: () => void;
  onFind: () => void;
}

const ALIGN: Array<{ id: Alignment; label: string; icon: React.ElementType }> = [
  { id: 'left', label: 'Align left', icon: TextAlignLeft },
  { id: 'center', label: 'Centre', icon: TextAlignCenter },
  { id: 'right', label: 'Align right', icon: TextAlignRight },
  { id: 'justify', label: 'Justify', icon: TextAlignJustify },
];

const PRESETS: Array<{ id: ColumnPreset; label: string }> = [
  { id: 'equal', label: 'Equal widths' },
  { id: 'first', label: 'First column wider' },
  { id: 'last', label: 'Last column wider' },
];

const panelTitle = 'px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const chip = (on: boolean) => `rounded-md border px-2 py-1 text-xs cursor-pointer ${on ? 'border-[#325FEC] bg-[#325FEC]/12 font-semibold text-[#325FEC] dark:text-[#8DB4FF]' : 'border-[#D2DCEA] dark:border-[#27272A] text-slate-700 dark:text-zinc-300 hover:border-[#325FEC]/50'}`;

/** The Columns button's panel: columns for the whole paper, new columns at the cursor, and the ones the cursor is in. */
function ColumnsPanel({ editor, meta, onMeta, inside, close }: { editor: Editor; meta: PaperMeta; onMeta: (m: PaperMeta) => void; inside: boolean; close: () => void }) {
  const [count, setCount] = useState(3);
  const [preset, setPreset] = useState<ColumnPreset>('equal');
  const run = (tr: Transaction | null) => {
    if (tr) editor.view.dispatch(tr);
    editor.view.focus();
    close();
  };
  return (
    <div>
      <p className={panelTitle}>Whole paper</p>
      <div className="flex gap-1.5 px-2 pb-2">
        {([1, 2] as const).map((n) => (
          <button key={n} type="button" data-testid={`col-paper-${n}`} aria-pressed={meta.page.columns === n} onClick={() => { onMeta({ ...meta, page: { ...meta.page, columns: n } }); if (!editor.isDestroyed) editor.view.dispatch(setSectionColumns(editor.state, '', true) ?? editor.state.tr); }} className={chip(meta.page.columns === n)}>
            {n === 1 ? 'One column' : 'Two columns'}
          </button>
        ))}
      </div>
      {sectionColumnsAt(editor.state) !== null && (
        <>
          <p className={panelTitle}>This section</p>
          <div className="flex gap-1.5 px-2 pb-2">
            {(['1', '2'] as const).map((n) => (
              <button key={n} type="button" data-testid={`col-section-${n}`} aria-pressed={sectionColumnsAt(editor.state) === n} onClick={() => run(setSectionColumns(editor.state, n))} className={chip(sectionColumnsAt(editor.state) === n)}>
                {n === '1' ? 'One column' : 'Two columns'}
              </button>
            ))}
          </div>
        </>
      )}
      <p className={panelTitle}>Add columns at the cursor</p>
      <div className="flex flex-wrap gap-1.5 px-2">
        {COLUMN_COUNTS.map((n) => (
          <button key={n} type="button" data-testid={`col-count-${n}`} aria-pressed={count === n} onClick={() => setCount(n)} className={chip(count === n)}>{n}</button>
        ))}
      </div>
      <div className="flex flex-col gap-1 px-2 pt-2">
        {PRESETS.map((pr) => (
          <label key={pr.id} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
            <input type="radio" name="col-preset" checked={preset === pr.id} onChange={() => setPreset(pr.id)} data-testid={`col-preset-${pr.id}`} /> {pr.label}
          </label>
        ))}
      </div>
      <button type="button" data-testid="col-insert" onClick={() => run(insertColumns(editor.state, count, preset))} className="mx-2 mt-2 w-[calc(100%-1rem)] rounded-md bg-[#325FEC] px-2 py-1.5 text-xs font-semibold text-white cursor-pointer">
        Add {count} columns
      </button>
      {inside && (
        <>
          <p className={`${panelTitle} mt-1`}>These columns</p>
          {PRESETS.map((pr) => <MenuItem key={pr.id} label={pr.label} testId={pr.id === 'equal' ? 'col-equal' : `col-width-${pr.id}`} onClick={() => run(applyWidths(editor.state, pr.id))} />)}
          <p className="px-2 pt-1 pb-1.5 text-[11px] text-slate-500">Or drag the lines between the columns, or focus one and use the arrow keys.</p>
          <MenuItem label="Remove columns, keep the text" testId="col-remove" onClick={() => run(removeColumns(editor.state))} />
        </>
      )}
    </div>
  );
}

export function PaperToolbar({ editor, meta, onMeta, onPageSettings, onHeaderFooter, onFind }: PaperToolbarProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const block = blockStateAt(e.state);
      return {
        bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), sub: e.isActive('subscript'), sup: e.isActive('superscript'),
        ul: e.isActive('bulletList'), ol: e.isActive('orderedList'), link: e.isActive('link'),
        color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
        size: (e.getAttributes('fontSize').size as string | undefined) ?? '',
        style: styleOf(e.state),
        align: block.align, line: block.line ?? '', indent: block.indent === 'first', before: block.before, after: block.after,
        font: (e.getAttributes('fontFamily').family as string | undefined) ?? '',
        hl: (e.getAttributes('highlight').color as string | undefined) ?? '',
        highlighted: e.isActive('highlight'),
        canUndo: e.can().undo(), canRedo: e.can().redo(),
        heading: hasHeading(e.state.doc, e.state.selection.from),
        inColumns: columnsAt(e.state) !== null,
      };
    },
  });
  if (!editor || !s) return <div className="h-11 border-b border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214]" />;

  const run = (tr: Transaction | null) => {
    if (tr) editor.view.dispatch(tr);
    editor.view.focus();
  };
  const chain = () => editor.chain().focus();
  const setAlign = (a: Alignment) => run(setBlockAttrs(editor.state, { align: a }));
  const AlignIcon = ALIGN.find((a) => a.id === s.align)?.icon ?? TextAlignLeft;
  const pos = editor.state.selection.from;

  return (
    <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 px-3 py-1.5 border-b border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214]" role="toolbar" aria-label="Formatting" data-testid="paper-toolbar">
      <Tool label="Find and replace" onClick={onFind} testId="tb-find"><MagnifyingGlass size={16} /></Tool>
      <Tool label="Undo" disabled={!s.canUndo} onClick={() => chain().undo().run()}><ArrowUUpLeft size={16} /></Tool>
      <Tool label="Redo" disabled={!s.canRedo} onClick={() => chain().redo().run()}><ArrowUUpRight size={16} /></Tool>
      <Sep />

      <select
        aria-label="Paragraph style"
        data-testid="tb-style"
        value={s.style}
        onChange={(e) => run(applyStyle(editor.state, e.target.value as StyleId))}
        disabled={!s.style}
        className={`${select} w-36`}
      >
        {!s.style && <option value="">Style</option>}
        {STYLE_LABELS.map((st) => <option key={st.id} value={st.id}>{st.label} · {st.hint}</option>)}
      </select>
      <select
        aria-label="Font size"
        data-testid="tb-size"
        value={s.size}
        onChange={(e) => (e.target.value ? chain().setMark('fontSize', { size: e.target.value }).run() : chain().unsetMark('fontSize').run())}
        className={`${select} w-[4.5rem] ml-1`}
      >
        <option value="">Size</option>
        {FONT_SIZES.map((n) => <option key={n} value={String(n)}>{n} pt</option>)}
      </select>
      <select
        aria-label="Font"
        data-testid="tb-font"
        value={s.font}
        onChange={(e) => (e.target.value ? chain().setMark('fontFamily', { family: e.target.value }).run() : chain().unsetMark('fontFamily').run())}
        className={`${select} w-[5.5rem] ml-1`}
      >
        <option value="">Font</option>
        {FONT_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <ColorTool key={s.color} editor={editor} current={s.color} />
      <Popover testId="tb-highlight-panel" width="w-44" trigger={({ open, toggle }) => (
        <Tool label="Highlight" active={open || s.highlighted} onClick={toggle} testId="tb-highlight"><Highlighter size={16} /><CaretDown size={9} /></Tool>
      )}>
        {(close) => (
          <div className="p-1.5">
            <div className="grid grid-cols-5 gap-1.5">
              {HIGHLIGHTS.map((h) => (
                <button key={h.id} type="button" aria-label={`Highlight ${h.label}`} data-testid={`hl-${h.id}`} onClick={() => { chain().setMark('highlight', { color: h.id }).run(); close(); }} className={`h-6 w-full rounded-md border cursor-pointer ${s.hl === h.id ? 'border-[#325FEC]' : 'border-black/10'}`} style={{ background: h.hex }} />
              ))}
            </div>
            <button type="button" data-testid="hl-none" onClick={() => { chain().unsetMark('highlight').run(); close(); }} className="mt-2 w-full rounded-md px-2 py-1 text-xs text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">No highlight</button>
          </div>
        )}
      </Popover>
      <Sep />

      <Tool label="Bold" active={s.bold} onClick={() => chain().toggleBold().run()} testId="tb-bold"><TextB size={16} /></Tool>
      <Tool label="Italic" active={s.italic} onClick={() => chain().toggleItalic().run()}><TextItalic size={16} /></Tool>
      <Tool label="Underline" active={s.underline} onClick={() => chain().toggleUnderline().run()}><TextUnderline size={16} /></Tool>
      <Popover testId="tb-more-text-menu" width="w-48" trigger={({ open, toggle }) => (
        <Tool label="More text formats" active={open || s.sub || s.sup} onClick={toggle} testId="tb-more-text"><TextSubscript size={16} /><CaretDown size={9} /></Tool>
      )}>
        {(close) => (
          <>
            <MenuItem label="Subscript" icon={<TextSubscript size={15} />} active={s.sub} testId="tb-sub" onClick={() => { chain().toggleSubscript().run(); close(); }} />
            <MenuItem label="Superscript" icon={<TextSuperscript size={15} />} active={s.sup} testId="tb-sup" onClick={() => { chain().toggleSuperscript().run(); close(); }} />
            <MenuItem label="Clear formatting" icon={<Eraser size={15} />} testId="tb-clear" onClick={() => { chain().unsetAllMarks().run(); close(); }} />
          </>
        )}
      </Popover>
      <Sep />

      <Popover testId="tb-align-menu" width="w-44" trigger={({ open, toggle }) => (
        <Tool label="Alignment" active={open} onClick={toggle} testId="tb-align"><AlignIcon size={16} /><CaretDown size={9} /></Tool>
      )}>
        {(close) => ALIGN.map(({ id, label, icon: Icon }) => (
          <MenuItem key={id} label={label} icon={<Icon size={15} />} active={(s.align ?? 'left') === id} testId={`tb-align-${id}`} onClick={() => { setAlign(id); close(); }} />
        ))}
      </Popover>
      <Popover testId="tb-line-menu" width="w-48" trigger={({ open, toggle }) => (
        <Tool label="Line spacing" active={open} onClick={toggle} testId="tb-line"><ArrowsVertical size={16} /><CaretDown size={9} /></Tool>
      )}>
        {(close) => (
          <>
            <p className={panelTitle}>Line spacing</p>
            {LINE_SPACINGS.map((n) => (
              <MenuItem
                key={n}
                label={`${Number(n).toFixed(n === '1.15' ? 2 : 1)}${n === DEFAULT_LINE ? ' (normal)' : ''}`}
                active={(s.line || DEFAULT_LINE) === n}
                testId={`tb-line-${n}`}
                onClick={() => { run(setBlockAttrs(editor.state, { line: n === DEFAULT_LINE ? null : n })); close(); }}
              />
            ))}
            <div className="my-1 h-px bg-[#D2DCEA] dark:bg-[#27272A]" />
            <MenuItem
              label={Number(s.before ?? DEFAULT_SPACE.before) > 0 ? 'Remove space before paragraph' : 'Add space before paragraph'}
              testId="tb-space-before"
              onClick={() => { run(setBlockAttrs(editor.state, { before: Number(s.before ?? DEFAULT_SPACE.before) > 0 ? '0' : SPACE_ADDED })); close(); }}
            />
            <MenuItem
              label={Number(s.after ?? DEFAULT_SPACE.after) > 0 ? 'Remove space after paragraph' : 'Add space after paragraph'}
              testId="tb-space-after"
              onClick={() => { run(setBlockAttrs(editor.state, { after: Number(s.after ?? DEFAULT_SPACE.after) > 0 ? '0' : SPACE_ADDED })); close(); }}
            />
            <MenuItem label="First-line indent" active={s.indent} testId="tb-indent" icon={<TextIndent size={15} />} onClick={() => { run(setBlockAttrs(editor.state, { indent: s.indent ? null : 'first' })); close(); }} />
          </>
        )}
      </Popover>
      <Sep />

      <Popover testId="tb-lists-menu" width="w-44" trigger={({ open, toggle }) => (
        <Tool label="Lists" active={open || s.ul || s.ol} onClick={toggle} testId="tb-lists">{s.ol ? <ListNumbers size={16} /> : <ListBullets size={16} />}<CaretDown size={9} /></Tool>
      )}>
        {(close) => (
          <>
            <MenuItem label="Bulleted list" icon={<ListBullets size={15} />} active={s.ul} testId="tb-ul" onClick={() => { chain().toggleBulletList().run(); close(); }} />
            <MenuItem label="Numbered list" icon={<ListNumbers size={15} />} active={s.ol} testId="tb-ol" onClick={() => { chain().toggleOrderedList().run(); close(); }} />
          </>
        )}
      </Popover>
      <Popover testId="tb-table-menu" width="w-44" trigger={({ open, toggle }) => (
        <Tool label="Insert table" active={open} onClick={toggle} testId="tb-table"><TableIcon size={16} /><CaretDown size={9} /></Tool>
      )}>
        {(close) => <TableGrid onPick={(rows, cols) => { chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(); close(); }} />}
      </Popover>
      {s.link ? (
        <Tool label="Remove link" active onClick={() => chain().unsetLink().run()}><LinkBreak size={16} /></Tool>
      ) : (
        <Tool
          label="Link"
          onClick={() => {
            const href = window.prompt('Link address (https://…)');
            if (href?.trim()) chain().setLink({ href: href.trim() }).run();
          }}
        >
          <LinkIcon size={16} />
        </Tool>
      )}
      <Sep />

      <Word label="Remove the heading" title="Remove this section's heading and keep its text" disabled={!s.heading} onClick={() => run(deleteSectionHeading(editor.state, pos))} testId="tb-remove-heading"><Minus size={15} /></Word>
      <Sep />

      <Popover testId="tb-columns-panel" width="w-60" trigger={({ toggle }) => (
        <Word label="Columns" title="Columns: for the whole paper, or side by side at the cursor" onClick={toggle} testId="tb-columns"><ColumnsIcon size={15} /> Columns<CaretDown size={9} /></Word>
      )}>
        {(close) => <ColumnsPanel editor={editor} meta={meta} onMeta={onMeta} inside={s.inColumns} close={close} />}
      </Popover>
      <Word label="Header and footer" title="Header and footer: pages, numbers, first page" onClick={onHeaderFooter} testId="tb-header-footer"><Article size={15} /> Header &amp; footer</Word>
      <Word label="Page" title="Page settings: size, margins, add or delete a page" onClick={onPageSettings} testId="tb-page"><FileIcon size={15} /> Page</Word>
    </div>
  );
}
