# Arquitetura do Sistema

Este documento descreve a arquitetura técnica do CRM AI, incluindo decisões de design, fluxos de dados e padrões utilizados.

## Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitetura Frontend](#arquitetura-frontend)
- [Arquitetura Backend](#arquitetura-backend)
- [Modelo de Dados](#modelo-de-dados)
- [Segurança](#segurança)
- [Fluxos Principais](#fluxos-principais)
- [Decisões de Design](#decisões-de-design)

## Visão Geral

O CRM AI é uma aplicação SPA (Single Page Application) com backend serverless. A arquitetura segue os princípios:

- **Separation of Concerns**: Frontend, backend e dados bem separados
- **Multi-tenancy**: Isolamento completo de dados por workspace
- **Security First**: RLS em todas as camadas
- **Serverless**: Edge Functions para lógica de negócio
- **Type Safety**: TypeScript em todo o código

### Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                         Usuário                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Kanban  │  │ Campaigns│  │ Settings │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │              │             │            │          │
│         └──────────────┴─────────────┴────────────┘          │
│                        │                                      │
│                 ┌──────▼───────┐                             │
│                 │ Supabase SDK │                             │
│                 └──────┬───────┘                             │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Cloud                            │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ PostgreSQL  │  │     Auth     │  │   Storage    │       │
│  │    + RLS    │  │              │  │              │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌────────────────────────────────────────────────┐         │
│  │          Edge Functions (Deno)                  │         │
│  │  ┌──────────────────────────────────────────┐  │         │
│  │  │      generate-messages                    │  │         │
│  │  │  - Integração com APIs de IA             │  │         │
│  │  │  - Anthropic Claude / OpenAI / Gemini    │  │         │
│  │  └──────────────────────────────────────────┘  │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    APIs Externas                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Anthropic  │  │  OpenAI    │  │   Google   │            │
│  │   Claude   │  │   GPT-4    │  │   Gemini   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Stack Tecnológico

### Frontend
- **React 18.3**: Biblioteca UI com hooks
- **TypeScript 5.5**: Tipagem estática
- **Vite 5.4**: Build tool e dev server ultra-rápido
- **Tailwind CSS 3.4**: Framework CSS utilitário
- **Lucide React**: Biblioteca de ícones SVG

### Backend
- **Supabase**: Platform BaaS (Backend as a Service)
  - PostgreSQL 15+ com extensões
  - Row Level Security (RLS)
  - Realtime subscriptions (futuro)
  - Edge Functions (Deno runtime)
- **Deno**: Runtime para Edge Functions
  - Seguro por padrão
  - TypeScript nativo
  - APIs Web modernas

### IA
- **Anthropic Claude**: Modelo recomendado (Claude 3.5 Sonnet)
- **OpenAI GPT-4**: Alternativa
- **Google Gemini**: Alternativa

## Arquitetura Frontend

### Estrutura de Pastas

```
src/
├── components/          # Componentes React
│   ├── Auth/           # Login, Signup
│   ├── Dashboard/      # Dashboard e métricas
│   ├── Kanban/         # Board, Column, LeadCard
│   ├── Leads/          # Lista, Import, Modal
│   ├── Campaigns/      # Lista, Modal, Generator
│   ├── Settings/       # Config, CustomFields, Stages
│   └── Layout/         # Layout principal, Header, Nav
├── contexts/           # React Context
│   └── AuthContext.tsx # Contexto de autenticação
├── hooks/              # Custom React Hooks
│   └── useAuth.ts      # Hook de autenticação
├── lib/                # Bibliotecas e configs
│   └── supabase.ts     # Cliente Supabase
├── types/              # TypeScript types
│   └── index.ts        # Tipos principais
├── App.tsx             # Componente raiz
├── main.tsx            # Entry point
└── index.css           # Estilos globais
```

### Padrões de Componentes

#### Estrutura de Componente

```typescript
// LeadCard.tsx
import { useState } from 'react';
import { Lead } from '../../types';

interface LeadCardProps {
  lead: Lead;
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadCard({ lead, onUpdate, onDelete }: LeadCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Lógica do componente

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* JSX */}
    </div>
  );
}
```

#### Custom Hooks

```typescript
// useLeads.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';

export function useLeads(workspaceId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, [workspaceId]);

  async function fetchLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { leads, loading, error, refetch: fetchLeads };
}
```

### Gerenciamento de Estado

#### Estado Local
- `useState`: Para estado de componente
- `useReducer`: Para estado complexo (futuro)

#### Estado Global
- **Context API**: Autenticação (AuthContext)
- **Supabase Realtime** (futuro): Sincronização em tempo real

#### Estado de Servidor
- **Supabase Queries**: Dados buscados sob demanda
- **Cache manual**: Re-fetch após mutações

### Fluxo de Dados

```
Componente → Hook → Supabase SDK → API → PostgreSQL
    ↓                                          ↓
  UI Update ← Estado ← Response ← Query ← RLS Check
```

## Arquitetura Backend

### Banco de Dados (PostgreSQL)

#### Schema Design

O schema segue o padrão multi-tenant:

```sql
-- Hierarquia principal
workspaces (1)
  ↓
  ├─ workspace_members (N)
  ├─ pipeline_stages (N)
  ├─ leads (N)
  ├─ custom_fields (N)
  ├─ campaigns (N)
  └─ activity_logs (N)

-- Relacionamentos
leads (N) ↔ lead_custom_values (N) ↔ custom_fields (1)
leads (N) ← generated_messages (N) → campaigns (1)
pipeline_stages (1) ← leads (N)
```

#### Extensões Utilizadas

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RLS helpers
-- auth.uid() já disponível
```

### Row Level Security (RLS)

Todas as tabelas seguem o padrão:

```sql
-- 1. Habilitar RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 2. Políticas baseadas em workspace membership
CREATE POLICY "Users can view data in their workspace"
  ON table_name FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = table_name.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- 3. Políticas por role
CREATE POLICY "Members can insert"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = table_name.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );
```

### Edge Functions

#### generate-messages

Função serverless que integra com APIs de IA.

**Input:**
```json
{
  "campaignId": "uuid",
  "leadId": "uuid"
}
```

**Processamento:**
1. Busca dados da campanha e lead
2. Constrói prompt personalizado
3. Chama API de IA configurada
4. Parseia resposta (3 variações)
5. Salva mensagens no banco
6. Retorna resultado

**Output:**
```json
{
  "messages": [
    { "id": "uuid", "text": "Mensagem 1...", "variation": 1 },
    { "id": "uuid", "text": "Mensagem 2...", "variation": 2 },
    { "id": "uuid", "text": "Mensagem 3...", "variation": 3 }
  ]
}
```

**Estrutura:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // 1. CORS
  if (req.method === 'OPTIONS') return corsResponse();

  // 2. Auth check
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return errorResponse('Unauthorized', 401);

  // 3. Parse input
  const { campaignId, leadId } = await req.json();

  // 4. Fetch data
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  // 5. Call AI API
  const messages = await generateWithAI(campaign, lead);

  // 6. Save to DB
  await saveMessages(messages);

  // 7. Return
  return successResponse(messages);
});
```

## Modelo de Dados

### Entidades Principais

#### Workspace
```typescript
interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
```

#### Workspace Member
```typescript
interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  created_at: string;
}
```

#### Lead
```typescript
interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  stage_id?: string;
  score: number;
  notes?: string;
  source?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}
```

#### Pipeline Stage
```typescript
interface PipelineStage {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  position: number;
  required_fields: string[]; // Array de IDs de custom_fields
  auto_campaign_id?: string;
  created_at: string;
}
```

#### Campaign
```typescript
interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  offer_context: string;
  tone: string;
  prompt_template?: string;
  is_active: boolean;
  created_at: string;
}
```

#### Generated Message
```typescript
interface GeneratedMessage {
  id: string;
  lead_id: string;
  campaign_id: string;
  message_text: string;
  variation_number: 1 | 2 | 3;
  was_sent: boolean;
  sent_at?: string;
  created_at: string;
}
```

## Segurança

### Camadas de Segurança

1. **Frontend**
   - Validação de inputs
   - Sanitização de dados
   - Verificação de sessão

2. **API/Edge Functions**
   - Verificação de JWT
   - Validação de permissões
   - Rate limiting (futuro)

3. **Database**
   - Row Level Security
   - Políticas por role
   - Validações por constraints

### Fluxo de Autenticação

```
1. User → Email/Password → Supabase Auth
                                ↓
2. Auth valida credenciais
                                ↓
3. Gera JWT token (access + refresh)
                                ↓
4. Frontend armazena tokens (memory + localStorage)
                                ↓
5. Requisições incluem token no header
                                ↓
6. RLS usa auth.uid() do JWT para filtrar dados
```

### Proteção de Secrets

- **Frontend**: Apenas chaves públicas (ANON_KEY)
- **Backend**: Service role e API keys em secrets
- **Edge Functions**: Variáveis de ambiente
- **Git**: .env no .gitignore

## Fluxos Principais

### Fluxo de Criação de Lead

```
1. Usuário clica "Novo Lead"
   ↓
2. Abre modal com formulário
   ↓
3. Usuário preenche dados
   ↓
4. Submit → Validação no frontend
   ↓
5. POST para Supabase
   ↓
6. RLS verifica permissão (member/admin)
   ↓
7. INSERT no banco
   ↓
8. Response com lead criado
   ↓
9. Frontend atualiza lista
   ↓
10. Modal fecha
```

### Fluxo de Geração de Mensagens

```
1. Usuário seleciona campanha e lead
   ↓
2. Clica "Gerar Mensagens"
   ↓
3. Frontend chama Edge Function
   POST /functions/v1/generate-messages
   {
     campaignId: "...",
     leadId: "..."
   }
   ↓
4. Edge Function:
   a. Busca dados da campanha
   b. Busca dados do lead + custom fields
   c. Constrói prompt
   d. Chama API de IA (Claude/GPT/Gemini)
   e. Parseia resposta (3 variações)
   f. Salva no banco (generated_messages)
   ↓
5. Response com mensagens
   ↓
6. Frontend exibe mensagens
   ↓
7. Usuário copia e usa
```

### Fluxo de Automação

```
1. Admin configura etapa do funil
   - Define auto_campaign_id
   ↓
2. Lead é movido para essa etapa
   (drag and drop no Kanban)
   ↓
3. Frontend detecta mudança de stage
   ↓
4. Busca pipeline_stage.auto_campaign_id
   ↓
5. Se existir, chama Edge Function automaticamente
   POST /functions/v1/generate-messages
   {
     campaignId: auto_campaign_id,
     leadId: lead.id
   }
   ↓
6. Mensagens geradas em background
   ↓
7. Notificação (futuro)
```

## Decisões de Design

### Por que React?
- Ecosistema maduro
- Performance com Virtual DOM
- Hooks para lógica reutilizável
- Grande comunidade

### Por que TypeScript?
- Type safety reduz bugs
- Melhor DX (autocomplete, refactoring)
- Documentação implícita
- Escalabilidade

### Por que Supabase?
- Backend completo out-of-the-box
- PostgreSQL (relacional, maduro)
- RLS nativo para multi-tenancy
- Edge Functions serverless
- Auth integrado
- Free tier generoso

### Por que Tailwind?
- Produtividade alta
- Consistência de design
- Sem conflitos de CSS
- Otimização automática (purge)
- Responsividade fácil

### Por que não Redux?
- Aplicação pequena/média
- Context API suficiente
- Supabase já gerencia estado de servidor
- Menos boilerplate

### Por que Edge Functions?
- Serverless (sem servidor para gerenciar)
- Escala automático
- Deno runtime moderno
- Próximo dos dados (Supabase)
- Free tier

### Multi-tenancy via RLS
- Isolamento garantido no banco
- Performance melhor que queries filtradas
- Segurança em múltiplas camadas
- Não depende de lógica de aplicação

## Melhorias Futuras

### Performance
- React Query para cache inteligente
- Lazy loading de componentes
- Virtual scrolling em listas grandes
- Otimização de imagens

### Escalabilidade
- Supabase Realtime para updates
- WebSockets para notificações
- Cache com Redis (se necessário)
- CDN para assets estáticos

### Monitoramento
- Sentry para error tracking
- Analytics (Plausible/Umami)
- Logs estruturados
- Métricas de performance

### Testes
- Jest + React Testing Library
- Playwright para E2E
- CI/CD automatizado
- Code coverage

---

Documentação mantida pela equipe de desenvolvimento.
Última atualização: Janeiro 2026
