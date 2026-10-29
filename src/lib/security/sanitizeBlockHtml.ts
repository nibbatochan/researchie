// Cleans captured page HTML before it is saved or shown. A clipped block comes from a web page we do not
// control, so it must never run script, load a frame, or send the reader somewhere by a hidden link.
// Used on save (src/app/api/atoms/route.ts) for sanitizedHtml and standaloneHtml.

import sanitizeHtml from 'sanitize-html';

const SAFE_URL = /^(https?:|mailto:)/i;
const SAFE_IMAGE_SRC = /^(https?:|data:image\/(png|jpe?g|gif|webp|svg\+xml);)/i;

// A plain value: letters, digits, # ( ) , . % / space and -, with no function that fetches or reads (url, image-set,
// expression, var, attr, env) and no backslash.
const PLAIN_VALUE = /^(?!.*(?:url|image-set|expression|var|attr|env|calc-size|\\|@|;))[#a-z0-9(),.%\s/+-]{1,120}$/i;
const STYLE_PROPERTIES = [
  'color', 'background-color', 'font-size', 'font-weight', 'font-style', 'font-family', 'line-height', 'letter-spacing',
  'text-align', 'text-decoration', 'text-transform', 'text-indent', 'white-space', 'vertical-align',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-color', 'border-style', 'border-width', 'border-radius',
  'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
  'list-style-type', 'border-collapse', 'border-spacing', 'table-layout',
];
const STYLES: Record<string, RegExp[]> = Object.fromEntries(STYLE_PROPERTIES.map((p) => [p, [PLAIN_VALUE]]));
// "display" only takes the plain layout values.
STYLES['display'] = [/^(block|inline|inline-block|table|table-cell|table-row|list-item|none)$/i];

export function sanitizeBlockHtml(html: string): string {
  if (!html) return '';
  const cleaned = sanitizeHtml(html, {
    allowedTags: [
      'div', 'span', 'p', 'br', 'hr', 'a', 'img', 'figure', 'figcaption',
      'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'pre', 'code', 'mark',
      'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
    ],
    // Only these attributes survive, on any allowed tag. Every on* handler is dropped by omission.
    allowedAttributes: {
      '*': ['class', 'style', 'title', 'id', 'lang', 'dir', 'role', 'aria-label', 'aria-hidden'],
      a: ['href', 'name', 'target', 'rel'],
      // No srcset: it can name any address, and the scheme filter below does not look at it.
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan', 'headers'],
      th: ['colspan', 'rowspan', 'headers', 'scope'],
      col: ['span'],
      colgroup: ['span'],
      ol: ['start', 'type'],
    },
    // Hard lists: no script, frame, form, object, embed, base, meta or link can appear, whatever is allowed above.
    disallowedTagsMode: 'discard',
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    // A link opens in a new tab and cannot reach the opener.
    transformTags: {
      a: (tagName, attribs) => {
        const out = { ...attribs };
        if (out.target) out.rel = 'noopener noreferrer';
        return { tagName, attribs: out };
      },
    },
    exclusiveFilter: (frame) => {
      // Drop images whose source is not a web or inline image address.
      if (frame.tag === 'img') {
        const src = frame.attribs.src ?? '';
        return !SAFE_IMAGE_SRC.test(src.trim());
      }
      if (frame.tag === 'a') {
        return !SAFE_URL.test((frame.attribs.href ?? '').trim()) && !!frame.attribs.href;
      }
      return false;
    },
    // CSS in style attributes: only the look of text and boxes. Nothing that can load a file (background, content,
    // list-style-image...), nothing that can lift a box out of its place and over the app (position, z-index, inset,
    // transform, float), and no value with a backslash (a CSS escape can spell "url(").
    allowedStyles: { '*': STYLES },
    parser: { lowerCaseTags: true, lowerCaseAttributeNames: true },
  });
  // Styles may not load anything: url(...), image-set(...), @import and the old expression(...) are removed.
  return cleaned.replace(/style="[^"]*"/gi, (attr) =>
    attr.replace(/url\s*\([^)]*\)|image-set\s*\([^)]*\)|expression\s*\([^)]*\)|@import[^;"]*/gi, '')
  );
}

/** True when sanitizing changed the input, so the caller can say that some of the capture was removed. */
export function wasAltered(original: string, cleaned: string): boolean {
  return original !== cleaned;
}
