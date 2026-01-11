# Documentação da API

Este documento descreve a API do banco de dados e as Edge Functions disponíveis no CRM AI.

## Índice

- [Autenticação](#autenticação)
- [Tabelas do Banco](#tabelas-do-banco)
- [Edge Functions](#edge-functions)
- [Exemplos de Uso](#exemplos-de-uso)
- [Códigos de Erro](#códigos-de-erro)

## Autenticação

### Supabase Auth

O sistema usa Supabase Auth para gerenciamento de usuários.

#### Signup (Criar Conta)

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'senha-segura',
  options: {
    data: {
      workspace_name: 'Minha Empresa'
    }
  }
});
```

#### Login

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'senha-segura'
});
```

#### Logout

```typescript
const { error } = await supabase.auth.signOut();
```

#### Obter Usuário Atual

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

## Tabelas do Banco

### Workspaces

Representa empresas/organizações.

**Tabela:** `workspaces`

**Colunas:**
- `id` (uuid, PK)
- `name` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Operações:**

```typescript
// Listar workspaces do usuário
const { data, error } = await supabase
  .from('workspaces')
  .select('*');

// Criar workspace
const { data, error } = await supabase
  .from('workspaces')
  .insert({ name: 'Nova Empresa' })
  .select()
  .single();

// Atualizar workspace (apenas admins)
const { data, error } = await supabase
  .from('workspaces')
  .update({ name: 'Novo Nome' })
  .eq('id', workspaceId)
  .select()
  .single();
```

### Workspace Members

Membros dos workspaces e suas funções.

**Tabela:** `workspace_members`

**Colunas:**
- `id` (uuid, PK)
- `workspace_id` (uuid, FK)
- `user_id` (uuid, FK)
- `role` (text): `'admin'`, `'member'`, ou `'viewer'`
- `created_at` (timestamptz)

**Operações:**

```typescript
// Listar membros (com email via function)
const { data, error } = await supabase
  .rpc('get_workspace_members_with_email', {
    p_workspace_id: workspaceId
  });

// Adicionar membro (apenas admins)
const { data, error } = await supabase
  .from('workspace_members')
  .insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: 'member'
  })
  .select()
  .single();

// Atualizar role (apenas admins)
const { data, error } = await supabase
  .from('workspace_members')
  .update({ role: 'admin' })
  .eq('id', memberId)
  .select()
  .single();

// Remover membro (apenas admins)
const { error } = await supabase
  .from('workspace_members')
  .delete()
  .eq('id', memberId);
```

### Pipeline Stages

Etapas do funil de vendas.

**Tabela:** `pipeline_stages`

**Colunas:**
- `id` (uuid, PK)
- `workspace_id` (uuid, FK)
- `name` (text)
- `color` (text): código hexadecimal (ex: `'#6366f1'`)
- `position` (integer): ordem de exibição
- `required_fields` (jsonb): array de IDs de custom_fields obrigatórios
- `auto_campaign_id` (uuid, FK, nullable): campanha executada automaticamente
- `created_at` (timestamptz)

**Operações:**

```typescript
// Listar etapas do workspace (ordenadas por position)
const { data, error } = await supabase
  .from('pipeline_stages')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('position');

// Criar etapa
const { data, error } = await supabase
  .from('pipeline_stages')
  .insert({
    workspace_id: workspaceId,
    name: 'Qualificação',
    color: '#10b981',
    position: 3,
    required_fields: ['field-id-1', 'field-id-2']
  })
  .select()
  .single();

// Atualizar etapa
const { data, error } = await supabase
  .from('pipeline_stages')
  .update({
    name: 'Novo Nome',
    auto_campaign_id: campaignId
  })
  .eq('id', stageId)
  .select()
  .single();

// Deletar etapa (apenas admins)
const { error } = await supabase
  .from('pipeline_stages')
  .delete()
  .eq('id', stageId);
```

### Leads

Leads/contatos do CRM.

**Tabela:** `leads`

**Colunas:**
- `id` (uuid, PK)
- `workspace_id` (uuid, FK)
- `name` (text)
- `email` (text, nullable)
- `phone` (text, nullable)
- `company` (text, nullable)
- `position` (text, nullable)
- `stage_id` (uuid, FK, nullable)
- `score` (integer): 0-100
- `notes` (text, nullable)
- `source` (text, nullable): origem do lead
- `assigned_to` (text, nullable): responsável
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Operações:**

```typescript
// Listar leads do workspace
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false });

// Buscar lead com custom fields
const { data, error } = await supabase
  .from('leads')
  .select(`
    *,
    stage:pipeline_stages(*),
    custom_values:lead_custom_values(
      id,
      value,
      custom_field:custom_fields(*)
    )
  `)
  .eq('id', leadId)
  .single();

// Criar lead
const { data, error } = await supabase
  .from('leads')
  .insert({
    workspace_id: workspaceId,
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '(11) 98765-4321',
    company: 'Empresa XYZ',
    position: 'Gerente',
    stage_id: stageId,
    score: 80,
    source: 'LinkedIn',
    assigned_to: 'Maria Santos'
  })
  .select()
  .single();

// Atualizar lead
const { data, error } = await supabase
  .from('leads')
  .update({
    stage_id: newStageId,
    score: 90,
    notes: 'Lead muito engajado'
  })
  .eq('id', leadId)
  .select()
  .single();

// Deletar lead
const { error } = await supabase
  .from('leads')
  .delete()
  .eq('id', leadId);

// Filtrar leads por etapa
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('stage_id', stageId);

// Buscar leads (search)
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('workspace_id', workspaceId)
  .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`);
```

### Custom Fields

Campos personalizados definidos pelo usuário.

**Tabela:** `custom_fields`

**Colunas:**
- `id` (uuid, PK)
- `workspace_id` (uuid, FK)
- `name` (text)
- `field_type` (text): `'text'`, `'number'`, `'date'`, ou `'select'`
- `options` (jsonb): array de opções para tipo `select`
- `created_at` (timestamptz)

**Operações:**

```typescript
// Listar campos personalizados
const { data, error } = await supabase
  .from('custom_fields')
  .select('*')
  .eq('workspace_id', workspaceId);

// Criar campo
const { data, error } = await supabase
  .from('custom_fields')
  .insert({
    workspace_id: workspaceId,
    name: 'Orçamento',
    field_type: 'number'
  })
  .select()
  .single();

// Criar campo de seleção
const { data, error } = await supabase
  .from('custom_fields')
  .insert({
    workspace_id: workspaceId,
    name: 'Interesse',
    field_type: 'select',
    options: ['Baixo', 'Médio', 'Alto']
  })
  .select()
  .single();

// Deletar campo
const { error } = await supabase
  .from('custom_fields')
  .delete()
  .eq('id', fieldId);
```

### Lead Custom Values

Valores dos campos personalizados para cada lead.

**Tabela:** `lead_custom_values`

**Colunas:**
- `id` (uuid, PK)
- `lead_id` (uuid, FK)
- `custom_field_id` (uuid, FK)
- `value` (text)
- `created_at` (timestamptz)

**Operações:**

```typescript
// Listar valores de um lead
const { data, error } = await supabase
  .from('lead_custom_values')
  .select('*, custom_field:custom_fields(*)')
  .eq('lead_id', leadId);

// Criar/atualizar valor (upsert)
const { data, error } = await supabase
  .from('lead_custom_values')
  .upsert({
    lead_id: leadId,
    custom_field_id: fieldId,
    value: 'R$ 50.000'
  }, {
    onConflict: 'lead_id,custom_field_id'
  })
  .select()
  .single();

// Deletar valor
const { error } = await supabase
  .from('lead_custom_values')
  .delete()
  .eq('id', valueId);
```

### Campaigns

Campanhas de geração de mensagens com IA.

**Tabela:** `campaigns`

**Colunas:**
- `id` (uuid, PK)
- `workspace_id` (uuid, FK)
- `name` (text)
- `description` (text, nullable)
- `offer_context` (text): contexto do produto/serviço
- `tone` (text): tom de voz desejado
- `prompt_template` (text, nullable): template customizado
- `is_active` (boolean)
- `created_at` (timestamptz)

**Operações:**

```typescript
// Listar campanhas
const { data, error } = await supabase
  .from('campaigns')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false });

