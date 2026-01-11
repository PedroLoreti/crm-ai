# CRM AI - Plataforma de Vendas com Inteligência Artificial

Sistema completo de CRM multi-tenant com funil de vendas Kanban e geração automática de mensagens personalizadas usando Inteligência Artificial (Claude, GPT-4 ou Gemini).

## Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Arquitetura](#arquitetura)
- [Segurança](#segurança)
- [Desenvolvimento](#desenvolvimento)
- [Suporte](#suporte)

## Visão Geral

O CRM AI é uma plataforma moderna de gestão de relacionamento com clientes que combina funcionalidades tradicionais de CRM com o poder da inteligência artificial para automatizar a criação de mensagens personalizadas de vendas.

### Principais Diferenciais

- **Multi-tenant**: Suporta múltiplas empresas/workspaces isolados
- **IA Flexível**: Integração com Anthropic Claude, OpenAI GPT-4 ou Google Gemini
- **Automação Inteligente**: Geração automática de mensagens quando leads mudam de etapa
- **Campos Customizáveis**: Crie campos personalizados para adequar o CRM ao seu negócio
- **Funil Visual**: Interface Kanban intuitiva com drag-and-drop
- **Segurança Avançada**: Row Level Security (RLS) em todas as tabelas

## Funcionalidades

### Autenticação e Multi-tenancy
- Sistema de login e cadastro com Supabase Auth
- Workspaces isolados para cada empresa
- Controle de acesso por função (Admin, Membro, Visualizador)
- Convite de membros para o workspace

### Gestão de Leads
- Cadastro completo de leads (nome, email, telefone, empresa, cargo)
- Campos personalizados configuráveis pelo usuário
- Sistema de score de leads
- Observações e notas por lead
- Histórico completo de atividades
- Importação em massa (CSV/planilha)

### Funil Kanban
- Visualização em colunas por etapa do funil
- Drag and drop para mover leads entre etapas
- 7 etapas padrão: Base, Mapeado, Tentando Contato, Contato, Qualificado, Proposta, Negociação, Fechado
- Etapas totalmente customizáveis (nome, cor, ordem)
- Validação de campos obrigatórios antes de avançar
- Contadores de leads por etapa

### Campanhas de IA
- Configuração de contexto da oferta/produto
- Definição de tom de voz (profissional, casual, amigável, etc.)
- Templates de prompt personalizáveis
- Geração de 2-3 variações de mensagem por lead
- Geração manual sob demanda
- Automação por gatilho (quando lead entra em uma etapa específica)
- Histórico de todas as mensagens geradas

### Dashboard
- Métricas de quantidade total de leads
- Taxa de conversão por etapa
- Distribuição de leads no funil
- Contador de mensagens geradas
- Gráficos e visualizações
- Histórico de atividades recentes

### Campos Personalizados
- Tipos suportados: texto, número, data, seleção
- Campos específicos por workspace
- Definir campos obrigatórios por etapa do funil
- Valores salvos por lead

## Tecnologias

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **Lucide React** - Biblioteca de ícones

### Backend
- **Supabase PostgreSQL** - Banco de dados relacional
- **Supabase Auth** - Autenticação
- **Supabase Edge Functions** - Serverless functions (Deno)
- **Row Level Security (RLS)** - Segurança em nível de linha

### IA
- **Anthropic Claude** - API de IA (recomendado)
- **OpenAI GPT-4** - API de IA
- **Google Gemini** - API de IA

## Instalação

### Pré-requisitos

- Node.js 18+ e npm
- Conta no Supabase (gratuita)
- Chave de API de IA (Anthropic, OpenAI ou Google)

### Passo a Passo

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd crm-ai
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. **Configure o banco de dados**

As migrações SQL estão em `supabase/migrations/`. Execute-as na ordem pelo dashboard do Supabase ou usando a CLI:

```bash
# Se usar Supabase CLI
supabase db push
```

5. **Configure a Edge Function de IA**

A função `generate-messages` já está no projeto em `supabase/functions/generate-messages/`.

Configure as secrets no Supabase Dashboard:
- `AI_PROVIDER`: `anthropic`, `openai` ou `google`
- `AI_API_KEY`: sua chave de API

6. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## Configuração

### Configuração de IA

#### Opção 1: Anthropic Claude (Recomendado)

1. Crie uma conta em [console.anthropic.com](https://console.anthropic.com)
2. Gere uma API key
3. No Supabase Dashboard > Edge Functions > Manage Secrets:
   - `AI_PROVIDER`: `anthropic`
   - `AI_API_KEY`: `sk-ant-...`

#### Opção 2: OpenAI GPT

1. Crie uma conta em [platform.openai.com](https://platform.openai.com)
2. Gere uma API key
3. Configure:
   - `AI_PROVIDER`: `openai`
   - `AI_API_KEY`: `sk-...`

#### Opção 3: Google Gemini

1. Crie uma conta em [makersuite.google.com](https://makersuite.google.com)
2. Gere uma API key
3. Configure:
   - `AI_PROVIDER`: `google`
   - `AI_API_KEY`: `AIza...`

### Estrutura do Banco de Dados

O banco de dados é criado automaticamente através das migrações. Principais tabelas:

- `workspaces` - Empresas/organizações
- `workspace_members` - Membros e suas funções
- `pipeline_stages` - Etapas do funil de vendas
- `leads` - Leads/contatos
- `custom_fields` - Campos personalizados
- `lead_custom_values` - Valores dos campos personalizados
- `campaigns` - Campanhas de IA
- `generated_messages` - Mensagens geradas
- `activity_logs` - Histórico de atividades

## Uso

### 1. Criar uma Conta

1. Acesse a aplicação
2. Clique em "Cadastre-se"
3. Preencha:
   - Nome do workspace (sua empresa)
   - Email
   - Senha (mínimo 6 caracteres)
4. Você será automaticamente logado

### 2. Configurar Campos Personalizados (Opcional)

1. Vá em **Configurações**
2. Seção **Campos Personalizados**
3. Adicione campos específicos do seu negócio:
   - Orçamento
   - Nível de interesse
   - Fonte do lead
   - Data da última interação
   - etc.

### 3. Personalizar Etapas do Funil (Opcional)

1. Em **Configurações**
2. Seção **Etapas do Funil**
3. Edite, reordene ou adicione novas etapas
4. Defina cores e campos obrigatórios
5. Configure automação de campanha por etapa

### 4. Criar uma Campanha de IA

1. Vá em **Campanhas de IA**
2. Clique em **Nova Campanha**
3. Preencha:
   - **Nome**: Ex: "Campanha de Prospecção Q1"
   - **Contexto da Oferta**: Descreva seu produto/serviço detalhadamente
   - **Tom de Voz**: Profissional, casual, amigável, urgente, etc.
   - **Template Personalizado** (opcional): Personalize o prompt de IA
4. Clique em **Salvar**

### 5. Adicionar Leads

**Manualmente:**
1. Vá em **Funil de Vendas**
2. Clique em **+ Novo Lead** ou no **+** de uma etapa
3. Preencha as informações
4. Clique em **Salvar**

**Em massa:**
1. Vá em **Lista de Leads**
2. Clique em **Importar Leads**
3. Faça upload de CSV ou cole dados
4. Mapeie as colunas
5. Confirme a importação

### 6. Gerar Mensagens com IA

**Manualmente:**
1. Vá em **Campanhas de IA**
2. Clique em **Gerar Mensagens**
3. Selecione um lead
4. Clique em **Gerar 3 Variações**
5. Copie a mensagem que preferir
6. Marque como enviada (opcional)

**Automaticamente:**
1. Edite uma etapa do funil (em **Configurações**)
2. Selecione uma campanha para execução automática
3. Quando um lead entrar nessa etapa, 3 mensagens serão geradas automaticamente
4. Acesse as mensagens pelo card do lead ou pela campanha

### 7. Gerenciar Funil de Vendas

1. Vá em **Funil de Vendas**
2. Visualize todos os leads organizados por etapa
3. Arraste e solte para mover entre etapas
4. Clique em um lead para ver detalhes
5. Edite informações, adicione notas
6. Visualize mensagens geradas

### 8. Acompanhar Métricas

1. Vá em **Dashboard**
2. Visualize:
   - Total de leads
   - Distribuição por etapa
   - Mensagens geradas
   - Histórico de atividades
   - Taxa de conversão

## Arquitetura

### Frontend (React)

```
src/
├── components/
│   ├── Auth/          # Login e Signup
│   ├── Dashboard/     # Métricas e gráficos
│   ├── Kanban/        # Funil visual
│   ├── Leads/         # Lista e importação
│   ├── Campaigns/     # Campanhas de IA
│   ├── Settings/      # Configurações
│   └── Layout/        # Layout principal
├── contexts/          # Context API (Auth)
├── hooks/             # Custom hooks
├── lib/               # Cliente Supabase
└── types/             # TypeScript types
```

### Backend (Supabase)

- **PostgreSQL**: Banco de dados relacional com RLS
- **Edge Functions**: Função serverless para IA
- **Auth**: Gerenciamento de usuários
- **Storage**: (Futuro) Para arquivos

### Fluxo de Dados

1. **Autenticação**: Supabase Auth gerencia sessões
2. **Dados**: Frontend consulta diretamente o PostgreSQL via SDK
3. **RLS**: Políticas garantem isolamento por workspace
4. **IA**: Frontend chama Edge Function que acessa API de IA
5. **Realtime**: (Futuro) Supabase Realtime para updates ao vivo

## Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado com políticas restritivas:

- Usuários só acessam dados dos seus workspaces
- Funções (admin, member, viewer) controlam permissões
- Validações no banco impedem acesso não autorizado

### Autenticação

- Senhas hashadas pelo Supabase Auth
- Tokens JWT para sessões
- Refresh tokens automáticos
- Logout seguro

### Boas Práticas

- Chaves de API armazenadas como secrets no Supabase
- Variáveis de ambiente nunca commitadas
- Validações no frontend E backend
- CORS configurado corretamente

## Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia dev server na porta 5173

# Build
npm run build        # Build de produção
npm run preview      # Preview do build

# Qualidade
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

### Estrutura de Commits

Use commits semânticos:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

### Adicionando Novas Funcionalidades

1. Crie uma branch: `git checkout -b feat/nova-funcionalidade`
2. Desenvolva e teste localmente
3. Faça commit das alterações
4. Se necessário, crie migrações SQL
5. Atualize a documentação
6. Abra um Pull Request

### Migrações de Banco

Para criar uma nova migração:

1. Crie um arquivo SQL em `supabase/migrations/`
2. Nome: `YYYYMMDDHHMMSS_descricao.sql`
3. Inclua comentário detalhado no início
4. Use `IF NOT EXISTS` para segurança
5. Adicione políticas RLS
6. Execute via dashboard ou CLI

Exemplo:
```sql
/*
  # Adicionar campo X

  1. Alterações
    - Adiciona coluna 'campo_novo' na tabela 'leads'

  2. Segurança
    - Atualiza políticas RLS existentes
*/

ALTER TABLE leads ADD COLUMN IF NOT EXISTS campo_novo text;
```

### Testes

Atualmente sem suite de testes automatizados. Contribuições são bem-vindas!

## Roadmap

### Em Desenvolvimento
- [ ] Suporte a múltiplas campanhas por lead
- [ ] Filtros avançados na lista de leads
- [ ] Exportação de relatórios

### Planejado
- [ ] Integração com WhatsApp/Email
- [ ] Envio automático de mensagens
- [ ] Analytics avançado
- [ ] API pública
- [ ] Webhooks
- [ ] Integrações (Zapier, Make)
- [ ] Mobile app

### Ideias Futuras
- [ ] Suporte a pipelines múltiplos
- [ ] Automações avançadas (workflows)
- [ ] IA para scoring automático
- [ ] Chat interno
- [ ] Videochamadas integradas

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para mais detalhes.

## Licença

Este projeto é privado e proprietário. Todos os direitos reservados.

## Suporte

### Documentação Adicional
- [SETUP_AI.md](SETUP_AI.md) - Configuração detalhada de IA
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura detalhada
- [API.md](API.md) - Documentação da API/Database

### Links Úteis
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação React](https://react.dev)
- [Documentação TypeScript](https://www.typescriptlang.org/docs)
- [Documentação Tailwind CSS](https://tailwindcss.com/docs)

### Contato
Para questões, sugestões ou suporte, abra uma issue no repositório.

---

Desenvolvido com React, TypeScript, Supabase e IA.
