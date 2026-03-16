-- Group Rides: tables for group ride sessions, members, and rally points
-- Phase 4 of TrailGuard iOS

-- Group ride sessions
CREATE TABLE group_rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    join_code TEXT NOT NULL UNIQUE,
    leader_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group ride members with live location
CREATE TABLE group_ride_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES group_rides(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES auth.users(id),
    display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member',
    last_location JSONB,
    last_seen TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(group_id, rider_id)
);

-- Rally points visible to all group members
CREATE TABLE group_rally_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES group_rides(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_group_rides_join_code ON group_rides(join_code);
CREATE INDEX idx_group_rides_status ON group_rides(status);
CREATE INDEX idx_group_ride_members_group ON group_ride_members(group_id);
CREATE INDEX idx_group_ride_members_rider ON group_ride_members(rider_id);
CREATE INDEX idx_group_rally_points_group ON group_rally_points(group_id);

-- Row Level Security
ALTER TABLE group_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_ride_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_rally_points ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage groups they belong to
CREATE POLICY "Users can view active groups"
    ON group_rides FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create groups"
    ON group_rides FOR INSERT
    TO authenticated
    WITH CHECK (leader_id = auth.uid());

CREATE POLICY "Leaders can update their groups"
    ON group_rides FOR UPDATE
    TO authenticated
    USING (leader_id = auth.uid());

CREATE POLICY "Members can view group members"
    ON group_ride_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can join groups"
    ON group_ride_members FOR INSERT
    TO authenticated
    WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Users can update own location"
    ON group_ride_members FOR UPDATE
    TO authenticated
    USING (rider_id = auth.uid());

CREATE POLICY "Users can leave groups"
    ON group_ride_members FOR DELETE
    TO authenticated
    USING (rider_id = auth.uid());

CREATE POLICY "Members can view rally points"
    ON group_rally_points FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Members can create rally points"
    ON group_rally_points FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can delete rally points"
    ON group_rally_points FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- Realtime: enable for member location updates
ALTER PUBLICATION supabase_realtime ADD TABLE group_ride_members;
