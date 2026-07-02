create table organizations (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references profiles(id) on delete cascade,
    name text not null,
    slug text unique,
    organization_type text,
    logo_url text,
    status text default 'active',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_org_owner on organizations(owner_id);
