create table wallets (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    available_balance numeric(18,2) default 0,
    ledger_balance numeric(18,2) default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_wallet_user on wallets(user_id);
create index idx_wallet_org on wallets(organization_id);
