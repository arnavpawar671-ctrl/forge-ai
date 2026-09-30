-- ForgeAI
-- Migration 006: Usage Tracking

create table if not exists public.usage_events (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    conversation_id uuid
        references public.conversations(id)
        on delete set null,

    message_id uuid
        references public.messages(id)
        on delete set null,

    provider text not null,

    model text not null,

    input_tokens integer not null default 0,

    output_tokens integer not null default 0,

    total_tokens integer not null default 0,

    request_type text not null default 'chat',

    created_at timestamptz not null default now()
);

-- Indexes

create index if not exists usage_events_user_id_idx
on public.usage_events(user_id);

create index if not exists usage_events_conversation_id_idx
on public.usage_events(conversation_id);

create index if not exists usage_events_created_at_idx
on public.usage_events(created_at);

-- Row Level Security

alter table public.usage_events enable row level security;

-- Users can view their own usage

create policy "Users can view their own usage"
on public.usage_events
for select
to authenticated
using (
    (select auth.uid()) = user_id
);