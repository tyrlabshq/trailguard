-- ============================================================
-- Trails table — stores trail metadata with difficulty rating
-- ============================================================

create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),
  osm_id text unique,                -- OpenStreetMap way ID (for dedup)
  name text not null default 'Trail',
  difficulty text not null default 'unknown',  -- 'easy' | 'moderate' | 'hard' | 'expert' | 'unknown'
  trail_type text,                   -- e.g. 'path', 'track', 'cycleway', 'piste'
  distance_m float,                  -- total length in metres
  elevation_gain_m float,            -- total elevation gain in metres (nullable)
  lat float,                         -- approximate center latitude
  lng float,                         -- approximate center longitude
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.trails (difficulty);
create index on public.trails (lat, lng);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.trails enable row level security;

create policy "anyone can read trails" on public.trails
  for select using (true);

create policy "authenticated can insert trails" on public.trails
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated can update trails" on public.trails
  for update using (auth.role() = 'authenticated');
