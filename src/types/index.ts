export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface PipelineStage {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  position: number;
  required_fields: string[];
  auto_campaign_id?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  lead_source?: string;
  stage_id?: string;
  assigned_to?: string;
  score: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  workspace_id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'select';
  options: string[];
  created_at: string;
}

export interface LeadCustomValue {
  id: string;
  lead_id: string;
  custom_field_id: string;
  value: string;
  created_at: string;
}

export interface Campaign {
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

export interface GeneratedMessage {
  id: string;
  lead_id: string;
  campaign_id: string;
  message_text: string;
  variation_number: number;
  was_sent: boolean;
  sent_at?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  lead_id?: string;
  user_id?: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface LeadWithStage extends Lead {
  stage?: PipelineStage;
  custom_values?: (LeadCustomValue & { custom_field?: CustomField })[];
  assigned_member?: WorkspaceMember & { user_email?: string };
}
