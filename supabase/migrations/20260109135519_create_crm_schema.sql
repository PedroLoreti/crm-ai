/*
  # CRM Platform with AI - Complete Schema
  
  ## Overview
  Multi-tenant CRM platform with AI-powered message generation and sales funnel management.
  
  ## 1. New Tables
  
  ### Core Tables
  - `workspaces` - Multi-tenant workspace isolation
    - `id` (uuid, primary key)
    - `name` (text) - Workspace name
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  - `workspace_members` - User membership in workspaces
    - `id` (uuid, primary key)
    - `workspace_id` (uuid, foreign key)
    - `user_id` (uuid, foreign key to auth.users)
    - `role` (text) - admin, member, viewer
    - `created_at` (timestamptz)
  
  - `pipeline_stages` - Sales funnel stages (customizable)
    - `id` (uuid, primary key)
    - `workspace_id` (uuid, foreign key)
    - `name` (text) - Stage name
    - `color` (text) - Display color
    - `position` (integer) - Order in pipeline
    - `required_fields` (jsonb) - Array of required custom field IDs
    - `auto_campaign_id` (uuid, nullable) - Campaign triggered when lead enters
    - `created_at` (timestamptz)
  
  - `leads` - Lead/contact management
    - `id` (uuid, primary key)
    - `workspace_id` (uuid, foreign key)
    - `name` (text) - Lead name
    - `email` (text)
    - `phone` (text)
    - `company` (text)
    - `position` (text)
    - `stage_id` (uuid, foreign key to pipeline_stages)
    - `score` (integer) - Lead score
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  - `custom_fields` - User-defined custom fields
    - `id` (uuid, primary key)
    - `workspace_id` (uuid, foreign key)
    - `name` (text) - Field name
    - `field_type` (text) - text, number, date, select
    - `options` (jsonb) - For select type fields
    - `created_at` (timestamptz)
  
  - `lead_custom_values` - Custom field values for leads
    - `id` (uuid, primary key)
    - `lead_id` (uuid, foreign key)
    - `custom_field_id` (uuid, foreign key)
    - `value` (text)
    - `created_at` (timestamptz)
  
  - `campaigns` - AI message generation campaigns
    - `id` (uuid, primary key)
    - `workspace_id` (uuid, foreign key)
    - `name` (text) - Campaign name
    - `description` (text)
    - `offer_context` (text) - Product/service context
    - `tone` (text) - Tone of voice (formal, casual, friendly, etc)
    - `prompt_template` (text) - Custom prompt template
    - `is_active` (boolean)
    - `created_at` (timestamptz)
  
  - `generated_messages` - AI-generated messages log
    - `id` (uuid, primary key)
    - `lead_id` (uuid, foreign key)
    - `campaign_id` (uuid, foreign key)
    - `message_text` (text)
    - `variation_number` (integer) - 1, 2, or 3
    - `was_sent` (boolean)
    - `sent_at` (timestamptz, nullable)
    - `created_at` (timestamptz)
  
  - `activity_logs` - Activity history tracking
    - `id` (uuid, primary key)
    - `workspace_id` (uuid, foreign key)
    - `lead_id` (uuid, foreign key, nullable)
    - `user_id` (uuid, foreign key to auth.users)
    - `action` (text) - Type of action
    - `details` (jsonb) - Action details
    - `created_at` (timestamptz)
  
  ## 2. Security
  - Enable RLS on all tables
  - Policies based on workspace membership
  - Users can only access data from their workspaces
  
  ## 3. Indexes
  - Performance indexes on foreign keys and frequently queried fields
*/

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create pipeline_stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  required_fields jsonb DEFAULT '[]'::jsonb,
  auto_campaign_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  position text,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  score integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create custom_fields table
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select')),
  options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create lead_custom_values table
CREATE TABLE IF NOT EXISTS lead_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  custom_field_id uuid REFERENCES custom_fields(id) ON DELETE CASCADE NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, custom_field_id)
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  offer_context text NOT NULL,
  tone text DEFAULT 'professional',
  prompt_template text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create generated_messages table
CREATE TABLE IF NOT EXISTS generated_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  message_text text NOT NULL,
  variation_number integer NOT NULL CHECK (variation_number BETWEEN 1 AND 3),
  was_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for auto_campaign_id (after campaigns table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pipeline_stages_auto_campaign_id_fkey'
  ) THEN
    ALTER TABLE pipeline_stages 
    ADD CONSTRAINT pipeline_stages_auto_campaign_id_fkey 
    FOREIGN KEY (auto_campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_workspace ON pipeline_stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace ON custom_fields(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_values_lead ON lead_custom_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_lead ON generated_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead ON activity_logs(lead_id);

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_custom_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update their workspaces"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  );

-- RLS Policies for workspace_members
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join workspaces they create"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage workspace members"
  ON workspace_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'admin'
    )
  );

-- RLS Policies for pipeline_stages
CREATE POLICY "Users can view pipeline stages in their workspace"
  ON pipeline_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = pipeline_stages.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create pipeline stages"
  ON pipeline_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = pipeline_stages.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Members can update pipeline stages"
  ON pipeline_stages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = pipeline_stages.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = pipeline_stages.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admins can delete pipeline stages"
  ON pipeline_stages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = pipeline_stages.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  );

-- RLS Policies for leads
CREATE POLICY "Users can view leads in their workspace"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = leads.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = leads.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Members can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = leads.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = leads.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Members can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = leads.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

-- RLS Policies for custom_fields
CREATE POLICY "Users can view custom fields in their workspace"
  ON custom_fields FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = custom_fields.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage custom fields"
  ON custom_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = custom_fields.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

-- RLS Policies for lead_custom_values
CREATE POLICY "Users can view custom values for leads in their workspace"
  ON lead_custom_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN workspace_members ON workspace_members.workspace_id = leads.workspace_id
      WHERE leads.id = lead_custom_values.lead_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage custom values"
  ON lead_custom_values FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN workspace_members ON workspace_members.workspace_id = leads.workspace_id
      WHERE leads.id = lead_custom_values.lead_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

-- RLS Policies for campaigns
CREATE POLICY "Users can view campaigns in their workspace"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = campaigns.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = campaigns.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

-- RLS Policies for generated_messages
CREATE POLICY "Users can view messages for leads in their workspace"
  ON generated_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN workspace_members ON workspace_members.workspace_id = leads.workspace_id
      WHERE leads.id = generated_messages.lead_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create messages"
  ON generated_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      JOIN workspace_members ON workspace_members.workspace_id = leads.workspace_id
      WHERE leads.id = generated_messages.lead_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Members can update messages"
  ON generated_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN workspace_members ON workspace_members.workspace_id = leads.workspace_id
      WHERE leads.id = generated_messages.lead_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      JOIN workspace_members ON workspace_members.workspace_id = leads.workspace_id
      WHERE leads.id = generated_messages.lead_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view activity logs in their workspace"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = activity_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = activity_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('admin', 'member')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();