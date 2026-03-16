-- ============================================================
-- Dead Man Switch Table
-- Persists per-rider DMS state for server-side escalation
-- and emergency contact notification when app is unreachable.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dead_man_switch (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id         uuid        REFERENCES public.riders(id) ON DELETE CASCADE UNIQUE,
  is_active        boolean     NOT NULL DEFAULT false,
  interval_minutes integer     NOT NULL DEFAULT 30,
  last_check_in    timestamptz,
  next_deadline    timestamptz,
  snooze_count     integer     NOT NULL DEFAULT 0 CHECK (snooze_count >= 0 AND snooze_count <= 3),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS — riders can only see/modify their own row
ALTER TABLE public.dead_man_switch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "riders can manage own dead man switch"
  ON public.dead_man_switch
  FOR ALL
  USING (rider_id = auth.uid());

-- Index for server-side polling (find overdue active switches)
CREATE INDEX IF NOT EXISTS idx_dms_active_deadline
  ON public.dead_man_switch (next_deadline)
  WHERE is_active = true;

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION update_dead_man_switch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dead_man_switch_updated_at
  BEFORE UPDATE ON public.dead_man_switch
  FOR EACH ROW EXECUTE FUNCTION update_dead_man_switch_updated_at();
