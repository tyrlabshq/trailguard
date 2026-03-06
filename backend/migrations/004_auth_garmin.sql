-- PowderLink auth + Garmin inReach migration
-- PL-15: JWT refresh tokens, tier enforcement
-- PL-10: Garmin MapShare config per rider

-- ─── Auth ──────────────────────────────────────────────────────────────────────

-- Store hashed passwords (optional: phone-only OTP riders may have no password)
ALTER TABLE riders ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- Refresh token store (DB-backed invalidation for security)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id   uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_rider ON refresh_tokens(rider_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ─── Tier enforcement ─────────────────────────────────────────────────────────

-- Stripe customer + subscription tracking
ALTER TABLE riders ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz;

-- Ensure tier has a default
ALTER TABLE riders ALTER COLUMN tier SET DEFAULT 'free';
UPDATE riders SET tier = 'free' WHERE tier IS NULL;

-- ─── Garmin inReach config ────────────────────────────────────────────────────

-- Each pro rider can register their Garmin MapShare identifier
-- The server polls share.garmin.com/Feed/Share/{mapshare_id} on their behalf
CREATE TABLE IF NOT EXISTS garmin_configs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id        uuid NOT NULL UNIQUE REFERENCES riders(id) ON DELETE CASCADE,
  mapshare_id     text NOT NULL,           -- Garmin MapShare identifier (e.g. "JohnDoe123")
  mapshare_password text,                  -- Optional: if MapShare is password-protected
  imei            text,                    -- Device IMEI (optional, for multi-device accounts)
  enabled         boolean DEFAULT true,
  last_polled_at  timestamptz,
  last_location_at timestamptz,            -- When we last received a valid fix
  poll_interval_seconds int DEFAULT 60,    -- How often to poll (min 60, Garmin rate-limits)
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Garmin location history (satellite pings, separate from cellular locations)
-- We merge these into rider_locations with source='satellite'
CREATE TABLE IF NOT EXISTS garmin_pings (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id   uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  imei       text,
  location   geometry(Point, 4326) NOT NULL,
  altitude_m float,
  speed_kmh  float,
  heading    float,
  event_type text,                          -- e.g. "Tracking", "OK Check-In"
  raw_data   jsonb DEFAULT '{}',
  garmin_at  timestamptz NOT NULL,          -- Timestamp from Garmin device
  received_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garmin_pings_rider ON garmin_pings(rider_id, garmin_at DESC);
CREATE INDEX IF NOT EXISTS idx_garmin_pings_location ON garmin_pings USING GIST(location);
