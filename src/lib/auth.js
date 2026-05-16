import { requireSupabase } from './supabaseClient.js';

/**
 * Sign up a new user with email + password.
 * Returns { data: { user, session }, error }.
 * Supabase sends a confirmation email by default — disable in Dashboard → Auth → Email if
 * you want instant sign-in during development.
 */
export async function signUpWithEmail(email, password) {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign in an existing user with email + password.
 * Returns { user, session }.
 */
export async function signInWithEmail(email, password) {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const sb = requireSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

/**
 * Returns the current authenticated user object, or null if not logged in.
 * Useful for reading user.id to query the public.users table.
 */
export async function getCurrentUser() {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

/**
 * Returns the current session, or null if not logged in.
 */
export async function getSession() {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * Usage:
 *   const unsub = onAuthStateChange((event, session) => { ... });
 *   return () => unsub();
 */
export function onAuthStateChange(callback) {
  const sb = requireSupabase();
  const { data: { subscription } } = sb.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
