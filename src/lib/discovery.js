import { getActiveDuos } from './duos.js';
import { sortDuosByMatchScore } from './matching.js';
import { getBlockedDuoIds, getRestrictedDuoIds } from './safety.js';

export async function getDiscoveryDuos({ currentUserId, myDuo, myProfile, myDuoIds = [] }) {
  const [allActive, blockedIds, restrictedIds] = await Promise.all([
    getActiveDuos(),
    getBlockedDuoIds(myDuoIds).catch(() => []),
    getRestrictedDuoIds().catch(() => []),
  ]);

  const blockedSet    = new Set(blockedIds);
  const restrictedSet = new Set(restrictedIds);

  const candidates = allActive.filter((duo) => {
    if (myDuo && duo.id === myDuo.id) return false;
    if (blockedSet.has(duo.id))       return false;
    if (restrictedSet.has(duo.id))    return false;
    return true;
  });

  return sortDuosByMatchScore(candidates, myDuo, myProfile);
}
