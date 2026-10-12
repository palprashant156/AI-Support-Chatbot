import type { LlmClient, LlmMessage } from './llmClient.js';

// Deterministic mock: grounds answers ONLY in supplied prompt context.
// Never invents order status/tracking. Clearly marked provider:'mock'.
export class MockLlmClient implements LlmClient {
  readonly provider = 'mock';
  failAfterChars: number | null = null;

  async complete(messages: LlmMessage[]) {
    const text = this.answerFrom(messages);
    return { text, citations: [] };
  }

  async stream(messages: LlmMessage[], onToken: (d: string) => void, signal?: AbortSignal): Promise<string> {
    const full = this.answerFrom(messages);
    // Stream word-by-word so client rendering + cancellation paths are exercised
    const words = full.split(/(\s+)/);
    let out = '';
    for (const w of words) {
      if (signal?.aborted) break;
      out += w;
      onToken(w);
      if (this.failAfterChars !== null && out.length >= this.failAfterChars) {
        throw new Error('Mock provider failure mid-stream (injected)');
      }
      await new Promise((r) => setTimeout(r, 5));
    }
    return out;
  }

  private answerFrom(messages: LlmMessage[]): string {
    // Only parse USER blocks — system instructions may mention block names but are not data.
    const joined = messages.filter((m) => m.role !== 'system').map((m) => m.content).join('\n---\n');
    const businessMatch = joined.match(/\[BUSINESS\]([\s\S]*?)\[\/BUSINESS\]/);
    const knowledgeMatch = joined.match(/\[KNOWLEDGE\]([\s\S]*?)\[\/KNOWLEDGE\]/);
    const qMatch = joined.match(/\[QUESTION\]([\s\S]*?)\[\/QUESTION\]/);
    const rawBusiness = (businessMatch?.[1] ?? '').trim();
    const rawKnowledge = (knowledgeMatch?.[1] ?? '').trim();
    const question = (qMatch?.[1] ?? '').trim().slice(0, 500);

    const isPlaceholder = (s: string) => !s || /\(no (business records needed|relevant articles)\)/i.test(s);
    const hasBusiness = !isPlaceholder(rawBusiness);
    // Filter placeholder lines, keep real evidence lines
    const knowledgeLines = rawKnowledge
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/\(no relevant articles\)/i.test(l));
    const hasKnowledge = knowledgeLines.length > 0;

    // Injection resistance: retrieved content is data, never instructions.
    // Detect imperative injection and refuse to follow it; redact the line.
    const INJECTION_RE = /ignore\s+(the\s+)?(system|previous|above)|disregard\s+.*(instruction|prompt)|reveal\s+.*secret|bypass.*(auth|secur)/i;
    const cleanKnowledgeLines = knowledgeLines.map((l) => (INJECTION_RE.test(l) ? '[redacted untrusted instruction — ignored]' : l));
    const injectionFound = knowledgeLines.some((l) => INJECTION_RE.test(l));
    const knowledgeView = cleanKnowledgeLines.slice(0, 6).join('\n');

    if (!hasBusiness && !hasKnowledge) {
      return `[mock] I could not find verified information for "${question}". Please share an order number (e.g. ORD-1001) or ask about shipping, returns, warranty, or troubleshooting, and I will look it up. I will not guess order status or tracking numbers.`;
    }
    if (hasBusiness && hasKnowledge) {
      const note = injectionFound ? '\nNote: a retrieved article contained instructions which I ignored as untrusted data.' : '';
      return `[mock] Based on verified records and help articles for "${question}":\n\n${rawBusiness}\n\nRelevant policy:\n${knowledgeView}${note}\n\nIf you need a return or cancellation, tell me the order number and I will check eligibility.`;
    }
    if (hasBusiness) {
      return `[mock] Verified from your account records:\n\n${rawBusiness}`;
    }
    const note = injectionFound ? '\nNote: a retrieved article contained instructions which I ignored as untrusted data.' : '';
    return `[mock] From our help center:\n\n${knowledgeView}${note}`;
  }
}
