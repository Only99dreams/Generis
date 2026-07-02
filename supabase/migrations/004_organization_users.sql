create table organization_users (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    role text not null default 'viewer',
    created_at timestamptz default now()
);
