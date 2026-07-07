CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  virtual_account_id UUID REFERENCES virtual_accounts(id),
  amount NUMERIC(18,2),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','expired','cancelled')),
  expires_at TIMESTAMPTZ,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_links_reference ON payment_links(reference);
CREATE INDEX idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX idx_payment_links_organization_id ON payment_links(organization_id);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment links"
  ON payment_links FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members view payment links"
  ON payment_links FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    is_org_member(organization_id, auth.uid())
  );

CREATE POLICY "Users insert payment links"
  ON payment_links FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org members insert payment links"
  ON payment_links FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL AND
    is_org_member(organization_id, auth.uid())
  );

CREATE POLICY "Public read active payment links"
  ON payment_links FOR SELECT
  USING (status = 'active');

CREATE POLICY "Anyone can update payment link status"
  ON payment_links FOR UPDATE
  USING (true)
  WITH CHECK (true);
