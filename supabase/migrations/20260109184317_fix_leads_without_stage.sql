/*
  # Corrige leads sem estágio atribuído

  1. Mudanças
    - Atribui o primeiro estágio do funil para todos os leads que não têm stage_id
    - Garante que todos os leads apareçam no Kanban

  2. Notas
    - Esta é uma migração de correção única para leads já importados
    - Futuros leads importados já terão stage_id atribuído automaticamente
*/

-- Atualiza todos os leads sem stage_id para o primeiro estágio de cada workspace
UPDATE leads
SET stage_id = (
  SELECT id 
  FROM pipeline_stages 
  WHERE pipeline_stages.workspace_id = leads.workspace_id
  ORDER BY position ASC
  LIMIT 1
)
WHERE stage_id IS NULL;