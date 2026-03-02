-- item_connections 테이블
CREATE TABLE IF NOT EXISTS item_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES items(id) ON DELETE CASCADE,
  target_id UUID REFERENCES items(id) ON DELETE CASCADE,
  similarity FLOAT NOT NULL,
  ai_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id)
);

-- RLS 활성화
ALTER TABLE item_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON item_connections FOR SELECT
  USING (
    source_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

-- 유사 아이템 찾기 RPC
CREATE OR REPLACE FUNCTION find_similar_items(
  query_embedding vector(768),
  query_item_id UUID,
  match_threshold FLOAT DEFAULT 0.35,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  summary TEXT,
  type TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.content,
    i.summary,
    i.type,
    1 - (i.embedding <=> query_embedding) AS similarity,
    i.created_at
  FROM items i
  WHERE i.embedding IS NOT NULL
    AND i.id != query_item_id
    AND i.user_id = (SELECT user_id FROM items WHERE id = query_item_id)
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
