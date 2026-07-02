create table security_events (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid references profiles(id) on delete set null,
    event_type text not null,
    metadata jsonb,
    created_at timestamptz default now()
);

create index idx_security_user on security_events(user_id);
