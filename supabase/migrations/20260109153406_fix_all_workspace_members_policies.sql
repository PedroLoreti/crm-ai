/*
  # Fix All Workspace Members Policies

  ## Problem
  ALL policies on workspace_members were querying workspace_members itself,
  causing infinite recursion. Even the SELECT policy fix wasn't enough because
  INSERT/UPDATE/DELETE policies also query the table.

  ## Solution
  Create security definer functions for all membership checks to break the
  recursion chain completely.

  ## Changes
  1. Create helper function to check if user is admin
  2. Recreate all policies using security definer functions
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Users can add themselves as members" ON workspace_members;

-- Create security definer function to check if user is admin of workspace
CREATE OR REPLACE FUNCTION user_is_workspace_admin(workspace_uuid uuid, user_uuid uuid)
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
    AND role = 'admin'
  );
$$;

-- Recreate INSERT policy for admins
CREATE POLICY "Admins can add members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_workspace_admin(workspace_id, auth.uid())
  );

-- Recreate INSERT policy for self
CREATE POLICY "Users can add themselves as members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Recreate UPDATE policy
CREATE POLICY "Admins can update members"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (
    user_is_workspace_admin(workspace_id, auth.uid())
  )
  WITH CHECK (
    user_is_workspace_admin(workspace_id, auth.uid())
  );

-- Recreate DELETE policy
CREATE POLICY "Admins can remove members"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (
    user_is_workspace_admin(workspace_id, auth.uid())
    AND user_id != auth.uid()
  );
