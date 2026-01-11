import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Users, TrendingUp, MessageSquare, Target, Loader2 } from 'lucide-react';

interface DashboardStats {
  totalLeads: number;
  leadsThisMonth: number;
  messagesGenerated: number;
  conversionRate: number;
  stageDistribution: { stage: string; count: number; color: string }[];
  recentActivity: Array<{
    id: string;
    action: string;
    lead_name?: string;
    created_at: string;
  }>;
}

export function Dashboard() {
  const { currentWorkspace } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      loadStats();
    }
  }, [currentWorkspace]);

  const loadStats = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);

      const [leadsResult, messagesResult, stagesResult, activityResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id, created_at')
          .eq('workspace_id', currentWorkspace.id),
        supabase
          .from('generated_messages')
          .select('id, lead_id')
          .in('lead_id', (await supabase
            .from('leads')
            .select('id')
            .eq('workspace_id', currentWorkspace.id)
          ).data?.map(l => l.id) || []),
        supabase
          .from('leads')
          .select('stage_id, pipeline_stages(name, color)')
          .eq('workspace_id', currentWorkspace.id),
        supabase
          .from('activity_logs')
          .select('id, action, lead_id, created_at, leads(name)')
          .eq('workspace_id', currentWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const leads = leadsResult.data || [];
      const messages = messagesResult.data || [];

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const leadsThisMonth = leads.filter(
        l => new Date(l.created_at) >= firstDayOfMonth
      ).length;

      const stageMap = new Map<string, { count: number; color: string }>();
      stagesResult.data?.forEach((lead: any) => {
        if (lead.pipeline_stages) {
          const stageName = lead.pipeline_stages.name;
          const stageColor = lead.pipeline_stages.color;
          const existing = stageMap.get(stageName);
          stageMap.set(stageName, {
            count: (existing?.count || 0) + 1,
            color: stageColor
          });
        }
      });

      const stageDistribution = Array.from(stageMap.entries()).map(([stage, data]) => ({
        stage,
        count: data.count,
        color: data.color
      }));

      const closedLeads = stageDistribution.find(s => s.stage === 'Fechado')?.count || 0;
      const conversionRate = leads.length > 0 ? (closedLeads / leads.length) * 100 : 0;

      const recentActivity = activityResult.data?.map((activity: any) => ({
        id: activity.id,
        action: activity.action,
        lead_name: activity.leads?.name,
        created_at: activity.created_at
      })) || [];

      setStats({
        totalLeads: leads.length,
        leadsThisMonth,
        messagesGenerated: messages.length,
        conversionRate,
        stageDistribution,
        recentActivity
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (action: string) => {
    const actions: Record<string, string> = {
      lead_created: 'Lead criado',
      lead_updated: 'Lead atualizado',
      stage_changed: 'Etapa alterada',
      message_generated: 'Mensagem gerada'
    };
    return actions[action] || action;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Há alguns minutos';
    if (diffInHours < 24) return `Há ${diffInHours}h`;
    if (diffInHours < 48) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Visão geral do seu funil de vendas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total de Leads</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalLeads}</p>
            <p className="text-sm text-green-600 mt-2">
              +{stats.leadsThisMonth} este mês
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Taxa de Conversão</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.conversionRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Do total de leads
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Mensagens Geradas</p>
            <p className="text-3xl font-bold text-gray-900">{stats.messagesGenerated}</p>
            <p className="text-sm text-gray-500 mt-2">
              Com IA
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Leads Ativos</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalLeads - (stats.stageDistribution.find(s => s.stage === 'Fechado')?.count || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              No funil
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Etapa</h3>
          {stats.stageDistribution.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum lead cadastrado ainda</p>
          ) : (
            <div className="space-y-4">
              {stats.stageDistribution.map((stage, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                    </div>
                    <span className="text-sm text-gray-600">{stage.count} leads</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(stage.count / stats.totalLeads) * 100}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h3>
          {stats.recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
                  <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {formatAction(activity.action)}
                      {activity.lead_name && (
                        <span className="font-medium"> - {activity.lead_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
