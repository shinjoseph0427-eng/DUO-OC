/**
 * meet oc. — Matching Score v1
 *
 * Deterministic scoring only. No AI. No ML.
 * Score is used internally for discovery sort order.
 * Raw score is never exposed in the UI.
 *
 * Total: 100 points
 *   Location     30
 *   Age          20
 *   Vibe         20
 *   Intent       10
 *   Availability 10
 *   Trust        10
 */

// ─── OC city clusters for location scoring ────────────────────────────────────

const OC_SOUTH = new Set([
  'Irvine', 'Newport Beach', 'Costa Mesa', 'Laguna Beach', 'Mission Viejo',
  'Lake Forest', 'Aliso Viejo', 'Dana Point', 'San Clemente', 'Laguna Niguel',
  'Laguna Hills', 'Rancho Santa Margarita', 'San Juan Capistrano',
]);

const OC_NORTH = new Set([
  'Fullerton', 'Anaheim', 'Orange', 'Brea', 'Yorba Linda', 'Buena Park',
  'Cypress', 'La Habra', 'La Palma', 'Placentia',
]);

const OC_MID = new Set([
  'Tustin', 'Santa Ana', 'Garden Grove', 'Westminster', 'Huntington Beach',
  'Fountain Valley', 'Stanton', 'Los Alamitos',
]);

