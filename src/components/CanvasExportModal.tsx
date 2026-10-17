'use client';

import React, { useEffect, useState } from 'react';
import { X, DownloadSimple, Check, Image as ImageIcon } from '@phosphor-icons/react';
import { CanvasAtomNode, CanvasFolder, CanvasShape, CanvasDrawingPath, CanvasConnector } from '@/lib/types/canvas';
import { boxCenter } from '@/lib/canvas/geometry';
import { buildCanvasSvg, type ExportAtom } from '@/lib/canvas/exportSvg';
import { ResearchAtom, ResearchProject } from '@/lib/types/research';

interface CanvasExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ResearchProject | null;
  nodes: CanvasAtomNode[];
  folders: CanvasFolder[];
  shapes: CanvasShape[];
  connectors?: CanvasConnector[];
  drawings: CanvasDrawingPath[];
  selectedIds: Set<string>;
  atomsById: Map<string, ResearchAtom>;
  /** Real heights of atom cards, which grow with their text. */
  nodeHeights?: Record<string, number>;
}

export type ExportFormat = 'png' | 'jpeg' | 'svg';
export type ExportScale = 0.25 | 0.5 | 1 | 2 | 3 | 4;
export type ExportScope = 'canvas' | 'section' | 'selection';

const MAX_SIDE = 8192;

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const CanvasExportModal: React.FC<CanvasExportModalProps> = ({
  isOpen,
  onClose,
  project,
  nodes,
  folders,
  shapes,
  connectors = [],
  drawings,
  selectedIds,
  atomsById,
  nodeHeights,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<ExportScale>(2);
  const [scope, setScope] = useState<ExportScope>('canvas');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folders[0]?.id || '');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the chosen section valid when sections are added or removed
  useEffect(() => {
    if (!folders.some((f) => f.id === selectedFolderId)) setSelectedFolderId(folders[0]?.id || '');
  }, [folders, selectedFolderId]);

  // A scope with nothing in it cannot stay selected
  useEffect(() => {
    if (scope === 'selection' && selectedIds.size === 0) setScope('canvas');
    if (scope === 'section' && folders.length === 0) setScope('canvas');
  }, [scope, selectedIds.size, folders.length]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const heightOf = (n: CanvasAtomNode) => nodeHeights?.[n.instanceId] ?? n.height ?? 120;

      let exNodes = nodes;
      let exShapes = shapes;
      let exFolders = folders;
      let exConnectors = connectors;
      let exDrawings = drawings;

      if (scope === 'selection') {
        exNodes = nodes.filter((n) => selectedIds.has(n.instanceId));
        exShapes = shapes.filter((sh) => selectedIds.has(sh.id));
        exFolders = folders.filter((f) => selectedIds.has(f.id));
        const ids = new Set([...exNodes.map((n) => n.instanceId), ...exShapes.map((sh) => sh.id), ...exFolders.map((f) => f.id)]);
        exConnectors = connectors.filter((c) => ids.has(c.fromId) && ids.has(c.toId));
        exDrawings = [];
      } else if (scope === 'section') {
        const target = folders.find((f) => f.id === selectedFolderId);
        if (target) {
          const inside = (cx: number, cy: number) =>
            cx >= target.x && cx <= target.x + target.width && cy >= target.y && cy <= target.y + target.height;
          exNodes = nodes.filter((n) => {
            const c = boxCenter({ x: n.x, y: n.y, width: n.width || 340, height: heightOf(n) });
            return inside(c.x, c.y);
          });
          exShapes = shapes.filter((sh) => {
            const c = boxCenter(sh);
            return inside(c.x, c.y);
          });
          exFolders = [target];
          const ids = new Set([...exNodes.map((n) => n.instanceId), ...exShapes.map((sh) => sh.id)]);
          exConnectors = connectors.filter((c) => ids.has(c.fromId) && ids.has(c.toId));
          exDrawings = drawings.filter((d) => d.points.some((p) => inside(p.x, p.y)));
        }
      }

      const atoms = new Map<string, ExportAtom>();
      atomsById.forEach((a, id) =>
        atoms.set(id, {
          type: a.type,
          title: a.title,
          text: a.content?.rawText || a.content?.text || a.content?.description || '',
          pageTitle: a.metadata?.pageTitle,
          sourceUrl: a.metadata?.sourceUrl,
        })
      );

      const built = buildCanvasSvg({
        nodes: exNodes,
        folders: exFolders,
        shapes: exShapes,
        connectors: exConnectors,
        drawings: exDrawings,
        atoms,
        nodeHeights,
        theme,
      });

      if (built.empty) {
        setError('There is nothing to export here yet.');
        setIsExporting(false);
        return;
      }

      const baseName = `${project?.title || 'canvas'}-${scope}@${scale}x`;
      const svgBlob = new Blob([built.svg], { type: 'image/svg+xml;charset=utf-8' });

      if (format === 'svg') {
        const url = URL.createObjectURL(svgBlob);
        download(url, `${baseName}.svg`);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        // PNG and JPEG are this same drawing, rendered to pixels
        const effective = Math.min(scale, MAX_SIDE / Math.max(built.width, built.height));
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Could not draw the canvas.'));
          img.src = url;
        });
        const canvasEl = document.createElement('canvas');
        canvasEl.width = Math.max(1, Math.round(built.width * effective));
        canvasEl.height = Math.max(1, Math.round(built.height * effective));
        const ctx = canvasEl.getContext('2d');
        if (!ctx) throw new Error('Could not draw the canvas.');
        ctx.fillStyle = theme === 'dark' ? '#09090B' : '#FAFBFD';
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
        URL.revokeObjectURL(url);
        download(canvasEl.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95), `${baseName}.${format}`);
      }

      setIsExporting(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The export failed.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6 bg-black/30 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-80 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl shadow-2xl p-4 space-y-3 mt-12 md:mr-4 animate-scaleUp"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#D2DCEA] dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} weight="bold" className="text-slate-800 dark:text-zinc-200" />
            <h3 className="text-xs font-display font-bold text-[#0F172A] dark:text-zinc-100">
              Export Canvas Image
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Export Modal"
            data-testid="close-canvas-export-modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
          >
            <X size={14} />
          </button>
        </div>

        {/* 1. Scope Selection (Grayscale selected bg) */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Export Scope</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'canvas', label: 'Canvas' },
              { id: 'selection', label: `Selected (${selectedIds.size})`, disabled: selectedIds.size === 0 },
              { id: 'section', label: `Section (${folders.length})`, disabled: folders.length === 0 },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                data-testid={`export-scope-${sc.id}`}
                data-scope-active={scope === sc.id ? 'true' : 'false'}
                disabled={sc.disabled}
                onClick={() => setScope(sc.id as ExportScope)}
                className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${
                  scope === sc.id
                    ? 'border-slate-800 dark:border-zinc-300 bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-950 font-bold shadow-xs'
                    : 'border-[#D2DCEA] dark:border-[#27272A] bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 disabled:opacity-30'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {scope === 'section' && folders.length > 0 && (
            <div className="pt-1">
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-lg px-2.5 py-1 text-[11px] text-[#0F172A] dark:text-zinc-200 outline-none"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2. Format Selection (Grayscale selected bg) */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Format</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['png', 'jpeg', 'svg'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`py-1.5 px-1.5 rounded-lg text-[11px] font-mono font-semibold uppercase border text-center transition-all ${
                  format === fmt
                    ? 'border-slate-800 dark:border-zinc-300 bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-950 shadow-xs'
                    : 'border-[#D2DCEA] dark:border-[#27272A] bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Background</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium border text-center capitalize transition-all ${
                  theme === t
                    ? 'border-slate-800 dark:border-zinc-300 bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-950 font-bold shadow-xs'
                    : 'border-[#D2DCEA] dark:border-[#27272A] bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Scale Selection (Grayscale selected bg) */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
            Scale {format === 'svg' && '(Vector)'}
          </label>
          <div className="grid grid-cols-6 gap-1">
            {([0.25, 0.5, 1, 2, 3, 4] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScale(sc)}
                className={`py-1 rounded-md text-[10.5px] font-mono text-center border transition-all ${
                  scale === sc
                    ? 'border-slate-800 dark:border-zinc-300 bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-950 font-bold'
                    : 'border-[#D2DCEA] dark:border-[#27272A] bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                {sc}x
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#D2DCEA] dark:border-[#27272A]">
          <button
            type="button"
            onClick={onClose}
            data-testid="cancel-canvas-export"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#202024]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting}
            data-testid="confirm-canvas-export"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-sm transition-all cursor-pointer"
          >
            <DownloadSimple size={13} weight="bold" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
