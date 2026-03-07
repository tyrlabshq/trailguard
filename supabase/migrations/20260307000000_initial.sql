-- ============================================================
-- TrailGuard Initial Schema
-- All tables created first, then RLS enabled, then policies
-- ============================================================

-- Riders (users)
create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url text,
  device_type text, -- 'ios' | 'android'
  created_at timestamptz default now()
);

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid references public.riders(id),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- Group members
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  rider_id uuid references public.riders(id) on delete cascade,
  role text not null default 'member', -- 'leader' | 'member' | 'sweep'
  joined_at timestamptz default now(),
  unique(group_id, rider_id)
);

-- Rides
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  distance_miles float,
  max_speed_mph float,
  duration_seconds int,
  created_at timestamptz default now()
);

-- Ride waypoints (GPS track)
create table if not exists public.ride_waypoints (
  id bigserial primary key,
  ride_id uuid references public.rides(id) on delete cascade,
  lat float not null,
  lng float not null,
  altitude_m float,
  speed_mph float,
  heading float,
  recorded_at timestamptz default now()
);

create index on public.ride_waypoints (ride_id, recorded_at);

-- Emergency contacts
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz default now()
);

-- Alerts (SOS, crash detection)
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id),
  group_id uuid references public.groups(id),
  type text not null, -- 'sos' | 'crash' | 'dms_expired' | 'sweep_gap'
  lat float,
  lng float,
  message text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Dead man's switch
create table if not exists public.dead_man_switch (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) on delete cascade unique,
  group_id uuid references public.groups(id),
  expires_at timestamptz not null,
  note text,
  triggered boolean default false,
  created_at timestamptz default now()
);

-- Trail conditions (crowd-sourced)
create table if not exists public.trail_conditions (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.riders(id),
  lat float not null,
  lng float not null,
  condition text not null, -- 'groomed' | 'powder' | 'icy' | 'closed' | 'tracked_out' | 'wet_snow'
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.riders enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.rides enable row level security;
alter table public.ride_waypoints enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.alerts enable row level security;
alter table public.dead_man_switch enable row level security;
alter table public.trail_conditions enable row level security;

-- ============================================================
-- Policies
-- ============================================================

-- riders
create policy "riders can read own profile" on public.riders
  for select using (auth.uid() = id);
create policy "riders can update own profile" on public.riders
  for update using (auth.uid() = id);
-- allow riders to insert their own profile (needed for onboarding upsert)
create policy "riders can insert own profile" on public.riders
  for insert with check (auth.uid() = id);

-- groups (now group_members table exists)
create policy "group members can read group" on public.groups
  for select using (
    exists (select 1 from public.group_members where group_id = id and rider_id = auth.uid())
  );

-- group_members
create policy "members can read group_members" on public.group_members
  for select using (
    exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.rider_id = auth.uid())
  );
create policy "members can insert self" on public.group_members
  for insert with check (rider_id = auth.uid());

-- rides
create policy "riders can manage own rides" on public.rides
  for all using (rider_id = auth.uid());

-- ride_waypoints
create policy "riders can manage own waypoints" on public.ride_waypoints
  for all using (
    exists (select 1 from public.rides where id = ride_id and rider_id = auth.uid())
  );

-- emergency_contacts
create policy "riders can manage own contacts" on public.emergency_contacts
  for all using (rider_id = auth.uid());

-- alerts
create policy "group members can read alerts" on public.alerts
  for select using (
    exists (select 1 from public.group_members where group_id = alerts.group_id and rider_id = auth.uid())
  );
create policy "riders can create alerts" on public.alerts
  for insert with check (rider_id = auth.uid());

-- dead_man_switch
create policy "riders can manage own dms" on public.dead_man_switch
  for all using (rider_id = auth.uid());

-- trail_conditions
create policy "anyone can read trail conditions" on public.trail_conditions
  for select using (true);
create policy "authenticated can report" on public.trail_conditions
  for insert with check (reporter_id = auth.uid());
