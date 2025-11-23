-- Add missing audit columns to personas and tags tables
-- Also remove incorrect global unique constraint on tags.name

-- Fix personas table
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_by text;

-- Fix tags table
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_by text;

-- Remove incorrect global unique constraint on tags.name
-- Tags should only be unique per workspace (story_map_id + name)
DROP INDEX IF EXISTS tags_name_key;
