import { useState } from 'react';
import { CustomFields } from './CustomFields';
import { StageConfig } from './StageConfig';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'fields' | 'stages'>('fields');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurações</h2>
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('fields')}
              className={`pb-4 px-2 font-medium text-sm transition border-b-2 ${
                activeTab === 'fields'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Campos Personalizados
            </button>
            <button
              onClick={() => setActiveTab('stages')}
              className={`pb-4 px-2 font-medium text-sm transition border-b-2 ${
                activeTab === 'stages'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuração de Etapas
            </button>
          </nav>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'fields' && <CustomFields />}
        {activeTab === 'stages' && <StageConfig />}
      </div>
    </div>
  );
}
