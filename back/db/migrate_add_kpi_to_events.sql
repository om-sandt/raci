-- Migration: Add KPI column to events table
-- Date: 2024-01-XX

-- Add KPI column to events table
ALTER TABLE events ADD COLUMN kpi TEXT;

-- Add comment to the column
COMMENT ON COLUMN events.kpi IS 'Key Performance Indicators for the event'; 