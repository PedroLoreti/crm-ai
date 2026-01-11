/*
  # Fix Infinite Recursion - Final Solution

  ## Problem
  Even the v2 fix still had recursion because SELECT policies were querying
  workspace_members within workspace_members policies.

  ## Solution
  Use a security definer function to break the recursion chain.
  The function runs with elevated privileges and doesn't trigger RLS.

  ## Changes
  1. Drop all existing SELECT policies on workspace_members
  2. Create a security definer function to check workspace membership
  3. Create new policies using the function
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members in shared workspaces" ON workspace_members;

-- Create a security definer function to check if user is member of workspace
-- This function bypasses RLS, breaking the recursion
CREATE OR REPLACE FUNCTION user_is_workspace_member(workspace_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = user_uuid
  );
$$;

-- Users can view memberships in workspaces they belong to
-- Using the security definer function avoids recursion
CREATE POLICY "Users can view workspace memberships"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (
    user_is_workspace_member(workspace_id, auth.uid())
  );