// Criar campanha
const { data, error } = await supabase
  .from('campaigns')
  .insert({
    workspace_id: workspaceId,
    name: 'Campanha Q1 2026',
    description: 'Prospecção de novos clientes',
    offer_context: 'Sistema de CRM com IA que automatiza...',
    tone: 'profissional e consultivo',
    is_active: true
  })
  .select()
  .single();

// Atualizar campanha
const { data, error } = await supabase
  .from('campaigns')
  .update({
    name: 'Novo Nome',
    is_active: false
  })
  .eq('id', campaignId)
  .select()
  .single();

// Deletar campanha
const { error } = await supabase
  .from('campaigns')
  .delete()
  .eq('id', campaignId);
```

### Generated Messages

Mensagens geradas pela IA.

**Tabela:** `generated_messages`

**Colunas:**
- `id` (uuid, PK)
- `lead_id` (uuid, FK)
- `campaign_id` (uuid, FK)
- `message_text` (text)
- `variation_number` (integer): 1, 2 ou 3
- `was_sent` (boolean)
- `sent_at` (timestamptz, nullable)
- `created_at` (timestamptz)

**Operações:**

```typescript
// Listar mensagens de um lead
const { data, error } = await supabase
  .from('generated_messages')
  .select('*, campaign:campaigns(name)')
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false });

