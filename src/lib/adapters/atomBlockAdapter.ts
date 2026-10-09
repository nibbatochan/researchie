/**
 * ATOM-TO-BLOCKS ADAPTER
 * Converts any ResearchAtom into a ContentCardModel
 * Enables single-renderer execution across all atom cards on the timeline and canvas.
 */

import { ResearchAtom } from '@/lib/types/research';
import { ContentCardModel, ContentSection, ContentBlock, ContentSourceType } from '@/lib/types/contentBlocks';
import { parseMarkdownToSections } from './markdownToBlocks';

export function adaptAtomToContentCard(atom: ResearchAtom): ContentCardModel {
  const createdAt = atom.created_at || (atom as any).createdAt || new Date().toISOString();
  let sourceType: ContentSourceType = 'user';
  if (atom.type === 'quote' || atom.type === 'text') sourceType = 'clip';
  else if (atom.type === 'block') sourceType = 'clip';
  else if (atom.type === 'image') sourceType = 'clip';
  else if (atom.metadata?.documentId) sourceType = 'pdf';

  const sections: ContentSection[] = [];

  switch (atom.type) {
    case 'quote':
    case 'text': {
      const quoteText = atom.content.text || atom.content.rawText || '';
      const blocks: ContentBlock[] = [
        {
          type: 'quote',
          quote: quoteText,
          sourceTitle: atom.metadata?.pageTitle || atom.title,
          sourceUrl: atom.metadata?.sourceUrl,
          deepLink: atom.metadata?.sourceUrl,
          pageNumber: atom.metadata?.pageNumber,
        },
      ];

      if (atom.content.description) {
        blocks.push({
          type: 'paragraph',
          text: atom.content.description,
        });
      }

      sections.push({
        id: 'sec-quote',
        kind: 'evidence',
        title: 'Extracted Quote',
        blocks,
      });
      break;
    }

    case 'block': {
      const htmlCode = atom.content.sanitizedHtml || (atom.content as any).standaloneHtml || '';
      sections.push({
        id: 'sec-block',
        kind: 'evidence',
        title: 'DOM Component Capture',
        blocks: [
          {
            type: 'code',
            language: 'html',
            code: htmlCode.slice(0, 500) + (htmlCode.length > 500 ? '\n... [truncated for display]' : ''),
          },
        ],
      });
      break;
    }

    case 'image': {
      sections.push({
        id: 'sec-image',
        kind: 'evidence',
        title: 'Visual Capture',
        blocks: [
          {
            type: 'image',
            url: atom.content.imageUrl || '',
            caption: atom.content.description,
            ocrText: atom.content.ocrText,
          },
        ],
      });
      break;
    }

    case 'link': {
      sections.push({
        id: 'sec-link',
        kind: 'sources',
        title: 'Referenced Resource',
        blocks: [
          {
            type: 'source',
            title: atom.title || atom.content.targetUrl || 'Linked Resource',
            url: atom.content.targetUrl || '',
            domain: atom.metadata?.sourceUrl ? new URL(atom.metadata.sourceUrl).hostname : undefined,
            excerpt: atom.content.description,
          },
        ],
      });
      break;
    }

    case 'note':
    default: {
      const markdown = atom.content.markdownContent || atom.content.text || atom.content.description || '';
      const parsedSections = parseMarkdownToSections(markdown);
      if (parsedSections.length > 0) {
        sections.push(...parsedSections);
      } else {
        sections.push({
          id: 'sec-note',
          kind: 'summary',
          title: 'Note Content',
          blocks: [
            {
              type: 'paragraph',
              text: markdown,
            },
          ],
        });
      }
      break;
    }
  }

  // Tags chip block
  if (atom.tags && atom.tags.length > 0) {
    sections.push({
      id: 'sec-tags',
      kind: 'custom',
      title: 'Tags',
      blocks: [
        {
          type: 'chips',
          items: atom.tags.map((t) => ({
            type: 'chip',
            label: t.replace(/^#+/, ''),
            variant: 'tag',
          })),
        },
      ],
    });
  }

  return {
    id: atom.id,
    title: atom.title || 'Research Clip',
    sourceType,
    workspace: atom.projectId,
    createdAt,
    sections,
    rawMarkdownBackup: atom.content.markdownContent || atom.content.text,
    schemaVersion: 2,
  };
}
