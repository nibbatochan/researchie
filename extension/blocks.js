/**
 * RESEARCHIE CHROME EXTENSION - UNIFIED BLOCK RENDERER
 * Mirrors platform L1-L4 hierarchy and Google-style clean typography:
 * - High-contrast bold weights (no asterisks)
 * - Structured sections & lists (no raw markdown tokens)
 * - Grayscale citations & badges
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInlineMarkdown(text) {
  if (!text) return '';
  let clean = escapeHtml(text);

  // 1. Citations: [Page X], [p. 135], [1], [Source: X]
  clean = clean.replace(/(\[(?:page|p\.|pp\.)\s*\d+(?:-\d+)?\])/gi, '<span class="sp-citation-chip">$1</span>');
  clean = clean.replace(/(\[(?:source|\d+|cite:[^\]]+)\])/gi, '<span class="sp-citation-chip">$1</span>');

  // 2. Bold: **text** or __text__ -> Clean bold weight
  clean = clean.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #FAFAFA; font-weight: 700;">$1</strong>');
  clean = clean.replace(/__(.+?)__/g, '<strong style="color: #FAFAFA; font-weight: 700;">$1</strong>');

  // 3. Italic: *text* or _text_
  clean = clean.replace(/(?:^|[^\*])\*([^\*]+)\*(?:[^\*]|$)/g, ' <em>$1</em> ');
  clean = clean.replace(/(?:^|[^_])_([^_]+)_(?:[^_]|$)/g, ' <em>$1</em> ');

  // 4. Code: `code`
  clean = clean.replace(/`([^`]+)`/g, '<code class="sp-md-code">$1</code>');

  // 5. Links: [text](url)
  clean = clean.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" class="sp-md-link">$1</a>');

  // 6. Clean up stray escaped slashes or markdown tokens
  clean = clean.replace(/\\([*_`#[\]\\])/g, '$1');

  return clean.trim();
}

function parseMarkdownToBlocks(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }

    // Code blocks
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r) => r.split('|').slice(1, -1).map(c => c.trim());
        const headers = parseRow(tableLines[0]);
        const rowStart = tableLines[1].includes('---') ? 2 : 1;
        const rows = tableLines.slice(rowStart).map(parseRow);
        blocks.push({ type: 'table', headers, rows });
        continue;
      }
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'heading', level: 4, text: trimmed.slice(5).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({ type: 'quote', quote: quoteLines.join(' ') });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  return blocks;
}

function renderBlock(block) {
  switch (block.type) {
    case 'summary':
      return `<div class="sp-block-summary">${renderInlineMarkdown(block.text)}</div>`;
    case 'heading':
      return `<div class="sp-block-heading sp-heading-${block.level}">${renderInlineMarkdown(block.text)}</div>`;
    case 'paragraph':
      return `<p class="sp-block-p">${renderInlineMarkdown(block.text)}</p>`;
    case 'quote':
      return `<blockquote class="sp-block-quote">"${renderInlineMarkdown(block.quote)}"</blockquote>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const cls = block.ordered ? 'sp-block-list sp-ordered-list' : 'sp-block-list';
      return `<${tag} class="${cls}">${block.items.map(it => `<li>${renderInlineMarkdown(it)}</li>`).join('')}</${tag}>`;
    }
    case 'code':
      return `<pre class="sp-md-pre"><code class="sp-md-code">${escapeHtml(block.code)}</code></pre>`;
    case 'table':
      return `<div class="sp-table-scroll"><table class="sp-md-table"><thead><tr>${block.headers.map(h => `<th>${renderInlineMarkdown(h)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(r => `<tr>${r.map(c => `<td>${renderInlineMarkdown(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    default:
      return `<p class="sp-block-p">${renderInlineMarkdown(block.text || '')}</p>`;
  }
}

function renderContentCard(title, sourceType, markdown) {
  const blocks = parseMarkdownToBlocks(markdown);
  return `
    <article class="sp-content-card">
      <div class="sp-card-header">
        <span class="sp-badge sp-badge-${escapeHtml(sourceType)}">${escapeHtml(sourceType.toUpperCase())}</span>
        <span class="sp-card-title">${escapeHtml(title)}</span>
      </div>
      <div class="sp-card-body">
        ${blocks.map(renderBlock).join('')}
      </div>
    </article>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMarkdownToBlocks, renderBlock, renderContentCard, renderInlineMarkdown };
}
