'use client';

import React, { useState } from 'react';
import { initialsOf } from './ProjectAvatar';

// The avatar of a project: its initials in the folder colour, or a photo cropped to a square. Used when a project
// is created and when its settings change it. The photo is stored as a small square JPEG in folderIcon ('photo:<data URL>').

const FRAME = 240; // the crop square on screen, in px
const OUT = 96; // the saved avatar, in px

interface Crop {
  img: HTMLImageElement;
  zoom: number; // 1 = the photo just covers the square; more zooms in
  x: number; // where the photo's top-left sits inside the square
  y: number;
}

const coverScale = (img: HTMLImageElement) => Math.max(FRAME / img.width, FRAME / img.height);

// Keeps the photo covering the whole square: no empty edge can show.
function clamp(img: HTMLImageElement, zoom: number, x: number, y: number) {
  const s = coverScale(img) * zoom;
  return {
    x: Math.min(0, Math.max(FRAME - img.width * s, x)),
    y: Math.min(0, Math.max(FRAME - img.height * s, y)),
  };
}

function cropToJpeg(c: Crop): string {
  const s = coverScale(c.img) * c.zoom;
  const canvas = document.createElement('canvas');
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(c.img, -c.x / s, -c.y / s, FRAME / s, FRAME / s, 0, 0, OUT, OUT);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => {
      URL.revokeObjectURL(url);
      resolve(el);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    el.src = url;
  });
}

interface AvatarPickerProps {
  mode: 'initials' | 'photo';
  title: string;
  /** The folder colour: the initials and the ring around the photo use it. */
  color: string;
  photo: string | null;
  onPhoto: (dataUrl: string | null) => void;
  /** Off when the caller already shows the avatar itself. */
  preview?: boolean;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ mode, title, color, photo, onPhoto, preview = true }) => {
  const [crop, setCrop] = useState<Crop | null>(null);
  const [drag, setDrag] = useState<{ px: number; py: number; x: number; y: number } | null>(null);

  const pick = async (file: File) => {
    try {
      const img = await loadImage(file);
      const zoom = 1;
      const s = coverScale(img) * zoom;
      setCrop({ img, zoom, ...clamp(img, zoom, (FRAME - img.width * s) / 2, (FRAME - img.height * s) / 2) });
    } catch {
      onPhoto(null);
    }
  };

  // Zoom keeps the centre of the square on the same spot of the photo.
  const zoomTo = (c: Crop, zoom: number) => {
    const s0 = coverScale(c.img) * c.zoom;
    const s1 = coverScale(c.img) * zoom;
    const cx = (FRAME / 2 - c.x) / s0;
    const cy = (FRAME / 2 - c.y) / s0;
    setCrop({ ...c, zoom, ...clamp(c.img, zoom, FRAME / 2 - cx * s1, FRAME / 2 - cy * s1) });
  };

  const previewCircle = (
    <div
      data-testid="avatar-preview"
      className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold bg-[#FAFBFD] dark:bg-[#18181B]"
      style={{ border: `2px solid ${color}`, color }}
    >
      {mode === 'photo' && photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="w-full h-full object-cover" />
      ) : mode === 'photo' ? (
        <span className="text-[10px] font-normal text-slate-400">No photo</span>
      ) : (
        initialsOf(title) || '?'
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      {preview && previewCircle}
      {mode === 'photo' && (
        <div className="flex items-center gap-2">
          {photo && (
            <button
              type="button"
              onClick={() => onPhoto(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] cursor-pointer"
            >
              Remove
            </button>
          )}
          <label className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#D2DCEA] dark:border-[#27272A] text-slate-600 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] cursor-pointer">
            {photo ? 'Change photo' : 'Choose photo'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void pick(file);
              }}
            />
          </label>
        </div>
      )}

      {crop && (
        <div role="dialog" aria-modal="true" aria-label="Crop photo" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-display font-bold text-[#0F172A] dark:text-white">Crop your photo</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Drag the photo to move it. Use the slider to zoom.</p>
            </div>
            <div
              data-testid="avatar-crop-square"
              className="relative mx-auto overflow-hidden rounded-xl select-none bg-[#EEF3F8] dark:bg-[#09090B]"
              style={{ width: FRAME, height: FRAME, border: `2px solid ${color}`, touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({ px: e.clientX, py: e.clientY, x: crop.x, y: crop.y });
              }}
              onPointerMove={(e) => {
                if (!drag) return;
                setCrop({ ...crop, ...clamp(crop.img, crop.zoom, drag.x + e.clientX - drag.px, drag.y + e.clientY - drag.py) });
              }}
              onPointerUp={() => setDrag(null)}
              onPointerCancel={() => setDrag(null)}
            >
              <img
                src={crop.img.src}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.img.width * coverScale(crop.img) * crop.zoom,
                  height: crop.img.height * coverScale(crop.img) * crop.zoom,
                }}
              />
            </div>
            <label className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
              <span>Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={crop.zoom}
                onChange={(e) => zoomTo(crop, Number(e.target.value))}
                className="flex-1 accent-[#325FEC]"
                aria-label="Zoom"
              />
            </label>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCrop(null)}
                className="px-4 py-2 text-xs font-mono text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onPhoto(cropToJpeg(crop));
                  setCrop(null);
                }}
                className="px-5 py-2 text-xs font-display font-semibold text-white bg-[#325FEC] hover:bg-[#274AC4] rounded-xl shadow-sm cursor-pointer"
              >
                Use photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
