-- Create wallets for existing users who don't have one
-- (the handle_new_user trigger now creates wallets for new signups)
insert into public.wallets(user_id)
select p.id
from public.profiles p
left join public.wallets w on w.user_id = p.id
where w.id is null;
