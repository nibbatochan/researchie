import { AIServiceAdapter } from './types';
import { MockAIAdapter } from './adapters/mock';
import { GatewayAIAdapter } from './adapters/gateway';
import { GroqAIAdapter } from './adapters/groq';

function createAIService(): AIServiceAdapter {
  const groqKey = process.env.GROQ_API_KEY;
  const customBaseUrl = process.env.CUSTOM_AI_BASE_URL;
  const customModel = process.env.GROQ_MODEL || process.env.CUSTOM_AI_MODEL || 'openai/gpt-oss-120b';

  // 1. If Groq API Key or Custom Endpoint is provided
  if (groqKey && groqKey.trim().length > 0) {
    return new GroqAIAdapter(groqKey, customModel, customBaseUrl || 'https://api.groq.com/openai/v1');
  }

  // 2. If Custom Base URL is provided without auth (e.g. local Ollama / vLLM / HF Space)
  if (customBaseUrl && customBaseUrl.trim().length > 0) {
    return new GroqAIAdapter(process.env.CUSTOM_AI_API_KEY || 'no-key-required', customModel, customBaseUrl);
  }

  // 3. Fallback to AI Gateway if available
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (gatewayKey && gatewayKey.trim().length > 0) {
    return new GatewayAIAdapter(gatewayKey);
  }

  // 4. Fallback to deterministic local mock adapter
  return new MockAIAdapter();
}

export const aiService = createAIService();
