-- Migration script to add company deletion requests table
-- Run this script to add the company deletion approval system

-- Create company deletion requests table
CREATE TABLE IF NOT EXISTS company_deletion_requests (
  request_id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
  requested_by INT REFERENCES website_admins(admin_id) ON DELETE SET NULL,
  approver_id INT REFERENCES website_admins(admin_id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reason TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_deletion_requests_approver ON company_deletion_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_company_deletion_requests_status ON company_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_company_deletion_requests_company ON company_deletion_requests(company_id); 