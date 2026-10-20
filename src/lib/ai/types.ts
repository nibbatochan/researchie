import type { SummaryMode } from './summaryPrompt';

export interface AISummaryResult {
  bulletTakeaways: string[];
  summary: string;
  // The written summary in Markdown. Its shape follows the page and the chosen mode, not a template.
  markdown?: string;
  mode?: SummaryMode;
  // True when no model answered and the text is the page's own first sentences.
  extractiveOnly?: boolean;
  keyEntities?: string[];
  keyFindings?: string[];
  metricsAndData?: string[];
  implications?: string[];
  structuredBrief?: {
    overview: string;
    keyFindings: string[];
    metricsAndData: string[];
    implications: string[];
  };
}

export interface AICitation {
  quote: string;
  context?: string;
  textFragment?: string;
  passageId?: string;
  pageNumber?: number;
}

export class AIServiceBusyError extends Error {
  // True when the model refused the request for its size, so the caller can retry with less context.
  readonly tooLarge: boolean;

  constructor(message = 'The AI service is busy or the request was too large. Try again in a minute.', tooLarge = false) {
    super(message);
    this.name = 'AIServiceBusyError';
    this.tooLarge = tooLarge;
  }
}

// The user's own key is missing, refused, or out of quota. Routes turn this into a message that tells the
// user what to do; it is never swallowed into a fake answer.
export class AIKeyError extends Error {
  readonly code: 'NO_KEY' | 'INVALID_KEY' | 'RATE_LIMITED';
  readonly retryAfterSec?: number;
  /** Where the user can get or manage a key for the provider they chose. */
  readonly helpUrl?: string;

  constructor(code: 'NO_KEY' | 'INVALID_KEY' | 'RATE_LIMITED', message: string, retryAfterSec?: number, helpUrl?: string) {
    super(message);
    this.name = 'AIKeyError';
    this.code = code;
    this.retryAfterSec = retryAfterSec;
    this.helpUrl = helpUrl;
  }
}

export interface AIQnAResult {
  answer: string;
  citations: AICitation[];
  // True when the main model was unavailable (rate limit) and a fallback model answered.
  fromFallbackModel?: boolean;
}

export interface AISynthesisResult {
  title: string;
  directAnswer?: string;
  markdownContent: string;
  keyInsights: string[];
  citationsUsed: {
    atomId?: string;
    sourceTitle?: string;
    quote?: string;
    sourceUrl?: string;
  }[];
}

export interface AIServiceAdapter {
  /** One JSON-only completion from a system and a user message; returns the raw text. Absent on adapters with no model. */
  completeJson?(system: string, user: string, maxTokens: number): Promise<string>;
  summarizePage(pageText: string, pageTitle: string, mode?: SummaryMode): Promise<AISummaryResult>;
  askPageQuestion(pageText: string, question: string): Promise<AIQnAResult>;
  synthesizeAtoms?(
    atoms: Array<{
      id: string;
      title?: string;
      type: string;
      text?: string;
      description?: string;
      sourceUrl?: string;
      tags?: string[];
    }>,
    instruction?: string
  ): Promise<AISynthesisResult>;
}
