-- Fix customers RLS policy to use security-definer helper.
-- The previous policy queried organization_users directly, which could
-- fail when RLS on organization_users filtered out the result.
-- is_org_member is security definer and bypasses RLS.

drop policy if exists "customers_insert" on customers;
create policy "customers_insert" on customers
  for insert with check (
    public.is_org_member(organization_id, auth.uid())
  );

drop policy if exists "customers_view" on customers;
create policy "customers_view" on customers
  for select using (
    public.is_org_member(organization_id, auth.uid())
  );
