-- Fix: customer_activity has no INSERT policy, so RLS blocks inserts.
-- The createCustomer flow logs to customer_activity but it silently fails.

drop policy if exists "customer_activity_insert" on customer_activity;
create policy "customer_activity_insert" on customer_activity
  for insert with check (
    auth.uid() is not null
  );

drop policy if exists "customer_activity_view" on customer_activity;
create policy "customer_activity_view" on customer_activity
  for select using (
    exists (
      select 1 from customers
      where customers.id = customer_activity.customer_id
        and (
          customers.organization_id is null
          or public.is_org_member(customers.organization_id, auth.uid())
        )
    )
  );
