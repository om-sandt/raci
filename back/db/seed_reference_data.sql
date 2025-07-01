-- Seed script for reference data (designations and locations)
-- Run this script to populate initial data for dropdown options

-- Insert default designations
INSERT INTO designations (name) VALUES 
  ('Software Engineer'),
  ('Senior Software Engineer'),
  ('Team Lead'),
  ('Project Manager'),
  ('Product Manager'),
  ('QA Engineer'),
  ('DevOps Engineer'),
  ('Business Analyst'),
  ('UI/UX Designer'),
  ('Data Analyst'),
  ('Scrum Master'),
  ('Technical Architect'),
  ('Department Head'),
  ('Vice President'),
  ('Director')
ON CONFLICT DO NOTHING;

-- Insert default locations
INSERT INTO locations (name) VALUES 
  ('New York, USA'),
  ('San Francisco, USA'),
  ('London, UK'),
  ('Mumbai, India'),
  ('Bangalore, India'),
  ('Toronto, Canada'),
  ('Sydney, Australia'),
  ('Berlin, Germany'),
  ('Tokyo, Japan'),
  ('Singapore'),
  ('Dubai, UAE'),
  ('Remote')
ON CONFLICT DO NOTHING;

-- Verification queries (optional - for checking the data)
-- SELECT COUNT(*) as designation_count FROM designations;
-- SELECT COUNT(*) as location_count FROM locations; 