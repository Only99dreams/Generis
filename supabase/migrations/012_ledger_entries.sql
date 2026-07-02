create table ledger_entries (
    id uuid primary key default gen_random_uuid(),
    wallet_id uuid references wallets(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    transaction_id uuid references transactions(id) on delete set null,
    entry_type text not null,
    amount numeric(18,2) not null,
    reference text,
    created_at timestamptz default now()
);

create index idx_ledger_wallet on ledger_entries(wallet_id);
create index idx_ledger_user on ledger_entries(user_id);
