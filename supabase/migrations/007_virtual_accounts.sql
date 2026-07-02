create table virtual_accounts (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references customers(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    organization_id uuid references organizations(id) on delete cascade,
    account_ref text unique,
    account_number text unique,
    account_name text,
    bank_name text,
    bank_code text,
    provider text default 'nomba',
    status text default 'active',
    created_at timestamptz default now()
);

create index idx_va_customer on virtual_accounts(customer_id);
create index idx_va_user on virtual_accounts(user_id);
create index idx_va_account_number on virtual_accounts(account_number);
