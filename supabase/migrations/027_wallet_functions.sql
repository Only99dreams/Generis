create or replace function credit_wallet(
    p_user_id uuid,
    p_amount numeric
)
returns void
language plpgsql
as $$
begin
    update wallets
    set available_balance = available_balance + p_amount,
        ledger_balance = ledger_balance + p_amount
    where user_id = p_user_id;
end;
$$;

create or replace function debit_wallet(
    p_user_id uuid,
    p_amount numeric
)
returns boolean
language plpgsql
as $$
declare
    current_balance numeric;
begin
    select available_balance into current_balance
    from wallets
    where user_id = p_user_id;

    if current_balance < p_amount then
        return false;
    end if;

    update wallets
    set available_balance = available_balance - p_amount
    where user_id = p_user_id;

    return true;
end;
$$;

create or replace function create_organization_wallet()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into wallets(organization_id, user_id)
    values(new.id, new.owner_id);

    return new;
end;
$$;

drop trigger if exists trg_create_org_wallet on organizations;
create trigger trg_create_org_wallet
    after insert on organizations
    for each row
    execute procedure create_organization_wallet();
