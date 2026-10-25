import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Ensure anonymous authentication for RLS (auth.uid() = user_id)
export async function getOrInitUser() {
  if (!isSupabaseConfigured || !supabase) {
    let localUserId = localStorage.getItem('electrify_anonymous_user_id');
    if (!localUserId) {
      localUserId = 'anon-' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('electrify_anonymous_user_id', localUserId);
    }
    return { id: localUserId };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session.user;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('Supabase anonymous sign in note:', error.message);
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) return userData.user;
      return { id: 'fallback-user' };
    }
    return data.user;
  } catch (err) {
    console.warn('Auth initialization error:', err);
    return { id: 'fallback-user' };
  }
}
