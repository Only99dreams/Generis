create table transactions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    transaction_type text,
    amount numeric(18,2),
    reference text unique,
    status text,
    category text,
    narration text,
    metadata jsonb,
    created_at timestamptz default now()
);

create index idx_tx_user on transactions(user_id);
create index idx_tx_org on transactions(organization_id);
create index idx_tx_reference on transactions(reference);
