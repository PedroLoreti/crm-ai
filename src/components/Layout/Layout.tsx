import { useState, ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Trello,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Users
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { currentWorkspace, workspaces, workspaceMember, signOut, switchWorkspace } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Funil de Vendas', icon: Trello },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'campaigns', label: 'Campanhas de IA', icon: Sparkles },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await switchWorkspace(workspaceId);
      setWorkspaceMenuOpen(false);
    } catch (error) {
      console.error('Error switching workspace:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-blue-600">CRM AI</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {currentWorkspace?.name}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </button>

              {workspaceMenuOpen && workspaces.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => handleSwitchWorkspace(workspace.id)}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition ${
                        workspace.id === currentWorkspace?.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {workspace.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {workspaceMember && (
              <span className="text-xs text-gray-500 mt-2 block">
                Função: {workspaceMember.role === 'admin' ? 'Administrador' : workspaceMember.role === 'member' ? 'Membro' : 'Visualizador'}
              </span>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
              </h2>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