// Listar mensagens de uma campanha
const { data, error } = await supabase
  .from('generated_messages')
  .select('*, lead:leads(name, email)')
  .eq('campaign_id', campaignId)
  .order('created_at', { ascending: false });

// Marcar como enviada
const { data, error } = await supabase
  .from('generated_messages')
  .update({
    was_sent: true,
    sent_at: new Date().toISOString()
  })
  .eq('id', messageId)
  .select()
  .single();
```

### Activity Logs

Histórico de atividades no sistema.

**Tabela:** `activity_logs`

**Colunas:**
- `id` (uuid, PK)
- `workspace_id` (uuid, FK)
- `lead_id` (uuid, FK, nullable)
- `user_id` (uuid, FK, nullable)
- `action` (text)
- `details` (jsonb)
- `created_at` (timestamptz)

**Operações:**

```typescript
// Listar atividades recentes
const { data, error } = await supabase
  .from('activity_logs')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false })
  .limit(50);

// Criar log de atividade
const { data, error } = await supabase
  .from('activity_logs')
  .insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    user_id: userId,
    action: 'lead_created',
    details: {
      lead_name: 'João Silva',
      stage: 'Base'
    }
  })
  .select()
  .single();

// Filtrar por lead
const { data, error } = await supabase
  .from('activity_logs')
  .select('*')
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false });
```

## Edge Functions

### generate-messages

Gera mensagens personalizadas usando IA.

**Endpoint:** `POST /functions/v1/generate-messages`

**Headers:**
```
Authorization: Bearer {SUPABASE_ANON_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "campaignId": "uuid-da-campanha",
  "leadId": "uuid-do-lead"
}
```

**Response (200 OK):**
```json
{
  "messages": [
    {
      "id": "uuid-mensagem-1",
      "text": "Olá João, vi que você trabalha na Empresa XYZ...",
      "variation": 1,
      "created_at": "2026-01-10T12:00:00Z"
    },
    {
      "id": "uuid-mensagem-2",
      "text": "João, como gerente na Empresa XYZ, você...",
      "variation": 2,
      "created_at": "2026-01-10T12:00:00Z"
    },
    {
      "id": "uuid-mensagem-3",
      "text": "Oi João! Notei seu interesse em...",
      "variation": 3,
      "created_at": "2026-01-10T12:00:00Z"
    }
  ]
}
```

**Erros:**
```json
// 400 Bad Request
{
  "error": "campaignId e leadId são obrigatórios"
}

