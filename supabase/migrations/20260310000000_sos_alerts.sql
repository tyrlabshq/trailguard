-- sos_alerts table for SOS emergency flow (Task #732)
-- Created to support src/api/sos.ts + SOSConfirmationModal.tsx

create table if not exists public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  ride_id text,
  group_id text,
  user_id uuid references auth.users,
  lat float8 not null,
  lng float8 not null,
  timestamp timestamptz default now(),
  status text default 'active'
);

-- Enable Row Level Security
alter table public.sos_alerts enable row level security;

-- RLS Policies
create policy "Users can insert own SOS alerts"
  on public.sos_alerts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read group SOS alerts"
  on public.sos_alerts
  for select
  using (true);

create policy "Users can cancel own SOS alerts"
  on public.sos_alerts
  for update
  using (auth.uid() = user_id);

-- Enable Realtime publication for subscribeToSOSAlerts
alter publication supabase_realtime add table public.sos_alerts;
