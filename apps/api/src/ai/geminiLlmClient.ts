import type { LlmClient, LlmMessage } from './llmClient.js';
import { env } from '../config/env.js';

// Gemini adapter behind LlmClient. Only used when LLM_PROVIDER=gemini + key present.
// Otherwise factory falls back to MockLlmClient (₹0-safe default).
export class GeminiLlmClient implements LlmClient {
  readonly provider = 'gemini';
  constructor(private apiKey = env.geminiApiKey, private model = env.geminiModel) {}

  private toGemini(messages: LlmMessage[]) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    return { system_instruction: system ? { parts: [{ text: system }] } : undefined, contents };
  }

  async complete(messages: LlmMessage[]) {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY missing');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.toGemini(messages)) },
    );
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const json: any = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    return { text, citations: [] };
  }

  async stream(messages: LlmMessage[], onToken: (d: string) => void, signal?: AbortSignal): Promise<string> {
    // Chunked simulation over non-streaming endpoint: keeps SSE contract identical.
    const { text } = await this.complete(messages);
    const parts = text.match(/.{1,24}/g) ?? [text];
    let out = '';
    for (const p of parts) {
      if (signal?.aborted) break;
      out += p;
      onToken(p);
      await new Promise((r) => setTimeout(r, 10));
    }
    return out;
  }
}
