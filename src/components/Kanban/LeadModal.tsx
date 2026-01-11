import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { LeadWithStage, PipelineStage, CustomField, WorkspaceMember, Campaign, GeneratedMessage } from '../../types';
import { X, Loader2, Sparkles, Copy, Check, Send } from 'lucide-react';

interface LeadModalProps {
  lead: LeadWithStage | null;
  stageId?: string;
  stages: PipelineStage[];
  customFields: CustomField[];
  workspaceMembers: (WorkspaceMember & { user_email?: string })[];
  onClose: () => void;
  onSave: () => void;
}

export function LeadModal({ lead, stageId, stages, customFields, workspaceMembers, onClose, onSave }: LeadModalProps) {
  const { currentWorkspace } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    position: lead?.position || '',
    lead_source: lead?.lead_source || '',
    stage_id: stageId || lead?.stage_id || stages[0]?.id || '',
    assigned_to: lead?.assigned_to || '',
    score: lead?.score || 0,
    notes: lead?.notes || '',
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMessageGenerator, setShowMessageGenerator] = useState(false);

  useEffect(() => {
    if (lead?.custom_values) {
      const values: Record<string, string> = {};
      lead.custom_values.forEach(cv => {
        values[cv.custom_field_id] = cv.value;
      });
      setCustomValues(values);
    }
  }, [lead]);

  useEffect(() => {
    if (lead && currentWorkspace) {
      loadCampaigns();
      loadExistingMessages();
    }
  }, [lead, currentWorkspace]);

  const loadCampaigns = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadExistingMessages = async () => {
    if (!lead) return;

    try {
      const { data, error } = await supabase
        .from('generated_messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleGenerateMessages = async () => {
    if (!lead || !selectedCampaignId) return;

    setGenerating(true);
    setMessages([]);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          campaign_id: selectedCampaignId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar mensagens');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error: any) {
      console.error('Error generating messages:', error);
      alert(error.message || 'Erro ao gerar mensagens. Verifique se a API de IA está configurada.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleSendMessage = async (message: GeneratedMessage) => {
    if (!lead || !currentWorkspace) return;

    setSending(true);

    try {
      const tentandoContatoStage = stages.find(s => s.name === 'Tentando Contato');

      if (!tentandoContatoStage) {
        alert('Etapa "Tentando Contato" não encontrada. Por favor, crie esta etapa primeiro.');
        setSending(false);
        return;
      }

      const { error: leadError } = await supabase
        .from('leads')
        .update({
          stage_id: tentandoContatoStage.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      const { error: messageError } = await supabase
        .from('generated_messages')
        .update({
          was_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (messageError) throw messageError;

      const campaign = campaigns.find(c => c.id === message.campaign_id);

      await supabase
        .from('activity_logs')
        .insert({
          workspace_id: currentWorkspace.id,
          lead_id: lead.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'message_sent',
          details: {
            campaign_id: message.campaign_id,
            campaign_name: campaign?.name || 'Campanha',
            message_id: message.id,
            moved_to_stage: tentandoContatoStage.name
          }
        });

      alert('Mensagem marcada como enviada e lead movido para "Tentando Contato"!');
      onSave();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    setLoading(true);

    try {
      let leadId = lead?.id;

      if (lead) {
        const { error } = await supabase
          .from('leads')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert([{
            ...formData,
            workspace_id: currentWorkspace.id
          }])
          .select()
          .single();

        if (error) throw error;
        leadId = data.id;
      }

      for (const [fieldId, value] of Object.entries(customValues)) {
        if (value) {
          await supabase
            .from('lead_custom_values')
            .upsert({
              lead_id: leadId,
              custom_field_id: fieldId,
              value
            }, {
              onConflict: 'lead_id,custom_field_id'
            });
        }
      }

      await supabase
        .from('activity_logs')
        .insert({
          workspace_id: currentWorkspace.id,
          lead_id: leadId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: lead ? 'lead_updated' : 'lead_created',
          details: formData
        });

      onSave();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Erro ao salvar lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cargo
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Origem do Lead
              </label>
              <input
                type="text"
                value={formData.lead_source}
                onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                placeholder="Ex: Website, Indicação, LinkedIn"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etapa
              </label>
              <select
                value={formData.stage_id}
                onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsável
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Nenhum</option>
                {workspaceMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.user_email || `Membro ${member.id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score
              </label>
              <input
                type="number"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {customFields.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campos Personalizados</h3>
              <div className="grid grid-cols-2 gap-4">
                {customFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.name}
                    </label>
                    {field.field_type === 'select' ? (
                      <select
                        value={customValues[field.id] || ''}
                        onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione...</option>
                        {field.options.map((option, i) => (
                          <option key={i} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                        value={customValues[field.id] || ''}
                        onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lead && campaigns.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Gerador de Mensagens com IA
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMessageGenerator(!showMessageGenerator)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showMessageGenerator ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showMessageGenerator && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecione uma Campanha
                    </label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma campanha...</option>
                      {campaigns.map(campaign => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateMessages}
                    disabled={!selectedCampaignId || generating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando mensagens...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Gerar 3 Variações de Mensagem
                      </>
                    )}
                  </button>

                  {messages.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Mensagens Geradas</h4>
                      {messages.slice(0, 3).map((message) => (
                        <div key={message.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">
                              Variação {message.variation_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopy(message.id, message.message_text)}
                                className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 border border-gray-300 rounded flex items-center gap-1"
                              >
                                {copiedId === message.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-green-600" />
                                    <span className="text-green-600">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copiar
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendMessage(message)}
                                disabled={sending || message.was_sent}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1 disabled:opacity-50"
                              >
                                <Send className="w-3 h-3" />
                                {message.was_sent ? 'Enviada' : 'Enviar'}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.message_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
