-- Migration to add new fields to departments table
-- This adds Department Size, Location, Division, and Function fields

-- Add department_size column to departments table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'departments' 
    AND column_name = 'department_size'
  ) THEN
    ALTER TABLE departments ADD COLUMN department_size TEXT;
  END IF;
END $$;

-- Add location column to departments table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'departments' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE departments ADD COLUMN location TEXT;
  END IF;
END $$;

-- Add division column to departments table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'departments' 
    AND column_name = 'division'
  ) THEN
    ALTER TABLE departments ADD COLUMN division TEXT;
  END IF;
END $$;

-- Add function column to departments table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'departments' 
    AND column_name = 'function'
  ) THEN
    ALTER TABLE departments ADD COLUMN function TEXT;
  END IF;
END $$; 