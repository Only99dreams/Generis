CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  saved_card_id UUID NOT NULL REFERENCES saved_cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  description TEXT,
  next_billing_date TIMESTAMPTZ NOT NULL,
  last_billing_date TIMESTAMPTZ,
  billing_day INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','expired')),
  total_charges INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success','failed')),
  amount NUMERIC(18,2) NOT NULL,
  reference TEXT,
  error_message TEXT,
  charged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscription_logs_sub_id ON subscription_logs(subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own subscriptions"
  ON subscriptions FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users view own subscription logs"
  ON subscription_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = subscription_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can read all subscriptions"
  ON subscriptions FOR SELECT
  USING (true);
