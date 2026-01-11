import { LeadWithStage } from '../../types';
import { Mail, Phone, Building2, Star, User, Tag } from 'lucide-react';

interface LeadCardProps {
  lead: LeadWithStage;
  onDragStart: (lead: LeadWithStage) => void;
  onEdit: (lead: LeadWithStage) => void;
}

export function LeadCard({ lead, onDragStart, onEdit }: LeadCardProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead)}
      onClick={() => onEdit(lead)}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex-1">{lead.name}</h4>
        {lead.score > 0 && (
          <div className="flex items-center gap-1 text-yellow-600 text-sm">
            <Star className="w-4 h-4 fill-current" />
            <span>{lead.score}</span>
          </div>
        )}
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        {lead.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.company && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}
        {lead.lead_source && (
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="truncate">{lead.lead_source}</span>
          </div>
        )}
        {lead.assigned_member && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="truncate">{lead.assigned_member.user_email || 'Responsável'}</span>
          </div>
        )}
      </div>

      {lead.notes && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{lead.notes}</p>
      )}
    </div>
  );
}
