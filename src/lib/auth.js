import { supabase } from './supabaseClient'

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user?.id) throw new Error('Sign up succeeded but user data is missing')
  // Create a minimal profile row so updateProfile works during onboarding
  await supabase.from('profiles').upsert({ id: data.user.id, onboarding_complete: false })
  return data.user
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

// Soft-deletes the current user's account (sets profiles.deleted_at via a
// SECURITY DEFINER RPC) and signs out locally. The SIGNED_OUT auth event then
// routes the app back to the landing page.
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_user_account')
  if (error) throw error
  await supabase.auth.signOut()
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}
