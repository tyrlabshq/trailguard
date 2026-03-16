-- ============================================================
-- Trail Conditions — community-reported conditions with upvotes
-- ============================================================

create table if not exists public.trail_conditions (
  id uuid primary key default gen_random_uuid(),
  trail_name text not null,
  lat float8,
  lng float8,
  condition_type text not null,        -- matches TrailCondition.ConditionType raw values
  severity int not null default 3 check (severity >= 1 and severity <= 5),
  description text,                     -- max ~280 chars enforced client-side
  ride_type text,                       -- nullable = applicable to all ride types
  reporter_id uuid not null references auth.users(id),
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.trail_conditions (condition_type);
create index on public.trail_conditions (created_at desc);
create index on public.trail_conditions (reporter_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.trail_conditions enable row level security;

-- Anyone can read trail conditions
create policy "anyone can read trail_conditions"
  on public.trail_conditions for select
  using (true);

-- Authenticated users can insert new reports
create policy "authenticated can insert trail_conditions"
  on public.trail_conditions for insert
  with check (auth.role() = 'authenticated');

-- Any authenticated user can upvote (update upvotes column only)
create policy "authenticated can upvote trail_conditions"
  on public.trail_conditions for update
  using (auth.role() = 'authenticated');

-- Only the reporter can delete their own condition
create policy "reporter can delete own trail_conditions"
  on public.trail_conditions for delete
  using (auth.uid() = reporter_id);
