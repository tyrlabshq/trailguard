-- PowderLink initial schema
-- Requires PostgreSQL 15+ with PostGIS

CREATE EXTENSION IF NOT EXISTS postgis;

-- Riders
CREATE TABLE riders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  avatar_url text,
  emergency_contact jsonb DEFAULT '{}',
  medical_info jsonb DEFAULT '{}',
  phone text UNIQUE,
  tier text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- Groups (riding parties)
CREATE TABLE groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code varchar(6) UNIQUE NOT NULL,
  name text NOT NULL,
  leader_id uuid REFERENCES riders(id),
  sweep_id uuid REFERENCES riders(id),
  rally_point geometry(Point, 4326),
  created_at timestamptz DEFAULT now()
);

-- Group membership
CREATE TABLE group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  rider_id uuid REFERENCES riders(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, rider_id)
);

-- Real-time rider locations
CREATE TABLE rider_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id uuid REFERENCES riders(id),
  group_id uuid REFERENCES groups(id),
  location geometry(Point, 4326) NOT NULL,
  heading float,
  speed_mph float,
  altitude_ft float,
  source text DEFAULT 'cellular',
  accuracy float,
  recorded_at timestamptz DEFAULT now()
);

-- Safety alerts
CREATE TABLE alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  rider_id uuid REFERENCES riders(id),
  group_id uuid REFERENCES groups(id),
  location geometry(Point, 4326),
  fired_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES riders(id)
);

-- Trail condition reports
CREATE TABLE trail_conditions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id text,
  condition text NOT NULL,
  reported_by uuid REFERENCES riders(id),
  notes text,
  location geometry(Point, 4326) NOT NULL,
  reported_at timestamptz DEFAULT now()
);

-- Ride sessions
CREATE TABLE rides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  stats jsonb DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_rider_locations_group ON rider_locations(group_id, recorded_at DESC);
CREATE INDEX idx_trail_conditions_location ON trail_conditions USING GIST(location);
CREATE INDEX idx_groups_code ON groups(code);
