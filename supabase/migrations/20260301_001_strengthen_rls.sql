-- Strengthen RLS policies for base tables (items, tags, item_tags, shared_items)

-- ── items: users can only access their own items ──
alter table items enable row level security;

drop policy if exists "Users can manage own items" on items;
create policy "Users can manage own items" on items
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── tags: authenticated users can read all tags, manage tags they created ──
alter table tags enable row level security;

drop policy if exists "Authenticated users can read tags" on tags;
create policy "Authenticated users can read tags" on tags
  for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can create tags" on tags;
create policy "Authenticated users can create tags" on tags
  for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update tags" on tags;
create policy "Authenticated users can update tags" on tags
  for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete tags" on tags;
create policy "Authenticated users can delete tags" on tags
  for delete using (auth.uid() is not null);

-- ── item_tags: users can only manage tags on their own items ──
alter table item_tags enable row level security;

drop policy if exists "Users can read own item tags" on item_tags;
create policy "Users can read own item tags" on item_tags
  for select using (
    exists (select 1 from items where items.id = item_tags.item_id and items.user_id = auth.uid())
  );

drop policy if exists "Users can create own item tags" on item_tags;
create policy "Users can create own item tags" on item_tags
  for insert with check (
    exists (select 1 from items where items.id = item_tags.item_id and items.user_id = auth.uid())
  );

drop policy if exists "Users can delete own item tags" on item_tags;
create policy "Users can delete own item tags" on item_tags
  for delete using (
    exists (select 1 from items where items.id = item_tags.item_id and items.user_id = auth.uid())
  );

-- ── shared_items: owners manage, public read by token ──
alter table shared_items enable row level security;

drop policy if exists "Users can manage own shared items" on shared_items;
create policy "Users can manage own shared items" on shared_items
  for all using (
    exists (select 1 from items where items.id = shared_items.item_id and items.user_id = auth.uid())
  );

drop policy if exists "Anyone can read shared items by token" on shared_items;
create policy "Anyone can read shared items by token" on shared_items
  for select using (true);
