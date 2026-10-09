/**
 * RESEARCHIE CHROME EXTENSION - UNIFIED BLOCK RENDERER
 * Mirrors platform L1-L4 hierarchy and semantic tokens without external dependencies.
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
    if (trimmed.startsWith('>')) {
      blocks.push({ type: 'quote', quote: trimmed.replace(/^>\s*/, '').trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  return blocks;
}

function renderBlock(block) {
  switch (block.type) {
    case 'summary':
      return `<div class="sp-block-summary">${escapeHtml(block.text)}</div>`;
    case 'heading':
      return `<div class="sp-block-heading sp-heading-${block.level}">${escapeHtml(block.text)}</div>`;
    case 'paragraph':
      return `<p class="sp-block-p">${escapeHtml(block.text)}</p>`;
    case 'quote':
      return `<blockquote class="sp-block-quote">"${escapeHtml(block.quote)}"</blockquote>`;
    case 'list':
      return `<ul class="sp-block-list">${block.items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>`;
    case 'table':
      return `<div class="sp-table-scroll"><table class="sp-md-table"><thead><tr>${block.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    default:
      return `<p class="sp-block-p">${escapeHtml(block.text || '')}</p>`;
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
  module.exports = { parseMarkdownToBlocks, renderBlock, renderContentCard };
}
