-- ForgeAI
-- Migration 001: Users

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),

    email text unique,
    display_name text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.users enable row level security;