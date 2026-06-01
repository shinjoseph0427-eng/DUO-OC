import { supabase } from './supabaseClient.js'

// Fetches the sanitized public view of a duo for the shareable /duo/[id] page.
// Works for anonymous (logged-out) visitors via the get_public_duo RPC.
// Returns null when the duo doesn't exist or isn't active.
export async function getPublicDuo(duoId) {
  if (!duoId) return null
  const { data, error } = await supabase.rpc('get_public_duo', { p_duo_id: duoId })
  if (error) throw error
  return data ?? null
}
