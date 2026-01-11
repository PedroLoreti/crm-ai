/*
  # Add Function to Get Workspace Members with Email
  
  ## Overview
  Creates a function to retrieve workspace members along with their email addresses
  
  ## Changes
  1. Create function `get_workspace_members_with_email`
     - Returns workspace members with user email
     - Joins with auth.users table
     - Security definer to access auth.users
  
  ## Notes
  - Function is secure and only returns members from specified workspace
  - Email is useful for displaying member information in UI
*/

CREATE OR REPLACE FUNCTION get_workspace_members_with_email(workspace_uuid uuid)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  user_email text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    wm.id,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.created_at,
    au.email as user_email
  FROM workspace_members wm
  LEFT JOIN auth.users au ON au.id = wm.user_id
  WHERE wm.workspace_id = workspace_uuid;
$$;
