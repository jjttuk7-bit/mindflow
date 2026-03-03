-- Add soft-delete support (trash) to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficiently querying trashed items
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at) WHERE deleted_at IS NOT NULL;
