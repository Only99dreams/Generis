-- Fix infinite recursion in org_users_view policy.
-- The previous policy queried organization_users inside a subquery on
-- organization_users, causing RLS to loop infinitely.
--
-- Create a security definer helper so the membership check bypasses RLS.

create or replace function public.is_org_member(org_id uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_users
    where organization_id = org_id and user_id = uid
  );
$$;

drop policy if exists "org_users_view" on organization_users;

create policy "org_users_view" on organization_users
  for select using (
    user_id = auth.uid() or
    public.is_org_member(organization_id, auth.uid())
  );
