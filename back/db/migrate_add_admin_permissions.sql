-- Migration script to add admin permissions system
-- Run this script to add the can_create_admins column to existing databases

-- Add can_create_admins column to website_admins table
ALTER TABLE website_admins ADD COLUMN IF NOT EXISTS can_create_admins BOOLEAN DEFAULT FALSE;

-- Set omvataliya23@gmail.com as the main admin with all permissions
UPDATE website_admins SET can_create_admins = TRUE WHERE email = 'omvataliya23@gmail.com'; 