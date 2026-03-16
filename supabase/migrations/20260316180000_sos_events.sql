-- sos_events table for manual SOS flow (Phase 7)
-- Tracks SOS activations with location, status, and contact notification state.

create table if not exists public.sos_events (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references auth.users not null,
  latitude float8 not null default 0,
  longitude float8 not null default 0,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  cancelled_at timestamptz,
  contacts_notified bool not null default false
);

-- Enable Row Level Security
alter table public.sos_events enable row level security;

-- RLS: riders can insert their own SOS events
create policy "Users can insert own SOS events"
  on public.sos_events
  for insert
  with check (auth.uid() = rider_id);

-- RLS: riders can read their own SOS events
create policy "Users can read own SOS events"
  on public.sos_events
  for select
  using (auth.uid() = rider_id);

-- RLS: riders can update (cancel) their own SOS events
create policy "Users can update own SOS events"
  on public.sos_events
  for update
  using (auth.uid() = rider_id);

-- Enable Realtime for SOS events
alter publication supabase_realtime add table public.sos_events;
