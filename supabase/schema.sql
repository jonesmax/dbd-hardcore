-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) to create the sessions table.
-- One row stores the full app session as JSON.

create table if not exists public.sessions (
  id text primary key default 'default',
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Allow anonymous read/write for static site (no auth). Restrict with RLS if you add auth later.
alter table public.sessions enable row level security;

create policy "Allow anon read and write"
  on public.sessions
  for all
  to anon
  using (true)
  with check (true);
