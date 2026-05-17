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
    .select('duo_id, duos(*)')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data?.duos || null
}

export async function getDiscoveryDuos(userId) {
  const { data: myMember } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('user_id', userId)
    .single()
  const myDuoId = myMember?.duo_id

  const { data: duos, error } = await supabase
    .from('duos')
    .select('*, duo_members(user_id, instagram, profiles(name, instagram))')
    .order('created_at', { ascending: false })
  if (error) return []

  return duos.filter((d) => d.id !== myDuoId)
}
