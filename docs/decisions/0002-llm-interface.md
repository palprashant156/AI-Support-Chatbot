# ADR 0002 — LLM behind interface, mock default

Date: 2026-10-10. Status: Accepted.
Context: No budget, Gemini free-tier unverified/quota-limited.
Decision: `LlmClient` interface; `MockLlmClient` deterministic + `[mock]`-tagged; `GeminiLlmClient` only when `LLM_PROVIDER=gemini` + key. Same for embeddings (`HashEmbeddingClient` 384d for schema tests).
Consequences: All flows testable offline; provider swap without touching orchestrator/controllers.
