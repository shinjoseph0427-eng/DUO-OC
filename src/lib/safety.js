import { supabase } from './supabaseClient.js'

const DUPLICATE_REPORT_MESSAGE = 'You already reported this duo for this reason.'
const RESTRICTED_DUO_MESSAGE = 'This duo is not available right now.'
const RESTRICTED_OWN_DUO_MESSAGE = 'This duo cannot create new plans right now.'

const COUNTABLE_REPORT_REASONS = new Set([
  'unsafe',
  'disrespectful',
  'harassment',
  'fake_profile',
  'fake profile',
  'other',
])

function normalizeReason(reason) {
  return String(reason ?? '').trim().toLowerCase()
}

function isDuplicateReportError(error) {
  return error?.code === '23505' || error?.message?.toLowerCase().includes('duplicate')
}

function isMissingDetailColumnError(error) {
  return error?.message?.toLowerCase().includes("'detail' column")
    || error?.message?.toLowerCase().includes('column "detail"')
}

export function isCountableSafetyReason(reason) {
  const normalized = normalizeReason(reason)
  if (normalized === 'not a fit' || normalized === 'not_a_fit') return false
  return COUNTABLE_REPORT_REASONS.has(normalized)
}

export function isRestrictedDuoError(error) {
  return error?.message === RESTRICTED_DUO_MESSAGE
}

export async function reportDuo({ reporterUserId, reportedDuoId, reason, detail }) {
  if (!reporterUserId || !reportedDuoId || !reason) throw new Error('Missing required report fields')

  const { data: membership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', reportedDuoId)
    .eq('user_id', reporterUserId)
    .maybeSingle()

  if (membership) throw new Error('You cannot report your own duo.')

  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('reporter_user_id', reporterUserId)
    .eq('reported_duo_id', reportedDuoId)
    .eq('reason', reason)
    .maybeSingle()

  if (existingReport) throw new Error(DUPLICATE_REPORT_MESSAGE)

  const reportPayload = {
    reporter_user_id: reporterUserId,
    reported_duo_id:  reportedDuoId,
    reason,
    detail:           detail || null,
  }
  let { error } = await supabase.from('reports').insert(reportPayload)

  if (isMissingDetailColumnError(error)) {
    const { detail: _detail, ...fallbackPayload } = reportPayload
    const retry = await supabase
      .from('reports')
      .insert({ ...fallbackPayload, details: detail || null })
    error = retry.error
  }

  if (isDuplicateReportError(error)) throw new Error(DUPLICATE_REPORT_MESSAGE)
  if (error) throw error

  const sanction = await evaluateDuoSanction(reportedDuoId, reason).catch(() => null)
  return { report: null, sanction }
}

export async function blockDuo({ blockerDuoId, blockedDuoId }) {
  const { error } = await supabase
    .from('blocks')
    .upsert(
      { blocker_duo_id: blockerDuoId, blocked_duo_id: blockedDuoId },
      { onConflict: 'blocker_duo_id,blocked_duo_id', ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function getBlockedDuoIds(myDuoId) {
  const duoIds = Array.isArray(myDuoId) ? myDuoId.filter(Boolean) : [myDuoId].filter(Boolean)
  if (duoIds.length === 0) return []

  const { data } = await supabase
    .from('blocks')
    .select('blocked_duo_id')
    .in('blocker_duo_id', duoIds)
  return (data ?? []).map((r) => r.blocked_duo_id)
}

export async function evaluateDuoSanction(reportedDuoId, reason) {
  if (!reportedDuoId || !reason || !isCountableSafetyReason(reason)) return null

  const { data: reports, error } = await supabase
    .from('reports')
    .select('reporter_user_id')
    .eq('reported_duo_id', reportedDuoId)
    .eq('reason', reason)

  if (error) {
    const { data: evaluated, error: rpcError } = await supabase.rpc('evaluate_duo_sanction', {
      p_duo_id: reportedDuoId,
      p_reason: reason,
    })
    if (rpcError) throw error
    return evaluated ? { duo_id: reportedDuoId, reason, sanction_type: 'restricted', status: 'active' } : null
  }

  const uniqueReporterIds = new Set(
    (reports ?? []).map((r) => r.reporter_user_id).filter(Boolean),
  )
  const reportCount = uniqueReporterIds.size
  if (reportCount < 3) {
    const { data: evaluated } = await supabase.rpc('evaluate_duo_sanction', {
      p_duo_id: reportedDuoId,
      p_reason: reason,
    })
    return evaluated ? { duo_id: reportedDuoId, reason, sanction_type: 'restricted', status: 'active' } : null
  }

  const { data: existing } = await supabase
    .from('duo_sanctions')
    .select('id, duo_id, reason, sanction_type, status')
    .eq('duo_id', reportedDuoId)
    .eq('reason', reason)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) return existing

  const { error: insertError } = await supabase
    .from('duo_sanctions')
    .insert({
      duo_id:        reportedDuoId,
      reason,
      sanction_type: 'restricted',
      status:        'active',
      report_count:  reportCount,
    })

  if (insertError?.code === '23505') {
    const { data: duplicate } = await supabase
      .from('duo_sanctions')
      .select('id, duo_id, reason, sanction_type, status')
      .eq('duo_id', reportedDuoId)
      .eq('reason', reason)
      .eq('status', 'active')
      .maybeSingle()
    return duplicate ?? null
  }
  if (insertError) throw insertError
  return { duo_id: reportedDuoId, reason, sanction_type: 'restricted', status: 'active' }
}

export async function getActiveSanctionsForDuo(duoId) {
  if (!duoId) return []
  const { data, error } = await supabase
    .from('duo_sanctions')
    .select('id, duo_id, reason, sanction_type, status')
    .eq('duo_id', duoId)
    .eq('status', 'active')

  if (error) return []
  return data ?? []
}

export async function isDuoRestricted(duoId) {
  if (!duoId) return false
  const { data, error } = await supabase.rpc('is_duo_restricted', { p_duo_id: duoId })
  if (!error) return !!data

  const sanctions = await getActiveSanctionsForDuo(duoId)
  return sanctions.some((s) => s.sanction_type === 'restricted')
}

export async function assertDuoIsNotRestricted(duoId) {
  if (await isDuoRestricted(duoId)) throw new Error(RESTRICTED_DUO_MESSAGE)
}

export async function getRestrictedDuoIds() {
  const { data, error } = await supabase.rpc('get_restricted_duo_ids_for_explore')
  if (error) return []
  return (data ?? []).map((r) => r.duo_id).filter(Boolean)
}

export const SAFETY_MESSAGES = {
  duplicateReport: DUPLICATE_REPORT_MESSAGE,
  restrictedDuo:   RESTRICTED_DUO_MESSAGE,
  restrictedOwnDuo: RESTRICTED_OWN_DUO_MESSAGE,
}
