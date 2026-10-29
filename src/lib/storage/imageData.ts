// Reads an inline image ("data:image/png;base64,...") before it is stored in the public bucket. Only common raster
// types pass: SVG is refused (it can carry script), and anything that is not base64 image data is not uploaded at all.
// Kept free of app imports so it can be unit-tested on its own.

export const MAX_UPLOAD_BYTES = 4_300_000;

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface ParsedImage {
  contentType: string;
  ext: string;
  base64: string;
  bytes: number;
}

export function parseImageDataUrl(input: unknown): ParsedImage | null {
  if (typeof input !== 'string' || input.length > MAX_UPLOAD_BYTES * 1.4) return null;
  const match = input.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;
  const base64 = match[2];
  const bytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (bytes <= 0 || bytes > MAX_UPLOAD_BYTES) return null;
  return { contentType: match[1], ext: EXTENSIONS[match[1]], base64, bytes };
}
