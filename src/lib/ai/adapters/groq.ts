import { AIServiceAdapter, AISummaryResult, AIQnAResult, AISynthesisResult } from '../types';
import { MockAIAdapter } from './mock';

export class GroqAIAdapter implements AIServiceAdapter {
  private apiKey: string;
  private model: string;
  private fallbackModels: string[];
  private baseUrl: string;
  private mockFallback = new MockAIAdapter();

  constructor(apiKey: string, model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b', baseUrl = 'https://api.groq.com/openai/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.fallbackModels = [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'allam-2-7b',
    ];
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private cleanJsonString(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return clean.trim();
  }

  private async callChatCompletion(payload: any) {
    const modelsToTry = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          signal: AbortSignal.timeout(25000),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            ...payload,
            model: modelName,
          }),
        });

        if (res.ok) {
          return await res.json();
        }

        const errText = await res.text();
        lastError = new Error(`Groq [${modelName}] error ${res.status}: ${errText}`);
        // If 401 Unauthorized, no need to cycle further
        if (res.status === 401) break;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('All Groq model attempts failed');
  }

  async summarizePage(pageText: string, pageTitle: string): Promise<AISummaryResult> {
    try {
      const prompt = `Analyze this web page text and generate a structured executive brief for product research.
Return a strict JSON object with:
1. "summary": A clear executive overview (2-3 sentences detailing document core thesis, significance, and architecture).
2. "keyFindings": Array of 4 to 6 high-signal, specific factual findings and core arguments from the text.
3. "metricsAndData": Array of concrete metrics, statistics, percentages, benchmarks, latency, or unit economics mentioned in the text.
4. "implications": Array of 2 to 3 strategic takeaways or implications for product design and engineering.
5. "bulletTakeaways": Array of 4 to 6 concise takeaways.

Page Title: ${pageTitle}
Page Text:
${pageText.slice(0, 15000)}`;

      const data = await this.callChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI research assistant. You produce high-density, analytical executive briefs. Output valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const rawContent = data.choices?.[0]?.message?.content || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(this.cleanJsonString(rawContent));
      } catch {
        parsed = { summary: rawContent, keyFindings: [rawContent.slice(0, 120)] };
      }

      const summary = parsed.summary || `Executive brief for ${pageTitle}.`;
      const keyFindings = Array.isArray(parsed.keyFindings) && parsed.keyFindings.length > 0
        ? parsed.keyFindings
        : (parsed.bulletTakeaways || [`Core analysis synthesized from ${pageTitle}.`]);
      const metricsAndData = Array.isArray(parsed.metricsAndData) ? parsed.metricsAndData : [];
      const implications = Array.isArray(parsed.implications) ? parsed.implications : [];

      return {
        summary,
        bulletTakeaways: keyFindings,
        keyFindings,
        metricsAndData: metricsAndData.length > 0 ? metricsAndData : undefined,
        implications: implications.length > 0 ? implications : undefined,
        structuredBrief: {
          overview: summary,
          keyFindings,
          metricsAndData,
          implications,
        },
      };
    } catch (error) {
      console.warn('Groq summarizePage error, falling back to local deterministic engine:', error);
      return this.mockFallback.summarizePage(pageText, pageTitle);
    }
  }

  async askPageQuestion(pageText: string, question: string): Promise<AIQnAResult> {
    try {
      const prompt = `You are an expert grounded research assistant. Answer the question using ONLY the provided document pages and excerpts.

CRITICAL INSTRUCTIONS:
1. Strict Grounding: Answer accurately and directly using ONLY facts from the provided document excerpts.
2. Missing Information: If the question asks about something not mentioned in the document, or if the document does not contain the answer, your "answer" MUST state: "This information is not found in the provided document." DO NOT extrapolate, guess, or use external internet knowledge.
3. Citations: When an answer is found, every main point must cite its source page in brackets, e.g. [Page X] or [p. X].
4. Verbatim Quote: Provide an exact sentence or phrase quote from the text that proves your answer in "citationQuote". If the information is not found in the document, "citationQuote" MUST be an empty string "".
5. Page Mentions: If the question asks about a specific page or table (e.g. Page 2), directly examine and explain the excerpt labeled [PAGE 2].
6. Formatting: Use bold formatting (**like this**) for key terms, metrics, numbers, and definitions.

Question:
${question}

Document Content:
${pageText.slice(0, 85000)}

Return a strict JSON object with:
1. "answer": Comprehensive, well-structured Markdown response with bullet points, bold key findings, and page citations in brackets (or a clear statement that information is not found).
2. "citationQuote": Exact direct quote from the document text that supports this answer (or empty string "" if not found).
3. "sourcePageNumber": The primary page number (integer) where this information was found.`;

      const data = await this.callChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an analytical research AI assistant. You answer user questions strictly based on the provided document excerpts. Output valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const rawContent = data.choices?.[0]?.message?.content || '';
      let parsed: any = {};
      try {
        parsed = JSON.parse(this.cleanJsonString(rawContent));
      } catch {
        parsed = { answer: rawContent };
      }

      const answer = parsed.answer || rawContent || 'No direct answer found in document.';
      const quote = parsed.citationQuote || parsed.quote || '';

      const isNotFound = /not found|not mentioned|does not (?:contain|provide|mention)|no information/i.test(answer);

      return {
        answer,
        citations: quote && !isNotFound
          ? [{ quote, textFragment: `#:~:text=${encodeURIComponent(quote.slice(0, 32))}` }]
          : [],
      };
    } catch (error) {
      console.warn('Groq askPageQuestion error, falling back to local deterministic engine:', error);
      return this.mockFallback.askPageQuestion(pageText, question);
    }
  }

  async synthesizeAtoms(
    atoms: Array<{
      id: string;
      title?: string;
      type: string;
      text?: string;
      description?: string;
      sourceUrl?: string;
      tags?: string[];
    }>,
    instruction = 'Generate a comprehensive research synthesis memo comparing findings, identifying key tradeoffs, and drafting PRD requirements.'
  ): Promise<AISynthesisResult> {
    try {
      const atomsContext = atoms
        .map(
          (a, i) => `[Source ${i + 1}] ID: ${a.id} | Type: ${a.type} | Title: ${a.title || 'Untitled'}
URL: ${a.sourceUrl || 'N/A'}
Tags: ${a.tags?.join(', ') || 'none'}
Content: ${a.text || a.description || 'No text'}
---`
        )
        .join('\n\n');

      const isQnA = instruction.toLowerCase().includes('question') || instruction.toLowerCase().includes('answer');

      const systemPrompt = isQnA
        ? `You are an expert grounded research assistant. Your highest priority is strict factual truthfulness to the provided research clips.
STRICT GROUNDING RULES:
1. Answer using EXCLUSIVELY the provided Captured Clips.
2. NEGATIVE CONSTRAINT: If the user's question asks about a topic, company, product, or specification that is NOT mentioned in the provided clips (e.g., questions about outside topics, or undisclosed specs), you MUST state clearly and directly: "This information is not found in the project research data."
3. DO NOT use pre-trained outside internet knowledge to fill in gaps or answer off-topic questions. Never hallucinate facts, numbers, or dates not present in the clips.
4. When information is not in the data, "citationsUsed" MUST be an empty array [].
5. Only include items in "citationsUsed" that actually support the stated facts with a verbatim quote.
Output valid JSON only.`
        : 'You are a principal research strategist. Generate thorough, well-structured Markdown memos with quantitative depth using exclusively the provided research atoms. Output valid JSON only.';

      const userPrompt = isQnA
        ? `Answer the user's question in two distinct parts:
1. "directAnswer": A 1-sentence bottom-line exact answer with **bold crucial findings**. If the question is not answerable from the clips, clearly state that this information is not found in the project research data.
2. "markdownContent": Clearly structured markdown with headings (##, ###), bold key concepts, and bullet points. If not in the data, explain that the project clips do not cover this topic.

${instruction}

Captured Clips (${atoms.length} items):
${atomsContext}

Return JSON with:
1. "title": "Answer Summary",
2. "directAnswer": "The exact 1-sentence bottom line answer with **bold terms** (or stating not found in project data)",
3. "keyInsights": Array of 2-3 short bullet takeaways,
4. "markdownContent": Structured bullet points explaining the evidence (or lack thereof),
5. "citationsUsed": Array of objects { "atomId": string, "sourceTitle": string, "quote": string } (MUST be empty [] if the topic is not covered in the clips)`
        : `You are an elite product research and technical strategy lead.
Synthesize the provided research atoms according to the instruction.

Instruction:
${instruction}

Captured Research Atoms (${atoms.length} items):
${atomsContext}

Return a strict JSON object with:
1. "title": A sharp, professional title for the research memo or synthesis.
2. "keyInsights": Array of 3 to 5 core high-impact strategic conclusions or takeaways.
3. "markdownContent": The full, detailed Markdown document (structured with headings ##, bullet points, comparison tables, and inline citations like [Source 1], [Source 2]).
4. "citationsUsed": Array of objects { "atomId": string, "sourceTitle": string, "quote": string } identifying the exact items utilized.`;

      const data = await this.callChatCompletion({
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: isQnA ? 0.1 : 0.2,
      });

      const rawContent = data.choices?.[0]?.message?.content || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(this.cleanJsonString(rawContent));
      } catch {
        parsed = {
          title: isQnA ? 'Answer Summary' : 'Research Synthesis',
          directAnswer: rawContent.slice(0, 150),
          markdownContent: rawContent,
        };
      }

      return {
        title: parsed.title || (isQnA ? 'Answer Summary' : 'Research Synthesis & Technical Brief'),
        directAnswer: parsed.directAnswer || (isQnA ? parsed.keyInsights?.[0] : undefined),
        keyInsights: parsed.keyInsights || [],
        markdownContent: parsed.markdownContent || 'Synthesis generated.',
        citationsUsed: parsed.citationsUsed || [],
      };
    } catch (error) {
      console.warn('Groq synthesizeAtoms error, falling back to local deterministic engine:', error);
      return this.mockFallback.synthesizeAtoms(atoms, instruction);
    }
  }
}
