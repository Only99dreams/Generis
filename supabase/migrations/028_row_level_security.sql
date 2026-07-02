alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_users enable row level security;
alter table customers enable row level security;
alter table virtual_accounts enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table transfers enable row level security;
alter table beneficiaries enable row level security;
alter table notifications enable row level security;
alter table ledger_entries enable row level security;
alter table receipts enable row level security;
alter table audit_logs enable row level security;
alter table security_events enable row level security;
alter table customer_activity enable row level security;
alter table reconciliation_logs enable row level security;
alter table ai_insights enable row level security;
alter table forecasts enable row level security;
alter table reminders enable row level security;
alter table notification_channels enable row level security;

-- Profiles: users can view/edit their own
drop policy if exists "users_view_own_profile" on profiles;
create policy "users_view_own_profile" on profiles
    for select using (auth.uid() = id);
drop policy if exists "users_update_own_profile" on profiles;
create policy "users_update_own_profile" on profiles
    for update using (auth.uid() = id);

-- Organizations: owner and members can view
drop policy if exists "org_view_member" on organizations;
create policy "org_view_member" on organizations
    for select using (
        auth.uid() = owner_id or
        exists (select 1 from organization_users where organization_id = id and user_id = auth.uid())
    );
drop policy if exists "org_update_owner" on organizations;
create policy "org_update_owner" on organizations
    for update using (auth.uid() = owner_id);
drop policy if exists "org_insert_owner" on organizations;
create policy "org_insert_owner" on organizations
    for insert with check (auth.uid() = owner_id);

-- Organization users: members can view
-- Uses a security definer helper to avoid infinite recursion
-- (querying organization_users inside its own policy triggers RLS loops)
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

-- Customers: org-scoped
drop policy if exists "customers_view" on customers;
create policy "customers_view" on customers
    for select using (
        exists (select 1 from organization_users where organization_id = customers.organization_id and user_id = auth.uid())
    );
drop policy if exists "customers_insert" on customers;
create policy "customers_insert" on customers
    for insert with check (
        exists (select 1 from organization_users where organization_id = customers.organization_id and user_id = auth.uid())
    );
drop policy if exists "customers_update" on customers;
create policy "customers_update" on customers
    for update using (
        exists (select 1 from organization_users where organization_id = customers.organization_id and user_id = auth.uid())
    );

-- Virtual accounts: org-scoped, plus public read for payment links
drop policy if exists "va_view" on virtual_accounts;
create policy "va_view" on virtual_accounts
    for select using (
        exists (select 1 from organization_users where organization_id = virtual_accounts.organization_id and user_id = auth.uid())
    );

drop policy if exists "va_public_read" on virtual_accounts;
create policy "va_public_read" on virtual_accounts
    for select using (true);

-- Invoices: org-scoped
drop policy if exists "invoices_view" on invoices;
create policy "invoices_view" on invoices
    for select using (
        exists (select 1 from organization_users where organization_id = invoices.organization_id and user_id = auth.uid())
    );
drop policy if exists "invoices_insert" on invoices;
create policy "invoices_insert" on invoices
    for insert with check (
        exists (select 1 from organization_users where organization_id = invoices.organization_id and user_id = auth.uid())
    );
drop policy if exists "invoices_update" on invoices;
create policy "invoices_update" on invoices
    for update using (
        exists (select 1 from organization_users where organization_id = invoices.organization_id and user_id = auth.uid())
    );

-- Payments: org-scoped
drop policy if exists "payments_view" on payments;
create policy "payments_view" on payments
    for select using (
        exists (select 1 from organization_users where organization_id = payments.organization_id and user_id = auth.uid())
    );

-- Wallets: user owns
drop policy if exists "wallets_view_own" on wallets;
create policy "wallets_view_own" on wallets
    for select using (auth.uid() = user_id);
drop policy if exists "wallets_update_own" on wallets;
create policy "wallets_update_own" on wallets
    for update using (auth.uid() = user_id);

-- Transactions: user or org
drop policy if exists "tx_view" on transactions;
create policy "tx_view" on transactions
    for select using (
        auth.uid() = user_id or
        exists (select 1 from organization_users where organization_id = transactions.organization_id and user_id = auth.uid())
    );

-- Transfers: user or org
drop policy if exists "transfers_view" on transfers;
create policy "transfers_view" on transfers
    for select using (
        auth.uid() = user_id or
        exists (select 1 from organization_users where organization_id = transfers.organization_id and user_id = auth.uid())
    );

-- Beneficiaries: user or org
drop policy if exists "beneficiaries_view" on beneficiaries;
create policy "beneficiaries_view" on beneficiaries
    for select using (
        auth.uid() = user_id or
        exists (select 1 from organization_users where organization_id = beneficiaries.organization_id and user_id = auth.uid())
    );

-- Notifications: user
drop policy if exists "notifications_view" on notifications;
create policy "notifications_view" on notifications
    for select using (auth.uid() = user_id);
drop policy if exists "notifications_update" on notifications;
create policy "notifications_update" on notifications
    for update using (auth.uid() = user_id);

-- Ledger entries: user or org
drop policy if exists "ledger_view" on ledger_entries;
create policy "ledger_view" on ledger_entries
    for select using (
        auth.uid() = user_id or
        exists (select 1 from organization_users ou join wallets w on w.id = ledger_entries.wallet_id where w.organization_id = ou.organization_id and ou.user_id = auth.uid())
    );
