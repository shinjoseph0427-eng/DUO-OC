import { supabase } from './supabaseClient.js'
import { createNotificationsForDuo } from './notifications.js'
import { assertDuoIsNotRestricted } from './safety.js'

export async function getWeeklyConfirmedCount() {
  const { data, error } = await supabase.rpc('get_weekly_confirmed_count')
  if (error) {
    if (error.code === 'PGRST202') return 0
    throw error
  }
  return typeof data === 'number' ? data : 0
}

// ─── Date/time expiry helpers ─────────────────────────────────────────────────

// The end-of-slot hour (local time) after which a time slot is considered past.
const TIME_SLOT_END_HOUR = {
  morning:   12, // ends at noon
  afternoon: 16, // ends at 4 pm
  evening:   19, // ends at 7 pm
  night:     22, // ends at 10 pm
}

// Resolve a relative date key to a concrete Date using the record's created_at
// as the anchor. Returns null if the key is unrecognised.
function resolveHangoutDate(dateKey, createdAt) {
  // Concrete calendar dates picked via the Calendar component are stored as
  // 'YYYY-MM-DD'. Resolve them directly to a local midnight Date.
  if (typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [yy, mm, dd] = dateKey.split('-').map(Number)
    const concrete = new Date(yy, mm - 1, dd)
    return isNaN(concrete.getTime()) ? null : concrete
  }

  let base
  try { base = createdAt ? new Date(createdAt) : new Date() } catch { base = new Date() }
  if (isNaN(base.getTime())) base = new Date()

  const y = base.getFullYear(), m = base.getMonth(), d = base.getDate()
  const baseDay = new Date(y, m, d) // midnight local, day of creation
  const dow = baseDay.getDay()       // 0=Sun … 6=Sat

  switch (dateKey) {
    case 'today':    return baseDay
    case 'tomorrow': return new Date(baseDay.getTime() + 86_400_000)
    case 'friday': {
      const diff = (5 - dow + 7) % 7
      return new Date(baseDay.getTime() + diff * 86_400_000)
    }
    case 'saturday': {
      const diff = (6 - dow + 7) % 7
      return new Date(baseDay.getTime() + diff * 86_400_000)
    }
    case 'sunday': {
      const diff = (0 - dow + 7) % 7
      return new Date(baseDay.getTime() + diff * 86_400_000)
    }
    case 'next_week':
      return new Date(baseDay.getTime() + 7 * 86_400_000)
    default:
      return null // unknown key — caller treats as non-expired
  }
}

// Friendly display labels for the relative date keys.
const RELATIVE_DATE_LABELS = {
  today:     'Today',
  tomorrow:  'Tomorrow',
  friday:    'This Friday',
  saturday:  'Saturday',
  sunday:    'This Sunday',
  next_week: 'Next week',
}

// Renders a plan's stored date value for display. Handles both the legacy
// relative keys ('today', 'friday', …) and concrete 'YYYY-MM-DD' dates picked
// via the Calendar component (e.g. "Friday, Jun 6").
export function formatPlanDateLabel(dateValue) {
  if (!dateValue) return ''
  if (RELATIVE_DATE_LABELS[dateValue]) return RELATIVE_DATE_LABELS[dateValue]
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [yy, mm, dd] = dateValue.split('-').map(Number)
    const d = new Date(yy, mm - 1, dd)
    if (isNaN(d.getTime())) return dateValue
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }
  return dateValue
}

// Returns true only when the scheduled date+time slot is definitively in the past.
// If anything is missing or unparseable, returns false to avoid false positives.
export function isPastHangoutTime(date, timeSlot, createdAt) {
  if (!date) return false
  const resolved = resolveHangoutDate(date, createdAt)
  if (!resolved) return false

  const endHour = TIME_SLOT_END_HOUR[timeSlot] ?? 23
  const endTime = new Date(
    resolved.getFullYear(), resolved.getMonth(), resolved.getDate(),
    endHour, 0, 0, 0,
  )
  return Date.now() > endTime.getTime()
}

