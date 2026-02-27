-- ============================================
-- Mindflow: Full Database Migration
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- 1. Core tables
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image', 'voice')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 2. AI columns (pgvector for Gemini text-embedding-004 = 768 dimensions)
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE items ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS items_embedding_idx
  ON items USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_items(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 10
)
RETURNS TABLE (
  id uuid,
  type text,
  content text,
  summary text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.type,
    items.content,
    items.summary,
    items.metadata,
    items.created_at,
    1 - (items.embedding <=> query_embedding) AS similarity
  FROM items
  WHERE items.embedding IS NOT NULL
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Content management columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 4. Shared items for public sharing
CREATE TABLE IF NOT EXISTS shared_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_items_token_idx ON shared_items (token);

-- 5. RLS (Row Level Security) - 공개 접근 허용
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on item_tags" ON item_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on shared_items" ON shared_items FOR ALL USING (true) WITH CHECK (true);
