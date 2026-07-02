create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles(id, email, full_name)
    values(new.id, new.email, new.raw_user_meta_data ->> 'full_name');

    insert into public.wallets(user_id)
    values(new.id);

    return new;
exception when others then
    raise log 'Error in handle_new_user: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure handle_new_user();
