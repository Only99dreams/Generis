-- Fix: organization_users has no INSERT policy, so RLS blocks every insert.
-- The createOrganization flow inserts a row into organization_users but it
-- silently fails. This caused is_org_member() to return false for every org,
-- which broke every org-scoped RLS policy.
--
-- Allowed actors:
--   - the org owner (inserting their own membership at creation time)
--   - any existing member with role = 'admin' or 'owner' (inviting others)

drop policy if exists "org_users_insert_owner" on organization_users;
create policy "org_users_insert_owner" on organization_users
  for insert with check (
    -- The org owner can insert themselves during org creation
    user_id = auth.uid()
    and
    exists (select 1 from organizations where id = organization_users.organization_id and owner_id = auth.uid())
  );

drop policy if exists "org_users_insert_admin" on organization_users;
create policy "org_users_insert_admin" on organization_users
  for insert with check (
    -- An existing admin/owner can invite new members
    exists (
      select 1 from organization_users ou
      where ou.organization_id = organization_users.organization_id
        and ou.user_id = auth.uid()
        and ou.role in ('admin', 'owner')
    )
  );
