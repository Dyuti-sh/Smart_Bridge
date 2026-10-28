import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, authService } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Standard fallback demo user for development
  const devUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo@wanderwise.ai',
    user_metadata: {
      full_name: 'WanderWise Explorer',
    },
    isDev: true,
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(devUser);
      setLoading(false);
      return;
    }

    // Get initial session
    authService.getSession().then((currSession) => {
      setSession(currSession);
      setUser(currSession?.user || null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    return authService.signIn(email, password);
  };

  const signUp = async (email, password, fullName) => {
    return authService.signUp(email, password, fullName);
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await authService.signOut();
      setUser(null);
      setSession(null);
    } else {
      // In dev mode, re-assign dev user or toggle off
      setUser(null);
    }
  };

  const enableDevMode = () => {
    setUser(devUser);
  };

  const value = {
    user,
    session,
    loading,
    isSupabaseConfigured,
    devUser,
    signIn,
    signUp,
    signOut,
    enableDevMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
