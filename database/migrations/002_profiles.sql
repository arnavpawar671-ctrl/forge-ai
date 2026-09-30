-- ForgeAI
-- Migration 002: Profiles

create table if not exists public.profiles (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    display_name text,
    avatar_url text,

    preferred_mode text not null default 'explain',
    preferred_personality text not null default 'senior_engineer',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);