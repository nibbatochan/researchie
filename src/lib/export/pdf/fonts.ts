// Registers the report fonts with react-pdf. The files live in public/fonts (WOFF, Latin subset).
// react-pdf reads TTF and WOFF but not WOFF2.

import { Font } from '@react-pdf/renderer';

const FIGTREE = [400, 500, 600, 700];
const MONO = [400, 500, 700, 800];

const registered = new Set<string>();

/** fontBase is an absolute folder in Node tests, or '/fonts' in the browser. Safe to call twice. */
export function registerReportFonts(fontBase: string): void {
  if (registered.has(fontBase)) return;
  registered.add(fontBase);
  const base = fontBase.replace(/[\\/]+$/, '');
  const sep = base.includes('\\') ? '\\' : '/';
  Font.register({
    family: 'Figtree',
    fonts: FIGTREE.map((w) => ({ src: `${base}${sep}Figtree-${w}.woff`, fontWeight: w })),
  });
  Font.register({
    family: 'JetBrains Mono',
    fonts: MONO.map((w) => ({ src: `${base}${sep}JetBrainsMono-${w}.woff`, fontWeight: w })),
  });
  // Fallback for characters the Latin-subset fonts lack (Greek, Cyrillic, Latin-ext, math, arrows).
  // The same file is registered for every weight because react-pdf throws on an unregistered weight.
  Font.register({
    family: 'DejaVu Sans',
    fonts: [400, 500, 600, 700, 800].map((w) => ({ src: `${base}${sep}DejaVuSans.ttf`, fontWeight: w })),
  });
  // Stop mid-word breaks: long DOIs and URLs wrap at their own boundaries or overflow instead.
  Font.registerHyphenationCallback((word: string) => [word]);
}
