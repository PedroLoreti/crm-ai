import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Campaign, PipelineStage } from '../../types';
import { X, Loader2 } from 'lucide-react';

interface CampaignModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: () => void;
}

export function CampaignModal({ campaign, onClose, onSave }: CampaignModalProps) {
  const { currentWorkspace } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    offer_context: campaign?.offer_context || '',
    tone: campaign?.tone || 'professional',
    prompt_template: campaign?.prompt_template || '',
    is_active: campaign?.is_active ?? true,
  });

  useEffect(() => {
    if (currentWorkspace) {
      loadStages();
    }
  }, [currentWorkspace]);

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

      if (campaign) {
        const stageWithCampaign = data?.find(s => s.auto_campaign_id === campaign.id);
        if (stageWithCampaign) {
          setSelectedStageId(stageWithCampaign.id);
        }
      }
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    setLoading(true);

    try {
      let campaignId = campaign?.id;

      if (campaign) {
        const { error } = await supabase
          .from('campaigns')
          .update(formData)
          .eq('id', campaign.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert([{
            ...formData,
            workspace_id: currentWorkspace.id
          }])
          .select()
          .single();

        if (error) throw error;
        campaignId = data.id;
      }

      const stagesToUpdate = stages.filter(s => s.auto_campaign_id === campaignId);
      for (const stage of stagesToUpdate) {
        await supabase
          .from('pipeline_stages')
          .update({ auto_campaign_id: null })
          .eq('id', stage.id);
      }

      if (selectedStageId) {
        const { error: stageError } = await supabase
          .from('pipeline_stages')
          .update({ auto_campaign_id: campaignId })
          .eq('id', selectedStageId);

        if (stageError) throw stageError;
      }

      onSave();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Erro ao salvar campanha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {campaign ? 'Editar Campanha' : 'Nova Campanha'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Campanha *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Campanha de Outbound Q1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Breve descrição da campanha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contexto da Oferta *
            </label>
            <textarea
              value={formData.offer_context}
              onChange={(e) => setFormData({ ...formData, offer_context: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descreva o produto/serviço, benefícios principais, diferenciais, público-alvo, etc."
            />
            <p className="text-xs text-gray-500 mt-1">
              Quanto mais detalhes, melhor a IA irá personalizar as mensagens
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tom de Voz
            </label>
            <select
              value={formData.tone}
              onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="professional">Profissional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Amigável</option>
              <option value="formal">Formal</option>
              <option value="enthusiastic">Entusiasta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template de Prompt (Opcional)
            </label>
            <textarea
              value={formData.prompt_template}
              onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Use variáveis: {{name}}, {{company}}, {{position}}, {{email}}, {{phone}}"
            />
            <p className="text-xs text-gray-500 mt-1">
              Deixe em branco para usar o template padrão
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etapa Gatilho (Opcional)
            </label>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Nenhuma - geração manual apenas</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Quando um lead entrar nesta etapa, mensagens serão geradas automaticamente
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Campanha ativa
            </label>
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
