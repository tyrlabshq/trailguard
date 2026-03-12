-- device_tokens table for APNs remote push (Task #803)
-- Stores per-device APNs (iOS) tokens so the sos-push edge function can
-- deliver remote push notifications when group members' apps are killed.
--
-- Called "device_tokens" (not push_tokens) to keep it generic enough to
-- later support FCM (Android) in the same table via the `platform` column.

create table if not exists public.device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  token       text not null,
  platform    text not null default 'ios',  -- 'ios' | 'android'
  updated_at  timestamptz not null default now(),
  -- One row per user/platform combination.  Token refreshes are upserts.
  unique(user_id, platform)
);

-- Enable Row Level Security
alter table public.device_tokens enable row level security;

-- Only the owning user can read/write their own token
create policy "users can manage own device token"
  on public.device_tokens
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The sos-push edge function runs with the service role key, so it bypasses
-- RLS when looking up group members' tokens — no additional policy needed.

-- Index for the join in sos-push: group_members → device_tokens
create index if not exists device_tokens_user_id_idx
  on public.device_tokens (user_id);
