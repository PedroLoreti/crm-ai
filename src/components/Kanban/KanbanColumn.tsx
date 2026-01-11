import { PipelineStage, LeadWithStage } from '../../types';
import { LeadCard } from './LeadCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: LeadWithStage[];
  onDragStart: (lead: LeadWithStage) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (stageId: string) => void;
  onAddLead: (stageId: string) => void;
  onEditLead: (lead: LeadWithStage) => void;
}

export function KanbanColumn({
  stage,
  leads,
  onDragStart,
  onDragOver,
  onDrop,
  onAddLead,
  onEditLead
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <button
          onClick={() => onAddLead(stage.id)}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Adicionar lead"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div
        onDragOver={onDragOver}
        onDrop={() => onDrop(stage.id)}
        className="space-y-3 min-h-[200px]"
      >
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onEdit={onEditLead}
          />
        ))}
      </div>
    </div>
  );
}
