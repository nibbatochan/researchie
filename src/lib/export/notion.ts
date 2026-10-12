import { ResearchProject, ResearchAtom } from '../types/research';
import { atomCitation } from './citation';

export interface NotionRichTextItem {
  type: 'text';
  text: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

export type NotionBlock =
  | { object: 'block'; type: 'heading_1'; heading_1: { rich_text: NotionRichTextItem[] } }
  | { object: 'block'; type: 'heading_2'; heading_2: { rich_text: NotionRichTextItem[] } }
  | { object: 'block'; type: 'heading_3'; heading_3: { rich_text: NotionRichTextItem[] } }
  | { object: 'block'; type: 'paragraph'; paragraph: { rich_text: NotionRichTextItem[] } }
  | {
      object: 'block';
      type: 'callout';
      callout: {
        rich_text: NotionRichTextItem[];
        icon: { type: 'emoji'; emoji: string };
        color?: string;
      };
    }
  | { object: 'block'; type: 'quote'; quote: { rich_text: NotionRichTextItem[] } }
  | { object: 'block'; type: 'bulleted_list_item'; bulleted_list_item: { rich_text: NotionRichTextItem[] } }
  | { object: 'block'; type: 'code'; code: { rich_text: NotionRichTextItem[]; language: string } }
  | { object: 'block'; type: 'bookmark'; bookmark: { url: string } }
  | { object: 'block'; type: 'divider'; divider: Record<string, never> };

/**
 * Validates that a URL is a valid absolute HTTP or HTTPS URL acceptable to Notion
 */
export function isValidNotionUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes and validates a link, falling back to base URL if fragments cause malformations
 */
export function sanitizeNotionLink(url?: string | null, fragment?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const base = url.trim();
  if (!isValidNotionUrl(base)) return undefined;

  if (fragment && fragment.trim()) {
    const combined = base.includes('#:~:text=') ? base : `${base}${fragment.trim()}`;
    if (isValidNotionUrl(combined)) {
      return combined;
    }
  }

  return base;
}

/**
 * Truncates text safely to Notion's 2000 char per block limit
 */
function safeNotionText(text: string, maxLen = 1950): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

/**
 * Creates a single Notion rich text item with optional link and annotations
 */
export function richText(
  content: string,
  options?: { link?: string; bold?: boolean; italic?: boolean; code?: boolean }
): NotionRichTextItem {
  const validLink = isValidNotionUrl(options?.link) ? options!.link!.trim() : undefined;
  return {
    type: 'text',
    text: {
      content: safeNotionText(content),
      link: validLink ? { url: validLink } : null,
    },
    annotations: {
      bold: options?.bold || false,
      italic: options?.italic || false,
      code: options?.code || false,
    },
  };
}

/**
 * Merges adjacent rich text tokens with identical formatting to prevent array overflow
 */
export function consolidateRichText(items: NotionRichTextItem[]): NotionRichTextItem[] {
  if (!items || items.length <= 1) return items || [];

  const consolidated: NotionRichTextItem[] = [];
  let current: NotionRichTextItem | null = null;

  for (const item of items) {
    if (!item.text.content) continue;

    if (
      current &&
      !current.text.link &&
      !item.text.link &&
      (current.annotations?.bold || false) === (item.annotations?.bold || false) &&
      (current.annotations?.italic || false) === (item.annotations?.italic || false) &&
      (current.annotations?.code || false) === (item.annotations?.code || false) &&
      (current.text.content.length + item.text.content.length <= 1900)
    ) {
      current.text.content += item.text.content;
    } else {
      if (current) {
        consolidated.push(current);
      }
      current = {
        type: 'text',
        text: {
          content: safeNotionText(item.text.content),
          link: item.text.link,
        },
        annotations: item.annotations ? { ...item.annotations } : undefined,
      };
    }
  }

  if (current) {
    consolidated.push(current);
  }

  return consolidated;
}

/**
 * Parses inline markdown (bold, italic, code, links) into native NotionRichTextItem[]
 */
export function parseMarkdownToRichText(input: string): NotionRichTextItem[] {
  if (!input) return [];

  // Match: Links, Bold-Italic, Bold, Italic, Code
  const regex = /(\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

  const result: NotionRichTextItem[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;
    const matchedStr = match[0];

    // Preceding plain text
    if (matchStart > lastIdx) {
      const plain = input.slice(lastIdx, matchStart);
      if (plain) {
        result.push(richText(plain));
      }
    }

    // Formatted token
    if ((matchedStr.startsWith('***') && matchedStr.endsWith('***')) ||
        (matchedStr.startsWith('___') && matchedStr.endsWith('___'))) {
      const inner = matchedStr.slice(3, -3);
      result.push(richText(inner, { bold: true, italic: true }));
    } else if ((matchedStr.startsWith('**') && matchedStr.endsWith('**')) ||
               (matchedStr.startsWith('__') && matchedStr.endsWith('__'))) {
      const inner = matchedStr.slice(2, -2);
      result.push(richText(inner, { bold: true }));
    } else if ((matchedStr.startsWith('*') && matchedStr.endsWith('*')) ||
               (matchedStr.startsWith('_') && matchedStr.endsWith('_'))) {
      const inner = matchedStr.slice(1, -1);
      result.push(richText(inner, { italic: true }));
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      const inner = matchedStr.slice(1, -1);
      result.push(richText(inner, { code: true }));
    } else if (matchedStr.startsWith('[')) {
      const linkMatch = matchedStr.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const rawLinkUrl = linkMatch[2];
        const validUrl = sanitizeNotionLink(rawLinkUrl);
        result.push(richText(linkText, { link: validUrl, bold: true }));
      } else {
        result.push(richText(matchedStr));
      }
    } else {
      result.push(richText(matchedStr));
    }

    lastIdx = matchEnd;
  }

  // Trailing plain text
  if (lastIdx < input.length) {
    const trailing = input.slice(lastIdx);
    if (trailing) {
      result.push(richText(trailing));
    }
  }

  const rawList = result.length > 0 ? result : [richText(input)];
  return consolidateRichText(rawList);
}

/**
 * Parses a multi-line markdown string into native NotionBlock[] objects
 */
export function parseMarkdownToNotionBlocks(markdown: string): NotionBlock[] {
  if (!markdown || !markdown.trim()) return [];

  const lines = markdown.split('\n');
  const blocks: NotionBlock[] = [];
  let inCodeBlock = false;
  let codeLang = 'plain text';
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            language: codeLang || 'plain text',
            rich_text: [richText(codeLines.join('\n'))],
          },
        });
        inCodeBlock = false;
        codeLines = [];
        codeLang = 'plain text';
      } else {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim() || 'plain text';
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: parseMarkdownToRichText(trimmed.slice(4).trim()),
        },
      });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: parseMarkdownToRichText(trimmed.slice(3).trim()),
        },
      });
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: parseMarkdownToRichText(trimmed.slice(2).trim()),
        },
      });
      continue;
    }

    // Quotes
    if (trimmed.startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: parseMarkdownToRichText(trimmed.slice(2).trim()),
        },
      });
      continue;
    }

    // Bullet list items
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: parseMarkdownToRichText(itemText),
        },
      });
      continue;
    }

    // Numbered list items
    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: parseMarkdownToRichText(itemText),
        },
      });
      continue;
    }

    // Default Paragraph
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: parseMarkdownToRichText(trimmed),
      },
    });
  }

  // Clean up dangling code block
  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({
      object: 'block',
      type: 'code',
      code: {
        language: codeLang || 'plain text',
        rich_text: [richText(codeLines.join('\n'))],
      },
    });
  }

  return blocks;
}

