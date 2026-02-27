-- Shared items for public sharing via token
create table if not exists shared_items (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references items(id) on delete cascade,
  token uuid default gen_random_uuid() unique not null,
  created_at timestamptz default now()
);

-- Index for fast token lookup
create index if not exists shared_items_token_idx on shared_items (token);
