import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-project-id')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Auth helper functions
export const authService = {
  isConfigured: () => isSupabaseConfigured,

  async signUp(email, password, fullName = '') {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable live user accounts.'
      );
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable live user accounts.'
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },

  async getSession() {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(callback) {
    if (!isSupabaseConfigured || !supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};
