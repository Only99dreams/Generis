create table invoices (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    customer_id uuid references customers(id) on delete cascade,
    invoice_number text unique,
    description text,
    amount numeric(18,2),
    amount_paid numeric(18,2) default 0,
    due_date date,
    status text default 'pending',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_invoice_org on invoices(organization_id);
create index idx_invoice_customer on invoices(customer_id);
create index idx_invoice_status on invoices(status);
