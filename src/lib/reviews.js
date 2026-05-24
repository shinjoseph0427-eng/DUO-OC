import { supabase } from './supabaseClient.js'

export async function createPostHangoutReview({
  hangoutId,
  reviewerUserId,
  reviewerDuoId,
  reviewedDuoId,
  wouldHangAgain,
  vibe,
  note,
  safetyFlag,
}) {
  if (!hangoutId || !reviewerUserId || !reviewerDuoId || !reviewedDuoId) {
    throw new Error('Missing required fields for review')
  }
  if (reviewerDuoId === reviewedDuoId) {
    throw new Error('Cannot review your own duo')
  }

  const { data, error } = await supabase
    .from('post_hangout_reviews')
    .insert({
      hangout_id:       hangoutId,
      reviewer_user_id: reviewerUserId,
      reviewer_duo_id:  reviewerDuoId,
      reviewed_duo_id:  reviewedDuoId,
      would_hang_again: wouldHangAgain ?? null,
      vibe:             vibe           ?? null,
      note:             note           ?? null,
      safety_flag:      safetyFlag     ?? false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMyPostHangoutReview(hangoutId, reviewerDuoId) {
  if (!hangoutId || !reviewerDuoId) return null

  const { data } = await supabase
    .from('post_hangout_reviews')
    .select('id, would_hang_again, vibe, note, safety_flag, created_at')
    .eq('hangout_id', hangoutId)
    .eq('reviewer_duo_id', reviewerDuoId)
    .maybeSingle()

  return data ?? null
}

// Batch-load reviews for multiple hangouts and reviewer duos.
export async function getMyReviewsForHangouts(hangoutIds, reviewerDuoIds) {
  if (!hangoutIds?.length || !reviewerDuoIds?.length) return []

  const { data } = await supabase
    .from('post_hangout_reviews')
    .select('id, hangout_id, reviewer_duo_id, would_hang_again, vibe, note, safety_flag')
    .in('hangout_id', hangoutIds)
    .in('reviewer_duo_id', reviewerDuoIds)

  return data ?? []
}