async function assertCanPropose(fromDuoId, toDuoId, proposedBy) {
  if (!fromDuoId || !toDuoId || !proposedBy) throw new Error('Missing required fields for hangout proposal')
  if (fromDuoId === toDuoId) throw new Error('Cannot propose a hangout to your own duo')

  // Proposer must be a member of the source duo.
  const { data: fromMembership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', fromDuoId)
    .eq('user_id', proposedBy)
    .maybeSingle()
  if (!fromMembership) throw new Error('You are not a member of the source duo')

  // Proposer must NOT be a member of the target duo.
  const { data: toMembership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', toDuoId)
    .eq('user_id', proposedBy)
    .maybeSingle()
  if (toMembership) throw new Error('Cannot propose a hangout to a duo you are already a member of')
}

export async function proposeHangout({ fromDuoId, toDuoId, proposedBy, date, timeSlot, place, vibe, message }) {
  await assertCanPropose(fromDuoId, toDuoId, proposedBy)
  await assertDuoIsNotRestricted(fromDuoId)
  await assertDuoIsNotRestricted(toDuoId)

  const { data: hangout, error } = await supabase
    .from('hangouts')
    .insert({
      duo_a_id:    fromDuoId,
      duo_b_id:    toDuoId,
      proposed_by: proposedBy,
      date,
      time_slot:   timeSlot,
      place:       place ?? '',
      vibe,
      message:     message ?? '',
      status:      'pending',
    })
    .select()
    .single()

  if (error) throw error

  // Notify the receiving duo
  const { data: fromDuo } = await supabase
    .from('duos').select('name').eq('id', fromDuoId).single()
  await createNotificationsForDuo(toDuoId, 'hangout_request', {
    hangout_id: hangout.id,
    duo_name:   fromDuo?.name ?? 'a duo',
  })

  return hangout
}

// Accepts a single duoId (string) or an array of duoIds.
export async function getMyHangouts(duoIds) {
  const ids = (Array.isArray(duoIds) ? duoIds : [duoIds]).filter(Boolean)
  if (ids.length === 0) return []

  const orFilter = ids.map((id) => `duo_a_id.eq.${id},duo_b_id.eq.${id}`).join(',')

  const { data, error } = await supabase
    .from('hangouts')
    .select(`
      *,
      duo_a:duos!hangouts_duo_a_id_fkey(
        id, name, city,
        duo_members(instagram, profiles(name, instagram, photos))
      ),
      duo_b:duos!hangouts_duo_b_id_fkey(
        id, name, city,
        duo_members(instagram, profiles(name, instagram, photos))
      )
    `)
    .or(orFilter)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

// Any member of the receiving duo can confirm a pending hangout.
// For countered hangouts, any member of duo_a (the proposer) can confirm.
// Returns { confirmed: true }.
export async function acceptHangout(hangoutId, currentUserId) {
  const { data: h, error: fetchErr } = await supabase
    .from('hangouts')
    .select('duo_a_id, duo_b_id, status')
    .eq('id', hangoutId)
    .single()
  if (fetchErr || !h) throw new Error('Hangout not found')

  // Countered: duo_a is accepting the counter.
  const verifyDuoId = h.status === 'countered' ? h.duo_a_id : h.duo_b_id
  const { data: membership } = await supabase
    .from('duo_members').select('duo_id')
    .eq('duo_id', verifyDuoId).eq('user_id', currentUserId).maybeSingle()
  if (!membership) throw new Error('You are not a member of this duo')

  const { error } = await supabase
    .from('hangouts').update({ status: 'confirmed' }).eq('id', hangoutId)
  if (error) throw error

  const { data: duoB } = await supabase.from('duos').select('name').eq('id', h.duo_b_id).single()
  await createNotificationsForDuo(h.duo_a_id, 'hangout_accepted', {
    hangout_id: hangoutId,
    duo_name:   duoB?.name ?? 'a duo',
  })
  return { confirmed: true }
}

// Any member of duo_b declining immediately declines the hangout.
export async function declineHangout(hangoutId, currentUserId) {
  const { data: h } = await supabase
    .from('hangouts')
    .select('duo_a_id, duo_b_id')
    .eq('id', hangoutId)
    .single()
  if (!h) throw new Error('Hangout not found')

  const { error } = await supabase
    .from('hangouts').update({ status: 'declined' }).eq('id', hangoutId)
  if (error) throw error

  const { data: duoB } = await supabase.from('duos').select('name').eq('id', h.duo_b_id).single()
  await createNotificationsForDuo(h.duo_a_id, 'hangout_declined', {
    hangout_id: hangoutId,
    duo_name:   duoB?.name ?? 'a duo',
  })
}

export async function counterHangout(hangoutId, newData) {
  const { error } = await supabase
    .from('hangouts')
    .update({
      date:      newData.date,
      time_slot: newData.timeSlot,
      place:     newData.place,
      status:    'countered',
    })
    .eq('id', hangoutId)

  if (error) throw error
}

// Returns pending proposals where duoId is the receiving duo (duo_b).
// Throws on Supabase error so callers can surface it instead of silently showing nothing.
export async function getPendingHangoutsForDuo(duoId) {
  if (!duoId) return []
  const { data, error } = await supabase
    .from('hangouts')
    .select('id, status, vibe, date, time_slot, place, duo_a:duos!hangouts_duo_a_id_fkey(id, name)')
    .eq('duo_b_id', duoId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Could not load hangout proposals: ${error.message}`)
  return data ?? []
}

// ─── Open Plan layer ──────────────────────────────────────────────────────────

export async function createPlan({ creatorDuoId, vibe, date, timeSlot, place, message }) {
  if (!creatorDuoId) throw new Error('creatorDuoId is required')
  await assertDuoIsNotRestricted(creatorDuoId)

  const { data, error } = await supabase
    .from('hangout_plans')
    .insert({
      creator_duo_id: creatorDuoId,
      vibe:           vibe      ?? null,
      date:           date      ?? null,
      time_slot:      timeSlot  ?? null,
      place:          place     ?? null,
      message:        message   ?? null,
      status:         'open',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getOpenPlans() {
  const { data, error } = await supabase
    .from('hangout_plans')
    .select(`
      *,
      creator_duo:duos!hangout_plans_creator_duo_id_fkey(
        id, name, city, vibes,
        duo_members(user_id, profiles(name))
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  // Filter out plans whose scheduled time has already passed.
  // We do not update status here since the caller may not own those plans.
  return (data ?? []).filter(
    (p) => !isPastHangoutTime(p.date, p.time_slot, p.created_at),
  )
}

// Returns the first open plan for a given duo, or null if none / if expired.
export async function getMyActivePlan(duoId) {
  if (!duoId) return null

  const { data } = await supabase
    .from('hangout_plans')
    .select('*')
    .eq('creator_duo_id', duoId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  if (isPastHangoutTime(data.date, data.time_slot, data.created_at)) {
    // The plan's time has passed — mark it cancelled (fire-and-forget; caller owns it).
    supabase
      .from('hangout_plans')
      .update({ status: 'cancelled' })
      .eq('id', data.id)
      .then(() => {}).catch(() => {})
    return null
  }

  return data
}

export async function requestToJoinPlan({ planId, requesterDuoId, message }) {
  if (!planId || !requesterDuoId) throw new Error('planId and requesterDuoId are required')
  await assertDuoIsNotRestricted(requesterDuoId)

  const { data: plan } = await supabase
    .from('hangout_plans')
    .select('id, creator_duo_id, status, date, time_slot, created_at')
    .eq('id', planId)
    .maybeSingle()

  if (!plan || plan.status !== 'open') throw new Error('This plan is no longer available.')
  if (requesterDuoId === plan.creator_duo_id) throw new Error('Cannot request to join your own plan.')
  await assertDuoIsNotRestricted(plan.creator_duo_id)
  if (isPastHangoutTime(plan.date, plan.time_slot, plan.created_at)) {
    throw new Error('This plan has already passed.')
  }

  const { data, error } = await supabase
    .from('hangout_plan_requests')
    .insert({
      plan_id:          planId,
      requester_duo_id: requesterDuoId,
      message:          message ?? null,
      status:           'pending',
    })
    .select()
    .single()

  if (error) throw error

  // Notify the plan creator duo
  const { data: requesterDuo } = await supabase.from('duos').select('name').eq('id', requesterDuoId).single()
  await createNotificationsForDuo(plan.creator_duo_id, 'plan_request', {
    plan_id:    planId,
    request_id: data.id,
    duo_name:   requesterDuo?.name ?? 'A duo',
  }).catch(() => {})

  return data
}

// Fetches a single hangout_plan_request with full plan + requester duo detail
// for use in the RequestModal opened from a notification.
export async function getPlanRequestDetail(requestId) {
  if (!requestId) return null
  const { data, error } = await supabase
    .from('hangout_plan_requests')
    .select(`
      id, status, message, created_at,
      plan:hangout_plans!hangout_plan_requests_plan_id_fkey(
        id, vibe, date, time_slot, place, status
      ),
      requester_duo:duos!hangout_plan_requests_requester_duo_id_fkey(
        id, name, city,
        duo_members(user_id, profiles(name, photos))
      )
    `)
    .eq('id', requestId)
    .maybeSingle()
  if (error) return null
  return data
}

// Returns pending join requests for all open plans owned by duoId.
export async function getIncomingPlanRequests(duoId) {
  if (!duoId) return []

  const { data: plans, error: plansError } = await supabase
    .from('hangout_plans')
    .select('id')
    .eq('creator_duo_id', duoId)
    .eq('status', 'open')
  if (plansError) return []

  const planIds = (plans ?? []).map((p) => p.id)
  if (planIds.length === 0) return []

  const { data, error } = await supabase
    .from('hangout_plan_requests')
    .select(`
      *,
      plan:hangout_plans!hangout_plan_requests_plan_id_fkey(
        id, vibe, date, time_slot, place
      ),
      requester_duo:duos!hangout_plan_requests_requester_duo_id_fkey(
        id, name, city,
        duo_members(user_id, profiles(name, photos))
      )
    `)
    .in('plan_id', planIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

// Accepts a join request: updates the request, creates a confirmed hangout,
// marks the plan as matched, and declines remaining pending requests.
export async function acceptPlanRequest(requestId, currentUserId) {
  if (!requestId || !currentUserId) throw new Error('requestId and currentUserId are required')

  const { data: req, error: reqErr } = await supabase
    .from('hangout_plan_requests')
    .select('id, plan_id, requester_duo_id, status')
    .eq('id', requestId)
    .single()
  if (reqErr || !req) throw new Error('Plan request not found')
  if (req.status !== 'pending') throw new Error('Request is no longer pending')

  const { data: plan, error: planErr } = await supabase
    .from('hangout_plans')
    .select('id, creator_duo_id, vibe, date, time_slot, place, status')
    .eq('id', req.plan_id)
    .single()
  if (planErr || !plan) throw new Error('Plan not found')
  if (plan.status !== 'open') throw new Error('Plan is no longer open')

  const { data: membership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', plan.creator_duo_id)
    .eq('user_id', currentUserId)
    .maybeSingle()
  if (!membership) throw new Error('You are not a member of this duo')

  const { error: acceptErr } = await supabase
    .from('hangout_plan_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
  if (acceptErr) throw acceptErr

  const { data: hangout, error: hangoutErr } = await supabase
    .from('hangouts')
    .insert({
      duo_a_id:    plan.creator_duo_id,
      duo_b_id:    req.requester_duo_id,
      proposed_by: currentUserId,
      date:        plan.date,
      time_slot:   plan.time_slot,
      place:       plan.place ?? '',
      vibe:        plan.vibe,
      message:     '',
      status:      'confirmed',
    })
    .select()
    .single()
  if (hangoutErr) throw hangoutErr

  // Mark the plan matched so no further requests can be accepted
  await supabase
    .from('hangout_plans')
    .update({ status: 'matched' })
    .eq('id', plan.id)

  // Decline all other pending requests for this plan
  await supabase
    .from('hangout_plan_requests')
    .update({ status: 'declined' })
    .eq('plan_id', plan.id)
    .eq('status', 'pending')
    .neq('id', requestId)

  // Notify the requester duo that their request was accepted
  const { data: creatorDuo } = await supabase.from('duos').select('name').eq('id', plan.creator_duo_id).single()
  await createNotificationsForDuo(req.requester_duo_id, 'plan_accepted', {
    plan_id:  plan.id,
    duo_name: creatorDuo?.name ?? 'A duo',
  }).catch(() => {})

  return { confirmed: true, hangoutId: hangout.id }
}

export async function cancelOpenPlan(planId, currentUserId) {
  if (!planId || !currentUserId) throw new Error('planId and currentUserId are required')

  const { data: plan, error: planErr } = await supabase
    .from('hangout_plans')
    .select('creator_duo_id, status')
    .eq('id', planId)
    .single()
  if (planErr || !plan) throw new Error('Plan not found')
  if (plan.status !== 'open') throw new Error('Only open plans can be cancelled')

  const { data: membership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', plan.creator_duo_id)
    .eq('user_id', currentUserId)
    .maybeSingle()
  if (!membership) throw new Error('You are not a member of this duo')

  // Fetch pending join requests before cancelling so we can notify them
  const { data: pendingReqs } = await supabase
    .from('hangout_plan_requests')
    .select('requester_duo_id')
    .eq('plan_id', planId)
    .eq('status', 'pending')

  const { error } = await supabase
    .from('hangout_plans')
    .update({ status: 'cancelled' })
    .eq('id', planId)
  if (error) throw error

  // Notify each pending requester duo
  const notifyAll = (pendingReqs ?? []).map((r) =>
    createNotificationsForDuo(r.requester_duo_id, 'plan_cancelled', { plan_id: planId }).catch(() => {}),
  )
  await Promise.all(notifyAll)
}

export async function declinePlanRequest(requestId, currentUserId) {
  if (!requestId || !currentUserId) throw new Error('requestId and currentUserId are required')

  const { data: req } = await supabase
    .from('hangout_plan_requests')
    .select('id, plan_id, requester_duo_id')
    .eq('id', requestId)
    .single()
  if (!req) throw new Error('Plan request not found')

  const { data: plan } = await supabase
    .from('hangout_plans')
    .select('creator_duo_id')
    .eq('id', req.plan_id)
    .single()
  if (!plan) throw new Error('Plan not found')

  const { data: membership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', plan.creator_duo_id)
    .eq('user_id', currentUserId)
    .maybeSingle()
  if (!membership) throw new Error('You are not a member of this duo')

  const { error } = await supabase
    .from('hangout_plan_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
  if (error) throw error

  // Notify the requester duo that their request was declined
  const { data: creatorDuo } = await supabase.from('duos').select('name').eq('id', plan.creator_duo_id).single()
  await createNotificationsForDuo(req.requester_duo_id, 'plan_declined', {
    plan_id:  req.plan_id,
    duo_name: creatorDuo?.name ?? 'A duo',
  }).catch(() => {})
}
