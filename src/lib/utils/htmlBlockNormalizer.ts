/**
 * Universal HTML Block Normalizer & Formatter
 * 
 * Preserves the visual structure, layout (Grid, Flex, Tables), typography, 
 * and assets (images, fonts) of imported or clipped web content blocks.
 */

export interface NormalizeHtmlBlockOptions {
  sanitizedHtml?: string;
  standaloneHtml?: string;
  rawText?: string;
  sourceUrl?: string;
  theme?: 'auto' | 'light' | 'dark';
  searchQuery?: string;
}

export interface NormalizedBlockOutput {
  sanitizedHtml: string;
  standaloneHtml: string;
  cleanText: string;
}

/**
 * Standard CSS Reset & Design System Styles injected into isolated iframes
 * to guarantee modern typography, responsive layout, table styling, code blocks,
 * and adaptive dark/light theming even when external stylesheets are absent.
 */
export function getIsolatedBlockStyles(theme: 'auto' | 'light' | 'dark' = 'auto'): string {
  return `
    :root {
      --font-sans: 'Figtree', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      
      /* Light Theme Defaults */
      --bg-canvas: ${theme === 'dark' ? '#121214' : theme === 'light' ? '#FFFFFF' : '#FAFAFC'};
      --text-primary: ${theme === 'dark' ? '#F4F4F5' : theme === 'light' ? '#0F172A' : '#18181B'};
      --text-secondary: ${theme === 'dark' ? '#A1A1AA' : '#64748B'};
      --text-muted: ${theme === 'dark' ? '#71717A' : '#94A3B8'};
      --border-subtle: ${theme === 'dark' ? '#27272A' : '#E2E8F0'};
      --border-strong: ${theme === 'dark' ? '#3F3F46' : '#CBD5E1'};
      --card-bg: ${theme === 'dark' ? '#18181B' : '#FFFFFF'};
      --table-header-bg: ${theme === 'dark' ? '#222226' : '#F1F5F9'};
      --code-bg: ${theme === 'dark' ? '#18181B' : '#0F172A'};
      --code-text: ${theme === 'dark' ? '#93C5FD' : '#E2E8F0'};
      --accent-blue: #325FEC;
      --accent-highlight: rgba(50, 95, 236, 0.15);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        ${theme === 'auto' ? `
          --bg-canvas: transparent;
          --text-primary: #F4F4F5;
          --text-secondary: #A1A1AA;
          --text-muted: #71717A;
          --border-subtle: #27272A;
          --border-strong: #3F3F46;
          --card-bg: #18181B;
          --table-header-bg: #222226;
          --code-bg: #18181B;
          --code-text: #93C5FD;
        ` : ''}
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      margin: 0;
      padding: 12px;
      font-family: var(--font-sans);
      font-size: 13px;
      line-height: 1.55;
      color: var(--text-primary);
      background-color: var(--bg-canvas);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
      word-wrap: break-word;
    }

    /* Responsive Constraints: prevent layout explosion on desktop clips */
    body > * {
      max-width: 100% !important;
    }

    img, video, svg, canvas {
      max-width: 100%;
      height: auto;
      display: inline-block;
      vertical-align: middle;
    }

    a {
      color: var(--accent-blue);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-mono), var(--font-sans);
      color: var(--text-primary);
      font-weight: 700;
      line-height: 1.3;
      margin-top: 10px;
      margin-bottom: 6px;
    }
    h1 { font-size: 18px; }
    h2 { font-size: 16px; }
    h3 { font-size: 14px; }
    h4, h5, h6 { font-size: 13px; }

    p {
      margin-bottom: 8px;
    }
    p:last-child {
      margin-bottom: 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 12px;
      background: var(--card-bg);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }
    th, td {
      border: 1px solid var(--border-subtle);
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: var(--table-header-bg);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    tr:nth-child(even) td {
      background-color: rgba(125, 125, 125, 0.02);
    }

    /* Code Blocks & Monospace */
    pre {
      background-color: var(--code-bg);
      color: var(--code-text);
      font-family: var(--font-mono);
      font-size: 11.5px;
      line-height: 1.6;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      overflow-x: auto;
      margin: 8px 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    code {
      font-family: var(--font-mono);
      font-size: 11.5px;
    }
    p code, li code, td code {
      background-color: var(--table-header-bg);
      color: var(--accent-blue);
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
    }

    /* Blockquotes */
    blockquote {
      border-left: 3px solid var(--accent-blue);
      background-color: var(--accent-highlight);
      padding: 8px 14px;
      margin: 8px 0;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      color: var(--text-primary);
    }

    /* Lists */
    ul, ol {
      padding-left: 20px;
      margin: 6px 0;
    }
    li {
      margin-bottom: 4px;
    }

    /* Badges & Pills */
    .badge, [class*="badge"], [class*="tag"], [class*="pill"], [class*="chip"] {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      font-family: var(--font-mono);
    }

    /* Common Card & Grid Normalization */
    .card, [class*="card"], [class*="box"], [class*="container"], [class*="panel"] {
      border-radius: 8px;
    }
    .grid, [class*="grid"] {
      display: grid;
      gap: 10px;
    }
    .flex, [class*="flex"] {
      display: flex;
      gap: 8px;
    }

    /* Highlight class for active search matches */
    mark.search-highlight {
      background: rgba(50, 95, 236, 0.25) !important;
      color: #1E40AF !important;
      font-weight: 700 !important;
      padding: 1px 3px !important;
      border-radius: 2px !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--border-strong);
      border-radius: 9999px;
    }
  `;
}



