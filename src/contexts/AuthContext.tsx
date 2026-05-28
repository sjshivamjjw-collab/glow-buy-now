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

    const bootstrapFromSession = async (session: any, savedRaw: string | null) => {
      const parsed = savedRaw ? (() => { try { return JSON.parse(savedRaw); } catch { return null; } })() : null;
      const userId = session.user.id;
      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);
      const roles = (roleRows || []).map(r => r.role as string);
      const rawPhone = profile?.phone || parsed?.phone || session.user.phone || '';
      const normalizedPhone = rawPhone ? (rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`) : '';
      const isAdmin = roles.includes('admin');
      const isCreator = roles.includes('creator') || isAdmin;
      const isDemoPhone = DEMO_PHONES.has(normalizedPhone);
      let primaryRole: UserRole = 'shopper';
      if (isAdmin) primaryRole = 'admin';
      else if (isCreator) primaryRole = 'creator';
      const userMeta: any = session.user.user_metadata || {};
      const oauthName = userMeta.full_name || userMeta.name || null;
      const oauthAvatar = userMeta.avatar_url || userMeta.picture || null;
      const refreshed: AuthState = {
        isAuthenticated: true,
        role: primaryRole,
        userId,
        userName: profile?.name || parsed?.userName || oauthName || (isAdmin ? 'Admin' : isDemoPhone ? 'Demo User' : null),
        userAvatar: profile?.avatar_url || parsed?.userAvatar || oauthAvatar || null,
        isCreator,
        isAdmin,
        phone: normalizedPhone || parsed?.phone || null,
        loading: false,
        onboardingCompleted: isDemoPhone || profile?.onboarding_completed === true || parsed?.onboardingCompleted === true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
      if (mounted) setState(refreshed);
    };

    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const saved = localStorage.getItem(STORAGE_KEY);
        if (session?.user?.id) {
          await bootstrapFromSession(session, saved);
        } else {
          if (saved) localStorage.removeItem(STORAGE_KEY);
          if (mounted) setState(prev => ({ ...prev, loading: false }));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        if (mounted) setState(prev => ({ ...prev, loading: false }));
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        setTimeout(() => {
          bootstrapFromSession(session, localStorage.getItem(STORAGE_KEY));
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    restoreSession();
    return () => { mounted = false; sub.subscription.unsubscribe(); };
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
        const isAdmin = roles.includes('admin');
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
