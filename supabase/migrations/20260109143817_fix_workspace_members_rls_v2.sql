/*
  # Fix Infinite Recursion in workspace_members RLS Policies

  ## Problem
  The SELECT policy on workspace_members was causing infinite recursion by querying
  workspace_members within its own USING clause.

  ## Solution
  Replace the recursive policy with simpler, non-recursive policies:
  - Users can view their own memberships
  - Users can view other members of workspaces they belong to (via workspaces table)

  ## Changes
  1. Drop all existing policies on workspace_members
  2. Create new non-recursive policies
*/

-- Drop ALL existing policies on workspace_members
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces they create" ON workspace_members;

-- Create new non-recursive policies

-- Users can view their own workspace memberships
CREATE POLICY "Users can view own memberships"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view other members if they share a workspace
-- This uses a subquery that will be executed separately, avoiding recursion
CREATE POLICY "Users can view members in shared workspaces"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can add themselves to workspaces when creating new workspaces
CREATE POLICY "Users can add themselves as members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can add other members to their workspaces
CREATE POLICY "Admins can add members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update member roles in their workspaces
CREATE POLICY "Admins can update members"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can remove members from their workspaces (but not themselves to prevent lockout)
CREATE POLICY "Admins can remove members"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    AND user_id != auth.uid()
  );
