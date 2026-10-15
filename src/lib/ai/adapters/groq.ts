import { AIServiceAdapter, AISummaryResult, AIQnAResult, AISynthesisResult, AIServiceBusyError, AIKeyError } from '../types';
import { MockAIAdapter } from './mock';
import { SUMMARY_SYSTEM_PROMPT, type SummaryMode, buildSummaryPrompt, truncationNote } from '../summaryPrompt';

export class GroqAIAdapter implements AIServiceAdapter {
  private apiKey: string;
  private model: string;
  private fallbackModels: string[];
  private baseUrl: string;
  private mockFallback = new MockAIAdapter();

  private timeoutMs: number;
  // Strict = a user's own key: a refused or exhausted key is reported, never replaced by a fake answer.
  private strict: boolean;
  private keysUrl?: string;

  constructor(
    apiKey: string,
    model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
    baseUrl = 'https://api.groq.com/openai/v1',
    options: { fallbackModels?: string[]; timeoutMs?: number; strict?: boolean; keysUrl?: string } = {},
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = options.timeoutMs ?? 25000;
    this.strict = options.strict ?? false;
    this.keysUrl = options.keysUrl;
    this.fallbackModels = options.fallbackModels ?? [
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
    // skipModels lets a caller leave out models too weak for its task.
    const { skipModels = [], ...requestBody } = payload as { skipModels?: string[] };
    const modelsToTry = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)].filter((m) => !skipModels.includes(m));
    let lastError: any = null;
    let sawTooLarge = false;
    let sawRateLimit = false;
    let sawUnauthorized = false;
    let retryAfterSec: number | undefined;

    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            ...requestBody,
            model: modelName,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          return { ...json, __model: modelName };
        }

        const errText = await res.text();
        lastError = new Error(`Groq [${modelName}] error ${res.status}: ${errText}`);
        if (res.status === 413 || (res.status === 400 && /length|large|token|context/i.test(errText))) sawTooLarge = true;
        if (res.status === 429) {
          sawRateLimit = true;
          const retry = Number(res.headers.get('retry-after'));
          if (Number.isFinite(retry) && retry > 0) retryAfterSec = Math.ceil(retry);
        }
        // If 401 Unauthorized, no need to cycle further
        if (res.status === 401 || res.status === 403) {
          sawUnauthorized = true;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (this.strict && sawUnauthorized) {
      throw new AIKeyError('INVALID_KEY', 'The provider rejected your API key.', undefined, this.keysUrl);
    }
    if (this.strict && sawRateLimit) {
      throw new AIKeyError('RATE_LIMITED', 'Your provider free limit is used up for now.', retryAfterSec, this.keysUrl);
    }

    const finalError: any = lastError || new Error('All Groq model attempts failed');
    finalError.sawTooLarge = sawTooLarge;
    finalError.sawRateLimit = sawRateLimit;
    throw finalError;
  }

  async summarizePage(pageText: string, pageTitle: string, mode: SummaryMode = 'auto'): Promise<AISummaryResult> {
    try {
      const data = await this.callChatCompletion({
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: buildSummaryPrompt(mode, pageTitle, pageText) },
        ],
        temperature: 0.2,
      });

      // Some models put their reasoning in <think> tags; the reader only wants the summary.
      const markdown = String(data.choices?.[0]?.message?.content || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();
      if (!markdown) throw new Error('Groq returned an empty summary');

      const written = markdown + truncationNote(pageText);
      return {
        summary: written,
        markdown: written,
        mode,
        bulletTakeaways: markdown.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '')),
      };
    } catch (error) {
      if (error instanceof AIKeyError) throw error;
      if (this.strict) throw new AIServiceBusyError();
      console.warn('Groq summarizePage error, falling back to the page sentences:', error);
      return this.mockFallback.summarizePage(pageText, pageTitle, mode);
    }
  }

  private async askOnce(context: string, question: string): Promise<AIQnAResult> {
    const prompt = `You are an expert grounded research assistant. Answer the question using ONLY the document passages below.

Each passage starts with a label such as [P3-2 | page 3]. The passage id is P3-2.

CRITICAL INSTRUCTIONS:
1. Strict Grounding: use ONLY facts stated in the passages. Do not guess or use outside knowledge.
2. Missing Information: if the passages do not contain the answer, "answer" MUST be: "This information is not found in the provided document." and "citations" MUST be [].
3. Page references: mention the page in brackets in the answer, e.g. [Page X].
4. Citations: for each main point give the passage id and a quote copied VERBATIM (same words, same order) from that passage. Keep each quote under 300 characters. Quote the whole sentence or clause that states the fact, including any technical term the question names (for example a protocol, product or metric).
5. Formatting: use bold (**like this**) for key terms, metrics and numbers.

Question:
${question}

Document Passages:
${context}

Return a strict JSON object with:
1. "answer": Markdown answer with page references in brackets (or the not-found statement).
2. "citations": array of { "passageId": "P3-2", "quote": "exact words from that passage" } ([] if not found).`;

    const data = await this.callChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an analytical research AI assistant. You answer strictly from the provided document passages. Output valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      // The reserved answer tokens count against the per-minute limit, so keep it modest.
      max_tokens: 1000,
      // The 7B model follows the grounding rules poorly: "busy" is better than a bad answer.
      skipModels: ['allam-2-7b'],
    });

    const rawContent = data.choices?.[0]?.message?.content || '';
    let parsed: any = {};
    try {
      parsed = JSON.parse(this.cleanJsonString(rawContent));
    } catch {
      parsed = { answer: rawContent };
    }

    const answer = parsed.answer || rawContent || 'No direct answer found in document.';
    const isNotFound = /not found|not mentioned|does not (?:contain|provide|mention)|no information/i.test(answer);

    const rawCitations: any[] = Array.isArray(parsed.citations) ? parsed.citations : [];
    if (rawCitations.length === 0 && typeof parsed.citationQuote === 'string' && parsed.citationQuote) {
      rawCitations.push({ quote: parsed.citationQuote });
    }
    const citations = isNotFound
      ? []
      : rawCitations
          .filter((c) => c && typeof c.quote === 'string' && c.quote.trim())
          .map((c) => ({
            quote: c.quote,
            passageId: typeof c.passageId === 'string' ? c.passageId.trim().toLowerCase() : undefined,
            textFragment: `#:~:text=${encodeURIComponent(c.quote.slice(0, 32))}`,
          }));
    return { answer, citations, fromFallbackModel: data.__model !== this.model };
  }

  async askPageQuestion(pageText: string, question: string): Promise<AIQnAResult> {
    try {
      return await this.askOnce(pageText, question);
    } catch (error: any) {
      if (error instanceof AIKeyError) throw error;
      // A size error goes back to the route, which retries with fewer of the most relevant
      // passages. Cutting the end here would drop later pages, such as the one asked about.
      if (error?.sawTooLarge) throw new AIServiceBusyError(undefined, true);
      console.warn('Groq askPageQuestion failed:', error);
      // A configured key must not turn into a fake "not found" answer from the mock.
      throw new AIServiceBusyError();
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
      if (error instanceof AIKeyError) throw error;
      if (this.strict) throw new AIServiceBusyError();
      console.warn('Groq synthesizeAtoms error, falling back to local deterministic engine:', error);
      return this.mockFallback.synthesizeAtoms(atoms, instruction);
    }
  }
}
