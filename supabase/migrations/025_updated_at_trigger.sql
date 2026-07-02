create or replace function update_timestamp()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_profiles_updated
    before update on profiles
    for each row
    execute procedure update_timestamp();

create trigger trg_organizations_updated
    before update on organizations
    for each row
    execute procedure update_timestamp();

create trigger trg_customers_updated
    before update on customers
    for each row
    execute procedure update_timestamp();

create trigger trg_wallets_updated
    before update on wallets
    for each row
    execute procedure update_timestamp();

create trigger trg_invoices_updated
    before update on invoices
    for each row
    execute procedure update_timestamp();
