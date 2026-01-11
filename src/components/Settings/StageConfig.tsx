import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PipelineStage, CustomField } from '../../types';
import { Loader2, Settings, Save } from 'lucide-react';

export function StageConfig() {
  const { currentWorkspace } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);

      const [stagesData, fieldsData] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('position'),
        supabase
          .from('custom_fields')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
      ]);

      if (stagesData.error) throw stagesData.error;
      if (fieldsData.error) throw fieldsData.error;

      setStages(stagesData.data || []);
      setCustomFields(fieldsData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageSelect = (stage: PipelineStage) => {
    setSelectedStage(stage);
    setSelectedFields(stage.required_fields || []);
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedStage) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ required_fields: selectedFields })
        .eq('id', selectedStage.id);

      if (error) throw error;

      alert('Configuração salva com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error saving stage config:', error);
      alert('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const standardFields = [
    { id: 'name', label: 'Nome' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Telefone' },
    { id: 'company', label: 'Empresa' },
    { id: 'position', label: 'Cargo' },
    { id: 'lead_source', label: 'Origem do Lead' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Configuração de Etapas</h2>
        <p className="text-gray-600 mt-1">
          Configure campos obrigatórios para cada etapa do funil
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Etapas do Funil
          </h3>
          <div className="space-y-2">
            {stages.map(stage => (
              <button
                key={stage.id}
                onClick={() => handleStageSelect(stage)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  selectedStage?.id === stage.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="font-medium text-gray-900">{stage.name}</span>
                </div>
                {stage.required_fields && stage.required_fields.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {stage.required_fields.length} campo(s) obrigatório(s)
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {selectedStage ? (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Campos Obrigatórios: {selectedStage.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Selecione os campos que devem ser preenchidos antes que um lead possa entrar nesta etapa
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Campos Padrão</h4>
                  <div className="space-y-2">
                    {standardFields.map(field => (
                      <label
                        key={field.id}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.id)}
                          onChange={() => handleFieldToggle(field.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-900">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Campos Personalizados</h4>
                    <div className="space-y-2">
                      {customFields.map(field => (
                        <label
                          key={field.id}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.id)}
                            onChange={() => handleFieldToggle(field.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-gray-900">{field.name}</span>
                          <span className="text-xs text-gray-500">({field.field_type})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar Configuração
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Settings className="w-12 h-12 mb-4 text-gray-400" />
              <p>Selecione uma etapa para configurar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
