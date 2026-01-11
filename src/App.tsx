import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Auth/Login';
import { Signup } from './components/Auth/Signup';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { LeadsList } from './components/Leads/LeadsList';
import { CampaignsList } from './components/Campaigns/CampaignsList';
import { SettingsPage } from './components/Settings/SettingsPage';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (authMode === 'login') {
      return <Login onToggleMode={() => setAuthMode('signup')} />;
    }
    return <Signup onToggleMode={() => setAuthMode('login')} />;
  }

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'kanban' && <KanbanBoard />}
      {currentView === 'leads' && <LeadsList />}
      {currentView === 'campaigns' && <CampaignsList />}
      {currentView === 'settings' && <SettingsPage />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
