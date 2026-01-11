/*
  # Add "Tentando Contato" Stage

  ## Changes
  1. Update create_workspace_with_member function to include "Tentando Contato" stage
  2. Add "Tentando Contato" stage to existing workspaces that don't have it
  
  ## New Default Stages
  - Base (position 0)
  - Mapeado (position 1)
  - Tentando Contato (position 2) - NEW
  - Contato (position 3)
  - Qualificado (position 4)
  - Proposta (position 5)
  - Negociação (position 6)
  - Fechado (position 7)
*/

-- Drop and recreate the function with the new stage
DROP FUNCTION IF EXISTS create_workspace_with_member(text, uuid);

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
  
  -- Create default pipeline stages with new "Tentando Contato" stage
  INSERT INTO pipeline_stages (workspace_id, name, color, position)
  VALUES
    (new_workspace.id, 'Base', '#94a3b8', 0),
    (new_workspace.id, 'Mapeado', '#60a5fa', 1),
    (new_workspace.id, 'Tentando Contato', '#f59e0b', 2),
    (new_workspace.id, 'Contato', '#fbbf24', 3),
    (new_workspace.id, 'Qualificado', '#34d399', 4),
    (new_workspace.id, 'Proposta', '#a78bfa', 5),
    (new_workspace.id, 'Negociação', '#f97316', 6),
    (new_workspace.id, 'Fechado', '#22c55e', 7);
  
  -- Return workspace as JSON
  SELECT row_to_json(new_workspace.*) INTO result;
  RETURN result;
END;
$$;

-- Add "Tentando Contato" stage to existing workspaces
-- Update positions of existing stages first
UPDATE pipeline_stages
SET position = position + 1
WHERE name IN ('Contato', 'Qualificado', 'Proposta', 'Negociação', 'Fechado')
  AND workspace_id IN (
    SELECT DISTINCT workspace_id 
    FROM pipeline_stages 
    WHERE workspace_id NOT IN (
      SELECT workspace_id 
      FROM pipeline_stages 
      WHERE name = 'Tentando Contato'
    )
  );

-- Insert "Tentando Contato" stage for workspaces that don't have it
INSERT INTO pipeline_stages (workspace_id, name, color, position)
SELECT w.id, 'Tentando Contato', '#f59e0b', 2
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps
  WHERE ps.workspace_id = w.id
  AND ps.name = 'Tentando Contato'
);