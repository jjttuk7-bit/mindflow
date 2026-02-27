create table insight_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month date not null,
  report_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, month)
);

alter table insight_reports enable row level security;
create policy "Users can read own reports" on insight_reports
  for all using (auth.uid() = user_id);
create index idx_insight_reports_user_id on insight_reports(user_id);
