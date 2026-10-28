import { AIKeyError } from '../types';
import { GroqAIAdapter } from './groq';

// Claude through Anthropic's Messages API. The prompts, grounding rules and JSON parsing come from the shared
// chat base class; only the wire format differs here.
//
// JSON is forced with a tool: the model must call `record_result`, and its input comes back as a parsed object.
// The API enforces that the call is made, so the output is shaped by the API, not by hoping the model writes
// valid JSON. The base class then reads that object as its usual JSON string.

const ANTHROPIC_VERSION = '2023-06-01';
const RESULT_TOOL = {
  name: 'record_result',
  description: 'Record the result as a single JSON object with the fields the request asks for.',
  input_schema: { type: 'object' as const, additionalProperties: true },
};

export class AnthropicAIAdapter extends GroqAIAdapter {
  protected async callChatCompletion(payload: any) {
    // skipModels has no meaning with one Claude model per request; it is dropped here.
    const { messages = [], response_format, max_tokens, temperature } = payload as any;
    const system = messages
      .filter((m: any) => m.role === 'system')
      .map((m: any) => String(m.content))
      .join('\n\n');
    const turns = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({ role: m.role, content: String(m.content) }));
    const wantsJson = response_format?.type === 'json_object';

    const body: Record<string, unknown> = {
      model: this.model,
      // The Messages API requires max_tokens; 4096 covers a page summary or a synthesis memo.
      max_tokens: max_tokens ?? 4096,
      messages: turns,
      ...(system ? { system } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(wantsJson ? { tools: [RESULT_TOOL], tool_choice: { type: 'tool', name: RESULT_TOOL.name } } : {}),
    };

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json: any = await res.json();
      const blocks: any[] = Array.isArray(json.content) ? json.content : [];
      let content: string;
      const toolCall = blocks.find((b) => b.type === 'tool_use' && b.name === RESULT_TOOL.name);
      if (wantsJson && toolCall) {
        content = JSON.stringify(toolCall.input ?? {});
      } else {
        content = blocks
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
      }
      return { choices: [{ message: { content } }], __model: json.model || this.model };
    }

    const errText = await res.text();
    if (res.status === 401 || res.status === 403) {
      if (this.strict) throw new AIKeyError('INVALID_KEY', 'The provider rejected your API key.', undefined, this.keysUrl);
    }
    if (res.status === 429 && this.strict) {
      const retry = Number(res.headers.get('retry-after'));
      const retryAfterSec = Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : undefined;
      throw new AIKeyError('RATE_LIMITED', 'Your provider free limit is used up for now.', retryAfterSec, this.keysUrl);
    }

    const error: any = new Error(`Anthropic [${this.model}] error ${res.status}: ${errText}`);
    // Too large for the model: the route retries with fewer passages.
    error.sawTooLarge = res.status === 413 || (res.status === 400 && /too long|too many tokens|context/i.test(errText));
    error.sawRateLimit = res.status === 429;
    throw error;
  }
}
