-- Run this in Supabase > SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  username text default '@anonymous',
  score integer not null default 0 check (score >= 0 and score <= 100),
  tier text,
  duration text,
  audio_url text,
  reactions integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  username text default '@anonymous',
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.posts enable row level security;
alter table public.messages enable row level security;

drop policy if exists "posts_public_read" on public.posts;
drop policy if exists "posts_public_insert" on public.posts;
drop policy if exists "posts_public_update" on public.posts;
drop policy if exists "messages_public_read" on public.messages;
drop policy if exists "messages_public_insert" on public.messages;

create policy "posts_public_read"
on public.posts for select
using (true);

create policy "posts_public_insert"
on public.posts for insert
with check (true);

create policy "posts_public_update"
on public.posts for update
using (true)
with check (true);

create policy "messages_public_read"
on public.messages for select
using (true);

create policy "messages_public_insert"
on public.messages for insert
with check (true);

insert into storage.buckets (id, name, public)
values ('farts', 'farts', true)
on conflict (id) do update set public = true;

drop policy if exists "farts_public_read" on storage.objects;
drop policy if exists "farts_public_upload" on storage.objects;

create policy "farts_public_read"
on storage.objects for select
using (bucket_id = 'farts');

create policy "farts_public_upload"
on storage.objects for insert
with check (bucket_id = 'farts');

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
