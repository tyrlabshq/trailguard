-- ============================================================
-- Emergency Cards Table
-- Stores per-rider emergency card (blood type, allergies, notes, contacts as JSONB)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.emergency_cards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id    uuid        REFERENCES public.riders(id) ON DELETE CASCADE UNIQUE,
  blood_type  text,
  allergies   text[]      DEFAULT '{}',
  medical_notes text      CHECK (char_length(medical_notes) <= 500),
  contacts    jsonb       DEFAULT '[]',
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.emergency_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "riders can manage own emergency card" ON public.emergency_cards
  FOR ALL USING (rider_id = auth.uid());
