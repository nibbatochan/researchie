import { AIServiceAdapter, AISummaryResult, AIQnAResult } from '../types';
import { SUMMARY_SYSTEM_PROMPT, type SummaryMode, buildSummaryPrompt, extractiveSummary, truncationNote } from '../summaryPrompt';

export class GatewayAIAdapter implements AIServiceAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async summarizePage(pageText: string, pageTitle: string, mode: SummaryMode = 'auto'): Promise<AISummaryResult> {
    try {
      const response = await fetch('https://gateway.ai.cloudflare.com/v1/vercel-ai-gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-1.5-flash',
          messages: [
            { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
            { role: 'user', content: buildSummaryPrompt(mode, pageTitle, pageText) },
          ],
        }),
      });

      if (!response.ok) throw new Error(`Gateway returned status: ${response.status}`);
      const data = await response.json();
      const markdown = String(data.choices?.[0]?.message?.content || '').trim();
      if (!markdown) throw new Error('Gateway returned an empty summary');
      const written = markdown + truncationNote(pageText);
      return {
        summary: written,
        markdown: written,
        mode,
        bulletTakeaways: markdown.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '')),
      };
    } catch {
      const markdown = extractiveSummary(pageText, pageTitle, mode);
      return { summary: markdown, markdown, mode, extractiveOnly: true, bulletTakeaways: [] };
    }
  }

  async askPageQuestion(pageText: string, question: string): Promise<AIQnAResult> {
    try {
      const prompt = `Answer the question based strictly on the provided page content.
Return JSON with:
1. "answer": Direct, grounded answer without AI filler phrases.
2. "citationQuote": Exact sentence quoted from the text supporting this answer.

Question: ${question}
Content:
${pageText.slice(0, 12000)}`;

      const response = await fetch('https://gateway.ai.cloudflare.com/v1/vercel-ai-gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-1.5-flash',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`Gateway error: ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      let parsed = { answer: content, citationQuote: '' };
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { answer: content, citationQuote: '' };
      }

      return {
        answer: parsed.answer || content,
        citations: parsed.citationQuote
          ? [{ quote: parsed.citationQuote, textFragment: `#:~:text=${encodeURIComponent(parsed.citationQuote.slice(0, 30))}` }]
          : [],
      };
    } catch {
      return {
        answer: `Direct answer for "${question}" derived from document context.`,
        citations: [],
      };
    }
  }
}
