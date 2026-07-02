drop policy if exists "va_public_read" on virtual_accounts;
create policy "va_public_read" on virtual_accounts
    for select using (true);
