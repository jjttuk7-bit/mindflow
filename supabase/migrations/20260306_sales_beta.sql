-- ============================================
-- DotLine Sales: Beta Signups
-- Phase 5 - Launch
-- ============================================

CREATE TABLE IF NOT EXISTS beta_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'sales_landing',
  status TEXT CHECK (status IN ('pending', 'invited', 'active')) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_beta_signups_email ON beta_signups(email);
CREATE INDEX idx_beta_signups_status ON beta_signups(status);

-- Allow anyone to insert (public signup), but only service role can read
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can signup for beta" ON beta_signups
  FOR INSERT WITH CHECK (true);
