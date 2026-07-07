CREATE TABLE sub_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(18,2),
  current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#EAB308',
  icon TEXT NOT NULL DEFAULT 'Target',
  goal_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE savings_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sub_wallet_id UUID NOT NULL REFERENCES sub_wallets(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  next_run TIMESTAMPTZ NOT NULL,
  last_run TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','completed')),
  total_saved NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_executions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_wallets_user_id ON sub_wallets(user_id);
CREATE INDEX idx_sub_wallets_status ON sub_wallets(status);
CREATE INDEX idx_savings_plans_next_run ON savings_plans(next_run);
CREATE INDEX idx_savings_plans_sub_wallet_id ON savings_plans(sub_wallet_id);

ALTER TABLE sub_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sub wallets"
  ON sub_wallets FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert sub wallets"
  ON sub_wallets FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own sub wallets"
  ON sub_wallets FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users delete own sub wallets"
  ON sub_wallets FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users view own savings plans"
  ON savings_plans FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert savings plans"
  ON savings_plans FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own savings plans"
  ON savings_plans FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users delete own savings plans"
  ON savings_plans FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Service role read all savings plans"
  ON savings_plans FOR SELECT USING (true);
