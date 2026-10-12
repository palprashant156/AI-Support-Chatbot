-- 002_knowledge.sql — RAG corpus (pgvector ready, keyword fallback works without embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge_chunks(title);
-- Vector index created lazily once rows exist (ivfflat needs data):
-- CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
