create table customer_activity (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references customers(id) on delete cascade,
    activity text not null,
    metadata jsonb,
    created_at timestamptz default now()
);

create index idx_ca_customer on customer_activity(customer_id);
