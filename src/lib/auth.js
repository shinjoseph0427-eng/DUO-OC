import { supabase } from './supabaseClient'

export async function signUp(email, password, name, age, city, instagram, gender) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  const profilePayload = {
    id: data.user.id,
    name,
    age:       parseInt(age),
    city,
    instagram: instagram.replace('@', ''),
    gender:    gender || null,
    onboarding_complete: false,
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert(profilePayload)

  if (profileError?.code === '42703') {
    const legacyPayload = { ...profilePayload }
    delete legacyPayload.onboarding_complete
    const { error: legacyProfileError } = await supabase
      .from('profiles')
      .insert(legacyPayload)
    if (legacyProfileError) throw legacyProfileError
  } else if (profileError) {
    throw profileError
  }

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
