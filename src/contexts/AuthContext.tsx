import { createContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Workspace, WorkspaceMember } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  workspaceMember: WorkspaceMember | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, workspaceName: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceMember, setWorkspaceMember] = useState<WorkspaceMember | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadWorkspaces(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadWorkspaces(session.user.id);
        } else {
          setWorkspaces([]);
          setCurrentWorkspace(null);
          setWorkspaceMember(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadWorkspaces = async (userId: string) => {
    try {
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', userId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      const workspaceIds = members.map((m: any) => m.workspace_id);

      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);

      if (workspacesError) throw workspacesError;

      const userWorkspaces = workspacesData || [];
      setWorkspaces(userWorkspaces);

      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      let workspace = savedWorkspaceId
        ? userWorkspaces.find((w: Workspace) => w.id === savedWorkspaceId)
        : userWorkspaces[0];

      if (!workspace && userWorkspaces.length > 0) {
        workspace = userWorkspaces[0];
      }

      if (workspace) {
        const member = members?.find((m: any) => m.workspace_id === workspace.id);
        setCurrentWorkspace(workspace);
        setWorkspaceMember(member || null);
        localStorage.setItem('currentWorkspaceId', workspace.id);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, workspaceName: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha ao criar usuário');

    if (authData.session === null) {
      throw new Error('Verifique seu email para confirmar o cadastro. Se não recebeu, entre em contato com o administrador.');
    }

    const { data: workspace, error: workspaceError } = await supabase
      .rpc('create_workspace_with_member', {
        workspace_name: workspaceName,
        user_id: authData.user.id
      });

    if (workspaceError) throw workspaceError;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('currentWorkspaceId');
  };

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    const { data: member } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user?.id)
      .maybeSingle();

    setCurrentWorkspace(workspace);
    setWorkspaceMember(member);
    localStorage.setItem('currentWorkspaceId', workspaceId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        currentWorkspace,
        workspaces,
        workspaceMember,
        signIn,
        signUp,
        signOut,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
