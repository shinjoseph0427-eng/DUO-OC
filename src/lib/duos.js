import { supabase } from './supabaseClient.js'

export async function createDuo(userId, duoData) {
  const { data: duo, error } = await supabase
    .from('duos')
    .insert({
      name:        duoData.name,
      city:        duoData.city,
      vibes:       duoData.vibes,
      spots:       duoData.spots,
      looking_for: duoData.lookingFor,
      status:      'active',
    })
    .select()
    .single()
  if (error) throw error

  const { error: memberError } = await supabase
    .from('duo_members')
    .insert({ duo_id: duo.id, user_id: userId, instagram: duoData.instagram })
  if (memberError) throw memberError

  return duo
}

export async function getMyDuo(userId) {
  const { data, error } = await supabase
    .from('duo_members')
    .select('duo_id, duos(*, duo_members(user_id, profiles(name, avatar_url, instagram)))')
    .eq('user_id', userId)

  if (error) return null
  const memberships = Array.isArray(data) ? data : (data ? [data] : [])
  return memberships.find((membership) => membership.duos?.status === 'active')?.duos || memberships[0]?.duos || null
}

export async function updateDuo(duoId, updates) {
  const { error } = await supabase
    .from('duos')
    .update(updates)
    .eq('id', duoId)
  if (error) throw error
}

export async function getExploreDuos(userId) {
  const { data: myMembers } = await supabase
    .from('duo_members')
    .select('duo_id, duos(status)')
    .eq('user_id', userId)
  const myDuoId = (myMembers ?? []).find((m) => m.duos?.status === 'active')?.duo_id

  const { data: duos, error } = await supabase
    .from('duos')
    .select(`
      *,
      duo_members(
        user_id, instagram,
        profiles(id, name, username, avatar_url, photos, bio, city, lat, lng,
          birth_year, instagram, prompt_q1, prompt_a1, prompt_q2, prompt_a2)
      )
    `)
    .order('created_at', { ascending: false })
  if (error) return []
  return duos.filter((d) => d.id !== myDuoId)
}

export async function getDiscoveryDuos(userId) {
  const { data: myMembers } = await supabase
    .from('duo_members')
    .select('duo_id, duos(status)')
    .eq('user_id', userId)
  const myDuoId = (myMembers ?? []).find((m) => m.duos?.status === 'active')?.duo_id

  const { data: duos, error } = await supabase
    .from('duos')
    .select(`
      *,
      duo_members(
        user_id,
        instagram,
        profiles(name, instagram, photos, bio,
                 prompt_q1, prompt_a1, prompt_q2, prompt_a2)
      )
    `)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getDiscoveryDuos error:', error)
    return []
  }

  return duos.filter((d) => d.id !== myDuoId)
}