/**
 * Hardens blocks to strictly obey Notion's <= 100 rich_text items constraint per block
 */
export function sanitizeNotionBlocks(blocks: NotionBlock[]): NotionBlock[] {
  const sanitized: NotionBlock[] = [];

  for (const block of blocks) {
    if (block.type === 'paragraph') {
      const items = consolidateRichText(block.paragraph.rich_text);
      if (items.length <= 80) {
        sanitized.push({ ...block, paragraph: { rich_text: items } });
      } else {
        for (let i = 0; i < items.length; i += 80) {
          sanitized.push({
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: items.slice(i, i + 80) },
          });
        }
      }
    } else if (block.type === 'callout') {
      const items = consolidateRichText(block.callout.rich_text);
      sanitized.push({
        object: 'block',
        type: 'callout',
        callout: {
          icon: block.callout.icon,
          color: block.callout.color,
          rich_text: items.slice(0, 80),
        },
      });
      if (items.length > 80) {
        for (let i = 80; i < items.length; i += 80) {
          sanitized.push({
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: items.slice(i, i + 80) },
          });
        }
      }
    } else if (block.type === 'quote') {
      const items = consolidateRichText(block.quote.rich_text);
      sanitized.push({
        object: 'block',
        type: 'quote',
        quote: { rich_text: items.slice(0, 80) },
      });
      if (items.length > 80) {
        for (let i = 80; i < items.length; i += 80) {
          sanitized.push({
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: items.slice(i, i + 80) },
          });
        }
      }
    } else if (block.type === 'bulleted_list_item') {
      const items = consolidateRichText(block.bulleted_list_item.rich_text);
      sanitized.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: items.slice(0, 80) },
      });
    } else if (block.type === 'heading_1') {
      const items = consolidateRichText(block.heading_1.rich_text);
      sanitized.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: items.slice(0, 80) },
      });
    } else if (block.type === 'heading_2') {
      const items = consolidateRichText(block.heading_2.rich_text);
      sanitized.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: items.slice(0, 80) },
      });
    } else if (block.type === 'heading_3') {
      const items = consolidateRichText(block.heading_3.rich_text);
      sanitized.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: items.slice(0, 80) },
      });
    } else {
      sanitized.push(block);
    }
  }

  return sanitized;
}

