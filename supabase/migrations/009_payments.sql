create table payments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    customer_id uuid references customers(id) on delete cascade,
    invoice_id uuid references invoices(id) on delete set null,
    amount numeric(18,2),
    reference text unique,
    payment_channel text,
    payment_status text default 'pending',
    paid_at timestamptz,
    created_at timestamptz default now()
);

create index idx_payment_reference on payments(reference);
create index idx_payment_customer on payments(customer_id);
create index idx_payment_invoice on payments(invoice_id);
