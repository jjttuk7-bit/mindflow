CREATE TABLE IF NOT EXISTS nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('connection', 'resurface', 'trend', 'action')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_item_ids UUID[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nudges"
  ON nudges FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own nudges"
  ON nudges FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service can insert nudges"
  ON nudges FOR INSERT WITH CHECK (true);

CREATE INDEX idx_nudges_user_unread ON nudges(user_id, is_read) WHERE NOT is_read;
