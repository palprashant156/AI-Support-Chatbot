import type { EmbeddingClient, LlmClient } from './llmClient.js';
import { MockLlmClient } from './mockLlmClient.js';
import { GeminiLlmClient } from './geminiLlmClient.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Deterministic hash embedding (384d) — lets pgvector schema + cosine code paths
// be tested without any external API. NOT semantic; replace with real model later.
export class HashEmbeddingClient implements EmbeddingClient {
  readonly dims = 384;
  async embed(text: string): Promise<number[]> {
    const v = new Array(this.dims).fill(0);
    const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (const tok of tokens) {
      let h = 2166136261;
      for (let i = 0; i < tok.length; i++) { h ^= tok.charCodeAt(i); h = Math.imul(h, 16777619); }
      v[Math.abs(h) % this.dims] += 1;
    }
    const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }
}

export function getLlmClient(): LlmClient {
  if (env.llmProvider === 'gemini' && env.geminiApiKey) {
    logger.info('using gemini provider', { model: env.geminiModel });
    return new GeminiLlmClient();
  }
  if (env.llmProvider === 'gemini' && !env.geminiApiKey) {
    logger.warn('LLM_PROVIDER=gemini but no key — falling back to mock');
  }
  return new MockLlmClient();
}
