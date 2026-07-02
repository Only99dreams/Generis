create table beneficiaries (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    account_name text,
    account_number text,
    bank_code text,
    bank_name text,
    created_at timestamptz default now()
);

create index idx_beneficiary_user on beneficiaries(user_id);
