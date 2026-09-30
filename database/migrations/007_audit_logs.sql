-- ForgeAI
-- Migration 007: Audit Logs

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),

    user_id uuid
        references auth.users(id)
        on delete set null,

    action text not null,

    resource_type text,

    resource_id uuid,

    metadata jsonb not null default '{}'::jsonb,

    ip_address inet,

    user_agent text,

    created_at timestamptz not null default now()
);

-- Indexes

create index if not exists audit_logs_user_id_idx
on public.audit_logs(user_id);

create index if not exists audit_logs_action_idx
on public.audit_logs(action);

create index if not exists audit_logs_created_at_idx
on public.audit_logs(created_at desc);

-- Row Level Security

alter table public.audit_logs enable row level security;

-- Normal users cannot directly read audit logs.
-- Audit logs should be accessed by trusted backend/admin tooling.