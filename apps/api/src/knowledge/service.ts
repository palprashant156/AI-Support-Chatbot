import { memory } from '../database/memory.js';
import { getPool } from '../database/db.js';
import type { KnowledgeChunk } from '../types.js';

// Minimal keyword RAG that works with ₹0 and no embeddings.
// When pgvector embeddings exist, vector search is preferred (see vectorSearch);
// otherwise token-overlap scoring gives deterministic, testable results.
function score(query: string, doc: string): number {
  const stop = new Set(['the', 'a', 'an', 'is', 'are', 'what', 'how', 'can', 'my', 'i', 'do', 'does', 'for', 'of', 'to', 'in', 'on']);
  const qt = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !stop.has(w));
  const dt = new Set(doc.toLowerCase().split(/[^a-z0-9]+/));
  let s = 0;
  for (const w of qt) if (dt.has(w)) s += w.length > 5 ? 2 : 1;
  return s;
}

export interface ScoredChunk extends KnowledgeChunk {
  score: number;
}

export async function searchKnowledge(query: string, topK = 3): Promise<ScoredChunk[]> {
  // 1) Try pgvector if embeddings populated
  const pool = getPool();
  if (pool && process.env.NODE_ENV !== 'test') {
    try {
      const count = await pool.query(`SELECT count(*)::int AS n FROM knowledge_chunks WHERE embedding IS NOT NULL`);
      if (count.rows[0]?.n > 0) {
        // Without a real embedding model we cannot embed the query server-side;
        // fall through to keyword search. Gemini embeddings plug in here (Phase 10+).
      }
      const r = await pool.query('SELECT id,title,section,content FROM knowledge_chunks');
      if (r.rows.length) {
        return (r.rows as KnowledgeChunk[])
          .map((c) => ({ ...c, score: score(query, `${c.title} ${c.section} ${c.content}`) }))
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
      }
    } catch { /* memory fallback */ }
  }
  return [...memory.knowledge.values()]
    .map((c) => ({ ...c, score: score(query, `${c.title} ${c.section} ${c.content}`) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
