-- ============================================================================
-- PHASE 1: CREATE STORY_MAPS TABLE
-- ============================================================================

-- CreateTable
CREATE TABLE "story_maps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "story_maps_pkey" PRIMARY KEY ("id")
);

-- Create default StoryMap for existing data
INSERT INTO "story_maps" (id, name, description, created_by, updated_at)
VALUES ('default-story-map', 'Default Workspace', 'Migrated from pre-workspace data', 'system', NOW());

-- ============================================================================
-- PHASE 2: UPDATE JOURNEYS TABLE
-- ============================================================================

-- Drop old unique constraint BEFORE adding story_map_id
ALTER TABLE "journeys" DROP CONSTRAINT IF EXISTS "journeys_name_key";

-- Drop old index BEFORE creating composite index
DROP INDEX IF EXISTS "idx_journeys_sort";

-- Add story_map_id column (nullable initially)
ALTER TABLE "journeys" ADD COLUMN "story_map_id" TEXT;

-- Populate story_map_id for existing journeys
UPDATE "journeys" SET "story_map_id" = 'default-story-map' WHERE "story_map_id" IS NULL;

-- Make story_map_id NOT NULL after population
ALTER TABLE "journeys" ALTER COLUMN "story_map_id" SET NOT NULL;

-- Add composite unique constraint (unique within story map)
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_story_map_id_name_key"
  UNIQUE ("story_map_id", "name");

-- Create composite index
CREATE INDEX "idx_journeys_map_sort" ON "journeys"("story_map_id", "sort_order");

-- Add foreign key constraint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_story_map_id_fkey"
  FOREIGN KEY ("story_map_id") REFERENCES "story_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 3: UPDATE RELEASES TABLE
-- ============================================================================

-- Drop old index
DROP INDEX IF EXISTS "idx_releases_sort";

-- Add story_map_id column (nullable initially)
ALTER TABLE "releases" ADD COLUMN "story_map_id" TEXT;

-- Update existing Unassigned release (if it exists)
UPDATE "releases"
SET "story_map_id" = 'default-story-map'
WHERE "is_unassigned" = true AND "story_map_id" IS NULL;

-- Populate story_map_id for other existing releases
UPDATE "releases"
SET "story_map_id" = 'default-story-map'
WHERE "story_map_id" IS NULL;

-- Create Unassigned release if none exists
INSERT INTO "releases" (id, story_map_id, name, description, is_unassigned, sort_order, shipped, created_by, updated_at)
SELECT
  gen_random_uuid(),
  'default-story-map',
  'Unassigned',
  'Default release for unassigned stories',
  true,
  0,
  false,
  'system',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "releases" WHERE "story_map_id" = 'default-story-map' AND "is_unassigned" = true
);

-- Make story_map_id NOT NULL after population
ALTER TABLE "releases" ALTER COLUMN "story_map_id" SET NOT NULL;

-- Create composite index
CREATE INDEX "idx_releases_map_sort" ON "releases"("story_map_id", "sort_order");

-- Add foreign key constraint
ALTER TABLE "releases" ADD CONSTRAINT "releases_story_map_id_fkey"
  FOREIGN KEY ("story_map_id") REFERENCES "story_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 4: UPDATE TAGS TABLE
-- ============================================================================

-- Drop old unique constraint
ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_name_key";

-- Add story_map_id column (nullable initially)
ALTER TABLE "tags" ADD COLUMN "story_map_id" TEXT;

-- Populate story_map_id for existing tags
UPDATE "tags" SET "story_map_id" = 'default-story-map' WHERE "story_map_id" IS NULL;

-- Make story_map_id NOT NULL after population
ALTER TABLE "tags" ALTER COLUMN "story_map_id" SET NOT NULL;

-- Add composite unique constraint (unique within story map)
ALTER TABLE "tags" ADD CONSTRAINT "tags_story_map_id_name_key"
  UNIQUE ("story_map_id", "name");

-- Add foreign key constraint
ALTER TABLE "tags" ADD CONSTRAINT "tags_story_map_id_fkey"
  FOREIGN KEY ("story_map_id") REFERENCES "story_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 5: UPDATE PERSONAS TABLE
-- ============================================================================

-- Drop old unique constraint
ALTER TABLE "personas" DROP CONSTRAINT IF EXISTS "personas_name_key";

-- Add story_map_id column (nullable initially)
ALTER TABLE "personas" ADD COLUMN "story_map_id" TEXT;

-- Populate story_map_id for existing personas
UPDATE "personas" SET "story_map_id" = 'default-story-map' WHERE "story_map_id" IS NULL;

-- Make story_map_id NOT NULL after population
ALTER TABLE "personas" ALTER COLUMN "story_map_id" SET NOT NULL;

-- Add composite unique constraint (unique within story map)
ALTER TABLE "personas" ADD CONSTRAINT "personas_story_map_id_name_key"
  UNIQUE ("story_map_id", "name");

-- Add foreign key constraint
ALTER TABLE "personas" ADD CONSTRAINT "personas_story_map_id_fkey"
  FOREIGN KEY ("story_map_id") REFERENCES "story_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
