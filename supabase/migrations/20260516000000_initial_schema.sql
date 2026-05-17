-- Users
create table profiles (
  id uuid references auth.users primary key,
  name text,
  age integer check (age >= 18 and age <= 25),
  city text,
  instagram text,
  created_at timestamptz default now()
);

-- Duos
create table duos (
  id uuid primary key default gen_random_uuid(),
  name text,
  city text,
  vibes text[],
  spots text[],
  looking_for text,
  created_at timestamptz default now()
);

-- Duo Members
create table duo_members (
  id uuid primary key default gen_random_uuid(),
  duo_id uuid references duos(id),
  user_id uuid references profiles(id),
  instagram text
);

-- Match Requests
create table match_requests (
  id uuid primary key default gen_random_uuid(),
  from_duo_id uuid references duos(id),
  to_duo_id uuid references duos(id),
  vibe text,
  when_time text,
  message text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  duo_a_id uuid references duos(id),
  duo_b_id uuid references duos(id),
  created_at timestamptz default now()
);
