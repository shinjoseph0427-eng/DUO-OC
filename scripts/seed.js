/**
 * DUO OC — dev seed script
 *
 * Creates 15 dummy duos (30 members) of 18–25 yr-olds across OC, so the
 * Explore / Home feed isn't empty on a fresh database.
 *
 * Requires the SERVICE ROLE key (server-side only — never ship to the client):
 *
 *   # PowerShell
 *   $env:VITE_SUPABASE_URL="https://utfswelaqpannaftfvox.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key from Supabase dashboard>"
 *   node scripts/seed.js
 *
 * Re-running is safe-ish: each member gets a unique seeded email
 * (duo-seed+<n>@duo-oc.test). Existing users with the same email are skipped.
 *
 * To remove seeded data later, delete users whose email starts with
 * "duo-seed+" in Supabase Auth → Users (cascades to profiles/duos via FKs).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing env. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.',
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CURRENT_YEAR = new Date().getFullYear()

// 15 duos. Each has a name, two members (name/age), a city, vibes, bio, and
// fake instagram handles.
const DUOS = [
  { name: 'Bella & Mia',     city: 'Irvine',         vibes: ['Boba', 'Coffee', 'Shopping'], bio: 'Spectrum regulars looking for another duo to mall-walk and matcha with.',
    members: [{ name: 'Bella', age: 21, ig: 'bella.irv' },   { name: 'Mia', age: 22, ig: 'miaa.oc' }] },
  { name: 'Jae & Miles',     city: 'Fullerton',      vibes: ['Gym', 'Food', 'Nightlife'],   bio: 'Downtown Fullerton crew. Lift heavy, eat heavier.',
    members: [{ name: 'Jae', age: 23, ig: 'jae.lifts' },     { name: 'Miles', age: 24, ig: 'miles.fu' }] },
  { name: 'Soph & Han',      city: 'Costa Mesa',     vibes: ['Coffee', 'Beach', 'Drives'],  bio: 'Portola coffee then PCH drives. Down for anything chill.',
    members: [{ name: 'Sophia', age: 20, ig: 'soph.cm' },    { name: 'Hannah', age: 21, ig: 'han.cm' }] },
  { name: 'Kev & Dan',       city: 'Anaheim',        vibes: ['Games', 'Food', 'Bowling'],   bio: 'Packing House foodies + arcade nerds.',
    members: [{ name: 'Kevin', age: 22, ig: 'kev.ahm' },     { name: 'Daniel', age: 23, ig: 'dan.ahm' }] },
  { name: 'Aria & Noor',     city: 'Newport Beach',  vibes: ['Beach', 'Coffee', 'Shopping'],bio: 'Balboa mornings, Fashion Island afternoons.',
    members: [{ name: 'Aria', age: 19, ig: 'aria.npb' },     { name: 'Noor', age: 20, ig: 'noor.npb' }] },
  { name: 'Theo & Sam',      city: 'Huntington Beach', vibes: ['Beach', 'Gym', 'Drives'],   bio: 'Surf check then taco run. Pier locals.',
    members: [{ name: 'Theo', age: 24, ig: 'theo.hb' },      { name: 'Sam', age: 22, ig: 'sam.hb' }] },
  { name: 'Lina & Yuki',     city: 'Tustin',         vibes: ['Boba', 'Games', 'Food'],      bio: 'Boba crawl experts. Always hunting the new spot.',
    members: [{ name: 'Lina', age: 20, ig: 'lina.tst' },     { name: 'Yuki', age: 21, ig: 'yuki.tst' }] },
  { name: 'Marc & Eli',      city: 'Orange',         vibes: ['Coffee', 'Nightlife', 'Food'],bio: 'Old Towne Orange antiquing + late night eats.',
    members: [{ name: 'Marc', age: 23, ig: 'marc.org' },     { name: 'Eli', age: 24, ig: 'eli.org' }] },
  { name: 'Priya & Zoe',     city: 'Lake Forest',    vibes: ['Gym', 'Coffee', 'Shopping'],  bio: 'Morning lifts, iced lattes, low-key hangs.',
    members: [{ name: 'Priya', age: 21, ig: 'priya.lf' },    { name: 'Zoe', age: 20, ig: 'zoe.lf' }] },
  { name: 'Drew & Cole',     city: 'Mission Viejo',  vibes: ['Bowling', 'Games', 'Food'],   bio: 'Lake nights and bowling leagues. Competitive but friendly.',
    members: [{ name: 'Drew', age: 22, ig: 'drew.mv' },      { name: 'Cole', age: 23, ig: 'cole.mv' }] },
  { name: 'Nina & Ros',      city: 'Brea',           vibes: ['Shopping', 'Boba', 'Nightlife'], bio: 'Brea Mall to bar hop. Always up for plans.',
    members: [{ name: 'Nina', age: 24, ig: 'nina.brea' },    { name: 'Rosa', age: 25, ig: 'rosa.brea' }] },
  { name: 'Omar & Tre',      city: 'Santa Ana',      vibes: ['Food', 'Nightlife', 'Drives'],bio: '4th Street tacos and night drives.',
    members: [{ name: 'Omar', age: 23, ig: 'omar.sna' },     { name: 'Tre', age: 22, ig: 'tre.sna' }] },
  { name: 'Cat & Vee',       city: 'Laguna Beach',   vibes: ['Beach', 'Coffee', 'Drives'],  bio: 'Tide pools then cliffside coffee. Sunset chasers.',
    members: [{ name: 'Catalina', age: 20, ig: 'cat.lag' },  { name: 'Vee', age: 21, ig: 'vee.lag' }] },
  { name: 'Ben & Asher',     city: 'Yorba Linda',    vibes: ['Gym', 'Games', 'Food'],       bio: 'Home gym + game nights. Easygoing duo.',
    members: [{ name: 'Ben', age: 25, ig: 'ben.yl' },        { name: 'Asher', age: 24, ig: 'asher.yl' }] },
  { name: 'Isa & Quinn',     city: 'Garden Grove',   vibes: ['Boba', 'Food', 'Shopping'],   bio: 'Korean BBQ and dessert runs. Foodie pair.',
    members: [{ name: 'Isabel', age: 19, ig: 'isa.gg' },     { name: 'Quinn', age: 20, ig: 'quinn.gg' }] },
]

let emailCounter = 0
function seedEmail() {
  emailCounter += 1
  return `duo-seed+${emailCounter}@duo-oc.test`
}

async function ensureUser(member) {
  const email = seedEmail()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'seed-Passw0rd!',
    email_confirm: true,
    user_metadata: { seeded: true, name: member.name },
  })
  if (error) {
    // Already exists (re-run): look it up by listing — simplest is to skip.
    console.warn(`  ! user ${email} create failed: ${error.message} (skipping)`)
    return null
  }
  return data.user.id
}

async function upsertProfile(userId, member, city) {
  const { error } = await admin.from('profiles').upsert({
    id: userId,
    name: member.name,
    age: member.age,
    birth_year: CURRENT_YEAR - member.age,
    city,
    instagram: member.ig,
    photos: [],
    onboarding_complete: true,
  })
  if (error) throw new Error(`profile upsert (${member.name}): ${error.message}`)
}

async function createDuo(duo, memberUserIds) {
  const { data: duoRow, error } = await admin
    .from('duos')
    .insert({
      name: duo.name,
      city: duo.city,
      vibes: duo.vibes,
      spots: [],
      looking_for: 'Hangouts',
      duo_bio: duo.bio,
      status: 'active',
    })
    .select('id')
    .single()
  if (error) throw new Error(`duo insert (${duo.name}): ${error.message}`)

  const rows = memberUserIds.map((userId, i) => ({
    duo_id: duoRow.id,
    user_id: userId,
    instagram: duo.members[i].ig,
  }))
  const { error: memErr } = await admin.from('duo_members').insert(rows)
  if (memErr) throw new Error(`duo_members insert (${duo.name}): ${memErr.message}`)

  return duoRow.id
}

async function main() {
  console.log(`Seeding ${DUOS.length} duos into ${SUPABASE_URL} ...`)
  let created = 0

  for (const duo of DUOS) {
    try {
      const memberIds = []
      for (const member of duo.members) {
        const userId = await ensureUser(member)
        if (!userId) { memberIds.length = 0; break }
        await upsertProfile(userId, member, duo.city)
        memberIds.push(userId)
      }
      if (memberIds.length !== duo.members.length) {
        console.warn(`  ! skipped ${duo.name} (member creation incomplete)`)
        continue
      }
      const duoId = await createDuo(duo, memberIds)
      created += 1
      console.log(`  ✓ ${duo.name} (${duo.city}) → ${duoId}`)
    } catch (err) {
      console.error(`  ✗ ${duo.name}: ${err.message}`)
    }
  }

  console.log(`\nDone. ${created}/${DUOS.length} duos created.`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
