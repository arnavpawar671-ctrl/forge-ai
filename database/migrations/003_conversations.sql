-- ForgeAI
-- Migration 003: Conversations

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    title text not null default 'New Chat',

    mode text not null default 'explain',

    personality text not null default 'senior_engineer',

    model text,

    is_archived boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

-- Indexes

create index if not exists conversations_user_id_idx
on public.conversations(user_id);

create index if not exists conversations_updated_at_idx
on public.conversations(updated_at desc);

-- Row Level Security

alter table public.conversations enable row level security;

-- Users can see their own conversations

create policy "Users can view their own conversations"
on public.conversations
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

-- Users can create conversations for themselves

create policy "Users can create their own conversations"
on public.conversations
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);

-- Users can update their own conversations

create policy "Users can update their own conversations"
on public.conversations
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);

-- Users can delete their own conversations

create policy "Users can delete their own conversations"
on public.conversations
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);