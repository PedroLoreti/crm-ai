import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Campaign } from '../../types';
import { Plus, Sparkles, Edit2, Loader2, MessageSquare } from 'lucide-react';
import { CampaignModal } from './CampaignModal';
import { MessageGeneratorModal } from './MessageGeneratorModal';

export function CampaignsList() {
  const { currentWorkspace } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorCampaign, setGeneratorCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      loadCampaigns();
    }
  }, [currentWorkspace]);

  const loadCampaigns = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleGenerate = (campaign: Campaign) => {
    setGeneratorCampaign(campaign);
    setIsGeneratorOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleSave = () => {
    loadCampaigns();
    handleCloseModal();
  };

  const toggleActive = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id);

      if (error) throw error;
      loadCampaigns();
    } catch (error) {
      console.error('Error toggling campaign:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campanhas de IA</h2>
          <p className="text-gray-600 mt-1">Configure contextos para gerar mensagens personalizadas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-5 h-5" />
          Nova Campanha
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma campanha criada ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Crie sua primeira campanha para começar a gerar mensagens com IA.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(campaign)}
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        campaign.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {campaign.is_active ? 'Ativa' : 'Inativa'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-500">Tom: </span>
                    <span className="text-gray-900 font-medium">{campaign.tone}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Contexto: </span>
                    <p className="text-gray-700 line-clamp-2 mt-1">{campaign.offer_context}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerate(campaign)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Gerar Mensagens
                  </button>
                  <button
                    onClick={() => handleEdit(campaign)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <CampaignModal
          campaign={selectedCampaign}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      {isGeneratorOpen && generatorCampaign && (
        <MessageGeneratorModal
          campaign={generatorCampaign}
          onClose={() => setIsGeneratorOpen(false)}
        />
      )}
    </div>
  );
}
