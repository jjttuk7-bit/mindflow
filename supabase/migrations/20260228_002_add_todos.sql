create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid references items(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  content text not null,
  is_completed boolean not null default false,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table todos enable row level security;
create policy "Users can manage own todos" on todos
  for all using (auth.uid() = user_id);
create index idx_todos_user_id on todos(user_id);
create index idx_todos_item_id on todos(item_id);
create index idx_todos_project_id on todos(project_id);
