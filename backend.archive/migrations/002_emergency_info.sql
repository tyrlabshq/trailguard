-- PowderLink PL-09: Emergency info table
-- Stores structured emergency/medical info for each rider

CREATE TABLE IF NOT EXISTS emergency_info (
  rider_id uuid PRIMARY KEY REFERENCES riders(id) ON DELETE CASCADE,
  blood_type text,
  allergies text[] DEFAULT '{}',
  medications text[] DEFAULT '{}',
  conditions text,
  emergency_contacts jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_emergency_info_rider ON emergency_info(rider_id);

-- SOS alerts table (separate from DMS alerts for clarity)
CREATE TABLE IF NOT EXISTS sos_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id uuid REFERENCES riders(id),
  group_id uuid REFERENCES groups(id),
  location geometry(Point, 4326),
  fired_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sos_events_rider ON sos_events(rider_id, fired_at DESC);
