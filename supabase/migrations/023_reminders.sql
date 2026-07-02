create table reminders (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    customer_id uuid references customers(id) on delete cascade,
    invoice_id uuid references invoices(id) on delete cascade,
    reminder_type text not null,
    status text default 'pending',
    sent_at timestamptz,
    created_at timestamptz default now()
);

create index idx_reminder_org on reminders(organization_id);
create index idx_reminder_customer on reminders(customer_id);
