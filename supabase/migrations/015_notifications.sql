create table notifications (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    title text not null,
    message text not null,
    is_read boolean default false,
    created_at timestamptz default now()
);

create index idx_notif_user on notifications(user_id);
create index idx_notif_read on notifications(is_read);