function getOcCluster(city) {
  if (!city) return null;
  if (OC_SOUTH.has(city)) return 'south';
  if (OC_NORTH.has(city)) return 'north';
  if (OC_MID.has(city)) return 'mid';
  return 'other';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Safely coerce a value to a clean string array.
 * Handles null, undefined, string (comma-split), or array inputs.
 */
export function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function activeMembers(duo) {
  return (duo?.duo_members ?? []).filter((dm) => dm.status === 'active' && dm.users);
}

// ─── Sub-scorers ──────────────────────────────────────────────────────────────

function scoreLocation(myDuo, targetDuo, myProfile) {
  const myUserCity = myProfile?.user?.city;
  const myPrefCities = normalizeArray(myProfile?.profile?.preferred_cities);
  const myMemberCities = activeMembers(myDuo).map((dm) => dm.users.city).filter(Boolean);
  const myCities = [...new Set([myUserCity, ...myMemberCities, ...myPrefCities].filter(Boolean))];

  const targetMemberCities = activeMembers(targetDuo).map((dm) => dm.users.city).filter(Boolean);

  if (myCities.length === 0 || targetMemberCities.length === 0) return 10;

  // Exact city overlap
  if (myCities.some((c) => targetMemberCities.includes(c))) return 30;

  // Same OC cluster
  const myClusters = [...new Set(myCities.map(getOcCluster).filter(Boolean))];
  const targetClusters = [...new Set(targetMemberCities.map(getOcCluster).filter(Boolean))];
  if (myClusters.some((c) => targetClusters.includes(c) && c !== 'other')) return 20;

  return 10; // general OC
}

function scoreAge(targetDuo) {
  const members = activeMembers(targetDuo);
  const ages = members.map((dm) => dm.users.age).filter((a) => typeof a === 'number');

  if (ages.length === 0) return 10; // unknown age — allowed in MVP
  if (ages.every((a) => a >= 18 && a <= 25)) return 20;
  return 10;
}

function scoreVibes(myDuo, targetDuo, myProfile) {
  const myVibes = [
    ...normalizeArray(myDuo?.shared_vibes),
    ...normalizeArray(myProfile?.profile?.vibes),
  ];
  const targetVibes = normalizeArray(targetDuo.shared_vibes);

  if (myVibes.length === 0 || targetVibes.length === 0) return 0;

  const shared = myVibes.filter((v) => targetVibes.includes(v)).length;
  if (shared >= 3) return 20;
  if (shared >= 2) return 14;
  if (shared >= 1) return 7;
  return 0;
}

function scoreIntent(myDuo, targetDuo, myProfile) {
  const myIntent = [
    ...normalizeArray(myDuo?.looking_for),
    ...normalizeArray(myProfile?.profile?.looking_for),
    ...normalizeArray(myProfile?.profile?.intent),
  ];
  const targetIntent = normalizeArray(targetDuo.looking_for);

  if (myIntent.length === 0 || targetIntent.length === 0) return 5;
  if (myIntent.some((i) => targetIntent.includes(i))) return 10;
  return 5;
}

function scoreAvailability(myProfile) {
  // Target duo does not expose availability in current schema.
  // Score presence of the current user's availability to reward completeness.
  // Full overlap scoring deferred until availability is stored on duos.
  const myAvail = normalizeArray(myProfile?.profile?.availability);
  return myAvail.length > 0 ? 3 : 3; // reserved; returns 3 in all MVP cases
}

function scoreTrust(targetDuo) {
  const members = activeMembers(targetDuo);
  const hasVerified = members.some(
    (dm) => dm.users.verification_level && dm.users.verification_level !== 'none',
  );
  if (hasVerified) return 10;
  return 5; // active duo with no verification — baseline
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate match score between current user's duo and a target duo.
 *
 * @param {Object|null} myDuo      - result of getMyActiveDuo() — may be null
 * @param {Object}      targetDuo  - a duo row from getActiveDuos()
 * @param {Object|null} myProfile  - result of getMyProfile() — may be null
 *
 * @returns {{ score: number, band: 'high'|'medium'|'low', reasons: string[] }}
 */
export function calculateDuoMatchScore(myDuo, targetDuo, myProfile) {
  const location    = scoreLocation(myDuo, targetDuo, myProfile);
  const age         = scoreAge(targetDuo);
  const vibe        = scoreVibes(myDuo, targetDuo, myProfile);
  const intent      = scoreIntent(myDuo, targetDuo, myProfile);
  const availability = scoreAvailability(myProfile);
  const trust       = scoreTrust(targetDuo);

  const score = location + age + vibe + intent + availability + trust;
  const band  = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  const reasons = getMatchReasons(myDuo, targetDuo, myProfile);

  return { score, band, reasons };
}

/**
 * Return 1–3 soft human-readable reason labels for why this duo is a fit.
 * Used for subtle UI badges — never show raw score.
 *
 * @returns {string[]}
 */
export function getMatchReasons(myDuo, targetDuo, myProfile) {
  const reasons = [];

  // Vibe overlap
  const myVibes = [
    ...normalizeArray(myDuo?.shared_vibes),
    ...normalizeArray(myProfile?.profile?.vibes),
  ];
  const targetVibes = normalizeArray(targetDuo.shared_vibes);
  const sharedVibes = myVibes.filter((v) => targetVibes.includes(v));
  if (sharedVibes.length > 0) reasons.push('Shared vibes');

  // City overlap
  const myUserCity = myProfile?.user?.city;
  const myPrefCities = normalizeArray(myProfile?.profile?.preferred_cities);
  const myMemberCities = activeMembers(myDuo).map((dm) => dm.users.city).filter(Boolean);
  const myCities = [...new Set([myUserCity, ...myMemberCities, ...myPrefCities].filter(Boolean))];
  const targetCities = activeMembers(targetDuo).map((dm) => dm.users.city).filter(Boolean);
  if (myCities.some((c) => targetCities.includes(c))) reasons.push('OC fit');

  // Intent overlap
  const myIntent = [
    ...normalizeArray(myDuo?.looking_for),
    ...normalizeArray(myProfile?.profile?.looking_for),
    ...normalizeArray(myProfile?.profile?.intent),
  ];
  const targetIntent = normalizeArray(targetDuo.looking_for);
  if (myIntent.some((i) => targetIntent.includes(i))) reasons.push('Similar plan');

  // Has public spots listed
  if (reasons.length < 3 && normalizeArray(targetDuo.preferred_spots).length > 0) {
    reasons.push('Public spots');
  }

  return reasons.slice(0, 3);
}

/**
 * Sort a list of target duos by match score (descending).
 * Returns the same objects with matchScoreData injected.
 *
 * @param {Object[]}    duos       - target duo rows
 * @param {Object|null} myDuo
 * @param {Object|null} myProfile
 * @returns {Object[]}
 */
export function sortDuosByMatchScore(duos, myDuo, myProfile) {
  return duos
    .map((duo) => ({ ...duo, matchScoreData: calculateDuoMatchScore(myDuo, duo, myProfile) }))
    .sort((a, b) => b.matchScoreData.score - a.matchScoreData.score);
}
