create table processed_events (
    request_id text primary key,
    processed_at timestamptz default now()
);
