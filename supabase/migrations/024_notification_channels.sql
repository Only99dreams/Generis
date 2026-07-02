create table notification_channels (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    provider text not null,
    api_key text,
    config jsonb,
    is_active boolean default true,
    created_at timestamptz default now()
);

create index idx_nc_org on notification_channels(organization_id);
