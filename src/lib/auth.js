import { supabase } from './supabaseClient'

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user?.id) throw new Error('Sign up succeeded but user data is missing')

  // With "Confirm email" ON, signUp returns a user but NO session. Creating the
  // profile row now would hit profiles-INSERT RLS as the anon role and fail, so
  // we only seed it when a session exists (Confirm email OFF). When confirmation
  // is required the profile is created on first sign-in instead (see signIn).
  if (data.session) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, onboarding_complete: false })
    if (profileError) throw new Error(`Profile setup failed: ${profileError.message}`)
  }

  // Caller checks `session` to distinguish "logged in" vs "must confirm email".
  return { user: data.user, session: data.session }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  // Ensure a profile row exists (covers users who signed up with email
  // confirmation ON, where the row couldn't be created at signUp time).
  // ignoreDuplicates so an already-onboarded user's row is never reset.
  if (data.user?.id) {
    await supabase
      .from('profiles')
      .upsert({ id: data.user.id, onboarding_complete: false }, { onConflict: 'id', ignoreDuplicates: true })
      .then(({ error: e }) => { if (e) console.warn('profile ensure on signIn failed:', e.message) })
  }

  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

// Soft-deletes the current user's account (sets profiles.deleted_at via a
// SECURITY DEFINER RPC) and signs out locally. The SIGNED_OUT auth event then
// routes the app back to the home page.
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_user_account')
  if (error) throw error
  await supabase.auth.signOut()
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}
