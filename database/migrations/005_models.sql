-- ForgeAI
-- Migration 005: AI Models

create table if not exists public.ai_models (
    id uuid primary key default gen_random_uuid(),

    provider text not null,

    model_id text not null,

    display_name text not null,

    description text,

    is_active boolean not null default true,

    supports_streaming boolean not null default true,

    supports_tools boolean not null default false,

    context_window integer,

    max_output_tokens integer,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique (provider, model_id)
);

-- Indexes

create index if not exists ai_models_provider_idx
on public.ai_models(provider);

create index if not exists ai_models_active_idx
on public.ai_models(is_active);

-- Row Level Security

alter table public.ai_models enable row level security;

-- Authenticated users can view available models

create policy "Authenticated users can view active AI models"
on public.ai_models
for select
to authenticated
using (
    is_active = true
);