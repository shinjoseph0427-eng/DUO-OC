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

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}
