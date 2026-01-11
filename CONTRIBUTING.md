# Guia de Contribuição

Obrigado por considerar contribuir para o CRM AI! Este documento fornece diretrizes para contribuir com o projeto.

## Código de Conduta

- Seja respeitoso e profissional
- Aceite feedback construtivo
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

## Como Contribuir

### Reportar Bugs

Antes de criar um bug report, verifique se o problema já não foi reportado. Se não foi, crie uma issue incluindo:

- Título claro e descritivo
- Descrição detalhada do problema
- Passos para reproduzir
- Comportamento esperado vs observado
- Screenshots (se aplicável)
- Informações do ambiente (navegador, OS, etc.)

### Sugerir Melhorias

Issues para sugestões devem incluir:

- Título claro e descritivo
- Descrição detalhada da sugestão
- Explicação do porquê seria útil
- Exemplos de uso (se aplicável)

### Pull Requests

1. **Fork o projeto**
   ```bash
   git clone https://github.com/seu-usuario/crm-ai.git
   cd crm-ai
   ```

2. **Crie uma branch**
   ```bash
   git checkout -b feat/minha-feature
   # ou
   git checkout -b fix/meu-bugfix
   ```

3. **Instale dependências**
   ```bash
   npm install
   ```

4. **Faça suas alterações**
   - Siga o estilo de código existente
   - Adicione comentários quando necessário
   - Mantenha código limpo e legível

5. **Teste suas alterações**
   ```bash
   npm run dev      # Teste local
   npm run build    # Verifique se builda
   npm run lint     # Verifique linting
   npm run typecheck # Verifique tipos
   ```

6. **Commit suas alterações**
   ```bash
   git add .
   git commit -m "feat: adiciona funcionalidade X"
   ```

7. **Push para seu fork**
   ```bash
   git push origin feat/minha-feature
   ```

8. **Abra um Pull Request**
   - Descreva suas alterações claramente
   - Referencie issues relacionadas
   - Adicione screenshots se relevante

## Padrões de Código

### Commits Semânticos

Use o formato de commits semânticos:

```
tipo(escopo): descrição curta

Descrição mais longa se necessário.

Refs: #123
```

**Tipos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Alterações na documentação
- `style`: Formatação, ponto e vírgula, etc (sem mudança de código)
- `refactor`: Refatoração de código
- `perf`: Melhoria de performance
- `test`: Adição ou correção de testes
- `chore`: Manutenção, configs, builds, etc

**Exemplos:**
```
feat(leads): adiciona importação de leads via CSV
fix(kanban): corrige drag and drop em mobile
docs(readme): atualiza instruções de instalação
refactor(campaigns): extrai lógica de geração para hook
```

### TypeScript

- Use TypeScript para todo código novo
- Defina tipos explícitos (evite `any`)
- Use interfaces para objetos complexos
- Exporte tipos quando reutilizáveis

```typescript
// Bom
interface Lead {
  id: string;
  name: string;
  email: string;
  stage_id: string;
}

// Evite
const lead: any = { ... };
```

### React

- Use functional components
- Use hooks (useState, useEffect, etc.)
- Mantenha componentes pequenos e focados
- Extraia lógica complexa para custom hooks
- Use props tipadas

```typescript
// Bom
interface LeadCardProps {
  lead: Lead;
  onUpdate: (lead: Lead) => void;
}

export function LeadCard({ lead, onUpdate }: LeadCardProps) {
  // ...
}
```

### CSS/Tailwind

- Use Tailwind classes sempre que possível
- Evite CSS customizado
- Use classes utilitárias do Tailwind
- Mantenha consistência de espaçamento

```tsx
// Bom
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow">

// Evite
<div style={{ display: 'flex', padding: '24px' }}>
```

### Organização de Arquivos

