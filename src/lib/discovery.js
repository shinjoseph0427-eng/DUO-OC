/**
 * meet oc. — Discovery Feed
 *
 * Fetches active duos, filters out the current user's own duo,
 * and sorts by internal match score. Score is never exposed publicly.
 *
 * Future exclusions (TODO):
 *   - exclude blocked users (both directions)
 *   - exclude reported/suspended users (safety_status != 'clear')
 *   - exclude duos already matched with current duo
 *   - apply gender preference filter when stored on profiles
 *   - apply distance filter when geolocation is added
 *   - apply preferred_age range filter
 */

import { getActiveDuos } from './duos.js';
import { sortDuosByMatchScore } from './matching.js';

/**
 * Returns a sorted discovery list of active duos for the current user.
 *
 * @param {{ currentUserId: string, myDuo: Object|null, myProfile: Object|null }} params
 * @returns {Promise<Object[]>} — duo rows sorted by match score, each with injected matchScoreData
 * @throws if Supabase query fails
 */
export async function getDiscoveryDuos({ currentUserId, myDuo, myProfile }) {
  const allActive = await getActiveDuos();

  // Hard exclusions
  const candidates = allActive.filter((duo) => {
    // Exclude own duo
    if (myDuo && duo.id === myDuo.id) return false;

    // TODO: exclude blocked users
    // TODO: exclude reported/suspended users
    // TODO: exclude already matched duos

    return true;
  });

  // Sort by match score (descending). Injects matchScoreData onto each duo.
  return sortDuosByMatchScore(candidates, myDuo, myProfile);
}
