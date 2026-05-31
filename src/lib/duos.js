import { supabase } from './supabaseClient.js'
import { getHiddenUserIds } from './safety.js'

export async function createDuo(userId, duoData) {
  // Duos are 2-person only. A duo must be formed with a partner (via an accepted
  // homie request / invite → createDuoWithMembers), never created solo.
  if (!duoData?.partnerUserId) {
    throw new Error('A duo needs a partner. Invite your homie to create a Duo together.')
  }

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
    .select('duo_id, duos(*, duo_members(user_id, profiles(name, instagram)))')
    .eq('user_id', userId)

  if (error) return null
  const memberships = Array.isArray(data) ? data : (data ? [data] : [])
  return memberships.find((membership) => membership.duos?.status === 'active')?.duos ?? null
}

export async function getMyDuos(userId) {
  const { data, error } = await supabase
    .from('duo_members')
    .select(`
      duo_id,
      duos(
        id,
        name,
        city,
        duo_bio,
        how_we_met,
        duo_prompt_q,
        duo_prompt_a,
        vibes,
        spots,
        looking_for,
        duo_photos,
        status,
        created_at,
        duo_members(
          user_id,
          instagram,
          profiles(name, age, birth_year, city, instagram, photos)
        )
      )
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('[getMyDuos] supabase error', error)
    throw new Error(error.message ?? 'Failed to load Duos')
  }

  const rows = data ?? []
  const mapped = rows.map((membership) => membership.duos)

  // Drop duo_members rows whose duos join returned null — this happens for
  // orphaned memberships (the duo was deleted) or rows hidden by RLS. We skip
  // them rather than throwing so the page can still load the user's valid duos.
  if (rows.length > 0 && mapped.every((d) => d == null)) {
    console.warn('[getMyDuos] all duos joins returned null — orphaned duo_members or RLS blocking duos SELECT')
  }

  const filtered = mapped.filter((duo) => duo?.status === 'active')

  return filtered
    .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
    .slice(0, 3)
}

export async function getMyDuoById(userId, duoId) {
  const { data, error } = await supabase
    .from('duo_members')
    .select(`
      duo_id,
      duos(
        id,
        name,
        city,
        duo_bio,
        how_we_met,
        duo_prompt_q,
        duo_prompt_a,
        vibes,
        spots,
        looking_for,
        duo_photos,
        status,
        created_at,
        duo_members(
          user_id,
          instagram,
          profiles(name, age, birth_year, city, instagram, photos)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('duo_id', duoId)
    .maybeSingle()

  if (error) throw new Error(`duo load failed: ${error.message}`)
  if (!data?.duos) return null
  return data.duos
}

export async function updateDuo(duoId, updates, userId = null) {
  const allowedFields = new Set([
    'duo_photos',
    'duo_bio',
    'how_we_met',
    'duo_prompt_q',
    'duo_prompt_a',
  ])
  const safeUpdates = Object.fromEntries(
    Object.entries(updates ?? {}).filter(([key]) => allowedFields.has(key)),
  )

  if (Object.keys(safeUpdates).length === 0) {
    throw new Error('No Duo profile changes to save')
  }

  if (userId) {
    const { data: membership, error: membershipError } = await supabase
      .from('duo_members')
      .select('id, duos(status)')
      .eq('duo_id', duoId)
      .eq('user_id', userId)
      .maybeSingle()

    if (membershipError) {
      throw new Error(`duo membership check failed: ${membershipError.message}`)
    }
    if (!membership) {
      throw new Error('Only duo members can edit this profile')
    }
    if (membership.duos?.status !== 'active') {
      throw new Error('Only active duos can be edited')
    }
  }

  const { error } = await supabase
    .from('duos')
    .update(safeUpdates)
    .eq('id', duoId)
  if (error) throw new Error(`duo update failed: ${error.message}`)
}

export async function getExploreDuos(userId) {
  const { data: myMembers } = await supabase
    .from('duo_members')
    .select('duo_id, duos(status)')
    .eq('user_id', userId)
  // Collect ALL active duo IDs so every duo the user belongs to is excluded.
  const myDuoIdList = (myMembers ?? [])
    .filter((m) => m.duos?.status === 'active')
    .map((m) => m.duo_id)
  const myDuoIds = new Set(myDuoIdList)

  // Users hidden by safety: members of duos this user blocked, members of
  // restricted/sanctioned duos, and individually blocked users.
  const hiddenUserIds = await getHiddenUserIds(myDuoIdList, userId).catch(() => new Set())

  const { data: duos, error } = await supabase
    .from('duos')
    .select(`
      *,
      duo_members(
        user_id, instagram,
        profiles(id, name, username, photos, bio, city, lat, lng,
          birth_year, instagram, prompt_q1, prompt_a1, prompt_q2, prompt_a2)
      )
    `)
    .order('created_at', { ascending: false })
  if (error) return []
  return duos
    .filter((d) => !myDuoIds.has(d.id))
    .filter((duo) => duo?.status === 'active')
    // Drop any duo that has a hidden/blocked member.
    .filter((duo) =>
      !(duo?.duo_members ?? []).some((m) => m.user_id && hiddenUserIds.has(m.user_id)),
    )
}

export async function getDiscoveryDuos(userId) {
  const { data: myMembers } = await supabase
    .from('duo_members')
    .select('duo_id, duos(status)')
    .eq('user_id', userId)
  const myDuoIds = new Set(
    (myMembers ?? [])
      .filter((m) => m.duos?.status === 'active')
      .map((m) => m.duo_id),
  )

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

  return duos.filter((d) => !myDuoIds.has(d.id))
}
