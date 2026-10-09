/**
 * AI-MESSAGE-TO-BLOCKS ADAPTER
 * Adapts raw AI response strings or structured objects into ContentCardModel
 */

import { ContentCardModel, ContentSection, ContentBlock } from '@/lib/types/contentBlocks';
import { parseMarkdownToSections } from './markdownToBlocks';

export interface AIMessageInput {
  id?: string;
  query?: string;
  directAnswer?: string;
  content: string;
  citations?: Array<{
    id: string;
    title?: string;
    url?: string;
    documentId?: string;
    pageNumber?: number;
    quote?: string;
  }>;
  createdAt?: string;
}

export function adaptAIMessageToContentCard(msg: AIMessageInput): ContentCardModel {
  const sections: ContentSection[] = [];

  // 1. Direct Answer or Summary Section
  if (msg.directAnswer) {
    sections.push({
      id: 'sec-ai-summary',
      kind: 'summary',
      title: 'Direct Answer',
      blocks: [
        {
          type: 'summary',
          text: msg.directAnswer,
          confidence: 0.95,
        },
      ],
    });
  }

  // 2. Body Sections from Markdown
  if (msg.content) {
    const parsedSections = parseMarkdownToSections(msg.content);
    if (parsedSections.length > 0) {
      sections.push(...parsedSections);
    } else {
      sections.push({
        id: 'sec-ai-body',
        kind: 'key_points',
        title: 'Synthesized Findings',
        blocks: [
          {
            type: 'paragraph',
            text: msg.content,
          },
        ],
      });
    }
  }

  // 3. Citations & Verified Sources Section
  if (msg.citations && msg.citations.length > 0) {
    const sourceBlocks: ContentBlock[] = msg.citations.map((c) => ({
      type: 'source',
      title: c.title || (c.pageNumber ? `Document Page ${c.pageNumber}` : 'Research Citation'),
      url: c.url || `#cite-${c.id}`,
      excerpt: c.quote,
    }));

    sections.push({
      id: 'sec-ai-sources',
      kind: 'sources',
      title: 'Grounded Sources & Citations',
      blocks: sourceBlocks,
      isCollapsible: true,
      defaultCollapsed: false,
    });
  }

  return {
    id: msg.id || `ai-card-${Date.now()}`,
    title: msg.query ? `Answer: "${msg.query}"` : 'AI Synthesized Deliverable',
    sourceType: 'ai',
    createdAt: msg.createdAt || new Date().toISOString(),
    sections,
    rawMarkdownBackup: msg.content,
    schemaVersion: 2,
  };
}
