CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  spent NUMERIC(18,2) NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly','monthly','yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  color TEXT DEFAULT '#EAB308',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_organization_id ON budgets(organization_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own budgets"
  ON budgets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert budgets"
  ON budgets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own budgets"
  ON budgets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own budgets"
  ON budgets FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Org members view org budgets"
  ON budgets FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    is_org_member(organization_id, auth.uid())
  );

CREATE POLICY "Org members insert org budgets"
  ON budgets FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL AND
    is_org_member(organization_id, auth.uid())
  );

CREATE POLICY "Org members update org budgets"
  ON budgets FOR UPDATE
  USING (
    organization_id IS NOT NULL AND
    is_org_member(organization_id, auth.uid())
  );

CREATE POLICY "Org members delete org budgets"
  ON budgets FOR DELETE
  USING (
    organization_id IS NOT NULL AND
    is_org_member(organization_id, auth.uid())
  );
