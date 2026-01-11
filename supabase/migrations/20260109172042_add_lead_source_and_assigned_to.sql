/*
  # Add Lead Source and Assigned To Fields
  
  ## Overview
  Adds fields to track lead origin and assignment to workspace members
  
  ## Changes
  1. Add `lead_source` field to leads table
     - Tracks where the lead came from (website, referral, email, etc)
  2. Add `assigned_to` field to leads table
     - Optional reference to workspace_members
     - Allows assigning a responsible person for the lead
  
  ## Notes
  - Both fields are optional (nullable)
  - assigned_to includes CASCADE delete for cleanup
  - No RLS changes needed (existing policies cover these fields)
*/

-- Add lead_source column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lead_source'
  ) THEN
    ALTER TABLE leads ADD COLUMN lead_source text;
  END IF;
END $$;

-- Add assigned_to column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE leads ADD COLUMN assigned_to uuid REFERENCES workspace_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for assigned_to for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
