-- Cleanup Migration: Ensure organization_settings has no duplicates
-- Created: 2026-01-03
-- Purpose: Cleanup any duplicate organization_settings rows and ensure unique constraint

-- Step 1: Delete duplicate organization_settings (keep most recent by updated_at)
DELETE FROM organization_settings 
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id 
  FROM organization_settings 
  ORDER BY organization_id, updated_at DESC NULLS LAST, id DESC
);

-- Step 2: Verify unique constraint exists (if not, add it)
-- Note: The constraint should already exist from schema, but this is idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_settings_organization_id_unique'
  ) THEN
    ALTER TABLE organization_settings 
    ADD CONSTRAINT organization_settings_organization_id_unique 
    UNIQUE (organization_id);
  END IF;
END $$;
