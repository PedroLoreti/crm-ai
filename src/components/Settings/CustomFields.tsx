import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CustomField } from '../../types';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';

export function CustomFields() {
  const { currentWorkspace } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    field_type: 'text' as 'text' | 'number' | 'date' | 'select',
    options: [] as string[],
  });
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      loadFields();
    }
  }, [currentWorkspace]);

  const loadFields = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('custom_fields')
        .insert([{
          workspace_id: currentWorkspace.id,
          name: formData.name,
          field_type: formData.field_type,
          options: formData.options
        }]);

      if (error) throw error;

      loadFields();
      setIsModalOpen(false);
      setFormData({ name: '', field_type: 'text', options: [] });
    } catch (error) {
      console.error('Error creating custom field:', error);
      alert('Erro ao criar campo personalizado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return;

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadFields();
    } catch (error) {
      console.error('Error deleting custom field:', error);
      alert('Erro ao excluir campo');
    }
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()]
      });
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
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
          <h2 className="text-2xl font-bold text-gray-900">Campos Personalizados</h2>
          <p className="text-gray-600 mt-1">Crie campos customizados para seus leads</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-5 h-5" />
          Novo Campo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {fields.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Nenhum campo personalizado criado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {fields.map(field => (
              <div key={field.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{field.name}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {field.field_type}
                    </span>
                  </div>
                  {field.field_type === 'select' && field.options.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Opções: {field.options.join(', ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(field.id)}
                  className="text-red-600 hover:text-red-700 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Novo Campo</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Campo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Orçamento, Interesse, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Campo *
                </label>
                <select
                  value={formData.field_type}
                  onChange={(e) => setFormData({ ...formData, field_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="date">Data</option>
                  <option value="select">Seleção</option>
                </select>
              </div>

              {formData.field_type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opções
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite uma opção"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-sm text-gray-700">{option}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Criando...' : 'Criar Campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