/**
 * Highlight script injected into iframe if search query is active
 */
function getHighlightScript(searchQuery?: string): string {
  if (!searchQuery || !searchQuery.trim()) return '';
  return `
    <script>
      (function() {
        var q = ${JSON.stringify(searchQuery.trim())};
        if (!q) return;
        function highlight(node) {
          if (node.nodeType === 3) {
            var val = node.nodeValue;
            var idx = val.toLowerCase().indexOf(q.toLowerCase());
            if (idx !== -1) {
              var parent = node.parentNode;
              if (parent && parent.nodeName !== 'SCRIPT' && parent.nodeName !== 'STYLE' && parent.nodeName !== 'MARK') {
                var frag = document.createDocumentFragment();
                var lastIdx = 0;
                var escaped = q.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
                var regex = new RegExp(escaped, 'gi');
                var match;
                while ((match = regex.exec(val)) !== null) {
                  frag.appendChild(document.createTextNode(val.substring(lastIdx, match.index)));
                  var mark = document.createElement('mark');
                  mark.className = 'search-highlight';
                  mark.textContent = match[0];
                  frag.appendChild(mark);
                  lastIdx = regex.lastIndex;
                }
                frag.appendChild(document.createTextNode(val.substring(lastIdx)));
                parent.replaceChild(frag, node);
              }
            }
          } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE', 'MARK'].includes(node.nodeName)) {
            Array.from(node.childNodes).forEach(highlight);
          }
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() { highlight(document.body); });
        } else {
          highlight(document.body);
        }
      })();
    </script>
  `;
}

/**
 * Builds a clean, isolated, self-contained standalone HTML document
 * ready to be rendered safely inside sandboxed iframes.
 */
export function buildIsolatedBlockDoc(options: NormalizeHtmlBlockOptions): string {
  const {
    sanitizedHtml = '',
    standaloneHtml = '',
    sourceUrl,
    theme = 'auto',
    searchQuery = '',
  } = options;

  // If already a full standalone HTML document with doctype/html
  if (standaloneHtml && (standaloneHtml.includes('<!DOCTYPE') || standaloneHtml.includes('<html'))) {
    let doc = standaloneHtml;

    // Inject base href if missing and sourceUrl exists
    if (sourceUrl && !doc.includes('<base')) {
      try {
        const origin = new URL(sourceUrl).origin;
        doc = doc.replace('<head>', `<head>\n<base href="${origin}/">`);
      } catch {}
    }

    // Inject styles and scripts before closing body or head
    const styles = `<style>${getIsolatedBlockStyles(theme)}</style>`;
    const scripts = getHighlightScript(searchQuery);

    if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `${styles}</head>`);
    }
    if (scripts) {
      if (doc.includes('</body>')) {
        doc = doc.replace('</body>', `${scripts}</body>`);
      } else {
        doc += scripts;
      }
    }

    return doc;
  }

  // Otherwise synthesize a pristine container document
  const baseHrefTag = sourceUrl
    ? (() => {
        try {
          return `<base href="${new URL(sourceUrl).origin}/">`;
        } catch {
          return '';
        }
      })()
    : '';

  const bodyContent = sanitizedHtml || '<p style="color:#888;">No content preview available</p>';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${baseHrefTag}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      ${getIsolatedBlockStyles(theme)}
    </style>
  </head>
  <body>
    ${bodyContent}
    ${getHighlightScript(searchQuery)}
  </body>
</html>`;
}

/**
 * Strips HTML tags cleanly to produce plain text for indexing & search
 */
export function extractPlainTextFromHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
