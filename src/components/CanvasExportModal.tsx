'use client';

import React, { useState } from 'react';
import { X, DownloadSimple, Check, Image as ImageIcon } from '@phosphor-icons/react';
import { CanvasAtomNode, CanvasFolder, CanvasShape, CanvasDrawingPath } from '@/lib/types/canvas';
import { ResearchAtom, ResearchProject } from '@/lib/types/research';

interface CanvasExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ResearchProject | null;
  nodes: CanvasAtomNode[];
  folders: CanvasFolder[];
  shapes: CanvasShape[];
  drawings: CanvasDrawingPath[];
  selectedIds: Set<string>;
  atomsById: Map<string, ResearchAtom>;
}

export type ExportFormat = 'png' | 'jpeg' | 'svg';
export type ExportScale = 0.25 | 0.5 | 1 | 2 | 3 | 4;
export type ExportScope = 'canvas' | 'section' | 'selection';

export const CanvasExportModal: React.FC<CanvasExportModalProps> = ({
  isOpen,
  onClose,
  project,
  nodes,
  folders,
  shapes,
  drawings,
  selectedIds,
  atomsById,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<ExportScale>(2);
  const [scope, setScope] = useState<ExportScope>('canvas');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folders[0]?.id || '');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    try {
      // Determine items in export scope
      let exportNodes = nodes;
      let exportShapes = shapes;
      let exportDrawings = drawings;

      if (scope === 'selection') {
        exportNodes = nodes.filter((n) => selectedIds.has(n.instanceId));
        exportShapes = shapes.filter((s) => selectedIds.has(s.id));
      } else if (scope === 'section' && selectedFolderId) {
        const targetFolder = folders.find((f) => f.id === selectedFolderId);
        if (targetFolder) {
          exportNodes = nodes.filter(
            (n) =>
              n.x >= targetFolder.x &&
              n.x <= targetFolder.x + targetFolder.width &&
              n.y >= targetFolder.y &&
              n.y <= targetFolder.y + targetFolder.height
          );
          exportShapes = shapes.filter(
            (s) =>
              s.x >= targetFolder.x &&
              s.x <= targetFolder.x + targetFolder.width &&
              s.y >= targetFolder.y &&
              s.y <= targetFolder.y + targetFolder.height
          );
        }
      }

      // Calculate Bounding Box
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      exportNodes.forEach((n) => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + (n.width || 340));
        maxY = Math.max(maxY, n.y + (n.height || 140));
      });

      exportShapes.forEach((s) => {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.width);
        maxY = Math.max(maxY, s.y + s.height);
      });

      if (minX === Infinity) {
        minX = 0;
        minY = 0;
        maxX = 800;
        maxY = 600;
      }

      const padding = 60;
      const contentW = Math.max(maxX - minX + padding * 2, 400);
      const contentH = Math.max(maxY - minY + padding * 2, 300);

      const targetWidth = Math.round(contentW * scale);
      const targetHeight = Math.round(contentH * scale);

      // SVG Export Format
      if (format === 'svg') {
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${contentW} ${contentH}">
          <rect width="100%" height="100%" fill="#09090B"/>
          <g transform="translate(${-minX + padding}, ${-minY + padding})">`;

        // Draw shapes in SVG
        exportShapes.forEach((s) => {
          const fill = s.color?.includes('bg-transparent') ? 'none' : '#18181B';
          const stroke = s.strokeColor || '#325FEC';
          const sw = s.strokeWidth || 2;
          svgContent += `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
            <text x="${s.x + s.width / 2}" y="${s.y + s.height / 2 + 5}" font-family="sans-serif" font-size="13" fill="#FAFAFA" text-anchor="middle">${s.text || ''}</text>`;
        });

        // Draw atom cards in SVG
        exportNodes.forEach((n) => {
          const atom = atomsById.get(n.atomId);
          const w = n.width || 340;
          const h = n.height || 140;
          const text = (atom?.content?.rawText || atom?.content?.text || atom?.title || '').slice(0, 90);
          svgContent += `<rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="16" fill="#18181B" stroke="#27272A" stroke-width="1.5"/>
            <text x="${n.x + 16}" y="${n.y + 26}" font-family="monospace" font-size="10" font-weight="bold" fill="#325FEC">${(atom?.type || 'NOTE').toUpperCase()}</text>
            <text x="${n.x + 16}" y="${n.y + 54}" font-family="sans-serif" font-size="12" fill="#E4E4E7">${text}</text>`;
        });

        // Draw paths in SVG
        exportDrawings.forEach((d) => {
          if (d.points.length > 1) {
            const pData = d.points.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
            svgContent += `<path d="${pData}" stroke="${d.color}" stroke-width="${d.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
          }
        });

        svgContent += `</g></svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.title || 'canvas'}-${scope}@${scale}x.svg`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        onClose();
        return;
      }

      // Raster Export (PNG / JPEG) via Canvas
      const canvasEl = document.createElement('canvas');
      canvasEl.width = targetWidth;
      canvasEl.height = targetHeight;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      // Scale transformation
      ctx.scale(scale, scale);
      ctx.translate(-minX + padding, -minY + padding);

      // Dark Background
      ctx.fillStyle = '#09090B';
      ctx.fillRect(minX - padding, minY - padding, contentW, contentH);

      // Render shapes
      exportShapes.forEach((s) => {
        ctx.fillStyle = s.color?.includes('bg-transparent') ? 'transparent' : '#18181B';
        ctx.strokeStyle = s.strokeColor || '#325FEC';
        ctx.lineWidth = s.strokeWidth || 2;
        ctx.beginPath();
        ctx.roundRect(s.x, s.y, s.width, s.height, 12);
        ctx.fill();
        ctx.stroke();

        if (s.text) {
          ctx.fillStyle = '#FAFAFA';
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(s.text.slice(0, 40), s.x + s.width / 2, s.y + s.height / 2 + 5);
        }
      });

      // Render atom nodes
      exportNodes.forEach((n) => {
        const atom = atomsById.get(n.atomId);
        const w = n.width || 340;
        const h = n.height || 140;

        ctx.fillStyle = '#18181B';
        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(n.x, n.y, w, h, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#325FEC';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText((atom?.type || 'NOTE').toUpperCase(), n.x + 16, n.y + 26);

        ctx.fillStyle = '#E4E4E7';
        ctx.font = '12px sans-serif';
        const txt = atom?.content?.rawText || atom?.content?.text || atom?.title || 'Clip note';
        ctx.fillText(txt.slice(0, 80) + (txt.length > 80 ? '...' : ''), n.x + 16, n.y + 54);
      });

      // Render freehand drawings
      exportDrawings.forEach((d) => {
        if (d.points.length > 1) {
          ctx.strokeStyle = d.color;
          ctx.lineWidth = d.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          d.points.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        }
      });

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvasEl.toDataURL(mimeType, 0.95);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${project?.title || 'canvas'}-${scope}@${scale}x.${format}`;
      a.click();
      setIsExporting(false);
      onClose();
    } catch {
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
                    📁 {f.title}
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
