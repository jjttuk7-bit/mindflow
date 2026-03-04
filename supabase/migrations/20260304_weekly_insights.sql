-- Add report_type column to insight_reports for weekly/monthly distinction
ALTER TABLE insight_reports
  ADD COLUMN report_type TEXT NOT NULL DEFAULT 'monthly'
  CHECK (report_type IN ('weekly', 'monthly'));

-- Drop existing unique constraint and replace with one that includes report_type
ALTER TABLE insight_reports
  DROP CONSTRAINT insight_reports_user_id_month_key;

ALTER TABLE insight_reports
  ADD CONSTRAINT insight_reports_user_id_month_report_type_key
  UNIQUE (user_id, month, report_type);

-- Index for efficient filtering by type
CREATE INDEX idx_insight_reports_type
  ON insight_reports(user_id, report_type, month DESC);