// 401 Unauthorized
{
  "error": "Token de autenticação inválido"
}

// 404 Not Found
{
  "error": "Campanha ou lead não encontrado"
}

// 500 Internal Server Error
{
  "error": "Erro ao gerar mensagens: [detalhes]"
}
```

**Exemplo de uso:**

```typescript
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-messages`;

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    campaignId: 'abc-123',
    leadId: 'xyz-789'
  })
});

const { messages } = await response.json();
console.log(messages);
```

## Exemplos de Uso

### Fluxo Completo: Criar Lead e Gerar Mensagens

```typescript
// 1. Buscar workspace do usuário
const { data: members } = await supabase
  .from('workspace_members')
  .select('workspace_id')
  .eq('user_id', user.id)
  .single();

const workspaceId = members.workspace_id;

// 2. Buscar primeira etapa do funil
const { data: stages } = await supabase
  .from('pipeline_stages')
  .select('id')
  .eq('workspace_id', workspaceId)
  .order('position')
  .limit(1);

const firstStageId = stages[0].id;

// 3. Criar lead
const { data: lead } = await supabase
  .from('leads')
  .insert({
    workspace_id: workspaceId,
    name: 'Maria Santos',
    email: 'maria@example.com',
    stage_id: firstStageId
  })
  .select()
  .single();

// 4. Buscar campanha ativa
const { data: campaigns } = await supabase
  .from('campaigns')
  .select('id')
  .eq('workspace_id', workspaceId)
  .eq('is_active', true)
  .limit(1);

const campaignId = campaigns[0].id;

// 5. Gerar mensagens
const apiUrl = `${SUPABASE_URL}/functions/v1/generate-messages`;
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    campaignId,
    leadId: lead.id
  })
});

const { messages } = await response.json();

// 6. Usar mensagens
console.log('Mensagens geradas:');
messages.forEach((msg, i) => {
  console.log(`\nVariação ${i + 1}:`);
  console.log(msg.text);
});
```

### Dashboard: Buscar Métricas

```typescript
// Total de leads
const { count: totalLeads } = await supabase
  .from('leads')
  .select('*', { count: 'exact', head: true })
  .eq('workspace_id', workspaceId);

// Leads por etapa
const { data: leadsByStage } = await supabase
  .from('leads')
  .select('stage_id, pipeline_stages(name)')
  .eq('workspace_id', workspaceId);

const distribution = leadsByStage.reduce((acc, lead) => {
  const stageName = lead.pipeline_stages?.name || 'Sem etapa';
  acc[stageName] = (acc[stageName] || 0) + 1;
  return acc;
}, {});

// Total de mensagens geradas
const { count: totalMessages } = await supabase
  .from('generated_messages')
  .select('*', { count: 'exact', head: true })
  .eq('campaign_id', campaignId);

// Atividades recentes
const { data: activities } = await supabase
  .from('activity_logs')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false })
  .limit(10);
```

## Códigos de Erro

### Supabase Database Errors

- `23505`: Violação de unique constraint
- `23503`: Violação de foreign key
- `42501`: Permissão negada (RLS)
- `PGRST116`: Nenhum resultado encontrado (com `.single()`)

### HTTP Status Codes

- `200`: Sucesso
- `201`: Criado com sucesso
- `400`: Requisição inválida
- `401`: Não autenticado
- `403`: Não autorizado (sem permissão)
- `404`: Não encontrado
- `500`: Erro interno do servidor

### Tratamento de Erros

```typescript
try {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.error('Lead não encontrado');
    } else if (error.code === '42501') {
      console.error('Sem permissão para acessar este lead');
    } else {
      console.error('Erro ao buscar lead:', error.message);
    }
    return;
  }

  // Sucesso
  console.log('Lead:', data);
} catch (err) {
  console.error('Erro inesperado:', err);
}
```

---

Documentação mantida pela equipe de desenvolvimento.
Para dúvidas ou sugestões, abra uma issue no repositório.
