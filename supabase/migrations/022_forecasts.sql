create table forecasts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    expected_revenue numeric(18,2),
    month text,
    year integer,
    created_at timestamptz default now()
);

create index idx_forecast_org on forecasts(organization_id);
