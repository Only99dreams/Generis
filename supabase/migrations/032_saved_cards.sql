create table saved_cards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade not null,
    card_brand text not null,
    last4 text not null,
    exp_month text not null,
    exp_year text not null,
    card_type text not null default 'debit',
    provider_ref text unique not null,
    is_default boolean default false,
    created_at timestamptz default now()
);

create index idx_saved_cards_user on saved_cards(user_id);
