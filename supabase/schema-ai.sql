-- Enable pgvector extension
create extension if not exists vector;

-- Add AI columns to items
alter table items add column if not exists summary text;
alter table items add column if not exists embedding vector(768);

-- Vector similarity search index
create index if not exists items_embedding_idx
  on items using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC function for semantic search
create or replace function match_items(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 10
)
returns table (
  id uuid,
  type text,
  content text,
  summary text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    items.id,
    items.type,
    items.content,
    items.summary,
    items.metadata,
    items.created_at,
    1 - (items.embedding <=> query_embedding) as similarity
  from items
  where items.embedding is not null
    and 1 - (items.embedding <=> query_embedding) > match_threshold
  order by items.embedding <=> query_embedding
  limit match_count;
end;
$$;
