/**
 * UNIFIED CONTENT BLOCK SCHEMA
 * Matt Pocock Discriminated Union Architecture
 * Standards: 100% type safety, exhaustive pattern matching, zero 'any'
 */

// L4: Inline Elements & Citations
export type ChipVariant = 
  | 'neutral' 
  | 'citation' 
  | 'evidence' 
  | 'tag' 
  | 'warning' 
  | 'success' 
  | 'ai';

export interface InlineChip {
  id?: string;
  type: 'chip';
  label: string;
  variant: ChipVariant;
  href?: string;
  targetId?: string;
  metadata?: Record<string, string>;
}

// L3: Canonical Content Blocks (Discriminated by `type`)
export type ContentBlock =
  | {
      type: 'summary';
      text: string;
      confidence?: number;
      oneLiner?: boolean;
    }
  | {
      type: 'heading';
      level: 1 | 2 | 3 | 4;
      text: string;
    }
  | {
      type: 'paragraph';
      text: string;
      inlineChips?: InlineChip[];
    }
  | {
      type: 'list';
      items: string[];
      ordered?: boolean;
    }
  | {
      type: 'table';
      headers: string[];
      rows: string[][];
      caption?: string;
    }
  | {
      type: 'quote';
      quote: string;
      sourceTitle?: string;
      sourceUrl?: string;
      deepLink?: string;
      pageNumber?: number;
    }
  | {
      type: 'image';
      url: string;
      caption?: string;
      ocrText?: string;
    }
  | {
      type: 'code';
      code: string;
      language?: string;
    }
  | {
      type: 'chips';
      items: InlineChip[];
    }
  | {
      type: 'source';
      title: string;
      url: string;
      domain?: string;
      excerpt?: string;
      timestampOffset?: number;
    }
  | {
      type: 'plugin-card';
      pluginId: string;
      title: string;
      accent?: string;
      payload: Record<string, unknown>;
    }
  | {
      type: 'canvas-card';
      canvasId: string;
      title: string;
      nodeCount: number;
      previewUrl?: string;
    }
  | {
      type: 'qa-pair';
      question: string;
      answer: string;
      evidenceRefs?: string[];
    }
  | {
      type: 'callout';
      intent: 'info' | 'success' | 'warning' | 'danger';
      title?: string;
      body: string;
    };

// L2: Collapsible Section
export type SectionKind = 
  | 'summary' 
  | 'key_points' 
  | 'evidence' 
  | 'sources' 
  | 'follow_ups' 
  | 'custom';

export interface ContentSection {
  id: string;
  kind: SectionKind;
  title: string;
  blocks: ContentBlock[];
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

// L1: Card Root Model
export type ContentSourceType = 
  | 'ai' 
  | 'clip' 
  | 'pdf' 
  | 'plugin' 
  | 'canvas' 
  | 'user' 
  | 'note';

export interface ContentCardModel {
  id: string;
  title: string;
  sourceType: ContentSourceType;
  workspace?: string;
  subspace?: string;
  createdAt: string;
  sections: ContentSection[];
  rawMarkdownBackup?: string; // Stored for data preservation, NEVER rendered by default
  schemaVersion: 2;
}

/**
 * Exhaustive TypeScript Matcher (Matt Pocock Pattern)
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled content block type: ${JSON.stringify(value)}`);
}
