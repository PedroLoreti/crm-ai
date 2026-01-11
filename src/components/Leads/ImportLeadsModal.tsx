import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { X, Upload, FileJson, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportLeadsModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

export function ImportLeadsModal({ onClose, onImportComplete }: ImportLeadsModalProps) {
  const { currentWorkspace } = useAuth();
  const [importType, setImportType] = useState<'json' | 'csv'>('json');
  const [fileContent, setFileContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [showExample, setShowExample] = useState(false);

  const jsonExample = `[
  {
    "name": "João Silva",
    "email": "joao@empresa.com",
    "phone": "+55 11 98765-4321",
    "company": "Empresa ABC",
    "position": "CEO",
    "lead_source": "Website",
    "score": 85,
    "notes": "Lead qualificado, demonstrou interesse"
  },
  {
    "name": "Maria Santos",
    "email": "maria@tech.com",
    "phone": "+55 21 99876-5432",
    "company": "Tech Solutions",
    "position": "CTO",
    "lead_source": "LinkedIn",
    "score": 90
  }
]`;

  const csvExample = `name,email,phone,company,position,lead_source,score,notes
"João Silva","joao@empresa.com","+55 11 98765-4321","Empresa ABC","CEO","Website",85,"Lead qualificado"
"Maria Santos","maria@tech.com","+55 21 99876-5432","Tech Solutions","CTO","LinkedIn",90,""`;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string): any[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const leads = [];

    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let currentValue = '';
      let insideQuotes = false;

      for (let char of lines[i]) {
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      const lead: any = {};
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/^"|"$/g, '') || '';
        if (value) {
          if (header === 'score') {
            lead[header] = parseInt(value) || null;
          } else {
            lead[header] = value;
          }
        }
      });

      if (lead.name) {
        leads.push(lead);
      }
    }

    return leads;
  };

  const validateLead = (lead: any, index: number): ImportError[] => {
    const errors: ImportError[] = [];

    if (!lead.name || lead.name.trim() === '') {
      errors.push({
        row: index + 1,
        field: 'name',
        message: 'Nome é obrigatório'
      });
    }

    if (lead.email && !lead.email.includes('@')) {
      errors.push({
        row: index + 1,
        field: 'email',
        message: 'Email inválido'
      });
    }

    if (lead.score && (isNaN(lead.score) || lead.score < 0 || lead.score > 100)) {
      errors.push({
        row: index + 1,
        field: 'score',
        message: 'Score deve ser um número entre 0 e 100'
      });
    }

    return errors;
  };

  const handleImport = async () => {
    if (!fileContent.trim()) {
      alert('Por favor, insira ou carregue os dados para importar');
      return;
    }

    setImporting(true);
    setErrors([]);
    setSuccessCount(0);

    try {
      let leads: any[] = [];

      if (importType === 'json') {
        leads = JSON.parse(fileContent);
        if (!Array.isArray(leads)) {
          throw new Error('O JSON deve conter um array de leads');
        }
      } else {
        leads = parseCSV(fileContent);
      }

      const allErrors: ImportError[] = [];
      leads.forEach((lead, index) => {
        const leadErrors = validateLead(lead, index);
        allErrors.push(...leadErrors);
      });

      if (allErrors.length > 0) {
        setErrors(allErrors);
        setImporting(false);
        return;
      }

      const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('workspace_id', currentWorkspace?.id)
        .order('position')
        .limit(1)
        .single();

      if (!firstStage) {
        alert('Erro: Nenhum estágio encontrado no funil. Configure os estágios primeiro.');
        setImporting(false);
        return;
      }

      const leadsToInsert = leads.map(lead => ({
        workspace_id: currentWorkspace?.id,
        stage_id: firstStage.id,
        name: lead.name,
        email: lead.email || null,
        phone: lead.phone || null,
        company: lead.company || null,
        position: lead.position || null,
        lead_source: lead.lead_source || null,
        score: lead.score || null,
        notes: lead.notes || null,
      }));

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (error) throw error;

      setSuccessCount(data?.length || 0);

      await supabase.from('activity_logs').insert({
        workspace_id: currentWorkspace?.id,
        action: 'leads_imported',
        details: {
          count: data?.length || 0,
          format: importType
        }
      });

      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Erro ao importar: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Importar Leads</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato de Importação
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setImportType('json')}
                  className={`flex-1 p-4 border-2 rounded-lg transition ${
                    importType === 'json'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileJson className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <div className="font-medium">JSON</div>
                  <div className="text-sm text-gray-500">Array de objetos</div>
                </button>
                <button
                  onClick={() => setImportType('csv')}
                  className={`flex-1 p-4 border-2 rounded-lg transition ${
                    importType === 'csv'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <div className="font-medium">CSV</div>
                  <div className="text-sm text-gray-500">Valores separados por vírgula</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carregar Arquivo
              </label>
              <input
                type="file"
                accept={importType === 'json' ? '.json' : '.csv'}
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cole ou edite os dados aqui
                </label>
                <button
                  onClick={() => setShowExample(!showExample)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showExample ? 'Ocultar' : 'Ver'} exemplo
                </button>
              </div>

              {showExample && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Exemplo de formato {importType.toUpperCase()}:
                  </div>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {importType === 'json' ? jsonExample : csvExample}
                  </pre>
                  <div className="mt-3 text-xs text-gray-600">
                    <strong>Campos disponíveis:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><strong>name</strong> (obrigatório) - Nome do lead</li>
                      <li><strong>email</strong> - Email do lead</li>
                      <li><strong>phone</strong> - Telefone</li>
                      <li><strong>company</strong> - Nome da empresa</li>
                      <li><strong>position</strong> - Cargo</li>
                      <li><strong>lead_source</strong> - Origem do lead</li>
                      <li><strong>score</strong> - Pontuação (0-100)</li>
                      <li><strong>notes</strong> - Observações</li>
                    </ul>
                  </div>
                </div>
              )}

              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder={`Cole seus dados em formato ${importType.toUpperCase()} aqui...`}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                  <AlertCircle className="w-5 h-5" />
                  Erros encontrados na importação:
                </div>
                <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {errors.slice(0, 10).map((error, index) => (
                    <li key={index}>
                      Linha {error.row}, campo "{error.field}": {error.message}
                    </li>
                  ))}
                  {errors.length > 10 && (
                    <li className="font-medium">
                      ... e mais {errors.length - 10} erro(s)
                    </li>
                  )}
                </ul>
              </div>
            )}

            {successCount > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  {successCount} lead(s) importado(s) com sucesso!
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !fileContent.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar Leads
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
