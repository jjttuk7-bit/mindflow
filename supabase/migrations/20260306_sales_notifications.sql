-- ============================================
-- DotLine Sales: Notification Rules & Alerts
-- Phase 3 - Follow-up Notification Engine
-- ============================================

-- 1. Notification Rules (알림 규칙)
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'no_contact',        -- 연락 없음 경고
    'follow_up_due',     -- 후속조치 기한
    'deal_deadline',     -- 딜 마감일
    'relationship_cool', -- 관계 냉각 경고
    'renewal',           -- 갱신/계약 만료
    'custom'             -- 사용자 정의
  )),
  title TEXT NOT NULL,
  description TEXT,
  trigger_days INT DEFAULT 7,      -- N일 후/전 트리거
  repeat_interval_days INT,        -- 반복 주기 (null = 1회)
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_rules_user_id ON notification_rules(user_id);
CREATE INDEX idx_notification_rules_type ON notification_rules(type);
CREATE INDEX idx_notification_rules_active ON notification_rules(is_active) WHERE is_active = true;

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification_rules" ON notification_rules
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (
    customer_id IS NULL OR EXISTS (
      SELECT 1 FROM customers WHERE customers.id = customer_id AND customers.user_id = auth.uid()
    )
  ));

-- 2. Alerts (발생한 알림)
CREATE TABLE IF NOT EXISTS sales_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('unread', 'read', 'dismissed', 'actioned')) DEFAULT 'unread',
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sales_alerts_user_id ON sales_alerts(user_id);
CREATE INDEX idx_sales_alerts_status ON sales_alerts(status);
CREATE INDEX idx_sales_alerts_created_at ON sales_alerts(created_at DESC);

ALTER TABLE sales_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sales_alerts" ON sales_alerts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (
    customer_id IS NULL OR EXISTS (
      SELECT 1 FROM customers WHERE customers.id = customer_id AND customers.user_id = auth.uid()
    )
  ));
