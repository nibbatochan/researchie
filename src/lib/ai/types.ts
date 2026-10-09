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
}

export interface AIQnAResult {
  answer: string;
  citations: AICitation[];
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
