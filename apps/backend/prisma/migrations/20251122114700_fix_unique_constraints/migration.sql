-- Fix unique constraints that were not properly migrated

-- Drop old global unique INDEX on journeys.name (created by init migration as INDEX, not CONSTRAINT)
DROP INDEX IF EXISTS "journeys_name_key";

-- Drop old global unique INDEX on releases.is_unassigned
DROP INDEX IF EXISTS "releases_is_unassigned_key";

-- Create partial unique index for is_unassigned (one Unassigned release per story map)
CREATE UNIQUE INDEX IF NOT EXISTS "releases_story_map_id_unassigned_key"
  ON "releases" ("story_map_id") WHERE "is_unassigned" = true;
