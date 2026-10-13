// Entry point for the browser. Nothing from react-pdf loads until the user exports.

import type { ReportModel } from './types.ts';

/** react-pdf draws only PNG and JPEG. Any other image is redrawn as PNG; if that fails it is left out. */
async function toPngOrJpegDataUrl(url: string): Promise<string | undefined> {
  if (/^data:image\/(png|jpe?g);base64,/i.test(url)) return url;
  if (typeof document === 'undefined') return undefined;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image failed to load'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return undefined;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined; // cross-origin without CORS, bad data, or unsupported format
  }
}

async function prepareImages(model: ReportModel): Promise<ReportModel> {
  const sections = await Promise.all(
    model.sections.map(async (section) => ({
      ...section,
      items: await Promise.all(
        section.items.map(async (item) => {
          if (!item.imageUrl) return item;
          const imageUrl = await toPngOrJpegDataUrl(item.imageUrl);
          return { ...item, imageUrl };
        }),
      ),
    })),
  );
  return { ...model, sections };
}

export async function generateReportPdf(model: ReportModel, options?: { fontBase?: string }): Promise<Blob> {
  const [{ pdf }, { createReportDocument }, { registerReportFonts }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ReportDocument.ts'),
    import('./fonts.ts'),
  ]);
  registerReportFonts(options?.fontBase ?? '/fonts');
  const ready = await prepareImages(model);
  return await pdf(createReportDocument(ready) as Parameters<typeof pdf>[0]).toBlob();
}
