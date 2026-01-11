import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Campaign, LeadWithStage, GeneratedMessage, PipelineStage } from '../../types';
import { X, Loader2, Sparkles, Copy, Check, Send } from 'lucide-react';

interface MessageGeneratorModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export function MessageGeneratorModal({ campaign, onClose }: MessageGeneratorModalProps) {
  const { currentWorkspace } = useAuth();
  const [leads, setLeads] = useState<LeadWithStage[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadWithStage | null>(null);
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      loadLeads();
      loadStages();
    }
  }, [currentWorkspace]);

  const loadLeads = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStages = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('position');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedLead) return;

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
          lead_id: selectedLead.id,
          campaign_id: campaign.id
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

  const handleSend = async (message: GeneratedMessage) => {
    if (!selectedLead || !currentWorkspace) return;

    setSending(true);

    try {
      const tentandoContatoStage = stages.find(s => s.name === 'Tentando Contato');

      if (!tentandoContatoStage) {
        alert('Etapa "Tentando Contato" não encontrada. Por favor, crie esta etapa primeiro.');
        return;
      }

      const { error: leadError } = await supabase
        .from('leads')
        .update({
          stage_id: tentandoContatoStage.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id);

      if (leadError) throw leadError;

      const { error: messageError } = await supabase
        .from('generated_messages')
        .update({
          was_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (messageError) throw messageError;

      await supabase
        .from('activity_logs')
        .insert({
          workspace_id: currentWorkspace.id,
          lead_id: selectedLead.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'message_sent',
          details: {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            message_id: message.id,
            moved_to_stage: tentandoContatoStage.name
          }
        });

      alert('Mensagem marcada como enviada e lead movido para "Tentando Contato"!');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gerar Mensagens com IA</h2>
            <p className="text-sm text-gray-600 mt-1">Campanha: {campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione um Lead
            </label>
            <select
              value={selectedLead?.id || ''}
              onChange={(e) => {
                const lead = leads.find(l => l.id === e.target.value);
                setSelectedLead(lead || null);
                setMessages([]);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Selecione um lead...</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} {lead.company ? `- ${lead.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedLead && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Informações do Lead</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Nome:</span>
                  <span className="ml-2 text-gray-900">{selectedLead.name}</span>
                </div>
                {selectedLead.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 text-gray-900">{selectedLead.email}</span>
                  </div>
                )}
                {selectedLead.company && (
                  <div>
                    <span className="text-gray-500">Empresa:</span>
                    <span className="ml-2 text-gray-900">{selectedLead.company}</span>
                  </div>
                )}
                {selectedLead.position && (
                  <div>
                    <span className="text-gray-500">Cargo:</span>
                    <span className="ml-2 text-gray-900">{selectedLead.position}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!selectedLead || generating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Mensagens Geradas</h3>
              {messages.map((message, index) => (
                <div key={message.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Variação {message.variation_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(message.id, message.message_text)}
                        className="text-gray-500 hover:text-gray-700 transition flex items-center gap-1 text-sm px-3 py-1 border border-gray-300 rounded-lg"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleSend(message)}
                        disabled={sending || message.was_sent}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {message.was_sent ? 'Enviada' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{message.message_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
