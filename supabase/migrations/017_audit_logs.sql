create table audit_logs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    actor_id uuid references profiles(id) on delete set null,
    action text not null,
    metadata jsonb,
    created_at timestamptz default now()
);

create index idx_audit_org on audit_logs(organization_id);
