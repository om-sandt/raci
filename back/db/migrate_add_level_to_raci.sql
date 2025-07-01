-- Migration: Add level column to raci_assignments table
-- Description: Adds a level integer column to support hierarchical RACI assignments

-- Add the level column with a default value of 1
ALTER TABLE raci_assignments 
ADD COLUMN level INTEGER DEFAULT 1 NOT NULL;

-- Update any existing records to have level 1 (this is redundant due to DEFAULT but good for clarity)
UPDATE raci_assignments 
SET level = 1 
WHERE level IS NULL;

-- Add a check constraint to ensure level is positive
ALTER TABLE raci_assignments 
ADD CONSTRAINT raci_assignments_level_positive_check CHECK (level > 0);

-- Create an index on level for better query performance when ordering by level
CREATE INDEX idx_raci_assignments_level ON raci_assignments(level);

-- Create a composite index for common queries that filter by event_id and order by level
CREATE INDEX idx_raci_assignments_event_level ON raci_assignments(event_id, level);

-- Migration completed successfully
COMMENT ON COLUMN raci_assignments.level IS 'Hierarchy level for RACI assignment (1=highest, 2=secondary, etc.)'; 