/**
 * Converts project and research atoms into native, beautifully styled Notion blocks
 */
export function formatProjectToNotionBlocks(
  project: ResearchProject,
  atoms: ResearchAtom[]
): NotionBlock[] {
  const rawBlocks: NotionBlock[] = [];

  // 1. Project Overview Callout
  if (project.description) {
    rawBlocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🎯' },
        rich_text: [
          richText('Research Objective & Context\n', { bold: true }),
          ...parseMarkdownToRichText(project.description),
        ],
        color: 'blue_background',
      },
    });
  }

  // Summary Metadata Info
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  rawBlocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        richText('Exported from '),
        richText('Researchie', { bold: true }),
        richText(` on ${dateStr} • `),
        richText(`${atoms.length} Research Clips`, { bold: true }),
      ],
    },
  });

  rawBlocks.push({ object: 'block', type: 'divider', divider: {} });

  // 2. Syntheses & Research Notes
  const notes = atoms.filter((a) => a.type === 'note');
  if (notes.length > 0) {
    rawBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [richText('📝 Syntheses & Research Notes')],
      },
    });

    notes.forEach((atom, idx) => {
      const title = atom.title || `Research Note ${idx + 1}`;
      const rawBody = atom.content.markdownContent || atom.content.description || atom.content.rawText || '';

      // Note Header Callout
      rawBlocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '💡' },
          rich_text: [richText(title, { bold: true })],
          color: 'gray_background',
        },
      });

      // Parse full note body into native Notion blocks (headings, lists, bold text, code)
      if (rawBody.trim()) {
        const parsedNoteBlocks = parseMarkdownToNotionBlocks(rawBody);
        rawBlocks.push(...parsedNoteBlocks);
      }

      // Source attribution link
      const sourceLink = sanitizeNotionLink(atom.metadata?.sourceUrl);
      if (sourceLink) {
        rawBlocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              richText('Source: ', { italic: true }),
              richText(atom.metadata?.pageTitle || sourceLink, {
                link: sourceLink,
                bold: true,
              }),
            ],
          },
        });
      }

      rawBlocks.push({ object: 'block', type: 'divider', divider: {} });
    });
  }

  // 3. Quotes & Key Excerpts
  const quotes = atoms.filter((a) => a.type === 'quote' || a.type === 'text');
  if (quotes.length > 0) {
    rawBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [richText('💬 Key Quotes & Excerpts')],
      },
    });

    quotes.forEach((atom) => {
      const text = atom.content.rawText || atom.content.text || atom.content.description || '';
      const rawSource = atom.metadata?.sourceUrl || '';
      const fragment = atom.metadata?.scrollToTextFragment || atom.metadata?.textFragment || '';
      const deepLink = sanitizeNotionLink(rawSource, fragment) || sanitizeNotionLink(rawSource);
      const title = atom.metadata?.pageTitle || atom.title || 'Source';

      // Native Notion Quote block with parsed rich text
      rawBlocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: parseMarkdownToRichText(`"${text}"`),
        },
      });

      // Attribution
      const quoteDetails: NotionRichTextItem[] = [
        richText('— '),
        richText(title, { link: deepLink, bold: true }),
      ];

      if (atom.metadata?.pageNumber) {
        quoteDetails.push(richText(` (Page ${atom.metadata.pageNumber})`));
      }

      if (atom.tags && atom.tags.length > 0) {
        quoteDetails.push(richText(` • Tags: ${atom.tags.join(', ')}`, { italic: true }));
      }

      rawBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: quoteDetails,
        },
      });

      const quoteCitation = atomCitation(atom);
      if (quoteCitation) {
        rawBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [richText('Citation: ', { italic: true }), richText(quoteCitation.line)] },
        });
      }
    });

    rawBlocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // 4. Web Blocks & Tables
  const blockAtoms = atoms.filter((a) => a.type === 'block');
  if (blockAtoms.length > 0) {
    rawBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [richText('🧩 Captured Web Blocks & Tables')],
      },
    });

    blockAtoms.forEach((atom) => {
      rawBlocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [richText(atom.title || 'DOM Block')],
        },
      });

      if (atom.content.rawText) {
        rawBlocks.push({
          object: 'block',
          type: 'code',
          code: {
            language: 'plain text',
            rich_text: [richText(atom.content.rawText.trim())],
          },
        });
      }

      const sourceLink = sanitizeNotionLink(atom.metadata?.sourceUrl);
      if (sourceLink) {
        rawBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              richText('Source: ', { italic: true }),
              richText(atom.metadata?.pageTitle || sourceLink, {
                link: sourceLink,
              }),
            ],
          },
        });
      }

      const blockCitation = atomCitation(atom);
      if (blockCitation) {
        rawBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [richText('Citation: ', { italic: true }), richText(blockCitation.line)] },
        });
      }
    });

    rawBlocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // 5. Visual Captures & Images
  const images = atoms.filter((a) => a.type === 'image');
  if (images.length > 0) {
    rawBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [richText('🖼️ Visual References & OCR')],
      },
    });

    images.forEach((atom) => {
      rawBlocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '🖼️' },
          rich_text: [
            richText(`${atom.title || 'Image Capture'}\n`, { bold: true }),
            ...parseMarkdownToRichText(atom.content.description || atom.content.imageUrl || 'Visual capture'),
          ],
          color: 'gray_background',
        },
      });

      if (atom.content.ocrText) {
        rawBlocks.push({
          object: 'block',
          type: 'code',
          code: {
            language: 'plain text',
            rich_text: [richText(atom.content.ocrText.trim())],
          },
        });
      }
    });

    rawBlocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // 6. Bookmarks & Source Links
  const links = atoms.filter((a) => a.type === 'link');
  if (links.length > 0) {
    rawBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [richText('🔗 Saved Links & Bookmarks')],
      },
    });

    links.forEach((atom) => {
      const rawUrl = atom.content.targetUrl || atom.metadata?.sourceUrl;
      const validBookmark = sanitizeNotionLink(rawUrl);
      if (validBookmark) {
        rawBlocks.push({
          object: 'block',
          type: 'bookmark',
          bookmark: { url: validBookmark },
        });
      } else {
        rawBlocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [richText(atom.title || rawUrl || 'Saved Link')],
          },
        });
      }
    });
  }

  return sanitizeNotionBlocks(rawBlocks);
}

