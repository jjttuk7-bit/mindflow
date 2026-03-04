-- Migration: Add last_accessed_at to items table for staleness tracking
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Index for efficient "unread" queries (NULL last_accessed_at)
CREATE INDEX IF NOT EXISTS idx_items_last_accessed_at ON items (user_id, last_accessed_at)
WHERE last_accessed_at IS NULL;
