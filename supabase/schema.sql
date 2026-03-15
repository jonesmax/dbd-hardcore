-- Run in Supabase SQL Editor. Uses Auth (Dashboard → Authentication → enable Email provider).
-- One row per user; RLS ensures users only access their own session.

drop table if exists public.sessions;

create table public.sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.sessions enable row level security;

-- Users can only read/update their own row (insert on first save, then update).
create policy "Users read own session"
  on public.sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own session"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own session"
  on public.sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
