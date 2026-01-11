import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PipelineStage, LeadWithStage, CustomField, LeadCustomValue, WorkspaceMember } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { Plus, Loader2 } from 'lucide-react';
import { LeadModal } from './LeadModal';

export function KanbanBoard() {
  const { currentWorkspace } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<LeadWithStage[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<(WorkspaceMember & { user_email?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<LeadWithStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithStage | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>();

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);

      const [stagesData, leadsData, fieldsData, membersData] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('position'),
        supabase
          .from('leads')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('custom_fields')
          .select('*')
          .eq('workspace_id', currentWorkspace.id),
        supabase
          .rpc('get_workspace_members_with_email', { workspace_uuid: currentWorkspace.id })
      ]);

      if (stagesData.error) throw stagesData.error;
      if (leadsData.error) throw leadsData.error;
      if (fieldsData.error) throw fieldsData.error;
      if (membersData.error) throw membersData.error;

      setStages(stagesData.data || []);
      setCustomFields(fieldsData.data || []);
      setWorkspaceMembers(membersData.data || []);

      const leadIds = leadsData.data?.map(l => l.id) || [];

      if (leadIds.length > 0) {
        const { data: customValues } = await supabase
          .from('lead_custom_values')
          .select('*, custom_fields(*)')
          .in('lead_id', leadIds);

        const leadsWithData = leadsData.data?.map(lead => ({
          ...lead,
          stage: stagesData.data?.find(s => s.id === lead.stage_id),
          custom_values: customValues?.filter(cv => cv.lead_id === lead.id) || [],
          assigned_member: lead.assigned_to
            ? membersData.data?.find(m => m.id === lead.assigned_to)
            : undefined
        })) || [];

        setLeads(leadsWithData);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (lead: LeadWithStage) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stageId: string) => {
    if (!draggedLead || !currentWorkspace) return;

    const targetStage = stages.find(s => s.id === stageId);
    if (!targetStage) return;

    if (targetStage.required_fields && targetStage.required_fields.length > 0) {
      const leadCustomValues = leads.find(l => l.id === draggedLead.id)?.custom_values || [];
      const missingFields = targetStage.required_fields.filter(fieldId => {
        const value = leadCustomValues.find(cv => cv.custom_field_id === fieldId);
        return !value || !value.value;
      });

      if (missingFields.length > 0) {
        const fieldNames = missingFields
          .map(fieldId => customFields.find(f => f.id === fieldId)?.name)
          .filter(Boolean)
          .join(', ');

        alert(`Não é possível mover o lead. Campos obrigatórios faltando: ${fieldNames}`);
        setDraggedLead(null);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          stage_id: stageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggedLead.id);

      if (error) throw error;

      if (targetStage.auto_campaign_id) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lead_id: draggedLead.id,
            campaign_id: targetStage.auto_campaign_id
          })
        });
      }

      await supabase
        .from('activity_logs')
        .insert({
          workspace_id: currentWorkspace.id,
          lead_id: draggedLead.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'stage_changed',
          details: {
            from_stage: draggedLead.stage_id,
            to_stage: stageId
          }
        });

      loadData();
    } catch (error) {
      console.error('Error moving lead:', error);
      alert('Erro ao mover o lead');
    } finally {
      setDraggedLead(null);
    }
  };

  const handleAddLead = (stageId?: string) => {
    setSelectedLead(null);
    setSelectedStageId(stageId);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: LeadWithStage) => {
    setSelectedLead(lead);
    setSelectedStageId(lead.stage_id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
    setSelectedStageId(undefined);
  };

  const handleSaveLead = async () => {
    await loadData();
    handleCloseModal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Funil de Vendas</h2>
        <button
          onClick={() => handleAddLead()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-5 h-5" />
          Novo Lead
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leads.filter(lead => lead.stage_id === stage.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onAddLead={handleAddLead}
              onEditLead={handleEditLead}
            />
          ))}
        </div>
      </div>

      {isModalOpen && (
        <LeadModal
          lead={selectedLead}
          stageId={selectedStageId}
          stages={stages}
          customFields={customFields}
          workspaceMembers={workspaceMembers}
          onClose={handleCloseModal}
          onSave={handleSaveLead}
        />
      )}
    </div>
  );
}
