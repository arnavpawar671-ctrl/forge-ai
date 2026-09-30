-- ForgeAI
-- Migration 004: Messages

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),

    conversation_id uuid not null
        references public.conversations(id)
        on delete cascade,

    role text not null
        check (role in ('user', 'assistant', 'system', 'tool')),

    content text not null,

    model text,

    mode text,

    personality text,

    token_count integer,

    created_at timestamptz not null default now()
);

-- Indexes

create index if not exists messages_conversation_id_idx
on public.messages(conversation_id);

create index if not exists messages_created_at_idx
on public.messages(created_at);

-- Row Level Security

alter table public.messages enable row level security;

-- Users can view messages belonging to their own conversations

create policy "Users can view their own messages"
on public.messages
for select
to authenticated
using (
    exists (
        select 1
        from public.conversations
        where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
);

-- Users can create messages in their own conversations

create policy "Users can create their own messages"
on public.messages
for insert
to authenticated
with check (
    exists (
        select 1
        from public.conversations
        where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
);

-- Users can update their own messages

create policy "Users can update their own messages"
on public.messages
for update
to authenticated
using (
    exists (
        select 1
        from public.conversations
        where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.conversations
        where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
);

-- Users can delete their own messages

create policy "Users can delete their own messages"
on public.messages
for delete
to authenticated
using (
    exists (
        select 1
        from public.conversations
        where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
);