```
src/
├── components/
│   └── Feature/
│       ├── FeatureComponent.tsx
│       ├── FeatureModal.tsx
│       └── FeatureList.tsx
├── hooks/
│   └── useFeature.ts
├── types/
│   └── feature.ts
└── utils/
    └── featureHelpers.ts
```

- Um componente por arquivo
- Nomes de componentes em PascalCase
- Nomes de arquivos igual ao componente
- Agrupe componentes relacionados em pastas

## Trabalhando com Banco de Dados

### Criando Migrações

1. **Crie um arquivo SQL** em `supabase/migrations/`

   Nome: `YYYYMMDDHHMMSS_descricao_curta.sql`

   Exemplo: `20260110120000_add_lead_tags.sql`

2. **Adicione comentário detalhado**

   ```sql
   /*
     # Adicionar sistema de tags para leads

     1. Novas Tabelas
       - `tags` - Tags disponíveis
         - `id` (uuid, primary key)
         - `workspace_id` (uuid, foreign key)
         - `name` (text)
         - `color` (text)

       - `lead_tags` - Relação many-to-many
         - `lead_id` (uuid, foreign key)
         - `tag_id` (uuid, foreign key)

     2. Segurança
       - RLS habilitado em ambas tabelas
       - Políticas baseadas em workspace membership
   */
   ```

3. **Use IF NOT EXISTS**

   ```sql
   CREATE TABLE IF NOT EXISTS tags (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
     name text NOT NULL,
     color text DEFAULT '#6366f1',
     created_at timestamptz DEFAULT now()
   );
   ```

4. **Adicione índices**

   ```sql
   CREATE INDEX IF NOT EXISTS idx_tags_workspace
     ON tags(workspace_id);
   ```

5. **Configure RLS**

   ```sql
   ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view tags in their workspace"
     ON tags FOR SELECT
     TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM workspace_members
         WHERE workspace_members.workspace_id = tags.workspace_id
         AND workspace_members.user_id = auth.uid()
       )
     );
   ```

### Políticas RLS

Siga estes padrões:

```sql
-- SELECT: apenas USING
CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  TO authenticated
  USING (condition);

-- INSERT: apenas WITH CHECK
CREATE POLICY "policy_name"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (condition);

-- UPDATE: USING e WITH CHECK
CREATE POLICY "policy_name"
  ON table_name FOR UPDATE
  TO authenticated
  USING (condition)
  WITH CHECK (condition);

-- DELETE: apenas USING
CREATE POLICY "policy_name"
  ON table_name FOR DELETE
  TO authenticated
  USING (condition);
```

## Trabalhando com Edge Functions

### Estrutura

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Seu código aqui
    const data = { message: 'Success' };

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
```

### Boas Práticas

- Sempre inclua CORS headers
- Trate erros apropriadamente
- Use tipos TypeScript
- Valide input do usuário
- Retorne status codes apropriados
- Use variáveis de ambiente para secrets

## Testes

Atualmente o projeto não tem suite de testes. Contribuições nesta área são muito bem-vindas!

### Testes Manuais

Antes de submeter um PR, teste:

1. **Funcionalidade principal**
   - Login/Signup
   - Criar workspace
   - Adicionar leads
   - Mover leads no kanban
   - Gerar mensagens

2. **Casos de borda**
   - Campos vazios
   - Inputs inválidos
   - Permissões incorretas
   - Erros de rede

3. **Responsividade**
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

4. **Navegadores**
   - Chrome/Edge
   - Firefox
   - Safari

## Revisão de Código

Pull requests serão revisados considerando:

- Funcionalidade correta
- Código limpo e legível
- Seguindo padrões do projeto
- Sem quebrar funcionalidades existentes
- Performance adequada
- Segurança (RLS, validações, etc.)
- Documentação atualizada

## Dúvidas?

Se tiver dúvidas sobre contribuição:

1. Abra uma issue com a tag `question`
2. Descreva sua dúvida claramente
3. Aguarde resposta da equipe

Obrigado por contribuir!
