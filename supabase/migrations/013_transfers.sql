create table transfers (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    beneficiary_name text,
    beneficiary_account text,
    bank_code text,
    bank_name text,
    amount numeric(18,2),
    reference text unique,
    transfer_status text default 'pending',
    provider_reference text,
    narration text,
    created_at timestamptz default now()
);

create index idx_transfer_user on transfers(user_id);
create index idx_transfer_org on transfers(organization_id);
create index idx_transfer_reference on transfers(reference);
