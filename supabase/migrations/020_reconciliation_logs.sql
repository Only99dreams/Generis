create table reconciliation_logs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    issue_type text not null,
    reference text,
    expected_amount numeric(18,2),
    actual_amount numeric(18,2),
    status text default 'open',
    resolved_at timestamptz,
    created_at timestamptz default now()
);

create index idx_recon_org on reconciliation_logs(organization_id);
