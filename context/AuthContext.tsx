import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_KEYS = [
  'fittrack_calorie_history',
  'fittrack_calorie_settings',
  'fittrack_workout_state',
  'fittrack_gallery_meta',
];

interface AuthContextValue {
  session:  Session | null;
  user:     User | null;
  loading:  boolean;
  signUp:   (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn:   (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, loading: true,
  signUp: async () => ({ error: null, needsConfirmation: false }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // getUser() validates the JWT against Supabase servers (unlike getSession() which only
    // reads the local token without server verification — a forged/expired JWT would pass).
    // Falls back to local session on network error to avoid logging users out when offline.
    supabase.auth.getUser()
      .then(async ({ data: { user } }) => {
        const session = user ? (await supabase.auth.getSession()).data.session : null;
        setSession(session);
        setLoading(false);
      })
      .catch(async () => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setLoading(false);
      });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    // session is null when the Supabase project requires email confirmation
    return { error: null, needsConfirmation: data.session === null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await AsyncStorage.multiRemove(LOCAL_STORAGE_KEYS).catch(() => {});
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
