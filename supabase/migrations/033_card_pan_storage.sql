alter table saved_cards add column if not exists pan text;
alter table saved_cards add column if not exists cvv text;
alter table saved_cards add column if not exists wallet_id uuid references wallets(id) on delete cascade;

alter table saved_cards enable row level security;

drop policy if exists "users_view_own_cards" on saved_cards;
create policy "users_view_own_cards" on saved_cards
    for select using (auth.uid() = user_id);

drop policy if exists "users_insert_own_cards" on saved_cards;
create policy "users_insert_own_cards" on saved_cards
    for insert with check (auth.uid() = user_id);

drop policy if exists "users_update_own_cards" on saved_cards;
create policy "users_update_own_cards" on saved_cards
    for update using (auth.uid() = user_id);

drop policy if exists "users_delete_own_cards" on saved_cards;
create policy "users_delete_own_cards" on saved_cards
    for delete using (auth.uid() = user_id);
