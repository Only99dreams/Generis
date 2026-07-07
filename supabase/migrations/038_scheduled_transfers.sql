CREATE TABLE scheduled_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  beneficiary_name TEXT NOT NULL,
  beneficiary_account TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  narration TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','once')),
  interval_day INTEGER,
  interval_weekday INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_run TIMESTAMPTZ NOT NULL,
  last_run TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','completed')),
  total_executions INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scheduled_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_transfer_id UUID NOT NULL REFERENCES scheduled_transfers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success','failed')),
  amount NUMERIC(18,2) NOT NULL,
  reference TEXT,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_transfers_next_run ON scheduled_transfers(next_run);
CREATE INDEX idx_scheduled_transfers_user_id ON scheduled_transfers(user_id);
CREATE INDEX idx_scheduled_transfers_status ON scheduled_transfers(status);
CREATE INDEX idx_scheduled_logs_transfer_id ON scheduled_transfer_logs(scheduled_transfer_id);

ALTER TABLE scheduled_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_transfer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own scheduled transfers"
  ON scheduled_transfers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert scheduled transfers"
  ON scheduled_transfers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own scheduled transfers"
  ON scheduled_transfers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own scheduled transfers"
  ON scheduled_transfers FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users view own transfer logs"
  ON scheduled_transfer_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_transfers st
      WHERE st.id = scheduled_transfer_id AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can read all scheduled transfers"
  ON scheduled_transfers FOR SELECT
  USING (true);
