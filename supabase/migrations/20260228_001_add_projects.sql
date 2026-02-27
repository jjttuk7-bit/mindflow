create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  color text not null default '#8B7355',
  is_auto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;
create policy "Users can manage own projects" on projects
  for all using (auth.uid() = user_id);
create index idx_projects_user_id on projects(user_id);
