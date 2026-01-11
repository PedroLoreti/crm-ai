# Configuração da IA (Gemini)

⚠️ **IMPORTANTE**: Para que o gerador de mensagens funcione, você PRECISA configurar as variáveis de ambiente no painel do Supabase. Este passo é obrigatório!

## Passo a Passo para Configurar

### 1. Acesse o Dashboard do Supabase
- Vá para: https://supabase.com/dashboard/project/damqowulevzzqnttsugx
- Faça login com sua conta

### 2. Vá até Edge Functions
- No menu lateral esquerdo, procure por **"Edge Functions"**
- Clique em **"Edge Functions"**

### 3. Acesse as Configurações de Secrets
- Na página de Edge Functions, procure por um botão ou link chamado:
  - **"Manage secrets"** ou
  - **"Function secrets"** ou
  - **"Settings"** (ícone de engrenagem)

### 4. Adicione as Secrets
Clique em **"Add new secret"** ou similar e adicione:

**Secret 1:**
- Name: `AI_API_KEY`
- Value: `AIzaSyBp8FXed-erfCHo482G-NgLsvq6yDCuPs8`

**Secret 2:**
- Name: `AI_PROVIDER`
- Value: `google`

### 5. Salve as Alterações
- Clique em **"Save"** ou **"Add secret"**
- Aguarde alguns segundos para as variáveis serem aplicadas

## Testando

Após configurar as variáveis:

1. Acesse a aplicação
2. Vá em "Campanhas de IA"
3. Crie uma campanha
4. Clique em "Gerar Mensagens"
5. Selecione um lead
6. As mensagens serão geradas usando o Google Gemini

## Modelos Suportados

A edge function suporta 3 provedores de IA:

- **Google (Gemini)** - `AI_PROVIDER=google` (configurado)
- **Anthropic (Claude)** - `AI_PROVIDER=anthropic`
- **OpenAI (GPT-4)** - `AI_PROVIDER=openai`

O sistema está configurado para usar o Gemini Pro.

## Alternativa Rápida via Supabase CLI

Se você tiver o Supabase CLI instalado e autenticado:

```bash
npx supabase secrets set AI_API_KEY=AIzaSyBp8FXed-erfCHo482G-NgLsvq6yDCuPs8
npx supabase secrets set AI_PROVIDER=google
```
