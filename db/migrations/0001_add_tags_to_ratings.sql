-- Migration: 0001_add_tags_to_ratings.sql
-- Purpose: Ensure `tags` column exists on `ratings` table (JSONB) and add a GIN index for fast filtering

BEGIN;

-- Add tags column as JSONB (flexible) if it doesn't exist
ALTER TABLE IF EXISTS ratings
  ADD COLUMN IF NOT EXISTS tags JSONB;

-- Add index for tags for faster contains queries (e.g., tags @> '"Casual"')
CREATE INDEX IF NOT EXISTS idx_ratings_tags_gin ON ratings USING GIN (tags);

COMMIT;
