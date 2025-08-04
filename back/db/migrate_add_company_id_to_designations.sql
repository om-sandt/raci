-- Migration to add company_id column to designations table
-- This ensures designations are scoped to specific companies

-- Add company_id column to designations table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'designations' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE designations ADD COLUMN company_id INT;
  END IF;
END $$;

-- Add company_id column to locations table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'locations' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE locations ADD COLUMN company_id INT;
  END IF;
END $$;

-- Add company_id column to divisions table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'divisions' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE divisions ADD COLUMN company_id INT;
  END IF;
END $$; 