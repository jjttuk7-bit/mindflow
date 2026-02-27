-- ============================================
-- Mindflow: Auth Migration
-- user_id 컬럼 추가, 기존 데이터 삭제, RLS 정책 변경
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- 1. items 테이블에 user_id 컬럼 추가 (nullable로 먼저)
ALTER TABLE items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. 기존 테스트 데이터 삭제
DELETE FROM item_tags;
DELETE FROM shared_items;
DELETE FROM items;
DELETE FROM tags;

-- 3. user_id NOT NULL 제약 추가 + 인덱스
ALTER TABLE items ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);

-- 4. 기존 "Allow all" RLS 정책 삭제
DROP POLICY IF EXISTS "Allow all on items" ON items;
DROP POLICY IF EXISTS "Allow all on tags" ON tags;
DROP POLICY IF EXISTS "Allow all on item_tags" ON item_tags;
DROP POLICY IF EXISTS "Allow all on shared_items" ON shared_items;

-- 5. 새 RLS 정책: items - 자기 데이터만 CRUD
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (user_id = auth.uid());

-- 공유된 아이템은 누구나 읽기 가능
CREATE POLICY "Anyone can view shared items"
  ON items FOR SELECT
  USING (
    id IN (SELECT item_id FROM shared_items)
  );

-- 6. 새 RLS 정책: tags - 인증된 사용자 모두 접근
CREATE POLICY "Authenticated users can read tags"
  ON tags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tags"
  ON tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tags"
  ON tags FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tags"
  ON tags FOR DELETE
  USING (auth.role() = 'authenticated');

-- 7. 새 RLS 정책: item_tags - 자기 아이템의 태그만 관리
CREATE POLICY "Users can view own item_tags"
  ON item_tags FOR SELECT
  USING (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own item_tags"
  ON item_tags FOR INSERT
  WITH CHECK (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own item_tags"
  ON item_tags FOR DELETE
  USING (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

-- 8. 새 RLS 정책: shared_items - 자기 아이템만 공유 + 퍼블릭 읽기
CREATE POLICY "Users can share own items"
  ON shared_items FOR INSERT
  WITH CHECK (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can view shared_items"
  ON shared_items FOR SELECT
  USING (true);

CREATE POLICY "Users can delete own shared_items"
  ON shared_items FOR DELETE
  USING (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

-- 9. match_items RPC 함수에 user_id 필터 추가
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
    AND items.user_id = auth.uid()
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
