create table receipts (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid references payments(id) on delete cascade,
    receipt_number text unique,
    pdf_url text,
    created_at timestamptz default now()
);
