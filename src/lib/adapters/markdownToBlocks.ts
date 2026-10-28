/**
 * MARKDOWN-TO-BLOCKS AST PARSER
 * Transforms arbitrary markdown into typed ContentBlock[] & ContentSection[]
 * Standards: 100% deterministic, zero heavy dependencies, handles malformed markdown safely
 */

import { ContentBlock, ContentSection, InlineChip } from '@/lib/types/contentBlocks';

function parseInlineChips(text: string): { cleanText: string; chips: InlineChip[] } {
  const chips: InlineChip[] = [];
  let cleanText = text;

  // Extract [Page X] or [Page X-Y]
  cleanText = cleanText.replace(/\[Page (\d+(?:-\d+)?)\]/gi, (_, pageNum) => {
    chips.push({
      type: 'chip',
      label: `Page ${pageNum}`,
      variant: 'citation',
      href: `#cite-page-${pageNum}`,
    });
    return '';
  });

  // Extract [Source: title]
  cleanText = cleanText.replace(/\[Source:\s*([^\]]+)\]/gi, (_, sourceTitle) => {
    chips.push({
      type: 'chip',
      label: sourceTitle.trim(),
      variant: 'citation',
      href: `#cite-source-${encodeURIComponent(sourceTitle.trim())}`,
    });
    return '';
  });

  // Extract [1], [2] refs
  cleanText = cleanText.replace(/\[(\d+)\]/g, (_, refNum) => {
    chips.push({
      type: 'chip',
      label: `[${refNum}]`,
      variant: 'citation',
      href: `#cite-ref-${refNum}`,
    });
    return '';
  });

  return { cleanText: cleanText.trim(), chips };
}

export function parseMarkdownToBlocks(markdown: string): ContentBlock[] {
  if (!markdown || !markdown.trim()) return [];

  const blocks: ContentBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({
        type: 'code',
        code: codeLines.join('\n'),
        language: language || undefined,
      });
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        // line 1 is divider (|---|---|)
        const rowStartIndex = tableLines[1].includes('---') ? 2 : 1;
        const rows = tableLines.slice(rowStartIndex).map(parseRow);

        blocks.push({
          type: 'table',
          headers,
          rows,
        });
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
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        quote: quoteLines.join(' '),
      });
      continue;
    }

    // Bullet List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        items: listItems,
        ordered: false,
      });
      continue;
    }

    // Numbered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        items: listItems,
        ordered: true,
      });
      continue;
    }

    // Callout markdown pattern: [!NOTE], [!WARNING], [!TIP], etc.
    const calloutMatch = trimmed.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if (calloutMatch) {
      const kind = calloutMatch[1].toUpperCase();
      const body = calloutMatch[2] || '';
      const intent = kind === 'WARNING' || kind === 'CAUTION' ? 'warning' : kind === 'TIP' ? 'success' : 'info';
      blocks.push({
        type: 'callout',
        intent,
        title: kind,
        body,
      });
      i++;
      continue;
    }

    // Default: Paragraph with inline chips
    const { cleanText, chips } = parseInlineChips(trimmed);
    blocks.push({
      type: 'paragraph',
      text: cleanText || trimmed,
      inlineChips: chips.length > 0 ? chips : undefined,
    });
    i++;
  }

  return blocks;
}

export function parseMarkdownToSections(markdown: string): ContentSection[] {
  const blocks = parseMarkdownToBlocks(markdown);
  if (blocks.length === 0) return [];

  const sections: ContentSection[] = [];
  let currentSection: ContentSection = {
    id: 'sec-0',
    kind: 'summary',
    title: '', // the text before any heading has no title; a label here would read as an AI header
    blocks: [],
  };

  for (const block of blocks) {
    if (block.type === 'heading') {
      if (currentSection.blocks.length > 0) {
        sections.push(currentSection);
      }
      const titleLower = block.text.toLowerCase();
      let kind: ContentSection['kind'] = 'custom';
      if (titleLower.includes('summary') || titleLower.includes('finding') || titleLower.includes('overview')) {
        kind = 'summary';
      } else if (titleLower.includes('key point') || titleLower.includes('takeaway')) {
        kind = 'key_points';
      } else if (titleLower.includes('evidence') || titleLower.includes('data')) {
        kind = 'evidence';
      } else if (titleLower.includes('source') || titleLower.includes('reference')) {
        kind = 'sources';
      } else if (titleLower.includes('question') || titleLower.includes('next step')) {
        kind = 'follow_ups';
      }

      currentSection = {
        id: `sec-${sections.length + 1}`,
        kind,
        title: block.text,
        blocks: [],
        isCollapsible: kind === 'sources' || kind === 'evidence' || kind === 'follow_ups',
      };
    } else {
      currentSection.blocks.push(block);
    }
  }

  if (currentSection.blocks.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}
