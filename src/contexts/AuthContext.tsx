import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  userId: string | null;
  userName: string | null;
  userAvatar: string | null;
  isCreator: boolean;
  isAdmin: boolean;
  phone: string | null;
  loading: boolean;
  onboardingCompleted: boolean;
}

interface AuthProfile {
  name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  onboarding_completed?: boolean | null;
}

interface AuthContextType extends AuthState {
  login: (userId: string, phone: string, roles: string[], profile: AuthProfile | null) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  completeOnboarding: () => void;
  updateProfile: (updates: { name?: string | null; avatar_url?: string | null }) => void;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'livecart_auth';
const DEMO_PHONES = new Set([
  '+918921046170',
  '+918921046171',
  '+919082036638',
  '+919619836638',
  '+919999966666',
  '+911111111111',
  '+919821046171',
  '+919821046170',
  '+919619846170',
]);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    userId: null,
    userName: null,
    userAvatar: null,
    isCreator: false,
    isAdmin: false,
    phone: null,
    loading: true,
    onboardingCompleted: false,
  });

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        if (mounted) setState(prev => ({ ...prev, loading: false }));
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && session.user.id === parsed.userId) {
          const [{ data: profile }, { data: roleRows }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
            supabase.from('user_roles').select('role').eq('user_id', session.user.id),
          ]);
          const roles = (roleRows || []).map(r => r.role as string);
          const normalizedPhone = (profile?.phone || parsed.phone || session.user.phone || '').startsWith('+')
            ? (profile?.phone || parsed.phone || session.user.phone || '')
            : `+${profile?.phone || parsed.phone || session.user.phone || ''}`;
          // Server is the source of truth for roles — never trust localStorage flags.
          const isAdmin = roles.includes('admin');
          const isCreator = roles.includes('creator') || isAdmin;
          const isDemoPhone = DEMO_PHONES.has(normalizedPhone);
          let primaryRole: UserRole = 'shopper';
          if (isAdmin) primaryRole = 'admin';
          else if (isCreator) primaryRole = 'creator';
          const refreshed: AuthState = {
            ...parsed,
            role: primaryRole,
            userName: profile?.name || parsed.userName || (isAdmin ? 'Admin' : isDemoPhone ? 'Demo User' : null),
            userAvatar: profile?.avatar_url || parsed.userAvatar || null,
            isCreator,
            isAdmin,
            phone: normalizedPhone || parsed.phone,
            loading: false,
            onboardingCompleted: isDemoPhone || profile?.onboarding_completed === true || parsed.onboardingCompleted === true,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
          if (mounted) setState(refreshed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          if (mounted) setState(prev => ({ ...prev, loading: false }));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        if (mounted) setState(prev => ({ ...prev, loading: false }));
      }
    };
    restoreSession();
    return () => { mounted = false; };
  }, []);

  const login = (userId: string, phone: string, roles: string[], profile: AuthProfile | null) => {
    const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    // Admin status comes ONLY from the server-side user_roles table — never from
    // a hardcoded phone number on the client.
    const isAdmin = roles.includes('admin');
    const isCreator = roles.includes('creator') || isAdmin;

    let primaryRole: UserRole = 'shopper';
    if (isAdmin) primaryRole = 'admin';
    else if (isCreator) primaryRole = 'creator';

    const isDemoPhone = DEMO_PHONES.has(normalizedPhone);

    const newState: AuthState = {
      isAuthenticated: true,
      role: primaryRole,
      userId,
      userName: profile?.name || (isAdmin ? 'Admin' : isDemoPhone ? 'Demo User' : null),
      userAvatar: profile?.avatar_url || null,
      isCreator,
      isAdmin,
      phone: normalizedPhone,
      loading: false,
      onboardingCompleted: isDemoPhone || profile?.onboarding_completed === true,
    };

    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const logout = () => {
    const newState: AuthState = {
      isAuthenticated: false,
      role: null,
      userId: null,
      userName: null,
      userAvatar: null,
      isCreator: false,
      isAdmin: false,
      phone: null,
      loading: false,
      onboardingCompleted: false,
    };
    setState(newState);
    localStorage.removeItem(STORAGE_KEY);
    supabase.auth.signOut();
  };

  const completeOnboarding = () => {
    setState(prev => {
      const updated = { ...prev, onboardingCompleted: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const setRole = (role: UserRole) => {
    setState(prev => {
      const updated = { ...prev, role };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateProfile = (updates: { name?: string | null; avatar_url?: string | null }) => {
    setState(prev => {
      const updated = {
        ...prev,
        ...(updates.name !== undefined ? { userName: updates.name } : {}),
        ...(updates.avatar_url !== undefined ? { userAvatar: updates.avatar_url } : {}),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const refreshRoles = async () => {
    setState(prev => {
      if (!prev.userId) return prev;
      (async () => {
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', prev.userId!);
        const roles = (data || []).map(r => r.role as string);
        const isAdmin = prev.isAdmin || roles.includes('admin');
        const isCreator = roles.includes('creator') || isAdmin;
        let primaryRole: UserRole = prev.role || 'shopper';
        if (isAdmin) primaryRole = 'admin';
        else if (isCreator && primaryRole === 'shopper') primaryRole = 'creator';
        setState(p => {
          const updated = { ...p, isCreator, isAdmin, role: primaryRole };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      })();
      return prev;
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setRole, completeOnboarding, updateProfile, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
