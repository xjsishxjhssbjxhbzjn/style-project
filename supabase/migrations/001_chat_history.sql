-- chat_sessions: one style discovery attempt
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  substantive_answer_count int not null default 0,
  phase text not null default 'interview' check (phase in ('interview', 'results')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_sessions_user_updated on public.chat_sessions (user_id, updated_at desc);
create index chat_messages_session_created on public.chat_messages (session_id, created_at);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users select own sessions"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own sessions"
  on public.chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users update own sessions"
  on public.chat_sessions for update
  using (auth.uid() = user_id);

create policy "Users delete own sessions"
  on public.chat_sessions for delete
  using (auth.uid() = user_id);

create policy "Users select messages in own sessions"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users insert messages in own sessions"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users update messages in own sessions"
  on public.chat_messages for update
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users delete messages in own sessions"
  on public.chat_messages for delete
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

create or replace function public.touch_chat_session_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_sessions
  set updated_at = now()
  where id = new.session_id;
  return new;
end;
$$;

create trigger chat_messages_touch_session
  after insert on public.chat_messages
  for each row
  execute function public.touch_chat_session_on_message();
