-- Migration to add division field to users and events tables
-- Run this after updating the Prisma schema

-- Add division column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS division VARCHAR(255);

-- Add division column to events table  
ALTER TABLE events ADD COLUMN IF NOT EXISTS division VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN users.division IS 'Division or business unit of the user';
COMMENT ON COLUMN events.division IS 'Division or business unit associated with the event'; 