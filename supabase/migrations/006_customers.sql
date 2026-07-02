create table customers (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    customer_code text unique,
    full_name text not null,
    email text,
    phone text,
    status text default 'active',
    risk_score numeric default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_customer_org on customers(organization_id);
create index idx_customer_phone on customers(phone);
