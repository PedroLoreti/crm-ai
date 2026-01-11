/*
  # Fix Workspace Creation Flow
  
  ## Problem
  When creating a workspace during signup:
  1. INSERT workspace succeeds
  2. SELECT workspace fails (user is not a member yet)
  3. Never reaches adding user as member
  
  ## Solution
  Create a function that atomically:
  - Creates the workspace
  - Adds the user as admin member
  - Creates default pipeline stages
  - Returns the workspace
  
  ## Changes
  1. Create `create_workspace_with_member` function
  2. Function handles all operations in a single transaction
*/

-- Create function to create workspace and add user as admin
CREATE OR REPLACE FUNCTION create_workspace_with_member(
  workspace_name text,
  user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_workspace workspaces;
  result json;
BEGIN
  -- Insert workspace
  INSERT INTO workspaces (name)
  VALUES (workspace_name)
  RETURNING * INTO new_workspace;
  
  -- Add user as admin member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace.id, user_id, 'admin');
  
  -- Create default pipeline stages
  INSERT INTO pipeline_stages (workspace_id, name, color, position)
  VALUES
    (new_workspace.id, 'Base', '#94a3b8', 0),
    (new_workspace.id, 'Mapeado', '#60a5fa', 1),
    (new_workspace.id, 'Contato', '#fbbf24', 2),
    (new_workspace.id, 'Qualificado', '#34d399', 3),
    (new_workspace.id, 'Proposta', '#a78bfa', 4),
    (new_workspace.id, 'Negociação', '#f97316', 5),
    (new_workspace.id, 'Fechado', '#22c55e', 6);
  
  -- Return workspace as JSON
  SELECT row_to_json(new_workspace.*) INTO result;
  RETURN result;
END;
$$;
