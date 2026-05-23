import { supabase } from './supabaseClient.js'

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
}

export function isProfileOnboardingComplete(profile, duo) {
  if (profile?.onboarding_complete === true) return true
  return Boolean(profile?.name && profile?.birth_year && duo?.id)
}

// Returns true if available, false if taken
export async function checkUsername(username, excludeUserId = null) {
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
  if (excludeUserId) query = query.neq('id', excludeUserId)
  const { data } = await query.limit(1)
  return !data?.length
}
