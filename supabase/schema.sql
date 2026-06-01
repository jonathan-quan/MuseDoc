-- MuseDoc database schema.
--
-- Run this in the Supabase dashboard → SQL Editor (or via the Supabase CLI).
-- It is idempotent: safe to run on a fresh project OR on one where the
-- `documents` table already exists. It creates any missing table, ensures RLS
-- is on, makes `user_id` default to auth.uid() (so the app never sends it),
-- and (re)creates the ownership policies.

-- ── Documents ──────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default 'Untitled document',
  html       text not null default '<p></p>',
  text       text not null default '',
  starred    boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure the default exists even if the table predates this script.
alter table public.documents alter column user_id set default auth.uid();

create index if not exists documents_user_updated_idx
  on public.documents (user_id, updated_at desc);

alter table public.documents enable row level security;

drop policy if exists "Documents are viewable by their owner" on public.documents;
drop policy if exists "Users can insert their own documents" on public.documents;
drop policy if exists "Users can update their own documents" on public.documents;
drop policy if exists "Users can delete their own documents" on public.documents;

create policy "Documents are viewable by their owner"
  on public.documents for select using (auth.uid() = user_id);
create policy "Users can insert their own documents"
  on public.documents for insert with check (auth.uid() = user_id);
create policy "Users can update their own documents"
  on public.documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own documents"
  on public.documents for delete using (auth.uid() = user_id);

-- ── Per-document chat history ───────────────────────────────────────────────
-- One row per document, holding the conversation as a JSON array. Cascades
-- away automatically when its document is deleted.
create table if not exists public.document_chats (
  document_id uuid primary key references public.documents (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  messages    jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.document_chats alter column user_id set default auth.uid();

alter table public.document_chats enable row level security;

drop policy if exists "Chats are viewable by their owner" on public.document_chats;
drop policy if exists "Users can insert their own chats" on public.document_chats;
drop policy if exists "Users can update their own chats" on public.document_chats;
drop policy if exists "Users can delete their own chats" on public.document_chats;

create policy "Chats are viewable by their owner"
  on public.document_chats for select using (auth.uid() = user_id);
create policy "Users can insert their own chats"
  on public.document_chats for insert with check (auth.uid() = user_id);
create policy "Users can update their own chats"
  on public.document_chats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own chats"
  on public.document_chats for delete using (auth.uid() = user_id);
