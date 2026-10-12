import type { Citation } from '../types.js';
import type { ScoredChunk } from '../knowledge/service.js';

// Provider-agnostic LLM contracts. Controllers/services never import a provider SDK.
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface LlmClient {
  readonly provider: string;
  complete(messages: LlmMessage[]): Promise<{ text: string; citations: Citation[] }>;
  stream(messages: LlmMessage[], onToken: (delta: string) => void, signal?: AbortSignal): Promise<string>;
}

export interface EmbeddingClient {
  readonly dims: number;
  embed(text: string): Promise<number[]>;
}
