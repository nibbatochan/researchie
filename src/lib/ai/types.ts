export interface AISummaryResult {
  bulletTakeaways: string[];
  summary: string;
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
  summarizePage(pageText: string, pageTitle: string): Promise<AISummaryResult>;
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
