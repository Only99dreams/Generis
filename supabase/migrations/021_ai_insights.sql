create table ai_insights (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    insight_type text,
    insight text not null,
    metadata jsonb,
    created_at timestamptz default now()
);

create index idx_ai_org on ai_insights(organization_id);
