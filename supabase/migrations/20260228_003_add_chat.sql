create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Chat',
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
create policy "Users can manage own chat sessions" on chat_sessions
  for all using (auth.uid() = user_id);
create policy "Users can manage own chat messages" on chat_messages
  for all using (
    session_id in (select id from chat_sessions where user_id = auth.uid())
  );
create index idx_chat_sessions_user_id on chat_sessions(user_id);
create index idx_chat_messages_session_id on chat_messages(session_id);