/**
 * Generates clean, Notion-paste-optimized Markdown
 */
export function formatProjectToNotionMarkdown(
  project: ResearchProject,
  atoms: ResearchAtom[]
): string {
  let md = '';

  md += `# ${project.title}\n\n`;
  if (project.description) {
    md += `> 🎯 **Research Context**\n> ${project.description}\n\n`;
  }

  md += `---\n\n`;

  // Notes
  const notes = atoms.filter((a) => a.type === 'note');
  if (notes.length > 0) {
    md += `## 📝 Syntheses & Notes\n\n`;
    notes.forEach((atom) => {
      md += `> 💡 **${atom.title || 'Research Note'}**\n`;
      const body = atom.content.markdownContent || atom.content.description || atom.content.rawText || '';
      md += `> ${body.replace(/\n/g, '\n> ')}\n\n`;
    });
  }

  // Quotes
  const quotes = atoms.filter((a) => a.type === 'quote' || a.type === 'text');
  if (quotes.length > 0) {
    md += `## 💬 Quotes\n\n`;
    quotes.forEach((atom) => {
      const text = atom.content.rawText || atom.content.text || atom.content.description || '';
      const title = atom.metadata?.pageTitle || atom.title || 'Source';
      const url = atom.metadata?.sourceUrl || '';
      const quoteCite = atomCitation(atom);
      md += `> "${text}"\n>\n> — [${title}](${url})\n`;
      if (quoteCite) md += `>\n> *Citation: ${quoteCite.line}*\n`;
      md += `\n`;
    });
  }

  // DOM Blocks
  const blocks = atoms.filter((a) => a.type === 'block');
  if (blocks.length > 0) {
    md += `## 🧩 Captured Blocks\n\n`;
    blocks.forEach((atom) => {
      md += `### ${atom.title || 'Block'}\n`;
      if (atom.content.rawText) {
        md += `\`\`\`text\n${atom.content.rawText.trim()}\n\`\`\`\n\n`;
      }
      const blockCite = atomCitation(atom);
      if (blockCite) md += `*Citation: ${blockCite.line}*\n\n`;
    });
  }

  return md;
}
