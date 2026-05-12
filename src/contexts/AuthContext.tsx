import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

const ADMIN_PHONE = '+919619846170';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  userId: string | null;
  userName: string | null;
  userAvatar: string | null;
  isSeller: boolean;
  isAdmin: boolean;
  phone: string | null;
  loading: boolean;
  onboardingCompleted: boolean;
}

interface AuthContextType extends AuthState {
  login: (userId: string, phone: string, roles: string[], profile: any) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  completeOnboarding: () => void;
  updateProfile: (updates: { name?: string | null; avatar_url?: string | null }) => void;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    userId: null,
    userName: null,
    userAvatar: null,
    isSeller: false,
    isAdmin: false,
    phone: null,
    loading: true,
    onboardingCompleted: false,
  });

  // Check persisted session on mount
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const saved = localStorage.getItem('livecart_auth');
      if (!saved) {
        if (mounted) setState(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && session.user.id === parsed.userId) {
          if (mounted) setState({ ...parsed, loading: false });
        } else {
          localStorage.removeItem('livecart_auth');
          if (mounted) setState(prev => ({ ...prev, loading: false }));
        }
      } catch {
        localStorage.removeItem('livecart_auth');
        if (mounted) setState(prev => ({ ...prev, loading: false }));
      }
    };

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = (userId: string, phone: string, roles: string[], profile: any) => {
    const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const isAdmin = normalizedPhone === ADMIN_PHONE || roles.includes('admin');
    const isSeller = roles.includes('seller') || isAdmin;

    let primaryRole: UserRole = 'shopper';
    if (isAdmin) primaryRole = 'admin';
    else if (isSeller) primaryRole = 'seller';

    const newState: AuthState = {
      isAuthenticated: true,
      role: primaryRole,
      userId,
      userName: profile?.name || (isAdmin ? 'Admin' : null),
      userAvatar: profile?.avatar_url || null,
      isSeller,
      isAdmin,
      phone: normalizedPhone,
      loading: false,
      onboardingCompleted: profile?.onboarding_completed ?? false,
    };

    setState(newState);
    localStorage.setItem('livecart_auth', JSON.stringify(newState));
  };

  const logout = () => {
    const newState: AuthState = {
      isAuthenticated: false,
      role: null,
      userId: null,
      userName: null,
      userAvatar: null,
      isSeller: false,
      isAdmin: false,
      phone: null,
      loading: false,
      onboardingCompleted: false,
    };
    setState(newState);
    localStorage.removeItem('livecart_auth');
    supabase.auth.signOut();
  };

  const completeOnboarding = () => {
    setState(prev => {
      const updated = { ...prev, onboardingCompleted: true };
      localStorage.setItem('livecart_auth', JSON.stringify(updated));
      return updated;
    });
  };

  const setRole = (role: UserRole) => {
    setState(prev => {
      const updated = { ...prev, role };
      localStorage.setItem('livecart_auth', JSON.stringify(updated));
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
      localStorage.setItem('livecart_auth', JSON.stringify(updated));
      return updated;
    });
  };

  // Re-fetch roles from DB and update cached auth (used after seller approval, etc.)
  const refreshRoles = async () => {
    setState(prev => {
      if (!prev.userId) return prev;
      // fire async, don't block
      (async () => {
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', prev.userId!);
        const roles = (data || []).map(r => r.role as string);
        const isAdmin = prev.isAdmin || roles.includes('admin');
        const isSeller = roles.includes('seller') || isAdmin;
        let primaryRole: UserRole = prev.role || 'shopper';
        if (isAdmin) primaryRole = 'admin';
        else if (isSeller && primaryRole === 'shopper') primaryRole = 'seller';

        setState(p => {
          const updated = { ...p, isSeller, isAdmin, role: primaryRole };
          localStorage.setItem('livecart_auth', JSON.stringify(updated));
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
