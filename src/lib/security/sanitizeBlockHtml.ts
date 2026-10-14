// Cleans captured page HTML before it is saved or shown. A clipped block comes from a web page we do not
// control, so it must never run script, load a frame, or send the reader somewhere by a hidden link.
// Used on save (src/app/api/atoms/route.ts) for sanitizedHtml and standaloneHtml.

import sanitizeHtml from 'sanitize-html';

const SAFE_URL = /^(https?:|mailto:)/i;
const SAFE_IMAGE_SRC = /^(https?:|data:image\/(png|jpe?g|gif|webp|svg\+xml);)/i;

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
      img: ['src', 'alt', 'width', 'height', 'srcset'],
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
    // CSS in style attributes: no url(), no expression(), no imports.
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
